import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import type { GridShape, WallMaterial, WallSegment, WallType } from "../../types/tacticalMap";
import { applyTransform, inverseTransform } from "../../features/tactical-map/utils/coords";
import { snapWallPoint, explodePolyline } from "../../features/tactical-map/utils/walls";

const MATERIAL_COLOR: Record<WallMaterial, number> = {
  stone: 0x94a3b8, wood: 0xa16207, iron: 0x64748b, magical: 0xa855f7,
};
const MATERIAL_WIDTH: Record<WallMaterial, number> = {
  stone: 4, wood: 3, iron: 5, magical: 3,
};
const HP_DEFAULTS: Record<WallMaterial, number> = {
  stone: 100, wood: 40, iron: 500, magical: 80,
};
const RESISTANCE_DEFAULTS: Record<WallMaterial, number> = {
  stone: 5, wood: 2, iron: 15, magical: 0,
};
const SNAP_THRESHOLD_SCREEN = 15;

type Props = {
  walls: WallSegment[];
  grid: GridShape;
  vpRef: MutableRefObject<Viewport | null>;
  vpScale: number;
  canvasEl: HTMLCanvasElement | null;
  wallsInteractive: boolean;
  selectedWallId: string | null;
  activeWallType: WallType;
  activeMaterial: WallMaterial;
  onWallSelect: (id: string | null) => void;
  onDrawComplete: (segments: WallSegment[]) => void;
  onEndpointDrag: (wallId: string, point: "p1" | "p2", localPos: [number, number]) => void;
  onGestureStart: () => void;
  onGestureEnd: () => void;
};

type DrawState = {
  polylinePoints: [number, number][];
  previewPoint: [number, number] | null;
};

