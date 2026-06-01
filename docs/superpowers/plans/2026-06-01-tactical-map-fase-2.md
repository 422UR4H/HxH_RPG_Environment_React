# Tactical Map — Fase 2: Editor de Malha — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `CreateMapPage` into a full grid editor (canvas + left sidebar) so the master can configure and save a tactical map grid.

**Architecture:** New `MapEditorTemplate` (sidebar + canvas, CSS-only responsive) + `MapEditorToolbar` organism (tabs + active panel) + `GridConfigPanel` molecule. `TacticalMapEditor` is rewritten as the orchestrator: it owns the Zustand store instance, handles save/isDirty/onbeforeunload, and renders the template. `CreateMapPage` and `EditMapPage` are thin orchestrators that inject `initialMap` and `onSave`.

**Tech Stack:** React 19, TypeScript (strict), Zustand + zundo + immer (editorStore), PixiJS v8 / @pixi/react v8 (TacticalMapStage, already implemented), styled-components, React Query, Vitest + RTL + msw.

---

## File Map

| Action | Path |
|---|---|
| CREATE | `src/hooks/useResizeObserver.ts` |
| CREATE | `src/features/tactical-map/defaultMap.ts` |
| MODIFY | `src/features/tactical-map/store/editorStore.ts` |
| CREATE | `src/features/tactical-map/store/__tests__/editorStore.test.ts` |
| CREATE | `src/components/templates/MapEditorTemplate.tsx` |
| CREATE | `src/components/molecules/GridConfigPanel.tsx` |
| CREATE | `src/components/molecules/__tests__/GridConfigPanel.test.tsx` |
| CREATE | `src/components/organisms/MapEditorToolbar.tsx` |
| CREATE | `src/components/organisms/__tests__/MapEditorToolbar.test.tsx` |
| MODIFY | `src/features/tactical-map/TacticalMapEditor.tsx` |
| MODIFY | `src/services/mapsService.ts` |
| MODIFY | `src/hooks/useCreateMap.ts` |
| MODIFY | `src/hooks/useUpdateMap.ts` |
| MODIFY | `src/pages/CreateMapPage.tsx` |
| MODIFY | `src/pages/__tests__/CreateMapPage.test.tsx` |
| MODIFY | `src/pages/EditMapPage.tsx` |
| CREATE | `src/pages/__tests__/EditMapPage.test.tsx` |

---

## Task 1: Foundation — `useResizeObserver` + `DEFAULT_MAP`

**Files:**
- Create: `src/hooks/useResizeObserver.ts`
- Create: `src/features/tactical-map/defaultMap.ts`

> No automated tests: `ResizeObserver` does not exist in jsdom. Validated visually via `/dev/tactical-map-demo`.

- [ ] **Step 1: Create `useResizeObserver`**

```ts
// src/hooks/useResizeObserver.ts
import { type RefObject, useEffect, useState } from "react";

export function useResizeObserver(ref: RefObject<Element | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}
```

- [ ] **Step 2: Create `DEFAULT_MAP`**

```ts
// src/features/tactical-map/defaultMap.ts
import type { TacticalMap } from "../../types/tacticalMap";

export const DEFAULT_GRID: TacticalMap["grid"] = {
  kind: "square",
  cols: 10,
  rows: 10,
  cellSize: 40,
  skewRatio: 1,
  rotation: 0,
  color: "#4a90a4",
  opacity: 0.6,
  lineStyle: "solid",
};

export const DEFAULT_MAP_FIELDS: Omit<
  TacticalMap,
  "id" | "campaignId" | "createdAt" | "updatedAt"
> = {
  name: "",
  description: "",
  grid: DEFAULT_GRID,
  bg: null,
  pieces: [],
  walls: [],
  decorations: [],
  items: [],
};
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useResizeObserver.ts src/features/tactical-map/defaultMap.ts
git commit -m "feat(tactical-map): useResizeObserver hook + DEFAULT_MAP fields"
```

---

## Task 2: Store — add `setName` and `setDescription`

**Files:**
- Modify: `src/features/tactical-map/store/editorStore.ts`
- Create: `src/features/tactical-map/store/__tests__/editorStore.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/features/tactical-map/store/__tests__/editorStore.test.ts
import { describe, it, expect } from "vitest";
import { createEditorStore } from "../editorStore";
import { mapFixture } from "../../../../test/fixtures/map";

describe("editorStore", () => {
  it("setName atualiza map.name e marca isDirty", () => {
    const store = createEditorStore(mapFixture);
    store.getState().setName("Novo Nome");
    expect(store.getState().map.name).toBe("Novo Nome");
    expect(store.getState().isDirty).toBe(true);
  });

  it("setDescription atualiza map.description e marca isDirty", () => {
    const store = createEditorStore(mapFixture);
    store.getState().setDescription("Nova desc");
    expect(store.getState().map.description).toBe("Nova desc");
    expect(store.getState().isDirty).toBe(true);
  });

  it("markClean reseta isDirty", () => {
    const store = createEditorStore(mapFixture);
    store.getState().setName("x");
    expect(store.getState().isDirty).toBe(true);
    store.getState().markClean();
    expect(store.getState().isDirty).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify fail**

```bash
npx vitest run src/features/tactical-map/store/__tests__/editorStore.test.ts
```

Expected: `FAIL — setName is not a function` (ou similar).

- [ ] **Step 3: Add `setName` and `setDescription` to the store**

Open `src/features/tactical-map/store/editorStore.ts`. Add to `EditorState` type and implementation:

```ts
// In EditorState type — add after setGrid:
setName: (name: string) => void;
setDescription: (desc: string) => void;
```

```ts
// In immer set — add after setGrid:
setName: (name) =>
  set((s) => {
    s.map.name = name;
    s.isDirty = true;
  }),
