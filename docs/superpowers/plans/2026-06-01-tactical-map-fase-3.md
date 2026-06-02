# Tactical Map — Fase 3: Imagem de Fundo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the master to add, position, scale, rotate and save a background image on the tactical map editor, with the grid always visible as a calibration guide.

**Architecture:** `BgImagePanel` (sidebar molecule) handles picking and calibration controls. `TacticalMapStage` gains `bgInteractive` / `clampToGrid` props; when `bgInteractive=true` the bg sprite is draggable independently of the viewport. Cover-fit math lives in pure utilities (`bgFit.ts`). R2 upload reuses the existing presigned-URL pattern extended with `file_type: "map_bg"`.

**Tech Stack:** React 19, TypeScript strict, @pixi/react v8, pixi.js v8, pixi-viewport v6, Zustand + immer (editorStore), browser-image-compression, MSW v2, Vitest + Testing Library.

**Spec:** `System_X_System_React/docs/superpowers/specs/2026-06-01-tactical-map-fase-3-design.md`

---

## File Map

| Action | Path |
|---|---|
| Create | `src/constants/uiStrings.ts` |
| Create | `src/features/tactical-map/utils/bgFit.ts` |
| Create | `src/features/tactical-map/utils/__tests__/bgFit.test.ts` |
| Create | `src/hooks/usePresignedUpload.ts` |
| Create | `src/hooks/__tests__/usePresignedUpload.test.ts` |
| Create | `src/components/molecules/BgImagePanel.tsx` |
| Create | `src/components/molecules/__tests__/BgImagePanel.test.tsx` |
| Modify | `internal/app/api/upload/presigned_url.go` |
| Modify | `internal/app/api/upload/presigned_url_test.go` |
| Modify | `src/features/tactical-map/store/editorStore.ts` |
| Modify | `src/services/uploadService.ts` |
| Modify | `src/components/molecules/ImagePickerModal.tsx` |
| Modify | `src/components/organisms/TacticalMapStage.tsx` |
| Modify | `src/components/organisms/MapEditorToolbar.tsx` |
| Modify | `src/components/organisms/__tests__/MapEditorToolbar.test.tsx` |
| Modify | `src/features/tactical-map/TacticalMapEditor.tsx` |

---

## Task 1: Backend — extend presigned URL for map_bg

**Files:**
- Modify: `internal/app/api/upload/presigned_url.go`
- Modify: `internal/app/api/upload/presigned_url_test.go`

- [ ] **Step 1: Add the failing test case**

Open `internal/app/api/upload/presigned_url_test.go` and add a new test after the existing ones:

```go
func TestPresignedURLHandler_MapBg(t *testing.T) {
	mapUUID := uuid.New()
	mock := &mockR2Client{
		uploadURL: "https://r2.example.com/map_bg/" + mapUUID.String() + ".webp?sig=x",
		publicURL: "https://pub.r2.dev/map_bg/" + mapUUID.String() + ".webp",
	}
	handler := upload.PresignedURLHandler(mock)

	req := &upload.PresignedURLRequest{
		Body: upload.PresignedURLRequestBody{FileType: "map_bg", MapUUID: mapUUID.String()},
	}
	ctx := context.WithValue(context.Background(), auth.UserIDKey, uuid.New())
	resp, err := handler(ctx, req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Body.PublicURL != mock.publicURL {
		t.Errorf("unexpected public_url: %s", resp.Body.PublicURL)
	}
}

func TestPresignedURLHandler_MapBg_MissingUUID(t *testing.T) {
	mock := &mockR2Client{}
	handler := upload.PresignedURLHandler(mock)
	req := &upload.PresignedURLRequest{
		Body: upload.PresignedURLRequestBody{FileType: "map_bg", MapUUID: "not-a-uuid"},
	}
	ctx := context.WithValue(context.Background(), auth.UserIDKey, uuid.New())
	_, err := handler(ctx, req)
	if err == nil {
		t.Fatal("expected error for invalid map_uuid, got nil")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd System_X_System && go test ./internal/app/api/upload/... -run TestPresignedURLHandler_MapBg -v
```

Expected: compile error — `MapUUID` field doesn't exist yet.

- [ ] **Step 3: Extend the request body and handler**

Replace the body of `internal/app/api/upload/presigned_url.go` with:

```go
package upload

import (
	"context"
	"net/http"
	"time"

	"github.com/422UR4H/HxH_RPG_System/internal/app/api/auth"
	"github.com/422UR4H/HxH_RPG_System/internal/gateway/r2"
	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
)

type PresignResult = r2.PresignResult

type IR2Client interface {
	NewPresignedPutURL(ctx context.Context, key string, ttl time.Duration) (PresignResult, error)
}

type PresignedURLRequestBody struct {
	FileType  string `json:"file_type" doc:"'avatar', 'cover', or 'map_bg'"`
	SheetUUID string `json:"sheet_uuid,omitempty"`
	MapUUID   string `json:"map_uuid,omitempty"`
}

type PresignedURLRequest struct {
	Body PresignedURLRequestBody
}

type PresignedURLResponseBody struct {
	UploadURL string `json:"upload_url"`
	PublicURL string `json:"public_url"`
}

type PresignedURLResponse struct {
	Body   PresignedURLResponseBody
	Status int
}

func PresignedURLHandler(
	r2Client IR2Client,
) func(context.Context, *PresignedURLRequest) (*PresignedURLResponse, error) {
	return func(ctx context.Context, req *PresignedURLRequest) (*PresignedURLResponse, error) {
		_, ok := ctx.Value(auth.UserIDKey).(uuid.UUID)
		if !ok {
			return nil, huma.Error500InternalServerError("failed to get userID in context")
		}

		fileType := req.Body.FileType
		var key string
		switch fileType {
		case "avatar", "cover":
			sheetUUID, err := uuid.Parse(req.Body.SheetUUID)
			if err != nil {
				return nil, huma.Error400BadRequest("invalid sheet_uuid")
			}
			key = fileType + "/" + sheetUUID.String() + ".webp"
		case "map_bg":
			mapUUID, err := uuid.Parse(req.Body.MapUUID)
			if err != nil {
				return nil, huma.Error400BadRequest("invalid map_uuid")
			}
			key = "map_bg/" + mapUUID.String() + ".webp"
		default:
			return nil, huma.Error422UnprocessableEntity("file_type must be 'avatar', 'cover', or 'map_bg'")
		}

		result, err := r2Client.NewPresignedPutURL(ctx, key, 5*time.Minute)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}

		return &PresignedURLResponse{
			Body:   PresignedURLResponseBody{UploadURL: result.UploadURL, PublicURL: result.PublicURL},
			Status: http.StatusOK,
		}, nil
	}
}
```

- [ ] **Step 4: Run all upload tests**

```bash
go test ./internal/app/api/upload/... -v
```

Expected: all tests pass including the two new ones.

- [ ] **Step 5: Vet**

