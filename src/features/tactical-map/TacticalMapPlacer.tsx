import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import avatarPlaceholderUrl from "../../assets/placeholder/avatar.png";
import gungiFrameUrl from "../../assets/icons/gungi.svg";
import TacticalMapStage from "../../components/organisms/TacticalMapStage";
import NpcRosterPanel from "../../components/molecules/NpcRosterPanel";
import { useResizeObserver } from "../../hooks/useResizeObserver";
import { useCampaignDetails } from "../../hooks/useCampaignDetails";
import useToken from "../../hooks/useToken";
import type { TacticalMap, Piece, SlotCoord } from "../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../types/characterSheet";

type Props = {
  map: TacticalMap;
  campaignId: string;
  pieces: Piece[];
  onPiecesChange: (pieces: Piece[]) => void;
  sendPieceMoved: (pieceId: string, slot: SlotCoord) => void;
  // undefined = all pieces draggable (master).
  // Set<string> = only listed piece IDs draggable (player with own piece).
  draggablePieceIds?: Set<string>;
};

export default function TacticalMapPlacer({
  map,
  campaignId,
  pieces,
  onPiecesChange,
  sendPieceMoved,
  draggablePieceIds,
}: Props) {
  const isMaster = draggablePieceIds === undefined;

  const { token } = useToken();
  const { data: campaign } = useCampaignDetails(token, campaignId);

  const canvasRef = useRef<HTMLDivElement>(null);
  const { width, height } = useResizeObserver(canvasRef);

  const [viewportScale, setViewportScale] = useState(1);

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
        (p) => JSON.stringify(p.coord.slot) === JSON.stringify(slot),
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
      sendPieceMoved(newPiece.id, slot);
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
      sendPieceMoved(pieceId, slot);
    },
    [pieces, onPiecesChange, sendPieceMoved],
  );

  const handlePieceDragToRoster = useCallback(
    (pieceId: string) => {
      // Removal is not WS-synced in Phase 6. TODO: add lobby_piece_removed WS event (Phase 7+)
      const next = pieces.filter((p) => p.id !== pieceId);
      onPiecesChange(next);
    },
    [pieces, onPiecesChange],
  );

  return (
    <PlacerRoot data-testid="tactical-map-placer">
      <CanvasArea ref={canvasRef}>
        {width > 0 && height > 0 && (
          <TacticalMapStage
            map={map}
            width={width}
            height={height}
            piecesInteractive={true}
            draggablePieceIds={draggablePieceIds}
            npcMap={npcMap}
            placingNpcId={isMaster ? placingNpcId : null}
            onNpcPlaced={isMaster ? handleNpcPlaced : undefined}
            onNpcPlacementCancel={isMaster ? handleNpcPlacementCancel : undefined}
            onPieceMove={handlePieceMove}
            onPieceDragToRoster={isMaster ? handlePieceDragToRoster : undefined}
            onPieceDragStart={
              isMaster
                ? (_pieceId, npc) => {
                    setIsDraggingPieceToRoster(true);
                    setDraggingCanvasPieceNpc(npc ?? null);
                  }
                : undefined
            }
            onPieceDragEnd={
              isMaster
                ? () => {
                    setIsDraggingPieceToRoster(false);
                    setDraggingCanvasPieceNpc(null);
                  }
                : undefined
            }
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
          />
        </RosterSidebar>
      )}

      {/* Ghost drag from roster → canvas (master only) */}
      {isMaster && placingNpcId && placingNpcData &&
        createPortal(
          <div ref={ghostRef} style={ghostStyle(dragGhostSize)}>
            <PieceDragGhost avatarUrl={placingNpcData.avatarUrl} />
          </div>,
          document.body,
        )}

      {/* Ghost drag from canvas → roster (master only) */}
      {isMaster && draggingCanvasPieceNpc &&
        createPortal(
          <div ref={canvasDragGhostRef} style={ghostStyle(dragGhostSize)}>
            <PieceDragGhost avatarUrl={draggingCanvasPieceNpc.avatarUrl} />
          </div>,
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

// --- Ghost helpers (mirrors TacticalMapEditor) ---

// size = on-screen token diameter (px). The ghost is lifted to 1.2× so it
// reads as "picked up" — slightly larger than the token resting on the board —
// with a large, diffuse shadow offset below for depth (mirrors the old Pixi
// lift). Shadow blur/offset scale with size so it stays proportional at any zoom.
function ghostStyle(size: number): CSSProperties {
  return {
    position: "fixed",
    pointerEvents: "none",
    zIndex: 9999,
    transform: "translate(-50%, -50%) scale(1.2)",
    width: size,
    height: size,
    filter: `drop-shadow(0 ${Math.round(size * 0.22)}px ${Math.round(size * 0.36)}px rgba(0,0,0,0.55))`,
  };
}

// Floating cursor-follower shown during any piece drag (roster→canvas and
// canvas→roster). Mirrors the Pixi token layering: gungi frame as the base,
// avatar as a 70%-size circle centered on top.
function PieceDragGhost({ avatarUrl }: { avatarUrl: string | null | undefined }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <img
        src={gungiFrameUrl}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        alt=""
      />
      <img
        src={avatarUrl ?? avatarPlaceholderUrl}
        style={{
          position: "absolute",
          top: "15%",
          left: "15%",
          width: "70%",
          height: "70%",
          objectFit: "cover",
          borderRadius: "50%",
        }}
        alt=""
      />
    </div>
  );
}
