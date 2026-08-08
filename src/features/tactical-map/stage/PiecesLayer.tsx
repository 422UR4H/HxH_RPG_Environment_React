import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApplication } from "@pixi/react";
import { Rectangle } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import type { TacticalMap, SlotCoord } from "../../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../../types/characterSheet";
import type { Selection } from "../store/editorStore";
import { worldToSlot, isSlotInBounds, slotCorners, isSameSlot } from "../utils/coords";
import PieceSprite from "./PieceSprite";

// No containerRef: piece position is driven by React state (dragWorldPos) to
// avoid @pixi/react reconciler overwriting imperative position.set() calls.
type PieceLocalDragState = {
  pieceId: string;
  startScreen: { x: number; y: number };
  isDragging: boolean;
  currentSlot: SlotCoord | null;
} | null;

export default function PiecesLayer({
  map, vpRef, piecesInteractive, draggablePieceIds, selection, npcMap, pieceDragActiveRef,
  onPieceSelect, onPieceMove, onPieceDragToRoster, onPieceDragStart, onPieceDragEnd, onStageDeselect,
  onEmptySlotClick,
}: {
  map: TacticalMap;
  vpRef: React.MutableRefObject<Viewport | null>;
  piecesInteractive?: boolean;
  draggablePieceIds?: Set<string>;
  selection?: Selection;
  npcMap?: Map<string, CharacterPrivateSummary>;
  pieceDragActiveRef: React.MutableRefObject<boolean>;
  onPieceSelect?: (pieceId: string) => void;
  onPieceMove?: (pieceId: string, slot: SlotCoord) => void;
  onPieceDragToRoster?: (pieceId: string) => void;
  onPieceDragStart?: (pieceId: string, npc: CharacterPrivateSummary | undefined) => void;
  onPieceDragEnd?: () => void;
  onStageDeselect?: () => void;
  onEmptySlotClick?: (slot: SlotCoord, clientX: number, clientY: number) => void;
}) {
  const { app } = useApplication();
  const localDrag = useRef<PieceLocalDragState>(null);
  const [draggingPieceId, setDraggingPieceId] = useState<string | null>(null);
  const [hoverSlot, setHoverSlot] = useState<SlotCoord | null>(null);

  // Tracks a pending empty-slot click for click-vs-drag discrimination.
  // Set on pointerdown; resolved on pointerup only if movement < threshold.
  const emptySlotPendingRef = useRef<{
    slot: SlotCoord;
    clientX: number;
    clientY: number;
    startClientX: number;
    startClientY: number;
  } | null>(null);

  useEffect(() => {
    const stage = app?.stage;
    if (!stage || !piecesInteractive) return;

    // window.addEventListener fires even over empty canvas areas where Pixi
    // stage events would be swallowed (no hit-testable object under cursor).
    const handleMoveDOM = (e: PointerEvent) => {
      const drag = localDrag.current;
      if (!drag) return;
      const rect = (app?.renderer ? app.canvas : null)?.getBoundingClientRect();
      if (!rect) return;
      const stageX = e.clientX - rect.left;
      const stageY = e.clientY - rect.top;
      const dx = stageX - drag.startScreen.x;
      const dy = stageY - drag.startScreen.y;
      if (!drag.isDragging && Math.hypot(dx, dy) > 4) {
        drag.isDragging = true;
        setDraggingPieceId(drag.pieceId);
        const pieceData = map.pieces.find((p) => p.id === drag.pieceId);
        const npc = pieceData ? npcMap?.get(pieceData.characterId) : undefined;
        onPieceDragStart?.(drag.pieceId, npc);
      }
      if (!drag.isDragging) return;
      const vp = vpRef.current;
      if (!vp) return;
      const world = vp.toWorld(stageX, stageY);
      drag.currentSlot = worldToSlot(world, map.grid);
      setHoverSlot(drag.currentSlot);
    };

    const handleUp = (e: FederatedPointerEvent) => {
      const drag = localDrag.current;
      if (!drag) return;
      localDrag.current = null;
      setDraggingPieceId(null);
      onPieceDragEnd?.();
      setHoverSlot(null);
      if (!drag.isDragging) {
        onPieceSelect?.(drag.pieceId);
        return;
      }
      const { width: cw, height: ch } = app.screen;
      const overSidebar =
        e.global.x < 0 || e.global.x > cw || e.global.y < 0 || e.global.y > ch;
      if (overSidebar) {
        onPieceDragToRoster?.(drag.pieceId);
        return;
      }
      const slot = drag.currentSlot;
      if (!slot || !isSlotInBounds(slot, map.grid)) return;
      const occupied = map.pieces.some(
        (p) => p.id !== drag.pieceId && isSameSlot(p.coord.slot, slot),
      );
      if (!occupied) onPieceMove?.(drag.pieceId, slot);
    };

    // Fallback: stage.on("pointerup") can miss events on child container
    // boundaries. Window handler acts as reliable safety net for both clicks
    // (selection) and drags. The if(!drag) guard prevents double-handling.
    const handleWindowUp = (e: PointerEvent) => {
      const drag = localDrag.current;
      if (!drag) return;
      localDrag.current = null;
      setDraggingPieceId(null);
      onPieceDragEnd?.();
      setHoverSlot(null);
      if (e.type === "pointercancel") return;
      const rect = (app?.renderer ? app.canvas : null)?.getBoundingClientRect();
      const overCanvas =
        !!rect &&
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top  && e.clientY <= rect.bottom;
      if (!drag.isDragging) {
        if (overCanvas) onPieceSelect?.(drag.pieceId);
        return;
      }
      if (!overCanvas) {
        onPieceDragToRoster?.(drag.pieceId);
      } else {
        const vp = vpRef.current;
        if (!vp || !rect) return;
        const world = vp.toWorld(e.clientX - rect.left, e.clientY - rect.top);
        const slot = worldToSlot(world, map.grid);
        if (!isSlotInBounds(slot, map.grid)) return;
        const occupied = map.pieces.some(
          (p) => p.id !== drag.pieceId && isSameSlot(p.coord.slot, slot),
        );
        if (!occupied) onPieceMove?.(drag.pieceId, slot);
      }
    };

    stage.on("pointerup", handleUp);
    stage.on("pointerupoutside", handleUp);
    window.addEventListener("pointermove", handleMoveDOM);
    window.addEventListener("pointerup", handleWindowUp);
    window.addEventListener("pointercancel", handleWindowUp);

    return () => {
      stage.off("pointerup", handleUp);
      stage.off("pointerupoutside", handleUp);
      window.removeEventListener("pointermove", handleMoveDOM);
      window.removeEventListener("pointerup", handleWindowUp);
      window.removeEventListener("pointercancel", handleWindowUp);
    };
  }, [app, vpRef, map.grid, map.pieces, piecesInteractive, onPieceSelect, onPieceMove, onPieceDragToRoster, onPieceDragStart, onPieceDragEnd]);

  // Resolve empty-slot click on pointerup: fires onEmptySlotClick only if the
  // pointer moved less than CLICK_THRESHOLD pixels since pointerdown (i.e. it was
  // a tap/click, not a map pan). This lets the viewport pan normally on drag while
  // still triggering the placement overlay on a clean click.
  useEffect(() => {
    if (!onEmptySlotClick) return;
    const CLICK_THRESHOLD = 6;
    const handleUp = (e: PointerEvent) => {
      const pending = emptySlotPendingRef.current;
      emptySlotPendingRef.current = null;
      if (!pending) return;
      const dx = e.clientX - pending.startClientX;
      const dy = e.clientY - pending.startClientY;
      if (Math.hypot(dx, dy) <= CLICK_THRESHOLD) {
        onEmptySlotClick(pending.slot, pending.clientX, pending.clientY);
      }
    };
    const handleCancel = () => { emptySlotPendingRef.current = null; };
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
    return () => {
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
    };
  }, [onEmptySlotClick]);

  // Hit area covering the entire grid — gives the pieces-layer container real bounds
  // so PixiJS delivers pointerdown even when no pieces are rendered yet.
  const gridHitArea = useMemo(
    () => new Rectangle(0, 0, map.grid.cols * map.grid.cellSize, map.grid.rows * map.grid.cellSize),
    [map.grid.cols, map.grid.rows, map.grid.cellSize],
  );

  const drawHoverSlot = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (!hoverSlot || !draggingPieceId) return;
      const outOfBounds = !isSlotInBounds(hoverSlot, map.grid);
      const occupied = !outOfBounds && map.pieces.some(
        (p) => p.id !== draggingPieceId && isSameSlot(p.coord.slot, hoverSlot),
      );
      const color = occupied || outOfBounds ? 0xff3030 : 0x30ff80;
      g.setFillStyle({ color, alpha: 0.25 });
      const corners = slotCorners(hoverSlot, map.grid);
      g.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) g.lineTo(corners[i].x, corners[i].y);
      g.closePath();
      g.fill();
    },
    [hoverSlot, draggingPieceId, map.pieces, map.grid],
  );

  // The dragged piece is hidden from the scene while dragging — a single DOM
  // ghost (rendered by TacticalMapEditor) represents it across the whole screen.
  // The canvas only shows the target-slot highlight (drawHoverSlot).
  const visiblePieces = useMemo(
    () => (draggingPieceId ? map.pieces.filter((p) => p.id !== draggingPieceId) : map.pieces),
    [map.pieces, draggingPieceId],
  );

  return (
    <pixiContainer
      label="pieces-layer"
      eventMode={piecesInteractive ? "static" : "none"}
      hitArea={piecesInteractive ? gridHitArea : undefined}
      onPointerDown={(e: FederatedPointerEvent) => {
        if (e.target !== e.currentTarget) return;
        onStageDeselect?.();
        if (onEmptySlotClick && !localDrag.current) {
          const vp = vpRef.current;
          const canvas = app?.renderer ? app.canvas : null;
          if (vp && canvas) {
            const rect = canvas.getBoundingClientRect();
            const clientX = rect.left + e.global.x;
            const clientY = rect.top + e.global.y;
            const world = vp.toWorld(e.global.x, e.global.y);
            const slot = worldToSlot(world, map.grid);
            if (isSlotInBounds(slot, map.grid)) {
              emptySlotPendingRef.current = { slot, clientX, clientY, startClientX: clientX, startClientY: clientY };
            }
          }
        }
      }}
    >
      <pixiGraphics draw={drawHoverSlot} />
      {visiblePieces.map((p) => (
        <PieceSprite
          key={p.id}
          piece={p}
          grid={map.grid}
          npc={npcMap?.get(p.characterId)}
          isSelected={selection?.kind === "piece" && selection.id === p.id}
          piecesInteractive={piecesInteractive}
          onPointerDown={(_piece, e) => {
            if (!piecesInteractive || localDrag.current) return;
            if (draggablePieceIds !== undefined && !draggablePieceIds.has(p.id)) return;
            pieceDragActiveRef.current = true;
            localDrag.current = {
              pieceId: p.id,
              startScreen: { x: e.global.x, y: e.global.y },
              isDragging: false,
              currentSlot: null,
            };
            e.stopPropagation();
          }}
        />
      ))}
    </pixiContainer>
  );
}