```bash
go vet ./internal/app/api/upload/...
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
cd System_X_System
git add internal/app/api/upload/presigned_url.go internal/app/api/upload/presigned_url_test.go
git commit -m "feat(upload): add map_bg file_type to presigned URL handler

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Shared UI strings + ImagePickerModal tip

**Files:**
- Create: `src/constants/uiStrings.ts`
- Modify: `src/components/molecules/ImagePickerModal.tsx`

- [ ] **Step 1: Create the constants file**

Create `src/constants/uiStrings.ts`:

```ts
// src/constants/uiStrings.ts
export const IMAGE_PICKER_TIP =
  'Adicione por arquivo ou URL. Uma opção descarta a outra.';
```

- [ ] **Step 2: Update ImagePickerModal to use the shared string**

In `src/components/molecules/ImagePickerModal.tsx`, change line 94:

```tsx
// Before:
<Subtitle>Escolha <strong>uma</strong> forma de adicionar a imagem — upload ou link</Subtitle>

// After — add import at the top first:
import { IMAGE_PICKER_TIP } from '../../constants/uiStrings';

// Then replace:
<Subtitle>{IMAGE_PICKER_TIP}</Subtitle>
```

- [ ] **Step 3: Run type check**

```bash
cd System_X_System_React && npm run build 2>&1 | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/constants/uiStrings.ts src/components/molecules/ImagePickerModal.tsx
git commit -m "refactor: extract image picker tip to shared uiStrings constant"
```

---

## Task 3: editorStore — allow setBg(null)

**Files:**
- Modify: `src/features/tactical-map/store/editorStore.ts`
- Verify: `src/features/tactical-map/store/__tests__/editorStore.test.ts`

The current `setBg` accepts only `BgImage` (not `null`), but removing a background requires passing `null`.

- [ ] **Step 1: Check existing setBg test**

Open `src/features/tactical-map/store/__tests__/editorStore.test.ts` and verify there's a test for `setBg`. If not, skip to Step 2.

- [ ] **Step 2: Add a failing test for setBg(null)**

In `src/features/tactical-map/store/__tests__/editorStore.test.ts`, add:

```ts
it("setBg(null) removes the background", () => {
  const map = { ...DEFAULT_MAP, id: "x", campaignId: "c", createdAt: "", updatedAt: "" };
  const store = createEditorStore({
    ...map,
    bg: { url: "https://x.com/img.webp", x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
  });
  store.getState().setBg(null);
  expect(store.getState().map.bg).toBeNull();
  expect(store.getState().isDirty).toBe(true);
});
```

- [ ] **Step 3: Run to confirm it fails**

```bash
npm run test -- src/features/tactical-map/store/__tests__/editorStore.test.ts --reporter=verbose 2>&1 | tail -15
```

Expected: TypeScript error or test failure — `null` is not assignable to `BgImage`.

- [ ] **Step 4: Update the store type and implementation**

In `src/features/tactical-map/store/editorStore.ts`, change line 28 and its implementation:

```ts
// Line 28 — type:
setBg: (bg: BgImage | null) => void;

// Lines 62-65 — implementation (no change needed; immer handles null fine):
setBg: (bg) =>
  set((s) => {
    s.map.bg = bg;
    s.isDirty = true;
  }),
```

- [ ] **Step 5: Run the test**

```bash
npm run test -- src/features/tactical-map/store/__tests__/editorStore.test.ts --reporter=verbose 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/tactical-map/store/editorStore.ts src/features/tactical-map/store/__tests__/editorStore.test.ts
git commit -m "fix(editor-store): allow setBg to accept null for image removal"
```

---

## Task 4: Cover-fit utilities (TDD)

**Files:**
- Create: `src/features/tactical-map/utils/bgFit.ts`
- Create: `src/features/tactical-map/utils/__tests__/bgFit.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/features/tactical-map/utils/__tests__/bgFit.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeCoverFit, deriveGridFromImage } from "../bgFit";
import type { GridShape } from "../../../../types/tacticalMap";

const grid = (cols: number, rows: number, cellSize: number): GridShape => ({
  kind: "square",
  cols,
  rows,
  cellSize,
  skewRatio: 1,
  rotation: 0,
  color: "#4a90a4",
  opacity: 0.6,
  lineStyle: "solid",
});

describe("computeCoverFit", () => {
  it("scales a wider-than-grid image to cover vertically", () => {
    // Grid: 800×600. Image: 1600×900 (16:9). Scale to cover height (600):
    // scaleY = 600/900 = 0.667; scaleX = 800/1600 = 0.5. max = 0.667.
    // width = 1600*0.667 ≈ 1067, height = 900*0.667 = 600.
    // x = (800 - 1067)/2 ≈ -133, y = 0.
    const result = computeCoverFit(1600, 900, grid(20, 15, 40));
    expect(result.height).toBeCloseTo(600, 0);
    expect(result.width).toBeGreaterThan(800);
    expect(result.y).toBeCloseTo(0, 0);
    expect(result.x).toBeLessThan(0); // overflows left
    expect(result.rotation).toBe(0);
    expect(result.opacity).toBe(1);
  });

  it("scales a taller-than-grid image to cover horizontally", () => {
    // Grid: 800×600. Image: 900×1600 (portrait). scaleX=800/900=0.889; scaleY=600/1600=0.375. max=0.889.
    // width=800, height=1600*0.889≈1422. x=0, y=(600-1422)/2≈-411.
    const result = computeCoverFit(900, 1600, grid(20, 15, 40));
    expect(result.width).toBeCloseTo(800, 0);
    expect(result.height).toBeGreaterThan(600);
    expect(result.x).toBeCloseTo(0, 0);
    expect(result.y).toBeLessThan(0);
  });

  it("exact aspect ratio — no overflow, no underflow", () => {
    // Grid: 800×600. Image: 800×600. Scale=1.
    const result = computeCoverFit(800, 600, grid(20, 15, 40));
    expect(result.width).toBeCloseTo(800, 0);
    expect(result.height).toBeCloseTo(600, 0);
    expect(result.x).toBeCloseTo(0, 0);
    expect(result.y).toBeCloseTo(0, 0);
  });
});

