# Fix: fechamento indevido do ImagePickerModal ao arrastar handles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parar de fechar `ImagePickerModal`/`BackgroundEditorModal` quando um drag iniciado
dentro do modal termina fora dele, e adicionar uma guarda de "descartar alterações" antes de
fechar quando já existe conteúdo pendente (imagem/URL adicionada).

**Architecture:** Extrair a lógica de "clique-fora fecha" para um hook compartilhado
(`useBackdropDismiss`) que rastreia o alvo real de `mousedown`/`mouseup` no backdrop, em vez
de confiar no evento `click` sintético do browser (que erra quando mousedown e mouseup
acontecem em elementos diferentes). Aplicar esse hook aos dois modais que hoje implementam o
padrão `Overlay`/`Modal` bespoke, e adicionar um gate de confirmação (`ConfirmDialog`,
reaproveitado) em `ImagePickerModal` para quando já há conteúdo pendente.

**Tech Stack:** React 19 + TypeScript (`verbatimModuleSyntax` ligado), styled-components,
vitest + @testing-library/react + @testing-library/user-event.

## Global Constraints

- `verbatimModuleSyntax` está ligado: imports somente-de-tipo usam `import type { … }`,
  nunca misturados com imports de valor na mesma linha.
- Sem CSS/JS de terceiros novo: usar apenas `react`, `styled-components` e o `ConfirmDialog`
  já existente.
- Sem literais de cor novos — nenhuma tarefa deste plano introduz cor nova.
- Convenção de teste deste repo para molecules: cobertura via integration test de página
  (ver `src/components/CLAUDE.md`), com exceção já aberta por `BackgroundEditorModal.test.tsx`
  para modais deste formato (testado diretamente). Este plano segue essa exceção.
- Rodar `npm run lint` e a suíte de testes tocada (`npx vitest run <arquivo>`) antes de cada
  commit.

---

## File Structure

- **Create** `src/hooks/useBackdropDismiss.ts` — hook puro, sem dependência de nenhum modal
  específico. Recebe `onDismiss: () => void`, devolve `{ onMouseDown, onMouseUp }` para
  spread no elemento backdrop.
- **Create** `src/hooks/__tests__/useBackdropDismiss.test.ts` — testa o hook isolado com um
  componente harness mínimo (overlay + filho).
- **Modify** `src/components/molecules/ImagePickerModal.tsx` — troca `Overlay onClick={onClose}`
  pelo hook; adiciona guarda de "descartar" (`attemptClose` + `ConfirmDialog`) para
  backdrop/Cancelar/Escape quando `hasPendingContent`.
- **Create** `src/components/molecules/__tests__/ImagePickerModal.test.tsx` — cobre o bug
  relatado (drag-out não fecha), o clique-fora legítimo, e o gate de descarte.
- **Modify** `src/components/molecules/BackgroundEditorModal.tsx` — troca o mesmo padrão
  bespoke pelo hook compartilhado (já tem `attemptClose`, só muda o mecanismo de detecção).
- **Modify** `src/components/molecules/__tests__/BackgroundEditorModal.test.tsx` — adiciona
  casos de backdrop click (inexistentes hoje).

---

### Task 1: `useBackdropDismiss` hook

**Files:**
- Create: `src/hooks/useBackdropDismiss.ts`
- Test: `src/hooks/__tests__/useBackdropDismiss.test.ts`

**Interfaces:**
- Produces: `useBackdropDismiss(onDismiss: () => void): { onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void; onMouseUp: (e: React.MouseEvent<HTMLDivElement>) => void }` — Tasks 2 e 3 importam isso de `../../hooks/useBackdropDismiss` (relativo a `src/components/molecules/`).

- [ ] **Step 1: Escrever o teste (falhando)**

Criar `src/hooks/__tests__/useBackdropDismiss.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { useBackdropDismiss } from "../useBackdropDismiss";

function Harness({ onDismiss }: { onDismiss: () => void }) {
  const { onMouseDown, onMouseUp } = useBackdropDismiss(onDismiss);
  return (
    <div data-testid="overlay" onMouseDown={onMouseDown} onMouseUp={onMouseUp}>
      <div data-testid="child">conteúdo</div>
    </div>
  );
}

describe("useBackdropDismiss", () => {
  it("dispara quando mousedown e mouseup acontecem no próprio backdrop", () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(<Harness onDismiss={onDismiss} />);
    const overlay = getByTestId("overlay");
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(overlay);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("não dispara quando o mousedown começa em um filho e o mouseup termina no backdrop", () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(<Harness onDismiss={onDismiss} />);
    fireEvent.mouseDown(getByTestId("child"));
    fireEvent.mouseUp(getByTestId("overlay"));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("não dispara quando o mousedown começa no backdrop mas o mouseup termina em um filho", () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(<Harness onDismiss={onDismiss} />);
    fireEvent.mouseDown(getByTestId("overlay"));
    fireEvent.mouseUp(getByTestId("child"));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("não dispara quando os dois eventos acontecem no filho", () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(<Harness onDismiss={onDismiss} />);
    fireEvent.mouseDown(getByTestId("child"));
    fireEvent.mouseUp(getByTestId("child"));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("rearma a cada novo ciclo mousedown/mouseup (não trava em false)", () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(<Harness onDismiss={onDismiss} />);
    const overlay = getByTestId("overlay");
    fireEvent.mouseDown(getByTestId("child"));
    fireEvent.mouseUp(overlay);
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(overlay);
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/hooks/__tests__/useBackdropDismiss.test.ts`
Expected: FAIL — `../useBackdropDismiss` não existe.

