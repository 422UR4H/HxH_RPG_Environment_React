import TacticalMapStage from "./TacticalMapStage";
import type { TacticalMap, WallSegment, FogState, SlotCoord } from "../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../types/characterSheet";
import type { SlotTriple } from "./utils/coords";
import type { IntentPreview } from "./utils/intentGeometry";

type Props = {
  map: TacticalMap;
  width: number;
  height: number;
  npcMap?: Map<string, CharacterPrivateSummary>;
  onWallClick?: (wall: WallSegment) => void;
  fog?: FogState;
  isMaster?: boolean;
  // Combat interaction (game pages only). Left undefined by any other caller —
  // piecesInteractive defaults to falsy in TacticalMapStage, so pieces stay inert.
  piecesInteractive?: boolean;
  draggablePieceIds?: Set<string>;
  onPieceSelect?: (pieceId: string) => void;
  onPieceLongPress?: (pieceId: string) => void;
  selectedPieceId?: string | null;
  inspectedPieceId?: string | null;
  targetPieceIds?: Set<string>;
  activePieceId?: string | null;
  // See stageProps.ts — game-only, explicit opt-in.
  suppressPanOnPiecePress?: boolean;
  intentPreview?: IntentPreview;
  intentGhosts?: Array<{ from?: SlotTriple; to: SlotTriple }>;
  highlightHoverSlot?: boolean;
  fitRequest?: number;
  onEmptySlotClick?: (slot: SlotCoord, clientX: number, clientY: number) => void;
  // Arrumar do mestre (F12): o mesmo arrastar e pôr do placer do lobby, só repassados.
  onPieceMove?: (pieceId: string, slot: SlotCoord) => void;
  placingNpcId?: string | null;
  onNpcPlaced?: (slot: SlotCoord) => void;
};

export default function TacticalMapViewer({
  map, width, height, npcMap, onWallClick, fog, isMaster,
  piecesInteractive, draggablePieceIds, onPieceSelect, onPieceLongPress,
  selectedPieceId, inspectedPieceId, targetPieceIds, activePieceId, onEmptySlotClick,
  suppressPanOnPiecePress, intentPreview, intentGhosts, highlightHoverSlot, fitRequest,
  onPieceMove, placingNpcId, onNpcPlaced,
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
      inspectedPieceId={inspectedPieceId}
      targetPieceIds={targetPieceIds}
      activePieceId={activePieceId}
      intentPreview={intentPreview}
      intentGhosts={intentGhosts}
      highlightHoverSlot={highlightHoverSlot}
      fitRequest={fitRequest}
      onEmptySlotClick={onEmptySlotClick}
      suppressPanOnPiecePress={suppressPanOnPiecePress}
      onPieceMove={onPieceMove}
      placingNpcId={placingNpcId}
      onNpcPlaced={onNpcPlaced}
    />
  );
}
