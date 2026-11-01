// Contrato do motor. Entrada e saída usam os nomes do wire do back: chaves são
// os valores String() dos enums Go ("Vitality", "Sword"), sem normalização.

/** `definition` de cada classe em GET /classes (ClassDefinitionResponse no Go). */
export interface ClassDefinition {
  skillsExps: Record<string, number>;
  attributesExps: Record<string, number>;
  proficienciesExps: Record<string, number>;
  jointProficiencies: { name: string; weapons: string[] }[];
  jointProfExps: Record<string, number>;
}

/** O que o front envia ao criar/editar a ficha (CreateCharacterSheetInput no Go). */
export interface SheetInput {
  skillsExps: Record<string, number>;
  proficienciesExps: Record<string, number>;
  attributePoints: Record<string, number>;
}

export interface ExperienceWire {
  level: number;
  exp: number;
  currExp: number;
  nextLvlBaseExp: number;
}

export interface AttributeWire extends ExperienceWire {
  points: number;
  value: number;
  power: number;
}

export interface StatusWire {
  min: number;
  current: number;
  max: number;
}

/**
 * Os campos calculados de CharacterSheetResponse (internal/app/api/sheet).
 * Dono, uuid e perfil não são calculados e ficam de fora.
 */
export interface SheetWire {
  characterClass: string;
  categoryName: string;
  characterExp: ExperienceWire & { points: number };
  talent: ExperienceWire;
  abilities: Record<string, ExperienceWire & { bonus: number }>;
  physicalAttributes: Record<string, AttributeWire>;
  mentalAttributes: Record<string, AttributeWire>;
  spiritualAttributes: Record<string, ExperienceWire & { power: number }>;
  physicalSkills: Record<string, ExperienceWire & { value: number }>;
  mentalSkills: Record<string, ExperienceWire & { value: number }>;
  spiritualSkills: Record<string, ExperienceWire & { value: number }>;
  principles: Record<string, ExperienceWire & { value: number }>;
  categories: Record<string, ExperienceWire & { value: number; percent: number }>;
  commonProficiencies: Record<string, ExperienceWire>;
  jointProficiencies: Record<string, ExperienceWire & { weapons: string[] }>;
  status: Record<"health" | "stamina" | "aura", StatusWire>;
}
