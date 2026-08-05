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
  // must happen, otherwise there is no geometry and the mask degenerates: an inverse
  // mask then covers everything, a normal mask hides everything.
  if (drewAny) g.fill({ color: 0xffffff, alpha: 1 });
}
