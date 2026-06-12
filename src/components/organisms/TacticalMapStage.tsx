import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import styled, { keyframes } from "styled-components";
import { colors, fonts } from "../../styles/tokens";
import { Application, extend, useApplication } from "@pixi/react";
import { Assets, BlurFilter, Container, Graphics, ImageSource, Rectangle, Sprite, Text, Texture } from "pixi.js";
import type { EventSystem, FederatedPointerEvent } from "pixi.js";
import type { Graphics as PixiGraphics } from "pixi.js";
import gungiFrameUrl from "../../assets/icons/gungi.svg";
import avatarPlaceholderUrl from "../../assets/placeholder/avatar.png";
import { Viewport } from "pixi-viewport";
import type { TacticalMap, GridShape, Piece, SlotCoord, BgImage } from "../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../types/characterSheet";
import type { Selection, ToolKind } from "../../features/tactical-map/store/editorStore";
import MapHandlesLayer from "./MapHandlesLayer";
import WallsLayer from "./WallsLayer";
import type { WallSegment, WallType, WallMaterial } from "../../types/tacticalMap";
import { slotToWorld, worldToSlot, isSlotInBounds, slotCorners, applyTransform, slotInradius } from "../../features/tactical-map/utils/coords";

extend({ Container, Graphics, Sprite, Text, Viewport });

// Module-level CORS-safe avatar cache: R2 URL → Promise<same-origin blob URL>.
// Blob URLs are same-origin so they're safe for WebGL textures.
// Kept alive for the page lifetime (~20 NPCs × ~100 KB ≈ negligible).
const avatarBlobUrlCache = new Map<string, Promise<string | null>>();

function getAvatarBlobUrl(url: string): Promise<string | null> {
  let p = avatarBlobUrlCache.get(url);
  if (!p) {
    // CharacterSheetHeader renders avatars via CSS background-image (no Origin header),
    // so Cloudflare CDN may cache the response without CORS headers. Appending ?pixi
    // creates a separate CDN cache entry whose first request always comes from this
    // CORS fetch — guaranteeing the cached response includes Access-Control-Allow-Origin.
    const corsUrl = url.includes("?") ? `${url}&pixi=1` : `${url}?pixi=1`;
    p = fetch(corsUrl, { mode: "cors" })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => (blob ? URL.createObjectURL(blob) : null))
      .catch(() => null);
    avatarBlobUrlCache.set(url, p);
  }
  return p;
}

// Replicates CSS `inset box-shadow` from AvatarRelief (CharacterSheetHeader) as a
// PixiJS-renderable texture. Using a canvas-drawn texture keeps everything inside the
// WebGL display list — no DOM overlay div, no canvas/DOM z-layer conflict.
const insetShadowCache = new Map<number, Texture>();
function getAvatarInsetShadowTexture(radius: number): Texture {
  const key = Math.round(radius * 10);
  const cached = insetShadowCache.get(key);
  if (cached) return cached;

  const d = Math.ceil(radius * 2);
  const canvas = document.createElement("canvas");
  canvas.width = d;
  canvas.height = d;
  const ctx = canvas.getContext("2d")!;

  // Replicate CSS `inset box-shadow` on a circle using radial gradients.
  // Each layer: radial gradient centered at (cx, cy + offsetY*r).
  // Shifting the gradient center DOWN (positive offset) makes the ring thicker at
  // the top — exactly how CSS inset shadow with positive Y offset looks on a circle.
  // Shifting UP (negative) thickens the ring at the bottom for the highlight layers.
  // layers: [color, offsetY (fraction of r), blur (fraction of r)]
  // CSS origin: inset 0 4cqi 5cqi → offsetY=0.08r blur=0.10r; cqi = 2r/100
  const cx = radius, cy = radius, r = radius + 1;
  const layers: [string, number, number][] = [
    ["rgba(0,0,0,0.85)",        0.1, 0.1],
    ["rgba(0,0,0,0.42)",        0.1, 0.14],
    ["rgba(255,255,255,0.14)", -0.1, 0.1],
    ["rgba(255,255,255,0.05)", -0.1, 0.2],
  ];
  for (const [color, offsetFrac, blurFrac] of layers) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    const shadowCy = cy + offsetFrac * r;
    const innerR = Math.max(0, r - blurFrac * r);
    const outerR = r + blurFrac * r;
    const g = ctx.createRadialGradient(cx, shadowCy, innerR, cx, shadowCy, outerR);
    g.addColorStop(0, "transparent");
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, d, d);
    ctx.restore();
  }

  const t = new Texture({ source: new ImageSource({ resource: canvas }) });
  insetShadowCache.set(key, t);
  return t;
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      pixiViewport: {
        ref?: React.Ref<Viewport>;
        screenWidth?: number;
        screenHeight?: number;
        worldWidth?: number;
        worldHeight?: number;
        events?: EventSystem;
        eventMode?: string;
        onPointerDown?: (e: FederatedPointerEvent) => void;
        children?: React.ReactNode;
      };
    }
  }
}

