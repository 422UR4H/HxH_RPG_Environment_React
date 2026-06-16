# Tactical Map Fog of War (10-D) — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render line-of-sight fog of war in the tactical-map viewer and consume the backend's per-player filtered state and fog WS events.

**Architecture:** A new `FogLayer` Pixi organism draws a three-tier fog (unexplored dark, explored gray, current-vision clear) inside the viewport's world container, applying the same `applyTransform` as walls. Pure fog geometry lives in a unit-tested `utils/fog.ts`. `useMatchWs` gains handlers for the extended `map_full_state`, `visibility_updated`, and `wall_revealed`; `GamePage` holds the live fog state, walls, and pieces and threads them through `TacticalMapViewer` → `TacticalMapStage` → `FogLayer`. The master sees no fog.

**Tech Stack:** React 19, TypeScript (strict), `@pixi/react` v8 / pixi.js v8, pixi-viewport, Vitest + Testing Library, msw.

**Spec:** `System_X_System/docs/superpowers/specs/2026-06-16-tactical-map-walls-10d-design.md`
**Backend contract:** `System_X_System/docs/superpowers/plans/2026-06-16-tactical-map-fog-10d-backend.md` (WS payload shapes — Task 13)

**Prerequisite:** Backend plan merged (the WS/REST contract it defines must exist). This plan consumes `map_full_state` (extended), `visibility_updated`, `wall_revealed`, and the role-filtered `GET /maps/:id`.

---

## Conventions for every task

- Run from `System_X_System_React/`.
- Tests: `npm run test -- <path>` (Vitest). Type-check: `npm run build` or `npx tsc --noEmit`. Lint: `npm run lint`.
- WS payloads are snake_case; convert with `objToCamelCase` from `src/utils/caseConverter.ts` at the boundary (project invariant).
- Pixi/WebGL is validated visually, not in jsdom (project testing strategy). Unit tests cover pure geometry and the WS hook state, with `@pixi/react` mocked where a component is rendered.
- Commit messages end with the project's `Co-Authored-By` trailer (omitted below for brevity — add it).
- Branch: `feat/tactical-map-walls-10d` (shared with backend; the frontend repo has its own branch of the same name — create it if absent: `git checkout -b feat/tactical-map-walls-10d`).

---

## File structure (created / modified)

**Created:**
- `src/features/tactical-map/utils/fog.ts` — pure fog geometry (cell corners, tier classification, payload parsing)
- `src/features/tactical-map/utils/__tests__/fog.test.ts`
- `src/components/organisms/FogLayer.tsx` — Pixi fog rendering

**Modified:**
- `src/types/tacticalMap.ts` — `FogMode`, `WallSegment.revealed?`, `TacticalMap.fogMode`, `FogState`
- `src/hooks/useMatchWs.ts` — handle `map_full_state`, `visibility_updated`, `wall_revealed`; send full grid in `map_state_sync`
- `src/hooks/__tests__/useMatchWs.test.ts` (create if absent; otherwise extend)
- `src/components/organisms/TacticalMapStage.tsx` — thread `fogState` + `isMaster`; mount `FogLayer`
- `src/features/tactical-map/TacticalMapViewer.tsx` — thread `fogState` + `isMaster`
- `src/pages/GamePage.tsx` — hold live fog state + walls + pieces from WS; pass to viewer

---

## Task 1: Types

**Files:**
- Modify: `src/types/tacticalMap.ts`

- [ ] **Step 1: Add the types**

Append/modify in `src/types/tacticalMap.ts`:
```ts
// ─── Fog of War (10-D) ──────────────────────────────────────────────────────
export type FogMode = "live" | "explored";

// A single visibility polygon's vertices, in LOCAL (pre-transform) coords —
// same space as WallSegment.p1/p2. FogLayer applies applyTransform per vertex.
export type VisibilityPolygon = Array<[number, number]>;

// Viewer-side fog state (not persisted in the editor; arrives via WS/REST).
export type FogState = {
  fogMode: FogMode;
  visiblePolygons: VisibilityPolygon[];
  // Accumulated explored cells as "a,b" keys (square: col,row; hex: q,r).
  exploredCells: Set<string>;
};
```

