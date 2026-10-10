import { describe, it, expect } from "vitest";
import { describeDeclared, weaponLabel } from "../combatText";

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
