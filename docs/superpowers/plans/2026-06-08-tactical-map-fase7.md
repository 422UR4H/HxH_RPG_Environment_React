# Tactical Map — Fase 7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement canvas handles (resize + rotate) for bg image and grid, fix bg drag/rotation pivot regressions, apply Roboto font, increase sidebar width, add isometric skew controls.

**Architecture:** All handles are pure Pixi objects in `MapHandlesLayer.tsx` rendered in the overlay-layer (Approach A — FoundryVTT pattern). Bg drag migrates to window DOM events in `ViewportInner` with `vp.toWorld()` world-coord conversion. `GridLayer` gains a wrapping `pixiContainer` with `pivot`/`rotation`/`scale` transforms. `BgLayer` gains `anchor=0.5` for center rotation.

**Tech Stack:** PixiJS v8, @pixi/react, pixi-viewport, React hooks, styled-components, Vitest.

**Working branch:** `feat/tactical-map-fase-7` (create from `main`)

---

### Task 1: Create branch feat/tactical-map-fase-7

**Files:** (branch only)

- [ ] **Step 1: Create and switch to feature branch from main**

```bash
git checkout main
git checkout -b feat/tactical-map-fase-7
```

Expected: `Switched to a new branch 'feat/tactical-map-fase-7'`

- [ ] **Step 2: Verify clean working tree**

```bash
git status
```

Expected: `nothing to commit, working tree clean`

---

### Task 2: fitGridToImage utility (TDD)

**Files:**
- Modify: `src/features/tactical-map/utils/__tests__/bgFit.test.ts`
- Modify: `src/features/tactical-map/utils/bgFit.ts`

- [ ] **Step 1: Add failing tests for `fitGridToImage`**

Append to `src/features/tactical-map/utils/__tests__/bgFit.test.ts` (after the existing `deriveGridFromImage` describe block):

```ts
const hexGrid = (cols: number, rows: number, cellSize: number): GridShape => ({
  kind: "hex",
  cols,
  rows,
  cellSize,
  skewRatio: 1,
  rotation: 0,
  color: "#4a90a4",
  opacity: 0.6,
  lineStyle: "solid" as const,
});

describe("fitGridToImage", () => {
  it("square: computes cols/rows from naturalSize and cellSize (rounds nearest)", () => {
    // 1200÷60=20, 800÷60≈13.33→13
    const result = fitGridToImage(1200, 800, grid(10, 10, 60));
    expect(result.cols).toBe(20);
    expect(result.rows).toBe(13);
    expect(result.cellSize).toBe(60); // unchanged
  });

  it("square: clamps cols/rows to max 200", () => {
    const result = fitGridToImage(10000, 10000, grid(10, 10, 1));
    expect(result.cols).toBe(200);
    expect(result.rows).toBe(200);
  });

  it("square: clamps cols/rows to min 1", () => {
    const result = fitGridToImage(10, 10, grid(5, 5, 500));
    expect(result.cols).toBe(1);
    expect(result.rows).toBe(1);
  });

  it("square: preserves all other grid fields", () => {
    const g = grid(10, 10, 60);
    const result = fitGridToImage(1200, 800, g);
    expect(result.kind).toBe("square");
    expect(result.color).toBe(g.color);
    expect(result.opacity).toBe(g.opacity);
    expect(result.skewRatio).toBe(g.skewRatio);
    expect(result.rotation).toBe(g.rotation);
  });

  it("hex: computes cols/rows from hex geometry", () => {
    // hexW = 40*sqrt(3)≈69.28, hexH = 40*1.5=60
    const result = fitGridToImage(1000, 900, hexGrid(5, 5, 40));
    const hexW = 40 * Math.sqrt(3);
    const hexH = 40 * 1.5;
    expect(result.cols).toBe(Math.min(200, Math.max(1, Math.round(1000 / hexW))));
    expect(result.rows).toBe(Math.min(200, Math.max(1, Math.round(900 / hexH))));
  });
});
```

Also add `fitGridToImage` to the import line at the top of the test file:
```ts
import { computeCoverFit, deriveGridFromImage, fitGridToImage } from "../bgFit";
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npm run test -- bgFit
```

Expected: 5 failing tests (`fitGridToImage` is not exported).

- [ ] **Step 3: Implement `fitGridToImage` in bgFit.ts**

Append to `src/features/tactical-map/utils/bgFit.ts`:

```ts
export function fitGridToImage(
  naturalWidth: number,
  naturalHeight: number,
  grid: GridShape,
): GridShape {
  if (grid.kind === "square") {
    const cols = Math.max(1, Math.min(200, Math.round(naturalWidth / grid.cellSize)));
    const rows = Math.max(1, Math.min(200, Math.round(naturalHeight / grid.cellSize)));
    return { ...grid, cols, rows };
  }
  // hex (point-top): hexW = cellSize * sqrt(3), hexH = cellSize * 1.5
  const hexW = grid.cellSize * Math.sqrt(3);
  const hexH = grid.cellSize * 1.5;
  const cols = Math.max(1, Math.min(200, Math.round(naturalWidth / hexW)));
  const rows = Math.max(1, Math.min(200, Math.round(naturalHeight / hexH)));
  return { ...grid, cols, rows };
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
npm run test -- bgFit
```

