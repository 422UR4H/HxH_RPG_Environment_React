export interface CharacterSheetSummary {
  uuid: string;
  playerUUID: string;
  masterUUID: string;
  campaignUUID: string;
  nickName: string;
  fullName: string;
  alignment: string;
  birthday: string;
  cover?: string;
  avatar?: string;
  characterClass: string;
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

export interface CharacterSheet {
  characterClass: string;
  categoryName: string;
  profile: Profile;
  status: {
    health: StatusBar;
    stamina: StatusBar;
  };
  characterExp: CharacterExp;
  talent: Talent;
  abilities: Record<string, Ability>;
  physicalAttributes: Record<string, Attribute>;
  mentalAttributes: Record<string, Attribute>;
  spiritualAttributes: Record<string, Attribute>;
  physicalSkills: Record<string, Skill>;
  spiritualSkills: Record<string, Skill>;
  principles: Record<string, Skill>;
  categories: Record<string, Category>;
  commonProficiencies: Record<string, Proficiency>;
  jointProficiencies: JointProficiency[];
}

// TODO: review and padronize type and interface
export type Profile = {
  nickname: string;
  fullname: string;
  description?: string;
  briefDescription: string;
  birthday: string;
  alignment: string;
  cover?: string;
  avatar?: string;
};

export interface CharacterExp {
  level: number;
  exp: number;
  currExp: number;
  nextLvlBaseExp: number;
  points: number;
}

export interface Talent {
  level: number;
  exp: number;
  currExp: number;
  nextLvlBaseExp: number;
}

export interface Ability {
  exp?: number;
  level: number;
  bonus: number;
}

export interface Attribute {
  exp?: number;
  level: number;
  points: number;
  value?: number;
  power: number;
}

export interface Skill {
  exp?: number;
  level: number;
  value: number;
}

export interface Proficiency {
  exp?: number;
  level: number;
}

export interface JointProficiency {
  exp?: number;
  level: number;
  name: string;
}

export interface Category {
  exp?: number;
  level: number;
  value: number;
  percent: number;
}
