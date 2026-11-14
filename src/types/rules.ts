// Capítulo de regras da ficha — GET /rules/character-sheet (docs/dev/api/rules.md).
export interface RuleChapter {
  slug: string;
  label: string;
  title: string;
  markdown: string;
  comingSoon: boolean;
}

export interface SheetRulesResponse {
  chapters: RuleChapter[];
}

// Catálogo de armas — GET /rules/weapons (docs/dev/api/rules.md).
export interface WeaponInfo {
  name: string;
  dice: number[];
  flatDamage: number;
}

export interface WeaponsResponse {
  weapons: WeaponInfo[];
}
