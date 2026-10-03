// Tudo o que as duas telas da partida têm em comum: os dados REST, o mapa ao vivo, o socket
// de combate e o rascunho de ação do ator escolhido. A página decide só o que difere entre
// os papéis — quem é o ator e o que um toque no mapa significa.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useUser from "../../../hooks/useUser";
import { useMatchMap } from "../../../hooks/useMatchMap";
import { useMap } from "../../../hooks/useMap";
import { useMatchParticipants } from "../../../hooks/useMatchParticipants";
import { useCampaignDetails } from "../../../hooks/useCampaignDetails";
import { isSameSlot, slotToTriple, tripleToSlot } from "../../tactical-map/utils/coords";
import type { SlotTriple } from "../../tactical-map/utils/coords";
import type { QueuedAction } from "./combatMessages";
import { useLiveMapSync } from "./useLiveMapSync";
import { useMatchCombat } from "./useMatchCombat";
import { useMatchHistory } from "../../../hooks/useMatchHistory";
import { useActionComposerState } from "./useActionComposerState";
import { defaultMoveCategory } from "./defaultMoveCategory";
import { pendingMoves, resolveLostCandidates } from "./combatReducer";
import type { DeclaredAction, DeclaredSource } from "./combatReducer";
import { draftFromDeclared } from "./actionDraft";

/** O destino do `move` de uma ação da fila, quando há um — `undefined` se a ação não move. */
function queuedMoveTo(q: QueuedAction): SlotTriple | undefined {
  return q.action?.move?.position;
}

