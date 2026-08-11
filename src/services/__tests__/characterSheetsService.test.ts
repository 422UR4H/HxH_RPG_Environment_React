// src/services/__tests__/characterSheetsService.test.ts
//
// Wire-format safety net for characterSheetsService.ts. Mirrors the Go
// structs in System_X_System/internal/app/api/sheet/{character_sheet_response,
// character_sheet_sumary_response,create_character_sheet,update_character_sheet,
// get_character_sheet,list_character_sheets,delete_character_sheet,
// patch_character_sheet_profile}.go and
// System_X_System/internal/app/api/submission/{submit_character_sheet,
// accept_sheet_submission,reject_sheet_submission}.go.
//
// Fase 8: the backend now speaks camelCase all the way down, and the service
// no longer runs request/response bodies through any case-conversion — the
// body passes straight through, in both directions.
//
// Per method: (1) request URL/verb + wire-format (camelCase) body,
// (2) response passed straight through into the src/types/ shape,
// (3) Authorization header sent when a token is passed.
//
// D4 (resolved): all three call sites (getCharacterSheetDetails,
// createCharacterSheet, updateCharacterSheet) now read the same envelope
// shape consistently — the singular `characterSheet` key, camelCase, read
// directly with no transform step, matching listCharacterSheets' existing
// `characterSheets` key and the real backend (get_character_sheet.go,
// update_character_sheet.go, create_character_sheet.go, list_character_sheets.go
// all tag `json:"characterSheet(s)"`, camelCase).
//
// createCharacterSheet/updateCharacterSheet's outer request-body keys
// (campaignUuid, characterClass, skillsExps, proficienciesExps,
// attributePoints) were also flipped to camelCase here — they were
// hand-typed literals never touched by the deleted case converter, and were
// left snake_case (a functional break against the real backend) until this
// task.
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/server";
import { characterSheetsService } from "../characterSheetsService";
import { sheetApiFixture, sheetSummaryApiFixture, sheetSummaryFixture } from "../../test/fixtures/sheet";
import type {
  CharacterSheet,
  CharacterSheetSummary,
  Attribute,
  Skill,
  Proficiency,
  JointProficiency,
} from "../../types/characterSheet";
import type { CharacterClass } from "../../types/characterClass";

const baseUrl = "http://localhost:5000";
const token = "test-token";

// ─── Helpers ────────────────────────────────────────────────────────────────

function attr(points: number): Attribute {
  return { level: 0, points, power: 0 };
}

function skill(exp: number): Skill {
  return { level: 1, value: 0, exp };
}

function prof(exp: number): Proficiency {
  return { level: 1, exp };
}

// Minimal-but-complete CharacterSheet (frontend camelCase shape), overridable
// per test. Hand-built rather than via features/sheet/factories/* to keep
// this service test decoupled from the sheet feature's internal conventions.
function buildCharSheet(overrides: Partial<CharacterSheet> = {}): CharacterSheet {
  return {
    uuid: "sheet-1",
    characterClass: "Especialista",
    categoryName: "Emissor",
    profile: {
      nickname: "TestNick",
      fullname: "Test Character",
      alignment: "Neutral",
      description: "",
      briefDescription: "A test character",
      birthday: "2000-01-01",
      age: 25,
    },
    status: {
      health: { min: 0, current: 100, max: 100 },
      stamina: { min: 0, current: 100, max: 100 },
    },
    characterExp: { level: 1, exp: 0, currExp: 0, nextLvlBaseExp: 100, points: 0 },
    talent: { level: 1, exp: 0, currExp: 0, nextLvlBaseExp: 100 },
    abilities: {},
    physicalAttributes: {},
    mentalAttributes: {},
    spiritualAttributes: {},
    physicalSkills: {},
    mentalSkills: {},
    spiritualSkills: {},
    principles: {},
    categories: {},
    commonProficiencies: {},
    jointProficiencies: {},
    ...overrides,
  };
}

// distribution.skillsAllowed / proficienciesAllowed use the Go-side
// PascalCase enum spellings (enum.SkillName / enum.WeaponName) — this is
// what createCharacterSheet/updateCharacterSheet allow-list against.
function buildCharClass(overrides: Partial<CharacterClass> = {}): CharacterClass {
  return {
    profile: { name: "Especialista", alignment: "Neutral", description: "", briefDescription: "" },
    distribution: {
      skillPoints: null,
      proficiencyPoints: [],
      skillsAllowed: ["Vitality", "Energy"],
      proficienciesAllowed: ["Dagger", "Bow"],
    },
    skills: {},
    jointSkills: {},
    proficiencies: {},
    jointProficiencies: [],
    attributes: {},
    abilities: {},
    indicatedCategories: [],
    ...overrides,
  };
}

