import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { GridShape, FogState } from "../../types/tacticalMap";
import { applyTransform } from "../../features/tactical-map/utils/coords";
import { cellCornersLocal } from "../../features/tactical-map/utils/fog";

// ─── Constants ──────────────────────────────────────────────────────────────

const FOG_COLOR = 0x05070a;
const UNEXPLORED_ALPHA = 0.92;
const EXPLORED_ALPHA = 0.5;
// Erase strength to lift darkness from UNEXPLORED_ALPHA down to EXPLORED_ALPHA.
// We draw white at this alpha in erase blend mode so the remaining visible alpha
// is UNEXPLORED_ALPHA - (UNEXPLORED_ALPHA - EXPLORED_ALPHA) = EXPLORED_ALPHA.
const EXPLORED_ERASE_ALPHA = (UNEXPLORED_ALPHA - EXPLORED_ALPHA) / UNEXPLORED_ALPHA;
// Padding around the board so panning never exposes an un-fogged edge.
const FOG_PADDING = 2000;

// ─── Props ──────────────────────────────────────────────────────────────────

type Props = {
  fog: FogState;
  grid: GridShape;
  worldWidth: number;
  worldHeight: number;
  disabled: boolean;
};

// ─── Component ──────────────────────────────────────────────────────────────

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

// Inner component avoids calling hooks conditionally (hooks must not be called
// after an early return that depends on a prop).
type InnerProps = Omit<Props, "disabled">;

function FogLayerInner({ fog, grid, worldWidth, worldHeight }: InnerProps) {
  // ── Tier 1: base darkness ──────────────────────────────────────────────────
  const drawBase = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.setFillStyle({ color: FOG_COLOR, alpha: UNEXPLORED_ALPHA });
      g.moveTo(-FOG_PADDING, -FOG_PADDING);
      g.lineTo(worldWidth + FOG_PADDING, -FOG_PADDING);
      g.lineTo(worldWidth + FOG_PADDING, worldHeight + FOG_PADDING);
      g.lineTo(-FOG_PADDING, worldHeight + FOG_PADDING);
      g.closePath();
      g.fill();
    },
    [worldWidth, worldHeight],
  );

  // ── Tier 2: explored cells (erase to mid-gray) ────────────────────────────
  const drawExplored = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (fog.fogMode !== "explored") return;
      g.setFillStyle({ color: 0xffffff, alpha: EXPLORED_ERASE_ALPHA });
      for (const key of fog.exploredCells) {
        const [aStr, bStr] = key.split(",");
        const a = Number(aStr);
        const b = Number(bStr);
        const corners = cellCornersLocal(a, b, grid);
        const first = applyTransform({ x: corners[0][0], y: corners[0][1] }, grid);
        g.moveTo(first.x, first.y);
        for (let i = 1; i < corners.length; i++) {
          const pt = applyTransform({ x: corners[i][0], y: corners[i][1] }, grid);
          g.lineTo(pt.x, pt.y);
        }
        g.closePath();
        g.fill();
      }
    },
    [fog.fogMode, fog.exploredCells, grid],
  );

  // ── Tier 3: current vision (full erase → clear) ───────────────────────────
  const drawVisible = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.setFillStyle({ color: 0xffffff, alpha: 1 });
      for (const poly of fog.visiblePolygons) {
        if (poly.length < 3) continue;
        const first = applyTransform({ x: poly[0][0], y: poly[0][1] }, grid);
        g.moveTo(first.x, first.y);
        for (let i = 1; i < poly.length; i++) {
          const pt = applyTransform({ x: poly[i][0], y: poly[i][1] }, grid);
          g.lineTo(pt.x, pt.y);
        }
        g.closePath();
        g.fill();
      }
    },
    [fog.visiblePolygons, grid],
  );

  return (
    <pixiContainer label="fog-layer" isRenderGroup>
      <pixiGraphics draw={drawBase} />
      <pixiGraphics draw={drawExplored} blendMode="erase" />
      <pixiGraphics draw={drawVisible} blendMode="erase" />
    </pixiContainer>
  );
}
