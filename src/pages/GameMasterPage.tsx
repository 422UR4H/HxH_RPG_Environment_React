// src/pages/GameMasterPage.tsx
//
// A tela do mestre (Fase 6, Tarefa 13). Mesma casca da tela do jogador — reusa
// `useActionComposerState` (extraído da Tarefa 12) para o rascunho e os mapas
// peça↔personagem — com quatro diferenças: rail Fila/Fichas, regência na topbar, o
// diálogo de `close_turn_refused`, e ator selecionável no mapa (NPC vira ator; peça de
// jogador sem ator selecionado vira inspecionada, §7.3). Nenhum componente abaixo desta
// página recebe `isMaster`, exceto as exceções já declaradas na Tarefa 12
// (`WallActionSheet`, `TacticalMapStage.fogDisabled`, `MatchCharactersSidebar` — R25).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useMatchMap } from "../hooks/useMatchMap";
import { useMap } from "../hooks/useMap";
import { useMatchParticipants } from "../hooks/useMatchParticipants";
import { useCampaignDetails } from "../hooks/useCampaignDetails";
import { useCombatCatalogue } from "../hooks/useCombatCatalogue";
import { useResizeObserver } from "../hooks/useResizeObserver";
import { useMatchCombat } from "../features/match/combat/useMatchCombat";
import type { MatchBoardSync } from "../hooks/useMatchWs";
import { useActionComposerState } from "../features/match/combat/useActionComposerState";
import { useLiveMapSync } from "../features/match/combat/useLiveMapSync";
import { clearDraft } from "../features/match/combat/actionDraft";
import { defaultMoveCategory } from "../features/match/combat/defaultMoveCategory";
import type { RoundMode } from "../features/match/combat/combatMessages";
import MatchStageTemplate from "../components/templates/MatchStageTemplate";
import MatchTopBar from "../features/match/combat/MatchTopBar";
import RailNav from "../features/match/combat/RailNav";
import AsideTabs from "../features/match/combat/AsideTabs";
import type { AsideTab } from "../features/match/combat/AsideTabs";
import GeneralBar from "../features/match/combat/GeneralBar";
import OwnBars from "../features/match/combat/OwnBars";
import EventStream from "../features/match/combat/EventStream";
import ActionComposer from "../features/match/combat/ActionComposer";
import QueuePanel from "../features/match/combat/QueuePanel";
import CloseTurnRefusedDialog from "../features/match/combat/CloseTurnRefusedDialog";
import MatchErrorBanner from "../features/match/combat/MatchErrorBanner";
import MatchCharactersSidebar from "../features/match/MatchCharactersSidebar";
import WallActionSheet from "../features/match/WallActionSheet";
import TacticalMapViewer from "../features/tactical-map/TacticalMapViewer";
import { visibleBoardPieces } from "../features/tactical-map/utils/boardSource";
import { CanvasWrapper, MapLoadingMessage, NoMapMessage } from "../features/match/combat/mapCanvasStyles";
import { colors, fonts } from "../styles/tokens";
import type { WallSegment } from "../types/tacticalMap";

type Props = {
  token: string;
  campaignId?: string;
  matchId?: string;
};

type RailTab = "fila" | "fichas";

