import { httpClient } from "./httpClient";
import type { CharacterClass, CharacterClassResponse } from "../types/characterClass";
import config from "./config";
import { lowercaseFirstKeys } from "../utils/lowercaseFirstKeys";

// CharacterClass fields whose map KEYS are Go enum String() values
// (PascalCase, e.g. "Resistance") rather than struct field names — see
// src/utils/lowercaseFirstKeys.ts. `jointProficiencies` (array) and
// `jointSkills` are excluded — not affected by this mismatch.
function normalizeClassEnumKeyedMaps(charClass: CharacterClass): CharacterClass {
  return {
    ...charClass,
    abilities: lowercaseFirstKeys(charClass.abilities),
    attributes: lowercaseFirstKeys(charClass.attributes),
    skills: lowercaseFirstKeys(charClass.skills),
    proficiencies: lowercaseFirstKeys(charClass.proficiencies),
  };
}

export const characterClassesService = {
  listCharacterClasses: (token: string): Promise<CharacterClass[]> =>
    httpClient
      .get<CharacterClassResponse>("/classes", config(token))
      .then(({ data }) => data.characterClasses.map(normalizeClassEnumKeyedMaps)),

  getCharacterClassDetails: (token: string, id: string): Promise<CharacterClass> =>
    httpClient
      .get<{ characterClass: CharacterClass }>(`/classes/${id}`, config(token))
      .then(({ data }) =>
        data.characterClass ? normalizeClassEnumKeyedMaps(data.characterClass) : data.characterClass
      ),
};
