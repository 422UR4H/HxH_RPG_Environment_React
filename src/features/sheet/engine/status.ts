// Espelho de internal/domain/entity/character_sheet/status (Go).
import type { Ability } from "./ability";
import type { DistributableAttribute, GameAttribute } from "./attribute";
import { AP_COEF_VALUE, HP_BASE_VALUE, SP_COEF_VALUE } from "./constants";
import type { CommonSkill } from "./skill";

export abstract class StatusBar {
  readonly min = 0;
  current = 0;
  max = 0;

  protected abstract computeMax(): number;

  /** Bar.Upgrade: a barra cheia acompanha o novo máximo. */
  upgrade(): void {
    const maxVal = this.computeMax();
    if (this.current === this.max) this.current = maxVal;
    this.max = maxVal;
  }
}

export class HealthPoints extends StatusBar {
  private readonly physicals: Ability;
  private readonly resistance: DistributableAttribute;
  private readonly vitality: CommonSkill;

  constructor(physicals: Ability, resistance: DistributableAttribute, vitality: CommonSkill) {
    super();
    this.physicals = physicals;
    this.resistance = resistance;
    this.vitality = vitality;
    this.upgrade();
  }

  protected computeMax(): number {
    const coeff = this.vitality.getLevel() + this.resistance.getValue();
    return HP_BASE_VALUE + Math.trunc(coeff * this.physicals.getBonus());
  }
}

export class StaminaPoints extends StatusBar {
  private readonly physicals: Ability;
  private readonly resistance: DistributableAttribute;
  private readonly energy: CommonSkill;

  constructor(physicals: Ability, resistance: DistributableAttribute, energy: CommonSkill) {
    super();
    this.physicals = physicals;
    this.resistance = resistance;
    this.energy = energy;
    this.upgrade();
  }

  protected computeMax(): number {
    const coeff = this.energy.getLevel() + this.resistance.getValue();
    return SP_COEF_VALUE * Math.trunc(coeff * this.physicals.getBonus());
  }
}

export class AuraPoints extends StatusBar {
  private readonly spirituals: Ability;
  private readonly conscience: GameAttribute;
  private readonly mop: CommonSkill;

  constructor(spirituals: Ability, conscience: GameAttribute, mop: CommonSkill) {
    super();
    this.spirituals = spirituals;
    this.conscience = conscience;
    this.mop = mop;
    this.upgrade();
  }

  protected computeMax(): number {
    const bonus = Math.trunc(this.spirituals.getBonus());
    const coef = this.mop.getLevel() + this.conscience.getLevel();
    return Math.trunc(AP_COEF_VALUE * coef * bonus);
  }
}