In `WallSegment` (after `destroyed`):
```ts
  destroyed: boolean;
  revealed?: boolean; // secret_door revealed to all by the master (10-D)
```

In `TacticalMap` (after `items`):
```ts
  items: MapItem[];      // []
  fogMode?: FogMode;     // default "explored"; absent on legacy maps
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: passes (additive changes only).

- [ ] **Step 3: Commit**

```bash
git add src/types/tacticalMap.ts
git commit -m "feat(fog): add FogMode, FogState, WallSegment.revealed, TacticalMap.fogMode"
```

---

## Task 2: Pure fog geometry (`utils/fog.ts`)

The testable core: classify each grid cell as a fog tier and produce the local-coord
corner polygon for a cell (square or hex). FogLayer consumes these.

**Files:**
- Create: `src/features/tactical-map/utils/fog.ts`
- Test: `src/features/tactical-map/utils/__tests__/fog.test.ts`

- [ ] **Step 1: Write the failing test**

`src/features/tactical-map/utils/__tests__/fog.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { cellKey, parseExploredDelta, mergeExplored, cellCornersLocal } from "../fog";
import type { GridShape } from "../../../../types/tacticalMap";

const squareGrid: GridShape = {
  kind: "square", cols: 10, rows: 10, cellSize: 64,
  skewRatio: 1, rotation: 0, color: "#fff", opacity: 0.5, lineStyle: "solid",
};

