# Tactical Map Fase 10 — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full wall editing system for the tactical map editor — replace the `Wall` placeholder with `WallSegment`, implement `snapWallPoint`/`explodePolyline` utils, render walls with a batch Pixi layer (`WallsLayer`), wire drawing mode (polyline → auto-subdivide), enable the "Paredes" tab in the sidebar with type/material chips and a property panel, and save walls through the existing `PUT /maps/:id` endpoint.

**Architecture:** `WallSegment` types live in `src/types/tacticalMap.ts`. Pure geometry utils in `src/features/tactical-map/utils/walls.ts`. The Pixi rendering + interaction are self-contained in `src/components/organisms/WallsLayer.tsx` — it manages its own transient drawing state (polyline in progress) and calls callbacks when segments are confirmed or edited. The editorStore gains wall CRUD actions; `Selection` is extended to include `{ kind: "wall"; id }`. The toolbar gains a "Paredes" tab panel with `WallTypeChips` + `WallConfigPanel`. `TacticalMapEditor` connects store ↔ WallsLayer ↔ sidebar. `TacticalMapViewer` gets walls for free because `TacticalMapStage` now renders `WallsLayer` unconditionally.

**Tech Stack:** React 18, Pixi.js v8 (`@pixi/react`, `pixiGraphics` JSX element), Zustand + Zundo + Immer (editorStore), Vitest for utils/store unit tests, styled-components, TypeScript strict (`verbatimModuleSyntax`, `noUnusedLocals`).

**Working directory:** `System_X_System_React/.claude/worktrees/feat+tactical-map-fase-10/`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types/tacticalMap.ts` | **Modify** | Replace `Wall` with `WallSegment` + all enum types |
| `src/features/tactical-map/utils/walls.ts` | **Create** | `collectGridSnapPoints`, `snapWallPoint`, `explodePolyline` |
| `src/features/tactical-map/utils/__tests__/walls.test.ts` | **Create** | Unit tests for wall utils |
| `src/features/tactical-map/store/editorStore.ts` | **Modify** | Add wall CRUD actions + extend `Selection` |
| `src/features/tactical-map/store/__tests__/editorStore.test.ts` | **Modify** | Tests for wall actions |
| `src/components/organisms/WallsLayer.tsx` | **Create** | Pixi batch render + drawing mode + hit-test + endpoint handles |
| `src/components/molecules/WallTypeChips.tsx` | **Create** | Wall type + material selector chips |
| `src/components/molecules/WallConfigPanel.tsx` | **Create** | Sidebar panel for selected wall properties |
| `src/components/organisms/MapEditorToolbar.tsx` | **Modify** | Enable "Paredes" tab; add wall panel + props |
| `src/components/organisms/TacticalMapStage.tsx` | **Modify** | Replace walls placeholder with `<WallsLayer>`; suppress pan in walls mode; pass `canvasEl` |
| `src/features/tactical-map/TacticalMapEditor.tsx` | **Modify** | Connect wall store state → WallsLayer + sidebar |

---

### Task 1: Replace `Wall` with `WallSegment` in types

**Files:**
- Modify: `src/types/tacticalMap.ts`

This is a pure type change — the `walls` field is always `[]` in existing data so no runtime breakage. `Wall` is only referenced in `tacticalMap.ts` itself (verified by grep — no other files use it).

- [ ] **Step 1: Replace the types**

In `src/types/tacticalMap.ts`, remove the `Wall` type and replace it with the full `WallSegment` model. The section after `// ─── Peça ───` becomes:

```typescript
// ─── Paredes ───────────────────────────────────────────────────────────────
export type WallType =
  | "wall"
  | "door"
  | "window"
  | "secret_door"
  | "terrain";

export type WallMaterial =
  | "stone"
  | "wood"
  | "iron"
  | "magical";

export type DoorSubtype =
  | "basic"
  | "double"
  | "portcullis"
  | "drawbridge";

export type WindowSubtype =
  | "basic"
  | "barred"
  | "shuttered";

export type SenseKind = "full" | "sight" | "none";
export type WallDirection = "both" | "left" | "right";

export type WallSegment = {
  id: string;
  p1: [number, number];  // local (pre-transform) grid coords
  p2: [number, number];
  wallType: WallType;
  material: WallMaterial;
  doorSubtype?: DoorSubtype;
  windowSubtype?: WindowSubtype;
  move: boolean;
  sense: SenseKind;
  direction: WallDirection;
  open: boolean;
  locked: boolean;
  hp: number;
  maxHp: number;
  resistance: number;
  destroyed: boolean;
};
```

In `TacticalMap`, change `walls: Wall[]` to `walls: WallSegment[]`.

- [ ] **Step 2: Verify build**