Expected: all tests pass including the 5 new ones.

- [ ] **Step 5: Commit**

```bash
git add src/features/tactical-map/utils/bgFit.ts src/features/tactical-map/utils/__tests__/bgFit.test.ts
git commit -m "feat(tactical-map): add fitGridToImage — adjusts cols/rows from image dimensions, keeps cellSize"
```

---

### Task 3: Quick wins — font, sidebar width, tab order

**Files:**
- Modify: `src/components/templates/MapEditorTemplate.tsx`
- Modify: `src/components/organisms/MapEditorToolbar.tsx`

- [ ] **Step 1: Fix font-family and sidebar width in MapEditorTemplate.tsx**

Add `fonts` to the import (currently only `colors` is imported):

```tsx
import { colors, fonts } from "../../styles/tokens";
```

Change `PageBody`:

```tsx
const PageBody = styled.main`
  display: flex;
  min-height: 0;
  font-family: ${fonts.sans};
  color: ${colors.textPrimary};

  @media (max-width: 749px) {
    flex-direction: column;
  }
`;
```

Change `Sidebar` width from `280px` to `320px`:

```tsx
const Sidebar = styled.div`
  width: 320px;
  flex-shrink: 0;
  background-color: ${colors.surfaceSidebar};
  overflow-y: auto;

  @media (max-width: 749px) {
    width: 100%;
    order: 2;
    flex: 3;
    min-height: 0;
    overflow: hidden;
  }
`;
```

- [ ] **Step 2: Reorder tabs in MapEditorToolbar.tsx**

Change `TABS` (currently `"grid"` first, `"bg"` second) to `"bg"` first:

```ts
const TABS: TabDef[] = [
  { tool: "bg", label: "Fundo", enabled: true },
  { tool: "grid", label: "Grade", enabled: true },
  { tool: "pieces", label: "Peças", enabled: true },
  { tool: "walls", label: "Paredes", enabled: false },
  { tool: "decorations", label: "Decorações", enabled: false },
];
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/templates/MapEditorTemplate.tsx src/components/organisms/MapEditorToolbar.tsx
git commit -m "fix(map-editor): apply Roboto font, increase sidebar to 320px, move Fundo tab first"
```

---

### Task 4: Fix PiecesLayer eventMode

**Files:**
- Modify: `src/components/organisms/TacticalMapStage.tsx`

Root cause: commit `5fb05f3` set `eventMode="static"` unconditionally on the `PiecesLayer` container with a full-grid `hitArea`. This container sits above `BgLayer` in z-order, blocking all pointer events from reaching the bg sprite when `piecesInteractive=false`.

Fix: make `eventMode` and `hitArea` conditional on `piecesInteractive`. Also fix `PieceSprite` because children of a `"none"` container can still participate in hit-test if they are `"static"` themselves.

- [ ] **Step 1: Fix PiecesLayer container**

In the `PiecesLayer` function's JSX return (around line 833), change:

```tsx
<pixiContainer
  label="pieces-layer"
  eventMode={piecesInteractive ? "static" : "none"}
  hitArea={piecesInteractive ? gridHitArea : undefined}
  onPointerDown={(e: FederatedPointerEvent) => {
    if (e.target !== e.currentTarget) return;
    onStageDeselect?.();
    if (onEmptySlotClick && !localDrag.current) {
      const vp = vpRef.current;
      const canvas = app?.renderer ? app.canvas : null;
      if (vp && canvas) {
        const rect = canvas.getBoundingClientRect();
        const clientX = rect.left + e.global.x;
        const clientY = rect.top + e.global.y;
        const world = vp.toWorld(e.global.x, e.global.y);
        const slot = worldToSlot(world, map.grid);
        if (isSlotInBounds(slot, map.grid)) {
          emptySlotPendingRef.current = { slot, clientX, clientY, startClientX: clientX, startClientY: clientY };
        }
      }
    }
  }}
>
```

- [ ] **Step 2: Add `piecesInteractive` to PieceSpriteProps and fix PieceSprite**

Change `PieceSpriteProps`:

```tsx
type PieceSpriteProps = {
  piece: Piece;
  grid: GridShape;
  npc?: CharacterPrivateSummary;
  isSelected: boolean;
  piecesInteractive?: boolean;
  onPointerDown: (piece: Piece, e: FederatedPointerEvent) => void;
};
```

Update `PieceSprite` function signature:

```tsx
function PieceSprite({ piece, grid, npc, isSelected, piecesInteractive, onPointerDown }: PieceSpriteProps) {
```

