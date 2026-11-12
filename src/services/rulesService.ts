import { httpClient } from "./httpClient";
import type { RuleChapter, SheetRulesResponse } from "../types/rules";

export const rulesService = {
  // Rota pública: sem config de auth.
  getSheetRules: (): Promise<RuleChapter[]> =>
    httpClient
      .get<SheetRulesResponse>("/rules/character-sheet")
      .then(({ data }) => data.chapters),
};
