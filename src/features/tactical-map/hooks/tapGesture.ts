/**
 * Toque × arraste do mapa — a única fronteira. Quem precisa distinguir "clicou" de
 * "arrastou o mapa" (caixa da parede, slot vazio) usa este reconhecedor em vez de comparar
 * início × fim por conta própria: comparar só as pontas deixa passar o arraste que volta ao
 * ponto de partida antes de soltar. O hold da peça (`useHoldGesture`) não o usa — só divide
 * com ele a constante de tolerância.
 *
 * Fora do React, em closure, como `createHoldTracker`.
 */

/** Distância máxima (px de tela) que o ponteiro pode andar e o gesto ainda ser toque. */
export const TAP_TOLERANCE_PX = 6;

export type TapPointer = { pointerId: number; clientX: number; clientY: number; button?: number };

export function createTapTracker(tolerance: number = TAP_TOLERANCE_PX) {
  let origin: { pointerId: number; x: number; y: number } | null = null;

  return {
    /**
     * pointerdown. Só o botão primário (button 0 ou ausente) arma. Rearma se já armado com o
     * mesmo ponteiro; um segundo ponteiro (multitoque, pinça) desarma — nunca é toque.
     */
    down(e: TapPointer) {
      if (origin && origin.pointerId !== e.pointerId) {
        origin = null;
        return;
      }
      origin = e.button === undefined || e.button === 0
        ? { pointerId: e.pointerId, x: e.clientX, y: e.clientY }
        : null;
    },
    /** pointermove. Andou mais que a tolerância desde a origem → desarma (virou arraste). */
    move(e: TapPointer) {
      if (!origin || e.pointerId !== origin.pointerId) return;
      if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > tolerance) origin = null;
    },
    /** pointerup. true = foi toque (mesmo pointerId, nunca passou da tolerância). Sempre desarma. */
    up(e: TapPointer): boolean {
      const o = origin;
      origin = null;
      if (!o || o.pointerId !== e.pointerId) return false;
      return Math.hypot(e.clientX - o.x, e.clientY - o.y) <= tolerance;
    },
    /** pointercancel / desmontagem. */
    cancel() {
      origin = null;
    },
  };
}