type Props = {
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
};

export default function TacticalMapStage({
  map, width, height,
  clampToGrid = false,
  bgInteractive = false,
  onBgPositionChange,
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
  onBgLoadingChange,
  uploading = false,
  activeTool,
  onBgChange,
  onGridChange,
  onDragGestureStart,
  onDragGestureEnd,
  walls = [],
  wallsInteractive = false,
  selectedWallId = null,
  activeWallType = "wall" as WallType,
  activeMaterial = "stone" as WallMaterial,
  onWallSelect,
  onDrawComplete,
  onWallEndpointDrag,
  drawingEnabled,
  onExitWallsDrawMode,
}: Props) {
  const [isBgLoading, setIsBgLoading] = useState(() => !!map.bg?.url);
  const bgUrl = map.bg?.url;
  const containerRef = useRef<HTMLDivElement>(null);

  // Prevent the page from scrolling when the user scrolls over the map.
  // Capture phase + passive:false works cross-browser (Chrome passive-by-default
  // wheel handling requires capture to guarantee preventDefault fires first).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => { e.preventDefault(); };
    el.addEventListener("wheel", handler, { passive: false, capture: true });
    return () => el.removeEventListener("wheel", handler, { capture: true });
  }, []);

  // useLayoutEffect fires synchronously before the browser paints the frame.
  // When bg.url changes (upload, URL paste, or clear), we set loading state
  // before paint so the overlay always appears — even for blob: URLs whose
  // img.onload fires from cache before React would otherwise flush the update.
  useLayoutEffect(() => {
    setIsBgLoading(!!bgUrl);
  }, [bgUrl]);

  const handleBgLoadingChange = useCallback((loading: boolean) => {
    setIsBgLoading(loading);
    onBgLoadingChange?.(loading);
  }, [onBgLoadingChange]);

  return (
    <div ref={containerRef} style={{ position: "relative", width, height, overflow: "hidden", isolation: "isolate" }}>
      <Application width={width} height={height} background={0x101820}>
        <ViewportInner
          map={map}
          width={width}
          height={height}
          clampToGrid={clampToGrid}
          bgInteractive={bgInteractive}
          onBgPositionChange={onBgPositionChange}
          onBgLoadingChange={handleBgLoadingChange}
          piecesInteractive={piecesInteractive}
          draggablePieceIds={draggablePieceIds}
          selection={selection}
          npcMap={npcMap}
          placingNpcId={placingNpcId}
          onPieceSelect={onPieceSelect}
          onPieceMove={onPieceMove}
          onPieceDragToRoster={onPieceDragToRoster}
          onPieceDragStart={onPieceDragStart}
          onPieceDragEnd={onPieceDragEnd}
          onNpcPlaced={onNpcPlaced}
          onNpcPlacementCancel={onNpcPlacementCancel}
          onStageDeselect={onStageDeselect}
          onEmptySlotClick={onEmptySlotClick}
          onViewportScaleChange={onViewportScaleChange}
          activeTool={activeTool}
          onBgChange={onBgChange}
          onGridChange={onGridChange}
          onDragGestureStart={onDragGestureStart}
          onDragGestureEnd={onDragGestureEnd}
          walls={walls}
          wallsInteractive={wallsInteractive}
          selectedWallId={selectedWallId}
          activeWallType={activeWallType}
          activeMaterial={activeMaterial}
          onWallSelect={onWallSelect}
          onDrawComplete={onDrawComplete}
          onWallEndpointDrag={onWallEndpointDrag}
          drawingEnabled={drawingEnabled}
          onExitWallsDrawMode={onExitWallsDrawMode}
        />
      </Application>
      {(isBgLoading || uploading) && (
        <BgLoadingOverlay>
          <Spinner />
          <LoadingLabel>
            {uploading ? "Enviando imagem..." : "Carregando imagem..."}
          </LoadingLabel>
        </BgLoadingOverlay>
      )}
    </div>
  );
}

