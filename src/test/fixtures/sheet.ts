// src/test/fixtures/sheet.ts
import type { CharacterSheetSummary, CharacterPrivateSummary } from "../../types/characterSheet";

// GET /charactersheets/:id wire body (internal/app/api/sheet/character_sheet_response.go
// — CharacterSheetResponse). This is a much deeper/differently-shaped struct than the
// frontend's CharacterSheet type (e.g. a top-level `status` map instead of flat
// stamina/health, `characterExp`/`talent` as separate top-level keys, enum-named
// attribute/skill maps) — it's hand-built to match Go's json tags directly rather than
// derived from a frontend-shaped fixture, since the two shapes don't actually correspond
// 1:1. There is no frontend-shaped sibling fixture for this endpoint (unlike
// campaignFixture/mapFixture/matchFixture), so this is wire-format-only — named with the
// Api suffix, per the convention used everywhere else in these fixture files, to make
// that unambiguous.
export const sheetApiFixture: Record<string, unknown> = {
  uuid: "sheet-1",
  playerUuid: "user-1",
  characterClass: "Especialista",
  categoryName: "Emissor",
  profile: {
    nickname: "TestNick",
    fullname: "Test Character",
    alignment: "Neutral",
    description: "",
    briefDescription: "A test character",
    birthday: "2000-01-01T00:00:00.000Z",
    age: 25,
  },
  characterExp: { level: 1, exp: 0, currExp: 0, nextLvlBaseExp: 100, points: 0 },
  talent: { level: 1, exp: 0, currExp: 0, nextLvlBaseExp: 100 },
  abilities: {},
  physicalAttributes: {},
  mentalAttributes: {},
  spiritualAttributes: {},
  physicalSkills: {},
  mentalSkills: {},
  spiritualSkills: {},
  principles: {},
  categories: {},
  commonProficiencies: {},
  jointProficiencies: {},
  status: {
    health: { min: 0, current: 100, max: 100 },
    stamina: { min: 0, current: 100, max: 100 },
  },
};

export const sheetSummaryFixture: CharacterSheetSummary = {
  uuid: "sheet-1",
  playerUuid: "user-1",
  masterUuid: "master-1",
  campaignUuid: "campaign-1",
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
// The Go backend now serializes camelCase all the way down (Fase 8), so these
// "Api" fixtures are just the wire shape as a plain object — no conversion
// step needed anymore.
export const sheetSummaryApiFixture: Record<string, unknown> = { ...sheetSummaryFixture };

export const pendingSheetApiFixture: Record<string, unknown> = { ...pendingSheetFixture };
