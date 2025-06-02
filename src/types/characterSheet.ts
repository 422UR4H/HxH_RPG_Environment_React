export interface CharacterSheetSummary {
  uuid: string;
  playerUUID: string;
  masterUUID: string;
  campaignUUID: string;
  nickName: string;
  fullName: string;
  alignment: string;
  characterClass: string;
  birthday: string;
  categoryName: string;
  currHexValue: number | null;
  level: number;
  points: number;
  talentLvl: number;
  physicalsLvl: number;
  mentalsLvl: number;
  spiritualsLvl: number;
  skillsLvl: number;
  stamina: StatusBar;
  health: StatusBar;
  aura: StatusBar;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterSheetResponse {
  characterSheets: CharacterSheetSummary[];
}

export interface StatusBar {
  min: number;
  curr: number;
  max: number;
}

// TODO: add this infos in card of the CharacterSheetSummary
// alignment: string;
// categoryName: string;

// currHexValue: number | null;

// level: number;
// points: number;
// talentLvl: number;
// physicalsLvl: number;
// mentalsLvl: number;
// spiritualsLvl: number;
// skillsLvl: number;
