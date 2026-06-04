# Tactical Map — Fase 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidar o editor do mestre com undo/redo funcional, menu responsivo até <320px, pontas soltas da Fase 4 fechadas, componente `InlineFeedback` com auto-dismiss e guard de navegação não-salva.

**Architecture:** (1) `editorStore` recebe higiene de histórico — `partialize` só rastreia `map`, `handleSet` com trailing-debounce 400ms agrupa mudanças contínuas num único passo de undo, `limit: 100`. (2) Hook `useEditorHistory` expõe undo/redo/canUndo/canRedo. (3) `NavGuardProvider` (novo contexto) é consultado por `BackButton` e `LogoButton` antes de navegar; o editor registra um guard quando `isDirty`. (4) Responsivo via `container-type: inline-size` + `clamp()`/`cqi` no conteúdo do menu — layout estrutural (canvas em cima, menu embaixo) não muda.

**Tech Stack:** React 19, zustand v5, zundo v2.3, immer, react-router-dom v7 (BrowserRouter clássico — `useBlocker` não disponível), styled-components, Vitest + Testing Library.

---

## Mapa de arquivos

### Novos
| Arquivo | Responsabilidade |
|---|---|
| `src/utils/debounce.ts` | Trailing debounce sem dependência |
| `src/features/tactical-map/hooks/useEditorHistory.ts` | Expõe undo/redo do zundo |
| `src/features/tactical-map/hooks/__tests__/useEditorHistory.test.ts` | Testes do hook |
| `src/components/ions/InlineFeedback.tsx` | Aviso inline com auto-dismiss encapsulado |
| `src/components/ions/__tests__/InlineFeedback.test.tsx` | Testes do componente |
| `src/contexts/NavGuardContext.tsx` | Contexto + `useNavGuard` |
| `src/contexts/__tests__/NavGuardContext.test.tsx` | Testes do contexto e dos botões |

### Modificados
| Arquivo | O que muda |
|---|---|
| `src/features/tactical-map/store/editorStore.ts` | `partialize` só `map`; `handleSet` debounce; `limit: 100`; nova action `markDirty` |
| `src/features/tactical-map/store/__tests__/editorStore.test.ts` | Novos testes de histórico |
| `src/features/tactical-map/TacticalMapEditor.tsx` | Keyboard handler; wiring `isDraggingPieceToRoster`; `ConfirmDialog` async p/ truncamento; `InlineFeedback` de "Salvo!"; registro do NavGuard |
| `src/components/organisms/TacticalMapStage.tsx` | Props `onPieceDragStart`/`onPieceDragEnd`; repassar ao `PiecesLayer` |
| `src/components/organisms/MapEditorToolbar.tsx` | Botões desfazer/refazer; `container-type: inline-size`; estilos responsivos |
| `src/components/molecules/GridConfigPanel.tsx` | Estilos responsivos (`clamp`, alvos de toque) |
| `src/components/molecules/PiecePropertyPanel.tsx` | Estilos responsivos |
| `src/components/molecules/NpcRosterPanel.tsx` | SearchInput toque mínimo |
| `src/components/ions/BackButton.tsx` | Consulta `confirmNavigation()` antes de `navigate(-1)` |
| `src/components/atoms/LogoButton.tsx` | Consulta `confirmNavigation()` antes de `navigate("/")` |
| `src/App.tsx` | Envolve rotas com `NavGuardProvider` |

---

## Task 1: `debounce` util

**Files:**
- Create: `src/utils/debounce.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
// src/utils/debounce.ts
// Trailing debounce: agrupa chamadas rápidas em uma só, disparada após `ms` de inatividade.
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number,
): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Args) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/debounce.ts
git commit -m "feat(utils): add debounce utility"
```

---

## Task 2: `editorStore` — higiene de histórico + `markDirty`

**Files:**
- Modify: `src/features/tactical-map/store/editorStore.ts`
- Modify: `src/features/tactical-map/store/__tests__/editorStore.test.ts`

O store já usa `temporal(immer(...))` do zundo. Problemas atuais:
1. `partialize` rastreia `{ map, activeTool }` → trocar de aba cria um passo de undo (errado).
2. Sem `handleSet` → cada tick de slider cria um snapshot (inutilizável).
3. Sem `limit` → histórico cresce indefinidamente.
4. Não há `markDirty` → undo/redo não conseguem marcar `isDirty = true`.

- [ ] **Step 1: Escrever testes novos (falham antes da mudança)**

Adicionar ao final de `src/features/tactical-map/store/__tests__/editorStore.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEditorStore } from "../editorStore";
import { mapFixture } from "../../../../test/fixtures/map";

// ... (manter testes existentes acima)

describe("editorStore — histórico zundo", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("setGrid cria um passo no histórico após debounce", () => {
    const store = createEditorStore(mapFixture);
    store.getState().setGrid({ ...mapFixture.grid, cols: 10 });
    expect(store.temporal.getState().pastStates).toHaveLength(0); // ainda não disparou
    vi.advanceTimersByTime(400);
    expect(store.temporal.getState().pastStates).toHaveLength(1);
  });

  it("setActiveTool NÃO cria passo no histórico (fora do partialize)", () => {
    const store = createEditorStore(mapFixture);
    store.getState().setActiveTool("bg");
    vi.advanceTimersByTime(400);
    expect(store.temporal.getState().pastStates).toHaveLength(0);
  });

  it("undo restaura map.grid ao estado anterior", () => {
    const store = createEditorStore(mapFixture);
    const originalCols = mapFixture.grid.cols;
    store.getState().setGrid({ ...mapFixture.grid, cols: 10 });
    vi.advanceTimersByTime(400);
    store.temporal.getState().undo();
    expect(store.getState().map.grid.cols).toBe(originalCols);
  });

  it("redo reaplicar mudança desfeita", () => {
    const store = createEditorStore(mapFixture);
    store.getState().setGrid({ ...mapFixture.grid, cols: 10 });
    vi.advanceTimersByTime(400);
    store.temporal.getState().undo();
    store.temporal.getState().redo();
    expect(store.getState().map.grid.cols).toBe(10);
  });

  it("markDirty marca isDirty como true", () => {
    const store = createEditorStore(mapFixture);
    store.getState().markClean();
    expect(store.getState().isDirty).toBe(false);
    store.getState().markDirty();
    expect(store.getState().isDirty).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar para confirmar que falham**

```bash
npx vitest run src/features/tactical-map/store/__tests__/editorStore.test.ts
```

Esperado: falhas nos novos testes (`markDirty is not a function`, asserções de histórico).

- [ ] **Step 3: Atualizar `editorStore.ts`**

Substituir o conteúdo completo de `src/features/tactical-map/store/editorStore.ts`:

```ts
import { create } from "zustand";
import { temporal } from "zundo";
import { immer } from "zustand/middleware/immer";
import { debounce } from "../../../utils/debounce";
import type {
  BgImage,
  GridShape,
  Piece,
  SlotCoord,
  TacticalMap,
} from "../../../types/tacticalMap";

