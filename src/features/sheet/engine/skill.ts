// Espelho de internal/domain/entity/character_sheet/skill (Go).
import type { GameAttribute } from "./attribute";
import type { CascadeUpgrade, Exp, UpgradeCascade } from "./experience";

/** skills_manager.go: o gerente tem exp próprio e repassa à habilidade Perícias. */
export class SkillsManager implements CascadeUpgrade {
  readonly exp: Exp;
  private readonly skillsAbility: CascadeUpgrade;
  readonly skills = new Map<string, CommonSkill>();

  constructor(exp: Exp, skillsAbility: CascadeUpgrade) {
    this.exp = exp;
    this.skillsAbility = skillsAbility;
  }

  cascadeUpgrade(values: UpgradeCascade): void {
    this.exp.increasePoints(values.exp);
    this.skillsAbility.cascadeUpgrade(values);
  }
}

export class CommonSkill {
  readonly exp: Exp;
  private readonly attribute: GameAttribute;
  private readonly manager: CascadeUpgrade;

  constructor(exp: Exp, attribute: GameAttribute, manager: CascadeUpgrade) {
    this.exp = exp;
    this.attribute = attribute;
    this.manager = manager;
  }

  cascadeUpgradeTrigger(values: UpgradeCascade): void {
    this.exp.increasePoints(values.exp);
    this.attribute.cascadeUpgrade(values);
    this.manager.cascadeUpgrade(values);
  }

  getLevel(): number {
    return this.exp.getLevel();
  }

  getValueForTest(): number {
    return this.getLevel() + this.attribute.getPower();
  }
}