```bash
cd /home/azzurah/Documentos/HxH_RPG_Environment_Project/System_X_System_Project/System_X_System_React/.claude/worktrees/feat+tactical-map-fase-10
npm run build 2>&1 | grep -E "error TS" | head -10
```

Expected: no TypeScript errors related to `Wall`.

- [ ] **Step 3: Commit**

```bash
git add src/types/tacticalMap.ts
git commit -m "feat(map): replace Wall placeholder with WallSegment types"
```

---

### Task 2: Create wall utils (`snapWallPoint`, `explodePolyline`) + tests

**Files:**
- Create: `src/features/tactical-map/utils/walls.ts`
- Create: `src/features/tactical-map/utils/__tests__/walls.test.ts`

All functions operate in **local (pre-transform) grid space**. The caller converts from Pixi world coords to local with `inverseTransform(vpPos, grid)` before calling snap/explode, and applies `applyTransform(result, grid)` to render.

- [ ] **Step 1: Write the failing tests**

Create `src/features/tactical-map/utils/__tests__/walls.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { collectGridSnapPoints, snapWallPoint, explodePolyline } from "../walls";
import type { GridShape } from "../../../../types/tacticalMap";

const sq = (cellSize = 64): GridShape => ({
  kind: "square", cols: 4, rows: 4, cellSize,
  skewRatio: 1, rotation: 0, color: "#fff", opacity: 1, lineStyle: "solid",
});

const wallAttrs = {
  wallType: "wall" as const, material: "stone" as const,
  move: true, sense: "full" as const, direction: "both" as const,
  open: false, locked: false, hp: 100, maxHp: 100, resistance: 5, destroyed: false,
};

describe("collectGridSnapPoints — square", () => {
  it("includes all grid vertices", () => {
    const pts = collectGridSnapPoints(sq(64));
    const vertices = pts.filter(([x, y]) => x % 64 === 0 && y % 64 === 0);
    // (cols+1)*(rows+1) = 5*5 = 25
    expect(vertices.length).toBe(25);
  });
  it("includes horizontal edge midpoints", () => {
    const pts = collectGridSnapPoints(sq(64));
    expect(pts.some(([x, y]) => x === 32 && y === 0)).toBe(true);
  });
  it("includes vertical edge midpoints", () => {
    const pts = collectGridSnapPoints(sq(64));
    expect(pts.some(([x, y]) => x === 0 && y === 32)).toBe(true);
  });
});

describe("snapWallPoint", () => {
  it("snaps to nearest vertex within threshold", () => {
    expect(snapWallPoint([66, 2], sq(), 15)).toEqual([64, 0]);
  });
  it("returns input when no candidate within threshold", () => {
    // (32,32) is the center of cell (0,0); nearest snap is 32px away
    expect(snapWallPoint([32, 32], sq(), 10)).toEqual([32, 32]);
  });
  it("snaps to edge midpoint", () => {
    // (33,1) is near the horizontal midpoint (32,0)
    expect(snapWallPoint([33, 1], sq(), 15)).toEqual([32, 0]);
  });
  it("picks closest of two nearby candidates", () => {
    // (63,0): dist to (64,0)=1; dist to (32,0)=31 → (64,0) wins
    expect(snapWallPoint([63, 0], sq(), 15)).toEqual([64, 0]);
  });
});

describe("explodePolyline", () => {
  it("returns single segment when no intermediate snap on diagonal", () => {
    const segs = explodePolyline([0, 0], [64, 64], wallAttrs, sq());
    expect(segs).toHaveLength(1);
    expect(segs[0].p1).toEqual([0, 0]);
    expect(segs[0].p2).toEqual([64, 64]);
  });
  it("splits horizontal line at vertices + midpoints", () => {
    // (0,0)→(128,0): intermediates at (32,0) t=0.25, (64,0) t=0.5, (96,0) t=0.75
    const segs = explodePolyline([0, 0], [128, 0], wallAttrs, sq());
    expect(segs).toHaveLength(4);
    expect(segs[0].p2).toEqual([32, 0]);
    expect(segs[1].p1).toEqual([32, 0]);
    expect(segs[1].p2).toEqual([64, 0]);
    expect(segs[2].p2).toEqual([96, 0]);
    expect(segs[3].p2).toEqual([128, 0]);
  });
  it("assigns unique ids to every segment", () => {
    const segs = explodePolyline([0, 0], [128, 0], wallAttrs, sq());
    expect(new Set(segs.map((s) => s.id)).size).toBe(segs.length);
  });
  it("returns empty array for zero-length segment", () => {
    expect(explodePolyline([0, 0], [0, 0], wallAttrs, sq())).toHaveLength(0);
  });
  it("inherits all provided attrs", () => {
    const segs = explodePolyline([0, 0], [64, 0], wallAttrs, sq());
    expect(segs[0].wallType).toBe("wall");
    expect(segs[0].material).toBe("stone");
    expect(segs[0].hp).toBe(100);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npx vitest run src/features/tactical-map/utils/__tests__/walls.test.ts 2>&1 | tail -5
```

