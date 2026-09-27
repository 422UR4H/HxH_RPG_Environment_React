// A tela do jogador. Orquestra: dados e socket vêm de `useGameTable`; aqui fica só o que é
// do jogador — o ator é o próprio personagem, e um toque no mapa compõe a ação dele.
import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useUser from "../hooks/useUser";
import { useMatchParticipants } from "../hooks/useMatchParticipants";
import { useResizeObserver } from "../hooks/useResizeObserver";
import { useCombatCatalogue } from "../hooks/useCombatCatalogue";
import { useCharacterSheet } from "../hooks/useCharacterSheet";
import { useGameTable } from "../features/match/combat/useGameTable";
import { defaultMoveCategory } from "../features/match/combat/defaultMoveCategory";
import MatchStageTemplate from "../components/templates/MatchStageTemplate";
import MatchTopBar from "../features/match/combat/MatchTopBar";
import RailNav from "../features/match/combat/RailNav";
import AsideTabs from "../features/match/combat/AsideTabs";
import GeneralBar from "../features/match/combat/GeneralBar";
import OwnBars from "../features/match/combat/OwnBars";
import EventStream from "../features/match/combat/EventStream";
import ActionComposer from "../features/match/combat/ActionComposer";
import DeclaredActions from "../features/match/combat/DeclaredActions";
import MatchErrorBanner from "../features/match/combat/MatchErrorBanner";
import MatchCharactersSidebar from "../features/match/MatchCharactersSidebar";
import { PanelMessage } from "../features/match/combat/panelStyles";
import WallActionSheet from "../features/match/WallActionSheet";
import TacticalMapViewer from "../features/tactical-map/TacticalMapViewer";
import {
  CanvasWrapper, MapCornerButton, MapLoadingMessage, NoMapMessage,
} from "../features/match/combat/mapCanvasStyles";
import type { SlotCoord, WallSegment } from "../types/tacticalMap";

type Props = {
  token: string;
  campaignId?: string;
  matchId?: string;
};

// No jogo nenhuma peça é arrastável: quem decide onde a peça para é o servidor. Um Set
// vazio (e não `undefined`, que o PiecesLayer lê como "tudo arrastável", o modo editor).
const NO_DRAG = new Set<string>();

const initialAsideOpen = () =>
  typeof window !== "undefined" && window.matchMedia?.("(min-width: 1280px)").matches === true;

export default function GamePlayerPage({ token, campaignId, matchId }: Props) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { width, height } = useResizeObserver(canvasRef);
  const navigate = useNavigate();

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

  const game = useGameTable({ token, campaignId, matchId, isMaster: false, actorId });
  const { combat, composer, live, map, nameOf } = game;
  const { state } = combat;

  const { data: catalogue } = useCombatCatalogue(token, actorId);
  const { data: ownSheet } = useCharacterSheet(token, actorId);
  const actorName = myCharacters.find((p) => p.characterSheet.uuid === actorId)?.characterSheet.nickName ?? "Você";

  const [wallPicker, setWallPicker] = useState<WallSegment | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [asideOpen, setAsideOpen] = useState(initialAsideOpen);

  const pieceCharacter = useCallback(
    (pieceId: string) => game.boardPieces.find((p) => p.id === pieceId)?.characterId,
    [game.boardPieces],
  );

  const handlePieceTap = useCallback(
    (pieceId: string) => {
      const charId = pieceCharacter(pieceId);
      if (!charId || !actorId) return;
      composer.onCharacterTap(charId);
      setPanelOpen(true);
    },
    [pieceCharacter, actorId, composer],
  );
  const handlePieceHold = useCallback(
    (pieceId: string) => {
      const charId = pieceCharacter(pieceId);
      if (!charId || !actorId) return;
      composer.onCharacterHold(charId);
      setPanelOpen(true);
    },
    [pieceCharacter, actorId, composer],
  );
  const handleSlotTap = useCallback(
    (slot: SlotCoord) => {
      if (!actorId) return;
      composer.onSlotTap(slot);
      setPanelOpen(true);
    },
    [actorId, composer],
  );

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

  const myActorIds = useMemo(() => new Set(myCharacters.map((p) => p.characterSheet.uuid)), [myCharacters]);
  const actorChoices = useMemo(
    () => myCharacters.map((p) => ({ id: p.characterSheet.uuid, name: p.characterSheet.nickName })),
    [myCharacters],
  );

  return (
    <>
      <MatchStageTemplate
        panelOpen={panelOpen}
        asideOpen={asideOpen}
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
            items={[{ id: "acao", label: "Ação", icon: "⚔" }]}
            active="acao"
            panelOpen={panelOpen}
            onSelect={() => setPanelOpen((o) => !o)}
          />
        }
        panel={
          actorId ? (
            <>
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
              />
              <DeclaredActions
                declared={state.declared}
                nameOf={nameOf}
                gridKind={map?.grid.kind ?? "square"}
                onHide={(id) => combat.dismissDeclared([id])}
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
                <MapLoadingMessage>Carregando mapa...</MapLoadingMessage>
              ) : map && width > 0 && height > 0 ? (
                <TacticalMapViewer
                  map={{ ...map, walls: live.liveWalls, pieces: game.boardPieces }}
                  fog={live.fog}
                  isMaster={false}
                  width={width}
                  height={height}
                  npcMap={live.npcMap}
                  onWallClick={setWallPicker}
                  piecesInteractive
                  draggablePieceIds={NO_DRAG}
                  suppressPanOnPiecePress
                  onPieceSelect={handlePieceTap}
                  onPieceLongPress={handlePieceHold}
                  selectedPieceId={composer.actorPiece?.id}
                  targetPieceIds={composer.targetPieceIds}
                  activePieceId={game.openTurnPieceId}
                  intentPreview={composer.preview}
                  intentGhosts={game.ghosts}
                  highlightHoverSlot={!!actorId}
                  fitRequest={game.fitRequest}
                  onEmptySlotClick={handleSlotTap}
                />
              ) : !map ? (
                <NoMapMessage>Nenhum mapa anexado a esta partida.</NoMapMessage>
              ) : null}
            </CanvasWrapper>
            <GeneralBar
              bars={state.bars}
              openTurnActorId={state.openTurn?.actorId}
              nameOf={nameOf}
              highlightActorIds={myActorIds}
            />
            <MatchErrorBanner error={state.lastError} onDismiss={combat.dismissError} />
            {map && <MapCornerButton type="button" onClick={game.refit}>Enquadrar</MapCornerButton>}
          </>
        }
        aside={
          <AsideTabs
            defaultTab="historico"
            historico={
              <EventStream events={state.events} nameOf={nameOf} gridKind={map?.grid.kind ?? "square"} />
            }
            personagens={
              <MatchCharactersSidebar
                gameStarted
                enrollments={[]}
                participants={visibleParticipants}
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
            combat.send.enqueueAction(
              { actorId, targetId: [wallPicker.id], interact: { kind } },
              { fromComposer: false },
            );
            setWallPicker(null);
          }}
          onAttack={() => {
            // Sem arma escolhida o servidor lê a proficiência de Fist; sem `hit`: o acerto é
            // derivado (Accuracy + proficiência).
            combat.send.enqueueAction(
              { actorId, targetId: [wallPicker.id], attack: {} },
              { fromComposer: false },
            );
            setWallPicker(null);
          }}
        />
      )}
    </>
  );
}

