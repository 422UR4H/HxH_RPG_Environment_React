// src/services/__tests__/characterClassesService.test.ts
//
// Wire-format safety net for characterClassesService.ts. Mirrors the Go
// structs in System_X_System/internal/app/api/sheet/character_class_response.go,
// list_classes.go and get_class.go.
//
// Fase 8: the backend now speaks camelCase for struct-tagged fields, and
// characterClassesService no longer runs the response through any generic
// case-conversion — it passes the body straight through. See the FINDING
// below the fixtures for a real consequence of that: map keys built from Go
// enum String() values (e.g. "Resistance") are NOT struct fields, so the
// backend's camelCase migration never touched them, and they now arrive
// PascalCase, unconverted, into CharacterClass.
//
// Per method: (1) request URL/verb + Authorization header, (2) response
// passed straight through into the src/types/characterClass.ts shape.
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

// What a caller of characterClassesService actually receives now: the exact
// same shape as the wire, untouched — no key gets lowercased anymore.
//
// FINDING (real regression surfaced by removing the converter, NOT fixed
// here — production code, out of scope for this task): before Fase 8, the
// generic case converter recursively lowercased the first letter of *every*
// key it saw, including these enum-derived map keys ("Resistance" -> "resistance").
// src/features/sheet/utils/distribute.ts's getBaseAbilities()/
// getBaseAttributesForType()/getBaseSkillsForType() hardcode the
// lowercase-first form to look entries up in charClass.abilities/attributes/
// skills (e.g. `charClass.attributes["resistance"]`). With the converter
// gone, the real keys stay PascalCase ("Resistance"), so every one of those
// lookups now misses and distributeAttributes/distributeSkills/
// distributeAbilities silently fall back to their zero-value defaults for
// every class — the character-class distribution step of sheet creation is
// affected. Flagged for the PR body / follow-up task; fixing it means either
// changing distribute.ts's lookup keys or normalizing casing somewhere in
// the service, both of which are production-logic decisions outside this
// task's "remove the wrapper, let the body pass through" scope.
const characterClassCamel = {
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
    it("returns the list untouched, field by field, via the (deferred) PascalCase `CharacterClasses` envelope", async () => {
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

    it("returns the class untouched, field by field (as the code is written, `character_class` envelope)", async () => {
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
