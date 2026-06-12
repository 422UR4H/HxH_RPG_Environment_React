# Wall Browse/Draw Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Browse/Draw mode to the walls tab — Browse is the default (pan + wall selection), Draw is activated explicitly by clicking a type chip; selected walls can have their type/material edited and be deleted.

**Architecture:** `wallsDrawMode: "browse" | "draw"` lives as local state in `TacticalMapEditor` (pure UI, not in undo history). `WallsLayer` receives a new `drawingEnabled` prop that gates the drawing handlers; in browse mode only `findNearestWall` runs on click. `WallTypeChips` becomes a toggle (clicking the active type calls `onTypeChange(null)`) and shows a mode badge. `WallConfigPanel` is redesigned with chip-based editing + Aplicar button.

**Tech Stack:** React 19, TypeScript strict, styled-components, Zustand+Immer (editorStore), Vitest+Testing Library (test updates only).

**Working directory:** `System_X_System_React/.claude/worktrees/feat+tactical-map-fase-10/`

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `src/components/organisms/WallsLayer.tsx` | **Modify** | Add `drawingEnabled` + `onExitDrawMode` props; browse-mode `onDown`; Escape fix |
| `src/components/organisms/TacticalMapStage.tsx` | **Modify** | Forward `drawingEnabled` + `onExitWallsDrawMode` to WallsLayer |
| `src/components/molecules/WallTypeChips.tsx` | **Modify** | `activeType: WallType | null`; toggle; `drawMode` badge + hint |
| `src/components/molecules/WallConfigPanel.tsx` | **Modify** | Chip-based editing, local state, Aplicar + Deletar |
| `src/components/organisms/MapEditorToolbar.tsx` | **Modify** | New wall props (`wallsDrawMode`, `onEnterWallsDrawMode`, `onExitWallsDrawMode`); remove `onWallTypeChange` |
| `src/components/organisms/__tests__/MapEditorToolbar.test.tsx` | **Modify** | Update `baseProps` to match new prop signature |
| `src/features/tactical-map/TacticalMapEditor.tsx` | **Modify** | `wallsDrawMode` state + helpers + Delete key + prop wiring |

---

## Task 1: WallsLayer — drawingEnabled + onExitDrawMode

**Files:**
- Modify: `src/components/organisms/WallsLayer.tsx`

- [ ] **Step 1: Add the two new props to the Props type**

Find the `type Props = {` block and add two lines at the end (before the closing `}`):

```typescript
  drawingEnabled: boolean;
  onExitDrawMode: () => void;
```

The destructuring in the function signature also gains these two:

```typescript
export default function WallsLayer({
  walls, grid, vpRef, vpScale, canvasEl,
  wallsInteractive, selectedWallId,
  activeWallType, activeMaterial,
  onWallSelect, onDrawComplete, onGestureStart, onGestureEnd,
  drawingEnabled, onExitDrawMode,
}: Props) {
```

- [ ] **Step 2: Add two refs for the new props (stale-closure safety)**

After the existing `activeWallTypeRef` / `activeWallTypeRef.current = activeWallType` lines (~line 62), add:

```typescript
  const drawingEnabledRef = useRef(drawingEnabled);
  drawingEnabledRef.current = drawingEnabled;
  const onExitDrawModeRef = useRef(onExitDrawMode);
  onExitDrawModeRef.current = onExitDrawMode;
```

- [ ] **Step 3: Add an effect that clears draw state when drawingEnabled becomes false**

After the existing `drawRef.current = draw` line (the very first line of the component body), add a new `useEffect` that clears transient drawing state whenever the user exits Draw mode:

```typescript
  useEffect(() => {
    if (!drawingEnabled) {
      const empty: DrawState = { polylinePoints: [], previewPoint: null };
      drawRef.current = empty;
      setDraw(empty);
    }
  }, [drawingEnabled]);
```

- [ ] **Step 4: Guard `onMove` — skip in Browse mode**

Replace the current `onMove` handler:

