import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApplication } from "@pixi/react";
import type { FederatedPointerEvent, Graphics as PixiGraphics } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import type { BgImage, GridShape } from "../../types/tacticalMap";
import type { ToolKind } from "../../features/tactical-map/store/editorStore";
import {
  applyTransform,
  gridHandleLocal,
  gridFromHandleDrag,
} from "../../features/tactical-map/utils/coords";

type XY = { x: number; y: number };

const HANDLE_SIZE = 8;     // screen px
const ROTATE_RADIUS = 10;  // screen px
const ROTATE_OFFSET = 24;  // screen px above handle edge

type BgHandleDragState = {
  handle: string;
  startWorldX: number;
  startWorldY: number;
  startBg: NonNullable<BgImage>;
  aspectRatio: number;
  shiftKey: boolean;
} | null;

type GridHandleDragState = {
  handle: string;
  startWorldX: number;
  startWorldY: number;
  startGrid: GridShape;
  shiftKey: boolean;
} | null;


type Props = {
  activeTool: ToolKind;
  bg: BgImage;
  grid: GridShape;
  vpScale: number;
  onBgChange: (bg: NonNullable<BgImage>) => void;
  onGridChange: (grid: GridShape) => void;
  vpRef: React.MutableRefObject<Viewport | null>;
};

