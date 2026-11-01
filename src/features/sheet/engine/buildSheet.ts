// Espelho de CharacterSheetFactory.Build + Wrap (sheet/character_sheet_factory.go)
// e de charactersheet.AssembleCharacterSheet (application/character_sheet).
import { Ability, Talent } from "./ability";
import type { AbilityName } from "./ability";
import {
  MiddleAttribute,
  PrimaryAttribute,
  SpiritualAttribute,
} from "./attribute";
import type { DistributableAttribute, GameAttribute } from "./attribute";
import { COEFF, JOINT_PROFICIENCY_COEFF } from "./constants";
import { CharacterExp, Exp, UpgradeCascade } from "./experience";
import { JointProficiency, Proficiency, ProficiencyManager } from "./proficiency";
import { CommonSkill, SkillsManager } from "./skill";
import { CATEGORY_NAMES, Hatsu, NenCategory, NenPrinciple, PRINCIPLE_NAMES } from "./spiritual";
import { AuraPoints, HealthPoints, StaminaPoints } from "./status";
import type { StatusBar } from "./status";
import type { ClassDefinition, SheetInput } from "./types";

export const PHYSICAL_PRIMARIES = ["Resistance", "Agility", "Flexibility", "Sense"] as const;
export const MENTAL_PRIMARIES = ["Resilience", "Adaptability", "Weighting", "Creativity"] as const;

export interface SheetModel {
  characterClass: string;
  characterExp: CharacterExp;
  talent: Talent;
  abilities: Map<AbilityName, Ability>;
  physicalAttributes: Map<string, DistributableAttribute>;
  physicalPrimaries: Map<string, PrimaryAttribute>;
  mentalAttributes: Map<string, PrimaryAttribute>;
  spiritualAttributes: Map<string, SpiritualAttribute>;
  physicalSkills: SkillsManager;
  mentalSkills: SkillsManager;
  spiritualSkills: SkillsManager;
  principles: Map<string, NenPrinciple>;
  categories: Map<string, NenCategory>;
  proficiencies: ProficiencyManager;
  status: Record<"health" | "stamina" | "aura", StatusBar>;
}

function buildAbilities(charExp: CharacterExp): Map<AbilityName, Ability> {
  const make = (name: AbilityName, coeff: number) => new Ability(name, Exp.of(coeff), charExp);
  return new Map<AbilityName, Ability>([
    ["Physicals", make("Physicals", COEFF.PHYSICAL_COEFF)],
    ["Mentals", make("Mentals", COEFF.MENTAL_COEFF)],
    ["Spirituals", make("Spirituals", COEFF.SPIRITUAL_COEFF)],
    ["Skills", make("Skills", COEFF.SKILLS_COEFF)],
  ]);
}

function buildPhysicalAttributes(physicals: Ability) {
  const base = new PrimaryAttribute(Exp.of(COEFF.PHYSICAL_ATTRIBUTE_COEFF), physicals);
  const res = base;
  const agi = base.clone();
  const flx = base.clone();
  const sen = base.clone();
  const middle = (a: PrimaryAttribute, b: PrimaryAttribute) => new MiddleAttribute(base.exp.clone(), a, b);

  const primaries = new Map<string, PrimaryAttribute>([
    ["Resistance", res],
    ["Agility", agi],
    ["Flexibility", flx],
    ["Sense", sen],
  ]);
  const all = new Map<string, DistributableAttribute>([
    ...primaries,
    ["Strength", middle(res, agi)],
    ["Celerity", middle(agi, flx)],
    ["Dexterity", middle(flx, sen)],
    ["Constitution", middle(sen, res)],
  ]);
  return { primaries, all };
}

function buildMentalAttributes(mentals: Ability) {
  const base = new PrimaryAttribute(Exp.of(COEFF.MENTAL_ATTRIBUTE_COEFF), mentals);
  return new Map<string, PrimaryAttribute>(
    MENTAL_PRIMARIES.map((name, i) => [name, i === 0 ? base : base.clone()]),
  );
}