- [ ] **Step 3: Implementar o hook**

Criar `src/hooks/useBackdropDismiss.ts`:

```ts
import { useRef } from "react";
import type { MouseEvent } from "react";

interface BackdropDismissHandlers {
  onMouseDown: (e: MouseEvent<HTMLDivElement>) => void;
  onMouseUp: (e: MouseEvent<HTMLDivElement>) => void;
}

export function useBackdropDismiss(onDismiss: () => void): BackdropDismissHandlers {
  const armed = useRef(false);

  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    armed.current = e.target === e.currentTarget;
  };

  const onMouseUp = (e: MouseEvent<HTMLDivElement>) => {
    if (armed.current && e.target === e.currentTarget) {
      onDismiss();
    }
    armed.current = false;
  };

  return { onMouseDown, onMouseUp };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/hooks/__tests__/useBackdropDismiss.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useBackdropDismiss.ts src/hooks/__tests__/useBackdropDismiss.test.ts
git commit -m "feat(hooks): add useBackdropDismiss to fix drag-out-closes-modal bug"
```

---

### Task 2: Aplicar o fix + guarda de descarte em `ImagePickerModal`

**Files:**
- Modify: `src/components/molecules/ImagePickerModal.tsx`
- Test: `src/components/molecules/__tests__/ImagePickerModal.test.tsx` (create)

**Interfaces:**
- Consumes: `useBackdropDismiss` de `../../hooks/useBackdropDismiss` (Task 1); `ConfirmDialog`
  já existente em `./ConfirmDialog` (props: `message`, `confirmLabel`, `cancelLabel?`,
  `confirmVariant?`, `onConfirm`, `onCancel`).

- [ ] **Step 1: Escrever os testes (falhando)**

Criar `src/components/molecules/__tests__/ImagePickerModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImagePickerModal from "../ImagePickerModal";

describe("ImagePickerModal — backdrop click", () => {
  it("fecha quando mousedown e mouseup acontecem no backdrop", () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="avatar" onConfirm={vi.fn()} onClose={onClose} />);
    const overlay = screen.getByTestId("image-picker-overlay");
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("NÃO fecha quando um drag começa dentro do modal e termina no backdrop (bug do handle de crop)", () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="avatar" onConfirm={vi.fn()} onClose={onClose} />);
    const overlay = screen.getByTestId("image-picker-overlay");
    fireEvent.mouseDown(screen.getByText("Adicionar Avatar"));
    fireEvent.mouseUp(overlay);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("NÃO fecha quando mousedown começa no backdrop mas mouseup termina dentro do modal", () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="avatar" onConfirm={vi.fn()} onClose={onClose} />);
    const overlay = screen.getByTestId("image-picker-overlay");
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(screen.getByText("Adicionar Avatar"));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("ImagePickerModal — guarda de descarte", () => {
  async function preencherUrl(texto: string) {
    await userEvent.click(screen.getByRole("button", { name: /Colar link/ }));
    await userEvent.type(screen.getByPlaceholderText("Cole a URL da imagem aqui"), texto);
  }

  it("clique-fora fecha direto quando nada foi adicionado", () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="cover" onConfirm={vi.fn()} onClose={onClose} />);
    const overlay = screen.getByTestId("image-picker-overlay");
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("clique-fora abre confirmação de descarte quando já há uma URL preenchida", async () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="cover" onConfirm={vi.fn()} onClose={onClose} />);
    await preencherUrl("https://example.com/img.png");
    const overlay = screen.getByTestId("image-picker-overlay");
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(overlay);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("⚠ Descartar imagem?")).toBeInTheDocument();
  });

  it("'Cancelar' fecha direto quando nada foi adicionado", async () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="cover" onConfirm={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("'Cancelar' abre confirmação de descarte quando já há uma URL preenchida", async () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="cover" onConfirm={vi.fn()} onClose={onClose} />);
    await preencherUrl("https://example.com/img.png");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("⚠ Descartar imagem?")).toBeInTheDocument();
  });

  it("Escape abre confirmação de descarte quando já há uma URL preenchida", async () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="cover" onConfirm={vi.fn()} onClose={onClose} />);
    await preencherUrl("https://example.com/img.png");
    await userEvent.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("⚠ Descartar imagem?")).toBeInTheDocument();
  });

  it("Escape fecha direto quando nada foi adicionado", async () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="cover" onConfirm={vi.fn()} onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("'Continuar editando' mantém o modal aberto e preserva o rascunho", async () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="cover" onConfirm={vi.fn()} onClose={onClose} />);
    await preencherUrl("https://example.com/img.png");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar editando" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText("⚠ Descartar imagem?")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Cole a URL da imagem aqui")).toHaveValue(
      "https://example.com/img.png"
    );
  });

  it("'Descartar' fecha o modal", async () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="cover" onConfirm={vi.fn()} onClose={onClose} />);
    await preencherUrl("https://example.com/img.png");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await userEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/components/molecules/__tests__/ImagePickerModal.test.tsx`