Change the outer `pixiContainer` in PieceSprite's return (around line 1008):

```tsx
return (
  <pixiContainer
    label={`piece-${piece.id}`}
    x={center.x}
    y={center.y}
    eventMode={piecesInteractive ? "static" : "none"}
    cursor={piecesInteractive ? "pointer" : "default"}
    onPointerDown={(e: FederatedPointerEvent) => onPointerDown(piece, e)}
  >
```

- [ ] **Step 3: Pass piecesInteractive to each PieceSprite**

In `PiecesLayer`'s return, add `piecesInteractive` to each `PieceSprite`:

```tsx
{visiblePieces.map((p) => (
  <PieceSprite
    key={p.id}
    piece={p}
    grid={map.grid}
    npc={npcMap?.get(p.characterId)}
    isSelected={selection?.kind === "piece" && selection.id === p.id}
    piecesInteractive={piecesInteractive}
    onPointerDown={(_piece, e) => {
      if (!piecesInteractive || localDrag.current) return;
      if (draggablePieceIds !== undefined && !draggablePieceIds.has(p.id)) return;
      pieceDragActiveRef.current = true;
      localDrag.current = {
        pieceId: p.id,
        startScreen: { x: e.global.x, y: e.global.y },
        isDragging: false,
        currentSlot: null,
      };
      e.stopPropagation();
    }}
  />
))}
```

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/organisms/TacticalMapStage.tsx
git commit -m "fix(tactical-map): PiecesLayer eventMode conditional — bg drag now unblocked in Fundo tab"
```

---

### Task 5: Fix BgLayer drag — window events + world coords + pan outside image

**Files:**
- Modify: `src/components/organisms/TacticalMapStage.tsx`

Problem 1: The existing drag uses `e.global.x/y` (screen/stage space) but `bg.x/y` are in world space. Mismatches at zoom ≠ 1.

Problem 2: `onWindowDown` returns early when `bgInteractive=true`, blocking ALL pan in the Fundo tab.

Fix: migrate bg drag to window DOM events (like the existing pan) using `vp.toWorld()` to convert coordinates.

- [ ] **Step 1: Add BgDragState type and ref to ViewportInner**

After the `DragState` type declaration (around line 237), add:

```tsx
type BgDragState = {
  startWorldX: number;
  startWorldY: number;
  startBgX: number;
  startBgY: number;
} | null;
```

In `ViewportInner` function body, immediately after the existing `const dragState = useRef<DragState>(null);` line, add:

```tsx
const bgDragState = useRef<BgDragState>(null);
```

Then remove the `dragState` ref and the `DragState` type entirely (they were only used by BgLayer, which will no longer need them).

- [ ] **Step 2: Replace the viewport pan useEffect**

Replace the entire pan `useEffect` block (the one containing `onWindowDown`, `onWindowMove`, `onWindowUp` that has `bgInteractive` in its deps array) with:

```tsx
useEffect(() => {
  const onWindowDown = (e: PointerEvent) => {
    const canvas = app?.renderer ? app.canvas : null;
    if (!canvas || placingNpcId || e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    if (
      e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top  || e.clientY > rect.bottom
    ) return;
    const vp = vpRef.current;
    if (!vp) return;
    const snapX = e.clientX;
    const snapY = e.clientY;
    requestAnimationFrame(() => {
      if (pieceDragActiveRef.current) {
        pieceDragActiveRef.current = false;
        return;
      }
      // bgDragState is set synchronously by BgLayer's Pixi onPointerDown (which
      // fires before this window handler in the same tick), so if the bg sprite
      // was clicked it's already non-null here and we skip pan.
      if (bgInteractive && bgDragState.current) return;
      isPanningRef.current = true;
      panStartClientRef.current = { x: snapX, y: snapY };
      panStartVpRef.current = { x: vp.x, y: vp.y };
    });
  };

  const onWindowMove = (e: PointerEvent) => {
    if (bgDragState.current) {
      const canvas = app?.renderer ? app.canvas : null;
      const vp = vpRef.current;
      if (!canvas || !vp) return;
      const rect = canvas.getBoundingClientRect();
      const world = vp.toWorld(e.clientX - rect.left, e.clientY - rect.top);
      onBgPositionChange?.(
        bgDragState.current.startBgX + (world.x - bgDragState.current.startWorldX),
        bgDragState.current.startBgY + (world.y - bgDragState.current.startWorldY),
      );
      return;
    }
    if (!isPanningRef.current) return;
    const vp = vpRef.current;
    if (!vp) return;
    vp.x = panStartVpRef.current.x + (e.clientX - panStartClientRef.current.x);
    vp.y = panStartVpRef.current.y + (e.clientY - panStartClientRef.current.y);
  };

  const onWindowUp = () => {
    isPanningRef.current = false;
    bgDragState.current = null;
  };

  window.addEventListener("pointerdown", onWindowDown);
  window.addEventListener("pointermove", onWindowMove);
  window.addEventListener("pointerup", onWindowUp);
  window.addEventListener("pointercancel", onWindowUp);

  return () => {
    window.removeEventListener("pointerdown", onWindowDown);
    window.removeEventListener("pointermove", onWindowMove);
    window.removeEventListener("pointerup", onWindowUp);
    window.removeEventListener("pointercancel", onWindowUp);
    isPanningRef.current = false;
  };
}, [app, placingNpcId, bgInteractive, onBgPositionChange]);
```

- [ ] **Step 3: Rewrite BgLayer — new props, world-coord onPointerDown, anchor=0.5**

Replace the entire `BgLayer` function with:

```tsx
function BgLayer({
  bg,
  bgInteractive,
  vpRef,
  onBgPointerDown,
  onLoadingChange,
}: {
  bg: TacticalMap["bg"];
  bgInteractive?: boolean;
  vpRef?: MutableRefObject<Viewport | null>;
  onBgPointerDown?: (startWorldX: number, startWorldY: number, startBgX: number, startBgY: number) => void;
  onLoadingChange?: (loading: boolean) => void;
}) {
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    if (!bg?.url) {
      setTexture(null);
      onLoadingChange?.(false);
      return;
    }
    onLoadingChange?.(true);
    let cancelled = false;
    if (bg.url.startsWith("blob:")) {
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        setTexture(new Texture({ source: new ImageSource({ resource: img }) }));
        onLoadingChange?.(false);
      };
      img.onerror = () => {
        if (!cancelled) { setTexture(null); onLoadingChange?.(false); }
      };
      img.src = bg.url;
    } else {
      Assets.load(bg.url)
        .then((t: Texture) => {
          if (!cancelled) { setTexture(t); onLoadingChange?.(false); }
        })
        .catch(() => {
          if (!cancelled) { setTexture(null); onLoadingChange?.(false); }
        });
    }
    return () => { cancelled = true; };
  }, [bg?.url, onLoadingChange]);

  if (!bg || !texture) return null;

  const handlePointerDown = (e: FederatedPointerEvent) => {
    if (!bgInteractive || !vpRef?.current) return;
    e.stopPropagation();
    const world = vpRef.current.toWorld(e.global.x, e.global.y);
    onBgPointerDown?.(world.x, world.y, bg.x, bg.y);
  };

  return (
    <pixiSprite
      texture={texture}
      anchor={0.5}
      x={bg.x + bg.width / 2}
      y={bg.y + bg.height / 2}
      width={bg.width}
      height={bg.height}
      rotation={(bg.rotation * Math.PI) / 180}
      alpha={bg.opacity}
      eventMode={bgInteractive ? "static" : "none"}
      cursor={bgInteractive ? "grab" : "default"}
      onPointerDown={handlePointerDown}
    />
  );
}
```

Note: `bg.x/y` remains the top-left corner in the store. The `x + width/2` conversion is only in the render. `anchor={0.5}` makes rotation happen around the image center.

- [ ] **Step 4: Update BgLayer call site in ViewportInner**

Replace the `<BgLayer ...>` usage in ViewportInner's JSX:

```tsx
<BgLayer
  bg={map.bg}
  bgInteractive={bgInteractive}
  vpRef={vpRef}
  onBgPointerDown={(startWorldX, startWorldY, startBgX, startBgY) => {
    bgDragState.current = { startWorldX, startWorldY, startBgX, startBgY };
  }}
  onLoadingChange={onBgLoadingChange}