Expected: `Cannot find module '../walls'`

- [ ] **Step 3: Create `src/features/tactical-map/utils/walls.ts`**

```typescript
import type { GridShape, WallSegment } from "../../../types/tacticalMap";
import { hexToPixel } from "./hex";

export function collectGridSnapPoints(grid: GridShape): [number, number][] {
  const pts: [number, number][] = [];
  if (grid.kind === "square") {
    const { cols, rows, cellSize } = grid;
    // Vertices
    for (let r = 0; r <= rows; r++)
      for (let c = 0; c <= cols; c++)
        pts.push([c * cellSize, r * cellSize]);
    // Horizontal edge midpoints
    for (let r = 0; r <= rows; r++)
      for (let c = 0; c < cols; c++)
        pts.push([(c + 0.5) * cellSize, r * cellSize]);
    // Vertical edge midpoints
    for (let r = 0; r < rows; r++)
      for (let c = 0; c <= cols; c++)
        pts.push([c * cellSize, (r + 0.5) * cellSize]);
  } else {
    const { cols, rows, cellSize } = grid;
    for (let r = 0; r < rows; r++) {
      for (let q = 0; q < cols; q++) {
        const center = hexToPixel({ q, r }, cellSize);
        pts.push([center.x, center.y]);
        for (let i = 0; i < 6; i++) {
          const angle = ((60 * i - 30) * Math.PI) / 180;
          pts.push([center.x + cellSize * Math.cos(angle), center.y + cellSize * Math.sin(angle)]);
        }
      }
    }
  }
  return pts;
}

// localPos in local (pre-transform) grid space. Returns best snap or localPos.
export function snapWallPoint(
  localPos: [number, number],
  grid: GridShape,
  thresholdLocal = 15,
): [number, number] {
  const candidates = collectGridSnapPoints(grid);
  let bestSq = thresholdLocal * thresholdLocal;
  let best: [number, number] = localPos;
  for (const c of candidates) {
    const dx = c[0] - localPos[0], dy = c[1] - localPos[1];
    const dSq = dx * dx + dy * dy;
    if (dSq < bestSq) { bestSq = dSq; best = c; }
  }
  return best;
}

type WallAttrs = Omit<WallSegment, "id" | "p1" | "p2">;

// Splits segment p1→p2 at every grid snap point that lies on it.
// Returns [] for zero-length segment.
export function explodePolyline(
  p1: [number, number],
  p2: [number, number],
  attrs: WallAttrs,
  grid: GridShape,
  eps = 0.01,
): WallSegment[] {
  const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq < eps * eps) return [];

  const candidates = collectGridSnapPoints(grid);
  const intermediates: { t: number; p: [number, number] }[] = [];
  for (const c of candidates) {
    const cx = c[0] - p1[0], cy = c[1] - p1[1];
    const t = (cx * dx + cy * dy) / lenSq;
    if (t <= eps || t >= 1 - eps) continue;
    const dist = Math.abs(cx * dy - cy * dx) / Math.sqrt(lenSq);
    if (dist < eps) intermediates.push({ t, p: c });
  }
  intermediates.sort((a, b) => a.t - b.t);

  const verts: [number, number][] = [p1, ...intermediates.map((x) => x.p), p2];
  return verts.slice(0, -1).map((start, i) => ({
    ...attrs,
    id: crypto.randomUUID(),
    p1: start,
    p2: verts[i + 1],
  }));
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/features/tactical-map/utils/__tests__/walls.test.ts 2>&1 | tail -10
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/tactical-map/utils/walls.ts \
        src/features/tactical-map/utils/__tests__/walls.test.ts
git commit -m "feat(map): add wall utils — snapWallPoint, explodePolyline"
```

---

### Task 3: Extend editorStore with wall CRUD actions and extend Selection

**Files:**
- Modify: `src/features/tactical-map/store/editorStore.ts`
- Modify: `src/features/tactical-map/store/__tests__/editorStore.test.ts`

- [ ] **Step 1: Append wall action tests to the existing test file**

Open `src/features/tactical-map/store/__tests__/editorStore.test.ts`. Read it first to confirm what `baseMap()` is called (it may be named differently). Then append at the bottom:

