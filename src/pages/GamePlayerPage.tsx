// A tela do jogador. Orquestra: dados e socket vêm de `useGameTable`; aqui fica só o que é
// do jogador — o ator é o próprio personagem, e um toque no mapa compõe a ação dele.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useUser from "../hooks/useUser";
import { useMatchParticipants } from "../hooks/useMatchParticipants";
import { useResizeObserver } from "../hooks/useResizeObserver";
import usePointerVerb from "../hooks/usePointerVerb";
import { useCombatCatalogue } from "../hooks/useCombatCatalogue";
import { useMatchHistory } from "../hooks/useMatchHistory";
import { useCharacterSheet } from "../hooks/useCharacterSheet";
import { useGameTable } from "../features/match/combat/useGameTable";
import { defaultMoveCategory } from "../features/match/combat/defaultMoveCategory";
import { useReactionControls } from "../features/match/combat/useReactionControls";
import { playerPanelDismissible, useStageOverlays } from "../features/match/combat/useStageOverlays";
import MatchStageTemplate from "../components/templates/MatchStageTemplate";
import MatchTopBar from "../features/match/combat/MatchTopBar";
import RailNav from "../features/match/combat/RailNav";
import AsideTabs from "../features/match/combat/AsideTabs";
import GeneralBar from "../features/match/combat/GeneralBar";
import OwnBars from "../features/match/combat/OwnBars";
import EventStream from "../features/match/combat/EventStream";
import { historyRows } from "../features/match/combat/historyRows";
import { composerUnavailableReason } from "../features/match/combat/composerAvailability";
import ActionComposer from "../features/match/combat/ActionComposer";
import type { DeclaredAction } from "../features/match/combat/combatReducer";
import CancelDeclaredDialog from "../features/match/combat/CancelDeclaredDialog";
import DeclaredActions from "../features/match/combat/DeclaredActions";
import MatchErrorBanner from "../features/match/combat/MatchErrorBanner";
import LostDeclaredNotice from "../features/match/combat/LostDeclaredNotice";
import MatchSheetPanel from "../features/match/combat/MatchSheetPanel";
import ReactionPanel from "../features/match/combat/ReactionPanel";
import ReactionDialogHost from "../features/match/combat/ReactionDialogHost";
import { useCombatAnchoredItems } from "../features/match/combat/anchoredItems";
import PieceAnchoredLayer from "../features/match/combat/PieceAnchoredLayer";
import type { PieceAnchoredItem } from "../features/match/combat/PieceAnchoredLayer";
import MatchCharactersSidebar from "../features/match/MatchCharactersSidebar";
import { BoardWaitNotice } from "../features/match/combat/BoardWaitNotice";
import { PanelMessage } from "../features/match/combat/panelStyles";
import TacticalMapViewer from "../features/tactical-map/TacticalMapViewer";
import {
  CanvasWrapper, MapHint, MapHintButton, MapLoadingMessage, NoMapMessage,
  StageNotices,
} from "../features/match/combat/mapCanvasStyles";
import { MapCornerStack, MapCornerStackButton } from "../features/tactical-map/stage/mapCornerStyles";
import type { SlotCoord, WallSegment } from "../types/tacticalMap";
import { actorWallVerbs } from "../features/match/combat/wallVerbs";

type Props = {
  token: string;
  campaignId?: string;
  matchId?: string;
};

// No jogo nenhuma peça é arrastável: quem decide onde a peça para é o servidor. Um Set
// vazio (e não `undefined`, que o PiecesLayer lê como "tudo arrastável", o modo editor).
const NO_DRAG = new Set<string>();

type RailTab = "acao" | "ficha";

/** Só a parede com o que fazer é tocável — terreno e parede destruída deixam o toque cair no slot. */
const isActorWallTappable = (w: WallSegment) => actorWallVerbs(w).length > 0;

