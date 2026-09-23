import TacticalMapStage from "./TacticalMapStage";
import type { TacticalMap, WallSegment, FogState, SlotCoord } from "../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../types/characterSheet";

type Props = {
  map: TacticalMap;
  width: number;
  height: number;
  npcMap?: Map<string, CharacterPrivateSummary>;
  onWallClick?: (wall: WallSegment) => void;
  fog?: FogState;
  isMaster?: boolean;
  // Combat piece interaction (Fase 6, §6/§7.1): the game pages (GamePlayerPage/
  // GameMasterPage) wire these to select the acting piece and mark targets.
  // Left undefined/false by any caller that doesn't pass them — piecesInteractive
  // defaults to falsy in TacticalMapStage, so pieces stay non-interactive as before.
  piecesInteractive?: boolean;
  draggablePieceIds?: Set<string>;
  onPieceSelect?: (pieceId: string) => void;
  onPieceLongPress?: (pieceId: string) => void;
  selectedPieceId?: string | null;
  targetPieceIds?: Set<string>;
  // The declared-intent ghost (§8) — forwarded straight through to GhostLayer
  // via TacticalMapStage/ViewportInner.
  ghosts?: Array<{ from: [number, number, number]; to: [number, number, number] }>;
  onEmptySlotClick?: (slot: SlotCoord, clientX: number, clientY: number) => void;
};

export default function TacticalMapViewer({
  map, width, height, npcMap, onWallClick, fog, isMaster,
  piecesInteractive, draggablePieceIds, onPieceSelect, onPieceLongPress,
  selectedPieceId, targetPieceIds, ghosts, onEmptySlotClick,
}: Props) {
  return (
    <TacticalMapStage
      map={map}
      width={width}
      height={height}
      npcMap={npcMap}
      walls={map.walls}
      onWallClick={onWallClick}
      fog={fog}
      fogDisabled={!!isMaster || !fog}
      piecesInteractive={piecesInteractive}
      draggablePieceIds={draggablePieceIds}
      onPieceSelect={onPieceSelect}
      onPieceLongPress={onPieceLongPress}
      selectedPieceId={selectedPieceId}
      targetPieceIds={targetPieceIds}
      ghosts={ghosts}
      onEmptySlotClick={onEmptySlotClick}
    />
  );
}