// Since the service no longer converts anything, this is just sheetApiFixture
// with the `characterSheet` envelope key peeled off. Two
// fields that used to diverge from src/types/characterSheet.ts's
// CharacterSheet (Task 5-B fixed both):
//   - mentalSkills: present on the wire, and now typed on CharacterSheet too
//     (previously silently dropped — CharacterSheet had no such field).
//   - jointProficiencies: Go sends a map, and CharacterSheet now types it as
//     Record<string, JointProficiency> to match (previously typed as an
//     array, a real shape mismatch).
function expectedConvertedSheet() {
  return {
    uuid: "sheet-1",
    playerUuid: "user-1",
    characterClass: "Especialista",
    categoryName: "Emissor",
    profile: {
      nickname: "TestNick",
      fullname: "Test Character",
      alignment: "Neutral",
      description: "",
      briefDescription: "A test character",
      birthday: "2000-01-01T00:00:00.000Z",
      age: 25,
    },
    characterExp: { level: 1, exp: 0, currExp: 0, nextLvlBaseExp: 100, points: 0 },
    talent: { level: 1, exp: 0, currExp: 0, nextLvlBaseExp: 100 },
    abilities: {},
    physicalAttributes: {},
    mentalAttributes: {},
    spiritualAttributes: {},
    physicalSkills: {},
    mentalSkills: {},
    spiritualSkills: {},
    principles: {},
    categories: {},
    commonProficiencies: {},
    jointProficiencies: {},
    status: {
      health: { min: 0, current: 100, max: 100 },
      stamina: { min: 0, current: 100, max: 100 },
    },
  };
}

// ─── Enum-keyed map fixture ─────────────────────────────────────────────────
// sheetApiFixture (above) has every enum-keyed map empty, which is exactly
// why the enum-key-casing bug (map keys like "Resistance" arriving PascalCase
// instead of the frontend's lowercase-first convention) slipped through
// initially — an empty map has no keys to get wrong. This fixture adds real
// PascalCase Go-style keys to prove the service normalizes them.
function sheetWireWithEnumKeyedMaps() {
  return {
    ...sheetApiFixture,
    abilities: { Physicals: { level: 2, exp: 50, currExp: 10, nextLvlBaseExp: 100, bonus: 1.5 } },
    physicalAttributes: {
      Resistance: { level: 3, exp: 80, currExp: 20, nextLvlBaseExp: 150, points: 4, power: 12 },
    },
    mentalAttributes: {
      Resilience: { level: 1, exp: 0, currExp: 0, nextLvlBaseExp: 100, points: 0, power: 0 },
    },
    spiritualAttributes: {
      Flame: { level: 0, exp: 0, currExp: 0, nextLvlBaseExp: 100, points: 0, power: 0 },
    },
    physicalSkills: { Vitality: { level: 1, exp: 10, currExp: 5, nextLvlBaseExp: 50, value: 3 } },
    mentalSkills: { Focus: { level: 1, exp: 0, currExp: 0, nextLvlBaseExp: 100, value: 0 } },
    spiritualSkills: { Coa: { level: 0, exp: 0, currExp: 0, nextLvlBaseExp: 100, value: 0 } },
    principles: { Ten: { level: 0, exp: 0, currExp: 0, nextLvlBaseExp: 100, value: 0 } },
    categories: { Transmutation: { exp: 0, level: 0, value: 0, percent: 0 } },
    commonProficiencies: { Sword: { level: 1, exp: 20 } },
    // jointProficiencies keys are DM-defined free text, not enum values —
    // must stay untouched by the normalization.
    jointProficiencies: { "Custom Weapon": { level: 1, exp: 5, name: "Custom Weapon" } },
  };
}

