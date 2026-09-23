// src/pages/GamePlayerPage.tsx
//
// A tela do jogador (Fase 6, Tarefa 12). Thin orchestrator: busca dados (hooks), liga o
// socket via `useMatchCombat` e compõe `MatchStageTemplate` + organismos. Nenhum
// componente abaixo desta página recebe `isMaster` (I2) — a única exceção declarada é
// `WallActionSheet` (R23), porque o menu de parede tem verbos diferentes por papel.
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useUser from "../hooks/useUser";
import { useMatchMap } from "../hooks/useMatchMap";
import { useMap } from "../hooks/useMap";
import { useMatchParticipants } from "../hooks/useMatchParticipants";
import { useCampaignDetails } from "../hooks/useCampaignDetails";
import { useCombatCatalogue } from "../hooks/useCombatCatalogue";
import { useResizeObserver } from "../hooks/useResizeObserver";
import { useMatchCombat } from "../features/match/combat/useMatchCombat";
import type { ActionEnqueuedMeta } from "../features/match/combat/useMatchCombat";
import { useActionComposerState } from "../features/match/combat/useActionComposerState";
import { useLiveMapSync } from "../features/match/combat/useLiveMapSync";
import { defaultMoveCategory } from "../features/match/combat/defaultMoveCategory";
import MatchStageTemplate from "../components/templates/MatchStageTemplate";
import MatchTopBar from "../features/match/combat/MatchTopBar";
import RailNav from "../features/match/combat/RailNav";
import AsideTabs from "../features/match/combat/AsideTabs";
import GeneralBar from "../features/match/combat/GeneralBar";
import OwnBars from "../features/match/combat/OwnBars";
import EventStream from "../features/match/combat/EventStream";
import ActionComposer from "../features/match/combat/ActionComposer";
import MatchErrorBanner from "../features/match/combat/MatchErrorBanner";
import MatchCharactersSidebar from "../features/match/MatchCharactersSidebar";
import WallActionSheet from "../features/match/WallActionSheet";
import TacticalMapViewer from "../features/tactical-map/TacticalMapViewer";
import { visibleBoardPieces } from "../features/tactical-map/utils/boardSource";
import { CanvasWrapper, MapLoadingMessage, NoMapMessage } from "../features/match/combat/mapCanvasStyles";
import type { WallSegment } from "../types/tacticalMap";

type Props = {
  token: string;
  campaignId?: string;
  matchId?: string;
};

// Final review, Important 1: sem isto, PiecesLayer via draggablePieceIds === undefined
// como "toda peça é arrastável" (regra pensada pro editor de mapa) — no jogo o servidor é
// quem decide onde a peça para (I1), e um dedo escorregando 5px no toque já passa o
// limiar de 4px de arraste, cancela o hold e some com a peça da tela até soltar. Módulo
// (não por render) para a mesma identidade de Set nunca invalidar memos de PiecesLayer.
const EMPTY_SET = new Set<string>();

