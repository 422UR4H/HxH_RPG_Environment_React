import { useCallback, useMemo } from "react";
import type { FederatedPointerEvent, Graphics as PixiGraphics } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import type { BgImage, GridShape } from "../../types/tacticalMap";
import type { ToolKind } from "./store/editorStore";
import {
  applyTransform,
  gridHandleLocal,
  gridFromHandleDrag,
} from "./utils/coords";
import { computeNewBgFromDrag } from "./utils/bgHandles";
import { useShiftPressed } from "./hooks/useShiftPressed";
import { useHandleDrag } from "./hooks/useHandleDrag";
import HandleMarker from "./stage/HandleMarker";

type XY = { x: number; y: number };

const HANDLE_SIZE = 8;     // screen px
const ROTATE_RADIUS = 10;  // screen px
const ROTATE_OFFSET = 24;  // screen px above handle edge

// The bg drag needs the aspect ratio as it was at pointerdown, so it rides
// inside the drag's start snapshot instead of being an extra parameter on
// useHandleDrag — the grid has no equivalent and the hook stays agnostic.
type BgDragStart = { bg: NonNullable<BgImage>; aspectRatio: number };

const computeBgFromDrag = (
  handle: string,
  start: BgDragStart,
  worldX: number,
  worldY: number,
  shift: boolean,
) => computeNewBgFromDrag(handle, start.bg, worldX, worldY, start.aspectRatio, shift);


type Props = {
  activeTool: ToolKind;
  bg: BgImage;
  grid: GridShape;
  vpScale: number;
  onBgChange: (bg: NonNullable<BgImage>) => void;
  onGridChange: (grid: GridShape) => void;
  vpRef: React.MutableRefObject<Viewport | null>;
  // Bracket a handle drag as one undo step (history pauses between these).
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
};

export default function MapHandlesLayer({
  activeTool,
  bg,
  grid,
  vpScale,
  onBgChange,
  onGridChange,
  vpRef,
  onGestureStart,
  onGestureEnd,
}: Props) {
  return (
    <>
      {activeTool === "bg" && bg && (
        <BgHandles
          bg={bg}
          vpScale={vpScale}
          onBgChange={onBgChange}
          vpRef={vpRef}
          onGestureStart={onGestureStart}
          onGestureEnd={onGestureEnd}
        />
      )}
      {activeTool === "grid" && (
        <GridHandles
          grid={grid}
          vpScale={vpScale}
          onGridChange={onGridChange}
          vpRef={vpRef}
          onGestureStart={onGestureStart}
          onGestureEnd={onGestureEnd}
        />
      )}
    </>
  );
}

// ─── BgHandles ────────────────────────────────────────────────────────────────

