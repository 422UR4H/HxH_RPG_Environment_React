import type { Ability } from "../../../types/characterSheet";

export function createEmptyAbility(): Ability {
  return {
    level: 0,
    bonus: 0,
  };
}

export function createEmptyAbilities(): Record<string, Ability> {
  return {
    mentals: createEmptyAbility(),
    physicals: createEmptyAbility(),
    skills: createEmptyAbility(),
    spirituals: createEmptyAbility(),
  };
}