/>
```

- [ ] **Step 5: Build check**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/organisms/TacticalMapStage.tsx
git commit -m "fix(tactical-map): bg drag uses window events + vp.toWorld; pan works outside image; rotation from center"
```

---

### Task 6: Fix GridLayer — rotation from center + skewRatio via scale.y

**Files:**
- Modify: `src/components/organisms/TacticalMapStage.tsx`

- [ ] **Step 1: Wrap GridLayer graphics in a Container with transforms**

Replace the `GridLayer` function:

```tsx
function GridLayer({ grid, vpScale }: { grid: GridShape; vpScale: number }) {
  const gridCenterX = (grid.cols * grid.cellSize) / 2;
  const gridCenterY = (grid.rows * grid.cellSize) / 2;

  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      const colorHex = parseInt(grid.color.replace("#", ""), 16);
      g.setStrokeStyle({ width: 1 / vpScale, color: colorHex, alpha: grid.opacity });
      if (grid.kind === "square") {
        const { cols, rows, cellSize } = grid;
        for (let c = 0; c <= cols; c++) {
          g.moveTo(c * cellSize, 0).lineTo(c * cellSize, rows * cellSize);
        }
        for (let r = 0; r <= rows; r++) {
          g.moveTo(0, r * cellSize).lineTo(cols * cellSize, r * cellSize);
        }
      } else {
        const size = grid.cellSize;
        const hexW = size * Math.sqrt(3);
        const hexH = size * 1.5;
        for (let r = 0; r < grid.rows; r++) {
          for (let c = 0; c < grid.cols; c++) {
            const cx = c * hexW + (r % 2 === 1 ? hexW / 2 : 0);
            const cy = r * hexH;
            for (let i = 0; i < 6; i++) {
              const angle = ((60 * i - 30) * Math.PI) / 180;
              const x = cx + size * Math.cos(angle);
              const y = cy + size * Math.sin(angle);
              if (i === 0) g.moveTo(x, y);
              else g.lineTo(x, y);
            }
            g.closePath();
          }
        }
      }
      g.stroke();
    },
    [grid, vpScale],
  );

  return (
    <pixiContainer
      pivot={{ x: gridCenterX, y: gridCenterY }}
      position={{ x: gridCenterX, y: gridCenterY }}
      rotation={(grid.rotation * Math.PI) / 180}
      scale={{ x: 1, y: grid.skewRatio }}
    >
      <pixiGraphics draw={draw} />
    </pixiContainer>
  );
}
```