function BgHandles({
  bg,
  vpScale,
  onBgChange,
  vpRef,
  onGestureStart,
  onGestureEnd,
}: {
  bg: NonNullable<BgImage>;
  vpScale: number;
  onBgChange: (bg: NonNullable<BgImage>) => void;
  vpRef: React.MutableRefObject<Viewport | null>;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
}) {
  const shiftPressed = useShiftPressed();

  const getStart = useCallback(
    (): BgDragStart => ({ bg: { ...bg }, aspectRatio: bg.width / bg.height }),
    [bg],
  );
  const startDrag = useHandleDrag<BgDragStart, NonNullable<BgImage>>({
    vpRef,
    getStart,
    compute: computeBgFromDrag,
    onResult: onBgChange,
    onGestureStart,
    onGestureEnd,
  });

  const hs = HANDLE_SIZE / vpScale;
  const rr = ROTATE_RADIUS / vpScale;
  const ro = ROTATE_OFFSET / vpScale;
  const { x, y, width: w, height: h } = bg;

  // World-space anchor positions for each handle, following bg.rotation. The
  // container is NOT transformed, so the markers (squares, circle) stay crisp;
  // only their positions rotate with the image. The border is a polygon through
  // the four rotated corners.
  const pts = useMemo(() => {
    const rot = ((bg.rotation || 0) * Math.PI) / 180;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const bcx = x + w / 2;
    const bcy = y + h / 2;
    const toWorld = (px: number, py: number): XY => {
      const ddx = px - bcx;
      const ddy = py - bcy;
      return { x: bcx + ddx * cos - ddy * sin, y: bcy + ddx * sin + ddy * cos };
    };
    return {
      TL: toWorld(x, y),
      TC: toWorld(bcx, y),
      TR: toWorld(x + w, y),
      ML: toWorld(x, bcy),
      MR: toWorld(x + w, bcy),
      BL: toWorld(x, y + h),
      BC: toWorld(bcx, y + h),
      BR: toWorld(x + w, y + h),
      topCenter: toWorld(bcx, y),
      rot: toWorld(bcx, y - ro),
    };
  }, [bg.rotation, x, y, w, h, ro]);

  const drawBorder = useCallback((g: PixiGraphics) => {
    g.clear();
    g.setStrokeStyle({ width: 1 / vpScale, color: 0xffffff, alpha: 0.7 });
    g.moveTo(pts.TL.x, pts.TL.y);
    g.lineTo(pts.TR.x, pts.TR.y);
    g.lineTo(pts.BR.x, pts.BR.y);
    g.lineTo(pts.BL.x, pts.BL.y);
    g.closePath();
    g.stroke();
  }, [pts, vpScale]);

  const drawRotate = useCallback((g: PixiGraphics) => {
    g.clear();
    g.setStrokeStyle({ width: 1 / vpScale, color: 0xffd700, alpha: 0.8 });
    g.moveTo(pts.topCenter.x, pts.topCenter.y);
    g.lineTo(pts.rot.x, pts.rot.y);
    g.stroke();
    g.setFillStyle({ color: 0xffd700, alpha: 1 });
    g.circle(pts.rot.x, pts.rot.y, rr);
    g.fill();
    g.setStrokeStyle({ width: 1 / vpScale, color: 0x333333 });
    g.stroke();
  }, [pts, rr, vpScale]);

  const resizeHandles: Array<{ id: string; p: XY; cursor: string }> = [
    { id: "TL", p: pts.TL, cursor: "nw-resize" },
    { id: "TC", p: pts.TC, cursor: "n-resize" },
    { id: "TR", p: pts.TR, cursor: "ne-resize" },
    { id: "ML", p: pts.ML, cursor: "w-resize" },
    { id: "MR", p: pts.MR, cursor: "e-resize" },
    { id: "BL", p: pts.BL, cursor: "sw-resize" },
    { id: "BC", p: pts.BC, cursor: "s-resize" },
    { id: "BR", p: pts.BR, cursor: "se-resize" },
  ];

  return (
    <pixiContainer label="bg-handles">
      <pixiGraphics draw={drawBorder} eventMode="none" />
      {resizeHandles.map(({ id, p, cursor }) => (
        <HandleMarker
          key={id}
          id={id}
          hx={p.x}
          hy={p.y}
          hs={hs}
          cursor={cursor}
          shiftPressed={shiftPressed}
          onStartDrag={startDrag}
        />
      ))}
      <pixiGraphics
        draw={drawRotate}
        eventMode="static"
        cursor="crosshair"
        onPointerDown={(e: FederatedPointerEvent) => {
          e.stopPropagation();
          startDrag("rotate", false, e.global.x, e.global.y);
        }}
      />
    </pixiContainer>
  );
}

// ─── GridHandles ──────────────────────────────────────────────────────────────