export default function GameMasterPage({ token, campaignId, matchId }: Props) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { width, height } = useResizeObserver(canvasRef);
  const navigate = useNavigate();

  const { data: matchMap, isPending: matchMapPending } = useMatchMap(token, matchId);
  const { data: map, isPending: mapPending } = useMap(token, matchMap?.mapUuid);
  const { data: participants = [] } = useMatchParticipants(token, matchId, true);
  const { data: campaign } = useCampaignDetails(token, campaignId);

  // ─── Mapa: o mestre é dono de todo o tabuleiro (visibleBoardPieces já entende
  // isso), então semeia direto do REST enquanto o WS não manda nada mais novo — sem
  // isso o mestre veria o mapa vazio até o primeiro map_full_state (R11: preserva o
  // que o GamePage pré-Tarefa-12 fazia só para o papel de mestre). Os handlers e o
  // liveWalls/livePieces/fog que eles atualizam moram em useLiveMapSync, compartilhado
  // com GamePlayerPage — só `seedFromRest` muda entre os dois papéis. ────────────────
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
  } = useLiveMapSync({ map, campaign, seedFromRest: true });
  const [wallPicker, setWallPicker] = useState<WallSegment | null>(null);

  // Board que o mestre semeia no servidor de jogo (sempre a partir do REST — nunca do
  // que o próprio servidor acabou de mandar, senão vira loop).
  const board = useMemo<MatchBoardSync | null>(
    () => (map ? { pieces: map.pieces ?? [], walls: map.walls ?? [], grid: map.grid } : null),
    [map],
  );

  const boardPieces = visibleBoardPieces(livePieces, map?.pieces, true);

  // ─── Ator: só um NPC (player_uuid null) pode virar ator do mestre. ────────────────
  const npcCharacterIds = useMemo(
    () => new Set(participants.filter((p) => !p.characterSheet.playerUuid).map((p) => p.characterSheet.uuid)),
    [participants],
  );

  const [actorId, setActorId] = useState<string | undefined>(undefined);
  const [inspectedId, setInspectedId] = useState<string | undefined>(undefined);

  const { data: catalogue } = useCombatCatalogue(token, actorId);

  // ─── Combate ──────────────────────────────────────────────────────────────
  // Mesmo indireto por ref de GamePlayerPage: `useActionComposerState` precisa de
  // `state` (só existe depois de `useMatchCombat`), e `useMatchCombat` precisa do
  // callback de limpeza do rascunho já na chamada.
  const onActionEnqueuedRef = useRef<() => void>(() => {});

  const { state, status, send, dismissError, dismissCloseTurnDialog } = useMatchCombat({
    matchUuid: matchId,
    token,
    isMaster: true,
    board,
    onWallStateChanged: handleWallStateChanged,
    onWallHpChanged: handleWallHpChanged,
    onMapFullState: handleMapFullState,
    onVisibilityUpdated: handleVisibilityUpdated,
    onWallRevealed: handleWallRevealed,
    onActionEnqueued: () => onActionEnqueuedRef.current(),
  });

  const {
    draft,
    updateDraft,
    characterIdByPieceId,
    pieceIdsByCharacterId,
    targetPieceIds,
    actorPiece,
    actorSlot,
    replaceTarget,
    toggleTarget,
    setDestination,
    resetDraft,
  } = useActionComposerState({ matchId, actorId, boardPieces, state });

  onActionEnqueuedRef.current = () => {
    if (!matchId || !actorId) return;
    clearDraft(matchId, actorId);
    resetDraft();
  };

  const nameOf = useCallback(
    (id: string) =>
      participants.find((p) => p.characterSheet.uuid === id)?.characterSheet.nickName ?? id,
    [participants],
  );

  // ─── Layout: painel aberto na Fila (o que precisa de decisão do mestre primeiro),
  // gaveta fechada no primeiro render — R24. ────────────────────────────────────────
  const [railActive, setRailActive] = useState<RailTab>("fila");
  const [panelOpen, setPanelOpen] = useState(true);
  const [asideOpen, setAsideOpen] = useState(false);
  const [asideTab, setAsideTab] = useState<AsideTab>("historico");

  const handleRailSelect = useCallback(
    (id: string) => {
      if (id === railActive) {
        setPanelOpen((o) => !o);
        return;
      }
      setRailActive(id as RailTab);
      setPanelOpen(true);
    },
    [railActive],
  );

  // §7.3: sem ator selecionado, clicar numa peça que o mestre controla (NPC) a vira
  // ator; clicar numa que ele NÃO controla (jogador) a vira inspecionada — foco no
  // mapa e a aba Personagens abre nela. Com ator já selecionado, qualquer clique
  // (inclusive na própria peça do ator) marca alvo (R4/spec §6).
  const handlePieceSelect = useCallback(
    (pieceId: string) => {
      const charId = characterIdByPieceId.get(pieceId);
      if (!charId) return;
      if (actorId) {
        replaceTarget(charId);
        return;
      }
      if (npcCharacterIds.has(charId)) {
        setActorId(charId);
        setInspectedId(undefined);
        setRailActive("fichas");
        setPanelOpen(true);
      } else {
        setInspectedId(charId);
        setAsideTab("personagens");
        setAsideOpen(true);
      }
    },
    [characterIdByPieceId, actorId, replaceTarget, npcCharacterIds],
  );

  const handlePieceLongPress = useCallback(
    (pieceId: string) => {
      if (!actorId) return;
      const charId = characterIdByPieceId.get(pieceId);
      if (!charId) return;
      toggleTarget(charId);
    },
    [actorId, characterIdByPieceId, toggleTarget],
  );

  // jsdom não tem layout real (scrollIntoView pode nem existir) — guarda opcional,
  // igual ao padrão já usado em EventStream.
  useEffect(() => {
    if (!inspectedId) return;
    document.querySelector(`[data-testid="character-row-${inspectedId}"]`)?.scrollIntoView?.();
  }, [inspectedId]);

  const handleWallClick = useCallback((wall: WallSegment) => setWallPicker(wall), []);

  // HP de todo mundo no aside — não precisa de isMaster (o servidor já só manda
  // character_hp_changed pra quem tem direito); aqui sobrepomos o HP ao vivo por
  // cima do que o REST trouxe no carregamento (R7).
  const participantsWithLiveHp = useMemo(
    () =>
      participants.map((p) => {
        const live = state.hp[p.characterSheet.uuid];
        const priv = p.characterSheet.private;
        if (!live || !priv) return p;
        return {
          ...p,
          characterSheet: {
            ...p.characterSheet,
            private: { ...priv, health: { ...priv.health, current: live.hp, max: live.maxHp } },
          },
        };
      }),
    [participants, state.hp],
  );

  const actorParticipant = actorId
    ? participants.find((p) => p.characterSheet.uuid === actorId)
    : undefined;
  const actorName = actorParticipant?.characterSheet.nickName ?? "NPC";
  const actorRestHealth = actorParticipant?.characterSheet.private?.health;
  const actorHp = actorId
    ? (state.hp[actorId] ??
        (actorRestHealth ? { hp: actorRestHealth.current, maxHp: actorRestHealth.max } : undefined))
    : undefined;

  const isLoading = matchMapPending || (!!matchMap && mapPending);
  const canCloseTurn = state.openTurn != null;

  const selectedPieceId = actorId
    ? actorPiece?.id
    : inspectedId
      ? pieceIdsByCharacterId.get(inspectedId)?.[0]
      : undefined;

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
            actions={
              <RegencyActions>
                <RegencyButton type="button" onClick={send.openNextAction}>
                  Abrir próxima
                </RegencyButton>
                <RegencyButton type="button" onClick={() => send.closeTurn()} disabled={!canCloseTurn}>
                  Fechar turno
                </RegencyButton>
                <RoundModeGroup>
                  {(["Free", "Race"] as RoundMode[]).map((mode) => (
                    <RoundModeButton
                      key={mode}
                      type="button"
                      aria-pressed={state.roundMode === mode}
                      onClick={() => send.changeRoundMode(mode)}
                    >
                      {mode}
                    </RoundModeButton>
                  ))}
                </RoundModeGroup>
              </RegencyActions>
            }
          />
        }
        rail={
          <RailNav
            items={[
              { id: "fila", label: "Fila" },
              { id: "fichas", label: "Fichas" },
            ]}
            active={railActive}
            onSelect={handleRailSelect}
          />
        }
        panel={
          railActive === "fila" ? (
            <QueuePanel
              queue={state.queue}
              nameOf={nameOf}
              onPull={send.pullAction}
              onOpenNext={send.openNextAction}
              onCloseTurn={() => send.closeTurn()}
              canCloseTurn={canCloseTurn}
            />
          ) : (
            <>
              {actorId ? (
                <>
                  <OwnBars bars={state.bars} characterId={actorId} hp={actorHp} />
                  {catalogue && (
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
                      onClearActor={() => setActorId(undefined)}
                    />
                  )}
                </>
              ) : (
                <NoActorHint>Clique num NPC no mapa para agir por ele.</NoActorHint>
              )}
            </>
          )
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
                  isMaster
                  width={width}
                  height={height}
                  npcMap={npcMap}
                  onWallClick={handleWallClick}
                  piecesInteractive
                  onPieceSelect={handlePieceSelect}
                  onPieceLongPress={handlePieceLongPress}
                  selectedPieceId={selectedPieceId}
                  targetPieceIds={targetPieceIds}
                  ghosts={Object.values(state.ghosts)}
                  onEmptySlotClick={setDestination}
                />
              ) : !map ? (
                <NoMapMessage>Nenhum mapa anexado a esta partida.</NoMapMessage>
              ) : null}
            </CanvasWrapper>
            <GeneralBar bars={state.bars} nameOf={nameOf} highlightActorId={state.openTurn?.actorId} />
            <MatchErrorBanner error={state.lastError} onDismiss={dismissError} />
          </>
        }
        aside={
          <AsideTabs
            defaultTab="historico"
            tab={asideTab}
            onTabChange={setAsideTab}
            historico={<EventStream events={state.events} nameOf={nameOf} />}
            personagens={
              <MatchCharactersSidebar
                gameStarted
                enrollments={[]}
                participants={participantsWithLiveHp}
                isMaster
                actionLoading={{}}
                onAccept={() => {}}
                onReject={() => {}}
                onSelectCharacterSheet={(sheetUuid) => navigate(`/charactersheet/${sheetUuid}`)}
              />
            }
          />
        }
      />
      <CloseTurnRefusedDialog
        payload={state.pendingCloseTurn}
        nameOf={nameOf}
        onConfirm={() => {
          send.closeTurn(true);
          dismissCloseTurnDialog();
        }}
        onCancel={dismissCloseTurnDialog}
      />
      {wallPicker && (
        <WallActionSheet
          wall={wallPicker}
          isMaster
          onClose={() => setWallPicker(null)}
          onInteract={(kind) => {
            send.masterAction({ targetIds: [wallPicker.id], interact: { kind } });
            setWallPicker(null);
          }}
          onAttack={() => {
            send.masterAction({ targetIds: [wallPicker.id], attack: {} });
            setWallPicker(null);
          }}
        />
      )}
    </>
  );
}

const NoActorHint = styled.p`
  color: ${colors.textPlaceholderStrong};
  font-family: ${fonts.sans};
  font-size: 13px;
  font-style: italic;
  padding: 12px;
`;

const RegencyActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RegencyButton = styled.button`
  font-family: ${fonts.sans};
  font-size: 12px;
  font-weight: 600;
  border: none;
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;
  background: ${colors.brandAccent};
  color: ${colors.textPrimary};

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const RoundModeGroup = styled.div`
  display: flex;
  gap: 4px;
`;

const RoundModeButton = styled.button`
  font-family: ${fonts.sans};
  font-size: 12px;
  border: none;
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;
  background: ${colors.surfaceInput};
  color: ${colors.textPlaceholderStrong};

  &[aria-pressed="true"] {
    background: ${colors.brandAccent};
    color: ${colors.textPrimary};
  }
`;
