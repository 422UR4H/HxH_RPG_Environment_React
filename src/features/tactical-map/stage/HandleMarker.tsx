import { useCallback } from "react";
import type { FederatedPointerEvent, Graphics as PixiGraphics } from "pixi.js";

// The square white marker used for both the bg's 8 resize handles and the
// grid's 4 corners — same draw, same props, so the two copies (BgResizeHandle
// / GridCornerHandle) collapsed into this one per Fase 4 task 3. The grid's
// EDGE handles are NOT this component: they draw a circle and change colour
// and size for the Shift/skew affordance, so GridEdgeHandle stays on its own.
export default function HandleMarker({
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
