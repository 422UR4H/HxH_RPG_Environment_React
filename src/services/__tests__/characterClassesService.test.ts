// src/services/__tests__/characterClassesService.test.ts
//
// Wire-format safety net for characterClassesService.ts. Mirrors the Go
// structs in System_X_System/internal/app/api/sheet/character_class_response.go,
// list_classes.go and get_class.go.
//
// Per method: (1) request URL/verb + Authorization header, (2) response
// mapped field-by-field into the camelCase src/types/characterClass.ts shape.
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/server";
import { characterClassesService } from "../characterClassesService";
import type { CharacterClass } from "../../types/characterClass";

const baseUrl = "http://localhost:5000";
const token = "test-token";

// ─── Wire-format (Go) fixture ──────────────────────────────────────────────
// Mirrors CharacterClassResponse (character_class_response.go). Map keys
// (abilities/attributes/skills/proficiencies) use real enum String() values
// from internal/domain/entity/enum/{ability_name,attribute_name,skill_name,
// weapon_name,category_name}.go — PascalCase English identifiers (e.g.
// "Resistance", "Vitality", "Dagger") — not display-name placeholders, since
// the PascalCase-vs-lowercase-first-letter distinction below is real
// behavior, not incidental to the fixture's contents. One entry per
// map/array field is enough to prove the conversion — this service doesn't
// need the exhaustive depth mapsService/characterSheetsService got.
const characterClassWire = {
  profile: {
    name: "Hunter",
    alignment: "Bom",
    description: "Descrição completa da classe",
    brief_description: "Descrição breve",
  },
  abilities: {
    Physicals: { level: 2, exp: 50, curr_exp: 10, next_lvl_base_exp: 100, bonus: 1.5 },
  },
  attributes: {
    Resistance: { level: 3, exp: 80, curr_exp: 20, next_lvl_base_exp: 150, points: 4, power: 12 },
  },
  skills: {
    Vitality: { level: 1, exp: 10, curr_exp: 5, next_lvl_base_exp: 50, value: 3 },
  },
  joint_skills: {},
  proficiencies: {
    Dagger: { level: 1, exp: 5, curr_exp: 2, next_lvl_base_exp: 30 },
  },
  joint_proficiencies: [
    { level: 1, exp: 5, curr_exp: 2, next_lvl_base_exp: 30, name: "Bow" },
  ],
  indicated_categories: ["Transmutation", "Manipulation"],
  distribution: {
    skill_points: [1, 2, 3],
    proficiency_points: [{ level: 1, exp: 0 }],
    skills_allowed: ["Vitality"],
    proficiencies_allowed: ["Dagger"],
  },
};

// Camel-case shape a caller of characterClassesService actually receives.
//
// NOTE (real behavior, not a bug here — flagged for awareness): objToCamelCase
// lowercases the first letter of *every* key it sees, including map keys
// like "Resistance"/"Vitality"/"Dagger" that are domain identifiers, not
// wire-format field names. That's why they come back as
// "resistance"/"vitality"/"dagger" below. This happens to be harmless (even
// required) for ability/attribute names — src/features/sheet/utils/
// distribute.ts's own getBaseAbilities()/getBaseAttributesForType() hardcode
// the lowercase-first form ("physicals", "resistance", ...) to look these
// up — but it is NOT applied to array *values* (indicatedCategories,
// skillsAllowed, proficienciesAllowed, jointProficiencies[].name all stay
// PascalCase, since those are values, not keys).
//
// Also note: Ability's declared TS type (src/types/characterSheet.ts) only
// has exp?/level/bonus, but objToCamelCase converts every key present on
// the wire regardless of the declared type — curr_exp/next_lvl_base_exp
// still come through at runtime as currExp/nextLvlBaseExp. Included here
// because this is what actually comes back, not because the type declares it.
const characterClassCamel = {
  profile: {
    name: "Hunter",
    alignment: "Bom",
    description: "Descrição completa da classe",
    briefDescription: "Descrição breve",
  },
  abilities: {
    physicals: { level: 2, exp: 50, currExp: 10, nextLvlBaseExp: 100, bonus: 1.5 },
  },
  attributes: {
    resistance: { level: 3, exp: 80, currExp: 20, nextLvlBaseExp: 150, points: 4, power: 12 },
  },
  skills: {
    vitality: { level: 1, exp: 10, currExp: 5, nextLvlBaseExp: 50, value: 3 },
  },
  jointSkills: {},
  proficiencies: {
    dagger: { level: 1, exp: 5, currExp: 2, nextLvlBaseExp: 30 },
  },
  jointProficiencies: [
    { level: 1, exp: 5, currExp: 2, nextLvlBaseExp: 30, name: "Bow" },
  ],
  indicatedCategories: ["Transmutation", "Manipulation"],
  distribution: {
    skillPoints: [1, 2, 3],
    proficiencyPoints: [{ level: 1, exp: 0 }],
    skillsAllowed: ["Vitality"],
    proficienciesAllowed: ["Dagger"],
  },
} as unknown as CharacterClass;

