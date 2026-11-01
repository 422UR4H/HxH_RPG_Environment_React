import { httpClient } from "./httpClient";
import type {
  CharacterSheet,
  CharacterSheetResponse,
  CharacterSheetSummary,
} from "../types/characterSheet";
import type { CharacterClass } from "../types/characterClass";
import config from "./config";
import { lowercaseFirstKeys } from "../utils/lowercaseFirstKeys";
import { buildSheetInput } from "../features/sheet/utils/sheetInput";

export type CatalogueWeapon = {
  name: string;
  dice: number[];
  flatDamage: number;
  defenseBonus: number;
  proficiencyLevel: number;
};

export type CombatCatalogue = {
  weapons: CatalogueWeapon[];
  skills: string[];
};

// CharacterSheet fields whose map KEYS are Go enum String() values
// (PascalCase, e.g. "Resistance") rather than struct field names — the
// backend's camelCase migration never touched them. See
// src/utils/lowercaseFirstKeys.ts for the full explanation. `status` is
// excluded (already lowercased server-side) and `jointProficiencies` is
// excluded (free-form DM-defined names, not enum-derived).
export function normalizeSheetEnumKeyedMaps(sheet: CharacterSheet): CharacterSheet {
  return {
    ...sheet,
    abilities: lowercaseFirstKeys(sheet.abilities),
    physicalAttributes: lowercaseFirstKeys(sheet.physicalAttributes),
    mentalAttributes: lowercaseFirstKeys(sheet.mentalAttributes),
    spiritualAttributes: lowercaseFirstKeys(sheet.spiritualAttributes),
    physicalSkills: lowercaseFirstKeys(sheet.physicalSkills),
    mentalSkills: lowercaseFirstKeys(sheet.mentalSkills),
    spiritualSkills: lowercaseFirstKeys(sheet.spiritualSkills),
    principles: lowercaseFirstKeys(sheet.principles),
    categories: lowercaseFirstKeys(sheet.categories),
    commonProficiencies: lowercaseFirstKeys(sheet.commonProficiencies),
  };
}

export async function getCombatCatalogue(token: string, uuid: string): Promise<CombatCatalogue> {
  const { data } = await httpClient.get<CombatCatalogue>(
    `/charactersheets/${uuid}/combat-catalogue`,
    config(token)
  );
  return data;
}

export const characterSheetsService = {
  listCharacterSheets: (token: string): Promise<CharacterSheetSummary[]> =>
    httpClient
      .get<CharacterSheetResponse>("/charactersheets", config(token))
      .then(({ data }) => data.characterSheets ?? []),

  getCharacterSheetDetails: (token: string, id: string): Promise<CharacterSheet> =>
    httpClient
      .get<{ characterSheet: CharacterSheet }>(
        `/charactersheets/${id}?include=submission`,
        config(token)
      )
      .then(({ data }) =>
        data.characterSheet ? normalizeSheetEnumKeyedMaps(data.characterSheet) : data.characterSheet
      ),

  submitCharacterSheet: (
    token: string,
    sheetUuid: string,
    campaignUuid: string
  ): Promise<void> =>
    httpClient
      .post(
        "/submissions/charactersheets/submit",
        { sheetUuid, campaignUuid },
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

  createCharacterSheet: (
    token: string,
    charSheet: CharacterSheet,
    charClass?: CharacterClass,
    campaignUuid?: string
  ): Promise<{ uuid: string }> => {
    const { skillsExps, proficienciesExps, attributePoints } = buildSheetInput(charSheet, charClass);

    return httpClient
      .post<{ characterSheet: { uuid: string } }>(
        "/charactersheets",
        {
          campaignUuid: campaignUuid ?? null,
          profile: {
            nickname: charSheet.profile.nickname,
            fullname: charSheet.profile.fullname,
            alignment: charSheet.profile.alignment,
            description: charSheet.profile.description ?? "",
            briefDescription: charSheet.profile.briefDescription,
            birthday: charSheet.profile.birthday,
            age: charSheet.profile.age,
          },
          characterClass: charSheet.characterClass,
          skillsExps,
          proficienciesExps,
          attributePoints,
          // categories: {},
        },
        config(token)
      )
      .then(({ data }) => ({ uuid: data.characterSheet.uuid }));
  },

  deleteCharacterSheet: (token: string, uuid: string): Promise<void> =>
    httpClient
      .delete(`/charactersheets/${uuid}`, config(token))
      .then(() => undefined),

  updateCharacterSheet: (
    token: string,
    uuid: string,
    charSheet: CharacterSheet,
    charClass?: CharacterClass
  ): Promise<CharacterSheet> => {
    const { skillsExps, proficienciesExps, attributePoints } = buildSheetInput(charSheet, charClass);

    return httpClient
      .patch<{ characterSheet: CharacterSheet }>(
        `/charactersheets/${uuid}`,
        {
          profile: {
            nickname: charSheet.profile.nickname,
            fullname: charSheet.profile.fullname,
            alignment: charSheet.profile.alignment,
            description: charSheet.profile.description ?? "",
            briefDescription: charSheet.profile.briefDescription,
            birthday: charSheet.profile.birthday,
            age: charSheet.profile.age,
          },
          characterClass: charSheet.characterClass,
          skillsExps,
          proficienciesExps,
          attributePoints,
        },
        config(token)
      )
      .then(({ data }) =>
        data.characterSheet ? normalizeSheetEnumKeyedMaps(data.characterSheet) : data.characterSheet
      );
  },

  patchCharacterSheetProfile: (
    token: string,
    sheetUuid: string,
    avatarUrl?: string | null,
    coverUrl?: string | null,
    briefDescription?: string | null
  ): Promise<void> =>
    httpClient
      .patch(
        `/charactersheets/${sheetUuid}/profile`,
        { avatarUrl, coverUrl, briefDescription },
        config(token)
      )
      .then(() => undefined),
};
