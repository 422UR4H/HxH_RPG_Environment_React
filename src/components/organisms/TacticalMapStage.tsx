import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Application, extend, useApplication } from "@pixi/react";
import { Assets, Container, Graphics, Sprite, Text } from "pixi.js";
import type { EventSystem, FederatedPointerEvent, Texture } from "pixi.js";
import { Viewport } from "pixi-viewport";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { TacticalMap, GridShape, Piece } from "../../types/tacticalMap";
import { slotToWorld } from "../../features/tactical-map/utils/coords";

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
};

export default function TacticalMapStage({
  map, width, height,
  clampToGrid = false,
  bgInteractive = false,
  onBgPositionChange,
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
    >
      <BgLayer
        bg={map.bg}
        bgInteractive={bgInteractive}
        dragState={dragState}
        onBgPositionChange={onBgPositionChange}
      />
      <GridLayer grid={map.grid} vpScale={vpScale} />
      <pixiContainer label="decorations-layer" />
      <PiecesLayer map={map} />
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

  // Texture.from() is a synchronous cache lookup and warns when the URL is
  // not yet cached. Assets.load() is the correct async path for new URLs;
  // pixi.js caches the result so subsequent calls with the same URL are free.
  useEffect(() => {
    if (!bg?.url) {
      setTexture(null);
      return;
    }
    let cancelled = false;
    Assets.load(bg.url).then((t: Texture) => {
      if (!cancelled) setTexture(t);
    });
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
        for (let r = 0; r < grid.rows; r++) {
          for (let c = 0; c < grid.cols; c++) {
            const center = slotToWorld({ kind: "hex", q: c, r }, grid);
            const size = grid.cellSize;
            for (let i = 0; i < 6; i++) {
              const angle = ((60 * i - 30) * Math.PI) / 180;
              const x = center.x + size * Math.cos(angle);
              const y = center.y + size * Math.sin(angle);
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

function PiecesLayer({ map }: { map: TacticalMap }) {
  const pieces = useMemo(() => map.pieces, [map.pieces]);
  return (
    <pixiContainer label="pieces-layer">
      {pieces.map((p) => (
        <PieceSprite key={p.id} piece={p} grid={map.grid} />
      ))}
    </pixiContainer>
  );
}

function PieceSprite({ piece, grid }: { piece: Piece; grid: GridShape }) {
  const center = slotToWorld(piece.coord.slot, grid);
  const radius = grid.cellSize / 3;
  const zOffsetPx = piece.coord.z * 10;

  const drawShadow = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.setFillStyle({ color: 0x000000, alpha: 0.35 });
      g.circle(center.x, center.y, radius);
      g.fill();
    },
    [center.x, center.y, radius],
  );

  const drawBody = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.setFillStyle({ color: 0xff8800 });
      g.circle(center.x, center.y - zOffsetPx, radius);
      g.fill();
    },
    [center.x, center.y, radius, zOffsetPx],
  );

  return (
    <pixiContainer label={`piece-${piece.id}`}>
      <pixiGraphics draw={drawShadow} />
      <pixiGraphics draw={drawBody} />
      {piece.coord.z > 0 && (
        <pixiText
          text={`+${piece.coord.z}m`}
          x={center.x + radius}
          y={center.y - zOffsetPx - radius - 12}
          style={{ fontSize: 12, fill: 0xffffff }}
        />
      )}
    </pixiContainer>
  );
}
