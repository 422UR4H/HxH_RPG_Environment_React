import { useCallback, useEffect, useReducer, useRef } from "react";
import { useMatchWs } from "../../../hooks/useMatchWs";
import type { MatchBoardSync } from "../../../hooks/useMatchWs";
import { loadGhosts, saveGhosts } from "./actionDraft";
import { combatReducer, initialCombatState } from "./combatReducer";
import type { Ghost } from "./combatReducer";
import type { EnqueueActionPayload } from "./combatMessages";

type Options = {
  matchUuid: string | undefined;
  token: string;
  isMaster: boolean;
  board?: MatchBoardSync | null;
  /** Chamado quando `action_enqueued` chega, para a página limpar o rascunho do ator. */
  onActionEnqueued?: (actionId: string) => void;
} & Pick<
  Parameters<typeof useMatchWs>[0],
  "onWallStateChanged" | "onWallHpChanged" | "onMapFullState" | "onVisibilityUpdated" | "onWallRevealed"
>;

let localGhostSeq = 0;

/**
 * Liga o socket ao reducer. Todo o estado de combate sai daqui; nenhuma página guarda
 * pedaço dele em useState.
 */
export function useMatchCombat({
  matchUuid, token, isMaster, board, onActionEnqueued, ...mapHandlers
}: Options) {
  const [state, dispatch] = useReducer(
    combatReducer,
    initialCombatState,
    (s) => ({ ...s, ghosts: matchUuid ? loadGhosts(matchUuid) : {} }),
  );

  const onActionEnqueuedRef = useRef(onActionEnqueued);
  onActionEnqueuedRef.current = onActionEnqueued;

  const ws = useMatchWs({
    matchUuid,
    token,
    isMaster,
    board,
    ...mapHandlers,
    onCombatMessage: (msg) => {
      dispatch(msg);
      if (msg.type === "action_enqueued") {
        onActionEnqueuedRef.current?.(msg.payload.actionId);
      }
    },
    onWsError: (e) => dispatch({ type: "WS_ERROR", payload: { ...e, at: Date.now() } }),
  });

  // Fantasmas confirmados sobrevivem a um refresh (R3, spec §8); os provisórios
  // (chave `local-*`) não têm actionId ainda e não seriam re-casáveis na volta.
  useEffect(() => {
    if (!matchUuid) return;
    saveGhosts(matchUuid, state.ghosts);
  }, [matchUuid, state.ghosts]);

  const enqueueAction = useCallback(
    (payload: EnqueueActionPayload) => {
      localGhostSeq += 1;
      // R14: `move.from` agora é opcional (sem actorSlot o composer não o envia); sem
      // origem conhecida não há como desenhar o fantasma from→to.
      const ghost: Ghost | undefined = payload.move?.from
        ? { actorId: payload.actorId, from: payload.move.from, to: payload.move.position }
        : undefined;
      dispatch({
        type: "ACTION_SENT",
        payload: { localId: `local-${localGhostSeq}`, ghost },
      });
      ws.sendEnqueueAction(payload);
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
      wallAction: ws.sendAction,
    },
    dismissError: useCallback(() => dispatch({ type: "ERROR_DISMISSED" }), []),
    dismissCloseTurnDialog: useCallback(
      () => dispatch({ type: "CLOSE_TURN_DIALOG_DISMISSED" }),
      [],
    ),
  };
}