describe("deriveGridFromImage", () => {
  it("calculates cellSize and rows from naturalWidth, cols", () => {
    // naturalWidth=800, cols=20 → cellSize=40; naturalHeight=600, rows=floor(600/40)=15.
    const result = deriveGridFromImage(800, 600, grid(20, 10, 50));
    expect(result.cellSize).toBe(40);
    expect(result.rows).toBe(15);
    expect(result.cols).toBe(20); // unchanged
    expect(result.kind).toBe("square"); // unchanged
  });

  it("floors rows when image height is not a multiple", () => {
    // naturalWidth=800, cols=20 → cellSize=40; naturalHeight=650 → rows=floor(650/40)=16.
    const result = deriveGridFromImage(800, 650, grid(20, 10, 50));
    expect(result.rows).toBe(16);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
npm run test -- src/features/tactical-map/utils/__tests__/bgFit.test.ts --reporter=verbose 2>&1 | tail -10
```

Expected: `Cannot find module '../bgFit'`.

- [ ] **Step 3: Implement the utilities**

Create `src/features/tactical-map/utils/bgFit.ts`:

```ts
// src/features/tactical-map/utils/bgFit.ts
import type { BgImage, GridShape } from "../../../types/tacticalMap";

/**
 * Computes initial BgImage values that "cover" the grid area —
 * image is scaled to fill the entire grid without distortion,
 * centered. May overflow grid bounds (master adjusts from there).
 */
export function computeCoverFit(
  naturalWidth: number,
  naturalHeight: number,
  grid: GridShape,
): BgImage {
  const gridW = grid.cols * grid.cellSize;
  const gridH = grid.rows * grid.cellSize;

  const scaleX = gridW / naturalWidth;
  const scaleY = gridH / naturalHeight;
  const scale = Math.max(scaleX, scaleY);

  const w = naturalWidth * scale;
  const h = naturalHeight * scale;

  return {
    url: "",          // caller sets this
    x: (gridW - w) / 2,
    y: (gridH - h) / 2,
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
  };
}

/**
 * Derives cellSize and rows from the image's natural dimensions
 * and the current number of columns. Preserves all other grid fields.
 */
export function deriveGridFromImage(
  naturalWidth: number,
  naturalHeight: number,
  grid: GridShape,
): GridShape {
  const cellSize = naturalWidth / grid.cols;
  const rows = Math.floor(naturalHeight / cellSize);
  return { ...grid, cellSize, rows };
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- src/features/tactical-map/utils/__tests__/bgFit.test.ts --reporter=verbose 2>&1 | tail -15
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/tactical-map/utils/bgFit.ts src/features/tactical-map/utils/__tests__/bgFit.test.ts
git commit -m "feat(tactical-map): add cover-fit and grid-derive utilities for bg image"
```

---

## Task 5: uploadService — add map_bg support

**Files:**
- Modify: `src/services/uploadService.ts`

- [ ] **Step 1: Add the new method**

In `src/services/uploadService.ts`, add after the existing `uploadToR2` method:

```ts
// Add to existing uploadService object:
getPresignedUrlForMap: (
  token: string,
  mapId: string,
): Promise<PresignedUrlResponse> =>
  httpClient
    .post<{ upload_url: string; public_url: string }>(
      "/upload/presigned-url",
      { file_type: "map_bg", map_uuid: mapId },
      config(token),
    )
    .then(({ data }) => ({
      uploadUrl: data.upload_url,
      publicUrl: data.public_url,
    })),
```

- [ ] **Step 2: Type check**

```bash
npm run build 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/uploadService.ts
git commit -m "feat(upload-service): add getPresignedUrlForMap for map_bg file type"
```

---

## Task 6: TacticalMapStage — clampToGrid + bgInteractive props

**Files:**
- Modify: `src/components/organisms/TacticalMapStage.tsx`

This task adds three new props and makes the bg sprite draggable when `bgInteractive=true`. It also sets up pixi-viewport plugins (drag, pinch, wheel) via a ref — these may already be configured; check first.

- [ ] **Step 1: Add Viewport to imports and extend**

At the top of `TacticalMapStage.tsx`, ensure `Viewport` is imported from `pixi-viewport` (it already is) and add `ref` to the intrinsic element declaration:

```tsx
// Update the declare module block to add ref support:
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      pixiViewport: {
        ref?: React.Ref<Viewport>;
        screenWidth?: number;
        screenHeight?: number;
        worldWidth?: number;
        worldHeight?: number;
        events?: EventSystem;
        children?: React.ReactNode;
      };
    }
  }
}
```

- [ ] **Step 2: Extend Props type**

```tsx
// Before:
type Props = {
  map: TacticalMap;
  width: number;
  height: number;
};

// After:
type Props = {
  map: TacticalMap;
  width: number;
  height: number;
  clampToGrid?: boolean;
  bgInteractive?: boolean;
  onBgPositionChange?: (x: number, y: number) => void;
};
```

- [ ] **Step 3: Thread props to ViewportInner**

```tsx
// TacticalMapStage component — pass new props:
export default function TacticalMapStage({ map, width, height, clampToGrid = false, bgInteractive = false, onBgPositionChange }: Props) {
  return (
    <Application width={width} height={height} background={0x101820}>
      <ViewportInner
        map={map}
        width={width}
        height={height}
        clampToGrid={clampToGrid}
        bgInteractive={bgInteractive}
        onBgPositionChange={onBgPositionChange}
      />
    </Application>
  );
}
```

- [ ] **Step 4: Implement ViewportInner with clamp and bg drag**

Replace the `ViewportInner` function:

```tsx
function ViewportInner({
  map,
  width,
  height,
  clampToGrid,
  bgInteractive,
  onBgPositionChange,
}: Props) {
  const { app } = useApplication();
  const vpRef = useRef<Viewport | null>(null);
  const dragState = useRef<{ startWorldX: number; startWorldY: number; startBgX: number; startBgY: number } | null>(null);

  // Configure viewport plugins once after mount
  useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return;
    vp.drag({ pressDuration: 0 }).pinch().wheel().decelerate();
    if (clampToGrid) {
      vp.clamp({
        left: 0,
        right: map.grid.cols * map.grid.cellSize,
        top: 0,
        bottom: map.grid.rows * map.grid.cellSize,
        underflow: "center",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once; clampToGrid changes handled by memo below

  useEffect(() => {
    const vp = vpRef.current;
    if (!vp || !clampToGrid) return;
    vp.clamp({
      left: 0,
      right: map.grid.cols * map.grid.cellSize,
      top: 0,
      bottom: map.grid.rows * map.grid.cellSize,
      underflow: "center",
    });
  }, [clampToGrid, map.grid.cols, map.grid.cellSize, map.grid.rows]);

  return (
    <pixiViewport
      ref={vpRef}
      screenWidth={width}
      screenHeight={height}
      worldWidth={map.grid.cols * map.grid.cellSize * 2}
      worldHeight={map.grid.rows * map.grid.cellSize * 2}
      events={app?.renderer.events}
    >
      <BgLayer
        bg={map.bg}
        bgInteractive={bgInteractive}
        dragState={dragState}
        onBgPositionChange={onBgPositionChange}
      />
      <GridLayer grid={map.grid} />
      <pixiContainer label="decorations-layer" />
      <PiecesLayer map={map} />
      <pixiContainer label="walls-layer" />
      <pixiContainer label="overlay-layer" />
    </pixiViewport>
  );
}
```

- [ ] **Step 5: Update BgLayer to support dragging**

Replace `BgLayer`:

```tsx
import type { FederatedPointerEvent } from "pixi.js";
import type { MutableRefObject } from "react";

type DragState = {
  startWorldX: number;
  startWorldY: number;
  startBgX: number;
  startBgY: number;
} | null;

function BgLayer({
  bg,
  bgInteractive,
  dragState,
  onBgPositionChange,
}: {
  bg: TacticalMap["bg"];
  bgInteractive?: boolean;
  dragState?: MutableRefObject<DragState>;
  onBgPositionChange?: (x: number, y: number) => void;
}) {
  if (!bg) return null;

  const handlePointerDown = (e: FederatedPointerEvent) => {
    if (!bgInteractive || !dragState || !bg) return;
    e.stopPropagation(); // prevent viewport drag
    dragState.current = {
      startWorldX: e.global.x,
      startWorldY: e.global.y,
      startBgX: bg.x,
      startBgY: bg.y,
    };
  };

  const handlePointerMove = (e: FederatedPointerEvent) => {
    if (!bgInteractive || !dragState?.current || !onBgPositionChange) return;
    const dx = e.global.x - dragState.current.startWorldX;
    const dy = e.global.y - dragState.current.startWorldY;
    onBgPositionChange(
      dragState.current.startBgX + dx,
      dragState.current.startBgY + dy,
    );
  };

  const handlePointerUp = () => {
    if (dragState) dragState.current = null;
  };

  return (
    <pixiSprite
      texture={Texture.from(bg.url)}
      x={bg.x}
      y={bg.y}
      width={bg.width}
      height={bg.height}
      rotation={(bg.rotation * Math.PI) / 180}
      alpha={bg.opacity}
      eventMode={bgInteractive ? "static" : "none"}
      cursor={bgInteractive ? "grab" : "default"}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerUpOutside={handlePointerUp}
    />
  );
}
```

- [ ] **Step 6: Add `useRef` to imports in TacticalMapStage**

Ensure `useRef` is in the React import at the top:

```tsx
import { useCallback, useEffect, useMemo, useRef } from "react";
```

- [ ] **Step 7: Type check**

```bash
npm run build 2>&1 | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/organisms/TacticalMapStage.tsx
git commit -m "feat(tactical-map-stage): add clampToGrid and bgInteractive props"
```

---

## Task 7: BgImagePanel — no-image state (TDD)

**Files:**
- Create: `src/components/molecules/BgImagePanel.tsx`
- Create: `src/components/molecules/__tests__/BgImagePanel.test.tsx`

- [ ] **Step 1: Write failing tests for no-image state**

Create `src/components/molecules/__tests__/BgImagePanel.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BgImagePanel from "../BgImagePanel";
import type { BgImage, GridShape } from "../../../types/tacticalMap";
import { DEFAULT_GRID } from "../../../features/tactical-map/defaultMap";

const noop = vi.fn();

const baseProps = {
  bg: null as BgImage,
  grid: DEFAULT_GRID,
  mapId: "map-123",
  onBgChange: noop,
  onGridChange: noop,
};

describe("BgImagePanel — no image", () => {
  it("renders dropzone and URL input", () => {
    render(<BgImagePanel {...baseProps} />);
    expect(screen.getByText(/clique ou solte/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/url da imagem/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /adicionar/i })).toBeInTheDocument();
  });

  it("shows the IMAGE_PICKER_TIP message", () => {
    render(<BgImagePanel {...baseProps} />);
    expect(screen.getByText(/adicione por arquivo ou url/i)).toBeInTheDocument();
  });

  it("calls onBgChange with url when URL is submitted", async () => {
    const user = userEvent.setup();
    const onBgChange = vi.fn();
    render(<BgImagePanel {...baseProps} onBgChange={onBgChange} />);
    await user.type(screen.getByPlaceholderText(/url da imagem/i), "https://img.example.com/map.png");
    await user.click(screen.getByRole("button", { name: /adicionar/i }));
    expect(onBgChange).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://img.example.com/map.png" }),
    );
  });
});
```

- [ ] **Step 2: Run to confirm failures**

```bash
npm run test -- src/components/molecules/__tests__/BgImagePanel.test.tsx --reporter=verbose 2>&1 | tail -10
```

Expected: `Cannot find module '../BgImagePanel'`.

- [ ] **Step 3: Create BgImagePanel with no-image state**

Create `src/components/molecules/BgImagePanel.tsx`:

```tsx
// src/components/molecules/BgImagePanel.tsx
import { useRef, useState } from "react";
import styled from "styled-components";
import imageCompression from "browser-image-compression";
import { colors, fonts } from "../../styles/tokens";
import { IMAGE_PICKER_TIP } from "../../constants/uiStrings";
import { computeCoverFit, deriveGridFromImage } from "../../features/tactical-map/utils/bgFit";
import { usePresignedUpload } from "../../hooks/usePresignedUpload";
import { useToken } from "../../contexts/TokenContext";
import type { BgImage, GridShape } from "../../types/tacticalMap";

type Props = {
  bg: BgImage;
  grid: GridShape;
  mapId: string;
  onBgChange: (bg: BgImage | null) => void;
  onGridChange: (grid: GridShape) => void;
};

export default function BgImagePanel({ bg, grid, mapId, onBgChange, onGridChange }: Props) {
  const { token } = useToken();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { uploadToR2, getPresignedUrl } = usePresignedUpload();

  const applyImage = (url: string, naturalWidth: number, naturalHeight: number) => {
    const fit = computeCoverFit(naturalWidth, naturalHeight, grid);
    const newGrid = deriveGridFromImage(naturalWidth, naturalHeight, grid);
    onGridChange(newGrid);
    onBgChange({ ...fit, url });
  };

  const handleUrlSubmit = () => {
    const url = urlInput.trim();
    if (!url) return;
    const img = new Image();
    img.onload = () => applyImage(url, img.naturalWidth, img.naturalHeight);
    img.onerror = () => setUploadError("Não foi possível carregar a imagem desta URL.");
    img.src = url;
  };

  const handleFileSelect = async (file: File) => {
    if (!token) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 4096,
        useWebWorker: true,
      });
      const { uploadUrl, publicUrl } = await getPresignedUrl(token, mapId);
      await uploadToR2(uploadUrl, compressed);
      const img = new Image();
      img.onload = () => applyImage(publicUrl, img.naturalWidth, img.naturalHeight);
      img.src = URL.createObjectURL(compressed);
    } catch {
      setUploadError("Não foi possível fazer upload. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  // ── No-image state ──────────────────────────────────────────────────────────
  if (!bg) {
    return (
      <Panel>
        <SectionTitle>Imagem de fundo</SectionTitle>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />

        <Dropzone
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {isUploading ? "Enviando..." : "Clique ou solte uma imagem aqui"}
        </Dropzone>

        <OrDivider>── ou ──</OrDivider>

        <UrlRow>
          <UrlInput
            type="url"
            placeholder="URL da imagem"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
          />
          <AddButton type="button" onClick={handleUrlSubmit} disabled={!urlInput.trim()}>
            Adicionar
          </AddButton>
        </UrlRow>

        {uploadError && <ErrorText>{uploadError}</ErrorText>}
        <TipText>{IMAGE_PICKER_TIP}</TipText>
      </Panel>
    );
  }

  // ── With-image state — rendered in Task 8 ──────────────────────────────────
  return <Panel><SectionTitle>Imagem de fundo</SectionTitle><div>...</div></Panel>;
}

// ── Styled components ─────────────────────────────────────────────────────────

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  font-family: ${fonts.sans};
`;

const SectionTitle = styled.p`
  font-size: 12px;
  font-weight: 700;
  color: ${colors.textPlaceholderStrong};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0;
`;

const Dropzone = styled.div`
  background: ${colors.grayBgDeeper};
  border: 2px dashed ${colors.grayMid};
  border-radius: 8px;
  padding: 32px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
  font-size: 13px;
  color: ${colors.textPlaceholderStrong};
  transition: border-color 0.15s;
  &:hover { border-color: ${colors.brandAccent}; }
`;

const OrDivider = styled.p`
  font-size: 12px;
  color: ${colors.textPlaceholder};
  text-align: center;
  margin: 0;
`;

const UrlRow = styled.div`display: flex; gap: 8px;`;

const UrlInput = styled.input`
  flex: 1;
  padding: 8px 12px;
  background: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 13px;
  outline: none;
  &:focus { border-color: ${colors.brandAccentBright}; }
  &::placeholder { color: ${colors.textPlaceholder}; }
`;

const AddButton = styled.button`
  padding: 8px 14px;
  background: ${colors.brandAccent};
  color: ${colors.textPrimary};
  border: none;
  border-radius: 6px;
  font-family: ${fonts.sans};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const TipText = styled.p`
  font-size: 11px;
  color: ${colors.textPlaceholder};
  margin: 0;
  line-height: 1.4;
`;

const ErrorText = styled.p`
  font-size: 12px;
  color: ${colors.danger};
  margin: 0;
`;
```

**Note:** `usePresignedUpload` hook is not yet created — it will be in Task 9. For now you can stub it so the file compiles:

```ts
// Temporary stub at the top of BgImagePanel.tsx — replace in Task 9:
// import { usePresignedUpload } from "../../hooks/usePresignedUpload";
// Replace temporarily with:
const usePresignedUpload = () => ({
  getPresignedUrl: async (_token: string, _mapId: string) => ({ uploadUrl: "", publicUrl: "" }),
  uploadToR2: async (_url: string, _blob: Blob) => {},
});
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- src/components/molecules/__tests__/BgImagePanel.test.tsx --reporter=verbose 2>&1 | tail -15
```

Expected: all 3 no-image tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/molecules/BgImagePanel.tsx src/components/molecules/__tests__/BgImagePanel.test.tsx
git commit -m "feat(bg-image-panel): add no-image state with dropzone and URL input"
```

---

## Task 8: BgImagePanel — with-image calibration controls (TDD)

**Files:**
- Modify: `src/components/molecules/BgImagePanel.tsx`
- Modify: `src/components/molecules/__tests__/BgImagePanel.test.tsx`

- [ ] **Step 1: Add failing tests for with-image state**

Add to the test file (below the existing tests):

```tsx
const bgFixture: BgImage = {
  url: "https://img.example.com/map.png",
  x: 10, y: 20,
  width: 800, height: 600,
  rotation: 0, opacity: 0.8,
};

describe("BgImagePanel — with image", () => {
  it("renders calibration controls", () => {
    render(<BgImagePanel {...baseProps} bg={bgFixture} />);
    expect(screen.getByLabelText(/pos x/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pos y/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rotação/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/opacidade/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /trocar imagem/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remover/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /encaixar no grid/i })).toBeInTheDocument();
  });

  it("calls onBgChange when Pos X changes", async () => {
    const user = userEvent.setup();
    const onBgChange = vi.fn();
    render(<BgImagePanel {...baseProps} bg={bgFixture} onBgChange={onBgChange} />);
    const input = screen.getByLabelText(/pos x/i);
    await user.clear(input);
    await user.type(input, "50");
    expect(onBgChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ x: 50 }),
    );
  });

  it("calls onBgChange(null) when Remover is clicked", async () => {
    const user = userEvent.setup();
    const onBgChange = vi.fn();
    render(<BgImagePanel {...baseProps} bg={bgFixture} onBgChange={onBgChange} />);
    await user.click(screen.getByRole("button", { name: /remover/i }));
    expect(onBgChange).toHaveBeenCalledWith(null);
  });

  it("re-applies cover fit when Encaixar no grid is clicked", async () => {
    const user = userEvent.setup();
    const onBgChange = vi.fn();
    const onGridChange = vi.fn();
    render(<BgImagePanel {...baseProps} bg={bgFixture} onBgChange={onBgChange} onGridChange={onGridChange} />);
    await user.click(screen.getByRole("button", { name: /encaixar no grid/i }));
    // computeCoverFit is called with the current naturalWidth/Height stored on bg
    // The result must preserve the url
    expect(onBgChange).toHaveBeenCalledWith(
      expect.objectContaining({ url: bgFixture.url }),
    );
  });

  it("lock aspect ratio — changing scale X also changes scale Y", async () => {
    const user = userEvent.setup();
    const onBgChange = vi.fn();
    render(<BgImagePanel {...baseProps} bg={bgFixture} onBgChange={onBgChange} />);
    const scaleX = screen.getByLabelText(/escala x/i);
    await user.clear(scaleX);
    await user.type(scaleX, "150");
    // When locked, width and height change proportionally
    expect(onBgChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        width: expect.any(Number),
        height: expect.any(Number),
      }),
    );
    const lastCall = onBgChange.mock.calls.at(-1)![0] as BgImage;
    const ratio = lastCall!.height / lastCall!.width;
    const originalRatio = bgFixture.height / bgFixture.width;
    expect(ratio).toBeCloseTo(originalRatio, 2);
  });
});
```

- [ ] **Step 2: Run to verify failures**

```bash
npm run test -- src/components/molecules/__tests__/BgImagePanel.test.tsx --reporter=verbose 2>&1 | tail -15
```

Expected: all 5 new tests fail (controls not rendered yet).

- [ ] **Step 3: Implement with-image state**

In `BgImagePanel.tsx`, store the natural dimensions alongside the bg image so we can re-fit. The `BgImage` type already has `width` and `height` (the rendered size). For re-fit, we need the original image dimensions. Store them in component state.

Replace the `if (!bg)` block's surrounding component with this complete implementation:

```tsx
export default function BgImagePanel({ bg, grid, mapId, onBgChange, onGridChange }: Props) {
  const { token } = useToken();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [scaleXPct, setScaleXPct] = useState(100);
  const [aspectLocked, setAspectLocked] = useState(true);
  const { uploadToR2, getPresignedUrl } = usePresignedUpload();

  const applyImage = (url: string, nw: number, nh: number) => {
    setNaturalSize({ w: nw, h: nh });
    const fit = computeCoverFit(nw, nh, grid);
    const newGrid = deriveGridFromImage(nw, nh, grid);
    onGridChange(newGrid);
    onBgChange({ ...fit, url });
    setScaleXPct(100);
  };

  const handleUrlSubmit = () => {
    const url = urlInput.trim();
    if (!url) return;
    const img = new Image();
    img.onload = () => applyImage(url, img.naturalWidth, img.naturalHeight);
    img.onerror = () => setUploadError("Não foi possível carregar a imagem desta URL.");
    img.src = url;
  };

  const handleFileSelect = async (file: File) => {
    if (!token) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const compressed = await imageCompression(file, { maxWidthOrHeight: 4096, useWebWorker: true });
      const { uploadUrl, publicUrl } = await getPresignedUrl(token, mapId);
      await uploadToR2(uploadUrl, compressed);
      const blobUrl = URL.createObjectURL(compressed);
      const img = new Image();
      img.onload = () => {
        applyImage(publicUrl, img.naturalWidth, img.naturalHeight);
        URL.revokeObjectURL(blobUrl);
      };
      img.src = blobUrl;
    } catch {
      setUploadError("Não foi possível fazer upload. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRefit = () => {
    if (!bg || !naturalSize) return;
    const fit = computeCoverFit(naturalSize.w, naturalSize.h, grid);
    onBgChange({ ...fit, url: bg.url });
    setScaleXPct(100);
  };

  if (!bg) {
    return (
      <Panel>
        <SectionTitle>Imagem de fundo</SectionTitle>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
        />
        <Dropzone onClick={() => fileInputRef.current?.click()} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
          {isUploading ? "Enviando..." : "Clique ou solte uma imagem aqui"}
        </Dropzone>
        <OrDivider>── ou ──</OrDivider>
        <UrlRow>
          <UrlInput type="url" placeholder="URL da imagem" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()} />
          <AddButton type="button" onClick={handleUrlSubmit} disabled={!urlInput.trim()}>Adicionar</AddButton>
        </UrlRow>
        {uploadError && <ErrorText>{uploadError}</ErrorText>}
        <TipText>{IMAGE_PICKER_TIP}</TipText>
      </Panel>
    );
  }

  // ── With-image state ──────────────────────────────────────────────────────
  const originalRatio = naturalSize ? naturalSize.h / naturalSize.w : bg.height / bg.width;

  const handlePosXChange = (val: number) => onBgChange({ ...bg, x: val });
  const handlePosYChange = (val: number) => onBgChange({ ...bg, y: val });

  const handleScaleXChange = (pct: number) => {
    const newW = naturalSize ? (naturalSize.w * pct) / 100 : (bg.width * pct) / scaleXPct;
    if (aspectLocked) {
      onBgChange({ ...bg, width: newW, height: newW * originalRatio });
    } else {
      onBgChange({ ...bg, width: newW });
    }
    setScaleXPct(pct);
  };

  const handleScaleYChange = (pct: number) => {
    const naturalH = naturalSize?.h ?? (bg.height / (scaleXPct / 100));
    onBgChange({ ...bg, height: (naturalH * pct) / 100 });
  };

  const handleRotationChange = (deg: number) => onBgChange({ ...bg, rotation: deg });
  const handleOpacityChange = (val: number) => onBgChange({ ...bg, opacity: val });

  return (
    <Panel>
      <SectionTitle>Imagem de fundo</SectionTitle>
      <ActionRow>
        <TextButton type="button" onClick={() => onBgChange(null)}>Trocar imagem</TextButton>
        <DangerButton type="button" onClick={() => onBgChange(null)}>Remover</DangerButton>
      </ActionRow>

      <FieldGroup>
        <label htmlFor="bg-pos-x">Pos X</label>
        <NumberInput id="bg-pos-x" aria-label="Pos X" type="number" step={1} value={Math.round(bg.x)} onChange={(e) => handlePosXChange(Number(e.target.value))} />
      </FieldGroup>
      <FieldGroup>
        <label htmlFor="bg-pos-y">Pos Y</label>
        <NumberInput id="bg-pos-y" aria-label="Pos Y" type="number" step={1} value={Math.round(bg.y)} onChange={(e) => handlePosYChange(Number(e.target.value))} />
      </FieldGroup>

      <Divider />

      <LockRow>
        <FieldGroup>
          <label htmlFor="bg-scale-x">Escala X</label>
          <NumberInput id="bg-scale-x" aria-label="Escala X" type="number" step={1} min={1} value={Math.round(scaleXPct)} onChange={(e) => handleScaleXChange(Number(e.target.value))} />
        </FieldGroup>
        <LockButton type="button" onClick={() => setAspectLocked((v) => !v)} title={aspectLocked ? "Destravar proporção" : "Travar proporção"}>
          {aspectLocked ? "🔒" : "🔓"}
        </LockButton>
        <FieldGroup>
          <label htmlFor="bg-scale-y">Escala Y</label>
          <NumberInput id="bg-scale-y" aria-label="Escala Y" type="number" step={1} min={1} disabled={aspectLocked} value={Math.round(aspectLocked ? scaleXPct : (bg.height / (naturalSize?.h ?? bg.height)) * 100)} onChange={(e) => handleScaleYChange(Number(e.target.value))} />
        </FieldGroup>
      </LockRow>

      <FieldGroup>
        <label htmlFor="bg-rotation">Rotação</label>
        <NumberInput id="bg-rotation" aria-label="Rotação" type="number" step={1} min={-180} max={180} value={Math.round(bg.rotation)} onChange={(e) => handleRotationChange(Number(e.target.value))} />
      </FieldGroup>
      <FieldGroup>
        <label htmlFor="bg-opacity">Opacidade</label>
        <SliderInput id="bg-opacity" aria-label="Opacidade" type="range" min={0} max={1} step={0.05} value={bg.opacity} onChange={(e) => handleOpacityChange(Number(e.target.value))} />
      </FieldGroup>

      <RefitButton type="button" onClick={handleRefit}>Encaixar no grid</RefitButton>
    </Panel>
  );
}
```

Add the missing styled components at the bottom:

```tsx
const ActionRow = styled.div`display: flex; gap: 8px;`;

const TextButton = styled.button`
  flex: 1;
  padding: 7px 12px;
  background: transparent;
  color: ${colors.brandAccent};
  border: 1px solid ${colors.brandAccent};
  border-radius: 6px;
  font-family: ${fonts.sans};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
`;

const DangerButton = styled(TextButton)`
  color: ${colors.danger};
  border-color: ${colors.danger};
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: ${colors.textPlaceholderStrong};
  flex: 1;
`;

const NumberInput = styled.input`
  width: 100%;
  padding: 6px 8px;
  background: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 13px;
  outline: none;
  &:disabled { opacity: 0.4; }
`;

const LockRow = styled.div`display: flex; align-items: flex-end; gap: 4px;`;

const LockButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
  align-self: flex-end;
  margin-bottom: 6px;
`;

const SliderInput = styled.input`width: 100%;`;

const Divider = styled.hr`border-color: ${colors.borderInput}; margin: 4px 0;`;

const RefitButton = styled.button`
  width: 100%;
  padding: 8px;
  background: transparent;
  color: ${colors.textPlaceholderStrong};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  font-family: ${fonts.sans};
  font-size: 12px;
  cursor: pointer;
  &:hover { border-color: ${colors.brandAccent}; color: ${colors.brandAccent}; }
`;
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- src/components/molecules/__tests__/BgImagePanel.test.tsx --reporter=verbose 2>&1 | tail -20
```

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/molecules/BgImagePanel.tsx src/components/molecules/__tests__/BgImagePanel.test.tsx
git commit -m "feat(bg-image-panel): add with-image calibration controls"
```

---

## Task 9: usePresignedUpload hook + replace stub in BgImagePanel

**Files:**
- Create: `src/hooks/usePresignedUpload.ts`
- Create: `src/hooks/__tests__/usePresignedUpload.test.ts`
- Modify: `src/components/molecules/BgImagePanel.tsx` (remove stub, use real hook)

- [ ] **Step 1: Write failing tests for the hook**

Create `src/hooks/__tests__/usePresignedUpload.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../test/server";
import { usePresignedUpload } from "../usePresignedUpload";

const baseUrl = "http://localhost:5000";

describe("usePresignedUpload", () => {
  it("getPresignedUrl calls the presigned-url endpoint with map_bg", async () => {
    server.use(
      http.post(`${baseUrl}/upload/presigned-url`, async ({ request }) => {
        const body = await request.json() as Record<string, string>;
        if (body.file_type === "map_bg" && body.map_uuid === "map-abc") {
          return HttpResponse.json({ upload_url: "https://r2/put-url", public_url: "https://pub/img.webp" });
        }
        return HttpResponse.json({}, { status: 400 });
      }),
    );
    const { result } = renderHook(() => usePresignedUpload());
    const res = await result.current.getPresignedUrl("tok", "map-abc");
    expect(res.uploadUrl).toBe("https://r2/put-url");
    expect(res.publicUrl).toBe("https://pub/img.webp");
  });

  it("uploadToR2 performs a PUT request", async () => {
    let captured: Request | null = null;
    server.use(
      http.put("https://r2/put-url", async ({ request }) => {
        captured = request;
        return new HttpResponse(null, { status: 200 });
      }),
    );
    const { result } = renderHook(() => usePresignedUpload());
    await result.current.uploadToR2("https://r2/put-url", new Blob(["data"], { type: "image/webp" }));
    expect(captured).not.toBeNull();
    expect((captured as Request).method).toBe("PUT");
  });
});
```

- [ ] **Step 2: Run to verify failures**

```bash
npm run test -- src/hooks/__tests__/usePresignedUpload.test.ts --reporter=verbose 2>&1 | tail -10
```

Expected: `Cannot find module '../usePresignedUpload'`.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/usePresignedUpload.ts`:

```ts
// src/hooks/usePresignedUpload.ts
import { uploadService } from "../services/uploadService";

export function usePresignedUpload() {
  const getPresignedUrl = (token: string, mapId: string) =>
    uploadService.getPresignedUrlForMap(token, mapId);

  const uploadToR2 = (uploadUrl: string, blob: Blob) =>
    uploadService.uploadToR2(uploadUrl, blob);

  return { getPresignedUrl, uploadToR2 };
}
```

- [ ] **Step 4: Run hook tests**

```bash
npm run test -- src/hooks/__tests__/usePresignedUpload.test.ts --reporter=verbose 2>&1 | tail -10
```

Expected: both tests pass.

- [ ] **Step 5: Remove the stub from BgImagePanel and use the real import**

In `BgImagePanel.tsx`, remove the inline stub and keep only the real import:

```tsx
// Ensure only this import exists (no stub):
import { usePresignedUpload } from "../../hooks/usePresignedUpload";
```

- [ ] **Step 6: Run all BgImagePanel tests**

```bash
npm run test -- src/components/molecules/__tests__/BgImagePanel.test.tsx --reporter=verbose 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/usePresignedUpload.ts src/hooks/__tests__/usePresignedUpload.test.ts src/components/molecules/BgImagePanel.tsx
git commit -m "feat(use-presigned-upload): extract upload hook, wire into BgImagePanel"
```

---

## Task 10: MapEditorToolbar — enable BG tab + mount BgImagePanel

**Files:**
- Modify: `src/components/organisms/MapEditorToolbar.tsx`
- Modify: `src/components/organisms/__tests__/MapEditorToolbar.test.tsx`

- [ ] **Step 1: Update the existing test that asserts "Fundo" is disabled**

In `MapEditorToolbar.test.tsx`, remove or update the assertion that "Fundo" is disabled. After this task, the "Fundo" tab will be enabled:

```tsx
// Remove this expectation (or replace with a "Fundo is enabled" check):
// expect(screen.getByRole("button", { name: /fundo/i })).toBeDisabled();
```

Also add a new test for the bg panel props:

```tsx
it("aba Fundo está habilitada", () => {
  render(<MapEditorToolbar {...baseProps} bg={null} onBgChange={vi.fn()} onGridChange={vi.fn()} mapId="map-1" />);
  expect(screen.getByRole("button", { name: /fundo/i })).not.toBeDisabled();
});

it("clicando na aba Fundo mostra BgImagePanel", async () => {
  const user = userEvent.setup();
  render(
    <MapEditorToolbar
      {...baseProps}
      activeTool="bg"
      bg={null}
      onBgChange={vi.fn()}
      onGridChange={vi.fn()}
      mapId="map-1"
    />
  );
  expect(screen.getByText(/clique ou solte/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to see which ones fail**

```bash
npm run test -- src/components/organisms/__tests__/MapEditorToolbar.test.tsx --reporter=verbose 2>&1 | tail -15
```

Expected: failures on missing props `bg`, `onBgChange`, `onGridChange`, `mapId`.

- [ ] **Step 3: Update MapEditorToolbar props type and TABS**

In `MapEditorToolbar.tsx`, add bg-related props and enable the bg tab:

```tsx
// Add to Props type:
type Props = {
  activeTool: ToolKind;
  onToolChange: (tool: ToolKind) => void;
  grid: GridShape;
  onGridChange: (grid: GridShape) => void;
  bg: BgImage;
  onBgChange: (bg: BgImage | null) => void;
  mapId: string;
  mapName: string;
  mapDescription: string;
  onNameChange: (name: string) => void;
  onDescriptionChange: (desc: string) => void;
  onSave: () => void;
  isSaving: boolean;
  saveLabel: string;
  nameError?: string | null;
  saveError?: string | null;
};
```

Add the import:

```tsx
import type { BgImage } from "../../types/tacticalMap";
import BgImagePanel from "../molecules/BgImagePanel";
```

Change TABS to enable "bg":

```tsx
const TABS: TabDef[] = [
  { tool: "grid", label: "Grade", enabled: true },
  { tool: "bg", label: "Fundo", enabled: true },  // ← was false
  { tool: "pieces", label: "Peças", enabled: false },
  { tool: "walls", label: "Paredes", enabled: false },
  { tool: "decorations", label: "Decorações", enabled: false },
];
```

Add the BgImagePanel to the PanelArea in the JSX:

```tsx
<PanelArea>
  {activeTool === "grid" && (
    <GridConfigPanel grid={grid} onChange={onGridChange} />
  )}
  {activeTool === "bg" && (
    <BgImagePanel
      bg={bg}
      grid={grid}
      mapId={mapId}
      onBgChange={onBgChange}
      onGridChange={onGridChange}
    />
  )}
</PanelArea>
```

Also add `bg`, `onBgChange`, `onGridChange`, `mapId` to the destructured props in the component signature.

- [ ] **Step 4: Update baseProps in the test to include the new required props**

In `MapEditorToolbar.test.tsx`, add to `baseProps`:

```tsx
const baseProps = {
  // ... existing props ...
  bg: null as BgImage,
  onBgChange: vi.fn(),
  mapId: "map-test-1",
};
```

- [ ] **Step 5: Run all toolbar tests**

```bash
npm run test -- src/components/organisms/__tests__/MapEditorToolbar.test.tsx --reporter=verbose 2>&1 | tail -15
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/organisms/MapEditorToolbar.tsx src/components/organisms/__tests__/MapEditorToolbar.test.tsx
git commit -m "feat(map-editor-toolbar): enable BG tab and mount BgImagePanel"
```

---

## Task 11: TacticalMapEditor — wire bg state + cover-fit + canvas drag

**Files:**
- Modify: `src/features/tactical-map/TacticalMapEditor.tsx`

- [ ] **Step 1: Subscribe to bg state in the editor**

Add these subscriptions in `TacticalMapEditor` (alongside the existing `setGrid`, `activeTool`, etc.):

```tsx
const setBg = store((s) => s.setBg);
const bg = store((s) => s.map.bg);
```

- [ ] **Step 2: Pass bg props to MapEditorToolbar**

In the JSX, add the new props to `MapEditorToolbar`:

```tsx
<MapEditorToolbar
  activeTool={activeTool}
  onToolChange={setActiveTool}
  grid={map.grid}
  onGridChange={setGrid}
  bg={bg}
  onBgChange={setBg}
  onGridChange={setGrid}       // already passed — grid recalc comes via BgImagePanel
  mapId={map.id ?? "new"}
  mapName={map.name}
  mapDescription={map.description ?? ""}
  onNameChange={setName}
  onDescriptionChange={setDescription}
  onSave={handleSave}
  isSaving={isSaving}
  saveLabel={saveLabel}
  nameError={nameError}
  saveError={saveError}
/>
```

**Note:** `map.id` might be a temporary UUID when creating a new map. `useCreateMap` replaces it after save — the upload key uses this id, which is acceptable since presigned URL is generated before save.

- [ ] **Step 3: Pass bgInteractive and onBgPositionChange to TacticalMapStage**

```tsx
// In the canvas div — update TacticalMapStage:
<TacticalMapStage
  map={map}
  width={width}
  height={height}
  bgInteractive={activeTool === "bg"}
  onBgPositionChange={(x, y) => setBg(bg ? { ...bg, x, y } : null)}
/>
```

- [ ] **Step 4: Type check**

```bash
npm run build 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/tactical-map/TacticalMapEditor.tsx
git commit -m "feat(tactical-map-editor): wire bg state, canvas drag, and cover-fit"
```

---

## Task 12: Truncation warning before save

**Files:**
- Modify: `src/features/tactical-map/TacticalMapEditor.tsx`

- [ ] **Step 1: Add truncation check to handleSave**

In `TacticalMapEditor.tsx`, before calling `onSave(map)`, compute the covered area and trim the grid if needed:

```tsx
const handleSave = async () => {
  if (!map.name.trim()) {
    setNameError("O nome do mapa é obrigatório.");
    return;
  }
  setNameError(null);
  setSaveError(null);

  // Truncation check: if bg exists and doesn't cover some cols/rows, warn.
  let mapToSave = map;
  if (map.bg) {
    const gridW = map.grid.cols * map.grid.cellSize;
    const gridH = map.grid.rows * map.grid.cellSize;
    const bgRight = map.bg.x + map.bg.width;
    const bgBottom = map.bg.y + map.bg.height;
    const uncoveredCols = bgRight < gridW
      ? Math.floor((gridW - bgRight) / map.grid.cellSize)
      : 0;
    const uncoveredRows = bgBottom < gridH
      ? Math.floor((gridH - bgBottom) / map.grid.cellSize)
      : 0;

    if (uncoveredCols > 0 || uncoveredRows > 0) {
      const parts: string[] = [];
      if (uncoveredCols > 0) parts.push(`${uncoveredCols} coluna${uncoveredCols > 1 ? "s" : ""}`);
      if (uncoveredRows > 0) parts.push(`${uncoveredRows} linha${uncoveredRows > 1 ? "s" : ""}`);
      const msg = `${parts.join(" e ")} fora da imagem ser${uncoveredCols + uncoveredRows > 1 ? "ão removidas" : "á removida"} ao salvar. Deseja continuar?`;
      if (!window.confirm(msg)) return;

      mapToSave = {
        ...map,
        grid: {
          ...map.grid,
          cols: map.grid.cols - uncoveredCols,
          rows: map.grid.rows - uncoveredRows,
        },
      };
    }
  }

  setIsSaving(true);
  try {
    await onSave(mapToSave);
    markClean();
    onSaveSuccess?.();
  } catch {
    setSaveError("Não foi possível salvar. Suas alterações estão protegidas localmente.");
  } finally {
    setIsSaving(false);
  }
};
```

- [ ] **Step 2: Type check**

```bash
npm run build 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/tactical-map/TacticalMapEditor.tsx
git commit -m "feat(tactical-map-editor): warn and trim uncovered grid before save"
```

---

## Task 13: Full smoke test + cleanup

- [ ] **Step 1: Run all tests**

```bash
npm run test -- --reporter=verbose 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 2: Build**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Start dev server and open the map editor**

```bash
npm run dev &
```

Open `http://localhost:5173`, log in, navigate to a campaign, click "Criar mapa". Verify:

1. Grid tab shows `GridConfigPanel` as before.
2. "Fundo" tab is now enabled and clickable.
3. Clicking "Fundo" shows the dropzone + URL input + tip text.
4. Paste a public image URL (e.g. `https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Map_of_Central_Europe.jpg/1024px-Map_of_Central_Europe.jpg`) and click "Adicionar".
5. Image appears on canvas covering the grid.
6. Calibration controls appear in the sidebar.
7. Dragging the image on canvas updates Pos X/Y in the sidebar.
8. Changing Pos X in the sidebar updates the image position on canvas.
9. "Encaixar no grid" re-centers the image.
10. Click "Salvar" — map saves, reload, image persists.
11. Try making the image smaller than the grid via the scale inputs — "Salvar" should trigger the truncation warning.

Also open `/dev/tactical-map-demo` to verify the pixi-viewport drag/zoom still works normally when the grid tool is active (not bg tool).

- [ ] **Step 4: Backend smoke test (if running locally)**

```bash
cd System_X_System && go test ./internal/app/api/upload/... -v 2>&1 | tail -20
```

Expected: all upload tests pass including the new `map_bg` ones.

- [ ] **Step 5: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "chore: tactical map phase 3 smoke test fixups"
```

---

## Summary of commits expected

| Commit | Repo |
|---|---|
| `feat(upload): add map_bg file_type to presigned URL handler` | backend |
| `refactor: extract image picker tip to shared uiStrings constant` | frontend |
| `fix(editor-store): allow setBg to accept null for image removal` | frontend |
| `feat(tactical-map): add cover-fit and grid-derive utilities for bg image` | frontend |
| `feat(upload-service): add getPresignedUrlForMap for map_bg file type` | frontend |
| `feat(tactical-map-stage): add clampToGrid and bgInteractive props` | frontend |
| `feat(bg-image-panel): add no-image state with dropzone and URL input` | frontend |
| `feat(bg-image-panel): add with-image calibration controls` | frontend |
| `feat(use-presigned-upload): extract upload hook, wire into BgImagePanel` | frontend |
| `feat(map-editor-toolbar): enable BG tab and mount BgImagePanel` | frontend |
| `feat(tactical-map-editor): wire bg state, canvas drag, and cover-fit` | frontend |
| `feat(tactical-map-editor): warn and trim uncovered grid before save` | frontend |
