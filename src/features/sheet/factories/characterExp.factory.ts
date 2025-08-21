export interface CharacterExp {
  level: number;
  exp: number;
  currExp: number;
  nextLvlBaseExp: number;
  points: number;
}

export function createEmptyCharacterExp(): CharacterExp {
  return {
    level: 0,
    exp: 0,
    currExp: 0,
    nextLvlBaseExp: 0,
    points: 0,
  };
}
