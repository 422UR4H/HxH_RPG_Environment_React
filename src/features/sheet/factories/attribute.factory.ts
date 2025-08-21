import type { Attribute } from "../../../types/characterSheet";

export function createEmptyAttribute(): Attribute {
  return {
    level: 0,
    points: 0,
    power: 0,
  };
}

export function createEmptyPhysicalAttributes(): Record<string, Attribute> {
  return {
    agility: createEmptyAttribute(),
    celerity: createEmptyAttribute(),
    constitution: createEmptyAttribute(),
    dexterity: createEmptyAttribute(),
    flexibility: createEmptyAttribute(),
    resistance: createEmptyAttribute(),
    sense: createEmptyAttribute(),
    strength: createEmptyAttribute(),
  };
}

export function createEmptyMentalAttributes(): Record<string, Attribute> {
  return {
    adaptability: createEmptyAttribute(),
    creativity: createEmptyAttribute(),
    resilience: createEmptyAttribute(),
    weighting: createEmptyAttribute(),
  };
}

export function createEmptySpiritualAttributes(): Record<string, Attribute> {
  return {
    spirit: createEmptyAttribute(),
  };
}
