import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import type { GridShape, VisibilityPolygon, WallMaterial, WallSegment, WallType } from "../../types/tacticalMap";
import { applyTransform, inverseTransform } from "../../features/tactical-map/utils/coords";
import { snapWallPoint, explodePolyline } from "../../features/tactical-map/utils/walls";
import { findNearestWall } from "../../features/tactical-map/utils/wallHit";
import LosSplit from "./LosSplit";

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

// Walls the character has seen but is not currently looking at. 0.92 (the fog's own
// alpha) left them all but invisible; this is the legibility level chosen on screen.
const MEMORY_WALL_ALPHA = 0.5;

// A wall that blocks vision lies exactly ON the edge of the visibility polygon, so a
// mask cut at that edge splits the wall's stroke lengthwise — the viewer's half crisp,
// the other half dimmed as if remembered. Growing the walls' mask by half the thickest
// stroke pulls the whole wall onto the lit side. Walls sit on grid lines a full cell
// apart, so a few world units cannot reach a genuinely remembered neighbour.
const LOS_WALL_DILATION = Math.max(...Object.values(MATERIAL_WIDTH)) / 2;

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
  drawingEnabled: boolean;
  onExitDrawMode: () => void;
  onWallClick?: (wall: WallSegment) => void;
  /**
   * Player line of sight. When present, the walls are drawn in two passes — crisp
   * inside it, dimmed outside it. Absent for the master and for wall-editing mode,
   * where every wall renders once at full brightness.
   */
  losPolygons?: VisibilityPolygon[];
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
  drawingEnabled, onExitDrawMode, onWallClick, losPolygons,
}: Props) {
  const [draw, setDraw] = useState<DrawState>({ polylinePoints: [], previewPoint: null });

  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    if (!drawingEnabled) {
      const empty: DrawState = { polylinePoints: [], previewPoint: null };
      drawRef.current = empty;
      setDraw(empty);
    }
  }, [drawingEnabled]);
  const wallsRef = useRef(walls);
  wallsRef.current = walls;
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const activeMaterialRef = useRef(activeMaterial);
  activeMaterialRef.current = activeMaterial;
  const activeWallTypeRef = useRef(activeWallType);
  activeWallTypeRef.current = activeWallType;
  const drawingEnabledRef = useRef(drawingEnabled);
  drawingEnabledRef.current = drawingEnabled;
  const onExitDrawModeRef = useRef(onExitDrawMode);
  onExitDrawModeRef.current = onExitDrawMode;
  const wallsInteractiveRef = useRef(wallsInteractive);
  wallsInteractiveRef.current = wallsInteractive;
  const vpScaleRef = useRef(vpScale);
  vpScaleRef.current = vpScale;
  const onWallClickRef = useRef(onWallClick);
  onWallClickRef.current = onWallClick;

  const finishPolyline = useCallback(() => {
    const pts = drawRef.current.polylinePoints;
    if (pts.length >= 2) {
      const mat = activeMaterialRef.current;
      const wallType = activeWallTypeRef.current;
      const attrs: Omit<WallSegment, "id" | "p1" | "p2"> = {
        wallType,
        material: mat,
        move: true,
        sense: "full",
        direction: wallType === "terrain" ? "left" : "both",
        open: false,
        locked: false,
        hp: HP_DEFAULTS[mat],
        maxHp: HP_DEFAULTS[mat],
        resistance: RESISTANCE_DEFAULTS[mat],
        destroyed: false,
      };
      // Openings (door/window/secret_door) must not be split at midpoints —
      // explodePolyline would turn a 1-cell door into two half-cell segments.
      const isOpening = wallType === "door" || wallType === "window" || wallType === "secret_door";
      const all: WallSegment[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        if (isOpening) {
          all.push({ ...attrs, id: crypto.randomUUID(), p1: pts[i], p2: pts[i + 1] });
        } else {
          all.push(...explodePolyline(pts[i], pts[i + 1], attrs, gridRef.current));
        }
      }
      if (all.length > 0) { onDrawComplete(all); onGestureEnd(); }
    }
    // Sync ref immediately so rapid follow-up clicks see the cleared state
    // before the component re-renders (prevents stale auto-finish re-trigger).
    const empty: DrawState = { polylinePoints: [], previewPoint: null };
    drawRef.current = empty;
    setDraw(empty);
  }, [onDrawComplete, onGestureEnd]);

  const toLocal = useCallback((e: PointerEvent, freeMode = false): [number, number] | null => {
    const vp = vpRef.current;
    if (!vp || !canvasEl) return null;
    const rect = canvasEl.getBoundingClientRect();
    const world = vp.toWorld(e.clientX - rect.left, e.clientY - rect.top);
    const local = inverseTransform({ x: world.x, y: world.y }, gridRef.current);
    const raw: [number, number] = [local.x, local.y];
    if (freeMode) return raw;
    const threshold = SNAP_THRESHOLD_SCREEN / vpScale;
    return snapWallPoint(raw, gridRef.current, threshold);
  }, [vpRef, canvasEl, vpScale]);

  useEffect(() => {
    if (!wallsInteractive) return;

    const onMove = (e: PointerEvent) => {
      if (!drawingEnabledRef.current) return;
      const pt = toLocal(e, e.shiftKey);
      if (pt) setDraw((s) => ({ ...s, previewPoint: pt }));
    };

    const onDown = (e: PointerEvent) => {
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right ||
          e.clientY < rect.top  || e.clientY > rect.bottom) return;

      // Right-click cancels current drawing (same as Escape)
      if (e.button === 2) {
        if (drawRef.current.polylinePoints.length > 0) finishPolyline();
        return;
      }
      if (e.button !== 0) return;

      // Browse mode: only wall selection; events pass through so viewport pans.
      const vp = vpRef.current;
      if (!vp) return;
      const world = vp.toWorld(e.clientX - rect.left, e.clientY - rect.top);
      const rawLocal = inverseTransform({ x: world.x, y: world.y }, gridRef.current);
      const rawPt: [number, number] = [rawLocal.x, rawLocal.y];

      if (!drawingEnabledRef.current) {
        const HIT = 8 / vpScale;
        const hit = findNearestWall(rawPt, wallsRef.current, HIT);
        onWallSelect(hit ? hit.id : null);
        return;
      }

      // Draw mode: Shift = free position; no Shift = snap to grid
      const pt: [number, number] | null = e.shiftKey
        ? rawPt
        : snapWallPoint(rawPt, gridRef.current, SNAP_THRESHOLD_SCREEN / vpScale);

      // When NOT yet drawing: need a valid snap/free point to start; otherwise select or pan
      if (drawRef.current.polylinePoints.length === 0) {
        if (!pt) {
          const HIT = 8 / vpScale;
          const hit = findNearestWall(rawPt, wallsRef.current, HIT);
          if (hit) { onWallSelect(hit.id); return; }
          onWallSelect(null);
          return;
        }
        onWallSelect(null);
      }

      if (!pt) return;

      // Double-click (same snap point twice) → finish polyline
      const currentPts = drawRef.current.polylinePoints;
      if (currentPts.length > 0) {
        const last = currentPts[currentPts.length - 1];
        if (Math.abs(last[0] - pt[0]) < 1 && Math.abs(last[1] - pt[1]) < 1) {
          finishPolyline();
          return;
        }
      }

      // Auto-finish openings (door/window/secret_door) after exactly 2 points —
      // avoids requiring Escape or double-click for single-segment openings.
      const wallType = activeWallTypeRef.current;
      if ((wallType === "door" || wallType === "window" || wallType === "secret_door")
          && currentPts.length === 1) {
        const mat = activeMaterialRef.current;
        onDrawComplete([{
          id: crypto.randomUUID(),
          p1: currentPts[0], p2: pt,
          wallType,
          material: mat,
          move: true,
          sense: "full",
          direction: "both",
          open: false,
          locked: false,
          hp: HP_DEFAULTS[mat],
          maxHp: HP_DEFAULTS[mat],
          resistance: RESISTANCE_DEFAULTS[mat],
          destroyed: false,
        }]);
        onGestureEnd();
        // Sync ref immediately so a rapid next click sees the cleared state
        // before re-render (prevents stale auto-finish from firing again).
        const empty: DrawState = { polylinePoints: [], previewPoint: null };
        drawRef.current = empty;
        setDraw(empty);
        return;
      }

      setDraw((s) => {
        const pts = [...s.polylinePoints, pt];
        if (pts.length === 1) onGestureStart();
        return { ...s, polylinePoints: pts };
      });
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (drawRef.current.polylinePoints.length > 0) {
        finishPolyline();
      } else if (drawingEnabledRef.current) {
        onExitDrawModeRef.current();
      }
    };
    const onContextMenu = (e: MouseEvent) => { e.preventDefault(); };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("contextmenu", onContextMenu);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, [wallsInteractive, toLocal, vpScale, canvasEl, onWallSelect, onGestureStart, onGestureEnd, onDrawComplete, finishPolyline]);

  useEffect(() => {
    if (!wallsInteractive) finishPolyline();
  }, [wallsInteractive, finishPolyline]);

  // ─── Viewer-mode door click (fires when not in wall-editing mode) ─────────
  useEffect(() => {
    if (!canvasEl) return;
    const HIT = 8;
    const handleViewerClick = (e: PointerEvent) => {
      if (wallsInteractiveRef.current) return; // editor handles its own selection
      if (!onWallClickRef.current) return;
      const vp = vpRef.current;
      if (!vp) return;
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPt = vp.toWorld(screenX, screenY);
      const rawPt = inverseTransform({ x: worldPt.x, y: worldPt.y }, gridRef.current);
      const hit = findNearestWall([rawPt.x, rawPt.y], wallsRef.current, HIT / vpScaleRef.current);
      if (hit) {
        onWallClickRef.current?.(hit);
      }
    };
    canvasEl.addEventListener("pointerup", handleViewerClick);
    return () => {
      canvasEl.removeEventListener("pointerup", handleViewerClick);
    };
  }, [canvasEl, vpRef]);

  // ─── Rendering ───────────────────────────────────────────────────────────

  const drawMaterial = useCallback((material: WallMaterial) => (g: PixiGraphics) => {
    g.clear();
    const color = MATERIAL_COLOR[material];
    const width = MATERIAL_WIDTH[material];
    for (const w of walls) {
      if (w.material !== material || w.id === selectedWallId) continue;
      const a1 = applyTransform({ x: w.p1[0], y: w.p1[1] }, grid);
      const a2 = applyTransform({ x: w.p2[0], y: w.p2[1] }, grid);
      const isDamaged = w.maxHp > 0 && w.hp > 0 && w.hp < w.maxHp;
      const isDestroyed = w.destroyed;

      if (isDestroyed) {
        drawDestroyedWall(g, a1, a2, color, width, vpScale);
      } else if (w.wallType === "secret_door") {
        drawDashedLine(g, a1, a2, color, width, 1.0);
      } else if (w.wallType === "terrain") {
        drawDottedLine(g, a1, a2, color, width, isDamaged ? 0.8 : 1.0);
      } else if (w.wallType === "door" && w.open) {
        drawOpenDoor(g, a1, a2, color, width, isDamaged ? 0.8 : 1.0);
      } else if (isDamaged) {
        drawDashedLine(g, a1, a2, color, width, 0.8);
      } else {
        g.setStrokeStyle({ color, width, alpha: 1.0 });
        g.moveTo(a1.x, a1.y); g.lineTo(a2.x, a2.y); g.stroke();
      }
      if (w.wallType === "door" || w.wallType === "window") {
        drawWallTypeSymbol(g, w.wallType, a1, a2, color, vpScale);
      }
      if (w.locked) {
        drawLockedMarker(g, a1, a2, vpScale);
      }
    }
  }, [walls, grid, selectedWallId, vpScale]);

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
    if (!wallsInteractive || !drawingEnabled) return;
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
  }, [draw, wallsInteractive, drawingEnabled, grid, activeMaterial, vpScale]);

  // Pure drawing, no hooks and no effects — this is what LosSplit is allowed to mount
  // twice. Everything interactive stays in this component, which mounts once.
  const graphics = (
    <>
      <pixiGraphics draw={drawMaterial("stone")} />
      <pixiGraphics draw={drawMaterial("wood")} />
      <pixiGraphics draw={drawMaterial("iron")} />
      <pixiGraphics draw={drawMaterial("magical")} />
      <pixiGraphics draw={drawSelected} />
      <pixiGraphics draw={drawPreview} />
    </>
  );

  if (!losPolygons) return graphics;

  return (
    <LosSplit polygons={losPolygons} dimAlpha={MEMORY_WALL_ALPHA} dilate={LOS_WALL_DILATION}>
      {graphics}
    </LosSplit>
  );
}

