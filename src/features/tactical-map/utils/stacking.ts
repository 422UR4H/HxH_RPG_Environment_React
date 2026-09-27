import type { Piece } from "../../../types/tacticalMap";
import { isSameSlot } from "./coords";

/** Fração do inradius por ocupante extra. Desenho de protótipo — ver o spec §7.2. */
export const STACK_STEP = 0.18;
const MAX_VISIBLE = 3;

export type StackInfo = { dx: number; dy: number; count: number; index: number };

/**
 * Quando N peças dividem um slot, elas são desenhadas em cascata: cada ocupante extra sai
 * STACK_STEP do inradius para a direita e para baixo, no máximo MAX_VISIBLE visíveis, e a de
 * cima leva o selo ×N. A ordem é estável (por id), e `topPieceId` (a selecionada, ou a do
 * próprio jogador) vai por último — quem precisa mirar precisa ver.
 *
 * Os valores saem em FRAÇÃO do inradius; quem desenha multiplica pelo tamanho real do slot.
 */
export function stackOffsets(pieces: Piece[], topPieceId?: string): Map<string, StackInfo> {
  const out = new Map<string, StackInfo>();
  const seen = new Set<string>();

  for (const p of pieces) {
    if (seen.has(p.id)) continue;
    const group = pieces
      .filter((q) => isSameSlot(q.coord.slot, p.coord.slot))
      .sort((a, b) => {
        if (a.id === topPieceId) return 1;
        if (b.id === topPieceId) return -1;
        return a.id.localeCompare(b.id);
      });
    group.forEach((q, index) => {
      seen.add(q.id);
      const step = Math.min(index, MAX_VISIBLE - 1) * STACK_STEP;
      out.set(q.id, { dx: step, dy: step, count: group.length, index });
    });
  }
  return out;
}
