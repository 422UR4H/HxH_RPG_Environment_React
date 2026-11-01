// Espelho das constantes de internal/domain/entity/character_sheet/sheet/character_sheet_factory.go
// e de status/*.go. O teste de paridade compara com as do Go (fixture `constants`).
export const COEFF = {
  CHARACTER_COEFF: 10.0,
  TALENT_COEFF: 2.0,
  PHYSICAL_COEFF: 20.0,
  MENTAL_COEFF: 20.0,
  SPIRITUAL_COEFF: 5.0,
  SKILLS_COEFF: 20.0,
  PHYSICAL_ATTRIBUTE_COEFF: 5.0,
  MENTAL_ATTRIBUTE_COEFF: 1.0,
  SPIRITUAL_ATTRIBUTE_COEFF: 1.0,
  PHYSICAL_SKILLS_COEFF: 1.0,
  MENTAL_SKILLS_COEFF: 2.0,
  SPIRITUAL_SKILLS_COEFF: 3.0,
  SPIRITUAL_PRINCIPLE_COEFF: 1.0,
} as const;

/**
 * As proficiências conjuntas da classe nascem com tabela de coeficiente 1.0
 * (character_class_factory.go: `experience.NewExpTable(1.0)`), não com uma
 * constante da ficha. O read do gateway usa PHYSICAL_SKILLS_COEFF, que hoje
 * também vale 1.0.
 */
export const JOINT_PROFICIENCY_COEFF = 1.0;

// status/health_points_bar.go, stamina_points_bar.go, aura_points_bar.go
export const HP_BASE_VALUE = 20;
export const SP_COEF_VALUE = 10;
export const AP_COEF_VALUE = 10;
