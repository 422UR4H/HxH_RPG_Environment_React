import type { GridShape, SlotCoord } from "../../../types/tacticalMap";
import { hexDistance } from "./hex";
import { isSameSlot, isSlotInBounds, slotToWorld } from "./coords";

/**
 * Distância em passos de slot. Quadrado conta a diagonal como um passo (Chebyshev) — é a
 * mesma vizinhança de 8 que `neighborSlots` devolve; hex é a distância axial.
 */
export function slotDistance(a: SlotCoord, b: SlotCoord): number {
  if (a.kind === "square" && b.kind === "square") {
    return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));
  }
  if (a.kind === "hex" && b.kind === "hex") return hexDistance(a, b);
  return Number.POSITIVE_INFINITY;
}

const SQUARE_STEPS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0],           [1, 0],
  [-1, 1],  [0, 1],  [1, 1],
] as const;

const HEX_STEPS = [
  [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
] as const;

/** Os slots a um passo — 8 no quadrado, 6 no hex. Não filtra limites do mapa. */
export function neighborSlots(slot: SlotCoord): SlotCoord[] {
  if (slot.kind === "square") {
    return SQUARE_STEPS.map(([dc, dr]) => ({ kind: "square", col: slot.col + dc, row: slot.row + dr }));
  }
  return HEX_STEPS.map(([dq, dr]) => ({ kind: "hex", q: slot.q + dq, r: slot.r + dr }));
}

export type Approach =
  | { kind: "in_reach" }
  | { kind: "approach"; slot: SlotCoord }
  | { kind: "no_room" };

/**
 * Para onde o ator anda para ficar ao lado do alvo — a PROPOSTA que o compositor de ação
 * pré-preenche quando o alvo está longe, nunca uma posição calculada no lugar do servidor:
 * o jogador vê o destino destacado, pode trocá-lo ou desligar o movimento, e a peça só sai
 * do lugar quando o `piece_moved` do servidor chegar.
 *
 * Escolhe, entre os vizinhos livres do alvo dentro do mapa, o mais perto do ator (em
 * passos, depois em distância real entre centros, para desempatar a diagonal).
 * `isFree` decide ocupação — quem chama sabe quais peças contam.
 */
export function approachSlot({
  actor,
  target,
  grid,
  isFree,
}: {
  actor: SlotCoord;
  target: SlotCoord;
  grid: GridShape;
  isFree: (slot: SlotCoord) => boolean;
}): Approach {
  if (slotDistance(actor, target) <= 1) return { kind: "in_reach" };

  const actorPt = slotToWorld(actor, grid);
  const candidates = neighborSlots(target)
    .filter((s) => isSlotInBounds(s, grid) && (isSameSlot(s, actor) || isFree(s)))
    .map((s) => {
      const p = slotToWorld(s, grid);
      return { s, steps: slotDistance(actor, s), dist: Math.hypot(p.x - actorPt.x, p.y - actorPt.y) };
    })
    .sort((a, b) => a.steps - b.steps || a.dist - b.dist);

  const best = candidates[0];
  return best ? { kind: "approach", slot: best.s } : { kind: "no_room" };
}
