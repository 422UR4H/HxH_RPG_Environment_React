// A tela do mestre. Mesma mesa do jogador (`useGameTable`), com o que é do mestre: a fila,
// a regência (abrir, fechar, regime) e agir por um NPC — que ele escolhe tocando no NPC ou
// na lista do painel "Agir".
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResizeObserver } from "../hooks/useResizeObserver";
import { useCombatCatalogue } from "../hooks/useCombatCatalogue";
import { useGameTable } from "../features/match/combat/useGameTable";
import { defaultMoveCategory } from "../features/match/combat/defaultMoveCategory";
import { describeDeclared } from "../features/match/combat/combatText";
import MatchStageTemplate from "../components/templates/MatchStageTemplate";
import MatchTopBar from "../features/match/combat/MatchTopBar";
import {
  AddNpcPicker, NpcPicker, PanelSection, RegencyControls, RoundModeSwitch,
} from "../features/match/combat/MasterControls";
import { PanelTitle } from "../features/match/combat/panelStyles";
import RailNav from "../features/match/combat/RailNav";
import AsideTabs from "../features/match/combat/AsideTabs";
import GeneralBar from "../features/match/combat/GeneralBar";
import OwnBars from "../features/match/combat/OwnBars";
import EventStream from "../features/match/combat/EventStream";
import ActionComposer from "../features/match/combat/ActionComposer";
import DeclaredActions from "../features/match/combat/DeclaredActions";
import QueuePanel from "../features/match/combat/QueuePanel";
import CloseTurnRefusedDialog from "../features/match/combat/CloseTurnRefusedDialog";
import SceneChangeDialog from "../features/match/combat/SceneChangeDialog";
import { SmallButton } from "../features/match/combat/MatchTopBar";
import MatchErrorBanner from "../features/match/combat/MatchErrorBanner";
import MatchCharactersSidebar from "../features/match/MatchCharactersSidebar";
import WallActionSheet from "../features/match/WallActionSheet";
import TacticalMapViewer from "../features/tactical-map/TacticalMapViewer";
import {
  CanvasWrapper, MapCornerButton, MapHint, MapLoadingMessage, NoMapMessage,
} from "../features/match/combat/mapCanvasStyles";
import type { SlotCoord, WallSegment } from "../types/tacticalMap";

type Props = {
  token: string;
  campaignId?: string;
  matchId?: string;
};

type RailTab = "fila" | "agir";

// No jogo nenhuma peça é arrastável: quem decide onde a peça para é o servidor.
const NO_DRAG = new Set<string>();

const initialAsideOpen = () =>
  typeof window !== "undefined" && window.matchMedia?.("(min-width: 1280px)").matches === true;

