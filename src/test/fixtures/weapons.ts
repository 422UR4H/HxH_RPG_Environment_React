import type { WeaponInfo } from "../../types/rules";

// Amostra do catálogo real de GET /rules/weapons (docs/dev/api/rules.md).
export const weaponsCatalogueFixture: WeaponInfo[] = [
  { name: "Katana", dice: [4, 12], flatDamage: 7 },
  { name: "Fist", dice: [6, 6, 4], flatDamage: 0 },
  { name: "Bow", dice: [12], flatDamage: 3 },
  { name: "Dagger", dice: [8], flatDamage: 5 },
  { name: "ThrowingDagger", dice: [8], flatDamage: 2 },
  { name: "Longbow", dice: [12, 12], flatDamage: 3 },
];
