import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Application, extend, useApplication } from "@pixi/react";
import { Assets, BlurFilter, Container, Graphics, ImageSource, Sprite, Text, Texture } from "pixi.js";
import type { EventSystem, FederatedPointerEvent } from "pixi.js";
import type { Graphics as PixiGraphics, Sprite as PixiSprite } from "pixi.js";
import { Viewport } from "pixi-viewport";
import type { TacticalMap, GridShape, Piece, SlotCoord } from "../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../types/characterSheet";
import type { Selection } from "../../features/tactical-map/store/editorStore";
import { slotToWorld, worldToSlot } from "../../features/tactical-map/utils/coords";
import gungiFrameUrl from "../../assets/icons/gungi.svg";

function npcColor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  const hue = Math.abs(hash) % 360;
  const h = hue / 360, s = 0.55, l = 0.4;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const toRgb = (t: number) => {
    const tt = ((t % 1) + 1) % 1;
    if (tt < 1/6) return p + (q - p) * 6 * tt;
    if (tt < 1/2) return q;
    if (tt < 2/3) return p + (q - p) * (2/3 - tt) * 6;
    return p;
  };
  const r = toRgb(h + 1/3), g2 = toRgb(h), b = toRgb(h - 1/3);
  return (Math.round(r * 255) << 16) | (Math.round(g2 * 255) << 8) | Math.round(b * 255);
}

extend({ Container, Graphics, Sprite, Text, Viewport });

// @pixi/react v8 auto-generates JSX intrinsics only for pixi.js exports.
// Viewport comes from pixi-viewport, so we declare it manually here.
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
  // Fase 4 — peças interativas
  piecesInteractive?: boolean;
  selection?: Selection;
  npcMap?: Map<string, CharacterPrivateSummary>;
  placingNpcId?: string | null;
  onPieceSelect?: (pieceId: string) => void;
  onPieceMove?: (pieceId: string, slot: SlotCoord) => void;
  onPieceDragToRoster?: (pieceId: string) => void;
  onNpcPlaced?: (slot: SlotCoord) => void;
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