export type ToolKind = "grid" | "bg" | "pieces" | "walls" | "decorations";

export type Selection =
  | { kind: "piece"; id: string }
  | { kind: "decoration"; id: string }
  | null;

export type EditorState = {
  map: TacticalMap;
  isDirty: boolean;
  activeTool: ToolKind;
  selection: Selection;

  setGrid: (grid: GridShape) => void;
  setName: (name: string) => void;
  setDescription: (desc: string) => void;
  setBg: (bg: BgImage | null) => void;
  placePiece: (piece: Piece) => void;
  movePiece: (pieceId: string, slot: SlotCoord) => void;
  setPieceZ: (pieceId: string, z: number) => void;
  removePiece: (pieceId: string) => void;
  setActiveTool: (tool: ToolKind) => void;
  setSelection: (sel: Selection) => void;
  markClean: () => void;
  markDirty: () => void;
};

export function createEditorStore(initialMap: TacticalMap) {
  return create<EditorState>()(
    temporal(
      immer((set) => ({
        map: initialMap,
        isDirty: false,
        activeTool: "grid",
        selection: null,

        setGrid: (grid) =>
          set((s) => {
            s.map.grid = grid;
            s.isDirty = true;
          }),
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
        setBg: (bg) =>
          set((s) => {
            s.map.bg = bg;
            s.isDirty = true;
          }),
        placePiece: (piece) =>
          set((s) => {
            s.map.pieces.push(piece);
            s.isDirty = true;
          }),
        movePiece: (pieceId, slot) =>
          set((s) => {
            const p = s.map.pieces.find((x) => x.id === pieceId);
            if (p) {
              p.coord.slot = slot;
              s.isDirty = true;
            }
          }),
        setPieceZ: (pieceId, z) =>
          set((s) => {
            const p = s.map.pieces.find((x) => x.id === pieceId);
            if (p) {
              p.coord.z = z;
              s.isDirty = true;
            }
          }),
        removePiece: (pieceId) =>
          set((s) => {
            s.map.pieces = s.map.pieces.filter((x) => x.id !== pieceId);
            s.isDirty = true;
          }),
        setActiveTool: (tool) =>
          set((s) => {
            s.activeTool = tool;
          }),
        setSelection: (sel) =>
          set((s) => {
            s.selection = sel;
          }),
        markClean: () =>
          set((s) => {
            s.isDirty = false;
          }),
        markDirty: () =>
          set((s) => {
            s.isDirty = true;
          }),
      })),
      {
        // Rastrear apenas `map` — mudanças em activeTool/selection/isDirty
        // não criam passos de undo (são estado de UI, não de conteúdo).
        partialize: (state) => ({ map: state.map }),
        // Trailing debounce de 400ms: agrupa mudanças contínuas (sliders)
        // num único snapshot. Efeito colateral: ações discretas (placePiece,
        // movePiece) entram no histórico após ~400ms. Aceito pelo spec.
        handleSet: (handleSet) => debounce(handleSet, 400),
        limit: 100,
      },
    ),
  );
}

export type EditorStore = ReturnType<typeof createEditorStore>;
```

- [ ] **Step 4: Rodar os testes**

```bash
npx vitest run src/features/tactical-map/store/__tests__/editorStore.test.ts
```

Esperado: todos passam.

- [ ] **Step 5: Commit**

```bash
git add src/features/tactical-map/store/editorStore.ts \
        src/features/tactical-map/store/__tests__/editorStore.test.ts
git commit -m "feat(editor-store): add markDirty, fix partialize, add handleSet debounce and limit"
```

---

## Task 3: Hook `useEditorHistory`

**Files:**
- Create: `src/features/tactical-map/hooks/useEditorHistory.ts`
- Create: `src/features/tactical-map/hooks/__tests__/useEditorHistory.test.ts`

- [ ] **Step 1: Escrever o teste**

```ts
// src/features/tactical-map/hooks/__tests__/useEditorHistory.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createEditorStore } from "../../store/editorStore";
import { useEditorHistory } from "../useEditorHistory";
import { mapFixture } from "../../../../test/fixtures/map";

