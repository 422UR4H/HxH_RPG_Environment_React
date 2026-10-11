import { useCallback, useMemo } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { GridShape } from "../../types/tacticalMap";
import type { SlotTriple } from "./utils/coords";
import { intentGeometry } from "./utils/intentGeometry";
import type { Arrow, IntentPreview } from "./utils/intentGeometry";
import { colors } from "../../styles/tokens";

export type { IntentPreview } from "./utils/intentGeometry";

const toPixiColor = (hex: string) => parseInt(hex.replace("#", ""), 16);
const MOVE_COLOR = toPixiColor(colors.moveIntent);
const OUTLINE_COLOR = toPixiColor(colors.intentOutline);
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
 * Traço de movimento em duas passadas: primeiro o contorno escuro (mais largo, `alpha` fixo),
 * depois a cor — assim a linha azul lê sobre grama, água ou piso claro. `draw` redesenha o
 * mesmo caminho a cada passada. Preenchimentos não passam por aqui (não levam contorno).
 */
function strokeTwice(
  g: PixiGraphics,
  draw: () => void,
  style: { color: number; width: number; alpha: number },
) {
  g.setStrokeStyle({ color: OUTLINE_COLOR, width: style.width + 2, alpha: 0.55 });
  draw();
  g.stroke();
  g.setStrokeStyle(style);
  draw();
  g.stroke();
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
          const arrow = ghost.arrow;
          strokeTwice(
            g,
            () => {
              g.moveTo(arrow.from.x, arrow.from.y);
              g.lineTo(arrow.to.x, arrow.to.y);
              arrowHead(g, arrow);
            },
            { color: MOVE_COLOR, width: 2.5, alpha: 0.7 },
          );
        }
      }

      const dest = shapes.destination;
      if (dest) {
        g.setFillStyle({ color: MOVE_COLOR, alpha: dest.auto ? 0.18 : 0.26 });
        g.moveTo(dest.corners[0].x, dest.corners[0].y);
        for (let i = 1; i < dest.corners.length; i++) g.lineTo(dest.corners[i].x, dest.corners[i].y);
        g.closePath();
        g.fill();
        strokeTwice(
          g,
          () => {
            g.moveTo(dest.corners[0].x, dest.corners[0].y);
            for (let i = 1; i < dest.corners.length; i++) g.lineTo(dest.corners[i].x, dest.corners[i].y);
            g.closePath();
          },
          { color: MOVE_COLOR, width: 2, alpha: 0.95 },
        );

        strokeTwice(g, () => dashedCircle(g, dest.center, dest.radius), {
          color: MOVE_COLOR,
          width: 2.5,
          alpha: 0.95,
        });
        const destArrow = dest.arrow;
        if (destArrow) {
          strokeTwice(
            g,
            () => {
              dashedLine(g, destArrow.from, destArrow.to);
              arrowHead(g, destArrow);
            },
            { color: MOVE_COLOR, width: 2.5, alpha: 0.95 },
          );
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