function expectAllMapsNormalized(result: CharacterSheet, wire: ReturnType<typeof sheetWireWithEnumKeyedMaps>) {
  expect(result.abilities).toEqual({ physicals: wire.abilities.Physicals });
  expect(result.physicalAttributes).toEqual({ resistance: wire.physicalAttributes.Resistance });
  expect(result.mentalAttributes).toEqual({ resilience: wire.mentalAttributes.Resilience });
  expect(result.spiritualAttributes).toEqual({ flame: wire.spiritualAttributes.Flame });
  expect(result.physicalSkills).toEqual({ vitality: wire.physicalSkills.Vitality });
  expect(result.mentalSkills).toEqual({ focus: wire.mentalSkills.Focus });
  expect(result.spiritualSkills).toEqual({ coa: wire.spiritualSkills.Coa });
  expect(result.principles).toEqual({ ten: wire.principles.Ten });
  expect(result.categories).toEqual({ transmutation: wire.categories.Transmutation });
  expect(result.commonProficiencies).toEqual({ sword: wire.commonProficiencies.Sword });
  // Free-form DM-defined names, not enum values — untouched.
  expect(result.jointProficiencies).toEqual(wire.jointProficiencies);
  // The exact lookup pattern distribute.ts / the diagram components use —
  // this is the regression this test guards against.
  expect(result.physicalAttributes["resistance"]).toBeDefined();
  expect(result.physicalAttributes).not.toHaveProperty("Resistance");
}

// ─── Task 5-B: type fixes ───────────────────────────────────────────────────
//
// Each of these would have failed to compile (tsc) before the corresponding
// fix in src/types/characterSheet.ts — the assignments below are only
// well-typed once the field exists/matches the shape the backend actually
// sends. Runtime assertions on top confirm the value round-trips correctly.
describe("Task 5-B type fixes", () => {
  it("CharacterSheet.mentalSkills exists and is typed as Record<string, Skill>", async () => {
    server.use(
      http.get(`${baseUrl}/charactersheets/:id`, () =>
        HttpResponse.json({ characterSheet: sheetApiFixture }),
      ),
    );

    const result = await characterSheetsService.getCharacterSheetDetails(token, "sheet-1");

    // Would not compile before Task 5-B: CharacterSheet had no mentalSkills field.
    const mentalSkills: Record<string, Skill> = result.mentalSkills;
    expect(mentalSkills).toEqual({});
  });

  it("CharacterSheet.jointProficiencies is a Record<string, JointProficiency>, not an array", async () => {
    server.use(
      http.get(`${baseUrl}/charactersheets/:id`, () =>
        HttpResponse.json({ characterSheet: sheetApiFixture }),
      ),
    );

    const result = await characterSheetsService.getCharacterSheetDetails(token, "sheet-1");

    // Would not compile before Task 5-B: the type declared JointProficiency[].
    const jointProficiencies: Record<string, JointProficiency> = result.jointProficiencies;
    expect(jointProficiencies).toEqual({});
    expect(Array.isArray(result.jointProficiencies)).toBe(false);
  });

  it("CharacterSheetSummary.aura is optional (backend never sends it)", async () => {
    server.use(
      http.get(`${baseUrl}/charactersheets`, () =>
        HttpResponse.json({ characterSheets: [sheetSummaryApiFixture] }),
      ),
    );

    const result = await characterSheetsService.listCharacterSheets(token);

    // Would not compile before Task 5-B: aura was required, so a response
    // shape without it couldn't be assigned to CharacterSheetSummary.
    const [summary]: CharacterSheetSummary[] = result;
    expect(summary.aura).toBeUndefined();
  });

  it("CharacterSheetSummary uses playerUuid/masterUuid/campaignUuid (single uppercase U)", () => {
    // Would not compile before Task 5-B: the type declared playerUUID/
    // masterUUID/campaignUUID (double uppercase), so this literal — built
    // with the single-uppercase convention used everywhere else in the
    // codebase — couldn't be assigned to CharacterSheetSummary.
    const summary: CharacterSheetSummary = sheetSummaryFixture;
    expect(summary.playerUuid).toBe("user-1");
    expect(summary.masterUuid).toBe("master-1");
    expect(summary.campaignUuid).toBe("campaign-1");
  });
});

// ─── listCharacterSheets ────────────────────────────────────────────────────

