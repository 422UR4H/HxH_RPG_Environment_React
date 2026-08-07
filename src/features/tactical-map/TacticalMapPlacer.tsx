import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";
import PieceDragGhost, { PieceDragGhostPortal } from "./PieceDragGhost";
import TacticalMapStage from "../../components/organisms/TacticalMapStage";
import NpcRosterPanel from "../../components/molecules/NpcRosterPanel";
import { useResizeObserver } from "../../hooks/useResizeObserver";
import { useCampaignDetails } from "../../hooks/useCampaignDetails";
import useToken from "../../hooks/useToken";
import type { TacticalMap, Piece, SlotCoord } from "../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../types/characterSheet";
import { isSameSlot } from "./utils/coords";

type Props = {
  map: TacticalMap;
  campaignId: string;
  pieces: Piece[];
  onPiecesChange: (pieces: Piece[]) => void;
  sendPieceMoved: (pieceId: string, slot: SlotCoord, characterId?: string, visible?: boolean, z?: number) => void;
  sendPieceRemoved?: (pieceId: string) => void;
  // undefined = all pieces draggable (master).
  // Set<string> = only listed piece IDs draggable (player with own piece).
  draggablePieceIds?: Set<string>;
  // Character sheet UUIDs the current player is allowed to place.
  // Undefined = master (no self-placement flow). Empty = player with no placeable characters.
  // TODO(multi-piece): today each player has exactly one character sheet per match, so
  // this array will contain at most one ID. When companions/pets are added, a player will
  // have N IDs (their character + each companion). The placement overlay already renders
  // one token per ID, so the UI will scale automatically — but piece-ownership validation
  // on the server (Phase 7+) and the draggablePieceIds computation in LobbyPage will need
  // to be updated to reflect the full set of pieces the player controls.
  playerCharacterIds?: string[];
};

