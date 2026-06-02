import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Application, extend, useApplication } from "@pixi/react";
import { Assets, BlurFilter, Container, Graphics, ImageSource, Sprite, Text, Texture } from "pixi.js";
import type { EventSystem, FederatedPointerEvent } from "pixi.js";
import type { Graphics as PixiGraphics } from "pixi.js";
import gungiFrameUrl from "../../assets/icons/gungi.svg";
import avatarPlaceholderUrl from "../../assets/placeholder/avatar.png";
import { Viewport } from "pixi-viewport";
import type { TacticalMap, GridShape, Piece, SlotCoord } from "../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../types/characterSheet";
import type { Selection } from "../../features/tactical-map/store/editorStore";
import { slotToWorld, worldToSlot } from "../../features/tactical-map/utils/coords";

extend({ Container, Graphics, Sprite, Text, Viewport });

// Module-level CORS-safe avatar cache: R2 URL → Promise<same-origin blob URL>.
// Fetching with mode:"cors" always sends Origin and gets Access-Control-Allow-Origin
// regardless of what the browser HTTP cache holds from non-CORS <img> loads.
// Blob URLs are same-origin so they're safe for WebGL textures.
// Kept alive for the page lifetime (~20 NPCs × ~100 KB ≈ negligible).
const avatarBlobUrlCache = new Map<string, Promise<string | null>>();

function getAvatarBlobUrl(url: string): Promise<string | null> {
  let p = avatarBlobUrlCache.get(url);
  if (!p) {
    p = fetch(url, { mode: "cors" })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => (blob ? URL.createObjectURL(blob) : null))
      .catch(() => null);
    avatarBlobUrlCache.set(url, p);
  }
  return p;
}

const DRAG_LIFT_SCALE = 1.18;

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
  selection?: Selection;
  npcMap?: Map<string, CharacterPrivateSummary>;
  placingNpcId?: string | null;
  onPieceSelect?: (pieceId: string) => void;
  onPieceMove?: (pieceId: string, slot: SlotCoord) => void;
  onPieceDragToRoster?: (pieceId: string) => void;
  onNpcPlaced?: (slot: SlotCoord) => void;
  onNpcPlacementCancel?: () => void;
  onStageDeselect?: () => void;
};

export default function TacticalMapStage({
  map, width, height,
  clampToGrid = false,
  bgInteractive = false,
  onBgPositionChange,
  piecesInteractive,
  selection,
  npcMap,
  placingNpcId,
  onPieceSelect,
  onPieceMove,
  onPieceDragToRoster,
  onNpcPlaced,
  onNpcPlacementCancel,
  onStageDeselect,
}: Props) {
  return (
    <Application width={width} height={height} background={0x101820}>
      <ViewportInner
        map={map}
        width={width}
        height={height}
        clampToGrid={clampToGrid}
        bgInteractive={bgInteractive}
        onBgPositionChange={onBgPositionChange}
        piecesInteractive={piecesInteractive}
        selection={selection}
        npcMap={npcMap}
        placingNpcId={placingNpcId}
        onPieceSelect={onPieceSelect}
        onPieceMove={onPieceMove}
        onPieceDragToRoster={onPieceDragToRoster}
        onNpcPlaced={onNpcPlaced}
        onNpcPlacementCancel={onNpcPlacementCancel}
        onStageDeselect={onStageDeselect}
      />
    </Application>
  );
}

