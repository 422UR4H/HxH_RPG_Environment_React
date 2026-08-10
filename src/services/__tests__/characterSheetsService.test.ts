// src/services/__tests__/characterSheetsService.test.ts
//
// Wire-format safety net for characterSheetsService.ts — the service that
// carries the D4 "two different conversion orders" issue this whole phase
// exists to catch a regression on. Mirrors the Go structs in
// System_X_System/internal/app/api/sheet/{character_sheet_response,
// character_sheet_sumary_response,create_character_sheet,update_character_sheet,
// get_character_sheet,list_character_sheets,delete_character_sheet,
// patch_character_sheet_profile}.go and
// System_X_System/internal/app/api/submission/{submit_character_sheet,
// accept_sheet_submission,reject_sheet_submission}.go.
//
// Per method: (1) request URL/verb + wire-format (snake_case) body,
// (2) response mapped field-by-field into the camelCase src/types/ shape,
// (3) Authorization header sent when a token is passed.
//
// D4 (documented, NOT fixed here — Phase 8 will):
//   - listCharacterSheets converts the WHOLE envelope to camelCase first,
//     then reads `.characterSheets` off the converted object.
//   - getCharacterSheetDetails / updateCharacterSheet read the raw
//     snake_case envelope key `character_sheet` FIRST, then convert only
//     the inner payload.
//   Both work today only because both envelope-key spellings exist. Tests
//   below assert the actual key each method depends on, so a future
//   unification can't silently break one path without a test failing.
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/server";
import { characterSheetsService } from "../characterSheetsService";
import { sheetApiFixture, sheetSummaryApiFixture } from "../../test/fixtures/sheet";
import type {
  CharacterSheet,
  Attribute,
  Skill,
  Proficiency,
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
    spiritualSkills: {},
    principles: {},
    categories: {},
    commonProficiencies: {},
    jointProficiencies: [],
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

// objToCamelCase(sheetApiFixture) worked out field-by-field. Two fields
// diverge from what src/types/characterSheet.ts's CharacterSheet declares:
//   - mentalSkills: present on the wire (mental_skills) but CharacterSheet
//     has no such field at all (only physicalSkills/spiritualSkills).
//   - jointProficiencies: Go sends a map (joint_proficiencies), converted to
//     a plain object — CharacterSheet types it as an array. Both are real
//     gaps in src/types/, flagged in the PR body, not fixed here.
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

// ─── listCharacterSheets ────────────────────────────────────────────────────

describe("listCharacterSheets", () => {
  it("GETs /charactersheets with Authorization header", async () => {
    let capturedAuth: string | null = null;
    let capturedUrl = "";
    server.use(
      http.get(`${baseUrl}/charactersheets`, ({ request }) => {
        capturedAuth = request.headers.get("authorization");
        capturedUrl = request.url;
        return HttpResponse.json({ character_sheets: [sheetSummaryApiFixture] });
      }),
    );

    await characterSheetsService.listCharacterSheets(token);

    expect(capturedUrl).toBe(`${baseUrl}/charactersheets`);
    expect(capturedAuth).toBe(`Bearer ${token}`);
  });

  it("returns the list in camelCase, field by field", async () => {
    server.use(
      http.get(`${baseUrl}/charactersheets`, () =>
        HttpResponse.json({ character_sheets: [sheetSummaryApiFixture] }),
      ),
    );

    const result = await characterSheetsService.listCharacterSheets(token);

    expect(result).toHaveLength(1);
    // NOTE: player_uuid is converted by snakeToCamel to "playerUuid" (single
    // uppercase U), never "playerUUID". CharacterSheetSummary declares
    // playerUUID/masterUUID/campaignUUID (double uppercase) — a real
    // frontend type bug already flagged by src/test/fixtures/sheet.ts's
    // sheetSummaryApiFixture comment. Documenting it here too since it's
    // this service that actually produces the mismatched runtime shape.
    const sheet = result[0] as unknown as Record<string, unknown>;
    expect(sheet.playerUuid).toBe("user-1");
    expect(sheet.playerUUID).toBeUndefined();
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

  it("returns [] when the response has no character_sheets key", async () => {
    server.use(http.get(`${baseUrl}/charactersheets`, () => HttpResponse.json({})));

    const result = await characterSheetsService.listCharacterSheets(token);

    expect(result).toEqual([]);
  });

  // D4: this method converts the WHOLE envelope to camelCase before reading
  // .characterSheets, so it tolerates EITHER envelope-key spelling — unlike
  // getCharacterSheetDetails/updateCharacterSheet below, which only accept
  // the raw snake_case key. That asymmetry is exactly what Phase 8 needs to
  // unify without silently breaking one of the two paths.
  it("also accepts an already-camelCase characterSheets envelope key (D4: whole-object conversion)", async () => {
    server.use(
      http.get(`${baseUrl}/charactersheets`, () =>
        HttpResponse.json({ characterSheets: [sheetSummaryApiFixture] }),
      ),
    );

    const result = await characterSheetsService.listCharacterSheets(token);

    expect(result).toHaveLength(1);
    expect((result[0] as unknown as Record<string, unknown>).uuid).toBe("sheet-1");
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
        return HttpResponse.json({ character_sheet: sheetApiFixture });
      }),
    );

    await characterSheetsService.getCharacterSheetDetails(token, "sheet-1");

    expect(capturedUrl).toBe(`${baseUrl}/charactersheets/sheet-1?include=submission`);
    expect(capturedAuth).toBe(`Bearer ${token}`);
  });

  it("returns the sheet in camelCase, field by field", async () => {
    server.use(
      http.get(`${baseUrl}/charactersheets/:id`, () =>
        HttpResponse.json({ character_sheet: sheetApiFixture }),
      ),
    );

    const result = await characterSheetsService.getCharacterSheetDetails(token, "sheet-1");

    expect(result).toEqual(expectedConvertedSheet());
  });

  it("maps submission when present", async () => {
    server.use(
      http.get(`${baseUrl}/charactersheets/:id`, () =>
        HttpResponse.json({
          character_sheet: {
            ...sheetApiFixture,
            submission: { campaign_uuid: "campaign-1", created_at: "2026-06-01T00:00:00Z" },
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

  // D4: this method reads the RAW snake_case `character_sheet` key first,
  // then converts only the inner value. An already-camelCase envelope key
  // (as listCharacterSheets tolerates) breaks it silently: data.character_sheet
  // is undefined, and objToCamelCase(undefined) just returns undefined —
  // no error, no throw, the promise resolves to undefined.
  it("resolves undefined if the envelope key were ever converted to camelCase (D4: raw-key-first)", async () => {
    server.use(
      http.get(`${baseUrl}/charactersheets/:id`, () =>
        // Simulates what a "convert-the-whole-envelope-first" refactor would
        // produce: characterSheet instead of character_sheet.
        HttpResponse.json({ characterSheet: sheetApiFixture }),
      ),
    );

    const result = await characterSheetsService.getCharacterSheetDetails(token, "sheet-1");

    expect(result).toBeUndefined();
  });
});

// ─── submitCharacterSheet ───────────────────────────────────────────────────

describe("submitCharacterSheet", () => {
  it("POSTs to /submissions/charactersheets/submit with snake_case body and Authorization header, resolving void", async () => {
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
    expect(capturedBody).toEqual({ sheet_uuid: "sheet-1", campaign_uuid: "campaign-1" });
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

  it("POSTs to /charactersheets with the allow-listed snake_case body and Authorization header", async () => {
    let capturedBody: unknown;
    let capturedAuth: string | null = null;
    server.use(
      http.post(`${baseUrl}/charactersheets`, async ({ request }) => {
        capturedBody = await request.json();
        capturedAuth = request.headers.get("authorization");
        return HttpResponse.json(
          { character_sheet: { uuid: "new-sheet-uuid" } },
          { status: 201 },
        );
      }),
    );

    await characterSheetsService.createCharacterSheet(token, charSheet, charClass, "campaign-1");

    expect(capturedAuth).toBe(`Bearer ${token}`);
    expect(capturedBody).toEqual({
      campaign_uuid: "campaign-1",
      profile: {
        nickname: "TestNick",
        fullname: "Test Character",
        alignment: "Neutral",
        description: "",
        brief_description: "A test character",
        birthday: "2000-01-01",
        age: 25,
      },
      character_class: "Especialista",
      skills_exps: { Vitality: 10 },
      proficiencies_exps: { Dagger: 20 },
      attribute_points: { Resistance: 3, Strength: 2, Resilience: 1 },
    });
  });

  it("defaults campaign_uuid to null when no campaignUuid is passed", async () => {
    let capturedBody: unknown;
    server.use(
      http.post(`${baseUrl}/charactersheets`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ character_sheet: { uuid: "new-sheet-uuid" } }, { status: 201 });
      }),
    );

    await characterSheetsService.createCharacterSheet(token, charSheet, charClass);

    expect((capturedBody as Record<string, unknown>).campaign_uuid).toBeNull();
  });

  it("sends empty allow-list maps when charClass is undefined", async () => {
    let capturedBody: unknown;
    server.use(
      http.post(`${baseUrl}/charactersheets`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ character_sheet: { uuid: "new-sheet-uuid" } }, { status: 201 });
      }),
    );

    await characterSheetsService.createCharacterSheet(token, charSheet, undefined);

    const body = capturedBody as Record<string, unknown>;
    expect(body.skills_exps).toEqual({});
    expect(body.proficiencies_exps).toEqual({});
    // attribute_points is NOT allow-list filtered, so it's unaffected by a missing charClass
    expect(body.attribute_points).toEqual({ Resistance: 3, Strength: 2, Resilience: 1 });
  });

  it("returns { uuid } read from the character_sheet envelope", async () => {
    server.use(
      http.post(`${baseUrl}/charactersheets`, () =>
        HttpResponse.json({ character_sheet: { uuid: "new-sheet-uuid" } }, { status: 201 }),
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

  it("PATCHes /charactersheets/:uuid with the allow-listed snake_case body and Authorization header", async () => {
    let capturedBody: unknown;
    let capturedAuth: string | null = null;
    let capturedUrl = "";
    server.use(
      http.patch(`${baseUrl}/charactersheets/:uuid`, async ({ request }) => {
        capturedBody = await request.json();
        capturedAuth = request.headers.get("authorization");
        capturedUrl = request.url;
        return HttpResponse.json({ character_sheet: sheetApiFixture });
      }),
    );

    await characterSheetsService.updateCharacterSheet(token, "sheet-1", charSheet, charClass);

    expect(capturedUrl).toBe(`${baseUrl}/charactersheets/sheet-1`);
    expect(capturedAuth).toBe(`Bearer ${token}`);
    expect(capturedBody).toEqual({
      profile: {
        nickname: "TestNick",
        fullname: "Test Character",
        alignment: "Neutral",
        description: "",
        brief_description: "A test character",
        birthday: "2000-01-01",
        age: 25,
      },
      character_class: "Especialista",
      skills_exps: { Vitality: 10 },
      proficiencies_exps: { Dagger: 12, Bow: 8 },
      attribute_points: { Resistance: 4, Agility: 2, Adaptability: 2 },
    });
  });

  it("sends empty allow-list maps when charClass is undefined", async () => {
    let capturedBody: unknown;
    server.use(
      http.patch(`${baseUrl}/charactersheets/:uuid`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ character_sheet: sheetApiFixture });
      }),
    );

    await characterSheetsService.updateCharacterSheet(token, "sheet-1", charSheet, undefined);

    const body = capturedBody as Record<string, unknown>;
    expect(body.skills_exps).toEqual({});
    expect(body.proficiencies_exps).toEqual({});
    // attribute_points survives without a charClass — it's filtered only by
    // PRIMARY_PHYS_ATTRS (a hardcoded set) + mentalAttributes, not by distribution.
    expect(body.attribute_points).toEqual({ Resistance: 4, Agility: 2, Adaptability: 2 });
  });

  it("returns the updated sheet in camelCase, field by field", async () => {
    server.use(
      http.patch(`${baseUrl}/charactersheets/:uuid`, () =>
        HttpResponse.json({ character_sheet: sheetApiFixture }),
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

  // D4: same raw-key-first pattern as getCharacterSheetDetails.
  it("resolves undefined if the envelope key were ever converted to camelCase (D4: raw-key-first)", async () => {
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

    expect(result).toBeUndefined();
  });
});

// ─── patchCharacterSheetProfile ─────────────────────────────────────────────

describe("patchCharacterSheetProfile", () => {
  it("PATCHes /charactersheets/:sheetUuid/profile with snake_case body and Authorization header, resolving void", async () => {
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
      avatar_url: "https://r2.example.com/avatar.png",
      cover_url: "https://r2.example.com/cover.png",
      brief_description: "New brief description",
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

    expect(capturedBody).toEqual({ brief_description: "Only the brief description changes" });
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
      avatar_url: null,
      cover_url: null,
      brief_description: null,
    });
  });
});
