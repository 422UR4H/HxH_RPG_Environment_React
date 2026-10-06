import type { TacticalMap, GridShape, SlotCoord, BgImage, FogState } from "../../../types/tacticalMap";
import type { WallSegment, WallType, WallMaterial } from "../../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../../types/characterSheet";
import type { Selection, ToolKind } from "../store/editorStore";
import type { SlotTriple } from "../utils/coords";
import type { IntentPreview } from "../utils/intentGeometry";
import type { ViewportTransform } from "../utils/screenAnchor";

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
  // F1 batch 2 (Important): explicit game-only opt-in — a piece press should suppress
  // ViewportInner's pan-on-press even when the piece itself isn't draggable (the server
  // decides where it lands in game, I1). Only GamePlayerPage/GameMasterPage pass this;
  // the lobby editor/placer never do, even though they wire onPieceSelect too, because a
  // lobby player pressing ANOTHER player's (non-draggable) piece must still be able to
  // drag-to-pan the camera off of that press — inferring this from onPieceLongPress/
  // onPieceSelect broke exactly that (and F7 makes onPieceLongPress conditional on the
  // master having an actor selected, so it can't be the signal either).
  suppressPanOnPiecePress?: boolean;
  selection?: Selection;
  npcMap?: Map<string, CharacterPrivateSummary>;
  placingNpcId?: string | null;
  onPieceSelect?: (pieceId: string) => void;
  // Long-press (450ms) or right-click shortcut on a piece — §7.1: the same
  // gesture the game uses to mark multiple combat targets.
  onPieceLongPress?: (pieceId: string) => void;
  selectedPieceId?: string | null;
  // F7 (M1): a distinct ring for "looking at this piece's sheet" vs. "this piece is the
  // acting actor" (selectedPieceId) — the master inspecting a piece he doesn't control
  // must not look like he selected it as his actor.
  inspectedPieceId?: string | null;
  targetPieceIds?: Set<string>;
  onPieceMove?: (pieceId: string, slot: SlotCoord) => void;
  // Combat intent (game only): the action being composed (destination slot, attack lines)
  // and the moves already declared that have not happened yet (translucent ghost + arrow).
  intentPreview?: IntentPreview;
  intentGhosts?: Array<{ from?: SlotTriple; to: SlotTriple }>;
  // The piece whose turn is open — its own ring, so everyone sees whose turn it is.
  activePieceId?: string | null;
  // Game only: outline the empty slot under the pointer — what a tap would choose.
  highlightHoverSlot?: boolean;
  // Game only: fit the whole grid on screen on mount, and again whenever this changes.
  fitRequest?: number;
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
  // Game only: the viewport framing (pan + zoom), emitted whenever it changes — the HTML
  // layer anchors things on the pieces through it (reaction buttons, balloons).
  onViewportTransform?: (t: ViewportTransform) => void;
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
