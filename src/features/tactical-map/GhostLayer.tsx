import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { GridShape, SlotCoord } from "../../types/tacticalMap";
import { slotToWorld, slotInradius } from "./utils/coords";
import { colors } from "../../styles/tokens";

// Pixi Graphics wants numeric colors, not CSS hex strings — same conversion
// PieceSprite/GridLayer already do.
const toPixiColor = (hex: string) => parseInt(hex.replace("#", ""), 16);
const GHOST_COLOR = toPixiColor(colors.pieceGhost);

// Structural subset of `Ghost` (src/features/match/combat/combatReducer.ts) —
// a Ghost (which also carries actorId) satisfies this. Declared locally so
// this file, and its test-mocked Pixi layer, don't import the reducer.
export type GhostLike = {
  from: [number, number, number];
  to: [number, number, number];
};

// A ghost triple is [col, row, z] on a square grid and [q, r, z] on a hex grid
// (spec §6) — build the SlotCoord from grid.kind, same convention as the rest
// of the map layer (PiecesLayer, coords.ts).
function tripleToSlot(t: [number, number, number], grid: GridShape): SlotCoord {
  return grid.kind === "square"
    ? { kind: "square", col: t[0], row: t[1] }
    : { kind: "hex", q: t[0], r: t[1] };
}

/**
 * O fantasma da intenção declarada (spec §8): entre o envio de uma ação de movimento e a
 * abertura do turno, uma cópia translúcida da peça aparece no slot pretendido, ligada à
 * posição atual por uma seta. eventMode="none" — o fantasma nunca intercepta ponteiro.
 *
 * Invariante I1: desenha só o `from`/`to` do pedido. Nunca calcula posição — a peça real só
 * se move quando o `piece_moved` do servidor chega.
 */
export default function GhostLayer({ ghosts, grid }: { ghosts: GhostLike[]; grid: GridShape }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (!ghosts.length) return;
      // Same token radius PieceSprite uses (90% of the slot inradius), so the
      // ghost matches the size of the real piece it stands in for.
      const radius = slotInradius(grid) * 0.9;

      for (const ghost of ghosts) {
        const fromPt = slotToWorld(tripleToSlot(ghost.from, grid), grid);
        const toPt = slotToWorld(tripleToSlot(ghost.to, grid), grid);
        // Same z→px "height" convention PieceSprite uses (zOffsetPx = z * 10).
        const fromY = fromPt.y - ghost.from[2] * 10;
        const toY = toPt.y - ghost.to[2] * 10;

        // Translucent copy of the piece at the intended destination.
        g.setFillStyle({ color: GHOST_COLOR, alpha: 0.35 });
        g.circle(toPt.x, toY, radius);
        g.fill();

        // Arrow linking origin and destination.
        const dx = toPt.x - fromPt.x;
        const dy = toY - fromY;
        const len = Math.hypot(dx, dy);
        if (len < 1) continue;

        g.setStrokeStyle({ color: GHOST_COLOR, width: 2.5, alpha: 0.7 });
        g.moveTo(fromPt.x, fromY);
        g.lineTo(toPt.x, toY);
        g.stroke();

        const angle = Math.atan2(dy, dx);
        const headLen = Math.min(14, len * 0.4);
        const headAngle = Math.PI / 7;
        g.moveTo(toPt.x, toY);
        g.lineTo(
          toPt.x - headLen * Math.cos(angle - headAngle),
          toY - headLen * Math.sin(angle - headAngle),
        );
        g.moveTo(toPt.x, toY);
        g.lineTo(
          toPt.x - headLen * Math.cos(angle + headAngle),
          toY - headLen * Math.sin(angle + headAngle),
        );
        g.stroke();
      }
    },
    [ghosts, grid],
  );

  return (
    <pixiContainer label="ghost-layer" eventMode="none">
      <pixiGraphics draw={draw} />
    </pixiContainer>
  );
}