type DragState = {
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
  piecesInteractive,
  selection,
  npcMap,
  placingNpcId,
  onPieceSelect,
  onPieceMove,
  onPieceDragToRoster,
  onNpcPlaced,
  onNpcPlacementCancel,
  onStageDeselect,
}: Props) {
  const { app } = useApplication();
  const vpRef = useRef<Viewport | null>(null);
  const dragState = useRef<DragState>(null);
  const [vpScale, setVpScale] = useState(1);
  const [placementHoverSlot, setPlacementHoverSlot] = useState<SlotCoord | null>(null);

  const vpCallback = useCallback((vp: Viewport | null) => {
    vpRef.current = vp;
    if (!vp) return;
    vp.pinch().wheel().decelerate();
    vp.on("zoomed", () => setVpScale(vp.scale.x));
  }, []);

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
      // Resolve canvas dynamically — avoids storing a possibly-stale reference
      // captured at effect-registration time.
      const canvas = app?.renderer ? app.canvas : null;
      if (!canvas || placingNpcId || bgInteractive || e.button !== 0) return;
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
        isPanningRef.current = true;
        panStartClientRef.current = { x: snapX, y: snapY };
        panStartVpRef.current = { x: vp.x, y: vp.y };
      });
    };

    const onWindowMove = (e: PointerEvent) => {
      if (!isPanningRef.current) return;
      const vp = vpRef.current;
      if (!vp) return;
      vp.x = panStartVpRef.current.x + (e.clientX - panStartClientRef.current.x);
      vp.y = panStartVpRef.current.y + (e.clientY - panStartClientRef.current.y);
    };

    const onWindowUp = () => { isPanningRef.current = false; };

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
  }, [app, placingNpcId, bgInteractive]);

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
        onNpcPlaced(worldToSlot(world, map.grid));
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
      const center = slotToWorld(placementHoverSlot, map.grid);
      const r = map.grid.cellSize / 2 - 2;
      g.setFillStyle({ color: 0x30ff80, alpha: 0.3 });
      g.setStrokeStyle({ color: 0x30ff80, width: 2, alpha: 0.9 });
      if (map.grid.kind === "square") {
        g.rect(center.x - r, center.y - r, r * 2, r * 2);
      } else {
        g.circle(center.x, center.y, r);
      }
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
        dragState={dragState}
        onBgPositionChange={onBgPositionChange}
      />
      <GridLayer grid={map.grid} vpScale={vpScale} />
      <pixiContainer label="decorations-layer" />
      <pixiGraphics draw={drawPlacementHover} />
      <PiecesLayer
        map={map}
        vpRef={vpRef}
        piecesInteractive={piecesInteractive}
        selection={selection}
        npcMap={npcMap}
        pieceDragActiveRef={pieceDragActiveRef}
        onPieceSelect={onPieceSelect}
        onPieceMove={onPieceMove}
        onPieceDragToRoster={onPieceDragToRoster}
        onStageDeselect={onStageDeselect}
      />
      <pixiContainer label="walls-layer" />
      <pixiContainer label="overlay-layer" />
    </pixiViewport>
  );
}

function BgLayer({
  bg,
  bgInteractive,
  dragState,
  onBgPositionChange,
}: {
  bg: TacticalMap["bg"];
  bgInteractive?: boolean;
  dragState?: MutableRefObject<DragState>;
  onBgPositionChange?: (x: number, y: number) => void;
}) {
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    if (!bg?.url) {
      setTexture(null);
      return;
    }
    let cancelled = false;
    if (bg.url.startsWith("blob:")) {
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        setTexture(new Texture({ source: new ImageSource({ resource: img }) }));
      };
      img.onerror = () => { if (!cancelled) setTexture(null); };
      img.src = bg.url;
    } else {
      Assets.load(bg.url)
        .then((t: Texture) => { if (!cancelled) setTexture(t); })
        .catch(() => { if (!cancelled) setTexture(null); });
    }
    return () => { cancelled = true; };
  }, [bg?.url]);

  if (!bg || !texture) return null;

  const handlePointerDown = (e: FederatedPointerEvent) => {
    if (!bgInteractive || !dragState || !bg) return;
    e.stopPropagation();
    dragState.current = {
      startWorldX: e.global.x,
      startWorldY: e.global.y,
      startBgX: bg.x,
      startBgY: bg.y,
    };
  };

  const handlePointerMove = (e: FederatedPointerEvent) => {
    if (!bgInteractive || !dragState?.current || !onBgPositionChange) return;
    onBgPositionChange(
      dragState.current.startBgX + (e.global.x - dragState.current.startWorldX),
      dragState.current.startBgY + (e.global.y - dragState.current.startWorldY),
    );
  };

  const handlePointerUp = () => {
    if (dragState) dragState.current = null;
  };

  return (
    <pixiSprite
      texture={texture}
      x={bg.x}
      y={bg.y}
      width={bg.width}
      height={bg.height}
      rotation={(bg.rotation * Math.PI) / 180}
      alpha={bg.opacity}
      eventMode={bgInteractive ? "static" : "none"}
      cursor={bgInteractive ? "grab" : "default"}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerUpOutside={handlePointerUp}
    />
  );
}