describe("listCharacterSheets", () => {
  it("GETs /charactersheets with Authorization header", async () => {
    let capturedAuth: string | null = null;
    let capturedUrl = "";
    server.use(
      http.get(`${baseUrl}/charactersheets`, ({ request }) => {
        capturedAuth = request.headers.get("authorization");
        capturedUrl = request.url;
        return HttpResponse.json({ characterSheets: [sheetSummaryApiFixture] });
      }),
    );

    await characterSheetsService.listCharacterSheets(token);

    expect(capturedUrl).toBe(`${baseUrl}/charactersheets`);
    expect(capturedAuth).toBe(`Bearer ${token}`);
  });

  it("returns the list untouched, field by field", async () => {
    server.use(
      http.get(`${baseUrl}/charactersheets`, () =>
        HttpResponse.json({ characterSheets: [sheetSummaryApiFixture] }),
      ),
    );

    const result = await characterSheetsService.listCharacterSheets(token);

    expect(result).toHaveLength(1);
    // NOTE: CharacterSheetSummary now correctly declares playerUuid (single
    // uppercase U), matching every other type in the codebase — Task 5-B
    // fixed the double-uppercase playerUUID/masterUUID/campaignUUID bug this
    // test used to document.
    const sheet = result[0] as unknown as Record<string, unknown>;
    expect(sheet.playerUuid).toBe("user-1");
    expect(sheet.uuid).toBe("sheet-1");
    expect(sheet.nickName).toBe("TestNick");
    expect(sheet.fullName).toBe("Test Character");
    expect(sheet.characterClass).toBe("Especialista");
    expect(sheet.categoryName).toBe("Emissor");
    expect(sheet.currHexValue).toBeNull();
    expect(sheet.level).toBe(1);
    expect(sheet.currExp).toBe(0);
    expect(sheet.nextLvlBaseExp).toBe(100);
    expect(sheet.talentLvl).toBe(1);
    expect(sheet.physicalsLvl).toBe(1);
    expect(sheet.mentalsLvl).toBe(1);
    expect(sheet.spiritualsLvl).toBe(1);
    expect(sheet.skillsLvl).toBe(1);
    expect(sheet.stamina).toEqual({ min: 0, current: 100, max: 100 });
    expect(sheet.health).toEqual({ min: 0, current: 100, max: 100 });
    expect(sheet.createdAt).toBe("2025-01-01T00:00:00.000Z");
    expect(sheet.updatedAt).toBe("2025-01-01T00:00:00.000Z");
    // Go's CharacterPrivateOnlyResponse has no `aura` field at all (commented
    // out server-side) even though CharacterSheetSummary requires one.
    expect(sheet.aura).toBeUndefined();
  });

  it("returns [] when the response has no characterSheets key", async () => {
    server.use(http.get(`${baseUrl}/charactersheets`, () => HttpResponse.json({})));

    const result = await characterSheetsService.listCharacterSheets(token);

    expect(result).toEqual([]);
  });
});

// ─── getCharacterSheetDetails ───────────────────────────────────────────────

describe("getCharacterSheetDetails", () => {
  it("GETs /charactersheets/:id?include=submission with Authorization header", async () => {
    let capturedAuth: string | null = null;
    let capturedUrl = "";
    server.use(
      http.get(`${baseUrl}/charactersheets/:id`, ({ request }) => {
        capturedAuth = request.headers.get("authorization");
        capturedUrl = request.url;
        return HttpResponse.json({ characterSheet: sheetApiFixture });
      }),
    );

    await characterSheetsService.getCharacterSheetDetails(token, "sheet-1");

    expect(capturedUrl).toBe(`${baseUrl}/charactersheets/sheet-1?include=submission`);
    expect(capturedAuth).toBe(`Bearer ${token}`);
  });

  it("returns the sheet untouched, field by field", async () => {
    server.use(
      http.get(`${baseUrl}/charactersheets/:id`, () =>
        HttpResponse.json({ characterSheet: sheetApiFixture }),
      ),
    );

    const result = await characterSheetsService.getCharacterSheetDetails(token, "sheet-1");

    expect(result).toEqual(expectedConvertedSheet());
  });

  it("passes submission through untouched when present", async () => {
    server.use(
      http.get(`${baseUrl}/charactersheets/:id`, () =>
        HttpResponse.json({
          characterSheet: {
            ...sheetApiFixture,
            submission: { campaignUuid: "campaign-1", createdAt: "2026-06-01T00:00:00Z" },
          },
        }),
      ),
    );

    const result = await characterSheetsService.getCharacterSheetDetails(token, "sheet-1");

    expect(result.submission).toEqual({
      campaignUuid: "campaign-1",
      createdAt: "2026-06-01T00:00:00Z",
    });
  });

  // Regression test for the enum-key-casing bug: sheetApiFixture's maps are
  // all empty, which is exactly why this slipped through initially. With
  // real PascalCase Go-style keys present, this proves the service
  // normalizes abilities/physicalAttributes/mentalAttributes/
  // spiritualAttributes/physicalSkills/mentalSkills/spiritualSkills/
  // principles/categories/commonProficiencies to the frontend's
  // lowercase-first convention — without which every existing sheet's
  // diagrams/skills/abilities/principles/categories/proficiencies would
  // render blank, since PhysicalsDiagram.tsx/MentalsDiagram.tsx/
  // NenPrinciplesDiagram.tsx and distribute.ts all look these up by
  // lowercase-first key.
  it("normalizes enum-keyed maps to the frontend's lowercase-first convention", async () => {
    const wire = sheetWireWithEnumKeyedMaps();
    server.use(
      http.get(`${baseUrl}/charactersheets/:id`, () =>
        HttpResponse.json({ characterSheet: wire }),
      ),
    );

    const result = await characterSheetsService.getCharacterSheetDetails(token, "sheet-1");

    expectAllMapsNormalized(result, wire);
  });

  // D4 (fixed): this method now reads the camelCase `characterSheet` key,
  // matching the real backend (get_character_sheet.go tags that field
  // `json:"characterSheet"`) — this used to resolve to `undefined` against
  // this exact response body before the envelope-key rename.
  it("resolves the sheet against the real (camelCase `characterSheet`) backend response", async () => {
    server.use(
      http.get(`${baseUrl}/charactersheets/:id`, () =>
        HttpResponse.json({ characterSheet: sheetApiFixture }),
      ),
    );

    const result = await characterSheetsService.getCharacterSheetDetails(token, "sheet-1");

    expect(result).toEqual(expectedConvertedSheet());
  });
});

