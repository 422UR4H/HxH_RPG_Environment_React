import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import type { GridShape, VisibilityPolygon, WallMaterial, WallSegment, WallType } from "../../types/tacticalMap";
import { applyTransform, inverseTransform } from "./utils/coords";
import { snapWallPointWorld, explodePolyline, newWallAttrs, isOpening } from "./utils/walls";
import { findNearestWallWorld } from "./utils/wallHit";
import { drawStippledSegment } from "./utils/stipple";
import { consumeTap, createTapTracker } from "./hooks/tapGesture";
import { createHoldTracker } from "./hooks/useHoldGesture";
import LosSplit from "./LosSplit";

const MATERIAL_COLOR: Record<WallMaterial, number> = {
  stone: 0x94a3b8, wood: 0xa16207, iron: 0x64748b, magical: 0xa855f7,
};
const MATERIAL_WIDTH: Record<WallMaterial, number> = {
  stone: 4, wood: 3, iron: 5, magical: 3,
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

// Over the ~400-line guideline (docs/superpowers/specs/2026-08-06-tactical-map-refactor-design.md
// §6): out of scope for Fase 5 entirely — splitting this file is not part of this phase's plan.

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
   * Segurar numa parede (ou clique direito): o mesmo gesto da peça — junta a parede aos alvos.
   * O toque que encerra o segurar não vira `onWallClick` nem toque de slot.
   */
  onWallLongPress?: (wall: WallSegment) => void;
  /**
   * Quais paredes um toque alcança (fora do editor). Ausente = todas. A que fica de fora não
   * existe para o toque: nem cursor de clique, nem `onWallClick` — o toque cai no slot embaixo.
   */
  isWallTappable?: (wall: WallSegment) => boolean;
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
  drawingEnabled, onExitDrawMode, onWallClick, onWallLongPress, isWallTappable, losPolygons,
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
  const onWallLongPressRef = useRef(onWallLongPress);
  onWallLongPressRef.current = onWallLongPress;
  const isWallTappableRef = useRef(isWallTappable);
  isWallTappableRef.current = isWallTappable;

  const finishPolyline = useCallback(() => {
    const pts = drawRef.current.polylinePoints;
    if (pts.length >= 2) {
      const mat = activeMaterialRef.current;
      const wallType = activeWallTypeRef.current;
      const attrs = newWallAttrs(wallType, mat);
      // Openings (door/window/secret_door) must not be split at midpoints —
      // explodePolyline would turn a 1-cell door into two half-cell segments.
      const all: WallSegment[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        if (isOpening(wallType)) {
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
    if (freeMode) {
      const local = inverseTransform({ x: world.x, y: world.y }, gridRef.current);
      return [local.x, local.y];
    }
    // Encaixe medido em tela (WORLD): não encolhe no eixo achatado de uma grade isométrica.
    return snapWallPointWorld({ x: world.x, y: world.y }, gridRef.current, SNAP_THRESHOLD_SCREEN / vpScale);
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
        const hit = findNearestWallWorld(world, wallsRef.current, gridRef.current, HIT);
        onWallSelect(hit ? hit.id : null);
        return;
      }

      // Draw mode: Shift = free position; no Shift = snap to grid
      const pt: [number, number] | null = e.shiftKey
        ? rawPt
        : snapWallPointWorld(world, gridRef.current, SNAP_THRESHOLD_SCREEN / vpScale);

      // When NOT yet drawing: need a valid snap/free point to start; otherwise select or pan
      if (drawRef.current.polylinePoints.length === 0) {
        if (!pt) {
          const HIT = 8 / vpScale;
          const hit = findNearestWallWorld(world, wallsRef.current, gridRef.current, HIT);
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
      if (isOpening(wallType) && currentPts.length === 1) {
        const mat = activeMaterialRef.current;
        onDrawComplete([{
          ...newWallAttrs(wallType, mat),
          id: crypto.randomUUID(),
          p1: currentPts[0],
          p2: pt,
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
  // Só um TOQUE abre a caixa da parede; arrastar o mapa por cima dela não. O pointermove
  // fica na window porque o ponteiro sai do canvas durante um arraste.
  useEffect(() => {
    if (!canvasEl) return;
    const HIT = 8;
    const tracker = createTapTracker();
    // Segurar: o mesmo rastreador da peça (tempo e tolerância). Guarda a parede apertada.
    let heldWall: WallSegment | null = null;
    let rightPressed: WallSegment | null = null;
    const hold = createHoldTracker({
      onHold: () => {
        if (heldWall) onWallLongPressRef.current?.(heldWall);
      },
    });
    const handleDown = (e: PointerEvent) => {
      tracker.down(e);
      hold.cancel();
      heldWall = null;
      rightPressed = null;
      if (!onWallLongPressRef.current) return;
      const hit = hitWallAt(e);
      if (!hit) return;
      if (e.button === 2) {
        rightPressed = hit;
      } else if (e.button === 0) {
        heldWall = hit;
        hold.start(hit.id, e.clientX, e.clientY);
      }
    };
    const handleMove = (e: PointerEvent) => {
      tracker.move(e);
      hold.move(e.clientX, e.clientY);
    };
    const handleCancel = () => {
      tracker.cancel();
      hold.cancel();
    };
    // Clique direito = segurar na hora (como na peça). Resolve no `contextmenu`, venha ele antes
    // ou depois do pointerup (Windows × Linux/macOS).
    const handleContextMenu = (e: MouseEvent) => {
      const wall = rightPressed;
      rightPressed = null;
      if (!wall) return;
      e.preventDefault();
      onWallLongPressRef.current?.(wall);
    };
    // Parede que um toque abriria sob o ponteiro (mesmo teste de acerto do clique e do hover).
    const hitWallAt = (e: PointerEvent) => {
      if (wallsInteractiveRef.current) return null; // editor handles its own selection
      if (!onWallClickRef.current) return null;
      const vp = vpRef.current;
      if (!vp) return null;
      const rect = canvasEl.getBoundingClientRect();
      const worldPt = vp.toWorld(e.clientX - rect.left, e.clientY - rect.top);
      const tappable = isWallTappableRef.current;
      const walls = tappable ? wallsRef.current.filter(tappable) : wallsRef.current;
      return findNearestWallWorld({ x: worldPt.x, y: worldPt.y }, walls, gridRef.current, HIT / vpScaleRef.current);
    };
    const handleViewerClick = (e: PointerEvent) => {
      const held = hold.end() === "hold";
      heldWall = null;
      const tapped = tracker.up(e);
      if (held) {
        // A soltura de um segurar não é toque de ninguém: nem da parede, nem do slot embaixo.
        consumeTap(e);
        return;
      }
      if (!tapped) return;
      const hit = hitWallAt(e);
      if (hit) {
        // O toque é da parede: o slot vazio embaixo dela não vira destino (PiecesLayer pergunta).
        consumeTap(e);
        onWallClickRef.current?.(hit);
      }
    };
    // O cursor vai no PAI do canvas: o Pixi reescreve canvas.style.cursor a cada movimento
    // (`inherit` fora de objeto interativo, `pointer` na peça); no pai ele herda e não briga.
    const setCursor = (value: string) => {
      if (canvasEl.parentElement) canvasEl.parentElement.style.cursor = value;
    };
    const handleHover = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.buttons !== 0) return;
      setCursor(hitWallAt(e) ? "pointer" : "");
    };
    const handleLeave = () => setCursor("");
    canvasEl.addEventListener("pointerdown", handleDown);
    canvasEl.addEventListener("pointerup", handleViewerClick);
    canvasEl.addEventListener("pointermove", handleHover);
    canvasEl.addEventListener("pointerleave", handleLeave);
    canvasEl.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointercancel", handleCancel);
    return () => {
      canvasEl.removeEventListener("pointerdown", handleDown);
      canvasEl.removeEventListener("pointerup", handleViewerClick);
      canvasEl.removeEventListener("pointermove", handleHover);
      canvasEl.removeEventListener("pointerleave", handleLeave);
      canvasEl.removeEventListener("contextmenu", handleContextMenu);
      setCursor("");
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointercancel", handleCancel);
      tracker.cancel();
      hold.cancel();
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
        drawStippledSegment(g, a1, a2, { color, width, alpha: 1.0, dashLen: 8, gapLen: 4 });
      } else if (w.wallType === "terrain") {
        drawStippledSegment(g, a1, a2, { color, width, alpha: isDamaged ? 0.8 : 1.0, dashLen: 2, gapLen: 4 });
      } else if (w.wallType === "door" && w.open) {
        drawOpenDoor(g, a1, a2, color, width, isDamaged ? 0.8 : 1.0);
      } else if (isDamaged) {
        drawStippledSegment(g, a1, a2, { color, width, alpha: 0.8, dashLen: 8, gapLen: 4 });
      } else {
        g.setStrokeStyle({ color, width, alpha: 1.0 });
        g.moveTo(a1.x, a1.y); g.lineTo(a2.x, a2.y); g.stroke();
      }
      if (w.wallType === "door" || w.wallType === "window") {
        // A destruída ainda diz o que era, apagada como o entulho.
        drawWallTypeSymbol(g, w.wallType, a1, a2, color, vpScale, isDestroyed ? 0.4 : 1);
      }
      if (w.locked && !isDestroyed) {
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

function drawWallTypeSymbol(
  g: import("pixi.js").Graphics,
  wallType: "door" | "window",
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  color: number,
  vpScale: number,
  alpha = 1,
) {
  const dx = a2.x - a1.x, dy = a2.y - a1.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.1) return;
  const nx = -dy / len, ny = dx / len; // unit normal perpendicular to wall

  if (wallType === "door") {
    // Quarter-circle arc at a1 (hinge) showing the door swing toward a2
    const radius = Math.min(len * 0.85, 20 / vpScale);
    const angle = Math.atan2(dy, dx);
    g.setStrokeStyle({ color, width: Math.max(1, 1.5 / vpScale), alpha: alpha * 0.9 });
    // O Pixi recomeça o caminho no último ponto do traço anterior e o `arc` liga esse ponto ao
    // começo do arco. Na porta de pé o último ponto é a ponta da parede (a ligação some sobre
    // ela); na destruída é a quina do "×", e a ligação virava uma diagonal torta que crescia
    // com o zoom out. Mover para o começo do arco corta a ligação.
    g.moveTo(a1.x + Math.cos(angle) * radius, a1.y + Math.sin(angle) * radius);
    g.arc(a1.x, a1.y, radius, angle, angle + Math.PI / 2);
    g.stroke();
  } else {
    // Window: two perpendicular tick marks at 1/3 and 2/3
    const tickLen = 5 / vpScale;
    for (const t of [1 / 3, 2 / 3]) {
      const px = a1.x + t * dx, py = a1.y + t * dy;
      g.setStrokeStyle({ color, width: Math.max(1, 1.5 / vpScale), alpha: alpha * 0.85 });
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
  if (Math.hypot(a2.x - a1.x, a2.y - a1.y) < 0.1) return;
  // Fine dotted line — very small dots with large gaps
  drawStippledSegment(g, a1, a2, { color, width, alpha: 0.4, dashLen: 1, gapLen: 7 });
  // × marks at endpoints
  const xSize = Math.max(3, 6 / vpScale);
  for (const pt of [a1, a2]) {
    g.setStrokeStyle({ color, width: Math.max(1, 1.5 / vpScale), alpha: 0.4 });
    g.moveTo(pt.x - xSize, pt.y - xSize); g.lineTo(pt.x + xSize, pt.y + xSize); g.stroke();
    g.moveTo(pt.x + xSize, pt.y - xSize); g.lineTo(pt.x - xSize, pt.y + xSize); g.stroke();
  }
}