Expected: FAIL — `getByTestId("image-picker-overlay")` não existe, e "Cancelar"/Escape ainda
chamam `onClose` direto sem guarda (nenhum "⚠ Descartar imagem?" no DOM).

- [ ] **Step 3: Implementar**

Editar `src/components/molecules/ImagePickerModal.tsx`.

Trocar a linha 2 (import do react):
```tsx
import { useRef, useState } from "react";
```
por:
```tsx
import { useEffect, useRef, useState } from "react";
```

Adicionar, logo abaixo do import de `IMAGE_PICKER_TIP` (linha 9):
```tsx
import ConfirmDialog from "./ConfirmDialog";
import { useBackdropDismiss } from "../../hooks/useBackdropDismiss";
```

Adicionar, logo após a declaração de `hasPendingContent` (linha 36, antes de `handleModeClick`):
```tsx
const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);

const attemptClose = () => {
  if (hasPendingContent) {
    setShowDiscardPrompt(true);
  } else {
    onClose();
  }
};

const handleDiscard = () => {
  setShowDiscardPrompt(false);
  onClose();
};

const backdropDismiss = useBackdropDismiss(attemptClose);

useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (showDiscardPrompt) return;
    attemptClose();
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [showDiscardPrompt, hasPendingContent]);
```

Trocar a abertura do JSX (linhas 91-93):
```tsx
return (
  <Overlay onClick={onClose}>
    <Modal onClick={(e) => e.stopPropagation()}>
```
por:
```tsx
return (
  <Overlay
    data-testid="image-picker-overlay"
    onMouseDown={backdropDismiss.onMouseDown}
    onMouseUp={backdropDismiss.onMouseUp}
  >
    <Modal>
```

Trocar o botão Cancelar (linha 171):
```tsx
<CancelButton onClick={onClose}>Cancelar</CancelButton>
```
por:
```tsx
<CancelButton onClick={attemptClose}>Cancelar</CancelButton>
```

Adicionar o `ConfirmDialog`, como irmão de `Modal`, antes do fechamento de `Overlay`
(linhas 176-177):
```tsx
      </Modal>
      {showDiscardPrompt && (
        <ConfirmDialog
          message="⚠ Descartar imagem?"
          confirmLabel="Descartar"
          cancelLabel="Continuar editando"
          confirmVariant="danger"
          onConfirm={handleDiscard}
          onCancel={() => setShowDiscardPrompt(false)}
        />
      )}
    </Overlay>
  );
}
```