// ─── submitCharacterSheet ───────────────────────────────────────────────────

describe("submitCharacterSheet", () => {
  it("POSTs to /submissions/charactersheets/submit with the body untouched and Authorization header, resolving void", async () => {
    let capturedBody: unknown;
    let capturedAuth: string | null = null;
    let capturedUrl = "";
    server.use(
      http.post(`${baseUrl}/submissions/charactersheets/submit`, async ({ request }) => {
        capturedBody = await request.json();
        capturedAuth = request.headers.get("authorization");
        capturedUrl = request.url;
        return HttpResponse.json({}, { status: 201 });
      }),
    );

    const result = await characterSheetsService.submitCharacterSheet(
      token,
      "sheet-1",
      "campaign-1",
    );

    expect(capturedUrl).toBe(`${baseUrl}/submissions/charactersheets/submit`);
    expect(capturedAuth).toBe(`Bearer ${token}`);
    expect(capturedBody).toEqual({ sheetUuid: "sheet-1", campaignUuid: "campaign-1" });
    expect(result).toBeUndefined();
  });
});

// ─── acceptSheetSubmission ───────────────────────────────────────────────────

describe("acceptSheetSubmission", () => {
  it("POSTs to /submissions/:sheetUuid/accept with an empty body and Authorization header, resolving void", async () => {
    let capturedBody: unknown;
    let capturedAuth: string | null = null;
    let capturedUrl = "";
    server.use(
      http.post(`${baseUrl}/submissions/:sheetUuid/accept`, async ({ request }) => {
        capturedBody = await request.json();
        capturedAuth = request.headers.get("authorization");
        capturedUrl = request.url;
        return HttpResponse.json({});
      }),
    );

    const result = await characterSheetsService.acceptSheetSubmission(token, "sheet-1");

    expect(capturedUrl).toBe(`${baseUrl}/submissions/sheet-1/accept`);
    expect(capturedAuth).toBe(`Bearer ${token}`);
    expect(capturedBody).toEqual({});
    expect(result).toBeUndefined();
  });
});

// ─── rejectSheetSubmission ───────────────────────────────────────────────────

