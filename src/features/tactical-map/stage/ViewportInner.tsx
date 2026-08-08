import "./pixiViewportTypes";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApplication } from "@pixi/react";
import type { Viewport } from "pixi-viewport";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { SlotCoord } from "../../../types/tacticalMap";
import MapHandlesLayer from "../MapHandlesLayer";
import WallsLayer from "../WallsLayer";
import FogLayer from "../FogLayer";
import { worldToSlot, isSlotInBounds, slotCorners } from "../utils/coords";
import type { TacticalMapStageProps } from "./stageProps";
import BgLayer from "./BgLayer";
import GridLayer from "./GridLayer";
import PiecesLayer from "./PiecesLayer";

type BgDragState = {
  startWorldX: number;
  startWorldY: number;
  startBgX: number;
  startBgY: number;
} | null;

// `uploading` drives only the DOM overlay in TacticalMapStage — the canvas never
// reads it. onBgLoadingChange is re-declared because TacticalMapStage passes its
// own wrapper (which also updates the overlay state) instead of the raw prop.
type ViewportInnerProps = Omit<TacticalMapStageProps, "uploading"> & {
  onBgLoadingChange?: (loading: boolean) => void;
};

export default function ViewportInner({
  map,
  width,
  height,
  clampToGrid,
  bgInteractive,
  onBgPositionChange,
  onBgLoadingChange,
  piecesInteractive,
  draggablePieceIds,
  selection,
  npcMap,
  placingNpcId,
  onPieceSelect,
  onPieceMove,
  onPieceDragToRoster,
  onPieceDragStart,
  onPieceDragEnd,
  onNpcPlaced,
  onNpcPlacementCancel,
  onStageDeselect,
  onEmptySlotClick,
  onViewportScaleChange,
  activeTool,
  onBgChange,
  onGridChange,
  onDragGestureStart,
  onDragGestureEnd,
  walls,
  wallsInteractive,
  selectedWallId,
  activeWallType,
  activeMaterial,
  onWallSelect,
  onDrawComplete,
  onWallEndpointDrag,
  drawingEnabled,
  onExitWallsDrawMode,
  onWallClick,
  fog,
  fogDisabled = true,
  worldWidth,
  worldHeight,
}: ViewportInnerProps) {
  const { app } = useApplication();
  const canvasEl = app?.renderer ? (app.canvas as HTMLCanvasElement) : null;
  const vpRef = useRef<Viewport | null>(null);
  const bgDragState = useRef<BgDragState>(null);
  const wallGestureActiveRef = useRef(false);
  const [vpScale, setVpScale] = useState(1);
  const [placementHoverSlot, setPlacementHoverSlot] = useState<SlotCoord | null>(null);

  const vpCallback = useCallback((vp: Viewport | null) => {
    vpRef.current = vp;
    if (!vp) return;
    // No decelerate(): panning is driven by our own window pointer handlers, and
    // the momentum plugin would keep the map gliding after release — a UX the
    // user explicitly does not want. The map moves only while held.
    vp.pinch().wheel();
    vp.on("zoomed", () => setVpScale(vp.scale.x));
  }, []);

  // Report zoom changes up so the DOM drag ghost can match on-screen token size.
  useEffect(() => {
    onViewportScaleChange?.(vpScale);
  }, [vpScale, onViewportScaleChange]);

  useEffect(() => {
    const vp = vpRef.current;
    if (!vp || !clampToGrid) return;
    vp.clamp({
      left: 0,
      right: map.grid.cols * map.grid.cellSize,
      top: 0,
      bottom: map.grid.rows * map.grid.cellSize,
      underflow: "center",
    });
  }, [clampToGrid, map.grid.cols, map.grid.cellSize, map.grid.rows]);

  useEffect(() => {
    if (!app.renderer || width <= 0 || height <= 0) return;
    app.renderer.resize(width, height);
    vpRef.current?.resize(width, height);
  }, [app, width, height]);

  // ─── Viewport pan via DOM events ─────────────────────────────────────────
  //
  // All listeners are on window so they register unconditionally regardless of
  // whether app.renderer (and therefore app.canvas) is ready at effect time.
  // If canvas.addEventListener were used instead, the effect would early-return
  // when Pixi hasn't finished async init — and since app is always the same
  // reference, the effect never re-runs to register the missed listener.
  //
  // pieceDragActiveRef: piece onPointerDown sets this before our RAF fires so
  // pan can skip starting when a piece was the actual target.
  const pieceDragActiveRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartClientRef = useRef({ x: 0, y: 0 });
  const panStartVpRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onWindowDown = (e: PointerEvent) => {
      const canvas = app?.renderer ? app.canvas : null;
      if (!canvas || placingNpcId || e.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      if (
        e.clientX < rect.left || e.clientX > rect.right ||
        e.clientY < rect.top  || e.clientY > rect.bottom
      ) return;
      const vp = vpRef.current;
      if (!vp) return;
      const snapX = e.clientX;
      const snapY = e.clientY;
      requestAnimationFrame(() => {
        if (pieceDragActiveRef.current) {
          pieceDragActiveRef.current = false;
          return;
        }
        // bgDragState is set synchronously by BgLayer's Pixi onPointerDown (which
        // fires before this window handler in the same tick), so if the bg sprite
        // was clicked it's already non-null here and we skip pan.
        if (bgInteractive && bgDragState.current) return;
        // Suppress pan only while a wall is being drawn; clicks outside snap area still pan.
        if (wallGestureActiveRef.current) return;
        isPanningRef.current = true;
        panStartClientRef.current = { x: snapX, y: snapY };
        panStartVpRef.current = { x: vp.x, y: vp.y };
      });
    };

    const onWindowMove = (e: PointerEvent) => {
      if (bgDragState.current) {
        const canvas = app?.renderer ? app.canvas : null;
        const vp = vpRef.current;
        if (!canvas || !vp) return;
        const rect = canvas.getBoundingClientRect();
        const world = vp.toWorld(e.clientX - rect.left, e.clientY - rect.top);
        onBgPositionChange?.(
          bgDragState.current.startBgX + (world.x - bgDragState.current.startWorldX),
          bgDragState.current.startBgY + (world.y - bgDragState.current.startWorldY),
        );
        return;
      }
      if (!isPanningRef.current) return;
      const vp = vpRef.current;
      if (!vp) return;
      vp.x = panStartVpRef.current.x + (e.clientX - panStartClientRef.current.x);
      vp.y = panStartVpRef.current.y + (e.clientY - panStartClientRef.current.y);
    };

    const onWindowUp = () => {
      isPanningRef.current = false;
      const wasBgDrag = !!bgDragState.current;
      bgDragState.current = null;
      if (wasBgDrag) onDragGestureEnd?.();
    };

    window.addEventListener("pointerdown", onWindowDown);
    window.addEventListener("pointermove", onWindowMove);
    window.addEventListener("pointerup", onWindowUp);
    window.addEventListener("pointercancel", onWindowUp);

    return () => {
      window.removeEventListener("pointerdown", onWindowDown);
      window.removeEventListener("pointermove", onWindowMove);
      window.removeEventListener("pointerup", onWindowUp);
      window.removeEventListener("pointercancel", onWindowUp);
      isPanningRef.current = false;
    };
  }, [app, placingNpcId, bgInteractive, onBgPositionChange, onDragGestureEnd, activeTool]);

  // ─── NPC placement ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!placingNpcId) return;

    const handlePointerUp = (e: PointerEvent) => {
      if (e.type === "pointercancel") {
        onNpcPlacementCancel?.();
        return;
      }
      const canvas = app?.renderer ? app.canvas : null;
      const vp = vpRef.current;
      const rect = canvas?.getBoundingClientRect();
      const overCanvas =
        vp != null && rect != null &&
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top  && e.clientY <= rect.bottom;

      if (overCanvas && onNpcPlaced) {
        const world = vp!.toWorld(e.clientX - rect!.left, e.clientY - rect!.top);
        const slot = worldToSlot(world, map.grid);
        if (isSlotInBounds(slot, map.grid)) {
          onNpcPlaced(slot);
        } else {
          onNpcPlacementCancel?.();
        }
      } else {
        onNpcPlacementCancel?.();
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const canvas = app?.renderer ? app.canvas : null;
      const vp = vpRef.current;
      if (!vp || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      if (cx >= 0 && cy >= 0 && cx <= rect.width && cy <= rect.height) {
        setPlacementHoverSlot(worldToSlot(vp.toWorld(cx, cy), map.grid));
      } else {
        setPlacementHoverSlot(null);
      }
    };

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("pointermove", handlePointerMove);

    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("pointermove", handlePointerMove);
      setPlacementHoverSlot(null);
    };
  }, [app, placingNpcId, onNpcPlaced, onNpcPlacementCancel, map.grid]);

  const drawPlacementHover = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (!placementHoverSlot || !placingNpcId) return;
      const inBounds = isSlotInBounds(placementHoverSlot, map.grid);
      const color = inBounds ? 0x30ff80 : 0xff3030;
      g.setFillStyle({ color, alpha: 0.3 });
      g.setStrokeStyle({ color, width: 2, alpha: 0.9 });
      const corners = slotCorners(placementHoverSlot, map.grid);
      g.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) g.lineTo(corners[i].x, corners[i].y);
      g.closePath();
      g.fill();
      g.stroke();
    },
    [placementHoverSlot, placingNpcId, map.grid],
  );

  const events = app?.renderer?.events;
  if (!events) return null;

  return (
    <pixiViewport
      ref={vpCallback}
      screenWidth={width}
      screenHeight={height}
      worldWidth={map.grid.cols * map.grid.cellSize * 2}
      worldHeight={map.grid.rows * map.grid.cellSize * 2}
      events={events}
      eventMode="static"
    >
      <BgLayer
        bg={map.bg}
        bgInteractive={bgInteractive}
        vpRef={vpRef}
        onBgPointerDown={(startWorldX, startWorldY, startBgX, startBgY) => {
          bgDragState.current = { startWorldX, startWorldY, startBgX, startBgY };
          onDragGestureStart?.();
        }}
        onLoadingChange={onBgLoadingChange}
      />
      <GridLayer grid={map.grid} vpScale={vpScale} />
      <pixiContainer label="decorations-layer" />
      <pixiGraphics draw={drawPlacementHover} />
      <PiecesLayer
        map={map}
        vpRef={vpRef}
        piecesInteractive={piecesInteractive}
        draggablePieceIds={draggablePieceIds}
        selection={selection}
        npcMap={npcMap}
        pieceDragActiveRef={pieceDragActiveRef}
        onPieceSelect={onPieceSelect}
        onPieceMove={onPieceMove}
        onPieceDragToRoster={onPieceDragToRoster}
        onPieceDragStart={onPieceDragStart}
        onPieceDragEnd={onPieceDragEnd}
        onStageDeselect={onStageDeselect}
        onEmptySlotClick={onEmptySlotClick}
      />
      {fog && !fogDisabled && (
        <FogLayer
          fog={fog}
          worldWidth={worldWidth ?? map.grid.cols * map.grid.cellSize}
          worldHeight={worldHeight ?? map.grid.rows * map.grid.cellSize}
          disabled={fogDisabled}
        />
      )}
      <WallsLayer
        walls={walls ?? []}
        grid={map.grid}
        vpRef={vpRef}
        vpScale={vpScale}
        canvasEl={canvasEl}
        wallsInteractive={wallsInteractive ?? false}
        selectedWallId={selectedWallId ?? null}
        activeWallType={activeWallType ?? "wall"}
        activeMaterial={activeMaterial ?? "stone"}
        onWallSelect={onWallSelect ?? (() => {})}
        onDrawComplete={onDrawComplete ?? (() => {})}
        onEndpointDrag={onWallEndpointDrag ?? (() => {})}
        onGestureStart={() => { wallGestureActiveRef.current = true; (onDragGestureStart ?? (() => {}))(); }}
        onGestureEnd={() => { wallGestureActiveRef.current = false; (onDragGestureEnd ?? (() => {}))(); }}
        drawingEnabled={drawingEnabled ?? false}
        onExitDrawMode={onExitWallsDrawMode ?? (() => {})}
        onWallClick={onWallClick}
        losPolygons={fog && !fogDisabled ? fog.visiblePolygons : undefined}
      />
      <pixiContainer label="overlay-layer">
        {activeTool && onBgChange && onGridChange && (
          <MapHandlesLayer
            activeTool={activeTool}
            bg={map.bg}
            grid={map.grid}
            vpScale={vpScale}
            onBgChange={onBgChange}
            onGridChange={onGridChange}
            vpRef={vpRef}
            onGestureStart={onDragGestureStart}
            onGestureEnd={onDragGestureEnd}
          />
        )}
      </pixiContainer>
    </pixiViewport>
  );
}
