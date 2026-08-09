// src/test/fixtures/sheet.ts
import type { CharacterSheetSummary, CharacterPrivateSummary } from "../../types/characterSheet";
import { objToSnakeCase } from "../../utils/caseConverter";

// GET /charactersheets/:id wire body (internal/app/api/sheet/character_sheet_response.go
// — CharacterSheetResponse). This is a much deeper/differently-shaped struct than the
// frontend's CharacterSheet type (e.g. a top-level `status` map instead of flat
// stamina/health, `character_exp`/`talent` instead of characterExp/talent as separate
// top-level camelCase keys, enum-named attribute/skill maps) — it's hand-built to match
// Go's json tags directly rather than derived from a frontend-shaped fixture via
// objToSnakeCase(), since the two shapes don't actually correspond 1:1.
export const sheetFixture: Record<string, unknown> = {
  uuid: "sheet-1",
  player_uuid: "user-1",
  character_class: "Especialista",
  category_name: "Emissor",
  profile: {
    nickname: "TestNick",
    fullname: "Test Character",
    alignment: "Neutral",
    description: "",
    brief_description: "A test character",
    birthday: "2000-01-01T00:00:00.000Z",
    age: 25,
  },
  character_exp: { level: 1, exp: 0, curr_exp: 0, next_lvl_base_exp: 100, points: 0 },
  talent: { level: 1, exp: 0, curr_exp: 0, next_lvl_base_exp: 100 },
  abilities: {},
  physical_attributes: {},
  mental_attributes: {},
  spiritual_attributes: {},
  physical_skills: {},
  mental_skills: {},
  spiritual_skills: {},
  principles: {},
  categories: {},
  common_proficiencies: {},
  joint_proficiencies: {},
  status: {
    health: { min: 0, current: 100, max: 100 },
    stamina: { min: 0, current: 100, max: 100 },
  },
};

export const sheetSummaryFixture: CharacterSheetSummary = {
  uuid: "sheet-1",
  playerUUID: "user-1",
  masterUUID: "master-1",
  campaignUUID: "campaign-1",
  nickName: "TestNick",
  fullName: "Test Character",
  alignment: "Neutral",
  age: 25,
  characterClass: "Especialista",
  categoryName: "Emissor",
  currHexValue: null,
  level: 1,
  points: 0,
  currExp: 0,
  nextLvlBaseExp: 100,
  talentLvl: 1,
  physicalsLvl: 1,
  mentalsLvl: 1,
  spiritualsLvl: 1,
  skillsLvl: 1,
  stamina: { min: 0, current: 100, max: 100 },
  health: { min: 0, current: 100, max: 100 },
  aura: { min: 0, current: 100, max: 100 },
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

export const pendingSheetFixture: CharacterPrivateSummary = {
  uuid: "sheet-pending",
  nickName: "PendingChar",
  playerUuid: "user-2",
  fullName: "Pending Character",
  alignment: "Chaotic",
  characterClass: "Manipulador",
  birthday: "1995-05-05",
  categoryName: "Transmutador",
  level: 1,
  points: 0,
  currExp: 0,
  nextLvlBaseExp: 100,
  talentLvl: 1,
  physicalsLvl: 1,
  mentalsLvl: 1,
  spiritualsLvl: 1,
  skillsLvl: 1,
  stamina: { min: 0, current: 100, max: 100 },
  health: { min: 0, current: 100, max: 100 },
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

// ─── Wire-format (backend) counterparts ────────────────────────────────────
// Go's CharacterPrivateSummaryResponse / CharacterBaseSummaryResponse
// (internal/app/api/sheet/character_sheet_sumary_response.go) serialize
// snake_case; characterSheetsService applies objToCamelCase() on the way in.
//
// sheetSummaryApiFixture is hand-built rather than run through
// objToSnakeCase(sheetSummaryFixture): CharacterSheetSummary declares
// `playerUUID`/`masterUUID`/`campaignUUID` (double-uppercase UUID), which
// doesn't match what snakeToCamel() actually produces from "player_uuid"
// (single-uppercase "playerUuid" — see every other type in this codebase).
// objToSnakeCase() would mangle that double-uppercase run into
// "player_u_u_i_d" instead of "player_uuid". This divergence is a real
// frontend type bug — flagged in the PR body — left unfixed here since fixing
// it means editing src/types/characterSheet.ts (production code).
// Go also has no `aura` field on this response (commented out server-side in
// CharacterSheetResponse too) even though CharacterSheetSummary requires one
// — also flagged, also intentionally omitted below.
export const sheetSummaryApiFixture: Record<string, unknown> = {
  uuid: sheetSummaryFixture.uuid,
  player_uuid: "user-1",
  master_uuid: "master-1",
  campaign_uuid: "campaign-1",
  nick_name: sheetSummaryFixture.nickName,
  full_name: sheetSummaryFixture.fullName,
  alignment: sheetSummaryFixture.alignment,
  age: sheetSummaryFixture.age,
  character_class: sheetSummaryFixture.characterClass,
  category_name: sheetSummaryFixture.categoryName,
  curr_hex_value: sheetSummaryFixture.currHexValue,
  level: sheetSummaryFixture.level,
  points: sheetSummaryFixture.points,
  curr_exp: sheetSummaryFixture.currExp,
  next_lvl_base_exp: sheetSummaryFixture.nextLvlBaseExp,
  talent_lvl: sheetSummaryFixture.talentLvl,
  physicals_lvl: sheetSummaryFixture.physicalsLvl,
  mentals_lvl: sheetSummaryFixture.mentalsLvl,
  spirituals_lvl: sheetSummaryFixture.spiritualsLvl,
  skills_lvl: sheetSummaryFixture.skillsLvl,
  stamina: sheetSummaryFixture.stamina,
  health: sheetSummaryFixture.health,
  created_at: sheetSummaryFixture.createdAt,
  updated_at: sheetSummaryFixture.updatedAt,
};

// CharacterPrivateSummary (unlike CharacterSheetSummary) correctly declares
// playerUuid/masterUuid/campaignUuid with a single uppercase U, so a plain
// objToSnakeCase() round-trip is accurate here.
export const pendingSheetApiFixture: Record<string, unknown> =
  objToSnakeCase<Record<string, unknown>>(pendingSheetFixture);
