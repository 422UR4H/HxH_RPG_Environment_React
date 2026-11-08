import { describe, it, expect } from "vitest";
import { actionKindLabel, costLabel, describeDeclared, weaponLabel } from "../combatText";

describe("costLabel", () => {
  it("uma barra no singular, as duas no plural", () => {
    expect(costLabel(["action"])).toBe("barra de ação");
    expect(costLabel(["move"])).toBe("barra de movimento");
    expect(costLabel(["action", "move"])).toBe("barras de ação e movimento");
  });
});

describe("weaponLabel", () => {
  it("Fist é Desarmado; o resto separa o CamelCase", () => {
    expect(weaponLabel("Fist")).toBe("Desarmado");
    expect(weaponLabel("LongSword")).toBe("Long Sword");
  });
});

describe("describeDeclared e a arma", () => {
  const atk = (weapon: string) =>
    describeDeclared({ attack: { targets: ["c1"], weapon } } as never, () => "Hisoka", "square");

  it("Fist vira 'desarmado' no texto corrido", () => {
    expect(atk("Fist")).toBe("Atacar Hisoka desarmado");
    expect(atk("Sword")).toBe("Atacar Hisoka com Sword");
  });
});

describe("actionKindLabel", () => {
  it("labels every backend action type in Portuguese", () => {
    expect(actionKindLabel("attack")).toBe("ataque");
    expect(actionKindLabel("move")).toBe("movimento");
    expect(actionKindLabel("defense")).toBe("defesa");
    expect(actionKindLabel("dodge")).toBe("esquiva");
    expect(actionKindLabel("feint")).toBe("finta");
    expect(actionKindLabel("interact")).toBe("interação");
    expect(actionKindLabel("skill")).toBe("perícia");
    expect(actionKindLabel("reaction")).toBe("reação");
    expect(actionKindLabel("unspecified")).toBe("ação");
  });

  it("falls back to the raw kind", () => {
    expect(actionKindLabel("brandNew")).toBe("brandNew");
  });
});