setDescription: (desc) =>
  set((s) => {
    s.map.description = desc;
    s.isDirty = true;
  }),
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx vitest run src/features/tactical-map/store/__tests__/editorStore.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/tactical-map/store/editorStore.ts \
        src/features/tactical-map/store/__tests__/editorStore.test.ts
git commit -m "feat(tactical-map): add setName and setDescription to editorStore"
```

---

## Task 3: `MapEditorTemplate`

**Files:**
- Create: `src/components/templates/MapEditorTemplate.tsx`

> No isolated test — covered by integration tests of CreateMapPage and EditMapPage.

- [ ] **Step 1: Create `MapEditorTemplate`**

```tsx
// src/components/templates/MapEditorTemplate.tsx
import type { ReactNode } from "react";
import styled from "styled-components";
import PageHeader from "../atoms/PageHeader";
import { colors } from "../../styles/tokens";

type Props = {
  sidebar: ReactNode;
  children: ReactNode;
  headerColor?: string;
  hideBack?: boolean;
};

export default function MapEditorTemplate({
  sidebar,
  children,
  headerColor = colors.brandPrimary,
  hideBack = false,
}: Props) {
  return (
    <PageContainer>
      <PageHeader backgroundColor={headerColor} showBack={!hideBack} />
      <PageBody>
        <Sidebar>{sidebar}</Sidebar>
        <CanvasArea>{children}</CanvasArea>
      </PageBody>
    </PageContainer>
  );
}

const PageContainer = styled.div`
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
`;

const PageBody = styled.main`
  display: flex;
  min-height: 0;
  color: ${colors.textPrimary};

  @media (max-width: 749px) {
    flex-direction: column;
  }
`;

const Sidebar = styled.div`
  width: 280px;
  flex-shrink: 0;
  background-color: ${colors.surfaceSidebar};
  overflow-y: auto;

  @media (max-width: 749px) {
    width: 100%;
    order: 2;
    max-height: 50vh;
  }
`;

const CanvasArea = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;

  @media (max-width: 749px) {
    order: 1;
    height: 50vh;
    flex: none;
  }
`;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/templates/MapEditorTemplate.tsx
git commit -m "feat(tactical-map): MapEditorTemplate (sidebar + canvas layout)"
```

---

## Task 4: `GridConfigPanel` (TDD)

**Files:**
- Create: `src/components/molecules/GridConfigPanel.tsx`
- Create: `src/components/molecules/__tests__/GridConfigPanel.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/molecules/__tests__/GridConfigPanel.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GridConfigPanel from "../GridConfigPanel";
import type { GridShape } from "../../../types/tacticalMap";

const defaultGrid: GridShape = {
  kind: "square",
  cols: 10,
  rows: 10,
  cellSize: 40,
  skewRatio: 1,
  rotation: 0,
  color: "#4a90a4",
  opacity: 0.6,
  lineStyle: "solid",
};

describe("GridConfigPanel", () => {
  it("renderiza botões de tipo e campos numéricos", () => {
    render(<GridConfigPanel grid={defaultGrid} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /quadrada/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hexagonal/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/colunas/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/linhas/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tamanho/i)).toBeInTheDocument();
  });

  it("clicar em Hexagonal chama onChange com kind hex", async () => {
    const onChange = vi.fn();
    render(<GridConfigPanel grid={defaultGrid} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /hexagonal/i }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "hex" }),
    );
  });

  it("alterar colunas chama onChange com novo valor numérico", async () => {
    const onChange = vi.fn();
    render(<GridConfigPanel grid={defaultGrid} onChange={onChange} />);
    const colsInput = screen.getByLabelText(/colunas/i);
    await userEvent.clear(colsInput);
    await userEvent.type(colsInput, "20");
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ cols: 20 }),
    );
  });

  it("botão do tipo ativo está visualmente marcado", () => {
    render(<GridConfigPanel grid={defaultGrid} onChange={() => {}} />);
    const squareBtn = screen.getByRole("button", { name: /quadrada/i });
    expect(squareBtn).toHaveAttribute("data-active", "true");
  });
});
```

