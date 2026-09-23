// src/pages/GamePlayerPage.tsx
//
// A tela do jogador (Fase 6, Tarefa 12). Thin orchestrator: busca dados (hooks), liga o
// socket via `useMatchCombat` e compõe `MatchStageTemplate` + organismos. Nenhum
// componente abaixo desta página recebe `isMaster` (I2) — a única exceção declarada é
// `WallActionSheet` (R23), porque o menu de parede tem verbos diferentes por papel.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import useUser from "../hooks/useUser";
import { useMatchMap } from "../hooks/useMatchMap";
import { useMap } from "../hooks/useMap";
import { useMatchParticipants } from "../hooks/useMatchParticipants";
import { useCampaignDetails } from "../hooks/useCampaignDetails";
import { useCombatCatalogue } from "../hooks/useCombatCatalogue";
import { useResizeObserver } from "../hooks/useResizeObserver";
import { useMatchCombat } from "../features/match/combat/useMatchCombat";
import { loadDraft, saveDraft, clearDraft, migrateTargets, emptyDraft } from "../features/match/combat/actionDraft";
import type { ActionDraft } from "../features/match/combat/actionDraft";
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
import { colors, fonts } from "../styles/tokens";
import type { CharacterPrivateSummary } from "../types/characterSheet";
import type { FogState, Piece, PieceCoord, SlotCoord, WallSegment } from "../types/tacticalMap";

type Props = {
  token: string;
  campaignId?: string;
  matchId?: string;
};