export default function GamePlayerPage({ token, campaignId, matchId }: Props) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { width, height } = useResizeObserver(canvasRef);
  const navigate = useNavigate();

  const { user } = useUser();
  const { data: matchMap, isPending: matchMapPending } = useMatchMap(token, matchId);
  const { data: map, isPending: mapPending } = useMap(token, matchMap?.mapUuid);
  const { data: participants = [] } = useMatchParticipants(token, matchId, true);
  const { data: campaign } = useCampaignDetails(token, campaignId);

  const myParticipant = participants.find(
    (p) => p.characterSheet.playerUuid === user?.uuid,
  );
  const actorId = myParticipant?.characterSheet.uuid;
  const actorName = myParticipant?.characterSheet.nickName ?? "Você";

  const { data: catalogue } = useCombatCatalogue(token, actorId);

  // ─── Mapa ao vivo: paredes/peças/fog só chegam pelo WS (comentário em
  // visibleBoardPieces e em useLiveMapSync explica por quê o jogador nunca semeia do
  // REST) ────────────────────────────────────────────────────────────────────────────
  const {
    liveWalls,
    livePieces,
    fog,
    npcMap,
    handleWallStateChanged,
    handleWallHpChanged,
    handleMapFullState,
    handleVisibilityUpdated,
    handleWallRevealed,
    handlePieceMoved,
    handlePieceRemoved,
  } = useLiveMapSync({ map, campaign, seedFromRest: false });
  const [wallPicker, setWallPicker] = useState<WallSegment | null>(null);

  const boardPieces = visibleBoardPieces(livePieces, map?.pieces, false);

  // ─── Combate ──────────────────────────────────────────────────────────────
  // `useActionComposerState` (abaixo) precisa de `state`, que só existe depois de
  // chamar `useMatchCombat` — e `useMatchCombat` precisa do callback de limpeza do
  // rascunho já na chamada. Um ref quebra o ciclo: o indireto é estável desde o
  // primeiro render, e o valor real é atribuído no corpo do render (mesma convenção de
  // `useMatchWs.ts`), antes de qualquer envio poder chegar.
  const onActionEnqueuedRef = useRef<(meta: ActionEnqueuedMeta) => void>(() => {});
  const onActionRefusedRef = useRef<(actorId: string) => void>(() => {});

  const { state, status, send, dismissError } = useMatchCombat({
    matchUuid: matchId,
    userUuid: user?.uuid,
    token,
    isMaster: false,
    onWallStateChanged: handleWallStateChanged,
    onWallHpChanged: handleWallHpChanged,
    onMapFullState: handleMapFullState,
    onVisibilityUpdated: handleVisibilityUpdated,
    onWallRevealed: handleWallRevealed,
    onPieceMoved: handlePieceMoved,
    onPieceRemoved: handlePieceRemoved,
    onActionEnqueued: (_actionId, meta) => onActionEnqueuedRef.current(meta),
    onActionRefused: (actorId) => onActionRefusedRef.current(actorId),
  });

  // ─── Rascunho de ação + mapas peça↔personagem (compartilhado com o mestre) ─
  const {
    draft,
    updateDraft,
    characterIdByPieceId,
    targetPieceIds,
    actorPiece,
    actorSlot,
    replaceTarget,
    toggleTarget,
    setDestination,
    clearDraftFor,
    dropDraftMoveFor,
  } = useActionComposerState({ matchId, actorId, boardPieces, state });

  // R28: só limpa quando o envio confirmado é do composer (clearsDraft) — o menu de
  // parede (R29) manda clearsDraft:false e não deve apagar um rascunho em voo.
  onActionEnqueuedRef.current = (meta) => {
    if (!meta.clearsDraft) return;
    clearDraftFor(meta.actorId);
  };

  // F2: o servidor recusou o envio do composer (WS_ERROR, geralmente move_blocked) —
  // derruba só o `move` do rascunho, alvo e arma continuam.
  onActionRefusedRef.current = (actorId) => dropDraftMoveFor(actorId);

  // M4: Declarar fica desabilitado enquanto há um envio do composer ainda sem ack para
  // este ator — evita reenfileirar em duplicidade num link lento.
  const hasPendingComposerSend = state.pendingSends.some(
    (p) => p.actorId === actorId && p.clearsDraft,
  );
  const canSubmit = status === "connected" && !hasPendingComposerSend;

  const nameOf = useCallback(
    (id: string) =>
      participants.find((p) => p.characterSheet.uuid === id)?.characterSheet.nickName ?? id,
    [participants],
  );

  const handlePieceSelect = useCallback(
    (pieceId: string) => {
      const charId = characterIdByPieceId.get(pieceId);
      if (!charId) return;
      replaceTarget(charId);
    },
    [characterIdByPieceId, replaceTarget],
  );

  const handlePieceLongPress = useCallback(
    (pieceId: string) => {
      const charId = characterIdByPieceId.get(pieceId);
      if (!charId) return;
      toggleTarget(charId);
    },
    [characterIdByPieceId, toggleTarget],
  );

  const handleWallClick = useCallback((wall: WallSegment) => setWallPicker(wall), []);

  const restHealth = myParticipant?.characterSheet.private?.health;
  const ownHp = actorId
    ? (state.hp[actorId] ?? (restHealth ? { hp: restHealth.current, maxHp: restHealth.max } : undefined))
    : undefined;

  const isLoading = matchMapPending || (!!matchMap && mapPending);

  // ─── Layout: painel aberto, gaveta fechada no primeiro render (o mapa
  // precisa estar visível no celular) — R24. ───────────────────────────────
  const [panelOpen, setPanelOpen] = useState(true);
  const [asideOpen, setAsideOpen] = useState(false);

  return (
    <>
      <MatchStageTemplate
        panelOpen={panelOpen}
        asideOpen={asideOpen}
        topbar={
          <MatchTopBar
            scene={state.scene}
            roundMode={state.roundMode}
            status={status}
            asideOpen={asideOpen}
            onToggleAside={() => setAsideOpen((o) => !o)}
          />
        }
        rail={
          <RailNav
            items={[{ id: "acao", label: "Ação" }]}
            active="acao"
            onSelect={() => setPanelOpen((o) => !o)}
          />
        }
        panel={
          <>
            <OwnBars bars={state.bars} characterId={actorId ?? ""} hp={ownHp} />
            {actorId && catalogue && (
              <ActionComposer
                actorId={actorId}
                actorName={actorName}
                actorSlot={actorSlot}
                draft={draft}
                catalogue={catalogue}
                defaultCategory={defaultMoveCategory(state)}
                nameOf={nameOf}
                onDraftChange={updateDraft}
                onSubmit={send.enqueueAction}
                canSubmit={canSubmit}
              />
            )}
          </>
        }
        stage={
          <>
            <CanvasWrapper ref={canvasRef}>
              {isLoading ? (
                <MapLoadingMessage>Carregando mapa...</MapLoadingMessage>
              ) : map && width > 0 && height > 0 ? (
                <TacticalMapViewer
                  map={{ ...map, walls: liveWalls, pieces: boardPieces }}
                  fog={fog}
                  isMaster={false}
                  width={width}
                  height={height}
                  npcMap={npcMap}
                  onWallClick={handleWallClick}
                  piecesInteractive
                  draggablePieceIds={EMPTY_SET}
                  onPieceSelect={handlePieceSelect}
                  onPieceLongPress={handlePieceLongPress}
                  selectedPieceId={actorPiece?.id}
                  targetPieceIds={targetPieceIds}
                  ghosts={Object.values(state.ghosts)}
                  onEmptySlotClick={setDestination}
                />
              ) : !map ? (
                <NoMapMessage>Nenhum mapa anexado a esta partida.</NoMapMessage>
              ) : null}
            </CanvasWrapper>
            <GeneralBar bars={state.bars} nameOf={nameOf} highlightActorId={actorId} />
            <MatchErrorBanner error={state.lastError} onDismiss={dismissError} />
          </>
        }
        aside={
          <AsideTabs
            defaultTab="historico"
            historico={<EventStream events={state.events} nameOf={nameOf} />}
            personagens={
              <MatchCharactersSidebar
                gameStarted
                enrollments={[]}
                participants={participants}
                isMaster={false}
                actionLoading={{}}
                onAccept={() => {}}
                onReject={() => {}}
                onSelectCharacterSheet={(sheetUuid) => navigate(`/charactersheet/${sheetUuid}`)}
              />
            }
          />
        }
      />
      {wallPicker && actorId && (
        <WallActionSheet
          wall={wallPicker}
          isMaster={false}
          onClose={() => setWallPicker(null)}
          onInteract={(kind) => {
            // RULING R29: enqueue_action exige actorId (contrato) — o menu de parede do
            // jogador passa pela mesma via do composer, com clearsDraft:false (R28) para
            // não apagar um rascunho do composer em voo.
            send.enqueueAction(
              { actorId, targetId: [wallPicker.id], interact: { kind } },
              { clearsDraft: false },
            );
            setWallPicker(null);
          }}
          onAttack={() => {
            send.enqueueAction(
              { actorId, targetId: [wallPicker.id], attack: {} },
              { clearsDraft: false },
            );
            setWallPicker(null);
          }}
        />
      )}
    </>
  );
}