export default function GamePlayerPage({ token, campaignId, matchId }: Props) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { width, height } = useResizeObserver(canvasRef);
  const verb = usePointerVerb();

  // O ator: um dos personagens do jogador nesta partida (o primeiro, até ele trocar). A
  // query de participantes é a mesma que `useGameTable` usa — o React Query a compartilha.
  const { user } = useUser();
  const { data: participants = [] } = useMatchParticipants(token, matchId, true);
  const [chosenActor, setChosenActor] = useState<string | undefined>(undefined);
  const myCharacters = useMemo(
    () => participants.filter((p) => !!user && p.characterSheet.playerUuid === user.uuid),
    [participants, user],
  );
  const actorId =
    chosenActor && myCharacters.some((p) => p.characterSheet.uuid === chosenActor)
      ? chosenActor
      : myCharacters[0]?.characterSheet.uuid;

  const game = useGameTable({ token, campaignId, matchId, declaredSource: "ownQueue", actorId });
  const { combat, composer, live, map, nameOf } = game;
  const { state } = combat;

  const { data: catalogue } = useCombatCatalogue(token, actorId);
  const { data: ownSheet } = useCharacterSheet(token, actorId);

  // A aba Histórico: o REST (a query que useGameTable invalida a cada mensagem que muda o
  // histórico — turno fechado, cena, regime, round, master action — a cada mexida no tabuleiro
  // entre turnos e a cada match_full_state), com os eventos ao vivo que ele ainda não cobre por cima.
  const { data: historyData, isError: historyFailed } = useMatchHistory(token, matchId);
  const rows = useMemo(
    () => historyRows(historyData?.history, state.events, historyData?.fetchStartedAt, state.openTurn?.turnId),
    [historyData, state.events, state.openTurn],
  );
  const actorName = myCharacters.find((p) => p.characterSheet.uuid === actorId)?.characterSheet.nickName ?? "Você";

  // ─── Reações (spec §4.5, §4.6) ─────────────────────────────────────────────
  // O jogador reage pelos personagens dele que são alvo da ação aberta: botões ao lado da
  // peça e na seção "Você é alvo" do painel; a fuga arma a escolha da casa no mapa.
  const myActorIds = useMemo(() => new Set(myCharacters.map((p) => p.characterSheet.uuid)), [myCharacters]);
  const controls = useReactionControls({
    state,
    mine: myActorIds,
    boardPieces: game.boardPieces,
    send: combat.send,
    fullStateSeq: game.fullStateSeq,
  });
  const { onSlotForPick, cancelPick } = controls;
  const [railActive, setRailActive] = useState<RailTab>("acao");
  // Cancelar uma ação declarada: o pedido espera a confirmação; se a linha deixa de estar
  // "na fila" com o diálogo aberto (abriu no meio-tempo), o diálogo fecha sozinho.
  const [cancelling, setCancelling] = useState<DeclaredAction | null>(null);
  const cancelPending =
    cancelling && state.declared.some((d) => d.id === cancelling.id && d.status === "queued") ? cancelling : null;
  const { panelOpen, setPanelOpen, asideOpen, setAsideOpen, closeAsideIfDrawer } = useStageOverlays();

  const handleRailSelect = useCallback(
    (id: string) => {
      if (id === railActive) {
        setPanelOpen((o) => !o);
        return;
      }
      setRailActive(id as RailTab);
      setPanelOpen(true);
    },
    [railActive, setPanelOpen],
  );

  const pieceCharacter = useCallback(
    (pieceId: string) => game.boardPieces.find((p) => p.id === pieceId)?.characterId,
    [game.boardPieces],
  );

  // Sem conexão viva ou sem tabuleiro não há onde tocar: o compositor espera a sala.
  const composerUnavailable = composerUnavailableReason(combat.status, !!map);
  // Com a sala fechada o mapa segue na tela, mas toque nele não pode editar o rascunho.
  const composerClosed = composerUnavailable != null;

  const handlePieceTap = useCallback(
    (pieceId: string) => {
      const charId = pieceCharacter(pieceId);
      if (!charId || !actorId || composerClosed) return;
      composer.onCharacterTap(charId);
      setRailActive("acao");
      setPanelOpen(true);
    },
    [pieceCharacter, actorId, composerClosed, composer, setPanelOpen],
  );
  const handlePieceHold = useCallback(
    (pieceId: string) => {
      const charId = pieceCharacter(pieceId);
      if (!charId || !actorId || composerClosed) return;
      composer.onCharacterHold(charId);
      setRailActive("acao");
      setPanelOpen(true);
    },
    [pieceCharacter, actorId, composerClosed, composer, setPanelOpen],
  );
  // A parede é alvo como uma peça: o toque vai ao compositor (aproximação, verbo, arma).
  const handleWallTap = useCallback(
    (wall: WallSegment) => {
      if (!actorId || composerClosed) return;
      composer.onWallTap(wall);
      setRailActive("acao");
      setPanelOpen(true);
    },
    [actorId, composerClosed, composer, setPanelOpen],
  );
  // Segurar numa parede a junta aos alvos (com personagens e outras paredes: golpe em área).
  const handleWallHold = useCallback(
    (wall: WallSegment) => {
      if (!actorId || composerClosed) return;
      composer.onWallHold(wall);
      setRailActive("acao");
      setPanelOpen(true);
    },
    [actorId, composerClosed, composer, setPanelOpen],
  );
  const handleSlotTap = useCallback(
    (slot: SlotCoord) => {
      // A escolha da casa da fuga vem antes do compositor: o toque é dela.
      if (onSlotForPick(slot)) return;
      if (!actorId || composerClosed) return;
      composer.onSlotTap(slot);
      setRailActive("acao");
      setPanelOpen(true);
    },
    [onSlotForPick, actorId, composerClosed, composer, setPanelOpen],
  );

  // O Esc é da escolha da casa só quando não é de outra coisa: um diálogo aberto ou um campo
  // de texto com foco ficam com ele (o mesmo filtro do mestre).
  const otherDialogOpen = controls.dialog != null;
  const picking = controls.pick != null;
  useEffect(() => {
    if (!picking || otherDialogOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return;
      if (t instanceof HTMLElement && t.isContentEditable) return;
      cancelPick();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picking, otherDialogOpen, cancelPick]);

  // Um personagem meu pode reagir e a seção "Você é alvo" (aba Ação) não está na tela: no
  // celular os botões não vão ao mapa, e sem isto o jogador não saberia que é alvo. A dica leva
  // à aba. A da escolha da casa vence: o toque, ali, é da fuga.
  const reactionWaiting = controls.targets.some((t) => t.status === "available");
  const showReactionHint = !!map && !picking && reactionWaiting && !(panelOpen && railActive === "acao");
  const showReactionSection = useCallback(() => {
    setRailActive("acao");
    setPanelOpen(true);
  }, [setPanelOpen]);

  // Botões de reação (abaixo da peça) e balões (acima): a mesma camada, os mesmos helpers nas duas telas.
  const anchoredItems: PieceAnchoredItem[] = useCombatAnchoredItems(controls, nameOf, game.balloons);

  // Personagens: quem o mapa deste jogador mostra (o fog do servidor já recortou), mais os
  // próprios personagens mesmo antes da peça chegar.
  const visibleParticipants = useMemo(() => {
    const onBoard = new Set(game.boardPieces.map((p) => p.characterId));
    const mine = new Set(myCharacters.map((p) => p.characterSheet.uuid));
    return game.participants.filter(
      (p) => mine.has(p.characterSheet.uuid) || onBoard.has(p.characterSheet.uuid),
    );
  }, [game.participants, game.boardPieces, myCharacters]);

  const restHealth = ownSheet?.status?.health;
  const ownHp = actorId
    ? (state.hp[actorId] ?? (restHealth ? { hp: restHealth.current, maxHp: restHealth.max } : undefined))
    : undefined;

  const actorChoices = useMemo(
    () => myCharacters.map((p) => ({ id: p.characterSheet.uuid, name: p.characterSheet.nickName })),
    [myCharacters],
  );

  return (
    <>
      <MatchStageTemplate
        panelOpen={panelOpen}
        asideOpen={asideOpen}
        panelWide={railActive === "ficha" && !!actorId}
        // Spec §4: véu só quando o painel não pede toque no mapa (regra em playerPanelDismissible).
        panelDismissible={playerPanelDismissible({ railActive, hasActor: !!actorId, picking })}
        onDismissPanel={() => setPanelOpen(false)}
        onDismissAside={() => setAsideOpen(false)}
        topbar={
          <MatchTopBar
            scene={state.scene}
            roundMode={state.roundMode}
            status={combat.status}
            onReconnect={combat.reconnect}
            asideOpen={asideOpen}
            onToggleAside={() => setAsideOpen((o) => !o)}
          />
        }
        rail={
          <RailNav
            items={[
              { id: "acao", label: "Ação", icon: "⚔" },
              { id: "ficha", label: "Ficha", icon: "📜" },
            ]}
            active={railActive}
            panelOpen={panelOpen}
            onSelect={handleRailSelect}
          />
        }
        panel={
          railActive === "ficha" ? (
            <MatchSheetPanel token={token} sheetUuid={actorId} liveHp={actorId ? state.hp[actorId] : undefined} />
          ) : actorId ? (
            <>
              <ReactionPanel
                targets={controls.targets}
                nameOf={nameOf}
                onQuick={controls.quick}
                onConfigure={controls.configure}
                pick={controls.pick}
                onCancelPick={cancelPick}
              />
              <OwnBars bars={state.bars} characterId={actorId} hp={ownHp} />
              <ActionComposer
                actorName={actorName}
                actors={actorChoices}
                actorId={actorId}
                onActorChange={setChosenActor}
                draft={composer.draft}
                resolved={composer.resolved}
                verdict={composer.verdict}
                catalogue={catalogue}
                gridKind={map?.grid.kind ?? "square"}
                defaultCategory={defaultMoveCategory(state)}
                nameOf={nameOf}
                onDraftChange={composer.updateDraft}
                onDeclare={game.declare}
                canDeclare={game.canDeclare}
                blockedReason={game.blockedReason}
                unavailableReason={composerUnavailable}
              />
            </>
          ) : (
            <PanelMessage>Você não tem personagem nesta partida.</PanelMessage>
          )
        }
        stage={
          <>
            <CanvasWrapper ref={canvasRef}>
              {game.isLoading ? (
                <MapLoadingMessage>Carregando mapa…</MapLoadingMessage>
              ) : game.boardPending ? (
                // O mapa está anexado, mas o tabuleiro da partida ainda não chegou: diz o porquê,
                // sem desenhar o mapa da campanha no lugar.
                <BoardWaitNotice boardUnavailable={game.boardUnavailable} status={combat.status} />
              ) : map && width > 0 && height > 0 ? (
                <TacticalMapViewer
                  map={{ ...map, walls: live.liveWalls, pieces: game.boardPieces }}
                  fog={live.fog}
                  isMaster={false}
                  width={width}
                  height={height}
                  npcMap={live.npcMap}
                  // Na escolha da casa da fuga a parede não é tocável: o toque é da fuga.
                  onWallClick={actorId && !picking ? handleWallTap : undefined}
                  onWallLongPress={actorId && !picking ? handleWallHold : undefined}
                  isWallTappable={isActorWallTappable}
                  piecesInteractive
                  draggablePieceIds={NO_DRAG}
                  suppressPanOnPiecePress
                  // Na escolha da casa da fuga o toque na peça não marca alvo, e os anéis e a
                  // intenção do compositor leriam como parte da fuga: somem com ela (como no mestre).
                  onPieceSelect={picking ? undefined : handlePieceTap}
                  onPieceLongPress={picking ? undefined : handlePieceHold}
                  selectedPieceId={composer.actorPiece?.id}
                  targetPieceIds={picking ? undefined : composer.targetPieceIds}
                  activePieceId={game.openTurnPieceId}
                  intentPreview={picking ? undefined : composer.preview}
                  intentGhosts={game.ghosts}
                  highlightHoverSlot={!!actorId}
                  fitRequest={game.fitRequest}
                  onEmptySlotClick={handleSlotTap}
                  onViewportTransform={game.setViewport}
                />
              ) : !map ? (
                <NoMapMessage>Nenhum mapa anexado a esta partida.</NoMapMessage>
              ) : null}
            </CanvasWrapper>
            <PieceAnchoredLayer
              viewport={game.viewport}
              grid={map?.grid}
              pieces={game.pieceByCharacter}
              items={anchoredItems}
              width={width}
              height={height}
            />
            <GeneralBar
              bars={state.bars}
              roundMode={state.roundMode}
              openTurnActorId={state.openTurn?.actorId}
              nameOf={nameOf}
              highlightActorIds={myActorIds}
            />
            <StageNotices>
              <MatchErrorBanner error={state.lastError} onDismiss={combat.dismissError} />
              <LostDeclaredNotice
                count={state.lostDeclared.length}
                restoredCount={state.lostDeclared.filter((d) => d.draftRestored).length}
                onDismiss={combat.dismissLostDeclared}
              />
            </StageNotices>
            {map && controls.pick && (
              <MapHint>{verb} na casa para onde {nameOf(controls.pick.actorId)} escapa.</MapHint>
            )}
            {showReactionHint && (
              <MapHintButton type="button" onClick={showReactionSection}>
                Você é alvo — reaja no painel.
              </MapHintButton>
            )}
            {map && (
              <MapCornerStack>
                {controls.pick && (
                  <MapCornerStackButton type="button" aria-label="Cancelar a escolha da casa da fuga" onClick={cancelPick}>
                    × Cancelar
                  </MapCornerStackButton>
                )}
                <MapCornerStackButton type="button" onClick={game.refit}>Enquadrar</MapCornerStackButton>
              </MapCornerStack>
            )}
          </>
        }
        aside={
          <AsideTabs
            defaultTab="historico"
            historico={
              <EventStream
                rows={rows}
                nameOf={nameOf}
                gridKind={map?.grid.kind ?? "square"}
                loadFailed={historyFailed}
                pinKey={state.declared.map((d) => `${d.id}:${d.status}`).join(",")}
                footer={
                  <DeclaredActions
                    declared={state.declared}
                    nameOf={nameOf}
                    gridKind={map?.grid.kind ?? "square"}
                    onCancel={(id) => setCancelling(state.declared.find((d) => d.id === id) ?? null)}
                  />
                }
              />
            }
            personagens={
              <MatchCharactersSidebar
                fluid
                gameStarted
                enrollments={[]}
                participants={visibleParticipants}
                isMaster={false}
                actionLoading={{}}
                onAccept={() => {}}
                onReject={() => {}}
                ownPlayerUuid={user?.uuid}
                onSelectCharacterSheet={(sheetUuid) => {
                  setChosenActor(sheetUuid);
                  setRailActive("ficha");
                  setPanelOpen(true);
                  closeAsideIfDrawer();
                }}
              />
            }
          />
        }
      />
      <ReactionDialogHost token={token} matchId={matchId} controls={controls} nameOf={nameOf} />
      <CancelDeclaredDialog
        pending={cancelPending}
        nameOf={nameOf}
        gridKind={map?.grid.kind ?? "square"}
        showSwapCost={state.roundMode === "Race"}
        canConfirm={combat.status === "connected"}
        onConfirm={() => {
          if (cancelPending) combat.send.cancelAction(cancelPending.id);
          setCancelling(null);
        }}
        onKeep={() => setCancelling(null)}
      />
    </>
  );
}