// ─── Wall-type visual helpers ─────────────────────────────────────────────

function drawDashedLine(
  g: import("pixi.js").Graphics,
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  color: number,
  width: number,
  alpha: number,
) {
  const dx = a2.x - a1.x, dy = a2.y - a1.y;
  const totalLen = Math.hypot(dx, dy);
  if (totalLen < 0.1) return;
  const ux = dx / totalLen, uy = dy / totalLen;
  const dashLen = 8, gapLen = 4;
  let t = 0, drawing = true;
  while (t < totalLen) {
    const end = Math.min(t + (drawing ? dashLen : gapLen), totalLen);
    if (drawing) {
      g.setStrokeStyle({ color, width, alpha });
      g.moveTo(a1.x + t * ux, a1.y + t * uy);
      g.lineTo(a1.x + end * ux, a1.y + end * uy);
      g.stroke();
    }
    t = end;
    drawing = !drawing;
  }
}

function drawDottedLine(
  g: import("pixi.js").Graphics,
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  color: number,
  width: number,
  alpha: number,
) {
  const dx = a2.x - a1.x, dy = a2.y - a1.y;
  const totalLen = Math.hypot(dx, dy);
  if (totalLen < 0.1) return;
  const ux = dx / totalLen, uy = dy / totalLen;
  const dotLen = 2, gapLen = 4;
  let t = 0, drawing = true;
  while (t < totalLen) {
    const end = Math.min(t + (drawing ? dotLen : gapLen), totalLen);
    if (drawing) {
      g.setStrokeStyle({ color, width, alpha });
      g.moveTo(a1.x + t * ux, a1.y + t * uy);
      g.lineTo(a1.x + end * ux, a1.y + end * uy);
      g.stroke();
    }
    t = end;
    drawing = !drawing;
  }
}

