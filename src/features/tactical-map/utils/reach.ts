import type { GridShape, SlotCoord } from "../../../types/tacticalMap";
import { hexDistance } from "./hex";
import { isSameSlot, isSlotInBounds, slotToLocal, slotToWorld } from "./coords";

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

const SCREEN_DIR = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
} as const;

/**
 * O vizinho da casa que fica mais na direção da seta NA TELA (maior cosseno entre o passo
 * em coordenadas de mundo e a direção, y para baixo). Numa grade girada/achatada, ↑ deixa de
 * ser `row − 1`. Empate: o primeiro de `neighborSlots`. Não filtra limites nem ocupação.
 */
export function neighborTowardScreen(
  slot: SlotCoord,
  grid: GridShape,
  dir: keyof typeof SCREEN_DIR,
): SlotCoord {
  const d = SCREEN_DIR[dir];
  const from = slotToWorld(slot, grid);
  let best = slot;
  let bestCos = -Infinity;
  for (const n of neighborSlots(slot)) {
    const w = slotToWorld(n, grid);
    const vx = w.x - from.x;
    const vy = w.y - from.y;
    const len = Math.hypot(vx, vy);
    if (len === 0) continue;
    const cos = (vx * d.x + vy * d.y) / len;
    if (cos > bestCos + 1e-9) {
      bestCos = cos;
      best = n;
    }
  }
  return best;
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
  isPathClear,
}: {
  actor: SlotCoord;
  target: SlotCoord;
  grid: GridShape;
  isFree: (slot: SlotCoord) => boolean;
  isPathClear?: (from: SlotCoord, to: SlotCoord) => boolean;
}): Approach {
  if (slotDistance(actor, target) <= 1) return { kind: "in_reach" };
  return approachReach({ actor, reach: neighborSlots(target), grid, isFree, isPathClear });
}

/**
 * O caso geral: o alvo é alcançado de qualquer slot de `reach` (o vizinho de uma peça, o slot
 * que encosta numa parede). Já estar num deles é `in_reach`; senão, o livre mais perto do ator.
 * `isPathClear` tira o slot que o servidor recusaria alcançar em linha reta (`move_blocked`) —
 * sem ele, o outro lado da própria parede-alvo seria proposto como "ao lado".
 */
export function approachReach({
  actor,
  reach,
  grid,
  isFree,
  isPathClear,
}: {
  actor: SlotCoord;
  reach: SlotCoord[];
  grid: GridShape;
  isFree: (slot: SlotCoord) => boolean;
  isPathClear?: (from: SlotCoord, to: SlotCoord) => boolean;
}): Approach {
  if (reach.some((s) => isSameSlot(s, actor))) return { kind: "in_reach" };

  const actorPt = slotToLocal(actor, grid);
  const candidates = reach
    .filter((s) => isSlotInBounds(s, grid) && isFree(s) && (isPathClear?.(actor, s) ?? true))
    .map((s) => {
      const p = slotToLocal(s, grid);
      return { s, steps: slotDistance(actor, s), dist: Math.hypot(p.x - actorPt.x, p.y - actorPt.y) };
    })
    .sort((a, b) => a.steps - b.steps || a.dist - b.dist);

  const best = candidates[0];
  return best ? { kind: "approach", slot: best.s } : { kind: "no_room" };
}

/**
 * Passos até alcançar o alvo: até o slot de `reach` mais perto, mais o passo do toque —
 * encostado vale 1, como a peça adjacente. `undefined` sem alcance nenhum.
 */
export function stepsToReach(actor: SlotCoord, reach: SlotCoord[]): number | undefined {
  if (reach.length === 0) return undefined;
  return Math.min(...reach.map((s) => slotDistance(actor, s))) + 1;
}