```typescript
    const onMove = (e: PointerEvent) => {
      if (!drawingEnabledRef.current) return;
      const pt = toLocal(e, e.shiftKey);
      if (pt) setDraw((s) => ({ ...s, previewPoint: pt }));
    };
```

- [ ] **Step 5: Update `onDown` — add Browse-mode branch**

Replace the existing comment + code block that starts with `// Compute raw + snapped positions` and ends with `if (!pt) return;` with the version below. The Browse branch handles wall selection and returns without consuming the event (letting the viewport pan). The Draw branch is the existing logic, now wrapped in an `else`:

```typescript
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

      // When NOT drawing: free mode or near snap point → start drawing; otherwise → select/pan
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
```

- [ ] **Step 6: Fix the Escape handler — second Esc exits Draw mode**

Replace the current `onKey` handler:

```typescript
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (drawRef.current.polylinePoints.length > 0) {
        finishPolyline();
      } else if (drawingEnabledRef.current) {
        onExitDrawModeRef.current();
      }
    };
```

- [ ] **Step 7: Verify TypeScript build**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in X.XXs` (no errors).

- [ ] **Step 8: Commit**

```bash
git add src/components/organisms/WallsLayer.tsx
git commit -m "feat(walls): add drawingEnabled + onExitDrawMode — browse/draw mode support"
```

---

## Task 2: TacticalMapStage — forward new props

**Files:**
- Modify: `src/components/organisms/TacticalMapStage.tsx`

- [ ] **Step 1: Add new props to the inner component's Props type**

The outer `TacticalMapStage` component has two layers. Find both Props type definitions that include `wallsInteractive` (around lines 154 and ~296) and add to each:

```typescript
  drawingEnabled?: boolean;
  onExitWallsDrawMode?: () => void;
```

- [ ] **Step 2: Destructure the new props**

In both component function signatures that destructure `wallsInteractive`, add the two new props:

```typescript
  drawingEnabled,
  onExitWallsDrawMode,
```

- [ ] **Step 3: Pass through to WallsLayer**

Find the `<WallsLayer` JSX block (around line 567). After the existing `wallsInteractive={wallsInteractive ?? false}` line, add:

```typescript
        drawingEnabled={drawingEnabled ?? false}
        onExitDrawMode={onExitWallsDrawMode ?? (() => {})}
```

- [ ] **Step 4: Verify TypeScript build**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in X.XXs`.

- [ ] **Step 5: Commit**

```bash
git add src/components/organisms/TacticalMapStage.tsx
git commit -m "feat(walls): TacticalMapStage forwards drawingEnabled + onExitWallsDrawMode"
```

---

## Task 3: WallTypeChips — toggle + mode badge + hint

**Files:**
- Modify: `src/components/molecules/WallTypeChips.tsx`

- [ ] **Step 1: Replace the entire file with the new implementation**

The changes are: `activeType` becomes nullable, `onTypeChange` accepts `null` (toggle), a new `drawMode` prop drives the badge and hint, and the material section is hidden when not in draw mode.

