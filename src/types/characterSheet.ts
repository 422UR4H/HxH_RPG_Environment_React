export interface CharacterSheetSummary {
  uuid: string;
  playerUuid: string;
  masterUuid: string;
  campaignUuid: string;
  nickName: string;
  fullName: string;
  alignment: string;
  birthday?: string;
  age: number;
  coverUrl?: string;
  avatarUrl?: string;
  characterClass: string;
  categoryName: string;
  currHexValue: number | null;
  level: number;
  points: number;
  currExp: number;
  nextLvlBaseExp: number;
  talentLvl: number;
  physicalsLvl: number;
  mentalsLvl: number;
  spiritualsLvl: number;
  skillsLvl: number;
  stamina: StatusBar;
  health: StatusBar;
  // Not sent by GET /charactersheets (CharacterPrivateSummaryResponse /
  // CharacterBaseSummaryResponse) nor GET /charactersheets/:id (Aura is
  // commented out server-side on CharacterSheetResponse too) — optional so an
  // absent field doesn't lie as a `StatusBar` that's actually `undefined`.
  aura?: StatusBar;
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

export type Submission = {
  campaignUuid: string;
  createdAt: string;
} | null;

export interface CharacterSheet {
  uuid: string;
  playerUuid?: string;
  masterUuid?: string;
  campaignUuid?: string;
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
  // Sent by the backend (mentalSkills, GET /charactersheets/:id) but not yet
  // surfaced by any sheet UI — there's a MentalsDiagram for mental
  // ATTRIBUTES, but no equivalent skills group for physicalSkills/
  // spiritualSkills' mental counterpart. Typed here (rather than left
  // unmapped) so the field isn't silently dropped from the network response;
  // see docs/dev/http-boundary-inventory.md §3 for the full note.
  mentalSkills: Record<string, Skill>;
  spiritualSkills: Record<string, Skill>;
  principles: Record<string, Skill>;
  categories: Record<string, Category>;
  commonProficiencies: Record<string, Proficiency>;
  // Mirrors the backend's map[string]JointProficiencyResponse shape (keyed by
  // proficiency name) — NOT the same concept as CharacterClass.jointProficiencies
  // (src/types/characterClass.ts), which is an array of slot definitions used
  // during sheet creation/distribution and stays an array on purpose.
  jointProficiencies: Record<string, JointProficiency>;
  submission?: Submission;
}

export type Profile = {
  nickname: string;
  fullname: string;
  /**
   * Markdown-formatted free text. ALWAYS render via <DescriptionMarkdown>.
   * Never render as plain text (perde formatação) ou via dangerouslySetInnerHTML.
   * Editor de origem: BackgroundEditorModal.
   */
  description?: string;
  briefDescription: string;
  birthday: string;
  age: number;
  alignment: string;
  coverUrl?: string;
  avatarUrl?: string;
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
  currExp?: number;
  nextLvlBaseExp?: number;
  level: number;
  points: number;
  value?: number;
  power: number;
}

export interface Skill {
  exp?: number;
  currExp?: number;
  nextLvlBaseExp?: number;
  level: number;
  value: number;
}

export interface Proficiency {
  exp?: number;
  currExp?: number;
  nextLvlBaseExp?: number;
  level: number;
}

export interface JointProficiency {
  exp?: number;
  currExp?: number;
  nextLvlBaseExp?: number;
  level: number;
  name: string;
}

export interface Category {
  exp?: number;
  level: number;
  value: number;
  percent: number;
}

export interface CharacterBaseSummary {
  uuid: string;
  playerUuid?: string;
  masterUuid?: string;
  campaignUuid?: string;
  nickName: string;
  avatarUrl?: string;
  coverUrl?: string;
  storyStartAt?: string;
  storyCurrentAt?: string;
  deadAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterPrivateSummary extends CharacterBaseSummary {
  fullName: string;
  alignment: string;
  characterClass: string;
  birthday: string;
  categoryName: string;
  currHexValue?: number;
  level: number;
  points: number;
  currExp: number;
  nextLvlBaseExp: number;
  talentLvl: number;
  physicalsLvl: number;
  mentalsLvl: number;
  spiritualsLvl: number;
  skillsLvl: number;
  stamina: StatusBar;
  health: StatusBar;
}

export type CharacterPublicSummary = CharacterBaseSummary;
