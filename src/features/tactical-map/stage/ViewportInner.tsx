import "./pixiViewportTypes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApplication } from "@pixi/react";
import type { Viewport } from "pixi-viewport";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { SlotCoord } from "../../../types/tacticalMap";
import MapHandlesLayer from "../MapHandlesLayer";
import WallsLayer from "../WallsLayer";
import FogLayer from "../FogLayer";
import { worldToSlot, isSlotInBounds, slotCorners, gridWorldBounds, polygonsToWorld } from "../utils/coords";
import type { ViewportTransform } from "../utils/screenAnchor";
import type { TacticalMapStageProps } from "./stageProps";
import BgLayer from "./BgLayer";
import GridLayer from "./GridLayer";
import PiecesLayer from "./PiecesLayer";
import IntentLayer from "../IntentLayer";
import { createPanTracker } from "../hooks/panGesture";
import { colors } from "../../../styles/tokens";
import { toPixi } from "../../../styles/pixi";

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
  onBgError?: () => void;
  bgRetryKey?: number;
};

export default function ViewportInner({
  map,
  width,
  height,
  clampToGrid,
  bgInteractive,
  onBgPositionChange,
  onBgLoadingChange,
  onBgError,
  bgRetryKey,
  piecesInteractive,
  draggablePieceIds,
  suppressPanOnPiecePress,
  selection,
  npcMap,
  placingNpcId,
  onPieceSelect,
  onPieceLongPress,
  selectedPieceId,
  inspectedPieceId,
  targetPieceIds,
  onPieceMove,
  intentPreview,
  intentGhosts,
  activePieceId,
  highlightHoverSlot,
  fitRequest,
  refitOnGridChange = true,
  onPieceDragToRoster,
  onPieceDragStart,
  onPieceDragEnd,
  onNpcPlaced,
  onNpcPlacementCancel,
  onStageDeselect,
  onEmptySlotClick,
  onViewportScaleChange,
  onViewportTransform,
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
  onWallLongPress,
  isWallTappable,
  fog,
  fogDisabled = true,
}: ViewportInnerProps) {
  const { app } = useApplication();
  // The only LOCAL→WORLD conversion of the server's visibility polygons: FogLayer and
  // WallsLayer/LosSplit below both receive WORLD ones. fog.visiblePolygons stays as received.
  const worldPolygons = useMemo(
    () => polygonsToWorld(fog?.visiblePolygons ?? [], map.grid),
    [fog?.visiblePolygons, map.grid],
  );
  const worldFog = useMemo(
    () => (fog ? { ...fog, visiblePolygons: worldPolygons } : undefined),
    [fog, worldPolygons],
  );
  const fogBounds = useMemo(() => gridWorldBounds(map.grid), [map.grid]);
  const canvasEl = app?.renderer ? (app.canvas as HTMLCanvasElement) : null;
  const vpRef = useRef<Viewport | null>(null);
  const bgDragState = useRef<BgDragState>(null);
  const wallGestureActiveRef = useRef(false);
  const [vpScale, setVpScale] = useState(1);
  const [placementHoverSlot, setPlacementHoverSlot] = useState<SlotCoord | null>(null);

  // The viewport only mounts once the renderer is up; the fit effect below waits on this.
  const [vpReady, setVpReady] = useState(false);
  // Set by any hand pan/zoom: the automatic framing stops following resizes after that.
  const userMovedRef = useRef(false);
  const vpCallback = useCallback((vp: Viewport | null) => {
    vpRef.current = vp;
    setVpReady(!!vp);
    if (!vp) return;
    // No decelerate(): panning is driven by our own window pointer handlers, and
    // the momentum plugin would keep the map gliding after release — a UX the
    // user explicitly does not want. The map moves only while held.
    vp.pinch().wheel();
    vp.on("zoomed", () => {
      userMovedRef.current = true;
      setVpScale(vp.scale.x);
    });
  }, []);

  // Report zoom changes up so the DOM drag ghost can match on-screen token size.
  useEffect(() => {
    onViewportScaleChange?.(vpScale);
  }, [vpScale, onViewportScaleChange]);

  useEffect(() => {
    const vp = vpRef.current;
    if (!vp || !clampToGrid) return;
    const wb = gridWorldBounds(map.grid);
    vp.clamp({
      left: wb.minX,
      right: wb.maxX,
      top: wb.minY,
      bottom: wb.maxY,
      underflow: "center",
    });
  }, [clampToGrid, map.grid]);

  useEffect(() => {
    if (!app.renderer || width <= 0 || height <= 0) return;
    app.renderer.resize(width, height);
    vpRef.current?.resize(width, height);
  }, [app, width, height]);

  // Game only: a camada HTML (botões de reação, balões) ancora coisas nas peças por este
  // enquadramento. Vai pelo ticker, e não pelo evento `moved`, porque o pan é feito pelos
  // nossos handlers de ponteiro na window (escrevem vp.x/vp.y direto e não disparam
  // `moved`); o ticker pega o pan, o zoom e o enquadramento igual. Emite só quando mudou.
  // O callback vai num ref: um callback novo a cada render do pai não pode re-registrar o
  // ticker (e re-emitir) a cada quadro.
  const onViewportTransformRef = useRef(onViewportTransform);
  useEffect(() => {
    onViewportTransformRef.current = onViewportTransform;
  }, [onViewportTransform]);
  const lastTransformRef = useRef<ViewportTransform | null>(null);
  const emitsTransform = !!onViewportTransform;
  useEffect(() => {
    const vp = vpRef.current;
    const ticker = app?.ticker;
    if (!emitsTransform || !vpReady || !vp || !ticker) return;
    const tick = () => {
      const last = lastTransformRef.current;
      const x = vp.x;
      const y = vp.y;
      const scale = vp.scale.x;
      if (last && last.x === x && last.y === y && last.scale === scale) return;
      lastTransformRef.current = { x, y, scale };
      onViewportTransformRef.current?.({ x, y, scale });
    };
    ticker.add(tick);
    return () => {
      ticker.remove(tick);
      lastTransformRef.current = null;
    };
  }, [app, vpReady, emitsTransform]);

  // Game only: frame the whole grid, centered — on every new `fitRequest` (mount, or the
  // "enquadrar" button), and again when the canvas changes size (a panel opening on the
  // phone) as long as the viewer has not panned or zoomed by hand since the last framing.
  // Without it the map opened at 1:1 from the top-left corner and a grid wider than the
  // screen was simply cut off.
  // A grade vai num ref para o efeito poder ler o valor atual sem depender dela; só entra nas
  // dependências (via `gridTrigger`) quando `refitOnGridChange` está ligado.
  const gridRef = useRef(map.grid);
  gridRef.current = map.grid;
  const gridTrigger = refitOnGridChange ? map.grid : null;
  const fittedRequestRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const vp = vpRef.current;
    if (fitRequest === undefined || !vp || !vpReady || width <= 0 || height <= 0) return;
    const newRequest = fittedRequestRef.current !== fitRequest;
    if (!newRequest && userMovedRef.current) return;
    fittedRequestRef.current = fitRequest;
    userMovedRef.current = false;
    const wb = gridWorldBounds(gridRef.current);
    const w = wb.maxX - wb.minX;
    const h = wb.maxY - wb.minY;
    if (w <= 0 || h <= 0) return;
    const scale = Math.min(Math.max(Math.min(width / w, height / h) * 0.94, 0.25), 1.75);
    vp.setZoom(scale, true);
    vp.moveCenter((wb.minX + wb.maxX) / 2, (wb.minY + wb.maxY) / 2);
    setVpScale(scale);
  }, [fitRequest, vpReady, width, height, gridTrigger]);

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
  // O pan pertence a um ponteiro só; a pinça fica com o plugin `pinch` do pixi-viewport.
  const panTrackerRef = useRef(createPanTracker());

  useEffect(() => {
    const panTracker = panTrackerRef.current;
    const onWindowDown = (e: PointerEvent) => {
      const canvas = app?.renderer ? app.canvas : null;
      if (!canvas || placingNpcId || e.button !== 0) return;
      // Só o alvo ser o canvas conta: um card, a aba Histórico ou a camada HTML por cima
      // recebem o toque, e o retângulo sozinho começava pan por baixo deles.
      if (e.target !== canvas) return;
      const vp = vpRef.current;
      if (!vp) return;
      const tracker = panTracker;
      const pointerId = e.pointerId;
      tracker.down(pointerId, { x: e.clientX, y: e.clientY });
      requestAnimationFrame(() => {
        if (pieceDragActiveRef.current) {
          pieceDragActiveRef.current = false;
          tracker.suppress(pointerId);
          return;
        }
        // bgDragState is set synchronously by BgLayer's Pixi onPointerDown (which
        // fires before this window handler in the same tick), so if the bg sprite
        // was clicked it's already non-null here and we skip pan.
        if (bgInteractive && bgDragState.current) { tracker.suppress(pointerId); return; }
        // Suppress pan only while a wall is being drawn; clicks outside snap area still pan.
        if (wallGestureActiveRef.current) { tracker.suppress(pointerId); return; }
        // Um toque rápido (soltou antes deste quadro) deixava o pan ligado: no toque não
        // há hover para desligá-lo, e o toque seguinte fazia o mapa pular. Segundo dedo
        // (pinça) também não arma.
        tracker.arm(pointerId, { x: vp.x, y: vp.y });
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
      const tracker = panTracker;
      const vp = vpRef.current;
      // Um pointerup perdido (arraste nativo, soltar fora da janela) deixava o mapa
      // seguindo o mouse: sem o botão principal pressionado, o pan acabou.
      if (tracker.isPanning() && (e.buttons & 1) === 0) {
        tracker.up(e.pointerId, { x: vp?.x ?? 0, y: vp?.y ?? 0 });
        return;
      }
      // Sempre chama: mantém a última posição de cada dedo, de onde sai a reancoragem pós-pinça.
      const next = tracker.move(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!next || !vp) return;
      userMovedRef.current = true;
      vp.x = next.x;
      vp.y = next.y;
    };

    const onWindowUp = (e: PointerEvent) => {
      const vp = vpRef.current;
      panTracker.up(e.pointerId, { x: vp?.x ?? 0, y: vp?.y ?? 0 });
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
    };
  }, [app, placingNpcId, bgInteractive, onBgPositionChange, onDragGestureEnd, activeTool]);

  // Re-assinar os listeners não muda quais dedos estão no chão: só zera ao desmontar.
  useEffect(() => {
    const tracker = panTrackerRef.current;
    return () => tracker.reset();
  }, []);

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
      const color = inBounds ? toPixi(colors.mapSlotValid) : toPixi(colors.mapSlotInvalid);
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
        onError={onBgError}
        retryKey={bgRetryKey}
      />
      <GridLayer grid={map.grid} vpScale={vpScale} />
      <pixiContainer label="decorations-layer" />
      <pixiGraphics draw={drawPlacementHover} />
      <PiecesLayer
        map={map}
        vpRef={vpRef}
        piecesInteractive={piecesInteractive}
        draggablePieceIds={draggablePieceIds}
        suppressPanOnPiecePress={suppressPanOnPiecePress}
        selection={selection}
        npcMap={npcMap}
        pieceDragActiveRef={pieceDragActiveRef}
        onPieceSelect={onPieceSelect}
        onPieceLongPress={onPieceLongPress}
        selectedPieceId={selectedPieceId}
        inspectedPieceId={inspectedPieceId}
        targetPieceIds={targetPieceIds}
        activePieceId={activePieceId}
        highlightHoverSlot={highlightHoverSlot}
        onPieceMove={onPieceMove}
        onPieceDragToRoster={onPieceDragToRoster}
        onPieceDragStart={onPieceDragStart}
        onPieceDragEnd={onPieceDragEnd}
        onStageDeselect={onStageDeselect}
        onEmptySlotClick={onEmptySlotClick}
      />
      {worldFog && !fogDisabled && (
        <FogLayer
          fog={worldFog}
          bounds={fogBounds}
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
        onWallLongPress={onWallLongPress}
        isWallTappable={isWallTappable}
        losPolygons={fog && !fogDisabled ? worldPolygons : undefined}
      />
      {/* Above fog and walls: it is the viewer's own intention, always legible. */}
      {(intentPreview || (intentGhosts && intentGhosts.length > 0)) && (
        <IntentLayer preview={intentPreview} ghosts={intentGhosts ?? []} grid={map.grid} />
      )}
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
