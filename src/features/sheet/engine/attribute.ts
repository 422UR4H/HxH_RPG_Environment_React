// Espelho de internal/domain/entity/character_sheet/attribute (Go).
import type { Ability } from "./ability";
import type { CascadeUpgrade, Exp, UpgradeCascade } from "./experience";

/** IGameAttribute do Go: o que perícias, princípios e barras leem de um atributo. */
export interface GameAttribute extends CascadeUpgrade {
  readonly exp: Exp;
  getLevel(): number;
  getPower(): number;
}

/** IDistributableAttribute do Go: atributo que recebe pontos (físico ou mental). */
export interface DistributableAttribute extends GameAttribute {
  getPoints(): number;
  getValue(): number;
}

export class PrimaryAttribute implements DistributableAttribute {
  readonly exp: Exp;
  private readonly ability: Ability;
  private readonly buff = 0;
  points = 0;

  constructor(exp: Exp, ability: Ability) {
    this.exp = exp;
    this.ability = ability;
  }

  cascadeUpgrade(values: UpgradeCascade): void {
    this.exp.increasePoints(values.exp);
    this.ability.cascadeUpgrade(values);
  }

  getAbilityBonus(): number {
    return this.ability.getBonus();
  }

  getLevel(): number {
    return this.exp.getLevel();
  }

  getPoints(): number {
    return this.points;
  }

  getValue(): number {
    return this.points + this.getLevel();
  }

  getPower(): number {
    return this.getValue() + Math.trunc(this.getAbilityBonus()) + this.buff;
  }

  /** PrimaryAttribute.Clone: mesma habilidade, exp zerado da mesma tabela. */
  clone(): PrimaryAttribute {
    return new PrimaryAttribute(this.exp.clone(), this.ability);
  }
}

/** Força, celeridade, destreza, constituição: derivados de dois primários. */
export class MiddleAttribute implements DistributableAttribute {
  readonly exp: Exp;
  private readonly primaries: PrimaryAttribute[];
  private readonly buff = 0;

  constructor(exp: Exp, ...primaries: PrimaryAttribute[]) {
    this.exp = exp;
    this.primaries = primaries;
  }

  cascadeUpgrade(values: UpgradeCascade): void {
    const len = this.primaries.length;
    const remainder = this.exp.getPoints() % len;

    this.exp.increasePoints(values.exp);

    // o exp repassado aos primários é dividido — e fica dividido para quem
    // vem depois na cadeia (a perícia repassa o mesmo `values` ao seu gerente)
    values.exp = Math.trunc((remainder + values.exp) / len);
    for (const attr of this.primaries) attr.cascadeUpgrade(values);
  }

  getAbilityBonus(): number {
    if (this.primaries.length === 0) return 0;
    const sum = this.primaries.reduce((acc, p) => acc + p.getAbilityBonus(), 0);
    return sum / this.primaries.length;
  }

  getLevel(): number {
    return this.exp.getLevel();
  }

  getPoints(): number {
    const sum = this.primaries.reduce((acc, p) => acc + p.points, 0);
    return Math.trunc(sum / this.primaries.length);
  }

  getValue(): number {
    return this.getPoints() + this.getLevel();
  }

  getPower(): number {
    return this.getValue() + Math.trunc(this.getAbilityBonus()) + this.buff;
  }
}

/** Chama e consciência: sem pontos distribuíveis. */
export class SpiritualAttribute implements GameAttribute {
  readonly exp: Exp;
  private readonly ability: Ability;
  private readonly buff = 0;

  constructor(exp: Exp, ability: Ability) {
    this.exp = exp;
    this.ability = ability;
  }

  cascadeUpgrade(values: UpgradeCascade): void {
    this.exp.increasePoints(values.exp);
    this.ability.cascadeUpgrade(values);
  }

  getLevel(): number {
    return this.exp.getLevel();
  }

  getPower(): number {
    return this.getLevel() + Math.trunc(this.ability.getBonus()) + this.buff;
  }

  clone(): SpiritualAttribute {
    return new SpiritualAttribute(this.exp.clone(), this.ability);
  }
}
