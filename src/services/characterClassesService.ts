import { httpClient } from "./httpClient";
import type { CharacterClass, CharacterClassResponse } from "../types/characterClass";
import { objToCamelCase } from "../utils/caseConverter";
import config from "./config";

export const characterClassesService = {
  listCharacterClasses: (token: string): Promise<CharacterClass[]> =>
    httpClient
      .get<CharacterClassResponse>("/classes", config(token))
      .then(({ data }) =>
        data.CharacterClasses.map((c) => objToCamelCase<CharacterClass>(c))
      ),

  getCharacterClassDetails: (token: string, id: string): Promise<CharacterClass> =>
    httpClient
      .get<{ character_class: CharacterClass }>(`/classes/${id}`, config(token))
      .then(({ data }) => objToCamelCase<CharacterClass>(data.character_class)),
};
