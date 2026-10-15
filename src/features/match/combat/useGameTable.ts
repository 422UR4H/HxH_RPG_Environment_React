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
import { tableMap } from "./tableMap";
import { useLiveMapSync } from "./useLiveMapSync";
import { useMatchCombat } from "./useMatchCombat";
import { useMatchHistory } from "../../../hooks/useMatchHistory";
import { useCombatCatalogue } from "../../../hooks/useCombatCatalogue";
import { defaultWeaponOf, draftFromDeclared } from "./actionDraft";
import { useActionComposerState } from "./useActionComposerState";
import { defaultMoveCategory } from "./defaultMoveCategory";
import { pendingMoves, resolveLostCandidates } from "./combatReducer";
import type { DeclaredAction, DeclaredSource } from "./combatReducer";
import { createViewportStore } from "./viewportStore";
import { wallName } from "./wallVerbs";
import { actionMechanicsText, actorResultText, reactionMechanicsText, targetResultText } from "./balloonText";
import type { BalloonTone } from "./balloonText";

export type TableBalloon = { characterId: string; text: string; tone: BalloonTone };

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
  const { data: restMap } = useMap(token, matchMap?.mapUuid);
  const { data: participants = [], isSuccess: participantsLoaded } = useMatchParticipants(token, matchId, true);
  const { data: campaign } = useCampaignDetails(token, campaignId);

  const queryClient = useQueryClient();
  const refetchParticipants = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["matchParticipants", token, matchId] }),
    [queryClient, token, matchId],
  );

  // O tabuleiro (grade, fundo, peças, paredes, fog) é do servidor, para os dois papéis (F13):
  // do REST vem só o que não é geometria (o nome). Nada do mapa da campanha é desenhado.
  const live = useLiveMapSync({ campaign });
  const { boardGrid, boardBg } = live;
  // `undefined` até o primeiro `map_full_state` com grade — a mesa espera em vez de desenhar
  // o mapa da campanha. `boardPending` separa isso de "nenhum mapa anexado" (sem `mapUuid` no `useMatchMap`).
  // O tabuleiro que chegou sempre desenha, mesmo que o REST do mapa tenha falhado: "há mapa
  // anexado" vem do `useMatchMap` (`mapUuid`), não do `useMap`.
  const attachedMapId = matchMap?.mapUuid;
  const map = useMemo(
    () => tableMap(restMap, boardGrid, boardBg, attachedMapId),
    [restMap, boardGrid, boardBg, attachedMapId],
  );
  const boardPending = !!attachedMapId && !map;
  // `board_unavailable`: a sala não carregou o tabuleiro. Vale até o próximo `map_full_state`.
  const [boardUnavailable, setBoardUnavailable] = useState(false);
  const { handleMapFullState } = live;
  const onMapFullState = useCallback(
    (s: Parameters<typeof handleMapFullState>[0]) => {
      setBoardUnavailable(false);
      handleMapFullState(s);
    },
    [handleMapFullState],
  );
  const onBoardUnavailable = useCallback(() => setBoardUnavailable(true), []);
  // Peças só do servidor — é também o que mantém fora da vista do jogador as peças que o fog esconde.
  const boardPieces = live.livePieces ?? [];

  // O ack de um envio precisa limpar o rascunho, que só existe depois do socket: um ref
  // quebra o ciclo, atribuído no corpo do render antes de qualquer ack poder chegar.
  const clearDraftForRef = useRef<(actorId: string) => void>(() => {});
  const invalidateHistory = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["matchHistory", token, matchId] }),
    [queryClient, token, matchId],
  );
  // Peça e parede mexidas ENTRE turnos são master actions: o histórico rebusca no
  // `master_action_recorded` (useMatchCombat), que sai depois da gravação. A notícia do
  // tabuleiro sai antes dela — rebuscar ali voltava sem a ação.

  // Conta os `match_full_state`: a página zera por ele o que não sobrevive a uma reconexão
  // (a confirmação pendente do Arrumar, F12).
  const [fullStateSeq, setFullStateSeq] = useState(0);
  const combat = useMatchCombat({
    matchUuid: matchId,
    userUuid: user?.uuid,
    token,
    declaredSource,
    onWallStateChanged: live.handleWallStateChanged,
    onWallHpChanged: live.handleWallHpChanged,
    onMapFullState,
    onBoardUnavailable,
    onVisibilityUpdated: live.handleVisibilityUpdated,
    onWallRevealed: live.handleWallRevealed,
    onPieceMoved: live.handlePieceMoved,
    onPieceRemoved: live.handlePieceRemoved,
    onComposerSendAccepted: (a) => clearDraftForRef.current(a),
    onHistoryChanged: invalidateHistory,
    onNpcAdded: () => { void refetchParticipants(); },
    // Toda (re)conexão: o que mudou enquanto a conexão estava caída só volta pelo REST.
    onFullState: () => {
      setFullStateSeq((n) => n + 1);
      void refetchParticipants();
      void invalidateHistory();
      void queryClient.invalidateQueries({ queryKey: ["characterSheet", token] });
    },
  });
  const { state } = combat;

  // A mesma query das páginas (React Query reaproveita): daqui sai a arma padrão do ataque.
  const { data: catalogue } = useCombatCatalogue(token, actorId);
  const composer = useActionComposerState({
    matchId,
    actorId,
    boardPieces,
    walls: live.liveWalls,
    grid: map?.grid,
    defaultCategory: defaultMoveCategory(state),
    defaultWeapon: defaultWeaponOf(catalogue?.weapons.map((w) => w.name) ?? []),
  });
  clearDraftForRef.current = composer.clearDraftFor;
  const { pieceByCharacter } = composer;

  // ─── Declaradas que o servidor não conhecia (F10/B12) ──────────────────────
  // Uma candidata só vira perda depois do histórico buscado DEPOIS do match_full_state (o
  // `onFullState` acima o invalida): se ela abriu e fechou durante a queda, está lá, e
  // dizer "declare de novo" seria pedir uma re-rolagem. A perdida de verdade devolve o
  // rascunho — várias do mesmo ator, a mais recente (inclusive a de parede: abrir, fechar,
  // arrombar). O ref garante uma vez por id. Daqui NÃO sai envio nenhum (I7).
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
      if (!lostIds.has(d.id) || (!d.move && !d.attack && !d.interact)) continue;
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
    // §10.2: a fuga aberta tem o mesmo desenho do fantasma de intenção, só a vida é outra —
    // vive entre a abertura da reação e o fechamento do turno (o reducer zera `openReactions`).
    // Sem `position` (fog) não há para onde apontar.
    const reactionGhosts = state.openReactions
      .filter((r) => r.move?.position)
      .map((r) => {
        const piece = pieceByCharacter.get(r.actorId);
        return {
          from: piece ? slotToTriple(piece.coord.slot, piece.coord.z) : r.move?.from,
          to: r.move!.position!,
        };
      });
    return [...ownGhosts, ...queueGhosts, ...reactionGhosts];
    // `moves`/`arrivedIds` are rebuilt every render; their content is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.declared, state.queue, state.openReactions, pieceByCharacter, arrivedKey]);

  // Personagens e paredes: uma parede é alvo como uma peça, e a fila, o histórico, as
  // declaradas e os balões a nomeiam pelo tipo e material ("Porta de madeira").
  const nameOf = useCallback(
    (id: string) => {
      const p = participants.find((x) => x.characterSheet.uuid === id);
      if (p) return p.characterSheet.nickName;
      const npc = live.npcMap.get(id)?.nickName;
      if (npc) return npc;
      const wall = live.liveWalls.find((w) => w.id === id);
      return wall ? wallName(wall) : "?";
    },
    [participants, live.npcMap, live.liveWalls],
  );

  // ─── Balões (spec §4.9) ────────────────────────────────────────────────────
  // Cinza enquanto há turno aberto: a mecânica da ação (no ator) e de cada reação aberta
  // (no reator). Liquidado e sem turno aberto: o resultado em cada alvo e no ator, até o
  // próximo `turn_opened` (o reducer limpa `lastSettled`). Movimento puro não tem alvo, logo
  // nem balão de resultado.
  const gridKind = map?.grid.kind ?? "square";
  const balloons = useMemo<TableBalloon[]>(() => {
    const out: TableBalloon[] = [];
    if (state.openTurn) {
      const { action, actorId: turnActor } = state.openTurn;
      const text = action ? actionMechanicsText(action, nameOf, gridKind) : "";
      if (text) out.push({ characterId: turnActor, text, tone: "neutral" });
      for (const r of state.openReactions) {
        out.push({ characterId: r.actorId, text: reactionMechanicsText(r, gridKind), tone: "neutral" });
      }
    } else if (state.lastSettled) {
      const { actorId: settledActor, resolution } = state.lastSettled;
      for (const t of resolution.targets) out.push({ characterId: t.targetId, ...targetResultText(t) });
      if (settledActor && resolution.targets.length > 0) {
        out.push({ characterId: settledActor, ...actorResultText(resolution) });
      }
    }
    return out;
  }, [state.openTurn, state.openReactions, state.lastSettled, nameOf, gridKind]);

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

  // ─── Âncora de peça na tela (spec §4.4) ────────────────────────────────────
  // O Pixi reporta o enquadramento a cada pan/zoom; a camada HTML do palco
  // (`PieceAnchoredLayer`) põe botões e balões ao lado das peças com ele. Fica num store
  // fora do estado do React, criado uma vez: só a camada assina, a página não re-renderiza
  // a cada quadro. `setViewport` é estável — vai direto como `onViewportTransform`.
  const [viewport] = useState(createViewportStore);

  return {
    user,
    map,
    // O REST do mapa só segura a tela enquanto o tabuleiro não chegou (e o `useMatchMap` não respondeu).
    isLoading: matchMapPending && !map,
    boardPending,
    boardUnavailable,
    participants,
    participantsLoaded,
    refetchParticipants,
    campaign,
    live,
    boardPieces,
    combat,
    composer,
    ghosts,
    balloons,
    nameOf,
    canDeclare,
    blockedReason,
    declare,
    fitRequest,
    refit,
    openTurnPieceId,
    fullStateSeq,
    viewport,
    setViewport: viewport.set,
    pieceByCharacter,
  };
}
