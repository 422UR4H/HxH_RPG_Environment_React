import type {
  Ability,
  Attribute,
  JointProficiency,
  Proficiency,
  Skill,
} from "./characterSheet";

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

export interface CharacterClass {
  profile: CharacterClassProfile;
  distribution?: Distribution;
  skills: Record<string, Skill>;
  jointSkills: Record<string, any>;
  proficiencies: Record<string, Proficiency>;
  jointProficiencies: JointProficiency[];
  attributes: Record<string, Attribute>;
  abilities: Record<string, Ability>;
  indicatedCategories: string[];
}

export interface CharacterClassResponse {
  CharacterClasses: CharacterClass[];
}