// [atributo, perícias] na ordem do Go (BuildPhysSkills / BuildSpiritualSkills)
const PHYSICAL_SKILLS: [string, string[]][] = [
  ["Resistance", ["Vitality", "Energy", "Defense"]],
  ["Strength", ["Push", "Grab", "Carry"]],
  ["Agility", ["Quickness", "Accelerate", "Brake"]],
  ["Celerity", ["Legerity", "Repel", "Feint"]],
  ["Flexibility", ["Acrobatics", "Evasion", "Sneak"]],
  ["Dexterity", ["Reflex", "Accuracy", "Stealth"]],
  ["Sense", ["Vision", "Hearing", "Smell", "Tact", "Taste"]],
  ["Constitution", ["Heal", "Breath", "Tenacity"]],
];

const SPIRITUAL_SKILLS: [string, string[]][] = [
  ["Flame", ["Focus", "WillPower", "SelfKnowledge"]],
  ["Conscience", ["Coa", "Mop", "Aop"]],
];

function buildSkills(
  coeff: number,
  skillsAbility: Ability,
  layout: [string, string[]][],
  attrs: ReadonlyMap<string, GameAttribute>,
): SkillsManager {
  const manager = new SkillsManager(Exp.of(coeff), skillsAbility);
  for (const [attrName, skills] of layout) {
    const attr = attrs.get(attrName);
    if (!attr) throw new Error(`attribute not found: ${attrName}`);
    for (const skill of skills) {
      manager.skills.set(skill, new CommonSkill(manager.exp.clone(), attr, manager));
    }
  }
  return manager;
}

function requireSkill(sheet: SheetModel, name: string): CommonSkill {
  const skill =
    sheet.spiritualSkills.skills.get(name) ??
    sheet.physicalSkills.skills.get(name) ??
    sheet.mentalSkills.skills.get(name);
  if (!skill) throw new Error(`skill not found: ${name}`);
  return skill;
}

function requireMap<T>(map: Map<string, T>, name: string, what: string): T {
  const value = map.get(name);
  if (!value) throw new Error(`${what} not found: ${name}`);
  return value;
}

function upgradeStatus(sheet: SheetModel): void {
  for (const bar of Object.values(sheet.status)) bar.upgrade();
}

/** CharacterSheetFactory.assembleParts: a ficha zerada, sem classe. */
function assembleParts(characterClass: string): SheetModel {
  const characterExp = new CharacterExp(Exp.of(COEFF.CHARACTER_COEFF));
  const talent = new Talent(Exp.of(COEFF.TALENT_COEFF));
  const abilities = buildAbilities(characterExp);
  const ability = (name: AbilityName) => abilities.get(name) as Ability;

  const phys = buildPhysicalAttributes(ability("Physicals"));
  const mentalAttributes = buildMentalAttributes(ability("Mentals"));
  const flame = new SpiritualAttribute(Exp.of(COEFF.SPIRITUAL_ATTRIBUTE_COEFF), ability("Spirituals"));
  const spiritualAttributes = new Map<string, SpiritualAttribute>([
    ["Flame", flame],
    ["Conscience", flame.clone()],
  ]);
  const conscience = spiritualAttributes.get("Conscience") as SpiritualAttribute;

  const physicalSkills = buildSkills(COEFF.PHYSICAL_SKILLS_COEFF, ability("Skills"), PHYSICAL_SKILLS, phys.all);
  const mentalSkills = new SkillsManager(Exp.of(COEFF.MENTAL_SKILLS_COEFF), ability("Skills"));
  const spiritualSkills = buildSkills(
    COEFF.SPIRITUAL_SKILLS_COEFF,
    ability("Skills"),
    SPIRITUAL_SKILLS,
    spiritualAttributes,
  );

  // sem hexágono Nen: percentuais vazios (criação e edição montam com hexValue nil)
  const hatsu = new Hatsu(Exp.of(COEFF.SPIRITUAL_PRINCIPLE_COEFF), flame, conscience);
  const categories = new Map(
    CATEGORY_NAMES.map((name) => [name, new NenCategory(Exp.of(COEFF.SPIRITUAL_PRINCIPLE_COEFF), name, hatsu)]),
  );
  const principles = new Map(
    PRINCIPLE_NAMES.map((name) => [name, new NenPrinciple(Exp.of(COEFF.SPIRITUAL_PRINCIPLE_COEFF), flame, conscience)]),
  );

  const sheet: SheetModel = {
    characterClass,
    characterExp,
    talent,
    abilities,
    physicalAttributes: phys.all,
    physicalPrimaries: phys.primaries,
    mentalAttributes,
    spiritualAttributes,
    physicalSkills,
    mentalSkills,
    spiritualSkills,
    principles,
    categories,
    proficiencies: new ProficiencyManager(),
    status: undefined as unknown as SheetModel["status"],
  };
  const resistance = requireMap(phys.all, "Resistance", "attribute");
  sheet.status = {
    health: new HealthPoints(ability("Physicals"), resistance, requireSkill(sheet, "Vitality")),
    stamina: new StaminaPoints(ability("Physicals"), resistance, requireSkill(sheet, "Energy")),
    aura: new AuraPoints(ability("Spirituals"), conscience, requireSkill(sheet, "Mop")),
  };
  return sheet;
}