export default function WallsLayer({
  walls, grid, vpRef, vpScale, canvasEl,
  wallsInteractive, selectedWallId,
  activeWallType, activeMaterial,
  onWallSelect, onDrawComplete, onGestureStart, onGestureEnd,
}: Props) {
  const [draw, setDraw] = useState<DrawState>({ polylinePoints: [], previewPoint: null });

  const drawRef = useRef(draw);
  drawRef.current = draw;
  const wallsRef = useRef(walls);
  wallsRef.current = walls;
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const activeMaterialRef = useRef(activeMaterial);
  activeMaterialRef.current = activeMaterial;
  const activeWallTypeRef = useRef(activeWallType);
  activeWallTypeRef.current = activeWallType;

  const finishPolyline = useCallback(() => {
    const pts = drawRef.current.polylinePoints;
    if (pts.length >= 2) {
      const mat = activeMaterialRef.current;
      const attrs: Omit<WallSegment, "id" | "p1" | "p2"> = {
        wallType: activeWallTypeRef.current,
        material: mat,
        move: true,
        sense: "full",
        direction: activeWallTypeRef.current === "terrain" ? "left" : "both",
        open: false,
        locked: false,
        hp: HP_DEFAULTS[mat],
        maxHp: HP_DEFAULTS[mat],
        resistance: RESISTANCE_DEFAULTS[mat],
        destroyed: false,
      };
      const all: WallSegment[] = [];
      for (let i = 0; i < pts.length - 1; i++)
        all.push(...explodePolyline(pts[i], pts[i + 1], attrs, gridRef.current));
      if (all.length > 0) { onDrawComplete(all); onGestureEnd(); }
    }
    setDraw({ polylinePoints: [], previewPoint: null });
  }, [onDrawComplete, onGestureEnd]);

  const toLocal = useCallback((e: PointerEvent): [number, number] | null => {
    const vp = vpRef.current;
    if (!vp || !canvasEl) return null;
    const rect = canvasEl.getBoundingClientRect();
    const world = vp.toWorld(e.clientX - rect.left, e.clientY - rect.top);
    const local = inverseTransform({ x: world.x, y: world.y }, gridRef.current);
    return snapWallPoint([local.x, local.y], gridRef.current, SNAP_THRESHOLD_SCREEN / vpScale);
  }, [vpRef, canvasEl, vpScale]);

  useEffect(() => {
    if (!wallsInteractive) return;

    const onMove = (e: PointerEvent) => {
      const pt = toLocal(e);
      if (pt) setDraw((s) => ({ ...s, previewPoint: pt }));
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || !canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right ||
          e.clientY < rect.top  || e.clientY > rect.bottom) return;

      const pt = toLocal(e);
      if (!pt) return;

      // If not drawing, check for wall selection first
      if (drawRef.current.polylinePoints.length === 0) {
        const HIT = 8 / vpScale;
        const hit = findNearestWall(pt, wallsRef.current, HIT);
        if (hit) { onWallSelect(hit.id); return; }
        onWallSelect(null);
      }

      // Check for double-click (same snap point twice) — finish the polyline
      const currentPts = drawRef.current.polylinePoints;
      if (currentPts.length > 0) {
        const last = currentPts[currentPts.length - 1];
        if (Math.abs(last[0] - pt[0]) < 1 && Math.abs(last[1] - pt[1]) < 1) {
          finishPolyline();
          return;
        }
      }

      setDraw((s) => {
        const pts = [...s.polylinePoints, pt];
        if (pts.length === 1) onGestureStart();
        return { ...s, polylinePoints: pts };
      });
    };

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") finishPolyline(); };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [wallsInteractive, toLocal, vpScale, canvasEl, onWallSelect, onGestureStart, finishPolyline]);

  useEffect(() => {
    if (!wallsInteractive) finishPolyline();
  }, [wallsInteractive, finishPolyline]);

  // ─── Rendering ───────────────────────────────────────────────────────────

  const drawMaterial = useCallback((material: WallMaterial) => (g: PixiGraphics) => {
    g.clear();
    const color = MATERIAL_COLOR[material];
    const width = MATERIAL_WIDTH[material];
    for (const w of walls) {
      if (w.material !== material || w.id === selectedWallId) continue;
      const a1 = applyTransform({ x: w.p1[0], y: w.p1[1] }, grid);
      const a2 = applyTransform({ x: w.p2[0], y: w.p2[1] }, grid);
      g.setStrokeStyle({ color, width, alpha: w.destroyed ? 0.4 : 1.0 });
      g.moveTo(a1.x, a1.y); g.lineTo(a2.x, a2.y); g.stroke();
    }
  }, [walls, grid, selectedWallId]);

  const drawSelected = useCallback((g: PixiGraphics) => {
    g.clear();
    if (!selectedWallId) return;
    const w = walls.find((x) => x.id === selectedWallId);
    if (!w) return;
    const a1 = applyTransform({ x: w.p1[0], y: w.p1[1] }, grid);
    const a2 = applyTransform({ x: w.p2[0], y: w.p2[1] }, grid);
    // Glow
    g.setStrokeStyle({ color: 0xffffff, width: MATERIAL_WIDTH[w.material] + 3, alpha: 0.4 });
    g.moveTo(a1.x, a1.y); g.lineTo(a2.x, a2.y); g.stroke();
    // Line
    g.setStrokeStyle({ color: MATERIAL_COLOR[w.material], width: MATERIAL_WIDTH[w.material] });
    g.moveTo(a1.x, a1.y); g.lineTo(a2.x, a2.y); g.stroke();
    // Handles
    const r = 6 / vpScale;
    for (const pt of [a1, a2]) {
      g.setFillStyle({ color: 0xffffff });
      g.setStrokeStyle({ color: MATERIAL_COLOR[w.material], width: 2 });
      g.circle(pt.x, pt.y, r); g.fill(); g.stroke();
    }
  }, [walls, grid, selectedWallId, vpScale]);

  const drawPreview = useCallback((g: PixiGraphics) => {
    g.clear();
    if (!wallsInteractive) return;
    const { polylinePoints, previewPoint } = draw;
    const color = MATERIAL_COLOR[activeMaterial];
    const width = MATERIAL_WIDTH[activeMaterial];

    if (polylinePoints.length >= 2) {
      g.setStrokeStyle({ color, width, alpha: 0.8 });
      const first = applyTransform({ x: polylinePoints[0][0], y: polylinePoints[0][1] }, grid);
      g.moveTo(first.x, first.y);
      for (let i = 1; i < polylinePoints.length; i++) {
        const p = applyTransform({ x: polylinePoints[i][0], y: polylinePoints[i][1] }, grid);
        g.lineTo(p.x, p.y);
      }
      g.stroke();
    }

    if (polylinePoints.length >= 1 && previewPoint) {
      const last = polylinePoints[polylinePoints.length - 1];
      const a1 = applyTransform({ x: last[0], y: last[1] }, grid);
      const a2 = applyTransform({ x: previewPoint[0], y: previewPoint[1] }, grid);
      g.setStrokeStyle({ color, width, alpha: 0.4 });
      g.moveTo(a1.x, a1.y); g.lineTo(a2.x, a2.y); g.stroke();
    }

    for (const pt of polylinePoints) {
      const a = applyTransform({ x: pt[0], y: pt[1] }, grid);
      g.setFillStyle({ color });
      g.circle(a.x, a.y, 4 / vpScale); g.fill();
    }

    if (previewPoint) {
      const a = applyTransform({ x: previewPoint[0], y: previewPoint[1] }, grid);
      g.setFillStyle({ color: 0xffffff, alpha: 0.7 });
      g.circle(a.x, a.y, 3 / vpScale); g.fill();
    }
  }, [draw, wallsInteractive, grid, activeMaterial, vpScale]);

  return (
    <>
      <pixiGraphics draw={drawMaterial("stone")} />
      <pixiGraphics draw={drawMaterial("wood")} />
      <pixiGraphics draw={drawMaterial("iron")} />
      <pixiGraphics draw={drawMaterial("magical")} />
      <pixiGraphics draw={drawSelected} />
      <pixiGraphics draw={drawPreview} />
    </>
  );
}

function ptSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(ax + t * dx - px, ay + t * dy - py);
}

function findNearestWall(localPos: [number, number], walls: WallSegment[], threshold: number): WallSegment | null {
  let best: WallSegment | null = null;
  let bestD = threshold;
  for (const w of walls) {
    const d = ptSegDist(localPos[0], localPos[1], w.p1[0], w.p1[1], w.p2[0], w.p2[1]);
    if (d < bestD) { bestD = d; best = w; }
  }
  return best;
}
