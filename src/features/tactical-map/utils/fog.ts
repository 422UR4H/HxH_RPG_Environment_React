import type { GridShape } from "../../../types/tacticalMap";

/** Stable string key for a cell. Square: "col,row". Hex: "q,r". */
export function cellKey(a: number, b: number): string {
  return `${a},${b}`;
}

/** Convert a backend explored delta ([[a,b],...]) to an array of cell keys. */
export function parseExploredDelta(delta: Array<[number, number]>): string[] {
  return delta.map(([a, b]) => cellKey(a, b));
}

/** Return a NEW set that unions `delta` into `base` (base is not mutated). */
export function mergeExplored(base: Set<string>, delta: Array<[number, number]>): Set<string> {
  const next = new Set(base);
  for (const [a, b] of delta) next.add(cellKey(a, b));
  return next;
}

/**
 * Corner points of cell (a,b) in LOCAL (pre-transform) coords. The caller applies
 * applyTransform per corner before drawing. Square → 4 corners; hex → 6 (pointy-top).
 */
export function cellCornersLocal(a: number, b: number, grid: GridShape): Array<[number, number]> {
  if (grid.kind === "hex") {
    const size = grid.cellSize / 2;
    const cx = size * Math.sqrt(3) * (a + b / 2);
    const cy = size * 1.5 * b;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 180) * (60 * i - 30); // pointy-top
      pts.push([cx + size * Math.cos(ang), cy + size * Math.sin(ang)]);
    }
    return pts;
  }
  const s = grid.cellSize;
  const x = a * s, y = b * s;
  return [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
}
