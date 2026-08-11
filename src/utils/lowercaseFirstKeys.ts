// src/utils/lowercaseFirstKeys.ts
//
// This is NOT the generic recursive snake_case<->camelCase converter that
// Fase 8 deleted from this codebase, and it is not a reincarnation of it.
// That converter existed to bridge an HTTP wire-format mismatch (Go backend
// snake_case vs frontend camelCase) — a problem Fase 8 solved for good by
// making the backend speak camelCase directly, so no wire-format transform is
// needed anywhere anymore.
//
// This helper solves a different, narrower problem that has nothing to do
// with wire format: a handful of response fields are maps whose KEYS are Go
// enum String() values (e.g. "Resistance", "Sword") — not struct field names,
// so the backend's camelCase json-tag migration never touched them, and never
// will (they're runtime enum values, not schema). The frontend's OWN internal
// convention for these same names is all-lowercase-first — see
// src/features/sheet/utils/distribute.ts's getBaseAttributesForType /
// getBaseSkillsForType / getBaseAbilities, and the hardcoded position-name
// lists in PhysicalsDiagram.tsx / MentalsDiagram.tsx / NenPrinciplesDiagram.tsx.
// This is a domain-modeling mismatch between two naming conventions, not an
// HTTP boundary concern — so it's normalized once, at the two service
// boundaries that read these specific enum-keyed maps
// (characterSheetsService.ts, characterClassesService.ts), not as a
// general-purpose response transform.
//
// Deliberately narrow: only the top-level keys of the given Record are
// touched. Values are passed through as-is — no recursion, no touching
// non-map fields, no touching array-valued or free-form-named fields (e.g.
// CharacterSheet.jointProficiencies, whose keys are DM-defined names, not
// enum values).
export function lowercaseFirstKeys<T>(obj: Record<string, T>): Record<string, T> {
  const result: Record<string, T> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const lowered = key.charAt(0).toLowerCase() + key.slice(1);
      result[lowered] = obj[key];
    }
  }
  return result;
}
