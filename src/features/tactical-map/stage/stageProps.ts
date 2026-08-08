import type { TacticalMap, GridShape, SlotCoord, BgImage, FogState } from "../../../types/tacticalMap";
import type { WallSegment, WallType, WallMaterial } from "../../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../../types/characterSheet";
import type { Selection, ToolKind } from "../store/editorStore";

export type TacticalMapStageProps = {
  map: TacticalMap;
  width: number;
  height: number;
  clampToGrid?: boolean;
  bgInteractive?: boolean;
  onBgPositionChange?: (x: number, y: number) => void;
  piecesInteractive?: boolean;
  // undefined = all pieces draggable (editor mode).
  // Set<string> = only listed piece IDs draggable (lobby placer mode).
  draggablePieceIds?: Set<string>;
  selection?: Selection;
  npcMap?: Map<string, CharacterPrivateSummary>;
  placingNpcId?: string | null;
  onPieceSelect?: (pieceId: string) => void;
  onPieceMove?: (pieceId: string, slot: SlotCoord) => void;
  onPieceDragToRoster?: (pieceId: string) => void;
  onPieceDragStart?: (pieceId: string, npc: CharacterPrivateSummary | undefined) => void;
  onPieceDragEnd?: () => void;
  onNpcPlaced?: (slot: SlotCoord) => void;
  onNpcPlacementCancel?: () => void;
  onStageDeselect?: () => void;
  // Fires when the player clicks on an empty (no piece) in-bounds grid slot.
  // clientX/clientY are page-level coordinates for positioning a DOM overlay.
  // Only fires when no piece drag is in progress.
  onEmptySlotClick?: (slot: SlotCoord, clientX: number, clientY: number) => void;
  // Current viewport zoom (world→screen scale). Lets the DOM drag ghost in
  // TacticalMapEditor size itself to match the on-screen token size.
  onViewportScaleChange?: (scale: number) => void;
  onBgLoadingChange?: (loading: boolean) => void;
  // True while a fresh image is being compressed + uploaded to R2 in the
  // sidebar (BgImagePanel). This phase happens BEFORE bg.url changes, so the
  // internal isBgLoading (texture load) can't cover it — the canvas overlay
  // is driven by this flag too.
  uploading?: boolean;
  activeTool?: ToolKind;
  onBgChange?: (bg: NonNullable<BgImage>) => void;
  onGridChange?: (grid: GridShape) => void;
  // Bracket a canvas drag (bg move + handle drags) as one undo step.
  onDragGestureStart?: () => void;
  onDragGestureEnd?: () => void;
  walls?: WallSegment[];
  wallsInteractive?: boolean;
  selectedWallId?: string | null;
  activeWallType?: WallType;
  activeMaterial?: WallMaterial;
  onWallSelect?: (id: string | null) => void;
  onDrawComplete?: (segments: WallSegment[]) => void;
  onWallEndpointDrag?: (wallId: string, point: "p1" | "p2", localPos: [number, number]) => void;
  drawingEnabled?: boolean;
  onExitWallsDrawMode?: () => void;
  onWallClick?: (wall: WallSegment) => void;
  fog?: FogState;
  fogDisabled?: boolean; // true for master / editor
  worldWidth?: number;
  worldHeight?: number;
};
