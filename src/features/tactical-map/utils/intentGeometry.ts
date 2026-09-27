import type { GridShape, SlotCoord } from "../../../types/tacticalMap";
import type { SlotTriple } from "./coords";
import { slotCorners, slotInradius, slotToWorld, tripleToSlot } from "./coords";

type XY = { x: number; y: number };

/** Uma seta: o traço e as duas pontas da cabeça. Começa e termina na borda dos tokens. */
export type Arrow = { from: XY; to: XY; head: [XY, XY] };

export type IntentShapes = {
  /** O destino que está sendo escolhido: o slot inteiro destacado + um token de contorno. */
  destination?: { corners: XY[]; center: XY; radius: number; auto: boolean; arrow?: Arrow };
  /** Uma linha de ataque por alvo, saindo de onde o ator vai estar quando atacar. */
  attacks: Arrow[];
  /** Movimentos já declarados que ainda não aconteceram: token translúcido + seta. */
  ghosts: Array<{ center: XY; radius: number; arrow?: Arrow }>;
};

export type IntentPreview = {
  from?: SlotCoord;
  to?: SlotCoord;
  auto: boolean;
  targets: SlotCoord[];
};

/** Mesmo raio de token que `PieceSprite` usa: 90% do inradius do slot. */
export const tokenRadius = (grid: GridShape) => slotInradius(grid) * 0.9;

export function arrowBetween(a: XY, b: XY, startInset: number, endInset: number): Arrow | undefined {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len <= startInset + endInset + 1) return undefined;
  const ux = dx / len;
  const uy = dy / len;
  const from = { x: a.x + ux * startInset, y: a.y + uy * startInset };
  const to = { x: b.x - ux * endInset, y: b.y - uy * endInset };
  const headLen = Math.min(14, len * 0.3);
  const angle = Math.atan2(uy, ux);
  const spread = Math.PI / 7;
  return {
    from,
    to,
    head: [
      { x: to.x - headLen * Math.cos(angle - spread), y: to.y - headLen * Math.sin(angle - spread) },
      { x: to.x - headLen * Math.cos(angle + spread), y: to.y - headLen * Math.sin(angle + spread) },
    ],
  };
}

/**
 * Traduz a intenção (o rascunho sendo composto + o que já foi declarado) em formas no
 * espaço do mundo. Função pura: a camada Pixi só desenha o que sai daqui — ela não tem
 * teste, isto tem.
 *
 * Desenha o PEDIDO, nunca onde a peça vai parar: isso só se sabe quando o servidor manda a
 * posição (`piece_moved`).
 */
export function intentGeometry(
  preview: IntentPreview | undefined,
  ghosts: Array<{ from?: SlotTriple; to: SlotTriple }>,
  grid: GridShape,
): IntentShapes {
  const radius = tokenRadius(grid);
  const shapes: IntentShapes = { attacks: [], ghosts: [] };

  for (const g of ghosts) {
    const center = slotToWorld(tripleToSlot(g.to, grid.kind), grid);
    const origin = g.from ? slotToWorld(tripleToSlot(g.from, grid.kind), grid) : undefined;
    shapes.ghosts.push({ center, radius, arrow: origin ? arrowBetween(origin, center, radius, radius) : undefined });
  }

  if (!preview) return shapes;

  const actorPt = preview.from ? slotToWorld(preview.from, grid) : undefined;
  let strikeFrom = actorPt;
  if (preview.to) {
    const center = slotToWorld(preview.to, grid);
    shapes.destination = {
      corners: slotCorners(preview.to, grid),
      center,
      radius,
      auto: preview.auto,
      arrow: actorPt ? arrowBetween(actorPt, center, radius, radius) : undefined,
    };
    strikeFrom = center;
  }

  if (strikeFrom) {
    for (const t of preview.targets) {
      const arrow = arrowBetween(strikeFrom, slotToWorld(t, grid), radius * 0.6, radius);
      if (arrow) shapes.attacks.push(arrow);
    }
  }
  return shapes;
}
