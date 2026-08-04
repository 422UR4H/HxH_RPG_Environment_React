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

/** Ray-casting point-in-polygon. `poly` is a closed ring of [x, y] world points. */
export function pointInPolygon(x: number, y: number, poly: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export type FogTier = "hidden" | "explored" | "visible";

/**
 * Fog tier for every cell of the grid.
 *
 * The tiers are computed as DISJOINT sets on purpose. Rendering them as separate
 * translucent layers stacked on top of each other would darken the overlaps, and the
 * obvious fix — an "erase" blend mode — only works when the layer owns an isolated
 * render target. Erasing straight onto the main framebuffer punches through to the
 * canvas clear colour, so the lit area comes out pure black instead of revealing the
 * map. Disjoint regions need no blending at all: each cell is painted exactly once.
 *
 * A cell counts as visible when its CENTRE falls inside any visibility polygon, which
 * is the same rule the backend uses to mark cells explored.
 */
export function fogTiers(
  grid: GridShape,
  visiblePolygons: Array<Array<[number, number]>>,
  exploredCells: ReadonlySet<string>,
  fogMode: "live" | "explored",
  cellCenter: (a: number, b: number) => { x: number; y: number },
): { hidden: Array<[number, number]>; explored: Array<[number, number]> } {
  const hidden: Array<[number, number]> = [];
  const explored: Array<[number, number]> = [];

  for (let b = 0; b < grid.rows; b++) {
    for (let a = 0; a < grid.cols; a++) {
      const c = cellCenter(a, b);
      let visible = false;
      for (const poly of visiblePolygons) {
        if (poly.length >= 3 && pointInPolygon(c.x, c.y, poly)) {
          visible = true;
          break;
        }
      }
      if (visible) continue; // painted by nothing: fully clear
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
