import type { CharacterClass } from "../../../types/characterClass";
import type {
  Ability,
  Attribute,
  JointProficiency,
  Proficiency,
  Skill,
} from "../../../types/characterSheet";

export function distributeAbilities(charClass: CharacterClass) {
  const baseAbilities = getBaseAbilities();
  const distributed: Record<string, Ability> = {};

  baseAbilities.forEach((abilityName) => {
    distributed[abilityName] = {
      exp: charClass.abilities[abilityName]?.exp || 0,
      level: charClass.abilities[abilityName]?.level || 0,
      bonus: charClass.abilities[abilityName]?.bonus || 0,
    };
  });
  return distributed;
}

export function distributeAttributes(
  type: "physical" | "mental" | "spiritual",
  charClass: CharacterClass,
) {
  const baseAttributes = getBaseAttributesForType(type);
  const distributed: Record<string, Attribute> = {};

  baseAttributes.forEach((attrName) => {
    const src = charClass.attributes[attrName];
    distributed[attrName] = {
      exp: src?.exp || 0,
      level: src?.level || 0,
      power: src?.power || 0,
      points: 0,
      currExp: src?.currExp,
      nextLvlBaseExp: src?.nextLvlBaseExp,
    };
  });
  return distributed;
}

export function distributeSkills(
  type: "physical" | "spiritual",
  charClass: CharacterClass
) {
  const baseSkills = getBaseSkillsForType(type);
  const distributed: Record<string, Skill> = {};

  baseSkills.forEach((skillName) => {
    const src = charClass.skills[skillName];
    distributed[skillName] = {
      exp: src?.exp || 0,
      level: src?.level || 0,
      value: src?.value || 0,
      currExp: src?.currExp,
      nextLvlBaseExp: src?.nextLvlBaseExp,
    };
  });
  return distributed;
}

export function distributeProficiencies(charClass: CharacterClass) {
  const distributed: Record<string, Proficiency> = {};

  Object.entries(charClass.proficiencies).forEach(([profName, profData]) => {
    distributed[profName] = {
      exp: profData.exp || 0,
      level: profData.level || 0,
      currExp: profData.currExp,
      nextLvlBaseExp: profData.nextLvlBaseExp,
    };
  });
  return distributed;
}

export function distributeJointProficiencies(charClass: CharacterClass) {
  const distributed: JointProficiency[] = [];

  charClass.jointProficiencies.forEach((prof) => {
    distributed.push({
      exp: prof.exp || 0,
      level: prof.level || 0,
      name: prof.name || "",
      currExp: prof.currExp,
      nextLvlBaseExp: prof.nextLvlBaseExp,
    });
  });
  return distributed;
}

// Middle physical attributes derived from their two primary attributes.
// Mirrors MiddleAttribute.GetPoints() on the backend:
//   round(sum(primaryPoints) / count(primaryAttrs))
export const MIDDLE_ATTR_PRIMARIES: Readonly<Record<string, [string, string]>> = {
  strength:     ["resistance", "agility"],
  celerity:     ["agility",    "flexibility"],
  dexterity:    ["flexibility", "sense"],
  constitution: ["sense",      "resistance"],
};

export function deriveMiddlePoints(
  attrName: string,
  attributes: Record<string, Attribute>,
): number {
  const primaries = MIDDLE_ATTR_PRIMARIES[attrName];
  if (!primaries) return attributes[attrName]?.points ?? 0;
  const sum = primaries.reduce(
    (acc, p) => acc + (attributes[p]?.points ?? 0),
    0,
  );
  return Math.floor(sum / primaries.length);
}

function getBaseAbilities() {
  return ["physicals", "mentals", "spirituals", "skills"];
}

function getBaseAttributesForType(type: "physical" | "mental" | "spiritual") {
  switch (type) {
    case "physical":
      return [
        "resistance",
        "constitution",
        "strength",
        "agility",
        "dexterity",
        "sense",
        "flexibility",
        "celerity",
      ];
    case "mental":
      return ["resilience", "adaptability", "weighting", "creativity"];
    case "spiritual":
      return ["spirit"];
    default:
      return [];
  }
}

function getBaseSkillsForType(type: "physical" | "spiritual") {
  switch (type) {
    case "physical":
      return [
        // resistance
        "defense",
        "energy",
        "vitality",
        // strength
        "carry",
        "grab",
        "push",
        // agility
        "accelerate",
        "brake",
        "velocity",
        // celerity
        "legerity",
        "feint",
        "repel",
        // flexibility
        "acrobatics",
        "evasion",
        "sneak",
        // dexterity
        "accuracy",
        "reflex",
        "stealth",
        // sense
        "hearing",
        "smell",
        "tact",
        "taste",
        "vision",
        // constitution
        "breath",
        "heal",
        "tenacity",
      ];
    case "spiritual":
      return [
        // flame nen
        "focus",
        "willPower",
        "selfKnowledge",
        // conscience nen
        "coa",
        "mop",
        "aop",
      ];
    default:
      return [];
  }
}
