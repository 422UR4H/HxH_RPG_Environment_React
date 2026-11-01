import type { ClassDefinition } from "../features/sheet/engine";
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

export interface DistributionProfPoint {
  level: number;
  exp: number;
}

export interface Distribution {
  skillPoints: number | null;
  proficiencyPoints: DistributionProfPoint[];
  skillsAllowed: string[];
  proficienciesAllowed: string[];
}

export interface CharacterClass {
  profile: CharacterClassProfile;
  distribution?: Distribution;
  skills: Record<string, Skill>;
  // Backend's JointSkill struct (character_class_response.go) has no exported
  // fields and no json tags — every entry always marshals to `{}` regardless
  // of data ("TODO: update to JointSkill / do not expose to users, its in v0"
  // per the Go source). No frontend code reads this field today, so `unknown`
  // is the honest bound rather than guessing a shape nothing exercises.
  jointSkills: Record<string, unknown>;
  proficiencies: Record<string, Proficiency>;
  jointProficiencies: JointProficiency[];
  attributes: Record<string, Attribute>;
  abilities: Record<string, Ability>;
  indicatedCategories: string[];
  /**
   * Dados brutos com que a classe monta uma ficha (chaves como enums Go, sem
   * normalização). Entrada do motor de prévia (`features/sheet/engine`); os
   * campos acima são a ficha-modelo já calculada. Opcional: back anterior a
   * 2026-11-01 não envia, e aí a tela fica sem prévia.
   */
  definition?: ClassDefinition;
}

export interface CharacterClassResponse {
  characterClasses: CharacterClass[];
}