- [ ] **Step 2: Run to verify fail**

```bash
npx vitest run src/components/molecules/__tests__/GridConfigPanel.test.tsx
```

Expected: `FAIL — Cannot find module '../GridConfigPanel'`.

- [ ] **Step 3: Implement `GridConfigPanel`**

```tsx
// src/components/molecules/GridConfigPanel.tsx
import styled from "styled-components";
import type { GridShape } from "../../types/tacticalMap";
import { colors, fonts } from "../../styles/tokens";

type Props = {
  grid: GridShape;
  onChange: (grid: GridShape) => void;
};

export default function GridConfigPanel({ grid, onChange }: Props) {
  const update = (patch: Partial<GridShape>) =>
    onChange({ ...grid, ...patch });

  const handleInt =
    (key: "cols" | "rows" | "cellSize", min: number, max: number) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v) && v >= min && v <= max) update({ [key]: v });
    };

  return (
    <Panel>
      <SectionTitle>Configurar Malha</SectionTitle>

      <Field>
        <FieldLabel>Tipo</FieldLabel>
        <KindRow>
          <KindButton
            type="button"
            data-active={grid.kind === "square"}
            onClick={() => update({ kind: "square" })}
          >
            Quadrada
          </KindButton>
          <KindButton
            type="button"
            data-active={grid.kind === "hex"}
            onClick={() => update({ kind: "hex" })}
          >
            Hexagonal
          </KindButton>
        </KindRow>
      </Field>

      <Field>
        <FieldLabel htmlFor="grid-cols">Colunas</FieldLabel>
        <NumInput
          id="grid-cols"
          type="number"
          value={grid.cols}
          min={1}
          max={200}
          onChange={handleInt("cols", 1, 200)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="grid-rows">Linhas</FieldLabel>
        <NumInput
          id="grid-rows"
          type="number"
          value={grid.rows}
          min={1}
          max={200}
          onChange={handleInt("rows", 1, 200)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="grid-cell-size">Tamanho (px)</FieldLabel>
        <NumInput
          id="grid-cell-size"
          type="number"
          value={grid.cellSize}
          min={8}
          max={256}
          onChange={handleInt("cellSize", 8, 256)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="grid-color">Cor da malha</FieldLabel>
        <input
          id="grid-color"
          type="color"
          value={grid.color}
          onChange={(e) => update({ color: e.target.value })}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="grid-opacity">
          Opacidade ({Math.round(grid.opacity * 100)}%)
        </FieldLabel>
        <input
          id="grid-opacity"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={grid.opacity}
          onChange={(e) => update({ opacity: parseFloat(e.target.value) })}
        />
      </Field>
    </Panel>
  );
}

const Panel = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionTitle = styled.h3`
  font-family: ${fonts.sans};
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${colors.textDisabled};
  margin: 0;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldLabel = styled.label`
  font-family: ${fonts.sans};
  font-size: 13px;
  font-weight: 600;
  color: ${colors.textDisabled};
`;

const KindRow = styled.div`
  display: flex;
  gap: 8px;
`;

const KindButton = styled.button<{ "data-active"?: boolean }>`
  flex: 1;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid ${colors.borderInput};
  background: ${({ "data-active": active }) =>
    active ? colors.brandAccent : "transparent"};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    filter: brightness(1.1);
  }
`;

const NumInput = styled.input`
  font-family: ${fonts.sans};
  font-size: 15px;
  color: ${colors.textPrimary};
  background: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  padding: 8px 12px;
  outline: none;

  &:focus {
    border-color: ${colors.brandAccentBright};
  }
`;
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx vitest run src/components/molecules/__tests__/GridConfigPanel.test.tsx
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/molecules/GridConfigPanel.tsx \
        src/components/molecules/__tests__/GridConfigPanel.test.tsx
git commit -m "feat(tactical-map): GridConfigPanel molecule (TDD)"
```

---

## Task 5: `MapEditorToolbar` (TDD)

**Files:**
- Create: `src/components/organisms/MapEditorToolbar.tsx`
- Create: `src/components/organisms/__tests__/MapEditorToolbar.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/organisms/__tests__/MapEditorToolbar.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MapEditorToolbar from "../MapEditorToolbar";
import type { ToolKind } from "../../../features/tactical-map/store/editorStore";
import { DEFAULT_GRID } from "../../../features/tactical-map/defaultMap";

const baseProps = {
  activeTool: "grid" as ToolKind,
  onToolChange: vi.fn(),
  grid: DEFAULT_GRID,
  onGridChange: vi.fn(),
  mapName: "",
  mapDescription: "",
  onNameChange: vi.fn(),
  onDescriptionChange: vi.fn(),
  isDirty: false,
  onSave: vi.fn(),
  isSaving: false,
  saveLabel: "Criar Mapa",
  nameError: null,
  saveError: null,
};

