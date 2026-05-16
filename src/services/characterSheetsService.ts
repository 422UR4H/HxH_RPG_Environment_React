import { httpClient } from "./httpClient";
import type {
  CharacterSheet,
  CharacterSheetResponse,
  CharacterSheetSummary,
} from "../types/characterSheet";
import { objToCamelCase, objToSnakeCase } from "../utils/caseConverter";
import config from "./config";

export const characterSheetsService = {
  listCharacterSheets: (token: string): Promise<CharacterSheetSummary[]> =>
    httpClient
      .get<CharacterSheetResponse>("/charactersheets", config(token))
      .then(({ data }) =>
        objToCamelCase<CharacterSheetResponse>(data).characterSheets ?? []
      ),

  getCharacterSheetDetails: (token: string, id: string): Promise<CharacterSheet> =>
    httpClient
      .get<{ character_sheet: CharacterSheet }>(
        `/charactersheets/${id}`,
        config(token)
      )
      .then(({ data }) => objToCamelCase<CharacterSheet>(data.character_sheet)),

  submitCharacterSheet: (
    token: string,
    sheetUuid: string,
    campaignUuid: string
  ): Promise<void> =>
    httpClient
      .post(
        "/submissions/charactersheets/submit",
        objToSnakeCase({ sheetUuid, campaignUuid }),
        config(token)
      )
      .then(() => undefined),

  acceptSheetSubmission: (token: string, sheetUuid: string): Promise<void> =>
    httpClient
      .post(`/submissions/${sheetUuid}/accept`, {}, config(token))
      .then(() => undefined),

  rejectSheetSubmission: (token: string, sheetUuid: string): Promise<void> =>
    httpClient
      .post(`/submissions/${sheetUuid}/reject`, {}, config(token))
      .then(() => undefined),
};
