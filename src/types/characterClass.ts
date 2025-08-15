export interface CharacterClassProfile {
  name: string;
  alignment: string;
  description: string;
  briefDescription: string;
}

export interface Distribution {
  skillPoints: number | null;
  proficiencyPoints: number[];
  skillsAllowed: string[];
  proficienciesAllowed: string[];
}

export interface SkillExp {
  lvl: number;
  exp: number;
}

export interface AttributeExp {
  lvl: number;
  exp: number;
}

export interface ProficiencyExp {
  lvl: number;
  exp: number;
}

export interface CharacterClass {
  profile: CharacterClassProfile;
  distribution?: Distribution;
  skillsExps: Record<string, SkillExp>;
  jointSkills: Record<string, any>;
  proficienciesExps: Record<string, ProficiencyExp>;
  jointProficiencies: Record<string, any>;
  attributesExps: Record<string, AttributeExp>;
  indicatedCategories: string[];
}

export interface CharacterClassResponse {
  CharacterClasses: CharacterClass[];
}
