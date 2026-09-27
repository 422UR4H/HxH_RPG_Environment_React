import { useCallback, useEffect, useReducer, useRef } from "react";
import { useMatchWs } from "../../../hooks/useMatchWs";
import type { MatchBoardSync } from "../../../hooks/useMatchWs";
import { loadGhosts, saveGhosts } from "./actionDraft";
import { combatReducer, initialCombatState } from "./combatReducer";
import type { Ghost, PendingSend } from "./combatReducer";
import type { EnqueueActionPayload } from "./combatMessages";

/** Repassado a `onActionEnqueued` (R28): quem mandou, e se era um envio do composer. */
export type ActionEnqueuedMeta = { actorId: string; clearsDraft: boolean };

type Options = {
  matchUuid: string | undefined;
  /** M2: namespace da chave de fantasmas — sem isto duas abas na mesma partida colidem. */
  userUuid: string | undefined;
  token: string;
  isMaster: boolean;
  board?: MatchBoardSync | null;
  /** Chamado quando `action_enqueued` chega, para a página limpar o rascunho do ator certo. */
  onActionEnqueued?: (actionId: string, meta: ActionEnqueuedMeta) => void;
  /**
   * F2: chamado quando o servidor RECUSA um envio do composer (WS_ERROR, sentType
   * "enqueue_action", sobre o mais antigo `pendingSends` com `clearsDraft: true`) — a
   * página deve derrubar só o `move` do rascunho desse ator (destino recusado, o alvo/arma
   * continuam valendo). Nunca chamado para o menu de parede (`clearsDraft: false`).
   */
  onActionRefused?: (actorId: string) => void;
} & Pick<
  Parameters<typeof useMatchWs>[0],
  | "onWallStateChanged" | "onWallHpChanged" | "onMapFullState" | "onVisibilityUpdated"
  | "onWallRevealed" | "onPieceMoved" | "onPieceRemoved"
>;

let localGhostSeq = 0;

/**
 * Liga o socket ao reducer. Todo o estado de combate sai daqui; nenhuma página guarda
 * pedaço dele em useState.
 */
