// Espelho de internal/domain/entity/character_sheet/experience (Go).
// Cada `Math.trunc` aqui é um `int(...)` ou uma divisão inteira do Go.

export const MAX_LVL = 101;
const A_PARAM = 3.7;
const B_PARAM = 2.8;

// exp_table.go: expTableFunction
function expTableFunction(lvl: number): number {
  return (
    1700.0 / (1.0 + Math.pow(Math.E, (A_PARAM / 10.0) * (12.0 - lvl))) +
    1800.0 / (1.0 + Math.pow(Math.E, (A_PARAM / 10.0) * (38.0 - lvl))) +
    2000.0 / (1.0 + Math.pow(Math.E, (B_PARAM / 10.0) * (74.0 - lvl)))
  );
}

export class ExpTable {
  readonly coefficient: number;
  private readonly baseTable: number[];
  private readonly aggregateTable: number[];

  constructor(coefficient: number) {
    this.coefficient = coefficient;
    this.baseTable = [0];
    this.aggregateTable = [0];
    for (let i = 1; i < MAX_LVL; i++) {
      const currExp = Math.trunc(coefficient * expTableFunction(i));
      this.baseTable[i] = currExp;
      this.aggregateTable[i] = this.aggregateTable[i - 1] + currExp;
    }
  }

  getBaseExpByLvl(lvl: number): number {
    return this.baseTable[lvl] ?? 0;
  }

  getAggregateExpByLvl(lvl: number): number {
    return this.aggregateTable[lvl] ?? 0;
  }

  getLvlByExp(exp: number): number {
    for (let lvl = this.aggregateTable.length - 1; lvl >= 0; lvl--) {
      if (this.aggregateTable[lvl] <= exp) return lvl;
    }
    return 0;
  }
}

// As tabelas só dependem do coeficiente: uma por coeficiente basta.
const tables = new Map<number, ExpTable>();

export function expTableFor(coefficient: number): ExpTable {
  let table = tables.get(coefficient);
  if (!table) {
    table = new ExpTable(coefficient);
    tables.set(coefficient, table);
  }
  return table;
}

// experience.go: Exp
export class Exp {
  private readonly table: ExpTable;
  private points = 0;
  private level = 0;

  constructor(table: ExpTable) {
    this.table = table;
  }

  static of(coefficient: number): Exp {
    return new Exp(expTableFor(coefficient));
  }

  getPoints(): number {
    return this.points;
  }

  getLevel(): number {
    return this.level;
  }

  getCurrentExp(): number {
    return this.points - this.table.getAggregateExpByLvl(this.level);
  }

  getNextLvlBaseExp(): number {
    return this.table.getBaseExpByLvl(this.level + 1);
  }

  /** Soma exp e devolve quantos níveis subiu (o `diff` do Go). */
  increasePoints(exp: number): number {
    this.points += exp;
    const diff = this.table.getLvlByExp(this.points) - this.level;
    if (diff !== 0) this.level = this.table.getLvlByExp(this.points);
    return diff;
  }

  /** Exp.Clone do Go: mesma tabela, zerada. */
  clone(): Exp {
    return new Exp(this.table);
  }
}

/**
 * upgrade_cascade.go: UpgradeCascade. É MUTÁVEL de propósito: o atributo
 * intermediário reduz o exp repassado (SetExp) e quem vem depois na mesma
 * cadeia recebe o valor já reduzido — exatamente como no Go.
 */
export class UpgradeCascade {
  exp: number;

  constructor(exp: number) {
    this.exp = exp;
  }
}

export interface CascadeUpgrade {
  cascadeUpgrade(values: UpgradeCascade): void;
}

// character_exp.go: CharacterExp
export class CharacterExp {
  readonly exp: Exp;
  private points = 0;

  constructor(exp: Exp) {
    this.exp = exp;
  }

  endCascadeUpgrade(values: UpgradeCascade): void {
    this.exp.increasePoints(values.exp);
  }

  increaseCharacterPoints(pts: number): void {
    this.points += pts;
  }

  getCharacterPoints(): number {
    return this.points;
  }
}
