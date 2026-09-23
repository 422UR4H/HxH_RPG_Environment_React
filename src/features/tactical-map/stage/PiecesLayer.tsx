import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApplication } from "@pixi/react";
import { Rectangle } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import type { TacticalMap, SlotCoord } from "../../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../../types/characterSheet";
import type { Selection } from "../store/editorStore";
import { worldToSlot, isSlotInBounds, slotCorners, isSameSlot, slotToWorld, slotInradius } from "../utils/coords";
import { createHoldTracker, createRightPressTracker, HOLD_MS } from "../hooks/useHoldGesture";
import { colors } from "../../../styles/tokens";
import PieceSprite from "./PieceSprite";

const HOLD_PROGRESS_COLOR = parseInt(colors.warningText.replace("#", ""), 16);

// No containerRef: piece position is driven by React state (dragWorldPos) to
// avoid @pixi/react reconciler overwriting imperative position.set() calls.
//
// `draggable`: false when the piece isn't in `draggablePieceIds` (game mode —
// the server moves the piece, not the client) or when the press started with a
// non-primary button (right-click shortcut). handleMoveDOM only enters the drag
// branch when this is true, so the piece still resolves click/hold while staying
// visually still.
//
// `rightClick`: true when the pointerdown that started this gesture was a
// non-primary button. A right-button release NEVER produces a click (R20) —
// handleUp/handleWindowUp check this flag and return before onPieceSelect,
// regardless of event ordering between pointerup and contextmenu.
type PieceLocalDragState = {
  pieceId: string;
  startScreen: { x: number; y: number };
  isDragging: boolean;
  currentSlot: SlotCoord | null;
  draggable: boolean;
  rightClick: boolean;
} | null;

