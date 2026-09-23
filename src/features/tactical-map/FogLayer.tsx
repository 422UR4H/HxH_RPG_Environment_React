import { useCallback, useLayoutEffect, useRef } from "react";
import type { Container as PixiContainer, Graphics as PixiGraphics } from "pixi.js";
import type { FogState } from "../../types/tacticalMap";
import { drawFog, drawLosMask } from "./utils/fogDraw";
import { applyLosMask, type MaskableContainer, type MaskSource } from "./utils/losMask";

type Props = {
  fog: FogState;
  worldWidth: number;
  worldHeight: number;
  disabled: boolean;
};

export default function FogLayer({ fog, worldWidth, worldHeight, disabled }: Props) {
  if (disabled) return null;

  return <FogLayerInner fog={fog} worldWidth={worldWidth} worldHeight={worldHeight} />;
}

// Inner component avoids calling hooks conditionally (hooks must not be called after
// an early return that depends on a prop).
type InnerProps = Omit<Props, "disabled">;

function FogLayerInner({ fog, worldWidth, worldHeight }: InnerProps) {
  const containerRef = useRef<PixiContainer>(null);
  const maskRef = useRef<PixiGraphics>(null);

  const draw = useCallback(
    (g: PixiGraphics) => drawFog(g, worldWidth, worldHeight),
    [worldWidth, worldHeight],
  );

  const drawMask = useCallback(
    (g: PixiGraphics) => drawLosMask(g, fog.visiblePolygons),
    [fog.visiblePolygons],
  );

  // The lit area is carved out of the fog by an inverse stencil mask built from the
  // backend's visibility polygons — that is what makes the edge follow the real rays
  // from the wall corners instead of the grid.
  //
  // The cast bridges applyLosMask's minimal structural type (kept Pixi-free so it is
  // testable without WebGL) to the real Container ref — Pixi's own setMask signature
  // is stricter, so TS checks it contravariantly and rejects a plain Container here.
  useLayoutEffect(() => {
    applyLosMask(containerRef.current as MaskableContainer | null, maskRef.current as MaskSource | null, true);
  });

  return (
    // F1: eventMode="none" — without it, Pixi 8 hit-tests this full-world Graphics
    // through the viewport's own eventMode="static", and it wins the hit inside the lit
    // area (the inverse stencil mask only affects drawing, never containsPoint), eating
    // every click on a piece or empty slot that lands within line of sight.
    <pixiContainer label="fog-layer" ref={containerRef} eventMode="none">
      <pixiGraphics draw={draw} />
      <pixiGraphics draw={drawMask} label="fog-los-mask" ref={maskRef} />
    </pixiContainer>
  );
}
