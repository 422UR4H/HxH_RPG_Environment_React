import type { Category } from "../../../types/characterSheet";

export function createEmptyCategory(): Category {
  return {
    level: 0,
    value: 0,
    percent: 0,
  };
}

export function createEmptyCategories(): Record<string, Category> {
  return {
    emission: createEmptyCategory(),
    manipulation: createEmptyCategory(),
    materialization: createEmptyCategory(),
    reinforcement: createEmptyCategory(),
    specialization: createEmptyCategory(),
    transmutation: createEmptyCategory(),
  };
}