function GridLayer({ grid, vpScale }: { grid: GridShape; vpScale: number }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      const colorHex = parseInt(grid.color.replace("#", ""), 16);
      g.setStrokeStyle({ width: 1 / vpScale, color: colorHex, alpha: grid.opacity });
      if (grid.kind === "square") {
        const { cols, rows, cellSize } = grid;
        for (let c = 0; c <= cols; c++) {
          g.moveTo(c * cellSize, 0).lineTo(c * cellSize, rows * cellSize);
        }
        for (let r = 0; r <= rows; r++) {
          g.moveTo(0, r * cellSize).lineTo(cols * cellSize, r * cellSize);
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
              const x = cx + size * Math.cos(angle);
              const y = cy + size * Math.sin(angle);
              if (i === 0) g.moveTo(x, y);
              else g.lineTo(x, y);
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
  map, vpRef, piecesInteractive, selection, npcMap, pieceDragActiveRef,
  onPieceSelect, onPieceMove, onPieceDragToRoster, onStageDeselect,
}: {
  map: TacticalMap;
  vpRef: React.MutableRefObject<Viewport | null>;
  piecesInteractive?: boolean;
  selection?: Selection;
  npcMap?: Map<string, CharacterPrivateSummary>;
  pieceDragActiveRef: React.MutableRefObject<boolean>;
  onPieceSelect?: (pieceId: string) => void;
  onPieceMove?: (pieceId: string, slot: SlotCoord) => void;
  onPieceDragToRoster?: (pieceId: string) => void;
  onStageDeselect?: () => void;
}) {
  const { app } = useApplication();
  const localDrag = useRef<PieceLocalDragState>(null);
  const [draggingPieceId, setDraggingPieceId] = useState<string | null>(null);
  const [hoverSlot, setHoverSlot] = useState<SlotCoord | null>(null);
  // World-space position of the piece being dragged — updated on every
  // pointermove and passed down as props so the reconciler positions it
  // correctly (imperative position.set() gets overwritten by reconciler).
  const [dragWorldPos, setDragWorldPos] = useState<{ x: number; y: number } | null>(null);

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
      }
      if (!drag.isDragging) return;
      const vp = vpRef.current;
      if (!vp) return;
      const world = vp.toWorld(stageX, stageY);
      setDragWorldPos({ x: world.x, y: world.y });
      drag.currentSlot = worldToSlot(world, map.grid);
      setHoverSlot(drag.currentSlot);
    };

    const handleUp = (e: FederatedPointerEvent) => {
      const drag = localDrag.current;
      if (!drag) return;
      localDrag.current = null;
      setDraggingPieceId(null);
      setDragWorldPos(null);
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
      if (!slot) return;
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
      setDragWorldPos(null);
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
  }, [app, vpRef, map.grid, map.pieces, piecesInteractive, onPieceSelect, onPieceMove, onPieceDragToRoster]);

  const drawHoverSlot = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (!hoverSlot || !draggingPieceId) return;
      const occupied = map.pieces.some(
        (p) => p.id !== draggingPieceId && JSON.stringify(p.coord.slot) === JSON.stringify(hoverSlot),
      );
      const center = slotToWorld(hoverSlot, map.grid);
      const r = map.grid.cellSize / 2 - 4;
      g.setFillStyle({ color: occupied ? 0xff3030 : 0x30ff80, alpha: 0.25 });
      if (map.grid.kind === "square") {
        g.rect(center.x - r, center.y - r, r * 2, r * 2);
      } else {
        g.circle(center.x, center.y, r);
      }
      g.fill();
    },
    [hoverSlot, draggingPieceId, map.pieces, map.grid],
  );

  return (
    <pixiContainer
      label="pieces-layer"
      eventMode="static"
      onPointerDown={(e: FederatedPointerEvent) => {
        if (e.target === e.currentTarget) onStageDeselect?.();
      }}
    >
      <pixiGraphics draw={drawHoverSlot} />
      {map.pieces.map((p) => (
        <PieceSprite
          key={p.id}
          piece={p}
          grid={map.grid}
          npc={npcMap?.get(p.characterId)}
          isSelected={selection?.kind === "piece" && selection.id === p.id}
          isDragging={draggingPieceId === p.id}
          dragWorldPos={draggingPieceId === p.id ? dragWorldPos : null}
          onPointerDown={(_piece, e) => {
            if (!piecesInteractive || localDrag.current) return;
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
  isDragging: boolean;
  dragWorldPos?: { x: number; y: number } | null;
  onPointerDown: (piece: Piece, e: FederatedPointerEvent) => void;
};

function PieceSprite({ piece, grid, npc, isSelected, isDragging, dragWorldPos, onPointerDown }: PieceSpriteProps) {
  const center = useMemo(() => slotToWorld(piece.coord.slot, grid), [piece.coord.slot, grid]);
  const tokenRadius = grid.cellSize * 0.45;
  const avatarRadius = tokenRadius * 0.7;
  const z = piece.coord.z;
  const zOffsetPx = z * 10;

  // Piece position: use dragWorldPos during drag so React reconciler is always
  // in control — imperative position.set() gets overwritten on each re-render.
  const posX = dragWorldPos?.x ?? center.x;
  const posY = dragWorldPos?.y ?? center.y;

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

  const shadowRadius = isDragging ? tokenRadius + 6 : z > 0 ? tokenRadius + 2 + z * 2 : tokenRadius + 2;
  const shadowAlpha = isDragging ? 0.38 : z > 0 ? 0.45 : 0.58;
  const shadowBlurStrength = isDragging ? 5 : z > 0 ? 2 + z : 2;
  const shadowFilter = useMemo(() => new BlurFilter({ strength: shadowBlurStrength }), [shadowBlurStrength]);

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

  const avatarSpriteRef = useRef<import("pixi.js").Sprite | null>(null);
  const maskRef = useRef<PixiGraphics | null>(null);
  const drawMask = useCallback(
    (g: PixiGraphics) => {
      maskRef.current = g;
      g.clear();
      g.setFillStyle({ color: 0xffffff });
      g.circle(0, -zOffsetPx, avatarRadius);
      g.fill();
      if (avatarSpriteRef.current) avatarSpriteRef.current.mask = g;
    },
    [avatarRadius, zOffsetPx],
  );

  const reliefBlur = useMemo(() => new BlurFilter({ strength: 2.5 }), []);
  const drawRelief = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      const r = avatarRadius, cy = -zOffsetPx;
      g.setFillStyle({ color: 0x000000, alpha: 0.42 });
      g.circle(0, cy - r * 0.18, r * 1.0);
      g.fill();
      g.setFillStyle({ color: 0xffffff, alpha: 0.07 });
      g.circle(0, cy + r * 0.22, r * 0.9);
      g.fill();
    },
    [avatarRadius, zOffsetPx],
  );

  const reliefMaskRef = useRef<PixiGraphics | null>(null);
  const reliefContainerRef = useRef<Container | null>(null);

  const drawReliefMask = useCallback((g: PixiGraphics) => {
    reliefMaskRef.current = g;
    g.clear();
    g.setFillStyle({ color: 0xffffff });
    g.circle(0, -zOffsetPx, avatarRadius);
    g.fill();
    if (reliefContainerRef.current) reliefContainerRef.current.mask = g;
  }, [avatarRadius, zOffsetPx]);

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
      x={posX}
      y={isDragging ? posY - 8 : posY}
      scale={isDragging ? DRAG_LIFT_SCALE : 1.0}
      eventMode="static"
      cursor="pointer"
      onPointerDown={(e: FederatedPointerEvent) => onPointerDown(piece, e)}
    >
      <pixiGraphics
        draw={drawShadow}
        filters={[shadowFilter]}
        y={isDragging ? 8 : 0}
        scale={isDragging ? 1 / DRAG_LIFT_SCALE : 1}
      />

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
          <pixiSprite
            ref={(s) => {
              avatarSpriteRef.current = s;
              if (s && maskRef.current) s.mask = maskRef.current;
            }}
            texture={avatarTexture}
            x={-avatarRadius}
            y={-zOffsetPx - avatarRadius}
            width={avatarRadius * 2}
            height={avatarRadius * 2}
          />
        </>
      ) : (
        <pixiGraphics draw={drawFallback} />
      )}

      <pixiGraphics draw={drawReliefMask} />
      <pixiContainer
        ref={(c: Container | null) => {
          reliefContainerRef.current = c;
          if (c && reliefMaskRef.current) c.mask = reliefMaskRef.current;
        }}
      >
        <pixiGraphics draw={drawRelief} filters={[reliefBlur]} />
      </pixiContainer>

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