> Nota: `Modal` deixa de precisar de `onClick={(e) => e.stopPropagation()}` porque `Overlay`
> não usa mais `onClick` — o fechamento agora é decidido só por `onMouseDown`/`onMouseUp` no
> próprio `Overlay`. Deixar o `stopPropagation` ali seria código morto.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/components/molecules/__tests__/ImagePickerModal.test.tsx`
Expected: PASS (9 testes).

Rodar também a suíte completa para garantir que nada em `CharacterSheetHeader` ou nas páginas
que renderizam `ImagePickerModal` quebrou:
Run: `npx vitest run`
Expected: PASS (nenhuma regressão).

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: sem erros novos.

- [ ] **Step 6: Commit**

```bash
git add src/components/molecules/ImagePickerModal.tsx src/components/molecules/__tests__/ImagePickerModal.test.tsx
git commit -m "fix(ImagePickerModal): don't close on drag-out; confirm discard once dirty"
```

---

### Task 3: Aplicar o mesmo fix em `BackgroundEditorModal`

**Files:**
- Modify: `src/components/molecules/BackgroundEditorModal.tsx`
- Test: `src/components/molecules/__tests__/BackgroundEditorModal.test.tsx` (modify)

**Interfaces:**
- Consumes: `useBackdropDismiss` de `../../hooks/useBackdropDismiss` (Task 1). O componente já
  tem `attemptClose` (linhas 55-61) — só troca o mecanismo de disparo.

- [ ] **Step 1: Escrever os testes (falhando)**

Adicionar ao final de `src/components/molecules/__tests__/BackgroundEditorModal.test.tsx`
— depois do `describe("BackgroundEditorModal — formatting tip", …)` (linha 239, último bloco
do arquivo hoje), como um novo `describe` de nível superior, no final do arquivo:

```tsx
describe("BackgroundEditorModal — backdrop click", () => {
  it("fecha direto via clique no backdrop quando o draft não mudou", () => {
    const onClose = vi.fn();
    render(
      <BackgroundEditorModal
        initialValue="hello"
        readOnly={false}
        onClose={onClose}
        onSave={vi.fn()}
      />
    );
    const overlay = screen.getByTestId("background-editor-overlay");
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("abre o prompt de descarte via clique no backdrop quando o draft mudou", async () => {
    const onClose = vi.fn();
    render(
      <BackgroundEditorModal
        initialValue="hello"
        readOnly={false}
        onClose={onClose}
        onSave={vi.fn()}
      />
    );
    await userEvent.type(screen.getByRole("textbox"), " world");
    const overlay = screen.getByTestId("background-editor-overlay");
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(overlay);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(/Descartar alterações/)).toBeInTheDocument();
  });

  it("NÃO fecha nem abre o prompt quando o mousedown começa dentro do modal e o mouseup termina no backdrop", async () => {
    const onClose = vi.fn();
    render(
      <BackgroundEditorModal
        initialValue="hello"
        readOnly={false}
        onClose={onClose}
        onSave={vi.fn()}
      />
    );
    const overlay = screen.getByTestId("background-editor-overlay");
    fireEvent.mouseDown(screen.getByRole("textbox"));
    fireEvent.mouseUp(overlay);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText(/Descartar alterações/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/components/molecules/__tests__/BackgroundEditorModal.test.tsx`
Expected: FAIL — `getByTestId("background-editor-overlay")` não existe ainda.

- [ ] **Step 3: Implementar**

Editar `src/components/molecules/BackgroundEditorModal.tsx`.

Adicionar import (linha 6, junto dos demais imports locais):
```tsx
import { useBackdropDismiss } from "../../hooks/useBackdropDismiss";
```

Adicionar logo após a definição de `attemptClose` (linha 61, antes de `handleSaveAndClose`):
```tsx
const backdropDismiss = useBackdropDismiss(attemptClose);
```

Trocar a abertura do JSX (linhas 87-89):
```tsx
return (
  <Overlay onClick={attemptClose}>
    <Modal onClick={(e) => e.stopPropagation()}>
```
por:
```tsx
return (
  <Overlay
    data-testid="background-editor-overlay"
    onMouseDown={backdropDismiss.onMouseDown}
    onMouseUp={backdropDismiss.onMouseUp}
  >
    <Modal>
```

> Mesmo motivo do Task 2: `Modal` não precisa mais de `stopPropagation` porque `Overlay` não
> usa `onClick`.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/components/molecules/__tests__/BackgroundEditorModal.test.tsx`
Expected: PASS (todos os testes existentes + os 3 novos).

Rodar a suíte completa:
Run: `npx vitest run`
Expected: PASS (nenhuma regressão).

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: sem erros novos.

- [ ] **Step 6: Commit**

```bash
git add src/components/molecules/BackgroundEditorModal.tsx src/components/molecules/__tests__/BackgroundEditorModal.test.tsx
git commit -m "fix(BackgroundEditorModal): reuse useBackdropDismiss to avoid drag-out-closes bug"
```

---

## Verificação manual (browser) — após as 3 tasks

Este plano cobre o comportamento com testes automatizados (target DOM real via RTL), mas o
gesto original relatado envolve a biblioteca `react-advanced-cropper` de verdade, que não é
mockada em `src/test/setup.ts`. Antes de abrir o PR:

1. `npm run dev`, abrir a ficha em modo de edição, clicar para adicionar avatar.
2. Arrastar um handle do cropper para fora do modal e soltar o botão — confirmar que o modal
   **não fecha** e o crop continua ativo.
3. Repetir para capa (`cover`).
4. Clicar fora do modal (fora da área de crop, sem imagem carregada) — confirmar que fecha
   direto.
5. Com uma imagem já carregada, clicar fora — confirmar que aparece "⚠ Descartar imagem?" em
   vez de fechar direto.
