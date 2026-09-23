import { useCallback, useEffect, useReducer, useRef } from "react";
import { useMatchWs } from "../../../hooks/useMatchWs";
import type { MatchBoardSync } from "../../../hooks/useMatchWs";
import { loadGhosts, saveGhosts } from "./actionDraft";
import { combatReducer, initialCombatState } from "./combatReducer";
import type { Ghost } from "./combatReducer";
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

  const ws = useMatchWs({
    matchUuid,
    token,
    isMaster,
    board,
    ...mapHandlers,
    onCombatMessage: (msg) => {
      // Final review, Important 2/M3 (R28): lê a metadata do envio mais antigo ANTES do
      // dispatch — `state` aqui é a foto do último render, exatamente o pendingSends que
      // este action_enqueued está prestes a consumir (só uma mensagem por vez passa por
      // este handler, então nada mais pode ter mexido nele entre o último render e agora).
      const oldestPending = msg.type === "action_enqueued" ? state.pendingSends[0] : undefined;
      dispatch(msg);
      if (msg.type === "action_enqueued" && oldestPending) {
        onActionEnqueuedRef.current?.(msg.payload.actionId, {
          actorId: oldestPending.actorId,
          clearsDraft: oldestPending.clearsDraft,
        });
      }
    },
    onWsError: (e) => {
      // F2: same FIFO read as onCombatMessage above — capture the oldest pendingSend
      // BEFORE dispatch (the reducer's own WS_ERROR case pops it), and only for a
      // refused enqueue_action whose oldest entry is the composer's own (clearsDraft).
      // The wall menu's send (clearsDraft: false) never drops the composer's draft.
      const oldestPending =
        e.sentType === "enqueue_action" ? state.pendingSends[0] : undefined;
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
      dispatch({
        type: "ACTION_SENT",
        payload: {
          localId: `local-${localGhostSeq}`,
          actorId: payload.actorId,
          // R29/M3: wall actions passam clearsDraft:false explicitamente; o composer não
          // passa `options` e herda o default true.
          clearsDraft: options?.clearsDraft ?? true,
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