function GridHandles({
  grid,
  vpScale,
  onGridChange,
  vpRef,
  onGestureStart,
  onGestureEnd,
}: {
  grid: GridShape;
  vpScale: number;
  onGridChange: (grid: GridShape) => void;
  vpRef: React.MutableRefObject<Viewport | null>;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
}) {
  const shiftPressed = useShiftPressed();

  const getStart = useCallback((): GridShape => ({ ...grid }), [grid]);
  const startDrag = useHandleDrag<GridShape, GridShape>({
    vpRef,
    getStart,
    compute: gridFromHandleDrag,
    onResult: onGridChange,
    onGestureStart,
    onGestureEnd,
  });

  const hs = HANDLE_SIZE / vpScale;
  // OCULTO POR ORA — esfera de rotação do grid desabilitada no canvas.
  // const rr = ROTATE_RADIUS / vpScale;
  // const ro = ROTATE_OFFSET / vpScale;

  // World-space anchor positions for every handle, following the grid's
  // rotation + skew. The container itself is NOT transformed, so the handle
  // MARKERS (squares, circle) stay crisp and screen-aligned — only their
  // positions move with the grid. The border is a polygon through the four
  // transformed corners, so it wraps the rotated/skewed grid exactly.
  const pts = useMemo(() => {
    // Anchors come from the grid's real local bounds (square or hex), then
    // through the same transform as the grid — so the border and handles wrap
    // the actual cells, hex included.
    const at = (h: string) => applyTransform(gridHandleLocal(h, grid), grid);
    const TL = at("TL");
    const TR = at("TR");
    const BR = at("BR");
    const BL = at("BL");
    const TC = at("TC");
    const BC = at("BC");
    const ML = at("ML");
    const MR = at("MR");
    // OCULTO POR ORA — posição da esfera de rotação do grid.
    // const center = at("center");
    // const dx = TC.x - center.x;
    // const dy = TC.y - center.y;
    // const len = Math.hypot(dx, dy) || 1;
    // const rot: XY = { x: TC.x + (dx / len) * ro, y: TC.y + (dy / len) * ro };
    return { TL, TR, BR, BL, TC, BC, ML, MR };
  }, [grid]);

  const drawBorder = useCallback((g: PixiGraphics) => {
    g.clear();
    const color = shiftPressed ? 0xffaa00 : 0xffffff;
    g.setStrokeStyle({ width: 1 / vpScale, color, alpha: 0.7 });
    g.moveTo(pts.TL.x, pts.TL.y);
    g.lineTo(pts.TR.x, pts.TR.y);
    g.lineTo(pts.BR.x, pts.BR.y);
    g.lineTo(pts.BL.x, pts.BL.y);
    g.closePath();
    g.stroke();
  }, [pts, vpScale, shiftPressed]);

  /* OCULTO POR ORA — esfera/linha de rotação do grid (ver JSX abaixo).
     Reativar junto com rr/ro e pts.rot quando liberar a rotação do grid.
  const drawRotate = useCallback((g: PixiGraphics) => {
    g.clear();
    g.setStrokeStyle({ width: 1 / vpScale, color: 0xffd700, alpha: 0.8 });
    g.moveTo(pts.TC.x, pts.TC.y);
    g.lineTo(pts.rot.x, pts.rot.y);
    g.stroke();
    g.setFillStyle({ color: 0xffd700, alpha: 1 });
    g.circle(pts.rot.x, pts.rot.y, rr);
    g.fill();
  }, [pts, rr, vpScale]);
  */

  const corners: Array<{ id: string; p: XY; cursor: string }> = [
    { id: "TL", p: pts.TL, cursor: "nw-resize" },
    { id: "TR", p: pts.TR, cursor: "ne-resize" },
    { id: "BL", p: pts.BL, cursor: "sw-resize" },
    { id: "BR", p: pts.BR, cursor: "se-resize" },
  ];

  // Vertical edges (TC/BC) tune perspective on Shift; horizontal edges (ML/MR)
  // are plain cellSize resize, so they don't show the Shift/skew affordance.
  const edgeHandles: Array<{ id: string; p: XY; vertical: boolean }> = [
    { id: "TC", p: pts.TC, vertical: true },
    { id: "BC", p: pts.BC, vertical: true },
    { id: "ML", p: pts.ML, vertical: false },
    { id: "MR", p: pts.MR, vertical: false },
  ];

  return (
    <pixiContainer label="grid-handles">
      <pixiGraphics draw={drawBorder} eventMode="none" />

      {corners.map(({ id, p, cursor }) => (
        <HandleMarker
          key={id}
          id={id}
          hx={p.x}
          hy={p.y}
          hs={hs}
          cursor={cursor}
          shiftPressed={shiftPressed}
          onStartDrag={startDrag}
        />
      ))}

      {edgeHandles.map(({ id, p, vertical }) => (
        <GridEdgeHandle
          key={id}
          id={id}
          hx={p.x}
          hy={p.y}
          hs={hs}
          vertical={vertical}
          shiftPressed={shiftPressed}
          onStartDrag={startDrag}
        />
      ))}

      {/* OCULTO POR ORA — esfera de rotação do grid não disponível ao usuário.
          A lógica de rotação (gridFromHandleDrag "rotate") permanece e segue
          funcionando se grid.rotation vier do backend (GridLayer aplica).
      <pixiGraphics
        draw={drawRotate}
        eventMode="static"
        cursor="crosshair"
        onPointerDown={(e: FederatedPointerEvent) => {
          e.stopPropagation();
          startDrag("rotate", false, e.global.x, e.global.y);
        }}
      />
      */}
    </pixiContainer>
  );
}

function GridEdgeHandle({
  id, hx, hy, hs, vertical, shiftPressed, onStartDrag,
}: {
  id: string; hx: number; hy: number; hs: number;
  vertical: boolean;
  shiftPressed: boolean;
  onStartDrag: (id: string, shift: boolean, ex: number, ey: number) => void;
}) {
  // Only vertical edges (TC/BC) react to Shift (perspective/skew). Horizontal
  // edges (ML/MR) are plain resize handles regardless of Shift.
  const skewAffordance = vertical && shiftPressed;
  const actualHs = skewAffordance ? hs * 1.25 : hs;
  const fillColor = skewAffordance ? 0xffaa00 : 0xffffff;
  const cursor = vertical
    ? (skewAffordance ? "row-resize" : "ns-resize")
    : "ew-resize";

  const draw = useCallback((g: PixiGraphics) => {
    g.clear();
    g.circle(hx, hy, actualHs / 2);
    g.setFillStyle({ color: fillColor });
    g.fill();
    g.setStrokeStyle({ color: 0x333333, width: actualHs * 0.12 });
    g.stroke();
  }, [hx, hy, actualHs, fillColor]);

  return (
    <pixiGraphics
      draw={draw}
      eventMode="static"
      cursor={cursor}
      onPointerDown={(e: FederatedPointerEvent) => {
        e.stopPropagation();
        onStartDrag(id, shiftPressed, e.global.x, e.global.y);
      }}
    />
  );
}