function drawWallTypeSymbol(
  g: import("pixi.js").Graphics,
  wallType: "door" | "window",
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  color: number,
  vpScale: number,
) {
  const dx = a2.x - a1.x, dy = a2.y - a1.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.1) return;
  const nx = -dy / len, ny = dx / len; // unit normal perpendicular to wall

  if (wallType === "door") {
    // Quarter-circle arc at a1 (hinge) showing the door swing toward a2
    const radius = Math.min(len * 0.85, 20 / vpScale);
    const angle = Math.atan2(dy, dx);
    g.setStrokeStyle({ color, width: Math.max(1, 1.5 / vpScale), alpha: 0.9 });
    g.arc(a1.x, a1.y, radius, angle, angle + Math.PI / 2);
    g.stroke();
  } else {
    // Window: two perpendicular tick marks at 1/3 and 2/3
    const tickLen = 5 / vpScale;
    for (const t of [1 / 3, 2 / 3]) {
      const px = a1.x + t * dx, py = a1.y + t * dy;
      g.setStrokeStyle({ color, width: Math.max(1, 1.5 / vpScale), alpha: 0.85 });
      g.moveTo(px - nx * tickLen, py - ny * tickLen);
      g.lineTo(px + nx * tickLen, py + ny * tickLen);
      g.stroke();
    }
  }
}

