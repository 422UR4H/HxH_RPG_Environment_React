// Espelho de internal/domain/entity/character_sheet/proficiency (Go).
import type { CascadeUpgrade, Exp, UpgradeCascade } from "./experience";

export interface ProficiencyNode {
  readonly exp: Exp;
  cascadeUpgradeTrigger(values: UpgradeCascade): void;
}

export class Proficiency implements ProficiencyNode {
  readonly exp: Exp;
  private readonly physicals: CascadeUpgrade;

  constructor(exp: Exp, physicals: CascadeUpgrade) {
    this.exp = exp;
    this.physicals = physicals;
  }

  cascadeUpgradeTrigger(values: UpgradeCascade): void {
    this.exp.increasePoints(values.exp);
    this.physicals.cascadeUpgrade(values);
  }
}

export class JointProficiency implements ProficiencyNode {
  readonly exp: Exp;
  readonly name: string;
  readonly weapons: string[];
  private readonly physicals: CascadeUpgrade;
  private readonly skills: CascadeUpgrade;

  constructor(
    exp: Exp,
    name: string,
    weapons: string[],
    physicals: CascadeUpgrade,
    skills: CascadeUpgrade,
  ) {
    this.exp = exp;
    this.name = name;
    this.weapons = weapons;
    this.physicals = physicals;
    this.skills = skills;
  }

  cascadeUpgradeTrigger(values: UpgradeCascade): void {
    this.exp.increasePoints(values.exp);
    this.physicals.cascadeUpgrade(values);
    this.skills.cascadeUpgrade(values);
  }
}

export class ProficiencyManager {
  readonly joints = new Map<string, JointProficiency>();
  readonly commons = new Map<string, Proficiency>();

  /**
   * proficiency_manager.go: Get procura ANTES nas conjuntas — uma arma contida
   * numa conjunta recebe o exp nela, mesmo que também exista como comum.
   */
  get(weapon: string): ProficiencyNode {
    for (const joint of this.joints.values()) {
      if (joint.weapons.includes(weapon)) return joint;
    }
    const common = this.commons.get(weapon);
    if (!common) throw new Error(`proficiency not found: ${weapon}`);
    return common;
  }

  addCommon(weapon: string, prof: Proficiency): void {
    if (this.commons.has(weapon)) throw new Error(`proficiency already exists: ${weapon}`);
    this.commons.set(weapon, prof);
  }

  addJoint(prof: JointProficiency): void {
    if (this.joints.has(prof.name)) throw new Error(`proficiency already exists: ${prof.name}`);
    this.joints.set(prof.name, prof);
  }
}
