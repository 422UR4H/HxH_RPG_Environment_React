// src/services/__tests__/characterClassesService.test.ts
//
// Wire-format safety net for characterClassesService.ts. Mirrors the Go
// structs in System_X_System/internal/app/api/sheet/character_class_response.go,
// list_classes.go and get_class.go.
//
// Fase 8: the backend now speaks camelCase for struct-tagged fields, and
// characterClassesService no longer runs the response through any generic
// case-conversion — it passes the body straight through, EXCEPT for four
// specific fields (abilities/attributes/skills/proficiencies) whose map KEYS
// are Go enum String() values (e.g. "Resistance") rather than struct field
// names. The backend's camelCase migration never touched those (they're
// runtime enum values, not schema), but the frontend's own internal naming
// convention for them is lowercase-first (see distribute.ts, PhysicalsDiagram.tsx,
// etc.) — so the service normalizes exactly those four fields via
// src/utils/lowercaseFirstKeys.ts before returning. See that file for the
// full rationale; this is a narrow, targeted fix, not a reincarnation of the
// generic converter Fase 8 deleted.
//
// Per method: (1) request URL/verb + Authorization header, (2) response
// passed straight through into the src/types/characterClass.ts shape, with
// abilities/attributes/skills/proficiencies key-normalized.
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/server";
import { characterClassesService } from "../characterClassesService";
import type { CharacterClass } from "../../types/characterClass";

const baseUrl = "http://localhost:5000";
const token = "test-token";

// ─── Wire-format (Go) fixture ──────────────────────────────────────────────
// Mirrors CharacterClassResponse (character_class_response.go) as it is sent
// today: struct fields are camelCase (profile.briefDescription, jointSkills,
// indicatedCategories, distribution.*), but map keys under
// abilities/attributes/skills/proficiencies/jointProficiencies[].name are the
// real enum String() values from internal/domain/entity/enum/{ability_name,
// attribute_name,skill_name,weapon_name,category_name}.go — PascalCase
// English identifiers (e.g. "Resistance", "Vitality", "Dagger"), which are
// NOT struct fields and were therefore untouched by the backend's camelCase
// migration.
const characterClassWire = {
  profile: {
    name: "Hunter",
    alignment: "Bom",
    description: "Descrição completa da classe",
    briefDescription: "Descrição breve",
  },
  abilities: {
    Physicals: { level: 2, exp: 50, currExp: 10, nextLvlBaseExp: 100, bonus: 1.5 },
  },
  attributes: {
    Resistance: { level: 3, exp: 80, currExp: 20, nextLvlBaseExp: 150, points: 4, power: 12 },
  },
  skills: {
    Vitality: { level: 1, exp: 10, currExp: 5, nextLvlBaseExp: 50, value: 3 },
  },
  jointSkills: {},
  proficiencies: {
    Dagger: { level: 1, exp: 5, currExp: 2, nextLvlBaseExp: 30 },
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
};

// What a caller of characterClassesService actually receives now:
// abilities/attributes/skills/proficiencies keys lowercased-first
// (Resistance -> resistance), matching the frontend's own naming convention
// (distribute.ts's getBaseAbilities()/getBaseAttributesForType()/
// getBaseSkillsForType() hardcode this lowercase-first form to look entries
// up, e.g. `charClass.attributes["resistance"]`). Everything else — values,
// jointSkills, jointProficiencies (array, not enum-keyed), indicatedCategories,
// distribution, profile — passes through untouched.
const characterClassNormalized = {
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
          // PascalCase envelope, see NOTE below.
          return HttpResponse.json({ CharacterClasses: [characterClassWire] });
        }),
      );

      await characterClassesService.listCharacterClasses(token);

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedUrl).toBe(`${baseUrl}/classes`);
    });

    // NOTE (deferred, not fixed here): characterClassesService.ts still reads
    // the raw PascalCase envelope key `data.CharacterClasses` — matching the
    // literal key this code has always read. The real backend
    // (list_classes.go) actually renamed this envelope key to camelCase
    // `characterClasses` as part of the same Fase 8 migration that removed
    // the converter, which this task's brief explicitly deferred to a
    // follow-up (envelope-key renames). Until that follow-up lands, this
    // fixture uses the PascalCase key the service code still expects, so the
    // test suite stays green — but that means listCharacterClasses will
    // actually THROW against the real backend today (`.map()` on
    // `undefined`), not just resolve to a wrong value. Flagged for the PR
    // body as higher severity than a silent-undefined bug.
    it("returns the list with abilities/attributes/skills/proficiencies key-normalized, via the (deferred) PascalCase `CharacterClasses` envelope", async () => {
      server.use(
        http.get(`${baseUrl}/classes`, () =>
          HttpResponse.json({ CharacterClasses: [characterClassWire] }),
        ),
      );

      const result = await characterClassesService.listCharacterClasses(token);

      expect(result).toEqual([characterClassNormalized]);
    });

    // Regression test for the enum-key-casing bug: before the fix, this
    // lookup returned undefined (the real key was "Resistance", not
    // "resistance"), which is exactly how distribute.ts and the diagram
    // components read this data.
    it("normalizes enum-derived map keys so lowercase-first lookups (as used by distribute.ts) succeed", async () => {
      server.use(
        http.get(`${baseUrl}/classes`, () =>
          HttpResponse.json({ CharacterClasses: [characterClassWire] }),
        ),
      );

      const [result] = await characterClassesService.listCharacterClasses(token);

      expect(result.attributes["resistance"]).toEqual(characterClassWire.attributes.Resistance);
      expect(result.abilities["physicals"]).toEqual(characterClassWire.abilities.Physicals);
      expect(result.skills["vitality"]).toEqual(characterClassWire.skills.Vitality);
      expect(result.proficiencies["dagger"]).toEqual(characterClassWire.proficiencies.Dagger);
      // The PascalCase keys must NOT survive — otherwise both spellings would
      // exist and silently double memory/iteration without anyone noticing.
      expect(result.attributes).not.toHaveProperty("Resistance");
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

    it("returns the class with abilities/attributes/skills/proficiencies key-normalized (as the code is written, `character_class` envelope)", async () => {
      server.use(
        http.get(`${baseUrl}/classes/:id`, () =>
          HttpResponse.json({ character_class: characterClassWire }),
        ),
      );

      const result = await characterClassesService.getCharacterClassDetails(
        token,
        "Hunter",
      );

      expect(result).toEqual(characterClassNormalized);
    });

    // FINDING (real bug, not fixed — documenting current behavior):
    // GetCharacterClassBody (get_class.go) is
    // `struct { CharacterClass CharacterClassResponse }` — no json tag at
    // all, so encoding/json serializes it with the exact Go field name:
    // `CharacterClass` (PascalCase). This one genuinely was NOT touched by
    // the backend's Fase 8 migration (confirmed against the current source),
    // unlike list_classes.go's plural envelope key, which was. But
    // characterClassesService.ts reads `data.character_class` (snake_case) —
    // a key that never exists on the real wire response either way.
    // getCharacterClassDetails silently resolves to `undefined` in
    // production instead of the requested class. This is the same class of
    // bug list_classes.go just had fixed — get_class.go still has it.
    // Reported for the PR body; not fixed here since fixing requires editing
    // either get_class.go (backend, out of scope) or
    // characterClassesService.ts (production code, excluded from this task).
    //
    // Also proves the enum-key normalization guards against undefined input:
    // when data.character_class is undefined, normalizeClassEnumKeyedMaps is
    // never called (short-circuited), so this still resolves to undefined
    // cleanly instead of throwing on `undefined.attributes`.
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
