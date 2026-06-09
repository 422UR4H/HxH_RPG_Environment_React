import { useCallback, useEffect, useRef, useState } from "react";
import { useApplication } from "@pixi/react";
import type { FederatedPointerEvent, Graphics as PixiGraphics } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import type { BgImage, GridShape } from "../../types/tacticalMap";
import type { ToolKind } from "../../features/tactical-map/store/editorStore";

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
  const cx = x + w / 2;

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

  const drawBorder = useCallback((g: PixiGraphics) => {
    g.clear();
    g.setStrokeStyle({ width: 1 / vpScale, color: 0xffffff, alpha: 0.7 });
    g.rect(x, y, w, h);
    g.stroke();
  }, [x, y, w, h, vpScale]);

  const drawRotate = useCallback((g: PixiGraphics) => {
    g.clear();
    g.setStrokeStyle({ width: 1 / vpScale, color: 0xffd700, alpha: 0.8 });
    g.moveTo(cx, y);
    g.lineTo(cx, y - ro);
    g.stroke();
    g.setFillStyle({ color: 0xffd700, alpha: 1 });
    g.circle(cx, y - ro, rr);
    g.fill();
    g.setStrokeStyle({ width: 1 / vpScale, color: 0x333333 });
    g.stroke();
  }, [cx, y, ro, rr, vpScale]);

  const resizeHandles: Array<{ id: string; hx: number; hy: number; cursor: string }> = [
    { id: "TL", hx: x,     hy: y,     cursor: "nw-resize" },
    { id: "TC", hx: cx,    hy: y,     cursor: "n-resize" },
    { id: "TR", hx: x + w, hy: y,     cursor: "ne-resize" },
    { id: "ML", hx: x,     hy: y + h / 2, cursor: "w-resize" },
    { id: "MR", hx: x + w, hy: y + h / 2, cursor: "e-resize" },
    { id: "BL", hx: x,     hy: y + h, cursor: "sw-resize" },
    { id: "BC", hx: cx,    hy: y + h, cursor: "s-resize" },
    { id: "BR", hx: x + w, hy: y + h, cursor: "se-resize" },
  ];

  return (
    <pixiContainer label="bg-handles">
      <pixiGraphics draw={drawBorder} eventMode="none" />
      {resizeHandles.map(({ id, hx, hy, cursor }) => (
        <BgResizeHandle
          key={id}
          id={id}
          hx={hx}
          hy={hy}
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

  switch (handle) {
    case "TL": {
      const ax = x + w, ay = y + h;
      const newW = Math.max(MIN, ax - worldX);
      const newH = freeResize ? Math.max(MIN, ay - worldY) : newW / aspectRatio;
      return { ...startBg, x: ax - newW, y: ay - newH, width: newW, height: newH };
    }
    case "TC": {
      const ay = y + h;
      const newH = Math.max(MIN, ay - worldY);
      const newW = freeResize ? w : newH * aspectRatio;
      return { ...startBg, x: cx - newW / 2, y: ay - newH, width: newW, height: newH };
    }
    case "TR": {
      const ay = y + h;
      const newW = Math.max(MIN, worldX - x);
      const newH = freeResize ? Math.max(MIN, ay - worldY) : newW / aspectRatio;
      return { ...startBg, x, y: ay - newH, width: newW, height: newH };
    }
    case "ML": {
      const ax = x + w;
      const newW = Math.max(MIN, ax - worldX);
      const newH = freeResize ? h : newW / aspectRatio;
      return { ...startBg, x: ax - newW, y: y + (h - newH) / 2, width: newW, height: newH };
    }
    case "MR": {
      const newW = Math.max(MIN, worldX - x);
      const newH = freeResize ? h : newW / aspectRatio;
      return { ...startBg, x, y: y + (h - newH) / 2, width: newW, height: newH };
    }
    case "BL": {
      const ax = x + w;
      const newW = Math.max(MIN, ax - worldX);
      const newH = freeResize ? Math.max(MIN, worldY - y) : newW / aspectRatio;
      return { ...startBg, x: ax - newW, y, width: newW, height: newH };
    }
    case "BC": {
      const newH = Math.max(MIN, worldY - y);
      const newW = freeResize ? w : newH * aspectRatio;
      return { ...startBg, x: cx - newW / 2, y, width: newW, height: newH };
    }
    case "BR": {
      const newW = Math.max(MIN, worldX - x);
      const newH = freeResize ? Math.max(MIN, worldY - y) : newW / aspectRatio;
      return { ...startBg, x, y, width: newW, height: newH };
    }
    case "rotate": {
      const bgCx = x + w / 2;
      const bgCy = y + h / 2;
      const angle = Math.atan2(worldY - bgCy, worldX - bgCx) * (180 / Math.PI) + 90;
      return { ...startBg, rotation: angle };
    }
    default:
      return null;
  }
}

// ─── GridHandles — stub (implemented in Task 10) ─────────────────────────────

function GridHandles({
  grid: _grid,
  vpScale: _vpScale,
  onGridChange: _onGridChange,
  vpRef: _vpRef,
}: {
  grid: GridShape;
  vpScale: number;
  onGridChange: (grid: GridShape) => void;
  vpRef: React.MutableRefObject<Viewport | null>;
}) {
  return null;
}