describe("rejectSheetSubmission", () => {
  it("POSTs to /submissions/:sheetUuid/reject with an empty body and Authorization header, resolving void", async () => {
    let capturedBody: unknown;
    let capturedAuth: string | null = null;
    let capturedUrl = "";
    server.use(
      http.post(`${baseUrl}/submissions/:sheetUuid/reject`, async ({ request }) => {
        capturedBody = await request.json();
        capturedAuth = request.headers.get("authorization");
        capturedUrl = request.url;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const result = await characterSheetsService.rejectSheetSubmission(token, "sheet-1");

    expect(capturedUrl).toBe(`${baseUrl}/submissions/sheet-1/reject`);
    expect(capturedAuth).toBe(`Bearer ${token}`);
    expect(capturedBody).toEqual({});
    expect(result).toBeUndefined();
  });
});

// ─── createCharacterSheet ───────────────────────────────────────────────────
//
// The allow-list filtering here is real, deliberate business logic (see
// castRequest in create_character_sheet.go: SkillsExps/ProficienciesExps are
// looked up via enum.SkillNameFrom/enum.WeaponNameFrom — an unknown key is a
// 400). skillsAllowed=["Vitality","Energy"], proficienciesAllowed=["Dagger",
// "Bow"] below are exercised with THREE entries per map: one allowed+exp>0
// (must appear), one allowed+exp==0 (must be dropped by the exp filter), one
// NOT allowed+exp>0 (must be dropped by the allow-list filter). Attribute
// points get NO allow-list filtering in createCharacterSheet (unlike update) —
// every attribute with points>0 is sent, proven by including a non-primary
// attribute (Strength) alongside a primary one (Resistance).

describe("createCharacterSheet", () => {
  const charClass = buildCharClass();

  const charSheet = buildCharSheet({
    physicalSkills: {
      vitality: skill(10), // allowed, exp>0 -> included as "Vitality"
      energy: skill(0), // allowed, exp==0 -> excluded
      push: skill(7), // NOT allowed, exp>0 -> excluded
    },
    spiritualSkills: {
      nen: skill(5), // NOT allowed -> excluded (also proves physical+spiritual are merged)
    },
    commonProficiencies: {
      Dagger: prof(20), // allowed, exp>0 -> included
      Bow: prof(0), // allowed, exp==0 -> excluded
      Sword: prof(15), // NOT allowed, exp>0 -> excluded
    },
    physicalAttributes: {
      resistance: attr(3), // points>0 -> included as "Resistance"
      strength: attr(2), // points>0 -> included as "Strength" (NO primary-only filter in create)
      agility: attr(0), // points==0 -> excluded
    },
    mentalAttributes: {
      resilience: attr(1), // points>0 -> included as "Resilience"
    },
  });

  it("POSTs to /charactersheets with the allow-listed body and Authorization header", async () => {
    let capturedBody: unknown;
    let capturedAuth: string | null = null;
    server.use(
      http.post(`${baseUrl}/charactersheets`, async ({ request }) => {
        capturedBody = await request.json();
        capturedAuth = request.headers.get("authorization");
        return HttpResponse.json(
          { characterSheet: { uuid: "new-sheet-uuid" } },
          { status: 201 },
        );
      }),
    );

    await characterSheetsService.createCharacterSheet(token, charSheet, charClass, "campaign-1");

    expect(capturedAuth).toBe(`Bearer ${token}`);
    // NOTE: profile.* used to go through the generic case converter
    // (briefDescription -> brief_description); now it passes straight
    // through untouched. The top-level keys (campaignUuid, characterClass,
    // skillsExps, proficienciesExps, attributePoints) are hand-typed
    // literals in characterSheetsService.ts, NOT produced by any converter —
    // they were left snake_case when the generic converter was removed (a
    // functional break against the real backend, which expects camelCase
    // there too per create_character_sheet.go) until this task flipped them.
    expect(capturedBody).toEqual({
      campaignUuid: "campaign-1",
      profile: {
        nickname: "TestNick",
        fullname: "Test Character",
        alignment: "Neutral",
        description: "",
        briefDescription: "A test character",
        birthday: "2000-01-01",
        age: 25,
      },
      characterClass: "Especialista",
      skillsExps: { Vitality: 10 },
      proficienciesExps: { Dagger: 20 },
      attributePoints: { Resistance: 3, Strength: 2, Resilience: 1 },
    });
  });

  it("defaults campaignUuid to null when no campaignUuid is passed", async () => {
    let capturedBody: unknown;
    server.use(
      http.post(`${baseUrl}/charactersheets`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ characterSheet: { uuid: "new-sheet-uuid" } }, { status: 201 });
      }),
    );

    await characterSheetsService.createCharacterSheet(token, charSheet, charClass);

    expect((capturedBody as Record<string, unknown>).campaignUuid).toBeNull();
  });

  it("sends empty allow-list maps when charClass is undefined", async () => {
    let capturedBody: unknown;
    server.use(
      http.post(`${baseUrl}/charactersheets`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ characterSheet: { uuid: "new-sheet-uuid" } }, { status: 201 });
      }),
    );

    await characterSheetsService.createCharacterSheet(token, charSheet, undefined);

    const body = capturedBody as Record<string, unknown>;
    expect(body.skillsExps).toEqual({});
    expect(body.proficienciesExps).toEqual({});
    // attributePoints is NOT allow-list filtered, so it's unaffected by a missing charClass
    expect(body.attributePoints).toEqual({ Resistance: 3, Strength: 2, Resilience: 1 });
  });

  it("returns { uuid } read from the characterSheet envelope", async () => {
    server.use(
      http.post(`${baseUrl}/charactersheets`, () =>
        HttpResponse.json({ characterSheet: { uuid: "new-sheet-uuid" } }, { status: 201 }),
      ),
    );

    const result = await characterSheetsService.createCharacterSheet(token, charSheet, charClass);

    expect(result).toEqual({ uuid: "new-sheet-uuid" });
  });
});