/** CharacterSheetFactory.Wrap: aplica a classe (já com as escolhas do jogador). */
function wrap(
  sheet: SheetModel,
  skillsExps: Record<string, number>,
  definition: ClassDefinition,
  proficienciesExps: Record<string, number>,
): void {
  const physicals = sheet.abilities.get("Physicals") as Ability;
  const skills = sheet.abilities.get("Skills") as Ability;

  for (const [name, exp] of Object.entries(skillsExps)) {
    requireSkill(sheet, name).cascadeUpgradeTrigger(new UpgradeCascade(exp));
    upgradeStatus(sheet);
  }
  for (const joint of definition.jointProficiencies) {
    sheet.proficiencies.addJoint(
      new JointProficiency(Exp.of(JOINT_PROFICIENCY_COEFF), joint.name, joint.weapons, physicals, skills),
    );
  }
  for (const [name, exp] of Object.entries(definition.attributesExps)) {
    requireMap(sheet.mentalAttributes, name, "mental attribute").cascadeUpgrade(new UpgradeCascade(exp));
    upgradeStatus(sheet);
  }
  for (const [name, exp] of Object.entries(proficienciesExps)) {
    sheet.proficiencies.addCommon(name, new Proficiency(Exp.of(COEFF.PHYSICAL_SKILLS_COEFF), physicals));
    sheet.proficiencies.get(name).cascadeUpgradeTrigger(new UpgradeCascade(exp));
    upgradeStatus(sheet);
  }
  for (const [name, exp] of Object.entries(definition.jointProfExps)) {
    requireMap(sheet.proficiencies.joints, name, "joint proficiency").cascadeUpgradeTrigger(new UpgradeCascade(exp));
    upgradeStatus(sheet);
  }
}

/**
 * Pontos de atributo, como ApplyInitialAttributePoints — mas SEM exigir que a
 * soma feche no nível de Físicos/Mentais: a prévia mostra a distribuição em
 * andamento. A validação da soma fica em validateCharacterSheet (e no back).
 */
function applyAttributePoints(sheet: SheetModel, points: Record<string, number>): void {
  for (const [name, pts] of Object.entries(points)) {
    if (pts <= 0) continue;
    const attr = sheet.physicalPrimaries.get(name) ?? sheet.mentalAttributes.get(name);
    if (!attr) throw new Error(`attribute does not take points: ${name}`);
    attr.points += pts;
  }
  upgradeStatus(sheet);
}

/**
 * Monta a ficha como o back monta a partir do mesmo envio
 * (charactersheet.AssembleCharacterSheet). As escolhas do jogador substituem as
 * da classe na mesma chave, como ApplySkills/ApplyProficiencies.
 */
export function buildSheet(
  characterClass: string,
  definition: ClassDefinition,
  input: SheetInput,
): SheetModel {
  const sheet = assembleParts(characterClass);
  wrap(
    sheet,
    { ...definition.skillsExps, ...input.skillsExps },
    definition,
    { ...definition.proficienciesExps, ...input.proficienciesExps },
  );
  applyAttributePoints(sheet, input.attributePoints);
  return sheet;
}
