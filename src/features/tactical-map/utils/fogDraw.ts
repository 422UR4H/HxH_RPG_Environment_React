import type { VisibilityPolygon } from "../../../types/tacticalMap";

export const FOG_COLOR = 0x05070a;
export const FOG_ALPHA = 0.92;
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
  stroke(style: { color: number; alpha?: number; width: number }): unknown;
};

/**
 * Paints the fog: one rectangle covering the board plus generous padding, at a single
 * alpha.
 *
 * There is no "remembered area" tier any more. The map terrain is not kept in the
 * character's memory — only static structure is, and that is enforced server-side by
 * which walls the player receives. The lit area is carved out of this rectangle by an
 * inverse stencil mask (see LosSplit / FogLayer), which is why no cell classification
 * happens here and the fog edge is smooth rather than grid-aligned.
 */
export function drawFog(g: FogDrawTarget, worldWidth: number, worldHeight: number): void {
  g.clear();

  const P = FOG_PADDING;
  g.moveTo(-P, -P);
  g.lineTo(worldWidth + P, -P);
  g.lineTo(worldWidth + P, worldHeight + P);
  g.lineTo(-P, worldHeight + P);
  g.closePath();
  g.fill({ color: FOG_COLOR, alpha: FOG_ALPHA });
}

/**
 * Draws the player's line of sight, used as a stencil mask over other layers.
 *
 * The points are written verbatim: the backend already produces them in world space,
 * so running them through applyTransform would displace the lit area.
 *
 * Overlapping polygons (a player with two pieces standing close together) are safe.
 * Pixi's stencil mask writes with `compare: equal` + `increment-clamp`, so a second
 * polygon over the same pixel does not increment again — overlaps union rather than
 * cancel out. That is also why the optional dilating stroke below can overlap the
 * fill without cancelling it.
 *
 * `dilate` grows the covered region outward by that many world units. A wall that
 * blocks vision lies exactly ON the polygon edge, so an exact mask cuts the wall's
 * stroke down its length — the viewer-side half lit, the far half dimmed. Growing the
 * mask by half the wall thickness puts the whole wall on the lit side.
 *
 * Only the walls' mask is dilated. The fog's mask must stay exact: growing it would
 * clear a sliver of floor just beyond a blocking wall and leak what stands behind it.
 */
export function drawLosMask(
  g: FogDrawTarget,
  polygons: VisibilityPolygon[],
  dilate = 0,
): void {
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
  if (!drewAny) return;

  // The colour is irrelevant — a stencil mask only cares about coverage — but the fill
  // must happen, otherwise there is no geometry and the mask degenerates: an inverse
  // mask then covers everything, a normal mask hides everything.
  g.fill({ color: 0xffffff, alpha: 1 });

  // StencilMaskPipe collects the mask container's renderables with the colour mask off,
  // so a stroke writes to the stencil exactly like a fill does. A centred stroke of
  // width 2*dilate extends `dilate` past the edge (the inner half lands on already
  // covered pixels, which the increment-clamp leaves alone).
  if (dilate > 0) {
    g.stroke({ color: 0xffffff, alpha: 1, width: dilate * 2 });
  }
}
