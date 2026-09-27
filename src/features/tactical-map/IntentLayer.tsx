import { useCallback, useMemo } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { GridShape } from "../../types/tacticalMap";
import type { SlotTriple } from "./utils/coords";
import { intentGeometry } from "./utils/intentGeometry";
import type { Arrow, IntentPreview } from "./utils/intentGeometry";
import { colors } from "../../styles/tokens";

export type { IntentPreview } from "./utils/intentGeometry";

const toPixiColor = (hex: string) => parseInt(hex.replace("#", ""), 16);
const MOVE_COLOR = toPixiColor(colors.pieceGhost);
const ATTACK_COLOR = toPixiColor(colors.pieceAttackIntent);

type XY = { x: number; y: number };

function dashedLine(g: PixiGraphics, a: XY, b: XY, dash = 8, gap = 6) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len === 0) return;
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  for (let d = 0; d < len; d += dash + gap) {
    const e = Math.min(d + dash, len);
    g.moveTo(a.x + ux * d, a.y + uy * d);
    g.lineTo(a.x + ux * e, a.y + uy * e);
  }
}

function dashedCircle(g: PixiGraphics, c: XY, r: number, segments = 16) {
  const step = (Math.PI * 2) / segments;
  for (let i = 0; i < segments; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.6;
    g.moveTo(c.x + r * Math.cos(a0), c.y + r * Math.sin(a0));
    g.arc(c.x, c.y, r, a0, a1);
  }
}

function arrowHead(g: PixiGraphics, arrow: Arrow) {
  g.moveTo(arrow.to.x, arrow.to.y);
  g.lineTo(arrow.head[0].x, arrow.head[0].y);
  g.moveTo(arrow.to.x, arrow.to.y);
  g.lineTo(arrow.head[1].x, arrow.head[1].y);
}

/**
 * A intenção no mapa: o que está sendo composto (destino destacado, token tracejado, seta;
 * linha até cada alvo) e os movimentos já declarados que ainda não aconteceram (token
 * translúcido + seta). Nunca intercepta ponteiro — é só desenho; a geometria vem de
 * `intentGeometry`, que é testada.
 */
export default function IntentLayer({
  preview,
  ghosts,
  grid,
}: {
  preview?: IntentPreview;
  ghosts: Array<{ from?: SlotTriple; to: SlotTriple }>;
  grid: GridShape;
}) {
  const shapes = useMemo(() => intentGeometry(preview, ghosts, grid), [preview, ghosts, grid]);

  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      for (const ghost of shapes.ghosts) {
        g.setFillStyle({ color: MOVE_COLOR, alpha: 0.3 });
        g.circle(ghost.center.x, ghost.center.y, ghost.radius);
        g.fill();
        if (ghost.arrow) {
          g.setStrokeStyle({ color: MOVE_COLOR, width: 2.5, alpha: 0.7 });
          g.moveTo(ghost.arrow.from.x, ghost.arrow.from.y);
          g.lineTo(ghost.arrow.to.x, ghost.arrow.to.y);
          arrowHead(g, ghost.arrow);
          g.stroke();
        }
      }

      const dest = shapes.destination;
      if (dest) {
        g.setFillStyle({ color: MOVE_COLOR, alpha: dest.auto ? 0.18 : 0.26 });
        g.moveTo(dest.corners[0].x, dest.corners[0].y);
        for (let i = 1; i < dest.corners.length; i++) g.lineTo(dest.corners[i].x, dest.corners[i].y);
        g.closePath();
        g.fill();
        g.setStrokeStyle({ color: MOVE_COLOR, width: 2, alpha: 0.95 });
        g.moveTo(dest.corners[0].x, dest.corners[0].y);
        for (let i = 1; i < dest.corners.length; i++) g.lineTo(dest.corners[i].x, dest.corners[i].y);
        g.closePath();
        g.stroke();

        g.setStrokeStyle({ color: MOVE_COLOR, width: 2.5, alpha: 0.95 });
        dashedCircle(g, dest.center, dest.radius);
        g.stroke();
        if (dest.arrow) {
          dashedLine(g, dest.arrow.from, dest.arrow.to);
          arrowHead(g, dest.arrow);
          g.stroke();
        }
      }

      if (shapes.attacks.length) {
        g.setStrokeStyle({ color: ATTACK_COLOR, width: 2.5, alpha: 0.95 });
        for (const a of shapes.attacks) {
          dashedLine(g, a.from, a.to, 6, 5);
          arrowHead(g, a);
        }
        g.stroke();
      }
    },
    [shapes],
  );

  return (
    <pixiContainer label="intent-layer" eventMode="none">
      <pixiGraphics draw={draw} />
    </pixiContainer>
  );
}