describe("useEditorHistory", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("canUndo é false quando não há histórico", () => {
    const store = createEditorStore(mapFixture);
    const { result } = renderHook(() => useEditorHistory(store));
    expect(result.current.canUndo).toBe(false);
  });

  it("canUndo é true após uma mudança + debounce", () => {
    const store = createEditorStore(mapFixture);
    const { result } = renderHook(() => useEditorHistory(store));
    act(() => {
      store.getState().setGrid({ ...mapFixture.grid, cols: 10 });
      vi.advanceTimersByTime(400);
    });
    expect(result.current.canUndo).toBe(true);
  });

  it("undo restaura estado e marca isDirty", () => {
    const store = createEditorStore(mapFixture);
    const { result } = renderHook(() => useEditorHistory(store));
    act(() => {
      store.getState().setGrid({ ...mapFixture.grid, cols: 10 });
      vi.advanceTimersByTime(400);
    });
    act(() => { result.current.undo(); });
    expect(store.getState().map.grid.cols).toBe(mapFixture.grid.cols);
    expect(store.getState().isDirty).toBe(true);
  });

  it("canRedo é true após undo", () => {
    const store = createEditorStore(mapFixture);
    const { result } = renderHook(() => useEditorHistory(store));
    act(() => {
      store.getState().setGrid({ ...mapFixture.grid, cols: 10 });
      vi.advanceTimersByTime(400);
    });
    act(() => { result.current.undo(); });
    expect(result.current.canRedo).toBe(true);
  });

  it("redo reaplicar e marca isDirty", () => {
    const store = createEditorStore(mapFixture);
    const { result } = renderHook(() => useEditorHistory(store));
    act(() => {
      store.getState().setGrid({ ...mapFixture.grid, cols: 10 });
      vi.advanceTimersByTime(400);
    });
    act(() => { result.current.undo(); });
    act(() => { result.current.redo(); });
    expect(store.getState().map.grid.cols).toBe(10);
    expect(store.getState().isDirty).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
npx vitest run src/features/tactical-map/hooks/__tests__/useEditorHistory.test.ts
```

Esperado: `Cannot find module '../useEditorHistory'`.

- [ ] **Step 3: Criar o hook**

```ts
// src/features/tactical-map/hooks/useEditorHistory.ts
import { useStore } from "zustand";
import type { EditorStore } from "../store/editorStore";

export function useEditorHistory(store: EditorStore) {
  const temporalUndo  = useStore(store.temporal, (s) => s.undo);
  const temporalRedo  = useStore(store.temporal, (s) => s.redo);
  const canUndo       = useStore(store.temporal, (s) => s.pastStates.length > 0);
  const canRedo       = useStore(store.temporal, (s) => s.futureStates.length > 0);
  const markDirty     = store((s) => s.markDirty);

  const undo = () => { temporalUndo(); markDirty(); };
  const redo = () => { temporalRedo(); markDirty(); };

  return { undo, redo, canUndo, canRedo };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npx vitest run src/features/tactical-map/hooks/__tests__/useEditorHistory.test.ts
```

Esperado: 5 testes passando.

- [ ] **Step 5: Commit**

```bash
git add src/features/tactical-map/hooks/useEditorHistory.ts \
        src/features/tactical-map/hooks/__tests__/useEditorHistory.test.ts
git commit -m "feat(tactical-map): add useEditorHistory hook (undo/redo/canUndo/canRedo)"
```

---

## Task 4: Botões de Desfazer/Refazer no `MapEditorToolbar`

**Files:**
- Modify: `src/components/organisms/MapEditorToolbar.tsx`

Adiciona os botões e inicia o `container-type: inline-size` para o Bloco 2 (responsivo). Os botões dependem do `canUndo`/`canRedo` vindos do pai (`TacticalMapEditor`).

- [ ] **Step 1: Adicionar props ao `MapEditorToolbar`**

Em `src/components/organisms/MapEditorToolbar.tsx`, adicionar no `type Props`:

```ts
// Adicionar dentro de type Props:
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
```

E nos parâmetros da função:

```ts
// Adicionar na desestruturação:
  onUndo,
  onRedo,
  canUndo,
  canRedo,
```

- [ ] **Step 2: Inserir a `HistoryRow` após `<TabRow>` no JSX**

Localizar a `<TabRow>` no return e adicionar logo depois:

```tsx
<TabRow>
  {/* ... tabs existentes ... */}
</TabRow>

<HistoryRow>
  <HistoryButton
    type="button"
    disabled={!canUndo}
    onClick={onUndo}
    aria-label="Desfazer"
    title="Desfazer (Ctrl+Z)"
  >
    ↺ Desfazer
  </HistoryButton>
  <HistoryButton
    type="button"
    disabled={!canRedo}
    onClick={onRedo}
    aria-label="Refazer"
    title="Refazer (Shift+Ctrl+Z)"
  >
    ↻ Refazer
  </HistoryButton>
</HistoryRow>
```

- [ ] **Step 3: Adicionar os styled-components novos e `container-type` ao `Toolbar`**

Modificar o styled `Toolbar` existente para incluir `container-type: inline-size`:

```ts
const Toolbar = styled.div`
  container-type: inline-size;   // ← adicionar esta linha
  display: flex;
  flex-direction: column;
  background: ${colors.surfaceSidebar};
  font-family: ${fonts.sans};
  min-width: 240px;
  height: 100%;
  overflow: hidden;
`;
```

Adicionar os novos styled-components ao final do arquivo:

```ts
const HistoryRow = styled.div`
  display: flex;
  gap: 4px;
  padding: 4px 8px;
  border-bottom: 1px solid ${colors.borderInput};
`;

const HistoryButton = styled.button`
  flex: 1;
  height: max(36px, 7cqi);
  border-radius: 5px;
  border: 1px solid ${colors.borderInput};
  background: transparent;
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: clamp(10px, 2.8cqi, 12px);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    background: ${colors.surfaceInput};
  }
`;
```

- [ ] **Step 4: Atualizar o teste existente do `MapEditorToolbar`**

O teste em `src/components/organisms/__tests__/MapEditorToolbar.test.tsx` precisa incluir as novas props obrigatórias. Adicionar `onUndo`, `onRedo`, `canUndo: false`, `canRedo: false` aos props do render. Verificar o arquivo atual e adicionar as props faltantes no objeto de props mocado.

```bash
# Ver o arquivo de teste atual
cat src/components/organisms/__tests__/MapEditorToolbar.test.tsx
```

Localizar o objeto de props e adicionar:
```ts
onUndo: vi.fn(),
onRedo: vi.fn(),
canUndo: false,
canRedo: false,
```

- [ ] **Step 5: Rodar os testes do MapEditorToolbar**

```bash
npx vitest run src/components/organisms/__tests__/MapEditorToolbar.test.tsx
```

Esperado: todos passam.

- [ ] **Step 6: Commit**

```bash
git add src/components/organisms/MapEditorToolbar.tsx \
        src/components/organisms/__tests__/MapEditorToolbar.test.tsx
git commit -m "feat(toolbar): add undo/redo buttons and container-type for responsive"
```

---

## Task 5: Keyboard handler no `TacticalMapEditor`

**Files:**
- Modify: `src/features/tactical-map/TacticalMapEditor.tsx`

Um único `useEffect` em `window` gerencia todos os atalhos: undo/redo, setas para peça selecionada, e Escape.

- [ ] **Step 1: Importar dependências necessárias em `TacticalMapEditor.tsx`**

Verificar se `isSlotInBounds` está importado de `coords.ts`. Adicionar se necessário:

```ts
import { isSlotInBounds } from "../../features/tactical-map/utils/coords";
```

Também importar `useEditorHistory`:

```ts
import { useEditorHistory } from "./hooks/useEditorHistory";
```

- [ ] **Step 2: Instanciar `useEditorHistory` no componente**

Logo após as demais leituras da store, adicionar:

```ts
const { undo, redo, canUndo, canRedo } = useEditorHistory(store);
```

- [ ] **Step 3: Adicionar o `useEffect` do keyboard handler**

Adicionar após os outros `useEffect` existentes no componente:

```ts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    // Ignorar quando o foco está num campo de texto — deixar o undo nativo agir
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) return;

    const mod = e.metaKey || e.ctrlKey;

    // Undo: Ctrl/Cmd+Z
    if (mod && !e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
      return;
    }
    // Redo: Shift+Ctrl/Cmd+Z ou Ctrl/Cmd+Y
    if ((mod && e.shiftKey && e.key.toLowerCase() === "z") || (mod && e.key.toLowerCase() === "y")) {
      e.preventDefault();
      redo();
      return;
    }

    // Teclas de peça — lê o estado atual via getState() para evitar re-registrar
    const currentSelection = store.getState().selection;
    if (!currentSelection || currentSelection.kind !== "piece") return;

    if (e.key === "Escape") {
      store.getState().setSelection(null);
      return;
    }

    const piece = store.getState().map.pieces.find((p) => p.id === currentSelection.id);
    if (!piece || piece.coord.slot.kind !== "square") return;

    const grid = store.getState().map.grid;
    if (grid.kind !== "square") return; // setas só para grade quadrada (hex = best-effort futuro)

    const { col, row } = piece.coord.slot;
    let newCol = col;
    let newRow = row;

    if (e.key === "ArrowLeft")  newCol = col - 1;
    else if (e.key === "ArrowRight") newCol = col + 1;
    else if (e.key === "ArrowUp")    newRow = row - 1;
    else if (e.key === "ArrowDown")  newRow = row + 1;
    else return;

    e.preventDefault();

    const newSlot = { kind: "square" as const, col: newCol, row: newRow };
    if (!isSlotInBounds(newSlot, grid)) return;

    const occupied = store.getState().map.pieces.some(
      (p) =>
        p.id !== currentSelection.id &&
        p.coord.slot.kind === "square" &&
        p.coord.slot.col === newCol &&
        p.coord.slot.row === newRow,
    );
    if (!occupied) store.getState().movePiece(currentSelection.id, newSlot);
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [undo, redo, store]);
```

- [ ] **Step 4: Passar as novas props ao `MapEditorToolbar`**

No JSX do `TacticalMapEditor`, dentro de `<MapEditorToolbar ...>`, adicionar:

```tsx
onUndo={undo}
onRedo={redo}
canUndo={canUndo}
canRedo={canRedo}
```

- [ ] **Step 5: Rodar os testes existentes para confirmar que nada quebrou**

```bash
npx vitest run src/pages/__tests__/CreateMapPage.test.tsx src/pages/__tests__/EditMapPage.test.tsx
```

Esperado: todos passam.

- [ ] **Step 6: Commit**

```bash
git add src/features/tactical-map/TacticalMapEditor.tsx
git commit -m "feat(tactical-map): add keyboard handler (undo/redo, arrow keys for piece, Esc)"
```

---

## Task 6: Corrigir `isDraggingPieceToRoster` (drop-zone highlight)

**Files:**
- Modify: `src/components/organisms/TacticalMapStage.tsx`
- Modify: `src/features/tactical-map/TacticalMapEditor.tsx`

Hoje `isDraggingPieceToRoster` é `false` chumbado. O Stage precisa avisar quando começa/termina um drag de peça.

- [ ] **Step 1: Adicionar callbacks ao `Props` de `TacticalMapStage`**

Em `TacticalMapStage.tsx`, no `type Props`, adicionar:

```ts
onPieceDragStart?: () => void;
onPieceDragEnd?: () => void;
```

- [ ] **Step 2: Repassar os callbacks pela cadeia `TacticalMapStage` → `ViewportInner` → `PiecesLayer`**

Em `TacticalMapStage`: desestruturar `onPieceDragStart` e `onPieceDragEnd` dos props e passá-los para `ViewportInner`.

Em `ViewportInner`: mesma coisa, incluir nos seus próprios props (acrescentar ao type local se houver) e passar para `PiecesLayer`.

Em `PiecesLayer`: acrescentar `onPieceDragStart?: () => void; onPieceDragEnd?: () => void;` ao seu type de props e desestruturar.

- [ ] **Step 3: Chamar os callbacks no `handleMoveDOM` e nos handlers de fim de drag**

Dentro do `useEffect` de `PiecesLayer`, **no `handleMoveDOM`**, onde `drag.isDragging` muda de `false` para `true`:

```ts
if (!drag.isDragging && Math.hypot(dx, dy) > 4) {
  drag.isDragging = true;
  setDraggingPieceId(drag.pieceId);
  onPieceDragStart?.();   // ← adicionar aqui
}
```

**No `handleWindowUp`**, logo após `setDraggingPieceId(null)`:

```ts
setDraggingPieceId(null);
onPieceDragEnd?.();   // ← adicionar aqui
```

**No `handleUp`** (stage.on pointerup), logo após `setDraggingPieceId(null)`:

```ts
setDraggingPieceId(null);
onPieceDragEnd?.();   // ← adicionar aqui
```

> Nota: o guard `if (!drag) return` garante que apenas um dos dois handlers executa; `onPieceDragEnd` é chamado exatamente uma vez por drag.

- [ ] **Step 4: Atualizar o `TacticalMapEditor` para usar o state real**

Em `TacticalMapEditor.tsx`:

Substituir:
```ts
const isDraggingPieceToRoster = false;
```

Por:
```ts
const [isDraggingPieceToRoster, setIsDraggingPieceToRoster] = useState(false);
```

E passar os callbacks para o `TacticalMapStage`:
```tsx
onPieceDragStart={() => setIsDraggingPieceToRoster(true)}
onPieceDragEnd={() => setIsDraggingPieceToRoster(false)}
```

- [ ] **Step 5: Rodar os testes existentes**

```bash
npx vitest run
```

Esperado: nenhuma regressão.

- [ ] **Step 6: Commit**

```bash
git add src/components/organisms/TacticalMapStage.tsx \
        src/features/tactical-map/TacticalMapEditor.tsx
git commit -m "fix(tactical-map): wire isDraggingPieceToRoster via Stage drag callbacks"
```

---

## Task 7: Substituir `window.confirm` por `ConfirmDialog` (truncamento de fundo)

**Files:**
- Modify: `src/features/tactical-map/TacticalMapEditor.tsx`

O `handleSave` usa `window.confirm` para confirmar corte de grade. O `ConfirmDialog` existente é declarativo (controlado por estado). Transformar o fluxo em Promise para manter o `handleSave` assíncrono.

- [ ] **Step 1: Adicionar imports necessários**

Em `TacticalMapEditor.tsx`, verificar que `ConfirmDialog` está importado:

```ts
import ConfirmDialog from "../../components/molecules/ConfirmDialog";
```

- [ ] **Step 2: Adicionar estado para o diálogo de truncamento**

No corpo do componente, adicionar:

```ts
const [truncConfirmMsg, setTruncConfirmMsg] = useState<string | null>(null);
const truncConfirmResolveRef = useRef<((ok: boolean) => void) | null>(null);
```

- [ ] **Step 3: Extrair função `askTruncConfirm`**

Adicionar (antes do `handleSave`):

```ts
const askTruncConfirm = (msg: string): Promise<boolean> =>
  new Promise<boolean>((resolve) => {
    truncConfirmResolveRef.current = resolve;
    setTruncConfirmMsg(msg);
  });
```

- [ ] **Step 4: Substituir o `window.confirm` no `handleSave`**

Localizar o trecho que usa `window.confirm`:

```ts
if (!window.confirm(msg)) return;
```

Substituir por:

```ts
const ok = await askTruncConfirm(msg);
if (!ok) return;
```

- [ ] **Step 5: Adicionar o `ConfirmDialog` ao JSX**

No `return`, logo após o `<MapEditorTemplate>`, adicionar (mantendo o portal do ghost NPC):

```tsx
{truncConfirmMsg && (
  <ConfirmDialog
    message={truncConfirmMsg}
    confirmLabel="Remover e salvar"
    cancelLabel="Cancelar"
    confirmVariant="danger"
    onConfirm={() => {
      truncConfirmResolveRef.current?.(true);
      truncConfirmResolveRef.current = null;
      setTruncConfirmMsg(null);
    }}
    onCancel={() => {
      truncConfirmResolveRef.current?.(false);
      truncConfirmResolveRef.current = null;
      setTruncConfirmMsg(null);
    }}
  />
)}
```

- [ ] **Step 6: Rodar os testes existentes**

```bash
npx vitest run src/pages/__tests__/CreateMapPage.test.tsx src/pages/__tests__/EditMapPage.test.tsx
```

Esperado: todos passam.

- [ ] **Step 7: Commit**

```bash
git add src/features/tactical-map/TacticalMapEditor.tsx
git commit -m "fix(tactical-map): replace window.confirm with ConfirmDialog for bg truncation"
```

---

## Task 8: Componente `InlineFeedback` + feedback de "Salvo!"

**Files:**
- Create: `src/components/ions/InlineFeedback.tsx`
- Create: `src/components/ions/__tests__/InlineFeedback.test.tsx`
- Modify: `src/features/tactical-map/TacticalMapEditor.tsx`
- Modify: `src/components/organisms/MapEditorToolbar.tsx`

- [ ] **Step 1: Escrever o teste**

```tsx
// src/components/ions/__tests__/InlineFeedback.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import InlineFeedback from "../InlineFeedback";

describe("InlineFeedback", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("renderiza a mensagem", () => {
    render(<InlineFeedback message="Operação concluída" />);
    expect(screen.getByText("Operação concluída")).toBeInTheDocument();
  });

  it("sem autoDismissMs, persiste indefinidamente", () => {
    const onDismiss = vi.fn();
    render(<InlineFeedback message="Erro" onDismiss={onDismiss} />);
    vi.advanceTimersByTime(10000);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByText("Erro")).toBeInTheDocument();
  });

  it("com autoDismissMs, chama onDismiss após o prazo", () => {
    const onDismiss = vi.fn();
    render(
      <InlineFeedback message="Salvo!" autoDismissMs={3000} onDismiss={onDismiss} />
    );
    vi.advanceTimersByTime(2999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("reseta o timer quando a mensagem muda", () => {
    const onDismiss = vi.fn();
    const { rerender } = render(
      <InlineFeedback message="A" autoDismissMs={3000} onDismiss={onDismiss} />
    );
    vi.advanceTimersByTime(2000);
    rerender(
      <InlineFeedback message="B" autoDismissMs={3000} onDismiss={onDismiss} />
    );
    vi.advanceTimersByTime(2999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
npx vitest run src/components/ions/__tests__/InlineFeedback.test.tsx
```

Esperado: `Cannot find module '../InlineFeedback'`.

- [ ] **Step 3: Criar o componente**

```tsx
// src/components/ions/InlineFeedback.tsx
import { useEffect } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";

type Props = {
  message: string;
  variant?: "success" | "error" | "info";
  autoDismissMs?: number;
  onDismiss?: () => void;
};

const BG: Record<NonNullable<Props["variant"]>, string> = {
  success: `${colors.brandAccent}22`,
  error:   `${colors.danger}18`,
  info:    `${colors.surfaceInput}`,
};
const BORDER: Record<NonNullable<Props["variant"]>, string> = {
  success: colors.brandAccent,
  error:   colors.danger,
  info:    colors.borderInput,
};
const TEXT: Record<NonNullable<Props["variant"]>, string> = {
  success: colors.brandAccentBright,
  error:   colors.danger,
  info:    colors.textMuted,
};

export default function InlineFeedback({
  message,
  variant = "info",
  autoDismissMs,
  onDismiss,
}: Props) {
  useEffect(() => {
    if (!autoDismissMs) return;
    const timer = setTimeout(() => onDismiss?.(), autoDismissMs);
    return () => clearTimeout(timer);
  }, [message, autoDismissMs, onDismiss]);

  return (
    <Wrapper $variant={variant}>
      {message}
    </Wrapper>
  );
}

const Wrapper = styled.div<{ $variant: NonNullable<Props["variant"]> }>`
  font-family: ${fonts.sans};
  font-size: clamp(11px, 2.5cqi, 13px);
  padding: 6px 10px;
  border-radius: 5px;
  border: 1px solid ${({ $variant }) => BORDER[$variant]};
  background: ${({ $variant }) => BG[$variant]};
  color: ${({ $variant }) => TEXT[$variant]};
`;
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npx vitest run src/components/ions/__tests__/InlineFeedback.test.tsx
```

Esperado: 4 testes passando.

- [ ] **Step 5: Adicionar props de feedback ao `MapEditorToolbar`**

Em `MapEditorToolbar.tsx`, adicionar ao `type Props`:

```ts
  saveSuccessMsg?: string | null;
  onSaveSuccessDismiss?: () => void;
```

E desestruturar na função. Na `SaveArea`, renderizar o `InlineFeedback` antes do botão de salvar (e remover o `saveError` prop para migrar para `InlineFeedback`):

> Nota: manter `saveError` e `nameError` como estão por ora — apenas adicionar o `InlineFeedback` para o feedback de sucesso. Migração completa dos erros é polish futuro.

```tsx
import InlineFeedback from "../../ions/InlineFeedback";

// No JSX, dentro de <SaveArea>, antes do <SaveButton>:
{saveSuccessMsg && (
  <InlineFeedback
    message={saveSuccessMsg}
    variant="success"
    autoDismissMs={3000}
    onDismiss={onSaveSuccessDismiss}
  />
)}
```

- [ ] **Step 6: Adicionar estado `saveSuccess` no `TacticalMapEditor`**

```ts
const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
```

No `handleSave`, após `markClean()`:

```ts
markClean();
setSaveSuccess("Mapa salvo!");
onSaveSuccess?.();
```

Passar ao toolbar:

```tsx
saveSuccessMsg={saveSuccess}
onSaveSuccessDismiss={() => setSaveSuccess(null)}
```

- [ ] **Step 7: Rodar todos os testes**

```bash
npx vitest run
```

Esperado: nenhuma regressão.

- [ ] **Step 8: Commit**

```bash
git add src/components/ions/InlineFeedback.tsx \
        src/components/ions/__tests__/InlineFeedback.test.tsx \
        src/components/organisms/MapEditorToolbar.tsx \
        src/features/tactical-map/TacticalMapEditor.tsx
git commit -m "feat(ui): add InlineFeedback ion and wire save success feedback"
```

---

## Task 9: `NavGuardContext` + `BackButton` + `LogoButton` + guard no editor

**Files:**
- Create: `src/contexts/NavGuardContext.tsx`
- Create: `src/contexts/__tests__/NavGuardContext.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/ions/BackButton.tsx`
- Modify: `src/components/atoms/LogoButton.tsx`
- Modify: `src/features/tactical-map/TacticalMapEditor.tsx`

**Contexto técnico:** o app usa `<BrowserRouter>` clássico (react-router-dom v7). O `useBlocker` requer data router — não está disponível. A solução é um contexto leve que os botões de navegação consultam antes de navegar.

- [ ] **Step 1: Escrever os testes**

```tsx
// src/contexts/__tests__/NavGuardContext.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NavGuardProvider, useNavGuard } from "../NavGuardContext";

// Componente de teste que usa confirmNavigation
function TestButton({ label, onNav }: { label: string; onNav: () => void }) {
  const { confirmNavigation } = useNavGuard();
  return (
    <button
      onClick={async () => {
        if (await confirmNavigation()) onNav();
      }}
    >
      {label}
    </button>
  );
}

// Componente que registra um guard que sempre retorna `allowNav`
function GuardRegistrar({ allowNav }: { allowNav: boolean }) {
  const { registerGuard } = useNavGuard();
  registerGuard(() => Promise.resolve(allowNav));
  return null;
}

describe("NavGuardContext", () => {
  it("sem guard, confirmNavigation resolve true imediatamente", async () => {
    const onNav = vi.fn();
    render(
      <NavGuardProvider>
        <MemoryRouter>
          <TestButton label="Ir" onNav={onNav} />
        </MemoryRouter>
      </NavGuardProvider>
    );
    fireEvent.click(screen.getByText("Ir"));
    await waitFor(() => expect(onNav).toHaveBeenCalledOnce());
  });

  it("com guard que retorna true, navega", async () => {
    const onNav = vi.fn();
    render(
      <NavGuardProvider>
        <MemoryRouter>
          <GuardRegistrar allowNav={true} />
          <TestButton label="Ir" onNav={onNav} />
        </MemoryRouter>
      </NavGuardProvider>
    );
    fireEvent.click(screen.getByText("Ir"));
    await waitFor(() => expect(onNav).toHaveBeenCalledOnce());
  });

  it("com guard que retorna false, NÃO navega", async () => {
    const onNav = vi.fn();
    render(
      <NavGuardProvider>
        <MemoryRouter>
          <GuardRegistrar allowNav={false} />
          <TestButton label="Ir" onNav={onNav} />
        </MemoryRouter>
      </NavGuardProvider>
    );
    fireEvent.click(screen.getByText("Ir"));
    await new Promise((r) => setTimeout(r, 50));
    expect(onNav).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
npx vitest run src/contexts/__tests__/NavGuardContext.test.tsx
```

Esperado: `Cannot find module '../NavGuardContext'`.

- [ ] **Step 3: Criar `NavGuardContext.tsx`**

```tsx
// src/contexts/NavGuardContext.tsx
import { createContext, useContext, useRef } from "react";
import type { ReactNode } from "react";

type NavGuardFn = () => boolean | Promise<boolean>;

type NavGuardContextValue = {
  registerGuard: (fn: NavGuardFn | null) => void;
  confirmNavigation: () => Promise<boolean>;
};

const NavGuardContext = createContext<NavGuardContextValue | null>(null);

export function NavGuardProvider({ children }: { children: ReactNode }) {
  const guardRef = useRef<NavGuardFn | null>(null);

  const registerGuard = (fn: NavGuardFn | null) => {
    guardRef.current = fn;
  };

  const confirmNavigation = async (): Promise<boolean> => {
    if (!guardRef.current) return true;
    return guardRef.current();
  };

  return (
    <NavGuardContext.Provider value={{ registerGuard, confirmNavigation }}>
      {children}
    </NavGuardContext.Provider>
  );
}

export function useNavGuard(): NavGuardContextValue {
  const ctx = useContext(NavGuardContext);
  if (!ctx) throw new Error("useNavGuard must be used inside NavGuardProvider");
  return ctx;
}
```

- [ ] **Step 4: Rodar e confirmar que os testes passam**

```bash
npx vitest run src/contexts/__tests__/NavGuardContext.test.tsx
```

Esperado: 3 testes passando.

- [ ] **Step 5: Adicionar `NavGuardProvider` ao `App.tsx`**

Em `src/App.tsx`, importar e envolver as rotas:

```ts
import { NavGuardProvider } from "./contexts/NavGuardContext";
```

Envolver o `<BrowserRouter>`:

```tsx
<NavGuardProvider>
  <BrowserRouter>
    <Routes>
      {/* ... rotas existentes ... */}
    </Routes>
  </BrowserRouter>
</NavGuardProvider>
```

- [ ] **Step 6: Atualizar `BackButton.tsx`**

```tsx
// src/components/ions/BackButton.tsx
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import backArrow from "../../assets/icons/setavoltarcomponta.svg";
import { useNavGuard } from "../../contexts/NavGuardContext";

export default function BackButton() {
  const navigate = useNavigate();
  const { confirmNavigation } = useNavGuard();

  const handleClick = async () => {
    if (await confirmNavigation()) navigate(-1);
  };

  return (
    <StyledBackButton onClick={handleClick}>
      <Arrow src={backArrow} alt="Back" />
    </StyledBackButton>
  );
}

// manter os styled-components existentes inalterados
```

- [ ] **Step 7: Atualizar `LogoButton.tsx`**

```tsx
// src/components/atoms/LogoButton.tsx
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import Logo from "../ions/Logo";
import { useNavGuard } from "../../contexts/NavGuardContext";

export default function LogoButton() {
  const navigate = useNavigate();
  const { confirmNavigation } = useNavGuard();

  const handleClick = async () => {
    if (await confirmNavigation()) navigate("/");
  };

  return (
    <StyledLogoButton onClick={handleClick}>
      <Logo />
    </StyledLogoButton>
  );
}

// manter os styled-components existentes inalterados
```

- [ ] **Step 8: Registrar o guard no `TacticalMapEditor`**

Adicionar imports em `TacticalMapEditor.tsx`:

```ts
import { useNavGuard } from "../../contexts/NavGuardContext";
```

No corpo do componente:

```ts
const { registerGuard } = useNavGuard();
const [navConfirmPending, setNavConfirmPending] = useState<
  ((confirmed: boolean) => void) | null
>(null);
```

Adicionar `useEffect` para registrar/limpar o guard:

```ts
useEffect(() => {
  if (!isDirty) {
    registerGuard(null);
    return () => registerGuard(null);
  }
  const guardFn = () =>
    new Promise<boolean>((resolve) => {
      setNavConfirmPending(() => resolve);
    });
  registerGuard(guardFn);
  return () => registerGuard(null);
}, [isDirty, registerGuard]);
```

No JSX, adicionar o `ConfirmDialog` de navegação (separado do de truncamento):

```tsx
{navConfirmPending && (
  <ConfirmDialog
    message="Você tem alterações não salvas. Deseja sair mesmo assim?"
    confirmLabel="Sair sem salvar"
    cancelLabel="Continuar editando"
    confirmVariant="danger"
    onConfirm={() => {
      navConfirmPending(true);
      setNavConfirmPending(null);
    }}
    onCancel={() => {
      navConfirmPending(false);
      setNavConfirmPending(null);
    }}
  />
)}
```

- [ ] **Step 9: Rodar todos os testes**

```bash
npx vitest run
```

Esperado: nenhuma regressão. Os testes existentes de BackButton/LogoButton precisarão de `NavGuardProvider` nos wrappers — verificar e adicionar `NavGuardProvider` no wrapper de cada teste que renderize esses componentes.

Se algum teste falhar por `useNavGuard must be used inside NavGuardProvider`, adicionar o provider no wrapper do teste:

```tsx
import { NavGuardProvider } from "../../contexts/NavGuardContext";

const wrapper = ({ children }: { children: ReactNode }) => (
  <NavGuardProvider>
    <MemoryRouter>{children}</MemoryRouter>
  </NavGuardProvider>
);
```

- [ ] **Step 10: Commit**

```bash
git add src/contexts/NavGuardContext.tsx \
        src/contexts/__tests__/NavGuardContext.test.tsx \
        src/App.tsx \
        src/components/ions/BackButton.tsx \
        src/components/atoms/LogoButton.tsx \
        src/features/tactical-map/TacticalMapEditor.tsx
git commit -m "feat(nav-guard): add NavGuardContext and wire into BackButton, LogoButton, and TacticalMapEditor"
```

---

## Task 10: Menu responsivo

**Files:**
- Modify: `src/components/organisms/MapEditorToolbar.tsx`
- Modify: `src/components/molecules/GridConfigPanel.tsx`
- Modify: `src/components/molecules/PiecePropertyPanel.tsx`
- Modify: `src/components/molecules/NpcRosterPanel.tsx`

Sem testes automatizados — validação visual. Regra: nada estoura horizontalmente em 320px, todo controle tocável (mínimo ~40px de altura para botões/alvo de toque).

O `container-type: inline-size` já foi adicionado ao `Toolbar` na Task 4. Agora aplicar `clamp()`/`cqi` nos filhos.

- [ ] **Step 1: Ajustes no `MapEditorToolbar.tsx`**

Atualizar os styled-components para escalar com a largura do container:

```ts
// TabButton — remover min-width fixo, garantir alvo de toque
const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  min-width: 0;                            // era 60px — causava overflow em <320px
  padding: clamp(4px, 1.5cqi, 6px) clamp(2px, 1cqi, 8px);
  height: max(40px, 8cqi);                 // alvo de toque mínimo
  border-radius: 6px;
  border: 1px solid
    ${({ $active }) => ($active ? colors.brandAccent : colors.borderInput)};
  background: ${({ $active }) =>
    $active ? colors.brandAccent : "transparent"};
  color: ${({ disabled }) =>
    disabled ? colors.textPlaceholderStrong : colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: clamp(10px, 2.8cqi, 12px);
  font-weight: 600;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  transition: background 0.15s;

  &:not(:disabled):hover {
    filter: brightness(1.1);
  }
`;

// NameInput e DescriptionTextarea — padding fluido
const NameInput = styled.input`
  font-family: ${fonts.sans};
  font-size: clamp(12px, 3.5cqi, 14px);
  color: ${colors.textPrimary};
  background: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  padding: clamp(6px, 2cqi, 8px) clamp(8px, 3cqi, 12px);
  outline: none;
  width: 100%;

  &::placeholder { color: ${colors.textPlaceholder}; }
  &:focus { border-color: ${colors.brandAccentBright}; }
`;

// SaveButton — alvo de toque adequado
const SaveButton = styled.button`
  width: 100%;
  height: max(44px, 9cqi);
  border-radius: 6px;
  border: none;
  background: ${colors.brandAccent};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: clamp(12px, 3.5cqi, 14px);
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.15s;

  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &:not(:disabled):hover { filter: brightness(1.1); }
`;

// MetaSection e SaveArea — padding fluido
const MetaSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 2cqi, 8px);
  padding: clamp(8px, 3cqi, 12px);
  border-top: 1px solid ${colors.borderInput};
`;

const SaveArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 1.5cqi, 6px);
  padding: clamp(8px, 3cqi, 12px);
  border-top: 1px solid ${colors.borderInput};
`;
```

- [ ] **Step 2: Ajustes no `GridConfigPanel.tsx`**

```ts
const Panel = styled.div`
  padding: clamp(10px, 4cqi, 16px);
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 3cqi, 16px);
`;

const SectionTitle = styled.h3`
  font-family: ${fonts.sans};
  font-size: clamp(10px, 3cqi, 13px);
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${colors.textDisabled};
  margin: 0;
`;

const KindButton = styled.button<{ $active: boolean }>`
  flex: 1;
  height: max(40px, 8cqi);
  border-radius: 6px;
  border: 1px solid ${colors.borderInput};
  background: ${({ $active }) => ($active ? colors.brandAccent : "transparent")};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: clamp(11px, 3cqi, 13px);
  font-weight: 600;
  cursor: pointer;

  &:hover { filter: brightness(1.1); }
`;

const NumInput = styled.input`
  font-family: ${fonts.sans};
  font-size: clamp(12px, 3.5cqi, 15px);
  color: ${colors.textPrimary};
  background: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  padding: clamp(6px, 2cqi, 8px) clamp(8px, 3cqi, 12px);
  outline: none;
  width: 100%;

  &:focus { border-color: ${colors.brandAccentBright}; }
`;

// OpacityRange já tem width: 100% — manter
```

- [ ] **Step 3: Ajustes no `PiecePropertyPanel.tsx`**

```ts
const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: clamp(8px, 3cqi, 10px);
  border-bottom: 1px solid ${colors.borderInput};
`;

const NpcName = styled.span`
  font-family: ${fonts.sans};
  font-size: clamp(11px, 3cqi, 13px);
  font-weight: 600;
  color: ${colors.textPrimary};
`;

const ZRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ZSlider = styled.input`
  flex: 1;
  min-width: 0;          // evita que o slider estoure em telas estreitas
  accent-color: ${colors.brandAccent};
`;

const ZValue = styled.span`
  font-family: ${fonts.sans};
  font-size: clamp(10px, 2.5cqi, 12px);
  color: ${colors.brandAccent};
  font-weight: 700;
  min-width: 28px;       // era 32px — reduzir para evitar empurrar o slider
  text-align: right;
  flex-shrink: 0;
`;

const RemoveButton = styled.button`
  width: 100%;
  height: max(40px, 8cqi);
  border: 1px solid ${colors.danger}55;
  background: ${colors.danger}11;
  color: ${colors.danger};
  border-radius: 6px;
  font-family: ${fonts.sans};
  font-size: clamp(10px, 2.8cqi, 12px);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: background 0.15s;

  &:hover { background: ${colors.danger}22; border-color: ${colors.danger}; }
`;
```

- [ ] **Step 4: Ajuste no `NpcRosterPanel.tsx`**

```ts
const SearchInput = styled.input`
  font-family: ${fonts.sans};
  font-size: clamp(11px, 2.8cqi, 12px);
  color: ${colors.textPrimary};
  background: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 5px;
  padding: clamp(6px, 2cqi, 5px) clamp(8px, 2.5cqi, 8px);
  height: max(40px, 8cqi);     // alvo de toque mínimo
  margin-bottom: 6px;
  outline: none;
  width: 100%;

  &::placeholder { color: ${colors.textPlaceholder}; }
  &:focus { border-color: ${colors.brandAccentBright}; }
`;
```

- [ ] **Step 5: Validação visual**

Abrir o editor em `http://localhost:5173/campaigns/<id>/maps/new` e redimensionar o browser para:
- 320px de largura
- 480px de largura
- Tablet (~768px)

Verificar:
- [ ] Nenhum elemento estoura horizontalmente (sem scrollbar horizontal no menu)
- [ ] Todas as abas cabem sem truncar texto em 320px
- [ ] Sliders ocupam a largura disponível
- [ ] Botões têm altura mínima de ~40px (tocável)
- [ ] Campo de busca de NPCs está usável

- [ ] **Step 6: Rodar todos os testes**

```bash
npx vitest run
```

Esperado: nenhuma regressão.

- [ ] **Step 7: Commit**

```bash
git add src/components/organisms/MapEditorToolbar.tsx \
        src/components/molecules/GridConfigPanel.tsx \
        src/components/molecules/PiecePropertyPanel.tsx \
        src/components/molecules/NpcRosterPanel.tsx
git commit -m "feat(tactical-map): responsive menu with container queries and clamp() for <320px support"
```

---

## Task 11: Smoke test final e PR

- [ ] **Step 1: Rodar todos os testes**

```bash
npx vitest run
```

Esperado: todos passam.

- [ ] **Step 2: Build de produção (verifica erros de TypeScript)**

```bash
npm run build
```

Esperado: sem erros de TS.

- [ ] **Step 3: Smoke test manual no browser**

Com os servidores rodando (`./dev-checkout.sh feat/tactical-map-fase-5` a partir de `System_X_System_Project/`):

- [ ] Abrir `CreateMapPage` — editor carrega
- [ ] Mover slider de opacidade da grade → desfazer com `Ctrl+Z` → o slider volta
- [ ] Colocar uma peça → selecionar → mover com teclas de seta
- [ ] Clicar na seta de voltar **com alterações não salvas** → `ConfirmDialog` aparece → cancelar → permanece no editor
- [ ] Salvar → "Mapa salvo!" aparece e some em ~3s
- [ ] Em tela 320px: menu é usável

- [ ] **Step 4: Push e PR**

```bash
git push -u origin feat/tactical-map-fase-5
```

Criar PR para `main` com:
- Título: `feat(tactical-map): fase 5 — undo/redo, menu responsivo e guard de navegação`
- Body: referenciar spec `docs/superpowers/specs/2026-06-03-tactical-map-fase-5-design.md`
- Cross-link: não há PR no backend (fase frontend-only)

---

## Self-Review

Verificando cobertura do spec (§4 — 5 blocos):

| Bloco spec | Task(s) |
|---|---|
| Bloco 1 — Undo/redo | Tasks 1, 2, 3, 4, 5 |
| Bloco 2 — Menu responsivo | Tasks 4 (container-type), 10 |
| Bloco 3 — Pontas soltas (drop-zone, teclado, window.confirm) | Tasks 5, 6, 7 |
| Bloco 4 — `InlineFeedback` | Task 8 |
| Bloco 5 — Guard de navegação | Task 9 |

Sem placeholders, sem TBDs, tipos consistentes entre tasks.

**Nota sobre o `handleSet` debounce (Trade-off documentado):** ações discretas (`placePiece`, `movePiece`, `removePiece`) entram no histórico após ~400ms de atraso. O usuário que pressionar `Ctrl+Z` imediatamente após colocar uma peça pode não ver o efeito (histórico ainda vazio). Aceito pelo spec — a alternativa (API `pause`/`resume` por ação) aumenta a complexidade sem benefício proporcional para o editor de pré-produção.