`skewRatio=1` (default) → `scale.y=1` → no visual change for existing maps. `pivot + position` both at grid center ensures rotation happens around the center of the grid area.

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/organisms/TacticalMapStage.tsx
git commit -m "fix(tactical-map): GridLayer rotates from center and applies skewRatio via Container scale.y"
```

---

### Task 7: GridConfigPanel — rotation + skewRatio (perspective) fields

**Files:**
- Modify: `src/components/molecules/GridConfigPanel.tsx`

- [ ] **Step 1: Extend IntField type to include rotation**

Change:

```tsx
type IntField = "cols" | "rows" | "cellSize" | "rotation";
```

- [ ] **Step 2: Add rotation and skewRatio fields after the existing opacity field**

After the closing `</Field>` of the opacity block, add:

```tsx
      <Field>
        <FieldLabel htmlFor="grid-rotation">
          Rotação ({grid.rotation}°)
        </FieldLabel>
        <NumInput
          id="grid-rotation"
          type="number"
          min={-180}
          max={180}
          step={1}
          value={inputValue("rotation")}
          onChange={handleInt("rotation", -180, 180)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="grid-skew">
          Perspectiva (
          {grid.skewRatio === 1
            ? "Top-down"
            : grid.skewRatio <= 0.5
              ? "Isométrico"
              : "Semi-isométrico"}
          )
        </FieldLabel>
        <OpacityRange
          id="grid-skew"
          type="range"
          min={0.3}
          max={1.0}
          step={0.05}
          value={grid.skewRatio}
          onChange={(e) => update({ skewRatio: parseFloat(e.target.value) })}
        />
        <SkewLabels>
          <span>Isométrico</span>
          <span>Top-down</span>
        </SkewLabels>
      </Field>
```

- [ ] **Step 3: Add SkewLabels styled component**

After the `OpacityRange` styled component at the bottom of the file:

```tsx
const SkewLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-family: ${fonts.sans};
  font-size: 11px;
  color: ${colors.textDisabled};
`;
```

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/molecules/GridConfigPanel.tsx
git commit -m "feat(map-editor): add rotation and perspective (skewRatio) fields to GridConfigPanel"
```

---

### Task 8: BgImagePanel — improved Encaixar + auto-fit on image add

**Files:**
- Modify: `src/components/molecules/BgImagePanel.tsx`

- [ ] **Step 1: Replace deriveGridFromImage with fitGridToImage in import**

Change the bgFit import line:

```tsx
import { computeCoverFit, fitGridToImage } from "../../features/tactical-map/utils/bgFit";
```

(`deriveGridFromImage` is removed from this file — it still exists in bgFit.ts but is no longer used here.)

- [ ] **Step 2: Update applyImage to use fitGridToImage**

Replace the `applyImage` function:

```tsx
const applyImage = (url: string, nw: number, nh: number, r2Url?: string) => {
  setNaturalSize({ w: nw, h: nh });
  // Keep current cellSize, compute cols/rows to best-cover the image.
  // More natural when the master has already set the desired cellSize.
  const newGrid = fitGridToImage(nw, nh, grid);
  const fit = computeCoverFit(nw, nh, newGrid);
  const bgValue = { ...fit, url, r2Url };
  if (onApplyBg) onApplyBg(bgValue, newGrid);
  else {
    onGridChange(newGrid);
    onBgChange(bgValue);
  }
  setScaleXPct(100);
};
```

- [ ] **Step 3: Update handleRefit to use fitGridToImage**

Replace the `handleRefit` function:

```tsx
const handleRefit = () => {
  if (!bg) return;
  const nw = naturalSize?.w ?? bg.width;
  const nh = naturalSize?.h ?? bg.height;
  const newGrid = fitGridToImage(nw, nh, grid);
  const fit = computeCoverFit(nw, nh, newGrid);
  if (onApplyBg) {
    onApplyBg({ ...fit, url: bg.url, r2Url: bg.r2Url }, newGrid);
  } else {
    onGridChange(newGrid);
    onBgChange({ ...fit, url: bg.url, r2Url: bg.r2Url });
  }
  setScaleXPct(100);
  setDrafts({});
};
```

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/molecules/BgImagePanel.tsx
git commit -m "feat(map-editor): Encaixar no grid adjusts cols/rows from image (keeps cellSize); same on auto-fit"
```

---

### Task 9: Create MapHandlesLayer — BgHandles (resize + rotate)

**Files:**
- Create: `src/components/organisms/MapHandlesLayer.tsx`

- [ ] **Step 1: Create the file**

Create `src/components/organisms/MapHandlesLayer.tsx` with the full content below. `GridHandles` is a stub for now (added in Task 10):

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useApplication } from "@pixi/react";
import type { Graphics as PixiGraphics } from "pixi.js";
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
    const canvas = app?.renderer?.canvas;
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
        onPointerDown={(e) => {
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
      onPointerDown={(e) => {
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
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no errors. (`GridHandles` is a stub returning null for now.)

- [ ] **Step 3: Commit**

```bash
git add src/components/organisms/MapHandlesLayer.tsx
git commit -m "feat(tactical-map): add MapHandlesLayer with BgHandles — resize (8 handles) and rotate"
```

---

### Task 10: MapHandlesLayer — GridHandles + Shift feedback

**Files:**
- Modify: `src/components/organisms/MapHandlesLayer.tsx`

- [ ] **Step 1: Replace the GridHandles stub with the full implementation**

Replace the `GridHandles` function (and its comment) at the bottom of the file with:

```tsx
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
  const gw = grid.cols * grid.cellSize;
  const gh = grid.rows * grid.cellSize;
  const gcx = gw / 2;

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
    const canvas = app?.renderer?.canvas;
    const onMove = (e: PointerEvent) => {
      const dr = dragState.current;
      const vp2 = vpRef.current;
      if (!dr || !vp2 || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const wld = vp2.toWorld(e.clientX - rect.left, e.clientY - rect.top);
      const newGrid = computeNewGridFromDrag(dr.handle, dr.startGrid, wld.x, wld.y, dr.shiftKey);
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

  const drawBorder = useCallback((g: PixiGraphics) => {
    g.clear();
    const color = shiftPressed ? 0xffaa00 : 0xffffff;
    g.setStrokeStyle({ width: 1 / vpScale, color, alpha: 0.7 });
    g.rect(0, 0, gw, gh);
    g.stroke();
  }, [gw, gh, vpScale, shiftPressed]);

  const drawRotate = useCallback((g: PixiGraphics) => {
    g.clear();
    g.setStrokeStyle({ width: 1 / vpScale, color: 0xffd700, alpha: 0.8 });
    g.moveTo(gcx, 0);
    g.lineTo(gcx, -ro);
    g.stroke();
    g.setFillStyle({ color: 0xffd700, alpha: 1 });
    g.circle(gcx, -ro, rr);
    g.fill();
  }, [gcx, ro, rr, vpScale]);

  const corners: Array<{ id: string; hx: number; hy: number; cursor: string }> = [
    { id: "TL", hx: 0,  hy: 0,  cursor: "nw-resize" },
    { id: "TR", hx: gw, hy: 0,  cursor: "ne-resize" },
    { id: "BL", hx: 0,  hy: gh, cursor: "sw-resize" },
    { id: "BR", hx: gw, hy: gh, cursor: "se-resize" },
  ];

  const edgeHandles: Array<{ id: string; hx: number; hy: number }> = [
    { id: "TC", hx: gcx, hy: 0 },
    { id: "BC", hx: gcx, hy: gh },
  ];

  return (
    <pixiContainer label="grid-handles">
      <pixiGraphics draw={drawBorder} eventMode="none" />

      {corners.map(({ id, hx, hy, cursor }) => (
        <GridCornerHandle
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

      {edgeHandles.map(({ id, hx, hy }) => (
        <GridEdgeHandle
          key={id}
          id={id}
          hx={hx}
          hy={hy}
          hs={hs}
          shiftPressed={shiftPressed}
          onStartDrag={startDrag}
        />
      ))}

      <pixiGraphics
        draw={drawRotate}
        eventMode="static"
        cursor="crosshair"
        onPointerDown={(e) => {
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
      onPointerDown={(e) => {
        e.stopPropagation();
        onStartDrag(id, shiftPressed, e.global.x, e.global.y);
      }}
    />
  );
}

function GridEdgeHandle({
  id, hx, hy, hs, shiftPressed, onStartDrag,
}: {
  id: string; hx: number; hy: number; hs: number;
  shiftPressed: boolean;
  onStartDrag: (id: string, shift: boolean, ex: number, ey: number) => void;
}) {
  const actualHs = shiftPressed ? hs * 1.25 : hs;
  const fillColor = shiftPressed ? 0xffaa00 : 0xffffff;
  const cursor = shiftPressed ? "row-resize" : "ns-resize";

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
      onPointerDown={(e) => {
        e.stopPropagation();
        onStartDrag(id, shiftPressed, e.global.x, e.global.y);
      }}
    />
  );
}

// ─── GridHandles math ─────────────────────────────────────────────────────────

function computeNewGridFromDrag(
  handle: string,
  startGrid: GridShape,
  worldX: number,
  worldY: number,
  shiftKey: boolean,
): GridShape | null {
  const MIN_CELL = 8;
  const { cols, rows, cellSize } = startGrid;
  const gw = cols * cellSize;
  const gh = rows * cellSize;

  if (handle === "rotate") {
    const cx = gw / 2, cy = gh / 2;
    const angle = Math.atan2(worldY - cy, worldX - cx) * (180 / Math.PI) + 90;
    return { ...startGrid, rotation: angle };
  }

  // TC/BC with Shift → isometric skew (skewRatio)
  if (shiftKey && (handle === "TC" || handle === "BC")) {
    const baseH = rows * cellSize;
    // TC: anchored at BC (y = gh), dragging upward compresses.
    // BC: anchored at TC (y = 0), dragging downward expands.
    const newH = handle === "TC"
      ? Math.max(baseH * 0.3, gh - worldY)
      : Math.max(baseH * 0.3, worldY);
    const newSkewRatio = Math.max(0.3, Math.min(1.0, newH / baseH));
    return { ...startGrid, skewRatio: newSkewRatio };
  }

  // All other cases → change cellSize
  let newCellSize: number;
  switch (handle) {
    case "TR":
    case "BR":
      newCellSize = Math.max(MIN_CELL, worldX / cols);
      break;
    case "TL":
    case "BL":
      newCellSize = Math.max(MIN_CELL, (gw - worldX) / cols);
      break;
    case "TC":
      // Anchor at BC (gh). TC drag up → smaller height → smaller cellSize.
      newCellSize = Math.max(MIN_CELL, (gh - worldY) / rows);
      break;
    case "BC":
      // Anchor at TC (0). BC drag down → larger height → larger cellSize.
      newCellSize = Math.max(MIN_CELL, worldY / rows);
      break;
    default:
      return null;
  }
  return { ...startGrid, cellSize: newCellSize };
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/organisms/MapHandlesLayer.tsx
git commit -m "feat(tactical-map): add GridHandles with cellSize drag, isometric Shift+TC/BC, Shift visual feedback"
```

---

### Task 11: Wire MapHandlesLayer into TacticalMapStage + TacticalMapEditor

**Files:**
- Modify: `src/components/organisms/TacticalMapStage.tsx`
- Modify: `src/features/tactical-map/TacticalMapEditor.tsx`

- [ ] **Step 1: Add new props to TacticalMapStage Props type**

In `TacticalMapStage.tsx`, add to the `Props` type:

```tsx
// Add these three optional props:
activeTool?: ToolKind;
onBgChange?: (bg: NonNullable<BgImage>) => void;
onGridChange?: (grid: GridShape) => void;
```

Add the `ToolKind` import. Currently only `Selection` is imported from `editorStore`:

```tsx
import type { Selection, ToolKind } from "../../features/tactical-map/store/editorStore";
```

And add `BgImage` to the tacticalMap import if not already there:

```tsx
import type { TacticalMap, GridShape, Piece, SlotCoord, BgImage } from "../../types/tacticalMap";
```

- [ ] **Step 2: Thread new props through TacticalMapStage and ViewportInner**

In `TacticalMapStage` component's destructuring, add:

```tsx
export default function TacticalMapStage({
  // ... existing props ...
  activeTool,
  onBgChange,
  onGridChange,
}: Props) {
```

Pass them to `ViewportInner`:

```tsx
<ViewportInner
  // ... existing props ...
  activeTool={activeTool}
  onBgChange={onBgChange}
  onGridChange={onGridChange}
/>
```

Update `ViewportInner` signature:

```tsx
function ViewportInner({
  // ... existing ...
  activeTool,
  onBgChange,
  onGridChange,
}: Props) {
```

- [ ] **Step 3: Add MapHandlesLayer import and render in overlay-layer**

Add import at the top of `TacticalMapStage.tsx`:

```tsx
import MapHandlesLayer from "./MapHandlesLayer";
```

In `ViewportInner`'s return, replace:

```tsx
<pixiContainer label="overlay-layer" />
```

with:

```tsx
<pixiContainer label="overlay-layer">
  {activeTool && onBgChange && onGridChange && (
    <MapHandlesLayer
      activeTool={activeTool}
      bg={map.bg}
      grid={map.grid}
      vpScale={vpScale}
      onBgChange={onBgChange}
      onGridChange={onGridChange}
      vpRef={vpRef}
    />
  )}
</pixiContainer>
```

- [ ] **Step 4: Pass new props from TacticalMapEditor**

In `TacticalMapEditor.tsx`, update the `<TacticalMapStage>` usage (around line 432):

```tsx
<TacticalMapStage
  map={map}
  width={width}
  height={height}
  activeTool={activeTool}
  bgInteractive={activeTool === "bg"}
  uploading={isUploadingBg}
  onViewportScaleChange={setViewportScale}
  piecesInteractive={activeTool === "pieces"}
  selection={selection}
  npcMap={npcMap}
  placingNpcId={placingNpcId}
  onNpcPlaced={handleNpcPlaced}
  onNpcPlacementCancel={handleNpcPlacementCancel}
  onBgPositionChange={(x, y) => setBg(bg ? { ...bg, x, y } : null)}
  onBgChange={(newBg) => setBg(newBg)}
  onGridChange={setGrid}
  onPieceSelect={handlePieceSelect}
  onPieceMove={movePiece}
  onPieceDragToRoster={handlePieceDragToRoster}
  onPieceDragStart={(_pieceId, npc) => {
    setIsDraggingPieceToRoster(true);
    setDraggingCanvasPieceNpc(npc ?? null);
  }}
  onPieceDragEnd={() => {
    setIsDraggingPieceToRoster(false);
    setDraggingCanvasPieceNpc(null);
  }}
  onStageDeselect={handleStageDeselect}
/>
```

- [ ] **Step 5: Build check**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 6: Lint**

```bash
npm run lint
```

Expected: no new lint errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/organisms/TacticalMapStage.tsx src/features/tactical-map/TacticalMapEditor.tsx
git commit -m "feat(tactical-map): wire MapHandlesLayer into overlay-layer — activeTool, onBgChange, onGridChange"
```

---

### Task 12: Manual smoke test

**Files:** none (verification only)

```bash
npm run dev
```

Open the map editor via a campaign that has a map, or use `/dev/tactical-map-demo` if available.

**Regression checks (must pass before proceeding):**

- [ ] **Avatars on pieces:** Switch to "Peças" tab — NPC avatars display correctly on pieces (no blank circles).

- [ ] **Empty-slot click:** In "Peças" tab, clicking an empty in-bounds slot opens the placement overlay. Dragging does NOT trigger it.

- [ ] **Lobby TacticalMapPlacer:** Open the lobby — piece placement/drag still works normally (`piecesInteractive=true` unaffected).

**Fixes checks:**

- [ ] **Bg drag:** In "Fundo" tab with an image loaded: drag inside image → image moves (works at all zoom levels). Drag outside image → viewport pans.

- [ ] **Bg rotation pivot:** Set rotation via sidebar number input (e.g. 45°) — image rotates around its center, not top-left corner.

- [ ] **Grid rotation pivot:** Set rotation via GridConfigPanel → grid rotates around its center.

- [ ] **Font Roboto:** All labels, inputs, and buttons in the sidebar display Roboto (not serif).

- [ ] **Sidebar:** No horizontal scrollbar appears at any tab width.

- [ ] **Tab order:** First tab shown is "Fundo", second is "Grade".

**New features:**

- [ ] **Bg handles visible:** Switch to "Fundo" tab with image loaded → 8 white square handles and 1 gold circle handle appear around the image.

- [ ] **Bg resize (locked):** Drag any handle without Shift → image resizes maintaining aspect ratio.

- [ ] **Bg resize (free):** Drag any handle while holding Shift → width and height change independently.

- [ ] **Bg rotation handle:** Drag the gold circle → image rotates from center.

- [ ] **Grid handles visible:** Switch to "Grade" tab → 4 white corner handles + 2 circle handles (TC/BC) + 1 gold rotation handle appear.

- [ ] **Grid resize:** Drag any grid handle without Shift → `cellSize` changes (grid cells get larger/smaller, count stays the same).

- [ ] **Shift feedback:** Hold Shift in "Grade" tab → TC/BC circles turn amber and grow; border turns amber. Corner handles and gold rotate handle unchanged.

- [ ] **Isometric skew:** Hold Shift + drag TC or BC → grid perspective changes (`skewRatio` decreases toward 0.3).

- [ ] **skewRatio slider:** Drag GridConfigPanel perspective slider → grid compresses vertically in real time.

- [ ] **Rotation field:** Type a value in GridConfigPanel rotation field → grid rotates.

- [ ] **"Encaixar no grid" button:** In Fundo tab with image loaded, click the button → cols/rows adjust to cover the image based on current cellSize (not cellSize itself).

- [ ] **Auto-fit on image add:** Upload a new image → grid cols/rows auto-adjust to fit the image dimensions (cellSize unchanged).

- [ ] **Commit**

```bash
git add -A
git commit -m "chore(tactical-map): fase 7 manual verification complete"
```