describe("MapEditorToolbar", () => {
  it("exibe todas as abas de ferramentas", () => {
    render(<MapEditorToolbar {...baseProps} />);
    expect(screen.getByRole("button", { name: /grade/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fundo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /peças/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /paredes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /decorações/i })).toBeInTheDocument();
  });

  it("abas não-grid estão desabilitadas", () => {
    render(<MapEditorToolbar {...baseProps} />);
    expect(screen.getByRole("button", { name: /fundo/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /peças/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /paredes/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /decorações/i })).toBeDisabled();
  });

  it("aba grid está habilitada e mostra GridConfigPanel", () => {
    render(<MapEditorToolbar {...baseProps} />);
    expect(screen.getByRole("button", { name: /grade/i })).not.toBeDisabled();
    expect(screen.getByLabelText(/colunas/i)).toBeInTheDocument();
  });

  it("campo nome renderiza e chama onNameChange ao digitar", async () => {
    render(<MapEditorToolbar {...baseProps} />);
    const nameInput = screen.getByPlaceholderText(/nome do mapa/i);
    await userEvent.type(nameInput, "A");
    expect(baseProps.onNameChange).toHaveBeenCalled();
  });

  it("botão salvar chama onSave ao clicar", async () => {
    render(<MapEditorToolbar {...baseProps} />);
    await userEvent.click(screen.getByRole("button", { name: /criar mapa/i }));
    expect(baseProps.onSave).toHaveBeenCalledOnce();
  });

  it("nameError é exibido abaixo do campo nome", () => {
    render(
      <MapEditorToolbar
        {...baseProps}
        nameError="O nome do mapa é obrigatório."
      />,
    );
    expect(
      screen.getByText(/O nome do mapa é obrigatório/i),
    ).toBeInTheDocument();
  });

  it("botão salvar fica desabilitado enquanto isSaving", () => {
    render(<MapEditorToolbar {...baseProps} isSaving />);
    expect(screen.getByRole("button", { name: /salvando/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run to verify fail**

```bash
npx vitest run src/components/organisms/__tests__/MapEditorToolbar.test.tsx
```

Expected: `FAIL — Cannot find module '../MapEditorToolbar'`.

- [ ] **Step 3: Implement `MapEditorToolbar`**

```tsx
// src/components/organisms/MapEditorToolbar.tsx
import styled from "styled-components";
import GridConfigPanel from "../molecules/GridConfigPanel";
import type { GridShape } from "../../types/tacticalMap";
import type { ToolKind } from "../../features/tactical-map/store/editorStore";
import { colors, fonts } from "../../styles/tokens";

type ToolDef = { kind: ToolKind; label: string; enabled: boolean };

const TOOLS: ToolDef[] = [
  { kind: "grid", label: "Grade", enabled: true },
  { kind: "bg", label: "Fundo", enabled: false },
  { kind: "pieces", label: "Peças", enabled: false },
  { kind: "walls", label: "Paredes", enabled: false },
  { kind: "decorations", label: "Decorações", enabled: false },
];

type Props = {
  activeTool: ToolKind;
  onToolChange: (tool: ToolKind) => void;
  grid: GridShape;
  onGridChange: (grid: GridShape) => void;
  mapName: string;
  mapDescription: string;
  onNameChange: (name: string) => void;
  onDescriptionChange: (desc: string) => void;
  isDirty: boolean;
  onSave: () => void;
  isSaving: boolean;
  saveLabel: string;
  nameError?: string | null;
  saveError?: string | null;
};

export default function MapEditorToolbar({
  activeTool,
  onToolChange,
  grid,
  onGridChange,
  mapName,
  mapDescription,
  onNameChange,
  onDescriptionChange,
  isDirty,
  onSave,
  isSaving,
  saveLabel,
  nameError,
  saveError,
}: Props) {
  return (
    <Wrapper>
      <TabRow>
        {TOOLS.map((t) => (
          <TabButton
            key={t.kind}
            type="button"
            disabled={!t.enabled}
            data-active={t.kind === activeTool}
            onClick={() => t.enabled && onToolChange(t.kind)}
          >
            {t.label}
          </TabButton>
        ))}
      </TabRow>

      <PanelArea>
        {activeTool === "grid" && (
          <GridConfigPanel grid={grid} onChange={onGridChange} />
        )}
      </PanelArea>

      <MetaSection>
        <FieldLabel htmlFor="map-name">Nome *</FieldLabel>
        <NameInput
          id="map-name"
          type="text"
          value={mapName}
          placeholder="Nome do mapa"
          maxLength={255}
          onChange={(e) => onNameChange(e.target.value)}
        />
        {nameError && <FieldError>{nameError}</FieldError>}

        <FieldLabel htmlFor="map-description">Descrição</FieldLabel>
        <DescInput
          id="map-description"
          value={mapDescription}
          placeholder="Descrição opcional"
          rows={3}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </MetaSection>

      <SaveArea>
        {saveError && <SaveError>{saveError}</SaveError>}
        <SaveButton
          type="button"
          disabled={isSaving}
          $dirty={isDirty}
          onClick={onSave}
        >
          {isSaving ? "Salvando..." : saveLabel}
        </SaveButton>
      </SaveArea>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const TabRow = styled.div`
  display: flex;
  gap: 2px;
  padding: 8px 8px 0;
  flex-wrap: wrap;
`;

const TabButton = styled.button<{ "data-active"?: boolean }>`
  flex: 1;
  min-width: 0;
  padding: 6px 4px;
  border: none;
  border-radius: 4px 4px 0 0;
  background: ${({ "data-active": active }) =>
    active ? colors.surfaceInput : "transparent"};
  color: ${({ disabled }) => (disabled ? colors.textDisabled : colors.textPrimary)};
  font-family: ${fonts.sans};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  opacity: ${({ disabled }) => (disabled ? 0.4 : 1)};
`;

const PanelArea = styled.div`
  flex: 1;
  overflow-y: auto;
  border-top: 1px solid ${colors.borderInput};
`;

const MetaSection = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid ${colors.borderInput};
`;

const FieldLabel = styled.label`
  font-family: ${fonts.sans};
  font-size: 13px;
  font-weight: 600;
  color: ${colors.textDisabled};
`;

const NameInput = styled.input`
  font-family: ${fonts.sans};
  font-size: 15px;
  color: ${colors.textPrimary};
  background: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  padding: 10px 12px;
  outline: none;

  &:focus {
    border-color: ${colors.brandAccentBright};
  }

  &::placeholder {
    color: ${colors.textPlaceholder};
  }
`;

const DescInput = styled.textarea`
  font-family: ${fonts.sans};
  font-size: 14px;
  color: ${colors.textPrimary};
  background: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  padding: 10px 12px;
  resize: vertical;
  outline: none;

  &:focus {
    border-color: ${colors.brandAccentBright};
  }

  &::placeholder {
    color: ${colors.textPlaceholder};
  }
`;

const FieldError = styled.p`
  font-family: ${fonts.sans};
  font-size: 13px;
  color: ${colors.accentDanger};
  margin: 0;
`;

const SaveArea = styled.div`
  padding: 16px;
  border-top: 1px solid ${colors.borderInput};
`;

const SaveError = styled.p`
  font-family: ${fonts.sans};
  font-size: 13px;
  color: ${colors.accentDanger};
  margin: 0 0 8px;
`;

const SaveButton = styled.button<{ $dirty: boolean }>`
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 6px;
  background: ${({ $dirty }) =>
    $dirty ? colors.brandAccent : colors.surfaceInput};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.15s;

  &:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx vitest run src/components/organisms/__tests__/MapEditorToolbar.test.tsx
```

Expected: 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/organisms/MapEditorToolbar.tsx \
        src/components/organisms/__tests__/MapEditorToolbar.test.tsx
git commit -m "feat(tactical-map): MapEditorToolbar organism (TDD)"
```

---

## Task 6: Rewrite `TacticalMapEditor`

**Files:**
- Modify: `src/features/tactical-map/TacticalMapEditor.tsx`

> No isolated test — all behavior is covered by the integration tests in Tasks 8 and 9.

- [ ] **Step 1: Rewrite `TacticalMapEditor`**

```tsx
// src/features/tactical-map/TacticalMapEditor.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import MapEditorTemplate from "../../components/templates/MapEditorTemplate";
import MapEditorToolbar from "../../components/organisms/MapEditorToolbar";
import TacticalMapStage from "../../components/organisms/TacticalMapStage";
import { useResizeObserver } from "../../hooks/useResizeObserver";
import { createEditorStore } from "./store/editorStore";
import type { EditorStore } from "./store/editorStore";
import type { TacticalMap } from "../../types/tacticalMap";

type Props = {
  campaignId: string;
  initialMap: TacticalMap;
  onSave: (map: TacticalMap) => Promise<void>;
  onSaveSuccess?: () => void;
  saveLabel?: string;
};

export default function TacticalMapEditor({
  initialMap,
  onSave,
  onSaveSuccess,
  saveLabel = "Salvar",
}: Props) {
  const storeRef = useRef<EditorStore | null>(null);
  if (!storeRef.current) storeRef.current = createEditorStore(initialMap);
  const store = storeRef.current;

  const map = store((s) => s.map);
  const isDirty = store((s) => s.isDirty);
  const activeTool = store((s) => s.activeTool);
  const setGrid = store((s) => s.setGrid);
  const setName = store((s) => s.setName);
  const setDescription = store((s) => s.setDescription);
  const setActiveTool = store((s) => s.setActiveTool);
  const markClean = store((s) => s.markClean);

  const canvasRef = useRef<HTMLDivElement>(null);
  const { width, height } = useResizeObserver(canvasRef);

  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Protect unsaved changes on tab close
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Persist draft to localStorage
  useEffect(() => {
    if (!isDirty) return;
    const key = map.id
      ? `tactical-map-draft:${map.id}`
      : "tactical-map-draft:new";
    localStorage.setItem(key, JSON.stringify(map));
  }, [map, isDirty]);

  const handleSave = async () => {
    if (!map.name.trim()) {
      setNameError("O nome do mapa é obrigatório.");
      return;
    }
    setNameError(null);
    setSaveError(null);
    setIsSaving(true);
    try {
      await onSave(map);
      markClean();
      onSaveSuccess?.();
    } catch {
      setSaveError(
        "Não foi possível salvar. Suas alterações estão protegidas localmente.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MapEditorTemplate
      sidebar={
        <MapEditorToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          grid={map.grid}
          onGridChange={setGrid}
          mapName={map.name}
          mapDescription={map.description ?? ""}
          onNameChange={setName}
          onDescriptionChange={setDescription}
          isDirty={isDirty}
          onSave={handleSave}
          isSaving={isSaving}
          saveLabel={saveLabel}
          nameError={nameError}
          saveError={saveError}
        />
      }
    >
      <div ref={canvasRef} style={{ width: "100%", height: "100%" }}>
        {width > 0 && height > 0 && (
          <TacticalMapStage map={map} width={width} height={height} />
        )}
      </div>
    </MapEditorTemplate>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/tactical-map/TacticalMapEditor.tsx
git commit -m "feat(tactical-map): rewrite TacticalMapEditor as editor orchestrator"
```

---

## Task 7: Update `mapsService` and hooks

**Files:**
- Modify: `src/services/mapsService.ts`
- Modify: `src/hooks/useCreateMap.ts`
- Modify: `src/hooks/useUpdateMap.ts`

> No new tests — service changes are covered by integration tests in Tasks 8 and 9.

**Context:** The Phase 1 API contract for `POST /campaigns/:id/maps` accepts `{name, description}`. The backend already validates grid fields (422 includes `cell_size ≤ 0`, etc.), so it accepts `grid` in both POST and PUT. `mapsService.updateMap` had a wrong return type (`Promise<TacticalMap>`) for a 204 response — fixing it here.

- [ ] **Step 1: Update `mapsService.createMap` to accept `grid`**

In `src/services/mapsService.ts`, update `createMap`:

```ts
import type { TacticalMap, GridShape } from "../types/tacticalMap";

// Replace the createMap entry with:
createMap: (
  token: string,
  campaignId: string,
  data: { name: string; description?: string; grid?: GridShape },
): Promise<TacticalMap> =>
  httpClient
    .post<{ map: TacticalMap }>(
      `/campaigns/${campaignId}/maps`,
      objToSnakeCase(data),
      config(token),
    )
    .then(({ data: res }) => objToCamelCase<TacticalMap>(res.map)),
```

- [ ] **Step 2: Fix `updateMap` return type (204 has no body)**

In the same file, replace `updateMap`:

```ts
updateMap: (token: string, mapId: string, data: object): Promise<void> =>
  httpClient
    .put(`/maps/${mapId}`, objToSnakeCase(data), config(token))
    .then(() => undefined),
```

- [ ] **Step 3: Update `useCreateMap` to accept `grid`**

Replace the full content of `src/hooks/useCreateMap.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";
import type { GridShape } from "../types/tacticalMap";

export function useCreateMap(
  token: string | null,
  campaignId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      grid?: GridShape;
    }) => mapsService.createMap(token!, campaignId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["maps", campaignId, token],
      });
    },
  });
}
```

- [ ] **Step 4: Update `useUpdateMap` return type**

Replace the full content of `src/hooks/useUpdateMap.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";

export function useUpdateMap(
  token: string | null,
  campaignId: string | undefined,
  mapId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: object) =>
      mapsService.updateMap(token!, mapId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maps", campaignId, token] });
      queryClient.invalidateQueries({ queryKey: ["map", mapId, token] });
    },
  });
}
```

- [ ] **Step 5: Run full test suite to verify no regressions**

```bash
npx vitest run
```

Expected: all existing tests PASS (no tests depend on `updateMap` return value).

- [ ] **Step 6: Commit**

```bash
git add src/services/mapsService.ts src/hooks/useCreateMap.ts src/hooks/useUpdateMap.ts
git commit -m "fix(maps): createMap accepts grid; updateMap return type corrected to void"
```

---

## Task 8: Rewrite `CreateMapPage` (TDD)

**Files:**
- Modify: `src/pages/__tests__/CreateMapPage.test.tsx`
- Modify: `src/pages/CreateMapPage.tsx`

- [ ] **Step 1: Rewrite the test file**

The existing tests check the old form UI (placeholder texts, button labels) — replace the file entirely:

```tsx
// src/pages/__tests__/CreateMapPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { masterUserFixture } from "../../test/fixtures/user";
import { mapFixture } from "../../test/fixtures/map";
import CreateMapPage from "../CreateMapPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseUrl = "http://localhost:5000";

function renderPage() {
  return renderWithProviders(<CreateMapPage />, {
    route: "/campaigns/campaign-1/maps/new",
    path: "/campaigns/:campaignId/maps/new",
    user: masterUserFixture,
  });
}

describe("CreateMapPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("exibe campo de nome do mapa na toolbar", () => {
    renderPage();
    expect(screen.getByPlaceholderText(/nome do mapa/i)).toBeInTheDocument();
  });

  it("clicar Salvar sem nome exibe erro em português", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /criar mapa/i }));
    expect(
      await screen.findByText(/O nome do mapa é obrigatório/i),
    ).toBeInTheDocument();
  });

  it("salvar com nome chama POST e navega para /campaigns/:id", async () => {
    server.use(
      http.post(`${baseUrl}/campaigns/:campaignId/maps`, () =>
        HttpResponse.json({ map: mapFixture }, { status: 201 }),
      ),
    );
    renderPage();
    await userEvent.type(
      screen.getByPlaceholderText(/nome do mapa/i),
      "Floresta do Norte",
    );
    await userEvent.click(screen.getByRole("button", { name: /criar mapa/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/campaigns/campaign-1");
    });
  });

  it("erro do servidor exibe mensagem de fallback sem navegar", async () => {
    server.use(
      http.post(`${baseUrl}/campaigns/:campaignId/maps`, () =>
        HttpResponse.json({ detail: "unexpected_error" }, { status: 422 }),
      ),
    );
    renderPage();
    await userEvent.type(
      screen.getByPlaceholderText(/nome do mapa/i),
      "Mapa X",
    );
    await userEvent.click(screen.getByRole("button", { name: /criar mapa/i }));
    expect(
      await screen.findByText(/Não foi possível salvar/i),
    ).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("digitar no nome registra beforeunload handler", async () => {
    const addEventSpy = vi.spyOn(window, "addEventListener");
    renderPage();
    await userEvent.type(
      screen.getByPlaceholderText(/nome do mapa/i),
      "A",
    );
    expect(addEventSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
    addEventSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run to verify fail**

```bash
npx vitest run src/pages/__tests__/CreateMapPage.test.tsx
```

Expected: 5 tests FAIL (old page doesn't have "Nome do mapa" placeholder or the new save flow).

- [ ] **Step 3: Rewrite `CreateMapPage`**

```tsx
// src/pages/CreateMapPage.tsx
import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useToken from "../hooks/useToken";
import { useCreateMap } from "../hooks/useCreateMap";
import TacticalMapEditor from "../features/tactical-map/TacticalMapEditor";
import { DEFAULT_MAP_FIELDS } from "../features/tactical-map/defaultMap";
import type { TacticalMap } from "../types/tacticalMap";

export default function CreateMapPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { token } = useToken();
  const { mutateAsync } = useCreateMap(token, campaignId);

  const initialMap = useMemo<TacticalMap>(
    () => ({
      ...DEFAULT_MAP_FIELDS,
      id: crypto.randomUUID(),
      campaignId: campaignId ?? "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (!token) return null;

  const handleSave = async (map: TacticalMap) => {
    await mutateAsync({
      name: map.name.trim(),
      description: map.description?.trim() || undefined,
      grid: map.grid,
    });
  };

  return (
    <TacticalMapEditor
      campaignId={campaignId ?? ""}
      initialMap={initialMap}
      onSave={handleSave}
      onSaveSuccess={() => navigate(`/campaigns/${campaignId}`)}
      saveLabel="Criar Mapa"
    />
  );
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx vitest run src/pages/__tests__/CreateMapPage.test.tsx
```

Expected: 5 tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/CreateMapPage.tsx src/pages/__tests__/CreateMapPage.test.tsx
git commit -m "feat(tactical-map): rewrite CreateMapPage as grid editor (TDD)"
```

---

## Task 9: Implement `EditMapPage` (TDD)

**Files:**
- Modify: `src/pages/EditMapPage.tsx`
- Create: `src/pages/__tests__/EditMapPage.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/pages/__tests__/EditMapPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { masterUserFixture } from "../../test/fixtures/user";
import { mapFixture } from "../../test/fixtures/map";
import EditMapPage from "../EditMapPage";

const baseUrl = "http://localhost:5000";

function renderPage() {
  server.use(
    http.get(`${baseUrl}/maps/:mapId`, () =>
      HttpResponse.json({ map: mapFixture }, { status: 200 }),
    ),
  );
  return renderWithProviders(<EditMapPage />, {
    route: "/campaigns/campaign-1/maps/map-1/edit",
    path: "/campaigns/:campaignId/maps/:mapId/edit",
    user: masterUserFixture,
  });
}

describe("EditMapPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exibe loading enquanto carrega o mapa", () => {
    server.use(
      http.get(`${baseUrl}/maps/:mapId`, async () => {
        await new Promise(() => {}); // never resolves
      }),
    );
    renderWithProviders(<EditMapPage />, {
      route: "/campaigns/campaign-1/maps/map-1/edit",
      path: "/campaigns/:campaignId/maps/:mapId/edit",
      user: masterUserFixture,
    });
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it("após carregar, exibe o nome do mapa no campo", async () => {
    renderPage();
    const nameInput = await screen.findByPlaceholderText(/nome do mapa/i);
    expect(nameInput).toHaveValue(mapFixture.name);
  });

  it("salvar chama PUT com os dados atualizados", async () => {
    let capturedBody: unknown;
    server.use(
      http.put(`${baseUrl}/maps/:mapId`, async ({ request }) => {
        capturedBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderPage();
    await screen.findByPlaceholderText(/nome do mapa/i);
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));
    await waitFor(() => {
      expect(capturedBody).toMatchObject({ name: mapFixture.name });
    });
  });

  it("após salvar, permanece na página (sem navegar)", async () => {
    const mockNavigate = vi.fn();
    vi.mock("react-router-dom", async () => {
      const actual =
        await vi.importActual<typeof import("react-router-dom")>(
          "react-router-dom",
        );
      return { ...actual, useNavigate: () => mockNavigate };
    });
    server.use(
      http.put(`${baseUrl}/maps/:mapId`, () =>
        new HttpResponse(null, { status: 204 }),
      ),
    );
    renderPage();
    await screen.findByPlaceholderText(/nome do mapa/i);
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/nome do mapa/i)).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify fail**

```bash
npx vitest run src/pages/__tests__/EditMapPage.test.tsx
```

Expected: tests FAIL (current EditMapPage is a placeholder).

- [ ] **Step 3: Implement `EditMapPage`**

```tsx
// src/pages/EditMapPage.tsx
import { Navigate, useParams } from "react-router-dom";
import useToken from "../hooks/useToken";
import { useMap } from "../hooks/useMap";
import { useUpdateMap } from "../hooks/useUpdateMap";
import TacticalMapEditor from "../features/tactical-map/TacticalMapEditor";
import { LoadingContainer } from "../components/atoms/PageStates";
import type { TacticalMap } from "../types/tacticalMap";

export default function EditMapPage() {
  const { campaignId, mapId } = useParams<{
    campaignId: string;
    mapId: string;
  }>();
  const { token } = useToken();
  const { data: map, isLoading } = useMap(token, mapId);
  const { mutateAsync } = useUpdateMap(token, campaignId, mapId);

  if (!token) return <Navigate to="/" replace />;
  if (isLoading || !map) return <LoadingContainer>Carregando mapa...</LoadingContainer>;

  const handleSave = async (updatedMap: TacticalMap) => {
    await mutateAsync({
      name: updatedMap.name.trim(),
      description: updatedMap.description?.trim() || undefined,
      grid: updatedMap.grid,
    });
  };

  return (
    <TacticalMapEditor
      campaignId={campaignId ?? ""}
      initialMap={map}
      onSave={handleSave}
    />
  );
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx vitest run src/pages/__tests__/EditMapPage.test.tsx
```

Expected: 4 tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/EditMapPage.tsx src/pages/__tests__/EditMapPage.test.tsx
git commit -m "feat(tactical-map): implement EditMapPage as grid editor (TDD)"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| `CreateMapPage` com canvas central + toolbar lateral | Tasks 3, 5, 6, 8 |
| `GridConfigPanel`: kind, cols, rows, cellSize, color, opacity | Task 4 |
| `TacticalMapStage` renderiza malha configurada | Tasks 6 (Stage já existe) |
| pixi-viewport pan + pinch-zoom | Stage já implementado desde Fase 0 |
| Botão Salvar persiste no backend | Tasks 7, 8, 9 |
| Indicador `isDirty` (botão laranja) | Task 5 (`$dirty` prop no SaveButton) |
| `navigator.onbeforeunload` | Task 6 + testado em Task 8 |
| `EditMapPage` funcional | Task 9 |
| Loading guard em `EditMapPage` | Task 9 |
| Abas visíveis (grid ativa, resto desabilitada) | Task 5 |
| Nome + descrição na sidebar | Task 5 |
| Layout mobile (sidebar embaixo) | Task 3 (CSS media query) |
| Default map com grid 10×10 | Task 1 |
| Draft em localStorage | Task 6 |

**Placeholder scan:** nenhum TBD encontrado.

**Type consistency:**
- `EditorState.setName` / `setDescription` definidos em Task 2, usados em Task 6 ✓
- `MapEditorToolbarProps` definido em Task 5, consumido em Task 6 ✓
- `TacticalMapEditorProps.onSaveSuccess` definido em Task 6, usado em Task 8 ✓
- `DEFAULT_MAP_FIELDS` definido em Task 1, usado em Task 8 ✓
- `useCreateMap` com `grid?: GridShape` definido em Task 7, usado em Task 8 ✓
- `useUpdateMap` com `Promise<void>` definido em Task 7, usado em Task 9 ✓
