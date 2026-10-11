import { describe, it, expect } from "vitest";
import { costLabel, describeDeclared, weaponLabel } from "../combatText";

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