export function useMatchCombat({
  matchUuid, userUuid, token, isMaster, board, onActionEnqueued, onActionRefused, ...mapHandlers
}: Options) {
  const [state, dispatch] = useReducer(
    combatReducer,
    initialCombatState,
    (s) => ({ ...s, ghosts: matchUuid && userUuid ? loadGhosts(matchUuid, userUuid) : {} }),
  );

  const onActionEnqueuedRef = useRef(onActionEnqueued);
  onActionEnqueuedRef.current = onActionEnqueued;
  const onActionRefusedRef = useRef(onActionRefused);
  onActionRefusedRef.current = onActionRefused;

  // R31 (final residual, fixed): `state.pendingSends` is a snapshot of the LAST RENDER —
  // reading `state.pendingSends[0]` from this closure is correct for one ack at a time,
  // but a batch of two `action_enqueued` in the same `act`/microtask (or a WS_ERROR
  // immediately followed by an ack) both fire before React re-renders, so both reads see
  // the same stale head: the second call reports the FIRST send's metadata, not its own.
  // This ref mirrors the reducer's own FIFO synchronously (push/shift happen in the same
  // tick as the socket event, never waiting for a render) — the reducer's own
  // `pendingSends` is untouched and keeps driving the UI (`hasPendingComposerSend` in the
  // pages), only the metadata READ for onActionEnqueued/onActionRefused moves here.
  const pendingSendsRef = useRef<PendingSend[]>([]);

  const ws = useMatchWs({
    matchUuid,
    token,
    isMaster,
    board,
    ...mapHandlers,
    onCombatMessage: (msg) => {
      // R31: shift the ref's own FIFO head, synchronously, in the same tick the message
      // arrived in — not a read of `state` (last render's snapshot).
      const oldestPending =
        msg.type === "action_enqueued" ? pendingSendsRef.current.shift() : undefined;
      // match_full_state is always a fresh register (new socket) — any pendingSend here
      // belongs to a connection whose ack/error can never arrive on this one. Mirrors the
      // reducer's own `match_full_state` case, which resets `pendingSends: []` (Important
      // 2(d)).
      if (msg.type === "match_full_state") pendingSendsRef.current = [];
      dispatch(msg);
      if (msg.type === "action_enqueued" && oldestPending) {
        onActionEnqueuedRef.current?.(msg.payload.actionId, {
          actorId: oldestPending.actorId,
          clearsDraft: oldestPending.clearsDraft,
        });
      }
    },
    onWsError: (e) => {
      // F2/R31: same synchronous shift — a refused enqueue_action pops the ref's oldest
      // entry, and only a composer send (clearsDraft) drops the draft. The wall menu's
      // send (clearsDraft: false) never drops the composer's draft.
      const oldestPending =
        e.sentType === "enqueue_action" ? pendingSendsRef.current.shift() : undefined;
      dispatch({ type: "WS_ERROR", payload: { ...e, at: Date.now() } });
      if (oldestPending?.clearsDraft) {
        onActionRefusedRef.current?.(oldestPending.actorId);
      }
    },
  });

  // Fantasmas confirmados sobrevivem a um refresh (R3, spec §8); os provisórios
  // (chave `local-*`) não têm actionId ainda e não seriam re-casáveis na volta.
  useEffect(() => {
    if (!matchUuid || !userUuid) return;
    saveGhosts(matchUuid, userUuid, state.ghosts);
  }, [matchUuid, userUuid, state.ghosts]);

  const enqueueAction = useCallback(
    (payload: EnqueueActionPayload, options?: { clearsDraft?: boolean }) => {
      // Final review, Important 2(a)/(c): só nasce fantasma/entra em pendingSends quando o
      // envio realmente saiu pelo socket — um Declarar com o socket caído não deve deixar
      // um fantasma órfão que nunca vai ganhar ack nem erro (ActionComposer.canSubmit
      // também desabilita Declarar nesse caso, mas isto é o que garante a invariante).
      const sent = ws.sendEnqueueAction(payload);
      if (!sent) return;
      localGhostSeq += 1;
      // R14: `move.from` agora é opcional (sem actorSlot o composer não o envia); sem
      // origem conhecida não há como desenhar o fantasma from→to.
      const ghost: Ghost | undefined = payload.move?.from
        ? { actorId: payload.actorId, from: payload.move.from, to: payload.move.position }
        : undefined;
      const localId = `local-${localGhostSeq}`;
      const clearsDraft = options?.clearsDraft ?? true;
      // R31: pushed synchronously, right alongside ACTION_SENT — the ref's FIFO order
      // must match the reducer's own `pendingSends` order exactly, and both need to
      // reflect this send before the next one can possibly arrive.
      pendingSendsRef.current.push({ localId, actorId: payload.actorId, clearsDraft });
      dispatch({
        type: "ACTION_SENT",
        payload: {
          localId,
          actorId: payload.actorId,
          // R29/M3: wall actions passam clearsDraft:false explicitamente; o composer não
          // passa `options` e herda o default true.
          clearsDraft,
          ghost,
        },
      });
    },
    [ws],
  );

  return {
    state,
    dispatch,
    status: ws.status,
    send: {
      enqueueAction,
      openNextAction: ws.sendOpenNextAction,
      pullAction: ws.sendPullAction,
      closeTurn: ws.sendCloseTurn,
      changeRoundMode: ws.sendChangeRoundMode,
      masterAction: ws.sendMasterAction,
    },
    dismissError: useCallback(() => dispatch({ type: "ERROR_DISMISSED" }), []),
    dismissCloseTurnDialog: useCallback(
      () => dispatch({ type: "CLOSE_TURN_DIALOG_DISMISSED" }),
      [],
    ),
  };
}
