import type { Skill } from "../../../types/characterSheet";

export function createEmptyPrinciple(): Skill {
  return {
    level: 0,
    value: 0,
  };
}

export function createEmptyPrinciples(): Record<string, Skill> {
  return {
    ten: createEmptyPrinciple(),
    zetsu: createEmptyPrinciple(),
    ren: createEmptyPrinciple(),
    en: createEmptyPrinciple(),
    ken: createEmptyPrinciple(),
    kou: createEmptyPrinciple(),
    ryu: createEmptyPrinciple(),
    gyo: createEmptyPrinciple(),
    shu: createEmptyPrinciple(),
    in: createEmptyPrinciple(),
  };
}