```typescript
import styled from "styled-components";
import { fonts } from "../../styles/tokens";
import type { WallMaterial, WallType } from "../../types/tacticalMap";

type Props = {
  activeType: WallType | null;
  activeMaterial: WallMaterial;
  drawMode: boolean;
  onTypeChange: (t: WallType | null) => void;
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

const TYPE_LABELS: Record<WallType, string> = {
  wall: "Parede", door: "Porta", window: "Janela",
  secret_door: "P. Secreta", terrain: "Terreno",
};

export default function WallTypeChips({
  activeType, activeMaterial, drawMode, onTypeChange, onMaterialChange,
}: Props) {
  return (
    <Container>
      <ModeBadge $active={drawMode}>
        <ModeDot $active={drawMode} />
        <ModeLabel>
          {drawMode && activeType
            ? `Desenhando · ${TYPE_LABELS[activeType]}`
            : "Selecionar"}
        </ModeLabel>
        {drawMode && <EscHint>Esc para sair</EscHint>}
      </ModeBadge>

      <Section>
        <SectionLabel>Tipo de parede</SectionLabel>
        <ChipRow>
          {WALL_TYPES.map(({ value, label }) => (
            <Chip
              key={value}
              type="button"
              $active={activeType === value}
              onClick={() => onTypeChange(activeType === value ? null : value)}
            >
              {label}
            </Chip>
          ))}
        </ChipRow>
        <Hint>
          {drawMode
            ? "Clique no tipo ativo para sair do modo Desenho"
            : "Clique em um tipo para começar a desenhar"}
        </Hint>
      </Section>

      {drawMode && (
        <Section>
          <SectionLabel>Material</SectionLabel>
          <ChipRow>
            {MATERIALS.map(({ value, label }) => (
              <Chip
                key={value}
                type="button"
                $active={activeMaterial === value}
                onClick={() => onMaterialChange(value)}
              >
                {label}
              </Chip>
            ))}
          </ChipRow>
        </Section>
      )}
    </Container>
  );
}

const Container = styled.div`
  display: flex; flex-direction: column; gap: 12px; padding: 12px;
`;
const ModeBadge = styled.div<{ $active: boolean }>`
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; border-radius: 6px;
  background: #0f172a;
  border: 1px solid ${({ $active }) => $active ? "#f59e0b" : "#334155"};
`;
const ModeDot = styled.div<{ $active: boolean }>`
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  background: ${({ $active }) => $active ? "#f59e0b" : "#94a3b8"};
  ${({ $active }) => $active && "box-shadow: 0 0 6px #f59e0b;"}
`;
const ModeLabel = styled.span`
  font-family: ${fonts.sans};
  font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  color: inherit; flex: 1;
`;
const EscHint = styled.span`
  font-family: ${fonts.sans};
  font-size: 10px; color: #475569;
`;
const Section = styled.div`
  display: flex; flex-direction: column; gap: 6px;
`;
const SectionLabel = styled.span`
  font-family: ${fonts.sans};
  font-size: 11px; font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase; letter-spacing: 0.05em;
`;
const ChipRow = styled.div`
  display: flex; flex-wrap: wrap; gap: 6px;
