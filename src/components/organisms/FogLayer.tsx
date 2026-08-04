import { useCallback, useMemo } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { GridShape, FogState } from "../../types/tacticalMap";
import { applyTransform, slotToWorld } from "../../features/tactical-map/utils/coords";
import { cellCornersLocal, fogTiers } from "../../features/tactical-map/utils/fog";

// ─── Constants ──────────────────────────────────────────────────────────────

const FOG_COLOR = 0x05070a;
const UNEXPLORED_ALPHA = 0.92;
const EXPLORED_ALPHA = 0.5;
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
  // Cells are classified once per fog/grid change, not per frame.
  const tiers = useMemo(
    () =>
      fogTiers(
        grid,
        fog.visiblePolygons,
        fog.exploredCells,
        fog.fogMode,
        (a, b) =>
          slotToWorld(
            grid.kind === "hex"
              ? { kind: "hex", q: a, r: b }
              : { kind: "square", col: a, row: b },
            grid,
          ),
      ),
    [grid, fog.visiblePolygons, fog.exploredCells, fog.fogMode],
  );

  // One pass, disjoint regions: the ring outside the board plus every non-visible
  // cell. Nothing overlaps, so each area ends up at exactly its intended alpha and
  // no blend mode is involved. Visible cells are simply never painted.
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Ring around the board, drawn as four rectangles so it never overlaps a cell.
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

      const paintCells = (cells: Array<[number, number]>, alpha: number) => {
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
      };

      paintCells(tiers.hidden, UNEXPLORED_ALPHA);
      paintCells(tiers.explored, EXPLORED_ALPHA);
    },
    [tiers, grid, worldWidth, worldHeight],
  );

  return (
    // eventMode="none" keeps the fog out of hit testing: it now renders above the
    // pieces, and a purely decorative overlay must never swallow their pointer events.
    <pixiContainer label="fog-layer" eventMode="none">
      <pixiGraphics draw={draw} eventMode="none" />
    </pixiContainer>
  );
}
