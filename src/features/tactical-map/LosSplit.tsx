import { useCallback, useLayoutEffect, useRef, type ReactNode } from "react";
import type { Container as PixiContainer, Graphics as PixiGraphics } from "pixi.js";
import type { VisibilityPolygon } from "../../types/tacticalMap";
import { drawLosMask } from "./utils/fogDraw";
import { applyLosMask, type MaskableContainer, type MaskSource } from "./utils/losMask";

type Props = {
  /** Visibility polygons in world space, straight from the backend. */
  polygons: VisibilityPolygon[];
  /** Alpha for the remembered (out of sight) copy. */
  dimAlpha: number;
  /**
   * Grow the split boundary outward by this many world units. Content that sits exactly
   * ON the line of sight edge — a wall that blocks vision does — would otherwise be cut
   * down the middle, lit on the viewer's side and dimmed on the other. Both passes use
   * the same grown boundary, so they stay exact complements and nothing is drawn twice.
   */
  dilate?: number;
  children: ReactNode;
};

/**
 * Renders `children` twice, split by the player's line of sight: full brightness inside
 * it, dimmed outside it. The split is per-pixel, cut by the same smooth visibility
 * polygon the fog uses — so a wall that is half in view comes out correctly divided,
 * with no grid alignment anywhere.
 *
 * IMPORTANT — `children` MUST be purely presentational (only `<pixiGraphics>` /
 * `<pixiSprite>` and the like, no hooks, no effects, no refs of their own). They are
 * mounted twice. A component that registers a DOM listener in an effect would register
 * it twice: for WallsLayer that means every door click firing twice, with nothing in
 * the console to hint at it. Pass the drawing part, never the interactive component.
 */
export default function LosSplit({ polygons, dimAlpha, dilate = 0, children }: Props) {
  const litRef = useRef<PixiContainer>(null);
  const litMaskRef = useRef<PixiGraphics>(null);
  const dimRef = useRef<PixiContainer>(null);
  const dimMaskRef = useRef<PixiGraphics>(null);

  const drawMask = useCallback(
    (g: PixiGraphics) => drawLosMask(g, polygons, dilate),
    [polygons, dilate],
  );

  // No dependency array on purpose: applyLosMask no-ops when nothing changed, and this
  // keeps both masks correct if @pixi/react ever swaps an instance.
  //
  // applyLosMask deliberately depends only on a minimal structural type (so it is
  // testable without a WebGL context) rather than Pixi's own Container. Pixi's real
  // setMask signature is stricter (Mask = number | Container | null), so TS checks the
  // method contravariantly and rejects a plain Container here — the cast below is the
  // bridge between the real Pixi type and that narrow structural type.
  useLayoutEffect(() => {
    applyLosMask(litRef.current as MaskableContainer | null, litMaskRef.current as MaskSource | null, false);
    applyLosMask(dimRef.current as MaskableContainer | null, dimMaskRef.current as MaskSource | null, true);
  });

  return (
    <>
      <pixiContainer label="los-lit" ref={litRef}>
        {children}
        {/* Each masked container needs its OWN Graphics: one display object cannot be
            the mask of two containers at the same time. And never visible={false} —
            Pixi's StencilMaskPipe already keeps the mask out of the rendered content,
            while hiding it empties the mask and breaks both passes silently. */}
        <pixiGraphics draw={drawMask} label="los-lit-mask" ref={litMaskRef} />
      </pixiContainer>
      <pixiContainer label="los-dim" ref={dimRef} alpha={dimAlpha}>
        {children}
        <pixiGraphics draw={drawMask} label="los-dim-mask" ref={dimMaskRef} />
      </pixiContainer>
    </>
  );
}
