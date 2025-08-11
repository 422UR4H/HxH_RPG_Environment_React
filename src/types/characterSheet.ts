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
  current: number;
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

export type Profile = {
  nickname: string;
  fullname: string;
  briefDescription: string;
  birthday: string;
  alignment: string;
};

export interface CharacterSheet {
  characterClass: string;
  categoryName: string;
  profile: Profile;
  status: {
    health: StatusBar;
    stamina: StatusBar;
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
    mentals: Ability;
    physicals: Ability;
    skills: Ability;
    spirituals: Ability;
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
}

export interface Ability {
  level: number;
  bonus: number;
}

export interface Attribute {
  level: number;
  points: number;
  value: number;
  power: number;
}

export interface Skill {
  level: number;
  valueForTest: number;
}

interface Category {
  level: number;
  valueForTest: number;
  percent: number;
}
