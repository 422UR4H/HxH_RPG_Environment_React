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

/**
 * Decide se um pointerup solto sem arraste deve virar `onPieceSelect` (Final review,
 * Important 1). Sem `hasLongPress` (lobby/editor de mapa, R19), o tracker nunca é armado
 * — `end()` sempre volta "none" ali — então mantemos o comportamento de sempre selecionar
 * que já existia antes do gesto de segurar nascer.
 *
 * Com `hasLongPress` (jogo), "none" passou a significar algo novo: um press que andou
 * mais que a tolerância de 6px do próprio hold tracker (mas não o suficiente para armar
 * `draggable: false` como arraste de verdade, que só existe quando `draggablePieceIds`
 * permite) cancela o hold e cai em "none". Tratar "none" igual a "click" ali select(v)a a
 * peça por baixo de um pan que só passou de raspão — e um pan começando sobre uma peça já
 * selecionada como alvo (multi-seleção) perdia tudo via replaceTarget. Só "click" (soltar
 * sem nunca ter andado o bastante para cancelar) deve selecionar.
 */
export function shouldSelectOnRelease(outcome: HoldOutcome, hasLongPress: boolean): boolean {
  if (outcome === "hold") return false;
  if (hasLongPress) return outcome === "click";
  return true;
}

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

/**
 * R20 (controller ruling, supersedes the contextmenu part of R5): the right-click
 * shortcut can NOT rely on `contextmenu` firing before `pointerup` — Windows fires
 * it after; Linux/macOS fire it before. `fireNow`/`end()==="hold"` assumed the
 * "before" order and silently degraded to a plain select on Windows.
 *
 * This tracker makes the outcome independent of that order: `press` remembers which
 * piece a right-button pointerdown targeted; `contextmenu` is the ONLY thing that
 * resolves it into a long-press call, whichever of `release`/`contextmenu` the
 * browser delivers first. `release` (the matching pointerup) is intentionally inert
 * — a right-button release must never itself produce a click (see PiecesLayer's
 * handleUp/handleWindowUp, which check `drag.rightClick` directly and return before
 * ever calling `onPieceSelect`).
 */
export function createRightPressTracker() {
  let pendingId: string | null = null;

  return {
    /** Call on EVERY pointerdown (any button) before deciding the branch — a
     * right-press that never gets a matching contextmenu (browser quirk, focus
     * loss, etc.) must not leak its id into a later, unrelated contextmenu event. */
    reset() {
      pendingId = null;
    },
    /** Right-button pointerdown. */
    press(id: string) {
      pendingId = id;
    },
    /** The matching pointerup. Always a no-op outcome — resolution happens in
     * `contextmenu`, never here. */
    release(): "none" {
      return "none";
    },
    /** The native `contextmenu` event. Consumes and clears the pending id so it
     * can't double-fire (e.g. two contextmenu events, or a stale one later). */
    contextmenu(): string | null {
      const id = pendingId;
      pendingId = null;
      return id;
    },
  };
}
