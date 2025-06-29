import { httpClient } from "./httpClient";
import type {
  CharacterSheet,
  CharacterSheetResponse,
  CharacterSheetSummary,
} from "../types/characterSheet";
import { objToCamelCase } from "../utils/caseConverter";
import config from "./config";

export const characterSheetsService = {
  listCharacterSheets: (token: string) =>
    httpClient
      .get<CharacterSheetResponse>("/charactersheets", config(token))
      .then((response) => {
        const data = objToCamelCase<CharacterSheetResponse>(response.data);
        const sheets = data.characterSheets || [];

        const sheetsInCamelCase = sheets.map((sheet) =>
          objToCamelCase<CharacterSheetSummary>(sheet)
        );
        return {
          ...response,
          data: sheetsInCamelCase,
        };
      }),

  getCharacterSheetDetails: (token: string, id: string) =>
    httpClient
      .get<CharacterSheet>(`/charactersheets/${id}`, config(token))
      .then((response) => {
        return {
          ...response,
          data: objToCamelCase<CharacterSheet>(response.data),
        };
      }),
};