// useApplication() only works inside a child of <Application>, not in the
// same component that renders it — hence the split.
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
  onStageDeselect,
}: Props) {
  const { app } = useApplication();
  const vpRef = useRef<Viewport | null>(null);
  const dragState = useRef<DragState>(null);
  const [vpScale, setVpScale] = useState(1);

  // Callback ref instead of useEffect([], []): PixiJS v8 initialises async,
  // so the first render may return null (see guard below). A plain effect
  // with [] deps fires on that first null render and never again, leaving
  // plugins unwired. A callback ref fires at Viewport construction time,
  // whenever that happens.
  const vpCallback = useCallback((vp: Viewport | null) => {
    vpRef.current = vp;
    if (!vp) return;
    vp.drag().pinch().wheel().decelerate();
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

  // app.renderer is undefined until PixiJS async init completes. Passing
  // undefined as events to the Viewport constructor crashes in addListeners()
  // when it tries to access events.domElement. Guard here; @pixi/react will
  // re-render once the app is ready.
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
      eventMode={placingNpcId ? "static" : "passive"}
      onPointerDown={(e: FederatedPointerEvent) => {
        if (!placingNpcId || !onNpcPlaced) return;
        const vp = vpRef.current;
        if (!vp) return;
        const world = vp.toWorld(e.global.x, e.global.y);
        onNpcPlaced(worldToSlot(world, map.grid));
      }}
    >
      <BgLayer
        bg={map.bg}
        bgInteractive={bgInteractive}
        dragState={dragState}
        onBgPositionChange={onBgPositionChange}
      />
      <GridLayer grid={map.grid} vpScale={vpScale} />
      <pixiContainer label="decorations-layer" />
      <PiecesLayer
        map={map}
        vpRef={vpRef}
        piecesInteractive={piecesInteractive}
        selection={selection}
        npcMap={npcMap}
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
      // blob: URLs have no file extension so Assets.load() can't determine
      // the parser and bails. Load via HTMLImageElement (same-origin blob,
      // no CORS) and wrap in a Texture using the v8 ImageSource API.
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        setTexture(new Texture({ source: new ImageSource({ resource: img }) }));
      };
      img.onerror = () => {
        if (!cancelled) setTexture(null);
      };
      img.src = bg.url;
    } else {
      // Regular URL (R2 or external): requires CORS headers on the server.
      Assets.load(bg.url)
        .then((t: Texture) => {
          if (!cancelled) setTexture(t);
        })
        .catch(() => {
          if (!cancelled) setTexture(null);
        });
    }

    return () => {
      cancelled = true;
    };
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
    const dx = e.global.x - dragState.current.startWorldX;
    const dy = e.global.y - dragState.current.startWorldY;
    onBgPositionChange(
      dragState.current.startBgX + dx,
      dragState.current.startBgY + dy,
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
      // Stroke width is in world coordinates and scales with viewport zoom.
      // Dividing by vpScale keeps lines at a constant 1 CSS pixel regardless
      // of zoom level, preventing thick lines on zoom-in and vanishing lines
      // on zoom-out.
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
        // Pointy-top hexagons in offset coordinates (odd-r layout).
        // Column/row indices are NOT axial coords — compute pixel centers directly
        // so rows tile horizontally like a brick wall, not on the diagonal.
        const size = grid.cellSize;
        const hexW = size * Math.sqrt(3); // center-to-center horizontal
        const hexH = size * 1.5;          // center-to-center vertical
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

type PieceLocalDragState = {
  pieceId: string;
  startScreen: { x: number; y: number };
  isDragging: boolean;
  currentSlot: SlotCoord | null;
  containerRef: React.MutableRefObject<Container | null>;
} | null;

function PiecesLayer({
  map, vpRef, piecesInteractive, selection, npcMap,
  onPieceSelect, onPieceMove, onPieceDragToRoster, onStageDeselect,
}: {
  map: TacticalMap;
  vpRef: React.MutableRefObject<Viewport | null>;
  piecesInteractive?: boolean;
  selection?: Selection;
  npcMap?: Map<string, CharacterPrivateSummary>;
  onPieceSelect?: (pieceId: string) => void;
  onPieceMove?: (pieceId: string, slot: SlotCoord) => void;
  onPieceDragToRoster?: (pieceId: string) => void;
  onStageDeselect?: () => void;
}) {
  const { app } = useApplication();
  const localDrag = useRef<PieceLocalDragState>(null);
  const [draggingPieceId, setDraggingPieceId] = useState<string | null>(null);
  const [hoverSlot, setHoverSlot] = useState<SlotCoord | null>(null);

  useEffect(() => {
    const stage = app?.stage;
    if (!stage || !piecesInteractive) return;

    const handleMove = (e: FederatedPointerEvent) => {
      const drag = localDrag.current;
      if (!drag) return;
      const dx = e.global.x - drag.startScreen.x;
      const dy = e.global.y - drag.startScreen.y;
      if (!drag.isDragging && Math.hypot(dx, dy) > 4) {
        drag.isDragging = true;
        vpRef.current?.plugins.pause("drag");
        setDraggingPieceId(drag.pieceId);
      }
      if (!drag.isDragging) return;
      const vp = vpRef.current;
      if (vp && drag.containerRef.current) {
        const world = vp.toWorld(e.global.x, e.global.y);
        drag.containerRef.current.position.set(world.x, world.y - 8);
        drag.currentSlot = worldToSlot(world, map.grid);
        setHoverSlot(drag.currentSlot);
      }
    };

    const handleUp = (e: FederatedPointerEvent) => {
      const drag = localDrag.current;
      if (!drag) return;
      vpRef.current?.plugins.resume("drag");
      localDrag.current = null;
      setDraggingPieceId(null);
      setHoverSlot(null);
      if (!drag.isDragging) {
        onPieceSelect?.(drag.pieceId);
        return;
      }
      // Detect if pointer ended outside the canvas (drag to roster)
      const target = (e.nativeEvent as PointerEvent).target as Node | null;
      const isOverSidebar = target && !app.canvas.contains(target);
      if (isOverSidebar) {
        onPieceDragToRoster?.(drag.pieceId);
        return;
      }
      const slot = drag.currentSlot;
      if (!slot) return;
      // TODO(piece-stacking): currently rejects occupied slots; future: allow stacking
      const occupied = map.pieces.some(
        (p) => p.id !== drag.pieceId && JSON.stringify(p.coord.slot) === JSON.stringify(slot),
      );
      if (!occupied) onPieceMove?.(drag.pieceId, slot);
    };

    stage.on("pointermove", handleMove);
    stage.on("pointerup", handleUp);
    stage.on("pointerupoutside", handleUp);
    return () => {
      stage.off("pointermove", handleMove);
      stage.off("pointerup", handleUp);
      stage.off("pointerupoutside", handleUp);
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
          localDrag={localDrag}
          onPointerDown={(_piece, e) => {
            if (!piecesInteractive || localDrag.current) return;
            const containerRef: React.MutableRefObject<Container | null> = { current: null };
            localDrag.current = {
              pieceId: p.id,
              startScreen: { x: e.global.x, y: e.global.y },
              isDragging: false,
              currentSlot: null,
              containerRef,
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
  localDrag: React.MutableRefObject<PieceLocalDragState>;
  onPointerDown: (piece: Piece, e: FederatedPointerEvent) => void;
};

function PieceSprite({ piece, grid, npc, isSelected, isDragging, localDrag, onPointerDown }: PieceSpriteProps) {
  const center = useMemo(() => slotToWorld(piece.coord.slot, grid), [piece.coord.slot, grid]);
  const tokenRadius = grid.cellSize / 3;
  const z = piece.coord.z;
  const zOffsetPx = z * 10;

  // Async avatar texture (same pattern as BgLayer)
  const [avatarTexture, setAvatarTexture] = useState<Texture | null>(null);
  useEffect(() => {
    if (!npc?.avatarUrl) { setAvatarTexture(null); return; }
    let cancelled = false;
    if (npc.avatarUrl.startsWith("blob:")) {
      const img = new Image();
      img.onload = () => { if (!cancelled) setAvatarTexture(new Texture({ source: new ImageSource({ resource: img }) })); };
      img.onerror = () => { if (!cancelled) setAvatarTexture(null); };
      img.src = npc.avatarUrl;
    } else {
      Assets.load(npc.avatarUrl).then((t: Texture) => { if (!cancelled) setAvatarTexture(t); }).catch(() => { if (!cancelled) setAvatarTexture(null); });
    }
    return () => { cancelled = true; };
  }, [npc?.avatarUrl]);

  // Gungi frame texture
  const [frameTexture, setFrameTexture] = useState<Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    Assets.load(gungiFrameUrl).then((t: Texture) => { if (!cancelled) setFrameTexture(t); }).catch(() => { if (!cancelled) setFrameTexture(null); });
    return () => { cancelled = true; };
  }, []);

  const fallbackColor = useMemo(() => npcColor(piece.id), [piece.id]);
  const initial = npc?.nickName?.[0]?.toUpperCase() ?? "?";

  // Shadow values
  const shadowRadius = isDragging ? tokenRadius + 6 : z > 0 ? tokenRadius + 2 + z * 2 : tokenRadius + 2;
  const shadowAlpha = isDragging ? 0.38 : z > 0 ? 0.45 : 0.58;
  const shadowBlurStrength = isDragging ? 5 : z > 0 ? 2 + z : 2;
  const shadowFilter = useMemo(() => new BlurFilter({ strength: shadowBlurStrength }), [shadowBlurStrength]);

  const drawShadow = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.setFillStyle({ color: 0x000000, alpha: shadowAlpha });
      g.circle(0, 2, shadowRadius);
      g.fill();
    },
    [shadowRadius, shadowAlpha],
  );

  const drawFallback = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.setFillStyle({ color: fallbackColor });
      g.circle(0, -zOffsetPx, tokenRadius);
      g.fill();
    },
    [fallbackColor, tokenRadius, zOffsetPx],
  );

  // Avatar circular mask
  const avatarSpriteRef = useRef<PixiSprite | null>(null);
  const maskRef = useRef<PixiGraphics | null>(null);
  const drawMask = useCallback(
    (g: PixiGraphics) => {
      maskRef.current = g;
      g.clear();
      g.setFillStyle({ color: 0xffffff });
      g.circle(0, -zOffsetPx, tokenRadius);
      g.fill();
      if (avatarSpriteRef.current) avatarSpriteRef.current.mask = g;
    },
    [tokenRadius, zOffsetPx],
  );

  // Selection ring
  const drawSelection = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (!isSelected) return;
      g.setStrokeStyle({ color: 0xffffff, width: 2, alpha: 0.9 });
      g.circle(0, -zOffsetPx, tokenRadius + 5);
      g.stroke();
      g.setStrokeStyle({ color: 0xffffff, width: 3, alpha: 0.2 });
      g.circle(0, -zOffsetPx, tokenRadius + 8);
      g.stroke();
    },
    [isSelected, tokenRadius, zOffsetPx],
  );

  // Container ref for imperative drag updates
  const containerRef = useRef<Container | null>(null);
  useEffect(() => {
    if (isDragging && localDrag.current?.pieceId === piece.id) {
      localDrag.current.containerRef.current = containerRef.current;
    }
  }, [isDragging, piece.id, localDrag]);

  return (
    <pixiContainer
      ref={containerRef}
      label={`piece-${piece.id}`}
      x={center.x}
      y={isDragging ? center.y - 8 : center.y}
      scale={isDragging ? 1.18 : 1.0}
      eventMode="static"
      cursor="pointer"
      onPointerDown={(e: FederatedPointerEvent) => onPointerDown(piece, e)}
    >
      {/* Shadow stays at origin during drag via counter-offset + counter-scale */}
      <pixiGraphics
        draw={drawShadow}
        filters={[shadowFilter]}
        y={isDragging ? 8 : 0}
        scale={isDragging ? 1 / 1.18 : 1}
      />

      {avatarTexture ? (
        <>
          <pixiGraphics draw={drawMask} />
          <pixiSprite
            ref={(s) => {
              avatarSpriteRef.current = s;
              if (s && maskRef.current) s.mask = maskRef.current;
            }}
            texture={avatarTexture}
            x={-tokenRadius}
            y={-zOffsetPx - tokenRadius}
            width={tokenRadius * 2}
            height={tokenRadius * 2}
          />
        </>
      ) : (
        <>
          <pixiGraphics draw={drawFallback} />
          <pixiText
            text={initial}
            x={0}
            y={-zOffsetPx}
            anchor={{ x: 0.5, y: 0.5 }}
            style={{ fontSize: Math.round(tokenRadius * 0.85), fill: 0xffffff, fontWeight: "bold" }}
          />
        </>
      )}

      {frameTexture && (
        <pixiSprite
          texture={frameTexture}
          x={-tokenRadius}
          y={-zOffsetPx - tokenRadius}
          width={tokenRadius * 2}
          height={tokenRadius * 2}
        />
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
