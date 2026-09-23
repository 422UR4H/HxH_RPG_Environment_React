/**
 * O gesto de segurar da partida — um só, para mouse, toque e caneta (Pointer Events).
 * Segurar sobre a peça marca alvos (Fase 6); segurar sobre o botão de reação abre a
 * configuração (Fase 7). NÃO invente um segundo mecanismo lá.
 *
 * Fica fora do React de propósito: o PiecesLayer o dirige imperativamente dentro do mesmo
 * par pointerdown/pointerup que já discrimina clique de arraste.
 */
export const HOLD_MS = 450;
const MOVE_TOLERANCE_PX = 6;

export type HoldOutcome = "hold" | "click" | "none";

export function createHoldTracker({
  onHold,
  holdMs = HOLD_MS,
  moveTolerance = MOVE_TOLERANCE_PX,
}: {
  onHold: (id: string) => void;
  holdMs?: number;
  moveTolerance?: number;
}) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let origin: { id: string; x: number; y: number } | null = null;
  let fired = false;

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return {
    start(id: string, x: number, y: number) {
      clear();
      origin = { id, x, y };
      fired = false;
      timer = setTimeout(() => {
        fired = true;
        timer = null;
        onHold(id);
      }, holdMs);
    },
    move(x: number, y: number) {
      if (!origin || fired) return;
      if (Math.hypot(x - origin.x, y - origin.y) > moveTolerance) {
        clear();
        origin = null;
      }
    },
    /**
     * Atalho de botão direito (R5, ruling do controlador): dispara o hold agora, sem
     * esperar o timer, e deixa o rastreador no mesmo estado de "já disparou" que o
     * disparo por tempo deixaria — o pointerup seguinte vê `end() === "hold"` e não
     * duplica em `onPieceSelect`. Sem isso um único clique direito adicionaria um alvo
     * (hold) E substituiria a seleção (clique).
     */
    fireNow(id: string) {
      clear();
      fired = true;
      onHold(id);
    },
    /** "hold" = já disparou (o clique seguinte deve ser suprimido). */
    end(): HoldOutcome {
      const had = !!origin;
      clear();
      origin = null;
      if (fired) { fired = false; return "hold"; }
      return had ? "click" : "none";
    },
    cancel() {
      clear();
      origin = null;
      fired = false;
    },
  };
}