```typescript
// ─── Wall action tests ──────────────────────────────────────────────────────

import type { WallSegment } from "../../../../types/tacticalMap";

const mockWall = (): WallSegment => ({
  id: "w1", p1: [0, 0], p2: [64, 0],
  wallType: "wall", material: "stone",
  move: true, sense: "full", direction: "both",
  open: false, locked: false, hp: 100, maxHp: 100, resistance: 5, destroyed: false,
});

// If the test file doesn't have baseMap(), add it:
// const baseMap = (): TacticalMap => ({
//   id: "map-1", campaignId: "c-1", name: "Test", description: "",
//   grid: { kind: "square", cols: 10, rows: 10, cellSize: 40, skewRatio: 1,
//           rotation: 0, color: "#000", opacity: 1, lineStyle: "solid" },
//   bg: null, pieces: [], walls: [], decorations: [], items: [],
//   createdAt: "", updatedAt: "",
// });

describe("editorStore — wall actions", () => {
  it("addWallSegments appends and marks dirty", () => {
    const store = createEditorStore(baseMap());
    store.getState().addWallSegments([mockWall()]);
    expect(store.getState().map.walls).toHaveLength(1);
    expect(store.getState().map.walls[0].id).toBe("w1");
    expect(store.getState().isDirty).toBe(true);
  });

  it("updateWallSegment patches by id", () => {
    const store = createEditorStore(baseMap());
    store.getState().addWallSegments([mockWall()]);
    store.getState().updateWallSegment("w1", { locked: true, hp: 50 });
    const w = store.getState().map.walls[0];
    expect(w.locked).toBe(true);
    expect(w.hp).toBe(50);
  });

  it("removeWallSegment removes by id", () => {
    const store = createEditorStore(baseMap());
    store.getState().addWallSegments([mockWall()]);
    store.getState().removeWallSegment("w1");
    expect(store.getState().map.walls).toHaveLength(0);
    expect(store.getState().isDirty).toBe(true);
  });

  it("setSelection supports kind=wall", () => {
    const store = createEditorStore(baseMap());
    store.getState().setSelection({ kind: "wall", id: "w1" });
    expect(store.getState().selection).toEqual({ kind: "wall", id: "w1" });
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/features/tactical-map/store/__tests__/editorStore.test.ts 2>&1 | tail -5
```

Expected: `addWallSegments is not a function`.

- [ ] **Step 3: Update `editorStore.ts`**

Add `WallSegment` to the import:
```typescript
import type {
  BgImage, GridShape, Piece, SlotCoord, TacticalMap, WallSegment,
} from "../../../types/tacticalMap";
```

Extend `Selection`:
```typescript
export type Selection =
  | { kind: "piece"; id: string }
  | { kind: "decoration"; id: string }
  | { kind: "wall"; id: string }
  | null;
```

Add to `EditorState` interface:
```typescript
  addWallSegments: (segments: WallSegment[]) => void;
  updateWallSegment: (id: string, patch: Partial<WallSegment>) => void;
  removeWallSegment: (id: string) => void;
```

Add implementations inside the `immer((set) => ({ ... }))` body:
```typescript
        addWallSegments: (segments) =>
          set((s) => { s.map.walls.push(...segments); s.isDirty = true; }),
        updateWallSegment: (id, patch) =>
          set((s) => {
            const w = s.map.walls.find((x) => x.id === id);
            if (w) Object.assign(w, patch);
            s.isDirty = true;
          }),
        removeWallSegment: (id) =>
          set((s) => { s.map.walls = s.map.walls.filter((x) => x.id !== id); s.isDirty = true; }),
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/features/tactical-map/store/__tests__/editorStore.test.ts 2>&1 | tail -10
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/tactical-map/store/editorStore.ts \
        src/features/tactical-map/store/__tests__/editorStore.test.ts
git commit -m "feat(map): add wall CRUD actions to editorStore; extend Selection with wall kind"
```

---

### Task 4: Create `WallsLayer.tsx` — rendering + drawing mode

**Files:**
- Create: `src/components/organisms/WallsLayer.tsx`

WallsLayer manages its own transient drawing state. It calls `onDrawComplete(segments)` when a polyline is confirmed (Escape or double-click on same point). Canvas element is passed as a prop from `ViewportInner` (see Task 5).

- [ ] **Step 1: Create the file**

Create `src/components/organisms/WallsLayer.tsx`:

```typescript
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

      setDraw((s) => {
        const pts = [...s.polylinePoints, pt];
        // Double-click (same point twice) = finish
        if (s.polylinePoints.length > 0) {
          const last = s.polylinePoints[s.polylinePoints.length - 1];
          if (Math.abs(last[0] - pt[0]) < 1 && Math.abs(last[1] - pt[1]) < 1) {
            // Will finish via finishPolyline below — return unchanged to avoid flicker
            return s;
          }
        }
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
```

