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

export interface CharacterSheet {
  characterSheet: {
    characterClass: string;
    categoryName: string;
    profile: {
      nickname: string;
      fullname: string;
      alignment: string;
      briefDescription: string;
      birthday: string;
    };
    status: {
      Health: StatusBar;
      Stamina: StatusBar;
    };
    characterExp: {
      level: number;
      exp: number;
      currExp: number;
      nextLvlBaseExp: number;
      points: number;
    };
    talent: {
      level: number;
      exp: number;
      currExp: number;
      nextLvlBaseExp: number;
    };
    abilities: {
      Mentals: Ability;
      Physicals: Ability;
      Skills: Ability;
      Spirituals: Ability;
    };
    physicalAttributes: Record<string, Attribute>;
    mentalAttributes: Record<string, Attribute>;
    spiritualAttributes: Record<string, Attribute>;
    physicalSkills: Record<string, Skill>;
    spiritualSkills: Record<string, Skill>;
    principles: Record<string, Skill>;
    categories: Record<string, Category>;
    commonProficiencies: Record<string, { level: number }>;
    jointProficiencies: Record<string, any>;
  };
}

interface Ability {
  level: number;
  bonus: number;
}

interface Attribute {
  level: number;
  points: number;
  value: number;
  power: number;
}

interface Skill {
  level: number;
  valueForTest: number;
}

interface Category {
  level: number;
  valueForTest: number;
  percent: number;
}