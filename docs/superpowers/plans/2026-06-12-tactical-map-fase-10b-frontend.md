# Tactical Map Fase 10-B — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make doors interactive in the viewer — clicking a door sends an intent via WS; the master can open/close doors via MasterAction; `WallsLayer` renders open doors with a visible gap and locked doors with a marker; movement respects wall blocking.

**Architecture:** `isMovementBlocked` is a pure function added to `walls.ts` (symmetric with backend's `IsPathBlocked`). `WallsLayer` gains an `onDoorClick` prop active only in viewer mode. A new `useMatchWs` hook manages the game-phase WS connection, handles `wall_state_changed` events, and provides `sendAction`/`sendMasterAction`. `GamePage` holds the live wall state (starting from the REST-fetched map, updated on WS events) and passes it down to `TacticalMapViewer`. `useLobbyWs.sendLobbySync` is extended to send walls and grid so the backend room can validate movement blocking.

**Tech Stack:** React 18, TypeScript strict, Pixi.js v8, Zustand + Zundo (editorStore), Vitest, `src/utils/caseConverter.ts`, `src/hooks/useLobbyWs.ts` pattern.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/features/tactical-map/utils/walls.ts` | **Modify** | Add `isMovementBlocked` + private `segmentsIntersect` helpers |
| `src/features/tactical-map/utils/__tests__/walls.test.ts` | **Modify** | Tests for `isMovementBlocked` |
| `src/components/organisms/WallsLayer.tsx` | **Modify** | Open-door gap visual; locked marker; `onDoorClick` prop for viewer mode |
| `src/features/tactical-map/TacticalMapViewer.tsx` | **Modify** | Add `onDoorClick` prop, wire to `WallsLayer` |
| `src/hooks/useMatchWs.ts` | **Create** | Game-phase WS hook — `wall_state_changed`, `sendAction`, `sendMasterAction` |
| `src/pages/GamePage.tsx` | **Modify** | Use `useMatchWs`; hold live wall state; pass to viewer |
| `src/hooks/useLobbyWs.ts` | **Modify** | Extend `sendLobbySync` to include walls and grid |

---

### Task 1: `isMovementBlocked` — TDD

**Files:**
- Modify: `src/features/tactical-map/utils/walls.ts`
- Modify: `src/features/tactical-map/utils/__tests__/walls.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/features/tactical-map/utils/__tests__/walls.test.ts`:

```ts
import { isMovementBlocked } from "../walls";
import type { WallSegment } from "../../../../types/tacticalMap";

function seg(p1: [number, number], p2: [number, number], overrides: Partial<WallSegment> = {}): WallSegment {
  return {
    id: "w", p1, p2,
    wallType: "wall", material: "stone",
    move: true, open: false, locked: false,
    sense: "full", direction: "both",
    hp: 100, maxHp: 100, resistance: 5, destroyed: false,
    ...overrides,
  };
}

describe("isMovementBlocked", () => {
  it("returns false with no walls", () => {
    expect(isMovementBlocked([0, 0], [100, 0], [])).toBe(false);
  });

  it("returns true when path crosses a blocking wall", () => {
    // vertical wall at x=50; path goes horizontally through it
    const w = seg([50, 0], [50, 100]);
    expect(isMovementBlocked([0, 50], [100, 50], [w])).toBe(true);
  });

  it("returns false for parallel wall", () => {
    const w = seg([0, 20], [100, 20]);
    expect(isMovementBlocked([0, 50], [100, 50], [w])).toBe(false);
  });

  it("returns false for open door", () => {
    const w = seg([50, 0], [50, 100], { wallType: "door", open: true });
    expect(isMovementBlocked([0, 50], [100, 50], [w])).toBe(false);
  });

  it("returns false for wall with move=false", () => {
    const w = seg([50, 0], [50, 100], { move: false });
    expect(isMovementBlocked([0, 50], [100, 50], [w])).toBe(false);
  });

  it("direction=left does not block from the right side", () => {
    // wall vector p1→p2: (50,0)→(50,100) points downward.
    // from=(100,50) is to the RIGHT → NOT blocked by direction=left wall.
    const w = seg([50, 0], [50, 100], { direction: "left" });
    expect(isMovementBlocked([100, 50], [0, 50], [w])).toBe(false);
  });

  it("direction=left blocks from the left side", () => {
    // from=(0,50) is to the LEFT → blocked
    const w = seg([50, 0], [50, 100], { direction: "left" });
    expect(isMovementBlocked([0, 50], [100, 50], [w])).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
cd /home/azzurah/Documentos/HxH_RPG_Environment_Project/System_X_System_Project/System_X_System_React
npx vitest run src/features/tactical-map/utils/__tests__/walls.test.ts
```

Expected: test failures — `isMovementBlocked is not a function`.

- [ ] **Step 3: Implement `isMovementBlocked`**

Append to the end of `src/features/tactical-map/utils/walls.ts`:

```ts
// ─── Movement blocking ────────────────────────────────────────────────────────

/**
 * Returns true if the straight path from→to (world coords) is blocked by any wall
 * with move=true and open=false. Respects WallDirection: "left" blocks only movement
 * coming from the left side of the wall vector p1→p2; "right" from the right; "both" always.
 */
export function isMovementBlocked(
  from: [number, number],
  to: [number, number],
  walls: WallSegment[],
): boolean {
  for (const w of walls) {
    if (!w.move || w.open) continue;
    if (!_segmentsIntersect(from, to, w.p1, w.p2)) continue;
    if (w.direction === "both") return true;
    // Cross product of wall vector (p2-p1) with (from-p1).
    // Positive → from is to the LEFT of the wall direction.
    const wx = w.p2[0] - w.p1[0];
    const wy = w.p2[1] - w.p1[1];
    const fx = from[0] - w.p1[0];
    const fy = from[1] - w.p1[1];
    const cross = wx * fy - wy * fx;
    if (w.direction === "left" && cross > 0) return true;
    if (w.direction === "right" && cross < 0) return true;
  }
  return false;
}

function _segmentsIntersect(
  a: [number, number], b: [number, number],
  c: [number, number], d: [number, number],
): boolean {
  const d1 = _cross(c, d, a);
  const d2 = _cross(c, d, b);
  const d3 = _cross(a, b, c);
  const d4 = _cross(a, b, d);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  const EPS = 1e-9;
  if (Math.abs(d1) < EPS && _onSeg(c, d, a)) return true;
  if (Math.abs(d2) < EPS && _onSeg(c, d, b)) return true;
  if (Math.abs(d3) < EPS && _onSeg(a, b, c)) return true;
  if (Math.abs(d4) < EPS && _onSeg(a, b, d)) return true;
  return false;
}

function _cross(a: [number, number], b: [number, number], p: [number, number]): number {
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
}

function _onSeg(a: [number, number], b: [number, number], p: [number, number]): boolean {
  const EPS = 1e-9;
  return p[0] >= Math.min(a[0], b[0]) - EPS && p[0] <= Math.max(a[0], b[0]) + EPS &&
         p[1] >= Math.min(a[1], b[1]) - EPS && p[1] <= Math.max(a[1], b[1]) + EPS;
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/features/tactical-map/utils/__tests__/walls.test.ts
```

Expected: all 7 new tests PASS + all existing walls tests PASS.

- [ ] **Step 5: Build check**

```bash
npm run build 2>&1 | tail -5
```

Expected: success (no TS errors).

- [ ] **Step 6: Commit**

```bash
git add src/features/tactical-map/utils/walls.ts \
        src/features/tactical-map/utils/__tests__/walls.test.ts
git commit -m "feat(walls): add isMovementBlocked with direction-aware segment intersection"
```

---

### Task 2: Update `WallsLayer` — open-door visual, locked marker, viewer door click

**Files:**
- Modify: `src/components/organisms/WallsLayer.tsx`

- [ ] **Step 1: Add `onDoorClick` to Props type**

In the `Props` type, add after `onGestureEnd`:

```tsx
onDoorClick?: (wallId: string) => void;
```

- [ ] **Step 2: Destructure the new prop**

In the function signature, add `onDoorClick` after `onExitDrawMode`:

```tsx
export default function WallsLayer({
  walls, grid, vpRef, vpScale, canvasEl,
  wallsInteractive, selectedWallId,
  activeWallType, activeMaterial,
  onWallSelect, onDrawComplete, onGestureStart, onGestureEnd,
  drawingEnabled, onExitDrawMode,
  onDoorClick,
}: Props) {
```

- [ ] **Step 3: Add viewer-mode door click handler**

Add a ref for `onDoorClick` alongside the other refs at the top of the component:

```tsx
const onDoorClickRef = useRef(onDoorClick);
onDoorClickRef.current = onDoorClick;
```

In the `useEffect` that handles pointer events (the one with `canvasEl` in the deps), add a viewer-mode click handler. Find the block:

```tsx
if (!wallsInteractive) return;
```

The `pointerdown` handler at line ~130 starts with this guard. Add a new, separate listener for the viewer-mode door click **before** the existing guard:

```tsx
// Viewer-mode door click: fires even when not in wall-editing mode.
const handleViewerClick = (e: PointerEvent) => {
  if (wallsInteractiveRef.current) return; // editor handles its own selection
  if (!onDoorClickRef.current) return;
  const vp = vpRef.current;
  if (!vp) return;
  const rect = (e.target as HTMLElement).getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;
  const rawPt = inverseTransform(vp.toWorld({ x: screenX, y: screenY }), gridRef.current);
  const hit = findNearestWall(rawPt as [number, number], wallsRef.current, HIT / vpScaleRef.current);
  if (hit && (hit.wallType === "door" || hit.wallType === "window")) {
    onDoorClickRef.current(hit.id);
  }
};
canvasEl.addEventListener("pointerup", handleViewerClick);
```

Add `vpScaleRef` if not already present:

```tsx
const vpScaleRef = useRef(vpScale);
vpScaleRef.current = vpScale;
```

And add the cleanup:

```tsx
return () => {
  // ... existing cleanup ...
  canvasEl.removeEventListener("pointerup", handleViewerClick);
};
```

- [ ] **Step 4: Render open door with gap**

In the `drawMaterial` callback, replace the solid-line drawing for non-secret-door, non-terrain walls with open-door awareness:

```tsx
// current:
} else {
  g.setStrokeStyle({ color, width, alpha });
  g.moveTo(a1.x, a1.y); g.lineTo(a2.x, a2.y); g.stroke();
}

// replace with:
} else if (w.wallType === "door" && w.open) {
  // Open door: solid line with a 30% gap in the centre.
  drawOpenDoor(g, a1, a2, color, width, alpha);
} else {
  g.setStrokeStyle({ color, width, alpha });
  g.moveTo(a1.x, a1.y); g.lineTo(a2.x, a2.y); g.stroke();
}
```

Also add a locked marker after the `drawWallTypeSymbol` call:

```tsx
if (w.locked) {
  drawLockedMarker(g, a1, a2, vpScale);
}
```

- [ ] **Step 5: Add `drawOpenDoor` and `drawLockedMarker` helper functions**

Append after `drawWallTypeSymbol`:

```tsx
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
```

- [ ] **Step 6: Build check**

```bash
npm run build 2>&1 | tail -10
```

Expected: success. If TS complains about `vpScaleRef` not being in the `useEffect` deps array, add it. If the hook reports too many dependencies, use a ref pattern (same as the existing `wallsInteractiveRef` pattern).

- [ ] **Step 7: Commit**

```bash
git add src/components/organisms/WallsLayer.tsx
git commit -m "feat(walls-layer): open door gap, locked marker, viewer-mode door click"
```

---

### Task 3: Update `TacticalMapViewer` — wire `onDoorClick`

**Files:**
- Modify: `src/features/tactical-map/TacticalMapViewer.tsx`

- [ ] **Step 1: Add `onDoorClick` to Props and wire to stage**

Replace the current file contents:

```tsx
import TacticalMapStage from "../../components/organisms/TacticalMapStage";
import type { TacticalMap } from "../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../types/characterSheet";

type Props = {
  map: TacticalMap;
  width: number;
  height: number;
  npcMap?: Map<string, CharacterPrivateSummary>;
  onDoorClick?: (wallId: string) => void;
};

export default function TacticalMapViewer({ map, width, height, npcMap, onDoorClick }: Props) {
  return (
    <TacticalMapStage
      map={map}
      width={width}
      height={height}
      npcMap={npcMap}
      onDoorClick={onDoorClick}
    />
  );
}
```

- [ ] **Step 2: Pass `onDoorClick` through `TacticalMapStage`**

Find `src/components/organisms/TacticalMapStage.tsx`. Add `onDoorClick?: (wallId: string) => void` to its Props and pass it down to `WallsLayer`.

Read the file first to see the exact prop threading needed, then add the prop at the component signature and pass it to `<WallsLayer onDoorClick={onDoorClick} ... />`.

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | tail -10
```

Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/features/tactical-map/TacticalMapViewer.tsx \
        src/components/organisms/TacticalMapStage.tsx
git commit -m "feat(viewer): add onDoorClick prop, thread through to WallsLayer"
```

---

### Task 4: Create `useMatchWs` hook

**Files:**
- Create: `src/hooks/useMatchWs.ts`

This hook follows the same pattern as `useLobbyWs.ts`: manage a WebSocket connection, handle incoming messages, expose send helpers.

- [ ] **Step 1: Create the file**

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { WallSegment } from "../types/tacticalMap";
import { objToSnakeCase } from "../utils/caseConverter";

export type MatchWsStatus = "connecting" | "connected" | "disconnected";

type WallStateChangedPayload = {
  wall_id: string;
  open: boolean;
  locked: boolean;
};

type UseMatchWsOptions = {
  matchUuid: string | undefined;
  token: string;
  isMaster: boolean;
  /** Called when the server broadcasts a wall open/locked change. */
  onWallStateChanged?: (wallId: string, open: boolean, locked: boolean) => void;
  /** Full walls list to seed the room on connect (master only). */
  walls?: WallSegment[];
  /** Grid cell size for movement blocking on the server side. */
  cellSize?: number;
};

export function useMatchWs({
  matchUuid,
  token,
  isMaster,
  onWallStateChanged,
  walls,
  cellSize,
}: UseMatchWsOptions) {
  const [status, setStatus] = useState<MatchWsStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const onWallStateChangedRef = useRef(onWallStateChanged);
  onWallStateChangedRef.current = onWallStateChanged;
  const wallsRef = useRef(walls);
  wallsRef.current = walls;
  const cellSizeRef = useRef(cellSize);
  cellSizeRef.current = cellSize;
  const isMasterRef = useRef(isMaster);
  isMasterRef.current = isMaster;

  const sendRaw = useCallback((type: string, payload: unknown = {}) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  }, []);

  // Seed the server's in-memory wall state on connect.
  const sendWallSync = useCallback(() => {
    if (!isMasterRef.current) return;
    const ws = wallsRef.current ?? [];
    const cs = cellSizeRef.current ?? 64;
    sendRaw("lobby_state_sync", {
      pieces: [], // pieces are managed by useLobbyWs; here we sync only walls
      walls: ws.map((w) => objToSnakeCase(w)),
      grid: { cell_size: cs },
    });
  }, [sendRaw]);

  useEffect(() => {
    if (!matchUuid) return;
    const wsUrl = `${import.meta.env.VITE_WS_URL}/ws?match_uuid=${matchUuid}&token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setStatus("connecting");

    ws.onopen = () => {
      setStatus("connected");
      sendWallSync();
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as { type: string; payload: unknown };
        if (msg.type === "wall_state_changed") {
          const p = msg.payload as WallStateChangedPayload;
          onWallStateChangedRef.current?.(p.wall_id, p.open, p.locked);
        }
        // TODO: handle additional game-phase message types as they are added.
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => setStatus("disconnected");
    ws.onerror = () => setStatus("disconnected");

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [matchUuid, token, sendWallSync]);

  /** Send a player action (enqueue_action). */
  const sendAction = useCallback(
    (payload: {
      target_id?: string[];
      interact?: { kind: string };
      move?: { from: [number, number, number]; position: [number, number, number]; category: string };
    }) => {
      sendRaw("enqueue_action", payload);
    },
    [sendRaw],
  );

  /** Send a master action (enqueue_master_action). */
  const sendMasterAction = useCallback(
    (payload: {
      target_ids: string[];
      interact?: { kind: string };
    }) => {
      sendRaw("enqueue_master_action", payload);
    },
    [sendRaw],
  );

  return { status, sendAction, sendMasterAction };
}
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | tail -10
```

Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMatchWs.ts
git commit -m "feat(hooks): add useMatchWs for game-phase WS (wall_state_changed, sendAction, sendMasterAction)"
```

---

### Task 5: Wire `useMatchWs` into `GamePage`

**Files:**
- Modify: `src/pages/GamePage.tsx`

- [ ] **Step 1: Add live wall state and `useMatchWs`**

Read `src/pages/GamePage.tsx` fully first to understand the current import list and inner component structure. Then apply these changes to `GamePageInner`:

Add imports:

```tsx
import { useState, useCallback } from "react";
import { useMatchWs } from "../hooks/useMatchWs";
import { useUser } from "../hooks/useUser";
import type { WallSegment } from "../types/tacticalMap";
```

Inside `GamePageInner`, add:

```tsx
const { user } = useUser();

// Live wall state: starts from REST-fetched map, updated on WS events.
const [liveWalls, setLiveWalls] = useState<WallSegment[]>([]);

// Sync liveWalls when the REST map loads or changes.
// useEffect so it only triggers when map is first available.
useEffect(() => {
  if (map) setLiveWalls(map.walls);
}, [map]);

// Determine if current user is the master.
const isMaster = participants.some((p) => p.isMaster && p.uuid === user?.uuid);

const handleWallStateChanged = useCallback((wallId: string, open: boolean, locked: boolean) => {
  setLiveWalls((prev) =>
    prev.map((w) => (w.id === wallId ? { ...w, open, locked } : w)),
  );
}, []);

const { sendMasterAction, sendAction } = useMatchWs({
  matchUuid: matchId,
  token,
  isMaster,
  onWallStateChanged: handleWallStateChanged,
  walls: liveWalls,
  cellSize: map?.grid.cellSize,
});

const handleDoorClick = useCallback(
  (wallId: string) => {
    const wall = liveWalls.find((w) => w.id === wallId);
    if (!wall) return;
    if (isMaster) {
      sendMasterAction({ target_ids: [wallId], interact: { kind: "toggle" } });
    } else {
      const intent = wall.open ? "close" : "open";
      sendAction({ target_id: [wallId], interact: { kind: intent } });
    }
  },
  [liveWalls, isMaster, sendMasterAction, sendAction],
);
```

- [ ] **Step 2: Pass `liveWalls` and `onDoorClick` to viewer**

Find the `<TacticalMapViewer>` JSX call in `GamePageInner`. Pass the live wall state and door click handler:

```tsx
<TacticalMapViewer
  map={{ ...map, walls: liveWalls }}
  width={width}
  height={height}
  npcMap={npcMap}
  onDoorClick={handleDoorClick}
/>
```

Note: `map` here is the REST-fetched map. We spread and override `walls` with the live version. TypeScript will require the spread to produce a valid `TacticalMap` — this is correct since `TacticalMap.walls` is `WallSegment[]`.

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | tail -15
```

Fix any TS errors (likely import order or missing `useEffect` import). Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/pages/GamePage.tsx
git commit -m "feat(game-page): wire useMatchWs, live wall state, door click handler"
```

---

### Task 6: Extend `sendLobbySync` to include walls and grid

**Files:**
- Modify: `src/hooks/useLobbyWs.ts`

The lobby master seeds the room's in-memory state on connect. Extending this to include walls ensures the server can validate movement blocking from the start of the match.

- [ ] **Step 1: Update `sendLobbySync` signature and payload**

Find the `sendLobbySync` callback in `useLobbyWs.ts` (around line 325). It currently accepts `(pieces: Piece[])`. Change it to also accept walls and grid:

```ts
import type { Piece, WallSegment, GridShape } from "../types/tacticalMap";
import { objToSnakeCase } from "../utils/caseConverter";
```

Replace the `sendLobbySync` callback:

```ts
const sendLobbySync = useCallback(
  (pieces: Piece[], walls: WallSegment[] = [], grid?: GridShape) => {
    sendMessage("lobby_state_sync", {
      pieces: pieces.map((p) => {
        const slotPayload =
          p.coord.slot.kind === "square"
            ? { kind: "square", col: p.coord.slot.col, row: p.coord.slot.row }
            : { kind: "hex", q: p.coord.slot.q, r: p.coord.slot.r };
        return {
          piece_id: p.id,
          slot: slotPayload,
          character_id: p.characterId,
          visible: p.visible,
        };
      }),
      walls: walls.map((w) => objToSnakeCase(w)),
      ...(grid ? { grid: { cell_size: grid.cellSize } } : {}),
    });
  },
  [sendMessage],
);
```

- [ ] **Step 2: Update the return type in the hook's return object**

The hook returns `sendLobbySync` in the return statement — its type is inferred, so no explicit change needed. But check if there's a TypeScript interface/type for the return value. If so, update it:

```ts
sendLobbySync: (pieces: Piece[], walls?: WallSegment[], grid?: GridShape) => void;
```

- [ ] **Step 3: Update call sites of `sendLobbySync`**

Search for all usages of `sendLobbySync` in the codebase:

```bash
grep -rn "sendLobbySync" src/
```

For each call site (likely in `LobbyPage.tsx`), pass the map's walls and grid as additional args. Example:

```tsx
// Before:
sendLobbySync(map.pieces);

// After:
sendLobbySync(map.pieces, map.walls, map.grid);
```

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | tail -10
```

Expected: success.

- [ ] **Step 5: Run tests**

```bash
npx vitest run
```

Expected: all pass (no regressions in `useLobbyWs.test.ts`).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useLobbyWs.ts
git commit -m "feat(lobby-ws): extend sendLobbySync to include walls and grid for server movement validation"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| `isMovementBlocked(from, to, walls)` in `walls.ts` | Task 1 |
| `WallsLayer`: render porta aberta (gap) vs fechada | Task 2 |
| `WallsLayer`: lock icon quando `locked=true` | Task 2 |
| `TacticalMapViewer`: clique em porta → intent WS | Tasks 3 + 5 |
| `useMatchMapWs.ts` (aqui: `useMatchWs.ts`): processar `wall_state_changed` | Task 4 |
| `GamePage`: live wall state + onDoorClick | Task 5 |
| `sendLobbySync` com walls (seed para movement blocking no backend) | Task 6 |

**Type consistency:**
- `isMovementBlocked` accepts `WallSegment[]` — same type used throughout the codebase ✅
- `onDoorClick?: (wallId: string) => void` threads: `WallsLayer` → `TacticalMapStage` → `TacticalMapViewer` → `GamePage` ✅
- `useMatchWs` sends `objToSnakeCase(w)` for walls — matches backend `WallSegment` JSON tags ✅
- `sendLobbySync` new params are optional (`walls = []`, `grid?`) — existing call sites without them still compile ✅

**Placeholder scan:** none. All steps contain actual code or clear instructions with the file to read first (Task 3 Step 2 references TacticalMapStage which must be read before editing).

**Note on Task 3 Step 2:** `TacticalMapStage.tsx` is not read in this plan. Before executing, read the file to understand its current Props and where WallsLayer is rendered, then thread `onDoorClick` through it. The threading pattern is straightforward — one new optional prop added to both Props type and JSX.