export function useGameTable({
  token,
  campaignId,
  matchId,
  declaredSource,
  actorId,
}: {
  token: string;
  campaignId?: string;
  matchId?: string;
  /** Contra o que as declaradas se reconciliam na reconexão (B12) — ver `useMatchCombat`. */
  declaredSource: DeclaredSource;
  actorId: string | undefined;
}) {
  const { user } = useUser();
  const { data: matchMap, isPending: matchMapPending } = useMatchMap(token, matchId);
  const { data: map, isPending: mapPending } = useMap(token, matchMap?.mapUuid);
  const { data: participants = [], isSuccess: participantsLoaded } = useMatchParticipants(token, matchId, true);
  const { data: campaign } = useCampaignDetails(token, campaignId);

  const queryClient = useQueryClient();
  const refetchParticipants = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["matchParticipants", token, matchId] }),
    [queryClient, token, matchId],
  );

  // O tabuleiro (peças, paredes, fog) é do servidor, para os dois papéis (F13): do REST vem
  // só o mapa em si — fundo e grade. As peças do mapa da campanha não são as da partida.
  const live = useLiveMapSync({ map, campaign });
  // Peças só do servidor — é também o que mantém fora da vista do jogador as peças que o fog esconde.
  const boardPieces = live.livePieces ?? [];

  // O ack de um envio precisa limpar o rascunho, que só existe depois do socket: um ref
  // quebra o ciclo, atribuído no corpo do render antes de qualquer ack poder chegar.
  const clearDraftForRef = useRef<(actorId: string) => void>(() => {});
  const invalidateHistory = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["matchHistory", token, matchId] }),
    [queryClient, token, matchId],
  );
  // Peça e parede mexidas ENTRE turnos são master actions já gravadas — e o jogador não recebe
  // `master_action_enqueued` de peça, nem ninguém o de parede: o tabuleiro é o único aviso.
  // Com turno aberto nada é gravado até o fechamento (o turn_closed rebusca). O ref espelha o
  // último render: o piece_moved da abertura chega antes do turn_opened e rebusca à toa — inofensivo.
  const openTurnRef = useRef(false);
  const onBoardChange = useCallback(() => {
    if (!openTurnRef.current) void invalidateHistory();
  }, [invalidateHistory]);
  const combat = useMatchCombat({
    matchUuid: matchId,
    userUuid: user?.uuid,
    token,
    declaredSource,
    onWallStateChanged: (...a) => { live.handleWallStateChanged(...a); onBoardChange(); },
    onWallHpChanged: live.handleWallHpChanged,
    onMapFullState: live.handleMapFullState,
    onVisibilityUpdated: live.handleVisibilityUpdated,
    onWallRevealed: (...a) => { live.handleWallRevealed(...a); onBoardChange(); },
    onPieceMoved: (...a) => { live.handlePieceMoved(...a); onBoardChange(); },
    onPieceRemoved: (...a) => { live.handlePieceRemoved(...a); onBoardChange(); },
    onComposerSendAccepted: (a) => clearDraftForRef.current(a),
    onHistoryChanged: invalidateHistory,
    onNpcAdded: () => { void refetchParticipants(); },
    // Toda (re)conexão: o que mudou enquanto a conexão estava caída só volta pelo REST.
    onFullState: () => {
      void refetchParticipants();
      void invalidateHistory();
      void queryClient.invalidateQueries({ queryKey: ["characterSheet", token] });
    },
  });
  const { state } = combat;
  openTurnRef.current = state.openTurn !== null;

  const composer = useActionComposerState({
    matchId,
    actorId,
    boardPieces,
    grid: map?.grid,
    defaultCategory: defaultMoveCategory(state),
  });
  clearDraftForRef.current = composer.clearDraftFor;
  const { pieceByCharacter } = composer;

  // ─── Declaradas que o servidor não conhecia (F10/B12) ──────────────────────
  // Uma candidata só vira perda depois do histórico buscado DEPOIS do match_full_state (o
  // `onFullState` acima o invalida): se ela abriu e fechou durante a queda, está lá, e
  // dizer "declare de novo" seria pedir uma re-rolagem. A perdida de verdade devolve o
  // rascunho — várias do mesmo ator, a mais recente; uma só de parede (sem move nem ataque)
  // não tem rascunho. O ref garante uma vez por id. Daqui NÃO sai envio nenhum (I7).
  const { data: historyData } = useMatchHistory(token, matchId);
  const decidedLostIds = useRef(new Set<string>());
  const { restoreDraftFor } = composer;
  const { resolveLostCandidates: resolveLost } = combat;
  useEffect(() => {
    const pending = state.lostCandidates.filter((d) => !decidedLostIds.current.has(d.id));
    const decision = resolveLostCandidates(pending, historyData);
    if (!decision) return;
    [...decision.ran, ...decision.lost].forEach((id) => decidedLostIds.current.add(id));
    const lostIds = new Set(decision.lost);
    const latestByActor = new Map<string, DeclaredAction>();
    for (const d of pending) {
      if (!lostIds.has(d.id) || (!d.move && !d.attack)) continue;
      const prev = latestByActor.get(d.actorId);
      if (!prev || d.at > prev.at) latestByActor.set(d.actorId, d);
    }
    const restored: string[] = [];
    latestByActor.forEach((d, actor) => {
      if (restoreDraftFor(actor, draftFromDeclared(d))) restored.push(d.id);
    });
    resolveLost({ ...decision, restored });
  }, [state.lostCandidates, historyData, restoreDraftFor, resolveLost]);

  // ─── Movimentos declarados ainda por acontecer (o fantasma) ───────────────
  // A seta sai de onde a peça ESTÁ, não de onde estava ao declarar: se outra ação do mesmo
  // ator a moveu antes, o pedido continua valendo e o servidor aplica o destino pedido.
  // A peça que já chegou ao destino cumpriu o pedido — inclusive quando o `turn_opened`
  // daquela ação se perdeu numa queda de conexão.
  const moves = pendingMoves(state.declared);
  const arrivedIds = moves
    .filter((d) => d.status === "queued")
    .filter((d) => {
      const piece = pieceByCharacter.get(d.actorId);
      return !!piece && !!map && isSameSlot(piece.coord.slot, tripleToSlot(d.move.to, map.grid.kind));
    })
    .map((d) => d.id);
  const arrivedKey = arrivedIds.join(",");
  const { dismissDeclared } = combat;
  useEffect(() => {
    if (arrivedKey) dismissDeclared(arrivedKey.split(","));
  }, [arrivedKey, dismissDeclared]);

  // T13/F1: o fantasma do MESTRE — toda ação na fila com `move` vira um fantasma extra,
  // excluindo o que o próprio navegador já declarou (já coberto por `moves`/`ownGhosts`
  // acima: um NPC que o mestre declara chega a `state.queue` E a `state.declared` com o
  // MESMO actionId, e contá-lo duas vezes desenharia dois fantasmas sobre a mesma peça).
  // Some no `turn_opened` porque a fila já tira a ação de `state.queue` ali.
  const ghosts = useMemo<Array<{ from?: SlotTriple; to: SlotTriple }>>(() => {
    const ownGhosts = moves
      .filter((d) => !arrivedIds.includes(d.id))
      .map((d) => {
        const piece = pieceByCharacter.get(d.actorId);
        return {
          from: piece ? slotToTriple(piece.coord.slot, piece.coord.z) : d.move.from,
          to: d.move.to,
        };
      });
    const declaredIds = new Set(state.declared.map((d) => d.id));
    const queueGhosts = state.queue
      .filter((q) => queuedMoveTo(q) !== undefined && !declaredIds.has(q.actionId))
      .map((q) => {
        const piece = pieceByCharacter.get(q.actorId);
        return {
          from: piece ? slotToTriple(piece.coord.slot, piece.coord.z) : q.action?.move?.from,
          to: queuedMoveTo(q)!,
        };
      });
    return [...ownGhosts, ...queueGhosts];
    // `moves`/`arrivedIds` are rebuilt every render; their content is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.declared, state.queue, pieceByCharacter, arrivedKey]);

  const nameOf = useCallback(
    (id: string) => {
      const p = participants.find((x) => x.characterSheet.uuid === id);
      if (p) return p.characterSheet.nickName;
      return live.npcMap.get(id)?.nickName ?? "?";
    },
    [participants, live.npcMap],
  );

  const sendingForActor = !!actorId && state.declared.some(
    (d) => d.status === "sending" && d.actorId === actorId && d.fromComposer,
  );
  const canDeclare = combat.status === "connected" && !sendingForActor;
  const blockedReason =
    combat.status !== "connected"
      ? "Sem conexão com a mesa — a ação não pode ser enviada agora."
      : sendingForActor
        ? "Enviando a ação anterior…"
        : undefined;

  const declare = useCallback(() => {
    if (composer.payload) combat.send.enqueueAction(composer.payload);
  }, [composer.payload, combat.send]);

  // Enquadra o mapa ao montar e sempre que alguém pedir.
  const [fitRequest, setFitRequest] = useState(1);
  const refit = useCallback(() => setFitRequest((n) => n + 1), []);

  const openTurnPieceId = state.openTurn ? pieceByCharacter.get(state.openTurn.actorId)?.id : undefined;

  return {
    user,
    map,
    isLoading: matchMapPending || (!!matchMap && mapPending),
    participants,
    participantsLoaded,
    refetchParticipants,
    campaign,
    live,
    boardPieces,
    combat,
    composer,
    ghosts,
    nameOf,
    canDeclare,
    blockedReason,
    declare,
    fitRequest,
    refit,
    openTurnPieceId,
  };
}