export default function GameMasterPage({ token, campaignId, matchId }: Props) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { width, height } = useResizeObserver(canvasRef);
  const navigate = useNavigate();

  const [actorId, setActorId] = useState<string | undefined>(undefined);
  const [inspectedId, setInspectedId] = useState<string | undefined>(undefined);

  const game = useGameTable({ token, campaignId, matchId, isMaster: true, actorId });
  const { combat, composer, live, map, nameOf, participants } = game;
  const { state } = combat;
  const gridKind = map?.grid.kind ?? "square";

  const { data: catalogue } = useCombatCatalogue(token, actorId);

  // Só NPC (sem jogador) na partida pode ser ator do mestre — o servidor recusa o resto.
  const npcs = useMemo(
    () => participants.filter((p) => !p.characterSheet.playerUuid),
    [participants],
  );
  const npcIds = useMemo(() => new Set(npcs.map((p) => p.characterSheet.uuid)), [npcs]);

  const [railActive, setRailActive] = useState<RailTab>("fila");
  const [panelOpen, setPanelOpen] = useState(true);
  const [asideOpen, setAsideOpen] = useState(initialAsideOpen);
  const [wallPicker, setWallPicker] = useState<WallSegment | null>(null);
  const [sceneDialog, setSceneDialog] = useState(false);

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

  const chooseActor = useCallback((id: string | undefined) => {
    setActorId(id);
    setInspectedId(undefined);
    if (id) {
      setRailActive("agir");
      setPanelOpen(true);
    }
  }, []);

  const pieceCharacter = useCallback(
    (pieceId: string) => game.boardPieces.find((p) => p.id === pieceId)?.characterId,
    [game.boardPieces],
  );

  // Sem ator: tocar num NPC da partida o escolhe; tocar em outro personagem o inspeciona
  // (a aba Personagens abre nele). Com ator: tocar em alguém marca o alvo — inclusive o
  // próprio ator, que é um alvo legítimo; soltar o ator é o × do painel.
  const handlePieceTap = useCallback(
    (pieceId: string) => {
      const charId = pieceCharacter(pieceId);
      if (!charId) return;
      if (actorId) {
        composer.onCharacterTap(charId);
        return;
      }
      if (npcIds.has(charId)) {
        chooseActor(charId);
        return;
      }
      setInspectedId(charId);
    },
    [pieceCharacter, actorId, composer, npcIds, chooseActor],
  );
  const handlePieceHold = useCallback(
    (pieceId: string) => {
      const charId = pieceCharacter(pieceId);
      if (charId && actorId) composer.onCharacterHold(charId);
    },
    [pieceCharacter, actorId, composer],
  );
  const handleSlotTap = useCallback(
    (slot: SlotCoord) => {
      if (actorId) composer.onSlotTap(slot);
    },
    [actorId, composer],
  );

  useEffect(() => {
    if (!inspectedId) return;
    document.querySelector(`[data-testid="character-row-${inspectedId}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [inspectedId]);

  // HP de todo mundo: o REST do carregamento, sobreposto pelo HP ao vivo.
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

  const actorSheet = participants.find((p) => p.characterSheet.uuid === actorId)?.characterSheet;
  const actorRestHealth = actorSheet?.private?.health;
  const actorHp = actorId
    ? (state.hp[actorId] ?? (actorRestHealth ? { hp: actorRestHealth.current, maxHp: actorRestHealth.max } : undefined))
    : undefined;

  // F2: NPCs da campanha (sem jogador) que ainda não são participantes — candidatos a
  // "pôr na partida" (`add_npc`).
  const participantIds = useMemo(() => new Set(participants.map((p) => p.characterSheet.uuid)), [participants]);
  const npcCandidates = useMemo(
    () =>
      [...live.npcMap.values()]
        .filter((cs) => !cs.playerUuid && !participantIds.has(cs.uuid))
        .map((cs) => ({ id: cs.uuid, name: cs.nickName })),
    [live.npcMap, participantIds],
  );

  // Peça no tabuleiro de quem não é participante: o servidor inscreve (B11) e avisa com
  // npc_added; se o aviso se perder, rebusca — uma vez por personagem, para não virar laço.
  const refetchedFor = useRef(new Set<string>());
  useEffect(() => {
    if (!game.participantsLoaded) return;
    const orphan = game.boardPieces.find(
      (p) => p.characterId && !participantIds.has(p.characterId) && !refetchedFor.current.has(p.characterId),
    );
    if (!orphan?.characterId) return;
    refetchedFor.current.add(orphan.characterId);
    void game.refetchParticipants();
  }, [game.boardPieces, game.participantsLoaded, participantIds, game]);

  // npc_already_in_match quer dizer "o NPC está na partida" (contrato, add_npc): só rebusca.
  useEffect(() => {
    if (state.lastError?.code !== "npc_already_in_match") return;
    void game.refetchParticipants();
    combat.dismissError();
  }, [state.lastError, game, combat]);

  const inspectedPieceId = inspectedId
    ? game.boardPieces.find((p) => p.characterId === inspectedId)?.id
    : undefined;

  const describeQueued = useCallback(
    (actionId: string) => {
      const mine = state.declared.find((d) => d.id === actionId);
      return mine ? describeDeclared(mine, nameOf, gridKind) : undefined;
    },
    [state.declared, nameOf, gridKind],
  );

  const canCloseTurn = state.openTurn != null;
  const mapHint = !actorId && map ? "Toque num NPC para agir por ele." : undefined;

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
            actions={
              <RegencyControls
                mode={state.roundMode}
                onModeChange={combat.send.changeRoundMode}
                onOpenNext={combat.send.openNextAction}
                onCloseTurn={() => combat.send.closeTurn()}
                canCloseTurn={canCloseTurn}
                onNewScene={() => setSceneDialog(true)}
                canChangeScene={state.openTurn == null}
              />
            }
          />
        }
        rail={
          <RailNav
            items={[
              { id: "fila", label: "Fila", icon: "☰", badge: state.queue.length },
              { id: "agir", label: "Agir", icon: "⚔" },
            ]}
            active={railActive}
            panelOpen={panelOpen}
            onSelect={handleRailSelect}
          />
        }
        panel={
          railActive === "fila" ? (
            <>
              <PanelSection>
                <PanelTitle>Regime</PanelTitle>
                <RoundModeSwitch mode={state.roundMode} onChange={combat.send.changeRoundMode} placement="panel" />
                <SmallButton
                  type="button"
                  onClick={() => setSceneDialog(true)}
                  disabled={state.openTurn != null}
                  title={state.openTurn == null ? undefined : "Feche o turno antes de trocar de cena"}
                >
                  Nova cena
                </SmallButton>
              </PanelSection>
              <QueuePanel
                queue={state.queue}
                nameOf={nameOf}
                describe={describeQueued}
                onPull={combat.send.pullAction}
              />
            </>
          ) : (
            <>
              <NpcPicker npcs={npcs} actorId={actorId} onChoose={chooseActor} />
              <AddNpcPicker candidates={npcCandidates} onAdd={(id) => combat.send.addNpc(id)} />
              {actorId && (
                <>
                  <OwnBars bars={state.bars} characterId={actorId} hp={actorHp} />
                  <ActionComposer
                    actorName={actorSheet?.nickName ?? nameOf(actorId)}
                    onClearActor={() => chooseActor(undefined)}
                    draft={composer.draft}
                    resolved={composer.resolved}
                    verdict={composer.verdict}
                    catalogue={catalogue}
                    gridKind={gridKind}
                    defaultCategory={defaultMoveCategory(state)}
                    nameOf={nameOf}
                    onDraftChange={composer.updateDraft}
                    onDeclare={game.declare}
                    canDeclare={game.canDeclare}
                    blockedReason={game.blockedReason}
                  />
                </>
              )}
              <DeclaredActions
                declared={state.declared}
                nameOf={nameOf}
                gridKind={gridKind}
                showActor
                onHide={(id) => combat.dismissDeclared([id])}
              />
            </>
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
                  isMaster
                  width={width}
                  height={height}
                  npcMap={live.npcMap}
                  onWallClick={setWallPicker}
                  piecesInteractive
                  draggablePieceIds={NO_DRAG}
                  suppressPanOnPiecePress
                  onPieceSelect={handlePieceTap}
                  onPieceLongPress={actorId ? handlePieceHold : undefined}
                  selectedPieceId={actorId ? composer.actorPiece?.id : undefined}
                  inspectedPieceId={inspectedPieceId}
                  targetPieceIds={composer.targetPieceIds}
                  activePieceId={game.openTurnPieceId}
                  intentPreview={composer.preview}
                  intentGhosts={game.ghosts}
                  highlightHoverSlot={!!actorId}
                  fitRequest={game.fitRequest}
                  onEmptySlotClick={actorId ? handleSlotTap : undefined}
                />
              ) : !map ? (
                <NoMapMessage>Nenhum mapa anexado a esta partida.</NoMapMessage>
              ) : null}
            </CanvasWrapper>
            <GeneralBar
              bars={state.bars}
              openTurnActorId={state.openTurn?.actorId}
              nameOf={nameOf}
              highlightActorIds={npcIds}
            />
            <MatchErrorBanner
              error={state.lastError?.code === "npc_already_in_match" ? null : state.lastError}
              onDismiss={combat.dismissError}
            />
            {mapHint && <MapHint>{mapHint}</MapHint>}
            {map && <MapCornerButton type="button" onClick={game.refit}>Enquadrar</MapCornerButton>}
          </>
        }
        aside={
          <AsideTabs
            defaultTab="historico"
            historico={<EventStream events={state.events} nameOf={nameOf} gridKind={gridKind} />}
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
          combat.send.closeTurn(true);
          combat.dismissCloseTurnDialog();
        }}
        onCancel={combat.dismissCloseTurnDialog}
      />
      <SceneChangeDialog
        open={sceneDialog}
        onCancel={() => setSceneDialog(false)}
        onConfirm={(p) => { combat.send.changeScene(p); setSceneDialog(false); }}
      />
      {wallPicker && (
        <WallActionSheet
          wall={wallPicker}
          isMaster
          onClose={() => setWallPicker(null)}
          onInteract={(kind) => {
            combat.send.masterAction({ targetIds: [wallPicker.id], interact: { kind } });
            setWallPicker(null);
          }}
          // O mestre ataca uma parede POR um NPC: `enqueue_master_action` ainda não mapeia
          // `attack` (seria no-op no servidor).
          onAttack={
            actorId
              ? () => {
                  combat.send.enqueueAction(
                    { actorId, targetId: [wallPicker.id], attack: {} },
                    { fromComposer: false },
                  );
                  setWallPicker(null);
                }
              : undefined
          }
        />
      )}
    </>
  );
}