describe("characterClassesService", () => {
  describe("listCharacterClasses", () => {
    it("GETs /classes with Authorization header", async () => {
      let capturedAuth: string | null = null;
      let capturedUrl = "";
      server.use(
        http.get(`${baseUrl}/classes`, ({ request }) => {
          capturedAuth = request.headers.get("authorization");
          capturedUrl = request.url;
          // PascalCase envelope, see FINDING below.
          return HttpResponse.json({ CharacterClasses: [characterClassWire] });
        }),
      );

      await characterClassesService.listCharacterClasses(token);

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedUrl).toBe(`${baseUrl}/classes`);
    });

    // NOTE (deliberate backend quirk, not a bug): ListCharacterClassesBody
    // (list_classes.go) carries an *explicit* `json:"CharacterClasses"` tag —
    // PascalCase on purpose (see the comment right on that struct field:
    // "Fase 8 do frontend unifica todo o wire da API para camelCase via DTO
    // — esse campo muda junto, não isoladamente"). The fixture below uses
    // the real PascalCase envelope key, not camelCase/snake_case.
    it("returns the list in camelCase, field by field, via the real PascalCase `CharacterClasses` envelope", async () => {
      server.use(
        http.get(`${baseUrl}/classes`, () =>
          HttpResponse.json({ CharacterClasses: [characterClassWire] }),
        ),
      );

      const result = await characterClassesService.listCharacterClasses(token);

      expect(result).toEqual([characterClassCamel]);
    });
  });

  describe("getCharacterClassDetails", () => {
    it("GETs /classes/:id with Authorization header", async () => {
      let capturedAuth: string | null = null;
      let capturedUrl = "";
      server.use(
        http.get(`${baseUrl}/classes/:id`, ({ request }) => {
          capturedAuth = request.headers.get("authorization");
          capturedUrl = request.url;
          return HttpResponse.json({ character_class: characterClassWire });
        }),
      );

      await characterClassesService.getCharacterClassDetails(token, "Hunter");

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedUrl).toBe(`${baseUrl}/classes/Hunter`);
    });

    it("returns the class in camelCase, field by field (as the code is written, `character_class` envelope)", async () => {
      server.use(
        http.get(`${baseUrl}/classes/:id`, () =>
          HttpResponse.json({ character_class: characterClassWire }),
        ),
      );

      const result = await characterClassesService.getCharacterClassDetails(
        token,
        "Hunter",
      );

      expect(result).toEqual(characterClassCamel);
    });

    // FINDING (real bug, not fixed — documenting current behavior):
    // GetCharacterClassBody (get_class.go) is
    // `struct { CharacterClass CharacterClassResponse }` — no json tag at
    // all, so encoding/json serializes it with the exact Go field name:
    // `CharacterClass` (PascalCase). This is independently confirmed by
    // get_class_test.go, which asserts `result["CharacterClass"]` is
    // present on the real response. But characterClassesService.ts reads
    // `data.character_class` (snake_case) — a key that never exists on the
    // real wire response. objToCamelCase(undefined) returns `undefined`
    // (it only transforms arrays/objects; anything else, including
    // undefined, passes through unchanged — see caseConverter.ts), so
    // getCharacterClassDetails silently resolves to `undefined` in
    // production instead of the requested class. This is the same class of
    // bug list_classes.go just had fixed (commit 521ae13 added an explicit
    // `json:"CharacterClasses"` tag) — get_class.go still has it. Reported
    // for the PR body; not fixed here since fixing requires editing either
    // get_class.go (backend, out of scope) or characterClassesService.ts
    // (production code, excluded from this task).
    it("resolves to undefined against the real (PascalCase `CharacterClass`) backend response", async () => {
      server.use(
        http.get(`${baseUrl}/classes/:id`, () =>
          HttpResponse.json({ CharacterClass: characterClassWire }),
        ),
      );

      const result = await characterClassesService.getCharacterClassDetails(
        token,
        "Hunter",
      );

      expect(result).toBeUndefined();
    });
  });
});
