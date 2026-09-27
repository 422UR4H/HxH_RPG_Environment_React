import { useCallback, useEffect, useReducer, useRef } from "react";
import { useMatchWs } from "../../../hooks/useMatchWs";
import type { MatchBoardSync } from "../../../hooks/useMatchWs";
import { combatReducer, initialCombatState } from "./combatReducer";
import type { CombatAction, DeclaredAction } from "./combatReducer";
import { loadDeclared, saveDeclared } from "./declaredStorage";
import type { EnqueueActionPayload, MasterActionPayload } from "./combatMessages";

type Options = {
  matchUuid: string | undefined;
  /** Separa as ações declaradas por usuário no `localStorage`. */
  userUuid: string | undefined;
  token: string;
  isMaster: boolean;
  board?: MatchBoardSync | null;
  /** O servidor aceitou um envio do compositor: a página limpa o rascunho DAQUELE ator. */
  onComposerSendAccepted?: (actorId: string) => void;
  /** O WS avisa, o REST busca: a página (useGameTable) invalida as queries. */
  onTurnClosed?: () => void;
  onFullState?: () => void;
  onNpcAdded?: (characterId: string) => void;
} & Pick<
  Parameters<typeof useMatchWs>[0],
  | "onWallStateChanged" | "onWallHpChanged" | "onMapFullState" | "onVisibilityUpdated"
  | "onWallRevealed" | "onPieceMoved" | "onPieceRemoved"
>;

type SendOptions = {
  /** `false` para o menu de parede: o ack dele não pode limpar o rascunho do compositor. */
  fromComposer?: boolean;
};

let localSeq = 0;

/**
 * Liga o socket ao reducer. Todo o estado de combate sai daqui; nenhuma página guarda
 * pedaço dele em useState.
 */
export function useMatchCombat({
  matchUuid, userUuid, token, isMaster, board, onComposerSendAccepted,
  onTurnClosed, onFullState, onNpcAdded, ...mapHandlers
}: Options) {
  const [state, dispatch] = useReducer(
    combatReducer,
    initialCombatState,
    (s) => ({ ...s, declared: matchUuid && userUuid ? loadDeclared(matchUuid, userUuid) : [] }),
  );

  const onAcceptedRef = useRef(onComposerSendAccepted);
  onAcceptedRef.current = onComposerSendAccepted;
  const onTurnClosedRef = useRef(onTurnClosed);
  onTurnClosedRef.current = onTurnClosed;
  const onFullStateRef = useRef(onFullState);
  onFullStateRef.current = onFullState;
  const onNpcAddedRef = useRef(onNpcAdded);
  onNpcAddedRef.current = onNpcAdded;

  // Espelho SÍNCRONO dos envios ainda sem ack, na ordem de envio. O reducer tem a mesma fila
  // (`declared` com status `sending`), mas o `state` que esta closure enxerga é o do último
  // render: dois acks no mesmo tick leriam a mesma cabeça. O ref anda junto com o socket.
  const unackedRef = useRef<Array<{ actorId: string; fromComposer: boolean }>>([]);

  const ws = useMatchWs({
    matchUuid,
    token,
    isMaster,
    board,
    ...mapHandlers,
    onCombatMessage: (msg, serverAt) => {
      if (msg.type === "match_full_state") unackedRef.current = [];
      const acked = msg.type === "action_enqueued" ? unackedRef.current.shift() : undefined;
      dispatch({ ...msg, at: serverAt, receivedAt: Date.now() } as CombatAction);
      if (acked?.fromComposer) onAcceptedRef.current?.(acked.actorId);
      if (msg.type === "turn_closed") onTurnClosedRef.current?.();
      if (msg.type === "match_full_state") onFullStateRef.current?.();
    },
    onNpcAdded: (id) => onNpcAddedRef.current?.(id),
    onWsError: (e) => {
      if (e.sentType === "enqueue_action") unackedRef.current.shift();
      dispatch({ type: "WS_ERROR", payload: { ...e, at: Date.now() } });
    },
  });

  useEffect(() => {
    if (!matchUuid || !userUuid) return;
    saveDeclared(matchUuid, userUuid, state.declared);
  }, [matchUuid, userUuid, state.declared]);

  const enqueueAction = useCallback(
    (payload: EnqueueActionPayload, options?: SendOptions): boolean => {
      // Só nasce a entrada (e o fantasma) quando o envio saiu de verdade: com o socket caído
      // ela nunca ganharia ack nem erro.
      if (!ws.sendEnqueueAction(payload)) return false;
      const fromComposer = options?.fromComposer ?? true;
      localSeq += 1;
      const declared: DeclaredAction = {
        id: `local-${localSeq}`,
        actorId: payload.actorId,
        status: "sending",
        fromComposer,
        at: Date.now(),
        ...(payload.move
          ? { move: { category: payload.move.category, from: payload.move.from, to: payload.move.position } }
          : {}),
        ...(payload.attack ? { attack: { targets: payload.targetId ?? [], weapon: payload.attack.weapon } } : {}),
        ...(payload.interact ? { interact: { kind: payload.interact.kind, targets: payload.targetId ?? [] } } : {}),
      };
      unackedRef.current.push({ actorId: payload.actorId, fromComposer });
      dispatch({ type: "ACTION_SENT", payload: declared });
      return true;
    },
    [ws],
  );

  const masterAction = useCallback(
    (payload: MasterActionPayload) => ws.sendMasterAction(payload),
    [ws],
  );

  return {
    state,
    status: ws.status,
    reconnect: ws.reconnect,
    send: {
      enqueueAction,
      openNextAction: ws.sendOpenNextAction,
      pullAction: ws.sendPullAction,
      closeTurn: ws.sendCloseTurn,
      changeRoundMode: ws.sendChangeRoundMode,
      masterAction,
      addNpc: ws.sendAddNpc,
      changeScene: ws.sendChangeScene,
    },
    dismissError: useCallback(() => dispatch({ type: "ERROR_DISMISSED" }), []),
    dismissCloseTurnDialog: useCallback(() => dispatch({ type: "CLOSE_TURN_DIALOG_DISMISSED" }), []),
    dismissDeclared: useCallback(
      (ids: string[]) => { if (ids.length) dispatch({ type: "DECLARED_DISMISSED", payload: { ids } }); },
      [],
    ),
  };
}