function drawOpenDoor(
  g: import("pixi.js").Graphics,
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  color: number,
  width: number,
  alpha: number,
) {
  // Draw first 35% and last 35% of the segment; 30% gap in the centre.
  const gapStart = 0.35, gapEnd = 0.65;
  g.setStrokeStyle({ color, width, alpha });
  g.moveTo(a1.x, a1.y);
  g.lineTo(a1.x + gapStart * (a2.x - a1.x), a1.y + gapStart * (a2.y - a1.y));
  g.stroke();
  g.moveTo(a1.x + gapEnd * (a2.x - a1.x), a1.y + gapEnd * (a2.y - a1.y));
  g.lineTo(a2.x, a2.y);
  g.stroke();
}

function drawLockedMarker(
  g: import("pixi.js").Graphics,
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  vpScale: number,
) {
  const mx = (a1.x + a2.x) / 2;
  const my = (a1.y + a2.y) / 2;
  const r = Math.max(2, 4 / vpScale);
  g.setFillStyle({ color: 0xffd700, alpha: 0.9 });
  g.circle(mx, my, r);
  g.fill();
}

function drawDestroyedWall(
    g: import("pixi.js").Graphics,
    a1: { x: number; y: number },
    a2: { x: number; y: number },
    color: number,
    width: number,
    vpScale: number,
) {
    const dx = a2.x - a1.x, dy = a2.y - a1.y;
    const totalLen = Math.hypot(dx, dy);
    if (totalLen < 0.1) return;
    const ux = dx / totalLen, uy = dy / totalLen;
    // Fine dotted line — very small dots with large gaps
    const dotLen = 1, gapLen = 7;
    let t = 0, drawing = true;
    while (t < totalLen) {
        const end = Math.min(t + (drawing ? dotLen : gapLen), totalLen);
        if (drawing) {
            g.setStrokeStyle({ color, width, alpha: 0.4 });
            g.moveTo(a1.x + t * ux, a1.y + t * uy);
            g.lineTo(a1.x + end * ux, a1.y + end * uy);
            g.stroke();
        }
        t = end;
        drawing = !drawing;
    }
    // × marks at endpoints
    const xSize = Math.max(3, 6 / vpScale);
    for (const pt of [a1, a2]) {
        g.setStrokeStyle({ color, width: Math.max(1, 1.5 / vpScale), alpha: 0.4 });
        g.moveTo(pt.x - xSize, pt.y - xSize); g.lineTo(pt.x + xSize, pt.y + xSize); g.stroke();
        g.moveTo(pt.x + xSize, pt.y - xSize); g.lineTo(pt.x - xSize, pt.y + xSize); g.stroke();
    }
}