`;
const Chip = styled.button<{ $active: boolean }>`
  font-family: ${fonts.sans};
  font-size: 12px; padding: 4px 10px; border-radius: 999px;
  border: 1px solid ${({ $active }) => $active ? "#6366f1" : "#334155"};
  background: ${({ $active }) => $active ? "#6366f1" : "transparent"};
  color: ${({ $active }) => $active ? "#fff" : "#94a3b8"};
  cursor: pointer;
  ${({ $active }) => $active && "outline: 2px solid #818cf8; outline-offset: 2px;"}
  &:hover { border-color: #6366f1; color: #fff; }
`;
const Hint = styled.span`
  font-family: ${fonts.sans};
  font-size: 11px; color: #475569; margin-top: 2px;
`;
```

- [ ] **Step 2: Verify TypeScript build**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in X.XXs`.

- [ ] **Step 3: Commit**

```bash
git add src/components/molecules/WallTypeChips.tsx
git commit -m "feat(walls): WallTypeChips — nullable type toggle, mode badge, draw hint"
```

---

## Task 4: WallConfigPanel — chip editing + Aplicar

**Files:**
- Modify: `src/components/molecules/WallConfigPanel.tsx`

- [ ] **Step 1: Replace the entire file**

The new panel uses local `editedType`/`editedMaterial` state, resets on `wall.id` change, and only calls `onUpdate` when the user clicks Aplicar. The `onRemove` prop maps to the Deletar button.

```typescript
import { useState, useEffect } from "react";
import styled from "styled-components";
import { fonts } from "../../styles/tokens";
import type { WallMaterial, WallSegment, WallType } from "../../types/tacticalMap";

type Props = {
  wall: WallSegment;
  onUpdate: (patch: Partial<WallSegment>) => void;
  onRemove: () => void;
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

export default function WallConfigPanel({ wall, onUpdate, onRemove }: Props) {
  const [editedType, setEditedType] = useState<WallType>(wall.wallType);
  const [editedMaterial, setEditedMaterial] = useState<WallMaterial>(wall.material);

  useEffect(() => {
    setEditedType(wall.wallType);
    setEditedMaterial(wall.material);
  }, [wall.id, wall.wallType, wall.material]);

  return (
    <Container>
      <Badge>
        <BadgeDot />
        <BadgeLabel>Parede Selecionada</BadgeLabel>
      </Badge>

      <Section>
        <SectionLabel>Tipo</SectionLabel>
        <ChipRow>
          {WALL_TYPES.map(({ value, label }) => (
            <Chip
              key={value}
              type="button"
              $active={editedType === value}
              onClick={() => setEditedType(value)}
            >
              {label}
            </Chip>
          ))}
        </ChipRow>
      </Section>

      <Section>
        <SectionLabel>Material</SectionLabel>
        <ChipRow>
          {MATERIALS.map(({ value, label }) => (
            <Chip
              key={value}
              type="button"
              $active={editedMaterial === value}
              onClick={() => setEditedMaterial(value)}
            >
              {label}
            </Chip>
          ))}
        </ChipRow>
      </Section>

      <Actions>
        <ApplyButton
          type="button"
          onClick={() => onUpdate({ wallType: editedType, material: editedMaterial })}
        >
          Aplicar
        </ApplyButton>
        <DeleteButton type="button" onClick={onRemove}>
          Deletar
        </DeleteButton>
      </Actions>
    </Container>
  );
}

const Container = styled.div`
  display: flex; flex-direction: column; gap: 12px; padding: 12px;
  font-family: ${fonts.sans};
`;
const Badge = styled.div`
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px; border-radius: 6px;
  background: #0f172a; border: 1px solid #6366f1;
`;
const BadgeDot = styled.div`
  width: 6px; height: 6px; border-radius: 50%; background: #818cf8; flex-shrink: 0;
`;
const BadgeLabel = styled.span`
  font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;
  color: #818cf8;
`;
const Section = styled.div`
  display: flex; flex-direction: column; gap: 6px;
`;
const SectionLabel = styled.span`
  font-size: 11px; font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase; letter-spacing: 0.05em;
`;
const ChipRow = styled.div`
  display: flex; flex-wrap: wrap; gap: 6px;
`;
const Chip = styled.button<{ $active: boolean }>`
  font-family: ${fonts.sans};
  font-size: 12px; padding: 4px 10px; border-radius: 999px;
  border: 1px solid ${({ $active }) => $active ? "#6366f1" : "#334155"};
  background: ${({ $active }) => $active ? "#6366f1" : "transparent"};
  color: ${({ $active }) => $active ? "#fff" : "#94a3b8"};
  cursor: pointer;
  &:hover { border-color: #6366f1; color: #fff; }
`;
const Actions = styled.div`
  display: flex; gap: 8px;
`;
const ApplyButton = styled.button`
  font-family: ${fonts.sans};
  flex: 1; padding: 7px; border-radius: 6px;
  border: none; background: #6366f1; color: #fff;
  font-size: 12px; font-weight: 600; cursor: pointer;
  &:hover { background: #4f46e5; }
`;
const DeleteButton = styled.button`
  font-family: ${fonts.sans};
  padding: 7px 12px; border-radius: 6px;
  border: 1px solid #991b1b; background: transparent; color: #ef4444;
  font-size: 12px; cursor: pointer;
  &:hover { background: #7f1d1d; color: #fff; }
`;
```

- [ ] **Step 2: Verify TypeScript build**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in X.XXs`.

- [ ] **Step 3: Commit**

```bash
git add src/components/molecules/WallConfigPanel.tsx
git commit -m "feat(walls): WallConfigPanel — chip editing, local state, Aplicar + Deletar"
```

---

## Task 5: MapEditorToolbar — wire Browse/Draw mode props

**Files:**
- Modify: `src/components/organisms/MapEditorToolbar.tsx`
- Modify: `src/components/organisms/__tests__/MapEditorToolbar.test.tsx`

- [ ] **Step 1: Update the Props type in MapEditorToolbar**

Find the `// Fase 10 — walls` comment block in the Props type (around lines 51–58). Replace that block with:

```typescript
  // Fase 10 — walls
  activeWallType: WallType;
  activeMaterial: WallMaterial;
  wallsDrawMode: "browse" | "draw";
  onEnterWallsDrawMode: (t: WallType) => void;
  onExitWallsDrawMode: () => void;
  onMaterialChange: (m: WallMaterial) => void;
  selectedWall: WallSegment | null;
  onWallUpdate: (id: string, patch: Partial<WallSegment>) => void;
  onRemoveWall: (id: string) => void;
```

(`onWallTypeChange` is removed; `wallsDrawMode`, `onEnterWallsDrawMode`, `onExitWallsDrawMode` are added.)

- [ ] **Step 2: Update the function destructuring**

Find the `// Fase 10 — walls` comment in the function body destructuring (around lines 110–117). Replace that block with:

```typescript
  // Fase 10 — walls
  activeWallType,
  activeMaterial,
  wallsDrawMode,
  onEnterWallsDrawMode,
  onExitWallsDrawMode,
  onMaterialChange,
  selectedWall,
  onWallUpdate,
  onRemoveWall,
```

- [ ] **Step 3: Update the walls panel render**

Find the `{activeTool === "walls" && (` block (around lines 223–238). Replace it with:

```tsx
        {activeTool === "walls" && (
          <>
            <WallTypeChips
              activeType={wallsDrawMode === "draw" ? activeWallType : null}
              activeMaterial={activeMaterial}
              drawMode={wallsDrawMode === "draw"}
              onTypeChange={(t) => {
                if (t === null) onExitWallsDrawMode();
                else onEnterWallsDrawMode(t);
              }}
              onMaterialChange={onMaterialChange}
            />
            {wallsDrawMode === "browse" && selectedWall && (
              <WallConfigPanel
                wall={selectedWall}
                onUpdate={(patch) => onWallUpdate(selectedWall.id, patch)}
                onRemove={() => onRemoveWall(selectedWall.id)}
              />
            )}
          </>
        )}
```

- [ ] **Step 4: Update MapEditorToolbar.test.tsx baseProps**

Find the `// Fase 10 — walls` comment in `baseProps` (around lines 41–48). Replace that block with:

```typescript
  // Fase 10 — walls
  activeWallType: "wall" as const,
  activeMaterial: "stone" as const,
  wallsDrawMode: "browse" as const,
  onEnterWallsDrawMode: vi.fn(),
  onExitWallsDrawMode: vi.fn(),
  onMaterialChange: vi.fn(),
  selectedWall: null,
  onWallUpdate: vi.fn(),
  onRemoveWall: vi.fn(),
```

- [ ] **Step 5: Run existing tests to confirm nothing broke**

```bash
npx vitest run src/components/organisms/__tests__/MapEditorToolbar.test.tsx 2>&1 | tail -10
```

Expected: all tests pass (no failures).

- [ ] **Step 6: Verify TypeScript build**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in X.XXs`.

- [ ] **Step 7: Commit**

```bash
git add src/components/organisms/MapEditorToolbar.tsx \
        src/components/organisms/__tests__/MapEditorToolbar.test.tsx
git commit -m "feat(walls): MapEditorToolbar — Browse/Draw mode props, toggle WallTypeChips, conditional WallConfigPanel"
```

---

## Task 6: TacticalMapEditor — wallsDrawMode state + Delete key + prop wiring

**Files:**
- Modify: `src/features/tactical-map/TacticalMapEditor.tsx`

- [ ] **Step 1: Add wallsDrawMode local state**

Find the `// Wall tool local state` comment (around line 102). Add a new line after `activeMaterial` / `setActiveMaterial`:

```typescript
  const [wallsDrawMode, setWallsDrawMode] = useState<"browse" | "draw">("browse");
```

- [ ] **Step 2: Add enterWallsDrawMode + exitWallsDrawMode callbacks**

After the `wallsDrawMode` state line, add:

```typescript
  const enterWallsDrawMode = useCallback((type: WallType) => {
    setActiveWallType(type);
    setWallsDrawMode("draw");
  }, []);

  const exitWallsDrawMode = useCallback(() => {
    setWallsDrawMode("browse");
  }, []);
```

- [ ] **Step 3: Reset to Browse when leaving the walls tab**

After the existing useEffects (around line 180), add:

```typescript
  useEffect(() => {
    if (activeTool !== "walls") setWallsDrawMode("browse");
  }, [activeTool]);
```

- [ ] **Step 4: Add Delete key handler for selected wall**

In the existing keyboard handler `useEffect` (around line 190), find the block that starts with `const currentSelection = store.getState().selection;`. Add a Delete-key branch BEFORE that line:

```typescript
      if (e.key === "Delete") {
        const sel = store.getState().selection;
        if (sel?.kind === "wall") {
          store.getState().removeWallSegment(sel.id);
          store.getState().setSelection(null);
          return;
        }
      }
```

- [ ] **Step 5: Update MapEditorToolbar props**

Find the `// Fase 10 — walls` comment block in the `<MapEditorToolbar>` JSX (around lines 456–466). Replace that block with:

```tsx
          // Fase 10 — walls
          activeWallType={activeWallType}
          activeMaterial={activeMaterial}
          wallsDrawMode={wallsDrawMode}
          onEnterWallsDrawMode={enterWallsDrawMode}
          onExitWallsDrawMode={exitWallsDrawMode}
          onMaterialChange={setActiveMaterial}
          selectedWall={
            selection?.kind === "wall"
              ? (walls.find((w) => w.id === selection.id) ?? null)
              : null
          }
          onWallUpdate={updateWallSegment}
          onRemoveWall={(id) => { removeWallSegment(id); setSelection(null); }}
```

(`onWallTypeChange` line removed; three new props added.)

- [ ] **Step 6: Update TacticalMapStage props**

Find `wallsInteractive={activeTool === "walls"}` in the `<TacticalMapStage>` JSX (around line 504). After it, add:

```tsx
            drawingEnabled={activeTool === "walls" && wallsDrawMode === "draw"}
            onExitWallsDrawMode={exitWallsDrawMode}
```

- [ ] **Step 7: Verify TypeScript build**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in X.XXs`.

- [ ] **Step 8: Run all tests**

```bash
npx vitest run 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 9: Smoke test visual**

Start the dev server (`npm run dev`) and verify in the browser (http://localhost:5173):

1. Entrar na aba Paredes → modo badge mostra `SELECIONAR` (ponto cinza); arrastar o mapa funciona com botão esquerdo
2. Clicar em "Porta" → badge muda para `DESENHANDO · Porta` (ponto âmbar); chips de Material aparecem
3. Desenhar uma porta e finalizar → permanece em Draw mode
4. Pressionar Esc durante a construção → consolida o que foi feito, permanece em Draw
5. Pressionar Esc sem construção → badge volta a `SELECIONAR`
6. Clicar no chip "Porta" ativo → mesmo efeito do Esc (volta ao Browse)
7. No Browse, clicar em uma parede → badge `PAREDE SELECIONADA` aparece com chips de tipo/material
8. Trocar tipo/material e clicar Aplicar → parede atualizada no canvas
9. Clicar Deletar → parede removida
10. Selecionar parede e pressionar Delete → parede removida

- [ ] **Step 10: Commit**

```bash
git add src/features/tactical-map/TacticalMapEditor.tsx
git commit -m "feat(walls): TacticalMapEditor — wallsDrawMode state, Delete key, prop wiring"
```