type BgDragState = {
  startWorldX: number;
  startWorldY: number;
  startBgX: number;
  startBgY: number;
} | null;

function ViewportInner({
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
}: Props) {
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

function BgLayer({
  bg,
  bgInteractive,
  vpRef,
  onBgPointerDown,
  onLoadingChange,
}: {
  bg: TacticalMap["bg"];
  bgInteractive?: boolean;
  vpRef?: MutableRefObject<Viewport | null>;
  onBgPointerDown?: (startWorldX: number, startWorldY: number, startBgX: number, startBgY: number) => void;
  onLoadingChange?: (loading: boolean) => void;
}) {
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    if (!bg?.url) {
      setTexture(null);
      onLoadingChange?.(false);
      return;
    }
    onLoadingChange?.(true);
    let cancelled = false;
    if (bg.url.startsWith("blob:")) {
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        setTexture(new Texture({ source: new ImageSource({ resource: img }) }));
        onLoadingChange?.(false);
      };
      img.onerror = () => {
        if (!cancelled) { setTexture(null); onLoadingChange?.(false); }
      };
      img.src = bg.url;
    } else {
      Assets.load(bg.url)
        .then((t: Texture) => {
          if (!cancelled) { setTexture(t); onLoadingChange?.(false); }
        })
        .catch(() => {
          if (!cancelled) { setTexture(null); onLoadingChange?.(false); }
        });
    }
    return () => { cancelled = true; };
  }, [bg?.url, onLoadingChange]);

  if (!bg || !texture) return null;

  const handlePointerDown = (e: FederatedPointerEvent) => {
    if (!bgInteractive || !vpRef?.current) return;
    e.stopPropagation();
    const world = vpRef.current.toWorld(e.global.x, e.global.y);
    onBgPointerDown?.(world.x, world.y, bg.x, bg.y);
  };

  return (
    <pixiSprite
      texture={texture}
      anchor={0.5}
      x={bg.x + bg.width / 2}
      y={bg.y + bg.height / 2}
      width={bg.width}
      height={bg.height}
      rotation={(bg.rotation * Math.PI) / 180}
      alpha={bg.opacity}
      eventMode={bgInteractive ? "static" : "none"}
      cursor={bgInteractive ? "grab" : "default"}
      onPointerDown={handlePointerDown}
    />
  );
}

// Grid lines are drawn directly in WORLD space: every endpoint is pushed through
// applyTransform (rotation + screen-space skew). This avoids a skewed Pixi
// container, which would scale the stroke width non-uniformly and make lines
// vanish at certain skew/zoom combinations. An affine transform keeps straight
// lines straight, so transforming just the two endpoints of each line is exact.
function GridLayer({ grid, vpScale }: { grid: GridShape; vpScale: number }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      const colorHex = parseInt(grid.color.replace("#", ""), 16);
      g.setStrokeStyle({ width: 1 / vpScale, color: colorHex, alpha: grid.opacity });
      if (grid.kind === "square") {
        const { cols, rows, cellSize } = grid;
        const gw = cols * cellSize;
        const gh = rows * cellSize;
        for (let c = 0; c <= cols; c++) {
          const a = applyTransform({ x: c * cellSize, y: 0 }, grid);
          const b = applyTransform({ x: c * cellSize, y: gh }, grid);
          g.moveTo(a.x, a.y).lineTo(b.x, b.y);
        }
        for (let r = 0; r <= rows; r++) {
          const a = applyTransform({ x: 0, y: r * cellSize }, grid);
          const b = applyTransform({ x: gw, y: r * cellSize }, grid);
          g.moveTo(a.x, a.y).lineTo(b.x, b.y);
        }
      } else {
        const size = grid.cellSize;
        const hexW = size * Math.sqrt(3);
        const hexH = size * 1.5;
        for (let r = 0; r < grid.rows; r++) {
          for (let c = 0; c < grid.cols; c++) {
            const cx = c * hexW + (r % 2 === 1 ? hexW / 2 : 0);
            const cy = r * hexH;
            for (let i = 0; i < 6; i++) {
              const angle = ((60 * i - 30) * Math.PI) / 180;
              const p = applyTransform(
                { x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) },
                grid,
              );
              if (i === 0) g.moveTo(p.x, p.y);
              else g.lineTo(p.x, p.y);
            }
            g.closePath();
          }
        }
      }
      g.stroke();
    },
    [grid, vpScale],
  );

  return <pixiGraphics draw={draw} />;
}