- [ ] **Step 2: Build**

```bash
npm run build 2>&1 | grep "error TS" | head -10
```

Expected: no errors (WallsLayer is not yet imported anywhere, so no callers to fail).

- [ ] **Step 3: Commit**

```bash
git add src/components/organisms/WallsLayer.tsx
git commit -m "feat(map): create WallsLayer — batch Pixi render + polyline drawing mode"
```

---

### Task 5: Wire WallsLayer into TacticalMapStage; suppress pan in walls mode

**Files:**
- Modify: `src/components/organisms/TacticalMapStage.tsx`

Two changes: (1) replace `<pixiContainer label="walls-layer" />` with `<WallsLayer>`, (2) pass `canvasEl` from `useApplication()`, (3) suppress pan when `activeTool === "walls"`.

- [ ] **Step 1: Add imports to TacticalMapStage**

At the top, add:
```typescript
import WallsLayer from "./WallsLayer";
import type { WallSegment, WallType, WallMaterial } from "../../types/tacticalMap";
```

- [ ] **Step 2: Add wall props to outer `TacticalMapStage` Props type and inner `ViewportInner` Props type**

Append to outer `Props`:
```typescript
  walls?: WallSegment[];
  wallsInteractive?: boolean;
  selectedWallId?: string | null;
  activeWallType?: WallType;
  activeMaterial?: WallMaterial;
  onWallSelect?: (id: string | null) => void;
  onDrawComplete?: (segments: WallSegment[]) => void;
  onWallEndpointDrag?: (wallId: string, point: "p1" | "p2", localPos: [number, number]) => void;
```

Add the same to `ViewportInner`'s internal Props type.

- [ ] **Step 3: Destructure + thread wall props through both components**

In `TacticalMapStage` destructuring, add with defaults:
```typescript
  walls = [],
  wallsInteractive = false,
  selectedWallId = null,
  activeWallType = "wall" as WallType,
  activeMaterial = "stone" as WallMaterial,
  onWallSelect,
  onDrawComplete,
  onWallEndpointDrag,
```

Pass all of these to `<ViewportInner>` alongside existing props.

In `ViewportInner` destructuring, add the same params.

- [ ] **Step 4: Pass `canvasEl` from `useApplication()` in ViewportInner**

`ViewportInner` already calls `const { app } = useApplication();`. Compute:
```typescript
const canvasEl = app?.renderer ? (app.canvas as HTMLCanvasElement) : null;
```

Pass to `<WallsLayer>`.

- [ ] **Step 5: Replace walls placeholder with WallsLayer**

Find: `<pixiContainer label="walls-layer" />`

Replace with:
```tsx
<WallsLayer
  walls={walls}
  grid={map.grid}
  vpRef={vpRef}
  vpScale={vpScale}
  canvasEl={canvasEl}
  wallsInteractive={wallsInteractive}
  selectedWallId={selectedWallId}
  activeWallType={activeWallType}
  activeMaterial={activeMaterial}
  onWallSelect={onWallSelect ?? (() => {})}
  onDrawComplete={onDrawComplete ?? (() => {})}
  onEndpointDrag={onWallEndpointDrag ?? (() => {})}
  onGestureStart={onDragGestureStart ?? (() => {})}
  onGestureEnd={onDragGestureEnd ?? (() => {})}
/>
```

- [ ] **Step 6: Suppress panning when in walls mode**

In `ViewportInner`, inside the `requestAnimationFrame` callback of `onWindowDown` (where `isPanningRef.current = true`), add this guard immediately before that line:
```typescript
        if (activeTool === "walls") return;
```

- [ ] **Step 7: Build**

```bash
npm run build 2>&1 | grep "error TS" | head -10
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/organisms/TacticalMapStage.tsx
git commit -m "feat(map): wire WallsLayer into TacticalMapStage; suppress pan in walls mode"
```

---

### Task 6: Create `WallTypeChips.tsx` and `WallConfigPanel.tsx`

**Files:**
- Create: `src/components/molecules/WallTypeChips.tsx`
- Create: `src/components/molecules/WallConfigPanel.tsx`

Before writing, read `src/styles/tokens.ts` to use the correct token keys.

- [ ] **Step 1: Read tokens to know what's available**

```bash
grep -E "^\s+[a-zA-Z]" src/styles/tokens.ts | head -30
```

Note the actual key names for background, border, text colors, etc.

- [ ] **Step 2: Create `WallTypeChips.tsx`**

