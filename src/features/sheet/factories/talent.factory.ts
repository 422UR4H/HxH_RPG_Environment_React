import type { Talent } from "../../../types/characterSheet";

export function createEmptyTalent(): Talent {
  return {
    level: 0,
    exp: 0,
    currExp: 0,
    nextLvlBaseExp: 0,
  };
}