export default function MapHandlesLayer({
  activeTool,
  bg,
  grid,
  vpScale,
  onBgChange,
  onGridChange,
  vpRef,
}: Props) {
  return (
    <>
      {activeTool === "bg" && bg && (
        <BgHandles
          bg={bg}
          vpScale={vpScale}
          onBgChange={onBgChange}
          vpRef={vpRef}
        />
      )}
      {activeTool === "grid" && (
        <GridHandles
          grid={grid}
          vpScale={vpScale}
          onGridChange={onGridChange}
          vpRef={vpRef}
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
}: {
  bg: NonNullable<BgImage>;
  vpScale: number;
  onBgChange: (bg: NonNullable<BgImage>) => void;
  vpRef: React.MutableRefObject<Viewport | null>;
}) {
  const { app } = useApplication();
  const dragState = useRef<BgHandleDragState>(null);
  const onBgChangeRef = useRef(onBgChange);
  useEffect(() => { onBgChangeRef.current = onBgChange; }, [onBgChange]);

  const [shiftPressed, setShiftPressed] = useState(false);
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { if (e.key === "Shift") setShiftPressed(true); };
    const onUp = (e: KeyboardEvent) => { if (e.key === "Shift") setShiftPressed(false); };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  const hs = HANDLE_SIZE / vpScale;
  const rr = ROTATE_RADIUS / vpScale;
  const ro = ROTATE_OFFSET / vpScale;
  const { x, y, width: w, height: h } = bg;

  const startDrag = useCallback((handleId: string, shift: boolean, ex: number, ey: number) => {
    const vp = vpRef.current;
    if (!vp) return;
    const world = vp.toWorld(ex, ey);
    dragState.current = {
      handle: handleId,
      startWorldX: world.x,
      startWorldY: world.y,
      startBg: { ...bg },
      aspectRatio: bg.width / bg.height,
      shiftKey: shift,
    };
    const canvas = app?.renderer ? app.canvas : null;
    const onMove = (e: PointerEvent) => {
      const dr = dragState.current;
      const vp2 = vpRef.current;
      if (!dr || !vp2 || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const wld = vp2.toWorld(e.clientX - rect.left, e.clientY - rect.top);
      const newBg = computeNewBgFromDrag(dr.handle, dr.startBg, wld.x, wld.y, dr.aspectRatio, dr.shiftKey);
      if (newBg) onBgChangeRef.current(newBg);
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, [app, bg, vpRef]);

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
        <BgResizeHandle
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

function BgResizeHandle({
  id, hx, hy, hs, cursor, shiftPressed, onStartDrag,
}: {
  id: string;
  hx: number;
  hy: number;
  hs: number;
  cursor: string;
  shiftPressed: boolean;
  onStartDrag: (handleId: string, shift: boolean, ex: number, ey: number) => void;
}) {
  const draw = useCallback((g: PixiGraphics) => {
    g.clear();
    g.rect(hx - hs / 2, hy - hs / 2, hs, hs);
    g.setFillStyle({ color: 0xffffff });
    g.fill();
    g.setStrokeStyle({ color: 0x333333, width: hs * 0.15 });
    g.stroke();
  }, [hx, hy, hs]);

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

// ─── BgHandles math ───────────────────────────────────────────────────────────

function computeNewBgFromDrag(
  handle: string,
  startBg: NonNullable<BgImage>,
  worldX: number,
  worldY: number,
  aspectRatio: number,
  freeResize: boolean,
): NonNullable<BgImage> | null {
  const MIN = 16;
  const { x, y, width: w, height: h } = startBg;
  const cx = x + w / 2;
  const bcy = y + h / 2;

  // Rotation uses the raw world angle from the image center to the cursor.
  if (handle === "rotate") {
    const angle = Math.atan2(worldY - bcy, worldX - cx) * (180 / Math.PI) + 90;
    return { ...startBg, rotation: angle };
  }

  // For resize, convert the world cursor into the image's own (un-rotated)
  // axes so the math below works regardless of bg.rotation. At rotation 0
  // this is a no-op (lx=worldX, ly=worldY).
  const rot = ((startBg.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const ddx = worldX - cx;
  const ddy = worldY - bcy;
  const lx = cx + ddx * cos + ddy * sin;
  const ly = bcy - ddx * sin + ddy * cos;

  switch (handle) {
    case "TL": {
      const ax = x + w, ay = y + h;
      const newW = Math.max(MIN, ax - lx);
      const newH = freeResize ? Math.max(MIN, ay - ly) : newW / aspectRatio;
      return { ...startBg, x: ax - newW, y: ay - newH, width: newW, height: newH };
    }
    case "TC": {
      const ay = y + h;
      const newH = Math.max(MIN, ay - ly);
      const newW = freeResize ? w : newH * aspectRatio;
      return { ...startBg, x: cx - newW / 2, y: ay - newH, width: newW, height: newH };
    }
    case "TR": {
      const ay = y + h;
      const newW = Math.max(MIN, lx - x);
      const newH = freeResize ? Math.max(MIN, ay - ly) : newW / aspectRatio;
      return { ...startBg, x, y: ay - newH, width: newW, height: newH };
    }
    case "ML": {
      const ax = x + w;
      const newW = Math.max(MIN, ax - lx);
      const newH = freeResize ? h : newW / aspectRatio;
      return { ...startBg, x: ax - newW, y: y + (h - newH) / 2, width: newW, height: newH };
    }
    case "MR": {
      const newW = Math.max(MIN, lx - x);
      const newH = freeResize ? h : newW / aspectRatio;
      return { ...startBg, x, y: y + (h - newH) / 2, width: newW, height: newH };
    }
    case "BL": {
      const ax = x + w;
      const newW = Math.max(MIN, ax - lx);
      const newH = freeResize ? Math.max(MIN, ly - y) : newW / aspectRatio;
      return { ...startBg, x: ax - newW, y, width: newW, height: newH };
    }
    case "BC": {
      const newH = Math.max(MIN, ly - y);
      const newW = freeResize ? w : newH * aspectRatio;
      return { ...startBg, x: cx - newW / 2, y, width: newW, height: newH };
    }
    case "BR": {
      const newW = Math.max(MIN, lx - x);
      const newH = freeResize ? Math.max(MIN, ly - y) : newW / aspectRatio;
      return { ...startBg, x, y, width: newW, height: newH };
    }
    default:
      return null;
  }
}

// ─── GridHandles ──────────────────────────────────────────────────────────────

function GridHandles({
  grid,
  vpScale,
  onGridChange,
  vpRef,
}: {
  grid: GridShape;
  vpScale: number;
  onGridChange: (grid: GridShape) => void;
  vpRef: React.MutableRefObject<Viewport | null>;
}) {
  const { app } = useApplication();
  const dragState = useRef<GridHandleDragState>(null);
  const onGridChangeRef = useRef(onGridChange);
  useEffect(() => { onGridChangeRef.current = onGridChange; }, [onGridChange]);

  const [shiftPressed, setShiftPressed] = useState(false);
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { if (e.key === "Shift") setShiftPressed(true); };
    const onUp = (e: KeyboardEvent) => { if (e.key === "Shift") setShiftPressed(false); };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  const hs = HANDLE_SIZE / vpScale;
  const rr = ROTATE_RADIUS / vpScale;
  const ro = ROTATE_OFFSET / vpScale;

  const startDrag = useCallback((handleId: string, shift: boolean, ex: number, ey: number) => {
    const vp = vpRef.current;
    if (!vp) return;
    const world = vp.toWorld(ex, ey);
    dragState.current = {
      handle: handleId,
      startWorldX: world.x,
      startWorldY: world.y,
      startGrid: { ...grid },
      shiftKey: shift,
    };
    const canvas = app?.renderer ? app.canvas : null;
    const onMove = (e: PointerEvent) => {
      const dr = dragState.current;
      const vp2 = vpRef.current;
      if (!dr || !vp2 || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const wld = vp2.toWorld(e.clientX - rect.left, e.clientY - rect.top);
      const newGrid = gridFromHandleDrag(dr.handle, dr.startGrid, wld.x, wld.y, dr.shiftKey);
      if (newGrid) onGridChangeRef.current(newGrid);
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, [app, grid, vpRef]);

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
    const center = at("center");
    const dx = TC.x - center.x;
    const dy = TC.y - center.y;
    const len = Math.hypot(dx, dy) || 1;
    const rot: XY = { x: TC.x + (dx / len) * ro, y: TC.y + (dy / len) * ro };
    return { TL, TR, BR, BL, TC, BC, ML, MR, rot };
  }, [grid, ro]);

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
        <GridCornerHandle
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

function GridCornerHandle({
  id, hx, hy, hs, cursor, shiftPressed, onStartDrag,
}: {
  id: string; hx: number; hy: number; hs: number;
  cursor: string; shiftPressed: boolean;
  onStartDrag: (id: string, shift: boolean, ex: number, ey: number) => void;
}) {
  const draw = useCallback((g: PixiGraphics) => {
    g.clear();
    g.rect(hx - hs / 2, hy - hs / 2, hs, hs);
    g.setFillStyle({ color: 0xffffff });
    g.fill();
    g.setStrokeStyle({ color: 0x333333, width: hs * 0.15 });
    g.stroke();
  }, [hx, hy, hs]);

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

