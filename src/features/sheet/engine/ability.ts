// Espelho de internal/domain/entity/character_sheet/ability (Go).
import type { CascadeUpgrade, CharacterExp, Exp, UpgradeCascade } from "./experience";

export type AbilityName = "Physicals" | "Mentals" | "Spirituals" | "Skills";

export class Ability implements CascadeUpgrade {
  readonly name: AbilityName;
  readonly exp: Exp;
  private readonly charExp: CharacterExp;

  constructor(name: AbilityName, exp: Exp, charExp: CharacterExp) {
    this.name = name;
    this.exp = exp;
    this.charExp = charExp;
  }

  getBonus(): number {
    return (this.charExp.getCharacterPoints() + this.exp.getLevel()) / 2.0;
  }

  getLevel(): number {
    return this.exp.getLevel();
  }

  cascadeUpgrade(values: UpgradeCascade): void {
    const diff = this.exp.increasePoints(values.exp);
    this.charExp.endCascadeUpgrade(values);
    if (diff > 0) this.charExp.increaseCharacterPoints(diff);
  }
}

/** talent.go: na montagem da ficha o talento nunca recebe exp. */
export class Talent {
  readonly exp: Exp;

  constructor(exp: Exp) {
    this.exp = exp;
  }
}
