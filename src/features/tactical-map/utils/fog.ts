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

export type FogTier = "hidden" | "explored" | "visible";

/**
 * Fog tier for every cell of the grid.
 *
 * This classifier does NOT know about line of sight. The currently visible area is
 * removed by an inverse stencil mask built from the backend's visibility polygons
 * (see FogLayer and fogDraw.ts), which is what gives the fog its smooth polygonal
 * edge instead of a grid-aligned one.
 *
 * The two tiers are DISJOINT on purpose. Stacking translucent layers would darken
 * their overlap, and the obvious fix — an "erase" blend mode — only works when the
 * layer owns an isolated render target. Erasing onto the main framebuffer punches
 * through to the canvas clear colour, so the lit area comes out pure black. Disjoint
 * regions need no blending at all: each cell is painted exactly once.
 */
export function fogTiers(
  grid: GridShape,
  exploredCells: ReadonlySet<string>,
  fogMode: "live" | "explored",
): { hidden: Array<[number, number]>; explored: Array<[number, number]> } {
  const hidden: Array<[number, number]> = [];
  const explored: Array<[number, number]> = [];

  for (let b = 0; b < grid.rows; b++) {
    for (let a = 0; a < grid.cols; a++) {
      if (fogMode === "explored" && exploredCells.has(cellKey(a, b))) {
        explored.push([a, b]);
      } else {
        hidden.push([a, b]);
      }
    }
  }
  return { hidden, explored };
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