function slotToTuple(coord: PieceCoord): [number, number, number] {
  const s = coord.slot;
  return s.kind === "square" ? [s.col, s.row, coord.z] : [s.q, s.r, coord.z];
}

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

  // ─── Rascunho persistente (por partida + ator) ───────────────────────────
  const [draft, setDraft] = useState<ActionDraft>(emptyDraft());
  const draftLoadedFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!matchId || !actorId || draftLoadedFor.current === actorId) return;
    draftLoadedFor.current = actorId;
    setDraft(loadDraft(matchId, actorId));
  }, [matchId, actorId]);

  const updateDraft = useCallback(
    (next: ActionDraft) => {
      setDraft(next);
      if (matchId && actorId) saveDraft(matchId, actorId, next);
    },
    [matchId, actorId],
  );

  // ─── Mapa ao vivo: paredes/peças/fog só chegam pelo WS (comentário em
  // visibleBoardPieces explica por quê o jogador nunca semeia do REST) ──────
  const [liveWalls, setLiveWalls] = useState<WallSegment[]>([]);
  const [livePieces, setLivePieces] = useState<Piece[] | null>(null);
  const [fog, setFog] = useState<FogState>({ fogMode: "explored", visiblePolygons: [] });
  const [wallPicker, setWallPicker] = useState<WallSegment | null>(null);

  useEffect(() => {
    if (!map) return;
    setFog((f) => ({ ...f, fogMode: map.fogMode ?? "explored" }));
  }, [map]);

  const handleWallStateChanged = useCallback((wallId: string, open: boolean, locked: boolean) => {
    setLiveWalls((prev) => prev.map((w) => (w.id === wallId ? { ...w, open, locked } : w)));
  }, []);

  const handleWallHpChanged = useCallback(
    (wallId: string, hp: number, maxHp: number, destroyed: boolean) => {
      setLiveWalls((prev) =>
        prev.map((w) => (w.id === wallId ? { ...w, hp, maxHp, destroyed } : w)),
      );
    },
    [],
  );

  const handleMapFullState = useCallback(
    (s: {
      pieces: Piece[];
      walls: WallSegment[];
      visiblePolygons: Array<Array<[number, number]>>;
      fogMode: "live" | "explored";
    }) => {
      setLiveWalls(s.walls);
      setLivePieces(s.pieces);
      setFog({ fogMode: s.fogMode, visiblePolygons: s.visiblePolygons });
    },
    [],
  );

  const handleVisibilityUpdated = useCallback((polys: Array<Array<[number, number]>>) => {
    setFog((f) => ({ ...f, visiblePolygons: polys }));
  }, []);

  const handleWallRevealed = useCallback((wall: WallSegment) => {
    setLiveWalls((prev) => prev.map((w) => (w.id === wall.id ? wall : w)));
  }, []);

  // ─── Combate ──────────────────────────────────────────────────────────────
  const { state, status, send, dismissError } = useMatchCombat({
    matchUuid: matchId,
    token,
    isMaster: false,
    onWallStateChanged: handleWallStateChanged,
    onWallHpChanged: handleWallHpChanged,
    onMapFullState: handleMapFullState,
    onVisibilityUpdated: handleVisibilityUpdated,
    onWallRevealed: handleWallRevealed,
    onActionEnqueued: () => {
      if (!matchId || !actorId) return;
      clearDraft(matchId, actorId);
      setDraft(emptyDraft());
    },
  });

  const nameOf = useCallback(
    (id: string) =>
      participants.find((p) => p.characterSheet.uuid === id)?.characterSheet.nickName ?? id,
    [participants],
  );

  const boardPieces = visibleBoardPieces(livePieces, map?.pieces, false);

  const characterIdByPieceId = useMemo(
    () => new Map(boardPieces.map((p) => [p.id, p.characterId] as const)),
    [boardPieces],
  );
  const pieceIdsByCharacterId = useMemo(() => {
    const m = new Map<string, string[]>();
    boardPieces.forEach((p) => {
      const arr = m.get(p.characterId) ?? [];
      arr.push(p.id);
      m.set(p.characterId, arr);
    });
    return m;
  }, [boardPieces]);

  const targetPieceIds = useMemo(() => {
    const s = new Set<string>();
    draft.targets.forEach((charId) =>
      (pieceIdsByCharacterId.get(charId) ?? []).forEach((id) => s.add(id)),
    );
    return s;
  }, [draft.targets, pieceIdsByCharacterId]);

  const actorPiece = actorId ? boardPieces.find((p) => p.characterId === actorId) : undefined;
  const actorSlot = actorPiece ? slotToTuple(actorPiece.coord) : undefined;

  // Clicar numa peça marca alvo (troca a lista, migrando arma/movimento — R4); segurar
  // marca mais de um (alterna). Alvejar a própria peça é legítimo e não desfaz nada.
  const handlePieceSelect = useCallback(
    (pieceId: string) => {
      const charId = characterIdByPieceId.get(pieceId);
      if (!charId) return;
      updateDraft(migrateTargets(draft, [charId]));
    },
    [characterIdByPieceId, draft, updateDraft],
  );

  const handlePieceLongPress = useCallback(
    (pieceId: string) => {
      const charId = characterIdByPieceId.get(pieceId);
      if (!charId) return;
      const already = draft.targets.includes(charId);
      const next = already
        ? draft.targets.filter((t) => t !== charId)
        : [...draft.targets, charId];
      updateDraft(migrateTargets(draft, next));
    },
    [characterIdByPieceId, draft, updateDraft],
  );

  const handleEmptySlotClick = useCallback(
    (slot: SlotCoord) => {
      const category = draft.move?.category ?? defaultMoveCategory(state);
      const z = actorPiece?.coord.z ?? 0;
      const to: [number, number, number] =
        slot.kind === "square" ? [slot.col, slot.row, z] : [slot.q, slot.r, z];
      updateDraft({ ...draft, move: { category, to } });
    },
    [draft, actorPiece, state, updateDraft],
  );

  const handleWallClick = useCallback((wall: WallSegment) => setWallPicker(wall), []);

  const npcMap = useMemo(() => {
    const m = new Map<string, CharacterPrivateSummary>();
    (campaign?.characterSheets ?? []).forEach((cs) => m.set(cs.uuid, cs));
    return m;
  }, [campaign]);

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
                  onPieceSelect={handlePieceSelect}
                  onPieceLongPress={handlePieceLongPress}
                  targetPieceIds={targetPieceIds}
                  ghosts={Object.values(state.ghosts)}
                  onEmptySlotClick={handleEmptySlotClick}
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
      {wallPicker && (
        <WallActionSheet
          wall={wallPicker}
          isMaster={false}
          onClose={() => setWallPicker(null)}
          onInteract={(kind) => {
            send.wallAction({ targetId: [wallPicker.id], interact: { kind } });
            setWallPicker(null);
          }}
          onAttack={() => {
            send.wallAction({ targetId: [wallPicker.id], attack: {} });
            setWallPicker(null);
          }}
        />
      )}
    </>
  );
}

const CanvasWrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MapLoadingMessage = styled.p`
  color: ${colors.textMuted};
  font-family: ${fonts.sans};
  font-size: 16px;
  text-align: center;
  padding: 24px;
`;

const NoMapMessage = styled.p`
  color: ${colors.textDisabled};
  font-family: ${fonts.sans};
  font-size: 16px;
  text-align: center;
  padding: 24px;
`;