// ─── deleteCharacterSheet ───────────────────────────────────────────────────

describe("deleteCharacterSheet", () => {
  it("DELETEs /charactersheets/:uuid with Authorization header, resolving void", async () => {
    let capturedAuth: string | null = null;
    let capturedUrl = "";
    server.use(
      http.delete(`${baseUrl}/charactersheets/:uuid`, ({ request }) => {
        capturedAuth = request.headers.get("authorization");
        capturedUrl = request.url;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const result = await characterSheetsService.deleteCharacterSheet(token, "sheet-1");

    expect(capturedUrl).toBe(`${baseUrl}/charactersheets/sheet-1`);
    expect(capturedAuth).toBe(`Bearer ${token}`);
    expect(result).toBeUndefined();
  });
});

// ─── updateCharacterSheet ───────────────────────────────────────────────────
//
// Deliberately different business logic from createCharacterSheet:
//   - proficiencies: matched via a camelCase<->original map built from
//     distribution.proficienciesAllowed, so BOTH "dagger" (camelCase, as
//     produced by the sheet factories) and "Dagger" (original PascalCase)
//     keys on commonProficiencies resolve to the same allow-listed entry.
//   - attribute points: physicalAttributes are filtered to PRIMARY_PHYS_ATTRS
//     only (Resistance/Agility/Flexibility/Sense) — Strength/Celerity/
//     Dexterity/Constitution are excluded even with points>0, because they're
//     derived server-side. mentalAttributes get NO such filter.

describe("updateCharacterSheet", () => {
  const charClass = buildCharClass();

  const charSheet = buildCharSheet({
    physicalSkills: {
      vitality: skill(10), // allowed, exp>0 -> included
      energy: skill(0), // allowed, exp==0 -> excluded
      push: skill(7), // NOT allowed -> excluded
    },
    commonProficiencies: {
      dagger: prof(12), // camelCase key, allowed via toCamel("Dagger") -> included as "Dagger"
      Bow: prof(8), // original PascalCase key, allowed -> included as "Bow"
      sword: prof(5), // NOT allowed -> excluded
    },
    physicalAttributes: {
      resistance: attr(4), // primary, points>0 -> included as "Resistance"
      agility: attr(2), // primary, points>0 -> included as "Agility"
      strength: attr(5), // NOT primary (derived), points>0 -> excluded
      celerity: attr(3), // NOT primary (derived), points>0 -> excluded
    },
    mentalAttributes: {
      adaptability: attr(2), // points>0 -> included as "Adaptability" (no primary filter for mental)
    },
  });

  it("PATCHes /charactersheets/:uuid with the allow-listed body and Authorization header", async () => {
    let capturedBody: unknown;
    let capturedAuth: string | null = null;
    let capturedUrl = "";
    server.use(
      http.patch(`${baseUrl}/charactersheets/:uuid`, async ({ request }) => {
        capturedBody = await request.json();
        capturedAuth = request.headers.get("authorization");
        capturedUrl = request.url;
        return HttpResponse.json({ characterSheet: sheetApiFixture });
      }),
    );

    await characterSheetsService.updateCharacterSheet(token, "sheet-1", charSheet, charClass);

    expect(capturedUrl).toBe(`${baseUrl}/charactersheets/sheet-1`);
    expect(capturedAuth).toBe(`Bearer ${token}`);
    // See the createCharacterSheet test above for why these top-level keys
    // are camelCase (campaignUuid-style), fixed alongside briefDescription.
    expect(capturedBody).toEqual({
      profile: {
        nickname: "TestNick",
        fullname: "Test Character",
        alignment: "Neutral",
        description: "",
        briefDescription: "A test character",
        birthday: "2000-01-01",
        age: 25,
      },
      characterClass: "Especialista",
      skillsExps: { Vitality: 10 },
      proficienciesExps: { Dagger: 12, Bow: 8 },
      attributePoints: { Resistance: 4, Agility: 2, Adaptability: 2 },
    });
  });

  it("sends empty allow-list maps when charClass is undefined", async () => {
    let capturedBody: unknown;
    server.use(
      http.patch(`${baseUrl}/charactersheets/:uuid`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ characterSheet: sheetApiFixture });
      }),
    );

    await characterSheetsService.updateCharacterSheet(token, "sheet-1", charSheet, undefined);

    const body = capturedBody as Record<string, unknown>;
    expect(body.skillsExps).toEqual({});
    expect(body.proficienciesExps).toEqual({});
    // attributePoints survives without a charClass — it's filtered only by
    // PRIMARY_PHYS_ATTRS (a hardcoded set) + mentalAttributes, not by distribution.
    expect(body.attributePoints).toEqual({ Resistance: 4, Agility: 2, Adaptability: 2 });
  });

  it("returns the updated sheet untouched, field by field", async () => {
    server.use(
      http.patch(`${baseUrl}/charactersheets/:uuid`, () =>
        HttpResponse.json({ characterSheet: sheetApiFixture }),
      ),
    );

    const result = await characterSheetsService.updateCharacterSheet(
      token,
      "sheet-1",
      charSheet,
      charClass,
    );

    expect(result).toEqual(expectedConvertedSheet());
  });

  // Same regression coverage as getCharacterSheetDetails above — updateCharacterSheet
  // has its own response-mapping call site and must normalize independently.
  it("normalizes enum-keyed maps to the frontend's lowercase-first convention", async () => {
    const wire = sheetWireWithEnumKeyedMaps();
    server.use(
      http.patch(`${baseUrl}/charactersheets/:uuid`, () =>
        HttpResponse.json({ characterSheet: wire }),
      ),
    );

    const result = await characterSheetsService.updateCharacterSheet(
      token,
      "sheet-1",
      charSheet,
      charClass,
    );

    expectAllMapsNormalized(result, wire);
  });

  // D4 (fixed): same envelope-key fix as getCharacterSheetDetails —
  // confirmed real against update_character_sheet.go.
  it("resolves the sheet against the real (camelCase `characterSheet`) backend response", async () => {
    server.use(
      http.patch(`${baseUrl}/charactersheets/:uuid`, () =>
        HttpResponse.json({ characterSheet: sheetApiFixture }),
      ),
    );

    const result = await characterSheetsService.updateCharacterSheet(
      token,
      "sheet-1",
      charSheet,
      charClass,
    );

    expect(result).toEqual(expectedConvertedSheet());
  });
});

