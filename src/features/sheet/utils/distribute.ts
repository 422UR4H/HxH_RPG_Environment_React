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
  attributes?: Record<string, Attribute>
) {
  const baseAttributes = getBaseAttributesForType(type);
  const distributed: Record<string, Attribute> = {};

  baseAttributes.forEach((attrName) => {
    distributed[attrName] = {
      exp: charClass.attributes[attrName]?.exp || 0,
      level: charClass.attributes[attrName]?.level || 0,
      power: charClass.attributes[attrName]?.power || 0,
      points: attributes?.[attrName]?.points || 0,
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
    distributed[skillName] = {
      exp: charClass.skills[skillName]?.exp || 0,
      level: charClass.skills[skillName]?.level || 0,
      value: charClass.skills[skillName]?.value || 0,
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
    });
  });
  return distributed;
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
      return ["focus", "nen", "willPower"];
    default:
      return [];
  }
}
