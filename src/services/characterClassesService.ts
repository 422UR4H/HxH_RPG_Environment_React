import { httpClient } from "./httpClient";
import type {
  CharacterClass,
  CharacterClassResponse,
} from "../types/characterClass";
import { objToCamelCase } from "../utils/caseConverter";
import config from "./config";

export const characterClassesService = {
  listCharacterClasses: (token: string) =>
    httpClient
      .get<CharacterClassResponse>("/classes", config(token))
      .then((response) => {
        const classes = objToCamelCase<CharacterClass[]>(
          response.data.CharacterClasses
        );

        const classesInCamelCase = classes.map((characterClass) =>
          objToCamelCase<CharacterClass>(characterClass)
        );

        return {
          ...response,
          data: classesInCamelCase,
        };
      }),

  getCharacterClassDetails: (token: string, id: string) =>
    httpClient
      .get<{ character_class: CharacterClass }>(`/classes/${id}`, config(token))
      .then((response) => {
        const classData = response.data.character_class;
        return {
          ...response,
          data: objToCamelCase<CharacterClass>(classData),
        };
      }),
};
