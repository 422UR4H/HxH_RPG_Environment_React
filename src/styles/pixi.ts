/** Hex dos tokens (`#rrggbb`) → número que o Pixi espera (`0xrrggbb`). */
export const toPixi = (hex: string): number => parseInt(hex.slice(1), 16);