describe("fog utils", () => {
  it("cellKey is stable and parseable", () => {
    expect(cellKey(2, -3)).toBe("2,-3");
  });

  it("parseExploredDelta maps [[a,b]] to keys", () => {
    expect(parseExploredDelta([[1, 2], [3, 4]])).toEqual(["1,2", "3,4"]);
  });

  it("mergeExplored unions delta into a set without mutating input", () => {
    const base = new Set<string>(["0,0"]);
    const merged = mergeExplored(base, [[0, 0], [1, 0]]);
    expect(merged.has("0,0")).toBe(true);
    expect(merged.has("1,0")).toBe(true);
    expect(merged.size).toBe(2);
    expect(base.size).toBe(1); // original untouched
  });

  it("cellCornersLocal returns 4 corners for a square cell", () => {
    const corners = cellCornersLocal(1, 1, squareGrid);
    expect(corners).toHaveLength(4);
    // Cell (1,1) spans local x in [64,128], y in [64,128].
    expect(corners[0]).toEqual([64, 64]);
    expect(corners[2]).toEqual([128, 128]);
  });

  it("cellCornersLocal returns 6 corners for a hex cell", () => {
    const hexGrid: GridShape = { ...squareGrid, kind: "hex" };
    const corners = cellCornersLocal(0, 0, hexGrid);
    expect(corners).toHaveLength(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/tactical-map/utils/__tests__/fog.test.ts`
Expected: FAIL — module/exports missing.

- [ ] **Step 3: Write the implementation**

`src/features/tactical-map/utils/fog.ts`:
```ts
import type { GridShape } from "../../../types/tacticalMap";

/** Stable string key for a cell. Square: "col,row". Hex: "q,r". */
export function cellKey(a: number, b: number): string {
  return `${a},${b}`;
}

/** Convert a backend explored delta ([[a,b],...]) to an array of cell keys. */
export function parseExploredDelta(delta: Array<[number, number]>): string[] {
  return delta.map(([a, b]) => cellKey(a, b));
}

/** Return a NEW set that unions `delta` into `base` (base is not mutated). */
export function mergeExplored(base: Set<string>, delta: Array<[number, number]>): Set<string> {
  const next = new Set(base);
  for (const [a, b] of delta) next.add(cellKey(a, b));
  return next;
}

/**
 * Corner points of cell (a,b) in LOCAL (pre-transform) coords. The caller applies
 * applyTransform per corner before drawing. Square → 4 corners; hex → 6 (pointy-top).
 */
export function cellCornersLocal(a: number, b: number, grid: GridShape): Array<[number, number]> {
  if (grid.kind === "hex") {
    const size = grid.cellSize / 2;
    const cx = size * Math.sqrt(3) * (a + b / 2);
    const cy = size * 1.5 * b;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 180) * (60 * i - 30); // pointy-top
      pts.push([cx + size * Math.cos(ang), cy + size * Math.sin(ang)]);
    }
    return pts;
  }
  const s = grid.cellSize;
  const x = a * s, y = b * s;
  return [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/tactical-map/utils/__tests__/fog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/tactical-map/utils/fog.ts src/features/tactical-map/utils/__tests__/fog.test.ts
git commit -m "feat(fog): add pure fog geometry utils (cell keys, explored merge, cell corners)"
```

---

## Task 3: FogLayer component

Draws three tiers inside the world container. Technique: one dark Graphics over the map
bounds; explored cells drawn as a lighter "lift" via erase blend so they read gray; current
vision polygons drawn as a full erase so they read clear. The master path renders nothing.

**Files:**
- Create: `src/components/organisms/FogLayer.tsx`

- [ ] **Step 1: Write the component**

`src/components/organisms/FogLayer.tsx`:
```tsx
import { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { GridShape, FogState } from "../../types/tacticalMap";
import { applyTransform } from "../../features/tactical-map/utils/coords";
import { cellCornersLocal } from "../../features/tactical-map/utils/fog";

const UNEXPLORED_ALPHA = 0.92;
const EXPLORED_ALPHA = 0.5;
const FOG_COLOR = 0x05070a;

type Props = {
  fog: FogState;
  grid: GridShape;
  /** Map bounds in local coords to cover with darkness. */
  worldWidth: number;
  worldHeight: number;
  /** Master sees everything — fog disabled. */
  disabled: boolean;
};

export default function FogLayer({ fog, grid, worldWidth, worldHeight, disabled }: Props) {
  // Base darkness over the whole board.
  const drawBase = useCallback((g: PixiGraphics) => {
    g.clear();
    if (disabled) return;
    // Cover generously beyond bounds so panning never reveals an un-fogged edge.
    const pad = Math.max(worldWidth, worldHeight);
    g.rect(-pad, -pad, worldWidth + 2 * pad, worldHeight + 2 * pad);
    g.fill({ color: FOG_COLOR, alpha: UNEXPLORED_ALPHA });
  }, [disabled, worldWidth, worldHeight]);

  // Explored cells: erase a portion of the darkness so they read as mid-gray.
  // Only in "explored" mode. Drawn with erase blend at (UNEXPLORED-EXPLORED) strength.
  const drawExplored = useCallback((g: PixiGraphics) => {
    g.clear();
    if (disabled || fog.fogMode !== "explored") return;
    const eraseAlpha = (UNEXPLORED_ALPHA - EXPLORED_ALPHA) / UNEXPLORED_ALPHA;
    for (const key of fog.exploredCells) {
      const [a, b] = key.split(",").map(Number);
      const corners = cellCornersLocal(a, b, grid);
      const tp = corners.map(([x, y]) => applyTransform({ x, y }, grid));
      g.poly(tp.map((p) => ({ x: p.x, y: p.y })) as unknown as number[]);
      g.fill({ color: 0xffffff, alpha: eraseAlpha });
    }
  }, [disabled, fog.fogMode, fog.exploredCells, grid]);

  // Current vision: fully erase the darkness inside each visibility polygon.
  const drawVisible = useCallback((g: PixiGraphics) => {
    g.clear();
    if (disabled) return;
    for (const poly of fog.visiblePolygons) {
      if (poly.length < 3) continue;
      const tp = poly.map(([x, y]) => applyTransform({ x, y }, grid));
      g.poly(tp.map((p) => ({ x: p.x, y: p.y })) as unknown as number[]);
      g.fill({ color: 0xffffff, alpha: 1 });
    }
  }, [disabled, fog.visiblePolygons, grid]);

  if (disabled) return null;

  // The explored + visible erasers must composite against the base only. Wrap in an
  // isolated container with cacheAsTexture so the erase blend does not punch through
  // to layers below the fog. (Pixi v8: blendMode="erase" on children of a cached
  // container erases within that container's own texture.)
  return (
    <pixiContainer label="fog-layer" isRenderGroup cacheAsTexture={true}>
      <pixiGraphics draw={drawBase} />
      <pixiGraphics draw={drawExplored} blendMode="erase" />
      <pixiGraphics draw={drawVisible} blendMode="erase" />
    </pixiContainer>
  );
}
```
> **Pixi-API risk (validate visually):** the exact prop for polygon input (`g.poly`) and the
> isolation needed for `blendMode="erase"` to erase only within the fog container can vary by
> pixi.js v8 minor. The pure geometry is correct and tested (Task 2); this drawing is the
> visual-only part. If erase punches through to lower layers, the fallback is the **even-odd
> hole** technique: draw the dark rect and then each visible/explored polygon as sub-paths in
> a single `Graphics`, filling once with the even-odd rule so polygons become holes. Confirm
> the chosen approach in the browser (Task 8). `g.poly` expects a flat number array
> `[x0,y0,x1,y1,...]`; adapt the `.map(...)` accordingly to the real signature.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: passes. (No unit test here — Pixi render is validated visually in Task 8.)

- [ ] **Step 3: Commit**

```bash
git add src/components/organisms/FogLayer.tsx
git commit -m "feat(fog): add FogLayer (three-tier dark/explored/visible)"
```

---

## Task 4: useMatchWs — fog events + full grid sync

**Files:**
- Modify: `src/hooks/useMatchWs.ts`
- Test: `src/hooks/__tests__/useMatchWs.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/__tests__/useMatchWs.test.ts` exercising the message parsing through the
callbacks. Use a fake WebSocket. Minimal example asserting `onMapFullState` fires with parsed
camelCase walls and fog data:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMatchWs } from "../useMatchWs";

class FakeWS {
  static instances: FakeWS[] = [];
  onopen?: () => void; onmessage?: (e: MessageEvent) => void; onclose?: (e: CloseEvent) => void; onerror?: () => void;
  readyState = 1; url: string;
  constructor(url: string) { this.url = url; FakeWS.instances.push(this); }
  send = vi.fn();
  close = vi.fn();
  emit(type: string, payload: unknown) { this.onmessage?.({ data: JSON.stringify({ type, payload }) } as MessageEvent); }
}

beforeEach(() => {
  FakeWS.instances = [];
  vi.stubGlobal("WebSocket", FakeWS as unknown as typeof WebSocket);
  vi.stubEnv("VITE_WS_URL", "ws://test");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("useMatchWs fog events", () => {
  it("parses map_full_state into camelCase fog state", () => {
    const onMapFullState = vi.fn();
    renderHook(() => useMatchWs({ matchUuid: "m1", token: "t", isMaster: false, onMapFullState }));
    const ws = FakeWS.instances[0];
    ws.onopen?.();
    ws.emit("map_full_state", {
      pieces: [],
      walls: [{ id: "w1", wall_type: "wall", max_hp: 100 }],
      visible_polygons: [[{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]],
      explored_cells: [[0, 0], [1, 0]],
      fog_mode: "explored",
    });
    expect(onMapFullState).toHaveBeenCalledTimes(1);
    const arg = onMapFullState.mock.calls[0][0];
    expect(arg.fogMode).toBe("explored");
    expect(arg.walls[0].wallType).toBe("wall");
    expect(arg.visiblePolygons[0]).toEqual([[0, 0], [10, 0], [10, 10]]);
    expect(arg.exploredCells).toEqual([[0, 0], [1, 0]]);
  });

  it("parses visibility_updated", () => {
    const onVisibilityUpdated = vi.fn();
    renderHook(() => useMatchWs({ matchUuid: "m1", token: "t", isMaster: false, onVisibilityUpdated }));
    const ws = FakeWS.instances[0];
    ws.onopen?.();
    ws.emit("visibility_updated", {
      visible_polygons: [[{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }]],
      explored_delta: [[5, 5]],
    });
    expect(onVisibilityUpdated).toHaveBeenCalledWith(
      [[[1, 1], [2, 1], [2, 2]]],
      [[5, 5]],
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/hooks/__tests__/useMatchWs.test.ts`
Expected: FAIL — new options/handlers absent.

- [ ] **Step 3: Write the implementation**

Add to `UseMatchWsOptions`:
```ts
  /** Extended map_full_state (filtered per-player). */
  onMapFullState?: (state: {
    pieces: unknown[];
    walls: WallSegment[];
    visiblePolygons: Array<Array<[number, number]>>;
    exploredCells: Array<[number, number]>;
    fogMode: "live" | "explored";
  }) => void;
  /** Incremental visibility update (own move / wall change). */
  onVisibilityUpdated?: (
    visiblePolygons: Array<Array<[number, number]>>,
    exploredDelta: Array<[number, number]>,
  ) => void;
  /** A secret door was revealed by the master — replace the masked wall. */
  onWallRevealed?: (wall: WallSegment) => void;
```
Add refs for each (mirror the existing `onWallStateChangedRef` pattern) and assign on each render.

Add a small polygon parser near the top of the file:
```ts
import { objToCamelCase } from "../utils/caseConverter";

function parsePolys(raw: Array<Array<{ x: number; y: number }>>): Array<Array<[number, number]>> {
  return (raw ?? []).map((poly) => poly.map((p) => [p.x, p.y] as [number, number]));
}
```

Extend the `ws.onmessage` switch:
```ts
} else if (msg.type === "map_full_state") {
  const p = msg.payload as {
    pieces?: unknown[]; walls?: unknown[];
    visible_polygons?: Array<Array<{ x: number; y: number }>>;
    explored_cells?: Array<[number, number]>; fog_mode?: string;
  };
  onMapFullStateRef.current?.({
    pieces: p.pieces ?? [],
    walls: (p.walls ?? []).map((w) => objToCamelCase(w as Record<string, unknown>) as unknown as WallSegment),
    visiblePolygons: parsePolys(p.visible_polygons ?? []),
    exploredCells: p.explored_cells ?? [],
    fogMode: (p.fog_mode === "explored" ? "explored" : "live"),
  });
} else if (msg.type === "visibility_updated") {
  const p = msg.payload as {
    visible_polygons?: Array<Array<{ x: number; y: number }>>;
    explored_delta?: Array<[number, number]>;
  };
  onVisibilityUpdatedRef.current?.(parsePolys(p.visible_polygons ?? []), p.explored_delta ?? []);
} else if (msg.type === "wall_revealed") {
  const p = msg.payload as { wall: Record<string, unknown> };
  onWallRevealedRef.current?.(objToCamelCase(p.wall) as unknown as WallSegment);
}
```

Update `sendWallSync` to send the full grid (backend now expects a `GridShape`, Task 14 Step 3
of the backend plan). Add a `grid?: GridShape` option and send it:
```ts
// add to options: grid?: GridShape;  and a gridRef
sendRaw("map_state_sync", {
  pieces: [],
  walls: ws.map((w) => objToSnakeCase(w)),
  grid: gridRef.current ? objToSnakeCase(gridRef.current) : { cell_size: cs },
});
```
> Keep `cellSize` for backward-compat fallback. Prefer `grid` when provided. The backend
> reads `payload.grid` as a full `GridShape` and falls back to `cell_size`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/hooks/__tests__/useMatchWs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMatchWs.ts src/hooks/__tests__/useMatchWs.test.ts
git commit -m "feat(fog): handle map_full_state, visibility_updated, wall_revealed in useMatchWs"
```

---

## Task 5: Thread fog through TacticalMapStage + mount FogLayer

**Files:**
- Modify: `src/components/organisms/TacticalMapStage.tsx`

- [ ] **Step 1: Add props**

In the `Props` type (after `onWallClick?`):
```ts
  fog?: FogState;
  fogDisabled?: boolean; // true for master / editor
  worldWidth?: number;
  worldHeight?: number;
```
Import `FogState` from `../../types/tacticalMap`. Destructure in both `TacticalMapStage` and
`ViewportInner` signatures with defaults: `fog`, `fogDisabled = true`, `worldWidth`, `worldHeight`.
Pass them from `TacticalMapStage` down to `<ViewportInner ... />` (mirror the existing prop
pass-through block).

- [ ] **Step 2: Mount FogLayer after WallsLayer**

Import at top: `import FogLayer from "./FogLayer";`
In `ViewportInner`'s JSX, immediately AFTER the `<WallsLayer ... />` element (line ~597) and
BEFORE the `<pixiContainer label="overlay-layer">`:
```tsx
{fog && !fogDisabled && (
  <FogLayer
    fog={fog}
    grid={map.grid}
    worldWidth={worldWidth ?? map.grid.cols * map.grid.cellSize}
    worldHeight={worldHeight ?? map.grid.rows * map.grid.cellSize}
    disabled={fogDisabled}
  />
)}
```

- [ ] **Step 3: Type-check + existing tests**

Run: `npx tsc --noEmit && npm run test -- src/components/organisms`
Expected: passes (additive, gated by `fog && !fogDisabled` so existing editor/lobby usage is
unaffected).

- [ ] **Step 4: Commit**

```bash
git add src/components/organisms/TacticalMapStage.tsx
git commit -m "feat(fog): thread fog state through Stage and mount FogLayer above walls"
```

---

## Task 6: Thread fog through TacticalMapViewer

**Files:**
- Modify: `src/features/tactical-map/TacticalMapViewer.tsx`

- [ ] **Step 1: Add props and pass-through**

```tsx
import TacticalMapStage from "../../components/organisms/TacticalMapStage";
import type { TacticalMap, WallSegment, FogState } from "../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../types/characterSheet";

type Props = {
  map: TacticalMap;
  width: number;
  height: number;
  npcMap?: Map<string, CharacterPrivateSummary>;
  onWallClick?: (wall: WallSegment) => void;
  fog?: FogState;
  isMaster?: boolean;
};

export default function TacticalMapViewer({ map, width, height, npcMap, onWallClick, fog, isMaster }: Props) {
  return (
    <TacticalMapStage
      map={map}
      width={width}
      height={height}
      npcMap={npcMap}
      walls={map.walls}
      onWallClick={onWallClick}
      fog={fog}
      fogDisabled={!!isMaster || !fog}
    />
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/features/tactical-map/TacticalMapViewer.tsx
git commit -m "feat(fog): thread fog + isMaster through TacticalMapViewer"
```

---

## Task 7: GamePage — live fog state, walls, and pieces from WS

**Files:**
- Modify: `src/pages/GamePage.tsx`

- [ ] **Step 1: Add fog + live-pieces state and handlers**

Add imports: `import type { FogState, Piece } from "../types/tacticalMap";`

Add state (next to `liveWalls`):
```tsx
const [livePieces, setLivePieces] = useState<Piece[] | null>(null);
const [fog, setFog] = useState<FogState>({ fogMode: "explored", visiblePolygons: [], exploredCells: new Set() });
```

Seed from REST when the map loads (alongside the existing `setLiveWalls`):
```tsx
useEffect(() => {
  if (map) {
    setLiveWalls(map.walls ?? []);
    setLivePieces(map.pieces ?? null);
    setFog((f) => ({ ...f, fogMode: map.fogMode ?? "explored" }));
  }
}, [map]);
```

Add WS handlers:
```tsx
const handleMapFullState = useCallback((s: {
  pieces: unknown[]; walls: WallSegment[];
  visiblePolygons: Array<Array<[number, number]>>;
  exploredCells: Array<[number, number]>; fogMode: "live" | "explored";
}) => {
  setLiveWalls(s.walls);
  setLivePieces(s.pieces as Piece[]);
  setFog({
    fogMode: s.fogMode,
    visiblePolygons: s.visiblePolygons,
    exploredCells: new Set(s.exploredCells.map(([a, b]) => `${a},${b}`)),
  });
}, []);

const handleVisibilityUpdated = useCallback((
  polys: Array<Array<[number, number]>>,
  delta: Array<[number, number]>,
) => {
  setFog((f) => {
    const next = new Set(f.exploredCells);
    for (const [a, b] of delta) next.add(`${a},${b}`);
    return { ...f, visiblePolygons: polys, exploredCells: next };
  });
}, []);

const handleWallRevealed = useCallback((wall: WallSegment) => {
  setLiveWalls((prev) => prev.map((w) => (w.id === wall.id ? wall : w)));
}, []);
```

Wire them into `useMatchWs` and pass the grid for sync:
```tsx
const { sendMasterAction, sendAction } = useMatchWs({
  matchUuid: matchId,
  token,
  isMaster,
  onWallStateChanged: handleWallStateChanged,
  onWallHpChanged: handleWallHpChanged,
  onMapFullState: handleMapFullState,
  onVisibilityUpdated: handleVisibilityUpdated,
  onWallRevealed: handleWallRevealed,
  walls: liveWalls,
  grid: map?.grid,
  cellSize: map?.grid?.cellSize,
});
```

- [ ] **Step 2: Pass fog + live pieces to the viewer**

Update the `<TacticalMapViewer>` render:
```tsx
<TacticalMapViewer
  map={{ ...map, walls: liveWalls, pieces: livePieces ?? map.pieces }}
  width={width}
  height={height}
  npcMap={npcMap}
  onWallClick={handleWallClick}
  fog={fog}
  isMaster={isMaster}
/>
```

- [ ] **Step 3: Type-check + existing GamePage/related tests**

Run: `npx tsc --noEmit && npm run test -- src/pages`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/pages/GamePage.tsx
git commit -m "feat(fog): consume fog state, filtered walls, and pieces in GamePage"
```

---

## Task 8: Verification

- [ ] **Step 1: Full check**

Run: `npx tsc --noEmit && npm run lint && npm run test`
Expected: all pass.

- [ ] **Step 2: Visual smoke (two sessions)**

Per CLAUDE.md delivery rule, with backend running and on `feat/tactical-map-walls-10d`:
- Open the app at `http://localhost:5173`. As master, attach a map with walls forming a room
  with a door and a secret door; start the match.
- In a second browser (a player with a piece in the room), confirm:
  - the room is lit, the area behind a `sense=full` wall is dark;
  - moving the player's piece reveals new area; previously seen area stays gray (explored);
  - opening the door reveals the adjacent space; destroying a wall opens vision through it;
  - the secret door renders as a plain wall to the player; attacking it shows HP damage;
  - the master sees the whole map with no fog and the secret door as a secret door.

- [ ] **Step 3: Final commit (if cleanup remains)**

```bash
git add -A
git commit -m "chore(fog): frontend 10-D cleanup and verification"
```

---

## Self-review notes (folded into tasks)

- **Spec coverage:** types (T1), pure geometry (T2), FogLayer 3-tier render (T3), WS contract
  consumption + full-grid sync (T4), Stage mount (T5), Viewer threading (T6), GamePage live
  state (T7), verification (T8).
- **Coords consistency:** polygons and cell corners are in LOCAL (pre-transform) coords; every
  draw applies `applyTransform` exactly like `WallsLayer` (verified against `WallsLayer.tsx`).
- **snake↔camel:** WS walls/pieces/wall parsed via `objToCamelCase`; `map_state_sync` grid sent
  via `objToSnakeCase` (project invariant).
- **Master path:** `fogDisabled = isMaster || !fog`; `FogLayer` returns null when disabled — the
  master never renders fog and gets unfiltered state from the backend.
- **Non-placeholder risk flagged:** the only visual-only uncertainty is the Pixi erase-blend vs
  even-odd-hole technique in `FogLayer` (Task 3) — geometry is tested; the composite is
  validated in the browser (Task 8) with a concrete fallback documented.
- **Out of scope (per spec §10):** master fog-config UI, vision radius, per-player examine
  reveal — not consumed here.
```