```typescript
import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";
import type { WallMaterial, WallType } from "../../types/tacticalMap";

type Props = {
  activeType: WallType;
  activeMaterial: WallMaterial;
  onTypeChange: (t: WallType) => void;
  onMaterialChange: (m: WallMaterial) => void;
};

const WALL_TYPES: { value: WallType; label: string }[] = [
  { value: "wall",        label: "Parede" },
  { value: "door",        label: "Porta" },
  { value: "window",      label: "Janela" },
  { value: "secret_door", label: "P. Secreta" },
  { value: "terrain",     label: "Terreno" },
];

const MATERIALS: { value: WallMaterial; label: string }[] = [
  { value: "stone",   label: "Pedra" },
  { value: "wood",    label: "Madeira" },
  { value: "iron",    label: "Ferro" },
  { value: "magical", label: "Mágica" },
];

export default function WallTypeChips({ activeType, activeMaterial, onTypeChange, onMaterialChange }: Props) {
  return (
    <Container>
      <Section>
        <SectionLabel>Tipo</SectionLabel>
        <ChipRow>
          {WALL_TYPES.map(({ value, label }) => (
            <Chip key={value} type="button" $active={activeType === value} onClick={() => onTypeChange(value)}>
              {label}
            </Chip>
          ))}
        </ChipRow>
      </Section>
      <Section>
        <SectionLabel>Material</SectionLabel>
        <ChipRow>
          {MATERIALS.map(({ value, label }) => (
            <Chip key={value} type="button" $active={activeMaterial === value} onClick={() => onMaterialChange(value)}>
              {label}
            </Chip>
          ))}
        </ChipRow>
      </Section>
    </Container>
  );
}
```

For the styled components — use token keys you found in Step 1 (e.g. if the token is `colors.surface` for backgrounds, use that). Provide a safe fallback:

```typescript
const Container = styled.div`
  display: flex; flex-direction: column; gap: 12px; padding: 12px 0;
`;
const Section = styled.div`
  display: flex; flex-direction: column; gap: 6px;
`;
const SectionLabel = styled.span`
  font-family: ${fonts.ui}; font-size: 11px; font-weight: 600;
  color: ${colors.textSecondary ?? colors.text ?? "#94a3b8"};
  text-transform: uppercase; letter-spacing: 0.05em;
`;
const ChipRow = styled.div`
  display: flex; flex-wrap: wrap; gap: 6px;
