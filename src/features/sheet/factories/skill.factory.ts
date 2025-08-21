import type { Skill } from "../../../types/characterSheet";

export function createEmptySkill(): Skill {
  return {
    level: 0,
    value: 0,
  };
}

export function createEmptyPhysicalSkills(): Record<string, Skill> {
  return {
    accelerate: createEmptySkill(),
    accuracy: createEmptySkill(),
    acrobatics: createEmptySkill(),
    brake: createEmptySkill(),
    breath: createEmptySkill(),
    carry: createEmptySkill(),
    defense: createEmptySkill(),
    energy: createEmptySkill(),
    evasion: createEmptySkill(),
    feint: createEmptySkill(),
    grab: createEmptySkill(),
    heal: createEmptySkill(),
    hearing: createEmptySkill(),
    legerity: createEmptySkill(),
    push: createEmptySkill(),
    reflex: createEmptySkill(),
    repel: createEmptySkill(),
    smell: createEmptySkill(),
    sneak: createEmptySkill(),
    stealth: createEmptySkill(),
    tact: createEmptySkill(),
    taste: createEmptySkill(),
    tenacity: createEmptySkill(),
    velocity: createEmptySkill(),
    vision: createEmptySkill(),
    vitality: createEmptySkill(),
  };
}

export function createEmptySpiritualSkills(): Record<string, Skill> {
  return {
    focus: createEmptySkill(),
    nen: createEmptySkill(),
    willPower: createEmptySkill(),
  };
}
