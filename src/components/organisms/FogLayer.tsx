import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import type { Container as PixiContainer, Graphics as PixiGraphics } from "pixi.js";
import type { GridShape, FogState } from "../../types/tacticalMap";
import { fogTiers } from "../../features/tactical-map/utils/fog";
import { drawFogTiers, drawLosMask } from "../../features/tactical-map/utils/fogDraw";

type Props = {
  fog: FogState;
  grid: GridShape;
  worldWidth: number;
  worldHeight: number;
  disabled: boolean;
};

export default function FogLayer({ fog, grid, worldWidth, worldHeight, disabled }: Props) {
  if (disabled) return null;

  return (
    <FogLayerInner
      fog={fog}
      grid={grid}
      worldWidth={worldWidth}
      worldHeight={worldHeight}
    />
  );
}

// Inner component avoids calling hooks conditionally (hooks must not be called after
// an early return that depends on a prop).
type InnerProps = Omit<Props, "disabled">;

function FogLayerInner({ fog, grid, worldWidth, worldHeight }: InnerProps) {
  const containerRef = useRef<PixiContainer>(null);
  const maskRef = useRef<PixiGraphics>(null);

  // Cells are classified once per fog/grid change, not per frame.
  const tiers = useMemo(
    () => fogTiers(grid, fog.exploredCells, fog.fogMode),
    [grid, fog.exploredCells, fog.fogMode],
  );

  const drawTiers = useCallback(
    (g: PixiGraphics) => drawFogTiers(g, tiers, grid, worldWidth, worldHeight),
    [tiers, grid, worldWidth, worldHeight],
  );

  const drawMask = useCallback(
    (g: PixiGraphics) => drawLosMask(g, fog.visiblePolygons),
    [fog.visiblePolygons],
  );

  // The lit area is carved out of the fog by an INVERSE stencil mask built from the
  // backend's visibility polygons. That is what gives the edge its true polygonal
  // shape — rays from the wall corners — instead of following the grid.
  //
  // No dependency array on purpose: the guard makes re-runs free, and it keeps the
  // mask correct if @pixi/react ever swaps either instance.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const mask = maskRef.current;
    if (!container || !mask || container.mask === mask) return;

    if (typeof container.setMask !== "function") {
      // Failing loudly matters here: without the mask the fog silently covers the
      // whole board with no console error, which is precisely the failure mode that
      // hid the phase 10-D bugs for weeks.
      throw new Error("FogLayer: Container.setMask is unavailable — cannot apply the inverse LOS mask");
    }
    container.setMask({ mask, inverse: true });
  });

  return (
    <pixiContainer label="fog-layer" ref={containerRef}>
      <pixiGraphics draw={drawTiers} />
      {/* Do NOT set visible={false} here. Pixi's StencilMaskPipe already keeps the
          mask out of the rendered content (it flips includeInBuild off after
          collecting the geometry). Hiding it makes the mask empty, and an empty
          inverse mask fogs the entire board. */}
      <pixiGraphics draw={drawMask} label="fog-los-mask" ref={maskRef} />
    </pixiContainer>
  );
}
