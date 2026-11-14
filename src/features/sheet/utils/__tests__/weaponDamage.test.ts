import { describe, it, expect } from "vitest";
import { buildWeaponDamageLookup } from "../weaponDamage";
import type { WeaponInfo } from "../../../../types/rules";

const catalogue: WeaponInfo[] = [
  { name: "Katana", dice: [4, 12], flatDamage: 7 },
  { name: "Bomb", dice: [12, 12, 12], flatDamage: 0 },
  { name: "ThrowingDagger", dice: [6], flatDamage: 0 },
];

describe("buildWeaponDamageLookup", () => {
  const lookup = buildWeaponDamageLookup(catalogue);

  it("formats the damage of an exact name", () => {
    expect(lookup("Katana")).toBe("D12 + D4 +7");
    expect(lookup("Bomb")).toBe("3 D12");
  });

  it("matches a lower-cased first letter (sheet keys)", () => {
    expect(lookup("throwingDagger")).toBe("D6");
    expect(lookup("katana")).toBe("D12 + D4 +7");
  });

  it("returns undefined for an unknown weapon", () => {
    expect(lookup("Spear")).toBeUndefined();
  });

  it("returns undefined for everything when the catalogue is undefined", () => {
    expect(buildWeaponDamageLookup(undefined)("Katana")).toBeUndefined();
  });
});
