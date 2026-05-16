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

  createCharacterSheet: (
    token: string,
    charSheet: CharacterSheet
  ): Promise<{ uuid: string }> => {
    const skillsExps: Record<string, number> = {};
    const allSkills = { ...charSheet.physicalSkills, ...charSheet.spiritualSkills };
    Object.entries(allSkills).forEach(([name, skill]) => {
      if (skill.exp && skill.exp > 0) skillsExps[name] = skill.exp;
    });

    const proficienciesExps: Record<string, number> = {};
    Object.entries(charSheet.commonProficiencies).forEach(([name, prof]) => {
      if (prof.exp && prof.exp > 0) proficienciesExps[name] = prof.exp;
    });
    charSheet.jointProficiencies.forEach((prof) => {
      if (prof.exp && prof.exp > 0 && prof.name) proficienciesExps[prof.name] = prof.exp;
    });

    return httpClient
      .post<{ character_sheet: { uuid: string } }>(
        "/charactersheets",
        {
          profile: objToSnakeCase({
            nickname: charSheet.profile.nickname,
            fullname: charSheet.profile.fullname,
            alignment: charSheet.profile.alignment,
            description: charSheet.profile.description ?? "",
            briefDescription: charSheet.profile.briefDescription,
            birthday: charSheet.profile.birthday,
            age: charSheet.profile.age,
          }),
          character_class: charSheet.characterClass,
          skills_exps: skillsExps,
          proficiencies_exps: proficienciesExps,
          categories: {},
        },
        config(token)
      )
      .then(({ data }) => ({ uuid: data.character_sheet.uuid }));
  },

  patchCharacterSheetProfile: (
    token: string,
    sheetUuid: string,
    avatarUrl?: string | null,
    coverUrl?: string | null
  ): Promise<void> =>
    httpClient
      .patch(
        `/charactersheets/${sheetUuid}/profile`,
        objToSnakeCase({ avatarUrl, coverUrl }),
        config(token)
      )
      .then(() => undefined),
};