export default function TacticalMapPlacer({
  map,
  campaignId,
  pieces,
  onPiecesChange,
  sendPieceMoved,
  sendPieceRemoved,
  draggablePieceIds,
  playerCharacterIds,
}: Props) {
  const isMaster = draggablePieceIds === undefined;

  const { token } = useToken();
  const { data: campaign } = useCampaignDetails(token, campaignId);

  const canvasRef = useRef<HTMLDivElement>(null);
  const { width, height } = useResizeObserver(canvasRef);

  const [viewportScale, setViewportScale] = useState(1);

  // --- Player self-placement state ---
  // Set when a player clicks an empty slot and has characters available to place.
  const [pendingSlot, setPendingSlot] = useState<{
    slot: SlotCoord;
    clientX: number;
    clientY: number;
  } | null>(null);

  // --- Ghost drag state (master only) ---
  // TODO: extract to useRosterDrag() when a 3rd consumer appears (YAGNI now).
  const [placingNpcId, setPlacingNpcId] = useState<string | null>(null);
  const [placingNpcData, setPlacingNpcData] = useState<CharacterPrivateSummary | null>(null);
  const [isDraggingPieceToRoster, setIsDraggingPieceToRoster] = useState(false);
  const [draggingCanvasPieceNpc, setDraggingCanvasPieceNpc] = useState<CharacterPrivateSummary | null>(null);

  const ghostRef = useRef<HTMLDivElement>(null);
  const canvasDragGhostRef = useRef<HTMLDivElement>(null);

  // Track roster-ghost pointer position
  useEffect(() => {
    if (!placingNpcId) return;
    const handleMove = (e: PointerEvent) => {
      if (ghostRef.current) {
        ghostRef.current.style.left = `${e.clientX}px`;
        ghostRef.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, [placingNpcId]);

  // Track canvas-piece-drag ghost pointer position
  useEffect(() => {
    if (!draggingCanvasPieceNpc) return;
    const handleMove = (e: PointerEvent) => {
      const ghost = canvasDragGhostRef.current;
      if (!ghost) return;
      ghost.style.left = `${e.clientX}px`;
      ghost.style.top = `${e.clientY}px`;
    };
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, [draggingCanvasPieceNpc]);

  // Set of character IDs already placed on the map
  const placedCharacterIds = useMemo(
    () => new Set(pieces.map((p) => p.characterId)),
    [pieces],
  );

  // Map uuid → CharacterPrivateSummary for PieceSprite lookup
  const npcMap = useMemo(() => {
    const m = new Map<string, CharacterPrivateSummary>();
    (campaign?.characterSheets ?? []).forEach((cs) => m.set(cs.uuid, cs));
    return m;
  }, [campaign]);

  // Characters the current player can still place (subset of playerCharacterIds not yet on board).
  const unplacedPlayerChars = useMemo(() => {
    if (!playerCharacterIds || playerCharacterIds.length === 0) return [];
    return playerCharacterIds
      .filter((id) => !placedCharacterIds.has(id))
      .map((id) => npcMap.get(id))
      .filter((cs): cs is CharacterPrivateSummary => cs != null);
  }, [playerCharacterIds, placedCharacterIds, npcMap]);

  const dragGhostSize = Math.max(44, map.grid.cellSize * 0.9 * viewportScale);

  // --- Handlers ---

  const handleNpcPointerDown = useCallback(
    (npc: CharacterPrivateSummary, _e: React.PointerEvent) => {
      setPlacingNpcId(npc.uuid);
      setPlacingNpcData(npc);
    },
    [],
  );

  const handleNpcPlacementCancel = useCallback(() => {
    setPlacingNpcId(null);
    setPlacingNpcData(null);
  }, []);

  const handleNpcPlaced = useCallback(
    (slot: SlotCoord) => {
      if (!placingNpcData) {
        setPlacingNpcId(null);
        return;
      }
      const occupied = pieces.some(
        (p) => isSameSlot(p.coord.slot, slot),
      );
      if (occupied) {
        setPlacingNpcId(null);
        setPlacingNpcData(null);
        return;
      }
      const newPiece: Piece = {
        id: crypto.randomUUID(),
        characterId: placingNpcData.uuid,
        coord: { slot, z: 0 },
        visible: true,
      };
      const next = [...pieces, newPiece];
      onPiecesChange(next);
      sendPieceMoved(newPiece.id, slot, newPiece.characterId, newPiece.visible, newPiece.coord.z);
      setPlacingNpcId(null);
      setPlacingNpcData(null);
    },
    [placingNpcData, pieces, onPiecesChange, sendPieceMoved],
  );

  const handlePieceMove = useCallback(
    (pieceId: string, slot: SlotCoord) => {
      const next = pieces.map((p) =>
        p.id === pieceId ? { ...p, coord: { ...p.coord, slot } } : p,
      );
      onPiecesChange(next);
      const movedPiece = pieces.find((p) => p.id === pieceId);
      sendPieceMoved(pieceId, slot, undefined, undefined, movedPiece?.coord.z);
    },
    [pieces, onPiecesChange, sendPieceMoved],
  );

  const handlePieceDragToRoster = useCallback(
    (pieceId: string) => {
      const next = pieces.filter((p) => p.id !== pieceId);
      onPiecesChange(next);
      sendPieceRemoved?.(pieceId);
    },
    [pieces, onPiecesChange, sendPieceRemoved],
  );

  // --- Player self-placement handlers ---

  const handleEmptySlotClick = useCallback(
    (slot: SlotCoord, clientX: number, clientY: number) => {
      if (unplacedPlayerChars.length === 0) return;
      const occupied = pieces.some(
        (p) => isSameSlot(p.coord.slot, slot),
      );
      if (occupied) return;
      setPendingSlot({ slot, clientX, clientY });
    },
    [unplacedPlayerChars.length, pieces],
  );

  const handlePlayerPlace = useCallback(
    (characterId: string) => {
      if (!pendingSlot) return;
      const newPiece: Piece = {
        id: crypto.randomUUID(),
        characterId,
        coord: { slot: pendingSlot.slot, z: 0 },
        visible: true,
      };
      onPiecesChange([...pieces, newPiece]);
      sendPieceMoved(newPiece.id, pendingSlot.slot, newPiece.characterId, newPiece.visible, newPiece.coord.z);
      setPendingSlot(null);
    },
    [pendingSlot, pieces, onPiecesChange, sendPieceMoved],
  );

  // Dismiss placement overlay on Escape
  useEffect(() => {
    if (!pendingSlot) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPendingSlot(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingSlot]);

  return (
    <PlacerRoot data-testid="tactical-map-placer">
      <CanvasArea ref={canvasRef}>
        {width > 0 && height > 0 && (
          <TacticalMapStage
            map={{ ...map, pieces }}
            width={width}
            height={height}
            piecesInteractive={true}
            draggablePieceIds={draggablePieceIds}
            walls={map.walls}
            npcMap={npcMap}
            placingNpcId={isMaster ? placingNpcId : null}
            onNpcPlaced={isMaster ? handleNpcPlaced : undefined}
            onNpcPlacementCancel={isMaster ? handleNpcPlacementCancel : undefined}
            onPieceMove={handlePieceMove}
            onPieceDragToRoster={isMaster ? handlePieceDragToRoster : undefined}
            onPieceDragStart={(_pieceId, npc) => {
              if (isMaster) setIsDraggingPieceToRoster(true);
              setDraggingCanvasPieceNpc(npc ?? null);
            }}
            onPieceDragEnd={() => {
              if (isMaster) setIsDraggingPieceToRoster(false);
              setDraggingCanvasPieceNpc(null);
            }}
            onEmptySlotClick={!isMaster ? handleEmptySlotClick : undefined}
            onViewportScaleChange={setViewportScale}
          />
        )}
      </CanvasArea>

      {isMaster && (
        <RosterSidebar>
          <NpcRosterPanel
            campaignId={campaignId}
            placedCharacterIds={placedCharacterIds}
            placingNpcId={placingNpcId}
            isDropTarget={isDraggingPieceToRoster}
            onPointerDownNpc={handleNpcPointerDown}
            includePlayerChars={true}
          />
        </RosterSidebar>
      )}

      {/* Ghost drag from roster → canvas (master only) */}
      {isMaster && placingNpcId && placingNpcData && (
        <PieceDragGhostPortal
          ghostRef={ghostRef}
          size={dragGhostSize}
          avatarUrl={placingNpcData.avatarUrl}
        />
      )}

      {/* Ghost drag from canvas (master and player own pieces) */}
      {draggingCanvasPieceNpc && (
        <PieceDragGhostPortal
          ghostRef={canvasDragGhostRef}
          size={dragGhostSize}
          avatarUrl={draggingCanvasPieceNpc.avatarUrl}
        />
      )}

      {/* Player self-placement overlay: appears when a player clicks an empty slot
          and has unplaced character(s). Shows one token per placeable character. */}
      {!isMaster && pendingSlot && unplacedPlayerChars.length > 0 &&
        createPortal(
          <PlacementOverlay style={{ left: pendingSlot.clientX, top: pendingSlot.clientY }}>
            <PlacementLabel>Adicionar aqui?</PlacementLabel>
            <PlacementTokenRow>
              {unplacedPlayerChars.map((cs) => (
                <PlacementTokenBtn
                  key={cs.uuid}
                  $size={dragGhostSize}
                  onClick={() => handlePlayerPlace(cs.uuid)}
                  title={cs.nickName}
                >
                  <PieceDragGhost avatarUrl={cs.avatarUrl} />
                </PlacementTokenBtn>
              ))}
            </PlacementTokenRow>
            <PlacementCancel onClick={() => setPendingSlot(null)}>Cancelar</PlacementCancel>
          </PlacementOverlay>,
          document.body,
        )}
    </PlacerRoot>
  );
}

// --- Styled components ---

const PlacerRoot = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const CanvasArea = styled.div`
  flex: 1;
  min-width: 0;
  height: 100%;
`;

const RosterSidebar = styled.div`
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

// --- Player self-placement overlay ---

const PlacementOverlay = styled.div`
  position: fixed;
  transform: translate(-50%, calc(-100% - 14px));
  z-index: 9998;
  background: ${colors.grayBgModal};
  border: 1px solid ${colors.borderInput};
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  box-shadow: 0 6px 28px rgba(0, 0, 0, 0.6);
  pointer-events: auto;
`;

const PlacementLabel = styled.span`
  font-family: ${fonts.sans};
  font-size: 11px;
  letter-spacing: 0.06em;
  color: ${colors.textMuted};
  text-transform: uppercase;
  white-space: nowrap;
`;

const PlacementTokenRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const PlacementTokenBtn = styled.button<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  background: none;
  border: 2px solid transparent;
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;

  &:hover {
    border-color: ${colors.brandAccent};
    transform: scale(1.1);
  }
  &:active {
    transform: scale(0.95);
  }
`;

const PlacementCancel = styled.button`
  font-family: ${fonts.sans};
  font-size: 11px;
  color: ${colors.textPlaceholderStrong};
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;

  &:hover {
    color: ${colors.textMuted};
  }
`;
