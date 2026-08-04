import type { GridShape, VisibilityPolygon } from "../../../types/tacticalMap";
import { applyTransform } from "./coords";
import { cellCornersLocal } from "./fog";

export const FOG_COLOR = 0x05070a;
export const UNEXPLORED_ALPHA = 0.92;
export const EXPLORED_ALPHA = 0.5;
/** Padding around the board so panning never exposes an un-fogged edge. */
export const FOG_PADDING = 2000;

/**
 * The subset of Pixi's Graphics API these drawing routines use.
 *
 * Depending on the structural type instead of Graphics itself is what lets the tests
 * record the calls and assert on the resulting geometry and alphas without a WebGL
 * context. Return types are `unknown` because Pixi's methods return `this`.
 */
export type FogDrawTarget = {
  clear(): unknown;
  moveTo(x: number, y: number): unknown;
  lineTo(x: number, y: number): unknown;
  closePath(): unknown;
  fill(style: { color: number; alpha?: number }): unknown;
};

function paintCells(
  g: FogDrawTarget,
  cells: Array<[number, number]>,
  grid: GridShape,
  alpha: number,
): void {
  if (cells.length === 0) return;
  for (const [a, b] of cells) {
    const corners = cellCornersLocal(a, b, grid);
    const first = applyTransform({ x: corners[0][0], y: corners[0][1] }, grid);
    g.moveTo(first.x, first.y);
    for (let i = 1; i < corners.length; i++) {
      const pt = applyTransform({ x: corners[i][0], y: corners[i][1] }, grid);
      g.lineTo(pt.x, pt.y);
    }
    g.closePath();
  }
  g.fill({ color: FOG_COLOR, alpha });
}

/**
 * Paints the fog itself: a ring well outside the board plus one quad per fogged cell.
 *
 * Every region is disjoint, so no blending is involved and each area lands at exactly
 * its intended alpha. The currently visible area is NOT handled here — it is removed
 * by the inverse mask drawn by drawLosMask.
 */
export function drawFogTiers(
  g: FogDrawTarget,
  tiers: { hidden: Array<[number, number]>; explored: Array<[number, number]> },
  grid: GridShape,
  worldWidth: number,
  worldHeight: number,
): void {
  g.clear();

  const P = FOG_PADDING;
  const ring: Array<[number, number, number, number]> = [
    [-P, -P, worldWidth + P, 0],
    [-P, worldHeight, worldWidth + P, worldHeight + P],
    [-P, 0, 0, worldHeight],
    [worldWidth, 0, worldWidth + P, worldHeight],
  ];
  for (const [x0, y0, x1, y1] of ring) {
    g.moveTo(x0, y0);
    g.lineTo(x1, y0);
    g.lineTo(x1, y1);
    g.lineTo(x0, y1);
    g.closePath();
  }
  g.fill({ color: FOG_COLOR, alpha: UNEXPLORED_ALPHA });

  paintCells(g, tiers.hidden, grid, UNEXPLORED_ALPHA);
  paintCells(g, tiers.explored, grid, EXPLORED_ALPHA);
}

/**
 * Draws the player's line of sight, to be used as an INVERSE mask over the fog.
 *
 * The points are written verbatim: the backend already produces them in world space,
 * so running them through applyTransform would displace the lit area.
 *
 * Overlapping polygons (a player with two pieces standing close together) are safe.
 * Pixi's stencil mask writes with `compare: equal` + `increment-clamp`, so a second
 * polygon over the same pixel does not increment again — overlaps union rather than
 * cancel out.
 */
export function drawLosMask(g: FogDrawTarget, polygons: VisibilityPolygon[]): void {
  g.clear();

  let drewAny = false;
  for (const poly of polygons) {
    if (poly.length < 3) continue;
    g.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) {
      g.lineTo(poly[i][0], poly[i][1]);
    }
    g.closePath();
    drewAny = true;
  }
  // The colour is irrelevant — a stencil mask only cares about coverage — but the fill
  // must happen, otherwise there is no geometry and the inverse mask fogs everything.
  if (drewAny) g.fill({ color: 0xffffff, alpha: 1 });
}
