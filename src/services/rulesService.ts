import { httpClient } from "./httpClient";
import type { RuleChapter, SheetRulesResponse, WeaponInfo, WeaponsResponse } from "../types/rules";

export const rulesService = {
  // Rota pública: sem config de auth.
  getSheetRules: (): Promise<RuleChapter[]> =>
    httpClient
      .get<SheetRulesResponse>("/rules/character-sheet")
      .then(({ data }) => data.chapters),

  // Catálogo de armas do sistema (nome, dados, bônus fixo). Também público.
  getWeapons: (): Promise<WeaponInfo[]> =>
    httpClient.get<WeaponsResponse>("/rules/weapons").then(({ data }) => data.weapons),
};
