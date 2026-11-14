/**
 * Reconhecedor do arrastar-do-card (card da aba Personagens → mapa). Puro e fora do React,
 * em closure, como `createTapTracker`/`createHoldTracker`: o hook só liga os eventos.
 *
 * - mouse/caneta: andar mais que a tolerância com o botão primário apertado começa o arraste;
 *   soltar sem isso continua sendo clique (abre a ficha).
 * - toque: só começa depois de segurar `HOLD_MS` sem andar mais que a tolerância; andar antes
 *   é rolar a lista, e o gesto é abandonado.
 */
import { TAP_TOLERANCE_PX } from "../tactical-map/hooks/tapGesture";
import { HOLD_MS } from "../tactical-map/hooks/useHoldGesture";

export type CardDragPointer = {
  pointerId: number;
  clientX: number;
  clientY: number;
  button?: number;
  pointerType?: string;
};

export type CardDragPoint = { x: number; y: number };

export function createCardDragTracker({
  onStart,
  tolerance = TAP_TOLERANCE_PX,
  holdMs = HOLD_MS,
}: {
  /** O arraste começou; `point` é onde o ponteiro está nesse instante. */
  onStart: (point: CardDragPoint, pointerType: string) => void;
  tolerance?: number;
  holdMs?: number;
}) {
  let origin: { pointerId: number; x: number; y: number; touch: boolean } | null = null;
  let last: CardDragPoint = { x: 0, y: 0 };
  let timer: ReturnType<typeof setTimeout> | null = null;
  let started = false;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const start = () => {
    if (!origin || started) return;
    started = true;
    clearTimer();
    onStart(last, origin.touch ? "touch" : "mouse");
  };

  return {
    /** pointerdown. Só o botão primário arma; um segundo ponteiro (multitoque) desarma. */
    down(e: CardDragPointer) {
      clearTimer();
      started = false;
      if (origin && origin.pointerId !== e.pointerId) {
        origin = null;
        return;
      }
      if (e.button !== undefined && e.button !== 0) {
        origin = null;
        return;
      }
      const touch = e.pointerType === "touch";
      origin = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, touch };
      last = { x: e.clientX, y: e.clientY };
      if (touch) timer = setTimeout(start, holdMs);
    },
    move(e: CardDragPointer) {
      if (!origin || e.pointerId !== origin.pointerId) return;
      last = { x: e.clientX, y: e.clientY };
      if (started) return;
      if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) <= tolerance) return;
      if (origin.touch) {
        // Andou antes de segurar o bastante: é rolagem da lista.
        clearTimer();
        origin = null;
      } else {
        start();
      }
    },
    /** pointerup/pointercancel. Devolve se o arraste chegou a começar. Sempre desarma. */
    end(): boolean {
      const wasStarted = started;
      clearTimer();
      origin = null;
      started = false;
      return wasStarted;
    },
    /** O arraste começou (e ainda não terminou)? */
    isStarted: () => started,
  };
}