// No containerRef: piece position is driven by React state (dragWorldPos) to
// avoid @pixi/react reconciler overwriting imperative position.set() calls.
type PieceLocalDragState = {
  pieceId: string;
  startScreen: { x: number; y: number };
  isDragging: boolean;
  currentSlot: SlotCoord | null;
} | null;

function PiecesLayer({
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
        (p) => p.id !== drag.pieceId && JSON.stringify(p.coord.slot) === JSON.stringify(slot),
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
          (p) => p.id !== drag.pieceId && JSON.stringify(p.coord.slot) === JSON.stringify(slot),
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
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", () => { emptySlotPendingRef.current = null; });
    return () => {
      window.removeEventListener("pointerup", handleUp);
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
        (p) => p.id !== draggingPieceId && JSON.stringify(p.coord.slot) === JSON.stringify(hoverSlot),
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

type PieceSpriteProps = {
  piece: Piece;
  grid: GridShape;
  npc?: CharacterPrivateSummary;
  isSelected: boolean;
  piecesInteractive?: boolean;
  onPointerDown: (piece: Piece, e: FederatedPointerEvent) => void;
};

function PieceSprite({ piece, grid, npc, isSelected, piecesInteractive, onPointerDown }: PieceSpriteProps) {
  const center = useMemo(() => slotToWorld(piece.coord.slot, grid), [piece.coord.slot, grid]);
  // 90% of the slot's inscribed-circle radius. Square keeps the original
  // 0.45·cellSize; hex tokens grow to fill their (much larger) cell by the same
  // proportion. See slotInradius.
  const tokenRadius = slotInradius(grid) * 0.9;
  const avatarRadius = tokenRadius * 0.7;
  const z = piece.coord.z;
  const zOffsetPx = z * 10;

  const [avatarTexture, setAvatarTexture] = useState<Texture | null>(null);
  useEffect(() => {
    let cancelled = false;

    const makeTexture = (img: HTMLImageElement) =>
      new Texture({ source: new ImageSource({ resource: img }) });

    const loadImg = (src: string) =>
      new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });

    const run = async () => {
      const externalUrl = npc?.avatarUrl ?? null;
      if (externalUrl) {
        // getAvatarBlobUrl fetches once with mode:"cors" and caches the
        // resulting blob URL. Blob URLs are same-origin → safe for WebGL.
        // All subsequent PieceSprites for the same NPC reuse the cached promise.
        const blobUrl = await getAvatarBlobUrl(externalUrl);
        if (cancelled) return;
        if (blobUrl) {
          const img = await loadImg(blobUrl);
          if (cancelled) return;
          if (img) { setAvatarTexture(makeTexture(img)); return; }
        }
      }
      if (cancelled) return;
      const img = await loadImg(avatarPlaceholderUrl);
      if (!cancelled) setAvatarTexture(img ? makeTexture(img) : null);
    };

    run();
    return () => { cancelled = true; };
  }, [npc?.avatarUrl]);

  const [frameTexture, setFrameTexture] = useState<Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    Assets.load(gungiFrameUrl)
      .then((t: Texture) => { if (!cancelled) setFrameTexture(t); })
      .catch(() => { if (!cancelled) setFrameTexture(null); });
    return () => { cancelled = true; };
  }, []);

  const shadowRadius = z > 0 ? tokenRadius + 0.1 + z * 0.1 : tokenRadius + 0.1;
  const shadowAlpha = z > 0 ? 0.5 : 0.7;
  const shadowBlurStrength = z > 0 ? 3 + z : 3;
  const shadowFilter = useMemo(() => {
    const f = new BlurFilter({ strength: shadowBlurStrength, quality: 4 });
    // Fixed large padding prevents square-corner artifacts at any blur strength or zoom level.
    f.padding = 80;
    return f;
  }, [shadowBlurStrength]);

  const drawShadow = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.setFillStyle({ color: 0x000000, alpha: shadowAlpha });
      g.circle(0, -zOffsetPx + 2, shadowRadius);
      g.fill();
    },
    [shadowRadius, shadowAlpha, zOffsetPx],
  );

  const drawFallback = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.setFillStyle({ color: 0x2d2d3a });
      g.circle(0, -zOffsetPx, avatarRadius);
      g.fill();
    },
    [avatarRadius, zOffsetPx],
  );

  const maskRef = useRef<PixiGraphics | null>(null);
  const avatarGroupRef = useRef<Container | null>(null);
  const drawMask = useCallback(
    (g: PixiGraphics) => {
      maskRef.current = g;
      g.clear();
      g.setFillStyle({ color: 0xffffff });
      g.circle(0, -zOffsetPx, avatarRadius);
      g.fill();
      if (avatarGroupRef.current) avatarGroupRef.current.mask = g;
    },
    [avatarRadius, zOffsetPx],
  );

  const insetShadowTexture = useMemo(() => getAvatarInsetShadowTexture(avatarRadius), [avatarRadius]);

  const drawSelection = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (!isSelected) return;
      g.setStrokeStyle({ color: 0xffd700, width: 3.5, alpha: 1.0 });
      g.circle(0, -zOffsetPx, tokenRadius + 4);
      g.stroke();
      g.setStrokeStyle({ color: 0xffe066, width: 2, alpha: 0.5 });
      g.circle(0, -zOffsetPx, tokenRadius + 8);
      g.stroke();
    },
    [isSelected, tokenRadius, zOffsetPx],
  );

  return (
    <pixiContainer
      label={`piece-${piece.id}`}
      x={center.x}
      y={center.y}
      eventMode={piecesInteractive ? "static" : "none"}
      cursor={piecesInteractive ? "pointer" : "default"}
      onPointerDown={(e: FederatedPointerEvent) => onPointerDown(piece, e)}
    >
      <pixiGraphics draw={drawShadow} filters={[shadowFilter]} />

      {frameTexture && (
        <pixiSprite
          texture={frameTexture}
          x={-tokenRadius}
          y={-zOffsetPx - tokenRadius}
          width={tokenRadius * 2}
          height={tokenRadius * 2}
        />
      )}

      {avatarTexture ? (
        <>
          <pixiGraphics draw={drawMask} />
          <pixiContainer
            ref={(c: Container | null) => {
              avatarGroupRef.current = c;
              if (c && maskRef.current) c.mask = maskRef.current;
            }}
            x={-avatarRadius}
            y={-zOffsetPx - avatarRadius}
          >
            <pixiSprite
              texture={avatarTexture}
              width={avatarRadius * 2}
              height={avatarRadius * 2}
            />
          </pixiContainer>
          <pixiSprite
            texture={insetShadowTexture}
            x={-avatarRadius}
            y={-zOffsetPx - avatarRadius}
            width={avatarRadius * 2}
            height={avatarRadius * 2}
          />
        </>
      ) : (
        <pixiGraphics draw={drawFallback} />
      )}

      <pixiGraphics draw={drawSelection} />

      {z > 0 && (
        <pixiText
          text={`+${z}m`}
          x={tokenRadius + 2}
          y={-zOffsetPx - tokenRadius - 12}
          style={{ fontSize: 12, fill: 0xffffff, dropShadow: { color: 0x000000, blur: 2, distance: 1 } }}
        />
      )}
    </pixiContainer>
  );
}

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const BgLoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  background: rgba(16, 24, 32, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  pointer-events: none;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.15);
  border-top-color: ${colors.brandAccent};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const LoadingLabel = styled.p`
  margin: 0;
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 14px;
`;