export default function PiecesLayer({
  map, vpRef, piecesInteractive, draggablePieceIds, selection, npcMap, pieceDragActiveRef,
  onPieceSelect, onPieceLongPress, selectedPieceId, targetPieceIds,
  onPieceMove, onPieceDragToRoster, onPieceDragStart, onPieceDragEnd, onStageDeselect,
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
  onPieceLongPress?: (pieceId: string) => void;
  selectedPieceId?: string | null;
  targetPieceIds?: Set<string>;
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

  // Kept in a ref like the rest of this file's callbacks (see handleMoveDOM/
  // handleUp closures below) — the effect that owns the window listeners
  // doesn't need to re-subscribe when the consumer passes a new function
  // identity each render.
  const onPieceLongPressRef = useRef(onPieceLongPress);
  useEffect(() => { onPieceLongPressRef.current = onPieceLongPress; }, [onPieceLongPress]);

  // R19: only start the tracker when onPieceLongPress is provided. The lobby/map
  // editor (TacticalMapEditor, TacticalMapPlacer) never passes it — a 450ms
  // press-and-release there must stay a plain click, not get swallowed by hold
  // bookkeeping.
  const holdRef = useRef(createHoldTracker({ onHold: (id) => onPieceLongPressRef.current?.(id) }));

  // R20: the right-click shortcut's own bookkeeping, independent from holdRef.
  // See useHoldGesture.ts's doc comment on createRightPressTracker for why this
  // exists (contextmenu vs pointerup ordering differs Windows vs Linux/macOS).
  const rightPressTrackerRef = useRef(createRightPressTracker());

  // Hold-progress ring: the arc grows from 120ms to HOLD_MS around the piece
  // currently in localDrag. Without this the gesture reads as a stall.
  const [holdProgress, setHoldProgress] = useState<{ pieceId: string; ratio: number } | null>(null);
  const holdRafRef = useRef<number | null>(null);
  const stopHoldProgress = useCallback(() => {
    if (holdRafRef.current != null) cancelAnimationFrame(holdRafRef.current);
    holdRafRef.current = null;
    setHoldProgress(null);
  }, []);
  const startHoldProgress = useCallback((pieceId: string) => {
    const startedAt = performance.now();
    const HOLD_PROGRESS_START_MS = 120;
    const tick = () => {
      const drag = localDrag.current;
      if (!drag || drag.pieceId !== pieceId) { stopHoldProgress(); return; }
      const elapsed = performance.now() - startedAt;
      if (elapsed < HOLD_PROGRESS_START_MS) {
        holdRafRef.current = requestAnimationFrame(tick);
        return;
      }
      const ratio = Math.min(1, (elapsed - HOLD_PROGRESS_START_MS) / (HOLD_MS - HOLD_PROGRESS_START_MS));
      setHoldProgress({ pieceId, ratio });
      if (ratio < 1) holdRafRef.current = requestAnimationFrame(tick);
      else holdRafRef.current = null;
    };
    holdRafRef.current = requestAnimationFrame(tick);
  }, [stopHoldProgress]);

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
      holdRef.current.move(stageX, stageY);
      // Game mode (draggable: false): the piece never moves locally — the
      // server is the only one that decides where it ends up (I1). Click and
      // hold still resolve on pointerup below; only the drag branch is gated.
      if (!drag.draggable) return;
      const dx = stageX - drag.startScreen.x;
      const dy = stageY - drag.startScreen.y;
      if (!drag.isDragging && Math.hypot(dx, dy) > 4) {
        drag.isDragging = true;
        // A real drag and a hold are mutually exclusive — once the piece is
        // actually moving, cancel the timer so it can't fire mid-drag.
        holdRef.current.cancel();
        stopHoldProgress();
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
      stopHoldProgress();
      // R20: a right-button release is never a click — its outcome is resolved
      // by handleContextMenu's `contextmenu()` call, whichever order the browser
      // delivers pointerup/contextmenu in.
      if (drag.rightClick) {
        rightPressTrackerRef.current.release();
        return;
      }
      if (!drag.isDragging) {
        const outcome = holdRef.current.end();
        if (outcome === "hold") return; // segurar já marcou; não alveje duas vezes
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
      stopHoldProgress();
      if (e.type === "pointercancel") {
        holdRef.current.cancel();
        rightPressTrackerRef.current.reset();
        return;
      }
      // R20: a right-button release is never a click — see handleUp above.
      if (drag.rightClick) {
        rightPressTrackerRef.current.release();
        return;
      }
      const rect = (app?.renderer ? app.canvas : null)?.getBoundingClientRect();
      const overCanvas =
        !!rect &&
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top  && e.clientY <= rect.bottom;
      if (!drag.isDragging) {
        const outcome = holdRef.current.end();
        if (outcome === "hold") return; // segurar já marcou; não alveje duas vezes
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

    // Right-click shortcut for the hold gesture (§7.1): suppresses the browser's
    // native context menu over the canvas. R20 (supersedes R5's fireNow use here):
    // the outcome is resolved through rightPressTrackerRef, not the hold tracker —
    // fireNow/end()==="hold" assumed contextmenu always fires before pointerup,
    // which is false on Windows (contextmenu fires after). rightPressTrackerRef
    // resolves correctly regardless of that order; see its doc comment.
    // R19: gated on onPieceLongPress being provided at all — the lobby/map
    // editor never passes it, so its right-click behavior (whatever it was)
    // stays untouched.
    const handleContextMenu = (e: MouseEvent) => {
      if (!onPieceLongPressRef.current) return;
      e.preventDefault();
      const id = rightPressTrackerRef.current.contextmenu();
      if (id) onPieceLongPressRef.current(id);
    };
    const canvas = app?.renderer ? app.canvas : null;

    stage.on("pointerup", handleUp);
    stage.on("pointerupoutside", handleUp);
    window.addEventListener("pointermove", handleMoveDOM);
    window.addEventListener("pointerup", handleWindowUp);
    window.addEventListener("pointercancel", handleWindowUp);
    canvas?.addEventListener("contextmenu", handleContextMenu);

    return () => {
      stage.off("pointerup", handleUp);
      stage.off("pointerupoutside", handleUp);
      window.removeEventListener("pointermove", handleMoveDOM);
      window.removeEventListener("pointerup", handleWindowUp);
      window.removeEventListener("pointercancel", handleWindowUp);
      canvas?.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [app, vpRef, map.grid, map.pieces, piecesInteractive, onPieceSelect, onPieceMove, onPieceDragToRoster, onPieceDragStart, onPieceDragEnd, stopHoldProgress]);

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

  // Hold-progress arc: closes clockwise from 0 to 2π as holdProgress.ratio goes
  // 0→1 (i.e. from 120ms to HOLD_MS after pointerdown). Drawn as one shared
  // graphics rather than per-PieceSprite, since at most one piece is ever mid-hold.
  const drawHoldProgress = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (!holdProgress) return;
      const piece = map.pieces.find((p) => p.id === holdProgress.pieceId);
      if (!piece) return;
      const center = slotToWorld(piece.coord.slot, map.grid);
      const tokenRadius = slotInradius(map.grid) * 0.9;
      const zOffsetPx = piece.coord.z * 10;
      const radius = tokenRadius + 16;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + Math.PI * 2 * holdProgress.ratio;
      g.setStrokeStyle({ color: HOLD_PROGRESS_COLOR, width: 3, alpha: 0.9 });
      g.arc(center.x, center.y - zOffsetPx, radius, startAngle, endAngle);
      g.stroke();
    },
    [holdProgress, map.pieces, map.grid],
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
      <pixiGraphics draw={drawHoldProgress} />
      {visiblePieces.map((p) => (
        <PieceSprite
          key={p.id}
          piece={p}
          grid={map.grid}
          npc={npcMap?.get(p.characterId)}
          isSelected={(selection?.kind === "piece" && selection.id === p.id) || selectedPieceId === p.id}
          isTarget={!!targetPieceIds?.has(p.id)}
          piecesInteractive={piecesInteractive}
          onPointerDown={(_piece, e) => {
            if (!piecesInteractive || localDrag.current) return;
            // R20: every pointerdown (any button) clears whatever right-press
            // bookkeeping is left over — a right-press that never got a matching
            // contextmenu must not leak its id into a later, unrelated one.
            rightPressTrackerRef.current.reset();
            // Right-click never starts a drag (R19) — its outcome is resolved by
            // rightPressTrackerRef via the `contextmenu` event below, independent
            // of whether contextmenu or pointerup arrives first (R20). localDrag
            // is still recorded (draggable: false) so handleUp/handleWindowUp
            // know to skip onPieceSelect for this press.
            const rightClick = e.button !== 0;
            const draggable = !rightClick && (draggablePieceIds === undefined || draggablePieceIds.has(p.id));
            // R19: only arm the tracker when the caller opted into the gesture.
            // Starting it unconditionally would mean a plain, slightly slow
            // click in the lobby (no onPieceLongPress) crosses HOLD_MS, marks
            // `fired`, and gets silently swallowed by the "hold" outcome below.
            if (onPieceLongPress) {
              if (rightClick) {
                rightPressTrackerRef.current.press(p.id);
              } else {
                holdRef.current.start(p.id, e.global.x, e.global.y);
                startHoldProgress(p.id);
              }
            }
            pieceDragActiveRef.current = draggable;
            localDrag.current = {
              pieceId: p.id,
              startScreen: { x: e.global.x, y: e.global.y },
              isDragging: false,
              currentSlot: null,
              draggable,
              rightClick,
            };
            e.stopPropagation();
          }}
        />
      ))}
    </pixiContainer>
  );
}