// ─── patchCharacterSheetProfile ─────────────────────────────────────────────

describe("patchCharacterSheetProfile", () => {
  it("PATCHes /charactersheets/:sheetUuid/profile with the body untouched and Authorization header, resolving void", async () => {
    let capturedBody: unknown;
    let capturedAuth: string | null = null;
    let capturedUrl = "";
    server.use(
      http.patch(`${baseUrl}/charactersheets/:sheetUuid/profile`, async ({ request }) => {
        capturedBody = await request.json();
        capturedAuth = request.headers.get("authorization");
        capturedUrl = request.url;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const result = await characterSheetsService.patchCharacterSheetProfile(
      token,
      "sheet-1",
      "https://r2.example.com/avatar.png",
      "https://r2.example.com/cover.png",
      "New brief description",
    );

    expect(capturedUrl).toBe(`${baseUrl}/charactersheets/sheet-1/profile`);
    expect(capturedAuth).toBe(`Bearer ${token}`);
    expect(capturedBody).toEqual({
      avatarUrl: "https://r2.example.com/avatar.png",
      coverUrl: "https://r2.example.com/cover.png",
      briefDescription: "New brief description",
    });
    expect(result).toBeUndefined();
  });

  it("omits undefined fields from the body (partial patch)", async () => {
    let capturedBody: unknown;
    server.use(
      http.patch(`${baseUrl}/charactersheets/:sheetUuid/profile`, async ({ request }) => {
        capturedBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await characterSheetsService.patchCharacterSheetProfile(
      token,
      "sheet-1",
      undefined,
      undefined,
      "Only the brief description changes",
    );

    expect(capturedBody).toEqual({ briefDescription: "Only the brief description changes" });
  });

  it("sends null explicitly to clear a field", async () => {
    let capturedBody: unknown;
    server.use(
      http.patch(`${baseUrl}/charactersheets/:sheetUuid/profile`, async ({ request }) => {
        capturedBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await characterSheetsService.patchCharacterSheetProfile(token, "sheet-1", null, null, null);

    expect(capturedBody).toEqual({
      avatarUrl: null,
      coverUrl: null,
      briefDescription: null,
    });
  });
});
