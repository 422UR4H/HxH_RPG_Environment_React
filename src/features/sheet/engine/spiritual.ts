// Espelho de internal/domain/entity/character_sheet/spiritual (Go), no recorte
// da montagem: sem hexágono Nen (criação e edição montam com hexValue nil), os
// percentuais das categorias são 0.
import type { GameAttribute } from "./attribute";
import type { Exp } from "./experience";

export const PRINCIPLE_NAMES = [
  "Ten", "Zetsu", "Ren", "Gyo", "Shu", "Kou", "Ken", "Ryu", "In", "En",
] as const; // Hatsu fica de fora do mapa de princípios, como no Go

export const CATEGORY_NAMES = [
  "Reinforcement", "Emission", "Transmutation", "Manipulation", "Materialization", "Specialization",
] as const;

export class NenPrinciple {
  readonly exp: Exp;
  private readonly flame: GameAttribute;
  private readonly conscience: GameAttribute;

  constructor(exp: Exp, flame: GameAttribute, conscience: GameAttribute) {
    this.exp = exp;
    this.flame = flame;
    this.conscience = conscience;
  }

  getValueForTest(): number {
    return this.exp.getLevel() + Math.trunc(this.conscience.getPower()) + this.flame.getLevel();
  }
}

export class Hatsu extends NenPrinciple {
  private readonly percents: Partial<Record<string, number>>;

  constructor(
    exp: Exp,
    flame: GameAttribute,
    conscience: GameAttribute,
    percents: Partial<Record<string, number>> = {},
  ) {
    super(exp, flame, conscience);
    this.percents = percents;
  }

  getPercentOf(category: string): number {
    return this.percents[category] ?? 0;
  }
}

export class NenCategory {
  readonly exp: Exp;
  readonly name: string;
  private readonly hatsu: Hatsu;

  constructor(exp: Exp, name: string, hatsu: Hatsu) {
    this.exp = exp;
    this.name = name;
    this.hatsu = hatsu;
  }

  getPercent(): number {
    return this.hatsu.getPercentOf(this.name);
  }

  getValueForTest(): number {
    const value = this.exp.getLevel() + this.hatsu.getValueForTest();
    return Math.trunc((value * this.getPercent()) / 100.0);
  }
}