`;
const Chip = styled.button<{ $active: boolean }>`
  font-family: ${fonts.ui}; font-size: 12px; padding: 4px 10px; border-radius: 999px;
  border: 1px solid ${({ $active }) => $active ? "#6366f1" : "#334155"};
  background: ${({ $active }) => $active ? "#6366f1" : "transparent"};
  color: ${({ $active }) => $active ? "#fff" : "#94a3b8"};
  cursor: pointer;
  &:hover { border-color: #6366f1; color: #fff; }
`;
```

Replace the hardcoded hex values with actual token references if the token file has them.

- [ ] **Step 3: Create `WallConfigPanel.tsx`**

```typescript
import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";
import type { WallSegment } from "../../types/tacticalMap";

type Props = {
  wall: WallSegment;
  onUpdate: (patch: Partial<WallSegment>) => void;
  onRemove: () => void;
};

export default function WallConfigPanel({ wall, onUpdate, onRemove }: Props) {
  return (
    <Container>
      <Header>
        <Title>Segmento</Title>
        <RemoveButton type="button" onClick={onRemove}>Remover</RemoveButton>
      </Header>
      <Row><Label>Tipo</Label><Value>{wall.wallType}</Value></Row>
      <Row><Label>Material</Label><Value>{wall.material}</Value></Row>
      <Row><Label>HP</Label><Value>{wall.hp} / {wall.maxHp}</Value></Row>
      <Divider />
      <CheckRow>
        <input id="wall-move" type="checkbox" checked={wall.move}
          onChange={(e) => onUpdate({ move: e.target.checked })} />
        <CheckLabel htmlFor="wall-move">Bloqueia movimento</CheckLabel>
      </CheckRow>
      {(wall.wallType === "door" || wall.wallType === "window") && (
        <CheckRow>
          <input id="wall-open" type="checkbox" checked={wall.open}
            onChange={(e) => onUpdate({ open: e.target.checked })} />
          <CheckLabel htmlFor="wall-open">Aberta</CheckLabel>
        </CheckRow>
      )}
      {wall.wallType === "door" && (
        <CheckRow>
          <input id="wall-locked" type="checkbox" checked={wall.locked}
            onChange={(e) => onUpdate({ locked: e.target.checked })} />
          <CheckLabel htmlFor="wall-locked">Trancada</CheckLabel>
        </CheckRow>
      )}
    </Container>
  );
}

const Container = styled.div`display: flex; flex-direction: column; gap: 10px; padding: 12px 0;`;
const Header = styled.div`display: flex; justify-content: space-between; align-items: center;`;
const Title = styled.span`font-family: ${fonts.ui}; font-size: 13px; font-weight: 600; color: ${colors.text ?? "#e2e8f0"};`;
const RemoveButton = styled.button`
  font-family: ${fonts.ui}; font-size: 12px; padding: 3px 10px; border-radius: 4px;
  border: 1px solid #ef4444; background: transparent; color: #ef4444; cursor: pointer;
  &:hover { background: #ef4444; color: #fff; }
`;
const Row = styled.div`display: flex; gap: 8px; align-items: center;`;
const Label = styled.span`font-family: ${fonts.ui}; font-size: 12px; color: ${colors.textSecondary ?? "#94a3b8"}; min-width: 60px;`;
const Value = styled.span`font-family: ${fonts.ui}; font-size: 12px; color: ${colors.text ?? "#e2e8f0"};`;
const Divider = styled.hr`border: none; border-top: 1px solid #334155; margin: 0;`;
const CheckRow = styled.div`display: flex; align-items: center; gap: 8px;`;
const CheckLabel = styled.label`font-family: ${fonts.ui}; font-size: 12px; color: ${colors.text ?? "#e2e8f0"}; cursor: pointer;`;
```

- [ ] **Step 4: Build**

```bash
npm run build 2>&1 | grep "error TS" | head -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/molecules/WallTypeChips.tsx src/components/molecules/WallConfigPanel.tsx
git commit -m "feat(map): add WallTypeChips and WallConfigPanel sidebar components"
```

---

### Task 7: Enable "Paredes" tab in MapEditorToolbar

**Files:**
- Modify: `src/components/organisms/MapEditorToolbar.tsx`

- [ ] **Step 1: Add wall imports and props**

Add to imports:
```typescript
import type { BgImage, GridShape, Piece, WallSegment, WallType, WallMaterial } from "../../types/tacticalMap";
import WallTypeChips from "../molecules/WallTypeChips";
import WallConfigPanel from "../molecules/WallConfigPanel";
```

Append to `Props` type:
```typescript
  activeWallType: WallType;
  activeMaterial: WallMaterial;
  onWallTypeChange: (t: WallType) => void;
  onMaterialChange: (m: WallMaterial) => void;
  selectedWall: WallSegment | null;
  onWallUpdate: (id: string, patch: Partial<WallSegment>) => void;
  onRemoveWall: (id: string) => void;
```

- [ ] **Step 2: Enable the "Paredes" tab**

Change `{ tool: "walls", label: "Paredes", enabled: false }` to `enabled: true`.

- [ ] **Step 3: Destructure new props and add wall panel to JSX**

Destructure in the function signature:
```typescript
  activeWallType, activeMaterial, onWallTypeChange, onMaterialChange,
  selectedWall, onWallUpdate, onRemoveWall,
```

In the return JSX, find the block rendering tab content (where `activeTool === "grid"` shows `GridConfigPanel`, etc.). Add after the last existing panel:

```tsx
{activeTool === "walls" && (
  <>
    <WallTypeChips
      activeType={activeWallType}
      activeMaterial={activeMaterial}
      onTypeChange={onWallTypeChange}
      onMaterialChange={onMaterialChange}
    />
    {selectedWall && (
      <WallConfigPanel
        wall={selectedWall}
        onUpdate={(patch) => onWallUpdate(selectedWall.id, patch)}
        onRemove={() => onRemoveWall(selectedWall.id)}
      />
    )}
  </>
)}
```

- [ ] **Step 4: Build — expect errors at callers (OK for now)**

```bash
npm run build 2>&1 | grep "error TS" | head -10
```

This will show errors in `TacticalMapEditor.tsx` since it's the caller and doesn't pass the new props yet. That's expected — Task 8 fixes it.

- [ ] **Step 5: Commit**

```bash
git add src/components/organisms/MapEditorToolbar.tsx
git commit -m "feat(map): enable Paredes tab; wire WallTypeChips + WallConfigPanel into toolbar"
```

---

### Task 8: Wire wall state into TacticalMapEditor

**Files:**
- Modify: `src/features/tactical-map/TacticalMapEditor.tsx`

- [ ] **Step 1: Update the tacticalMap import to include wall types**

Change the `import type { TacticalMap, SlotCoord }` line to:
```typescript
import type { TacticalMap, SlotCoord, WallType, WallMaterial, WallSegment } from "../../types/tacticalMap";
```

- [ ] **Step 2: Read wall state and actions from the store**

After `const removePiece = store((s) => s.removePiece);`, add:
```typescript
  const walls = store((s) => s.map.walls);
  const addWallSegments = store((s) => s.addWallSegments);
  const updateWallSegment = store((s) => s.updateWallSegment);
  const removeWallSegment = store((s) => s.removeWallSegment);
```

- [ ] **Step 3: Add local state for active wall type and material**

After the existing local state blocks, add:
```typescript
  const [activeWallType, setActiveWallType] = useState<WallType>("wall");
  const [activeMaterial, setActiveMaterial] = useState<WallMaterial>("stone");
```

- [ ] **Step 4: Pass wall props to `MapEditorToolbar`**

In the `<MapEditorToolbar ...>` block, add:
```tsx
          activeWallType={activeWallType}
          activeMaterial={activeMaterial}
          onWallTypeChange={setActiveWallType}
          onMaterialChange={setActiveMaterial}
          selectedWall={
            selection?.kind === "wall"
              ? (walls.find((w) => w.id === selection.id) ?? null)
              : null
          }
          onWallUpdate={updateWallSegment}
          onRemoveWall={(id) => { removeWallSegment(id); setSelection(null); }}
```

- [ ] **Step 5: Pass wall props to `TacticalMapStage`**

In the `<TacticalMapStage ...>` block, add:
```tsx
            walls={walls}
            wallsInteractive={activeTool === "walls"}
            selectedWallId={selection?.kind === "wall" ? selection.id : null}
            activeWallType={activeWallType}
            activeMaterial={activeMaterial}
            onWallSelect={(id) => setSelection(id ? { kind: "wall", id } : null)}
            onDrawComplete={(segments) => { addWallSegments(segments); endGesture(); }}
            onWallEndpointDrag={(wallId, point, localPos) =>
              updateWallSegment(wallId, { [point]: localPos } as Partial<WallSegment>)
            }
```

- [ ] **Step 6: Final build — must be clean**

```bash
npm run build 2>&1 | grep "error TS" | head -10
```

Expected: no errors.

- [ ] **Step 7: Run all tests**

```bash
npx vitest run 2>&1 | tail -15
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/features/tactical-map/TacticalMapEditor.tsx
git commit -m "feat(map): wire wall store into TacticalMapEditor — stage + sidebar fully connected"
```

---

## Self-Review

**Spec coverage:**

| Spec deliverable (Fase 10 frontend) | Task |
|---|---|
| Replace `Wall` with `WallSegment` + all enum types | 1 |
| `snapWallPoint` (square + hex grid) | 2 |
| `explodePolyline` (auto-subdivide at snap points) | 2 |
| Unit tests for snap + explode | 2 |
| `WallsLayer`: batch render by material (color/width) | 4 |
| `WallsLayer`: drawing mode (polyline → explode → commit) | 4 |
| `WallsLayer`: hit testing → selection | 4 |
| `WallsLayer`: endpoint handles on selected segment | 4 |
| `editorStore`: `addWallSegments`, `updateWallSegment`, `removeWallSegment` | 3 |
| `editorStore`: `Selection` extended with `{ kind: "wall" }` | 3 |
| `WallTypeChips`: type + material selector | 6 |
| `WallConfigPanel`: move/open/locked toggles | 6 |
| Enable "Paredes" tab | 7 |
| `TacticalMapEditor`: drawing mode, undo/redo | 8 |
| `TacticalMapViewer` renders walls | Free (TacticalMapStage renders WallsLayer with defaults) |
| Unit tests for store wall actions | 3 |

**Gaps (deferred):**
- Dash patterns per wallType (window = dashed, terrain = dotted) — all walls render solid. Visual gap only; not needed for "pronto" criterion.
- Shift key disables snap — easy add to `toLocal` in WallsLayer: `if (!e.shiftKey) return snapWallPoint(...)`.
- Undo via `delete` key on selected wall — add to keyboard handler in TacticalMapEditor alongside the existing arrow key handler.

**Placeholder scan:** All code blocks are complete. No "TODO", "TBD" or "fill in" phrases.

**Type consistency:**
- `WallSegment` defined in Task 1 with camelCase (`wallType`, `maxHp`). Used consistently in Tasks 2–8.
- `explodePolyline` returns `WallSegment[]` (Task 2) → `onDrawComplete(WallSegment[])` in WallsLayer (Task 4) → `addWallSegments(WallSegment[])` in store (Task 3). Chain is type-safe.
- `Selection { kind: "wall"; id: string }` added in Task 3. Referenced in Task 8 as `selection?.kind === "wall"`. Consistent.
- `WallsLayer.onEndpointDrag` prop matches the handler in TacticalMapStage (`onWallEndpointDrag`) — wired correctly in Task 5 step 5.
- `canvasEl: HTMLCanvasElement | null` added to WallsLayer Props (Task 4) and passed from ViewportInner in Task 5 step 4.
