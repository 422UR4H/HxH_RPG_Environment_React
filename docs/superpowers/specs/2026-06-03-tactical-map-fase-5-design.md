# Tactical Map — Fase 5: Polish do Editor, Responsivo Mobile e Segurança de Navegação

**Data:** 2026-06-03
**Status:** Aprovado — pronto para writing-plans
**Escopo:** Frontend apenas (`System_X_System_React`)
**Branch:** `feat/tactical-map-fase-5` (criada a partir de `main`, que já contém as Fases 0–4)
**Fase anterior:** [Fase 4 — Editor de Peças](./2026-06-01-tactical-map-fase-4-design.md)
**Spec master:** [Tactical Map — Design Geral](./2026-05-31-tactical-map-design.md) §6 (Fase 5)

> **Sessões:** este spec é escrito por Opus. O writing-plans e a implementação serão feitos por Sonnet. Por isso o documento é detalhado e autossuficiente — não depende do transcript do brainstorm.

---

## 1. Visão geral

A Fase 5 **consolida** o editor de mapa do mestre: torna o histórico de edição (desfazer/refazer) utilizável, deixa o menu lateral genuinamente responsivo em telas pequenas, fecha pontas soltas de interação herdadas da Fase 4 e adiciona a **segurança de "sair com alterações não salvas"** que hoje não existe.

Não há mudança de backend, de contrato REST nem de layout estrutural do editor (canvas + menu). É uma fase de **qualidade de experiência** sobre uma base já funcional.

---

## 2. Princípio de design: seguir VTTs de referência

> **Regra (mantida das fases anteriores):** toda decisão de UX/interação deve primeiro verificar como FoundryVTT e VTTs de qualidade resolvem o mesmo problema; divergências devem ser justificadas.

Aplicações nesta fase:
- **Undo/redo** com atalhos padrão (`Ctrl/Cmd+Z`, `Shift+Ctrl/Cmd+Z`) — convenção universal de editores.
- **Avisos efêmeros**: VTTs (FoundryVTT `ui.notifications`, Roll20, Owlbear Rodeo) usam um sistema **global de toasts** coloridos por gravidade, e tratam "mapa salvo" como mensagem de log/chat. **Divergência consciente:** nesta fase **não** introduzimos toast/log global — usamos feedback inline (padrão atual do site, zero dependência). O toast global estilo Foundry fica documentado como capacidade futura (§11).
- **Guard de alterações não salvas**: comportamento padrão de qualquer editor sério ao tentar sair com trabalho pendente.

---

## 3. Estado atual vs. o que a Fase 5 entrega

A Fase 5 do spec master listava cinco itens. Auditoria do código em `main` mostra que **dois já estão prontos** e os demais são o trabalho real desta fase:

| Item (spec master §6, Fase 5) | Estado em `main` | Ação na Fase 5 |
|---|---|---|
| Toolbar não-linear (grid/bg/peças sempre operáveis) | ✅ Pronto — `MapEditorToolbar` tem as abas habilitadas e troca livre | Nenhuma |
| `EditMapPage` (reuso do editor, carrega por id) | ✅ Pronto — existe e reusa `TacticalMapEditor` | Nenhuma |
| Undo/redo via zundo (botões + atalhos) | ⚠️ `editorStore` já envolve `temporal(...)`, mas **nada exposto** na UI | **Bloco 1** |
| Mobile: toolbar colapsável / responsiva | ⚠️ `MapEditorTemplate` empilha em ≤749px, mas o conteúdo do menu não escala para telas pequenas | **Bloco 2** |
| Polish: validações inline + feedback | ⚠️ validações inline existem (`nameError`/`saveError`); feedback de sucesso e auto-dismiss não existem | **Bloco 4** |

**Pontas soltas herdadas da Fase 4** (escopo confirmado com o usuário — entram nesta fase):
- `isDraggingPieceToRoster` está **hardcoded `false`** em `TacticalMapEditor` (linha ~60), com TODO: o highlight da lista de NPCs como drop-zone ao arrastar uma peça de volta **nunca dispara**. → **Bloco 3**
- Acessibilidade de teclado do spec master §8.4 (setas movem peça selecionada, `Esc` desseleciona) — inexistente. → **Bloco 3**
- Truncamento de fundo usa `window.confirm` cru. → **Bloco 3**

**Adição solicitada pelo usuário** (não estava no spec master, mas é segurança que faltava):
- Guard de "sair com alterações não salvas" no **botão Voltar** e na **logo do header**. → **Bloco 5**

**Decisão de layout (travada com o usuário):** o canvas continua ocupando a parte de cima da tela e o menu a parte de baixo, **exatamente como hoje**. Nada de gaveta/drawer/overlay. O trabalho de mobile é só fazer o **conteúdo do menu** caber bem em telas pequenas.

---

## 4. Escopo da Fase 5 (resumo)

1. **Bloco 1** — Undo/Redo: expor o histórico do zundo (hook + botões + atalhos) com higiene de histórico.
2. **Bloco 2** — Menu responsivo: conteúdo do menu fluido de <320px até tablet, no padrão da ficha de personagem.
3. **Bloco 3** — Pontas soltas: drop-zone highlight, teclado para peça selecionada, trocar `window.confirm` por `ConfirmDialog`.
4. **Bloco 4** — `InlineFeedback`: componente compartilhado de aviso inline com auto-dismiss opcional.
5. **Bloco 5** — Guard de navegação não-salva: contexto leve consultado por Voltar + logo, com `ConfirmDialog`.

Fora de escopo: qualquer mudança de backend; toast/log global; migração para data router; empilhamento de peças; movimento in-game.

---

## 5. Bloco 1 — Undo/Redo

### 5.1 O que já existe

`src/features/tactical-map/store/editorStore.ts` já cria o store com `temporal(immer(...))` (zundo). O middleware grava snapshots, mas **nenhuma UI consome** `undo`/`redo`. Não há `useTemporal`, botões nem atalhos.

### 5.2 Expor o histórico — hook

Criar `src/features/tactical-map/hooks/useEditorHistory.ts`:

```ts
// zundo v2: store.temporal é um store vanilla (TemporalState).
// Em React, lê-se via useStore (zustand) com selectors finos.
import { useStore } from "zustand";
import type { EditorStore } from "../store/editorStore";

export function useEditorHistory(store: EditorStore) {
  const undo       = useStore(store.temporal, (s) => s.undo);
  const redo       = useStore(store.temporal, (s) => s.redo);
  const canUndo    = useStore(store.temporal, (s) => s.pastStates.length > 0);
  const canRedo    = useStore(store.temporal, (s) => s.futureStates.length > 0);
  return { undo, redo, canUndo, canRedo };
}
```

### 5.3 Botões

No `MapEditorToolbar`, adicionar uma linha de ações de histórico (acima ou ao lado da `TabRow`): botão **Desfazer** e **Refazer**, cada um `disabled` quando `!canUndo` / `!canRedo`. Ícones simples + `aria-label`. Seguir tokens (`colors`, `fonts`).

### 5.4 Atalhos de teclado

Listener global registrado no `TacticalMapEditor` (um único `useEffect` de `keydown` em `window`):

- `Ctrl/Cmd+Z` → `undo()`
- `Shift+Ctrl/Cmd+Z` (e, opcionalmente, `Ctrl/Cmd+Y`) → `redo()`
- **Guard de foco:** se o alvo do evento for `input`, `textarea` ou `[contenteditable]` (campos de nome/descrição), **não** interceptar — deixar o undo nativo do campo agir. Checar `e.target` / `document.activeElement`.

> Este mesmo listener hospeda os atalhos de peça do Bloco 3 (setas, `Esc`). Manter um único handler coeso, não vários.

### 5.5 Higiene do histórico (crítico para o undo não ser irritante)

Três ajustes na configuração `temporal(...)` do `editorStore`:

1. **`partialize` deve rastrear só o `map`.** Hoje rastreia `{ map, activeTool }` — isso faz **trocar de aba virar um passo de undo**, o que é errado. Mudar para:
   ```ts
   partialize: (state) => ({ map: state.map })
   ```
   `selection`, `activeTool`, `isDirty` ficam **fora** do histórico (são estado de UI, não de conteúdo do mapa).

2. **Agrupar mudanças contínuas num único passo** via `handleSet` com debounce (~400ms). Controles que disparam dezenas de `set` por interação: sliders de altura Z (`setPieceZ`), sliders e reposicionamento de fundo (`setBg`/`onBgPositionChange`), sliders de grade (`setGrid`), e digitação em nome/descrição (`setName`/`setDescription`). Sem debounce, cada tick vira um passo de undo.
   ```ts
   // esboço — Sonnet valida a assinatura exata do handleSet no zundo v2 instalado
   handleSet: (handleSet) => debounce((state) => handleSet(state), 400)
   ```
   `debounce` pode ser uma util própria pequena (zero dependência nova) em `src/utils/` ou inline. `movePiece` e `placePiece`/`removePiece` já são discretos (um `set` por ação) — não precisam de agrupamento.

3. **Limite de histórico:** `limit: 100`.

### 5.6 Interação com `isDirty`

`isDirty` fica **fora** do histórico (não é rastreado pelo `partialize`). Após `undo()`/`redo()`, o `map` muda mas `isDirty` não é restaurado pelo zundo. Regra simples e suficiente: **qualquer `undo`/`redo` marca `isDirty = true`** (o estado mudou em relação ao que está na tela). Caso de borda aceito e documentado: desfazer até voltar exatamente ao último estado salvo ainda deixará `isDirty = true` (comparar com o snapshot salvo para zerar seria over-engineering nesta fase).

O draft em `localStorage` (já implementado via `useEffect([map, isDirty])`) persiste o resultado de undo/redo automaticamente — sem trabalho extra.

---

## 6. Bloco 2 — Menu responsivo (<320px → tablet)

### 6.1 Restrições e referência

- **Layout estrutural não muda:** `MapEditorTemplate` já empilha em ≤749px (canvas em cima ~50vh, menu embaixo ~50vh, com scroll interno). Manter.
- **Referência viva:** `src/features/sheet/CharacterSheetTemplate.tsx` e filhos — o usuário garante suporte abaixo de 320px (mínimo comprometido) com unidades relativas, e o mesmo layout serve tablet/desktop. **Reusar esse padrão.**
- **Diferença importante do canvas:** o canvas Pixi é uma superfície de pixels fixa (recebe `width/height` via `useResizeObserver`), **não** escala fluido como os SVGs da ficha. Por isso o trabalho responsivo é **só no chrome HTML do menu**, não no canvas.

### 6.2 Técnicas a aplicar (no conteúdo do menu)

- `container-type: inline-size` no contêiner do menu (`Toolbar`) → os filhos escalam pela **largura do menu**, que no mobile é a largura da tela e no desktop é fixa (~280px).
- Tipografia, paddings e gaps em `clamp()` / `cqi` em vez de px fixos, onde hoje há px cravado.
- **Abas (`TabRow`/`TabButton`):** já usam `flex-wrap`; garantir `min-width` via `clamp` e alvo de toque confortável (≥ ~40px de altura) sem quebrar abaixo de 320px.
- **Sliders** (`GridConfigPanel`, `BgImagePanel`, `PiecePropertyPanel`): largura total, thumb com área de toque adequada.
- **`NpcRosterPanel`:** campo de busca e cards reflowam e permanecem tocáveis; a lista usa o scroll interno do menu.
- **Botões** (Salvar, Desfazer/Refazer, Remover): alvos de toque adequados; texto não trunca em telas estreitas.

### 6.3 Zona pixel-tuned — não normalizar

`CharacterSheetHeader`, `MentalsDiagram`, `PhysicalsDiagram`, `NenPrinciplesDiagram` têm CSS ajustado à mão (ver `src/components/CLAUDE.md`). **Não** tocar nesses arquivos a pretexto de "padronizar responsivo". O trabalho do Bloco 2 é restrito ao menu do editor.

### 6.4 Validação

Sem teste automatizado de layout. Validar visualmente na rota do editor em larguras de **320px (e abaixo)**, ~480px, tablet. Critério: nada estoura horizontalmente, todo controle é tocável, sliders e lista usáveis.

---

## 7. Bloco 3 — Pontas soltas

### 7.1 Highlight da lista como drop-zone (`isDraggingPieceToRoster`)

**Problema:** em `TacticalMapEditor`, `isDraggingPieceToRoster` é `const ... = false` chumbado (TODO na linha ~60). O `NpcRosterPanel` já aceita `isDropTarget` e sabe se destacar — só nunca recebe `true`.

**Solução:** o `TacticalMapStage` (que detecta início/fim de drag de uma peça em `PiecesLayer`) deve **avisar para cima** o estado de drag. Adicionar callbacks ao Stage:

```ts
onPieceDragStart?: () => void;   // dispara ao começar a arrastar uma peça existente
onPieceDragEnd?: () => void;     // dispara em pointerup/pointercancel
```

`TacticalMapEditor` mantém `isDraggingPieceToRoster` em `useState`, liga `true` no `onPieceDragStart` e `false` no `onPieceDragEnd`, e repassa ao toolbar (que já o entrega ao roster). Resultado: ao arrastar uma peça, a lista de NPCs acende como "solte aqui para remover" — comportamento que a Fase 4 prometia e que o FoundryVTT usa.

> Versão mínima aceitável: acender o roster durante **qualquer** drag de peça (já cobre o caso de uso). Refinar para acender só quando o ponteiro está efetivamente sobre a região do roster é polish opcional, não requerido.

### 7.2 Teclado para a peça selecionada (spec master §8.4)

No mesmo listener global do Bloco 1, quando há `selection?.kind === 'piece'`:
- **Setas** (↑↓←→): movem a peça **um slot** na direção correspondente, respeitando limites da grade (não sair de `0..cols-1` / `0..rows-1`) e slot ocupado (mesma regra do drag: movimento para slot ocupado é bloqueado).
- **`Esc`**: `setSelection(null)`.
- Mesmo guard de foco do Bloco 1 (ignorar quando digitando em input/textarea).
- Para grade hexagonal, mapear as setas para vizinhos axiais de forma sensata (usar utils de `hex.ts`); se a direção não tiver vizinho óbvio em hex, priorizar as quatro direções mais naturais. Square é o caso principal e obrigatório; hex pode ser "melhor esforço" e documentado.

### 7.3 Trocar `window.confirm` do truncamento por `ConfirmDialog`

`handleSave` em `TacticalMapEditor` usa `window.confirm` para confirmar o corte de colunas/linhas de grade não cobertas pelo fundo. Trocar pelo `ConfirmDialog` existente (`src/components/molecules/ConfirmDialog.tsx`, componente controlado — render condicional com `onConfirm`/`onCancel`).

Como `handleSave` é assíncrono e o `ConfirmDialog` é declarativo, o fluxo vira: `handleSave` detecta o truncamento → abre o dialog (state) → o `onConfirm`/`onCancel` do dialog resolve a continuação do save (aplicar o `mapToSave` truncado e prosseguir, ou abortar). Manter a mesma mensagem em português, agora com `confirmLabel`/`cancelLabel` adequados e `confirmVariant="danger"` (remove linhas/colunas).

---

## 8. Bloco 4 — `InlineFeedback` (aviso inline com auto-dismiss)

### 8.1 Motivação

Hoje **não existe** um componente compartilhado de aviso inline — os "tips" são `styled` locais (`ErrorText`) repetidos em cada componente (ex.: `MapEditorToolbar`). Fazer um aviso "sumir depois de um tempo" em cada lugar seria trabalhoso e inconsistente. A solução é **encapsular** o aviso num componente único que **carrega o timer dentro de si**.

### 8.2 Componente

Criar `src/components/ions/InlineFeedback.tsx` (ion: wrapper de UI sem semântica de domínio):

```ts
type InlineFeedbackProps = {
  message: string;
  variant?: "success" | "error" | "info";   // default "info"
  autoDismissMs?: number;                    // se definido, some sozinho após N ms
  onDismiss?: () => void;                     // chamado ao auto-sumir (limpa o state do pai)
};
```

- O `setTimeout` de auto-dismiss fica **encapsulado** num `useEffect` interno (limpo no unmount e quando `message` muda). O pai só passa a `message` e, opcionalmente, `autoDismissMs`; quando o timer estoura, `onDismiss` permite o pai zerar seu próprio state.
- Cores por `variant` via tokens (`colors.danger` para erro, etc.). Sem hex cru.

### 8.3 Uso na Fase 5

- **"Salvo!"** após `handleSave` bem-sucedido: `variant="success"`, `autoDismissMs≈3000`.
- Erros de salvar / nome obrigatório podem migrar para `InlineFeedback` (`variant="error"`, **sem** auto-dismiss — erro fica até o usuário agir).
- **Sem toast, sem log global.** O componente é inline (aparece no fluxo do menu), apenas com sumiço automático.
- Não é obrigatório migrar todos os `ErrorText` do projeto agora (YAGNI); o componente fica disponível para consolidação gradual.

---

## 9. Bloco 5 — Guard de "sair com alterações não salvas"

### 9.1 Objetivo

Ao tentar **sair do editor com `isDirty === true`**, perguntar se o usuário realmente quer sair (perda de edições não salvas). Deve cobrir o **botão Voltar** e a **logo do header** — ambos componentes compartilhados.

### 9.2 Restrição técnica (importante para o implementador)

O app usa `react-router-dom@^7` no modo **clássico** (`<BrowserRouter>` + `<Routes>` em `src/App.tsx`), **não** um data router (`createBrowserRouter`/`RouterProvider`). O hook oficial `useBlocker` **só funciona em data router** — usá-lo exigiria migrar **todas** as rotas do app, o que está **fora de escopo** e é arriscado nesta fase.

→ Solução sem migração: um **contexto leve de guard** que os botões de navegação consultam antes de navegar.

### 9.3 Desenho

Criar `src/contexts/NavGuardContext.tsx` (seguir a convenção de `TokenContext`/`UserContext` em `src/contexts/`):

```ts
// Um "guard" é uma função que decide se a navegação pode prosseguir.
// Resolve true = pode navegar; false = abortar.
type NavGuardFn = () => boolean | Promise<boolean>;

type NavGuardContextValue = {
  registerGuard: (fn: NavGuardFn | null) => void;  // editor registra/limpa
  confirmNavigation: () => Promise<boolean>;        // botões chamam antes de navegar
};
```

- `NavGuardProvider` é montado perto da raiz (em `src/App.tsx`, envolvendo as rotas). Guarda o guard atual em ref/state. `confirmNavigation()` retorna `true` se não há guard; caso contrário delega ao guard registrado.
- **`BackButton`** (`src/components/ions/BackButton.tsx`) e **`LogoButton`** (`src/components/atoms/LogoButton.tsx`) passam a consultar `confirmNavigation()` antes do `navigate(...)`:
  ```tsx
  const { confirmNavigation } = useNavGuard();
  onClick={async () => { if (await confirmNavigation()) navigate(-1); }}  // BackButton
  onClick={async () => { if (await confirmNavigation()) navigate("/"); }} // LogoButton
  ```
  Default (sem guard registrado) → `confirmNavigation()` resolve `true` → comportamento inalterado para o resto do app.
- **`TacticalMapEditor`** registra o guard quando `isDirty`:
  - O guard mostra o `ConfirmDialog` ("Sair sem salvar? Você tem alterações não salvas.") e resolve `true`/`false` conforme o clique. Padrão: o editor guarda em state um `pendingResolve` (a `resolve` da Promise) e abre o dialog; `onConfirm` → `resolve(true)`, `onCancel` → `resolve(false)`; fecha o dialog em ambos.
  - Quando `!isDirty`, registrar `null` (sem guard) — `useEffect([isDirty])` faz `registerGuard(isDirty ? guardFn : null)` e limpa no unmount.

### 9.4 Cobertura e limitação conhecida

| Saída | Coberto por |
|---|---|
| Fechar aba / recarregar página | `beforeunload` (já existe em `TacticalMapEditor`) |
| Botão Voltar do header | `NavGuard` (novo) |
| Logo do header | `NavGuard` (novo) |
| Botão "voltar" **do navegador** (popstate dentro da SPA) | **Não coberto** — limitação documentada |

Cobrir popstate de forma robusta exigiria o data router (`useBlocker`) ou um hack de history; ambos fora de escopo. Documentar como capacidade futura (§11). O `NavGuardProvider` em si é reutilizável: qualquer tela futura com formulário não salvo pode registrar o mesmo guard.

---

## 10. Arquivos

### 10.1 Novos

| Arquivo | Responsabilidade |
|---|---|
| `src/features/tactical-map/hooks/useEditorHistory.ts` | Expõe `undo`/`redo`/`canUndo`/`canRedo` do zundo |
| `src/components/ions/InlineFeedback.tsx` | Aviso inline com auto-dismiss encapsulado |
| `src/contexts/NavGuardContext.tsx` | Contexto + `useNavGuard` para guard de navegação |
| `src/utils/debounce.ts` (opcional) | Util de debounce sem dependência, se não houver uma já |

### 10.2 Modificados

| Arquivo | O que muda |
|---|---|
| `src/features/tactical-map/store/editorStore.ts` | `partialize` só `map`; `handleSet` com debounce; `limit: 100` |
| `src/features/tactical-map/TacticalMapEditor.tsx` | Listener de teclado (undo/redo + setas/Esc da peça); wiring de `isDraggingPieceToRoster` via callbacks do Stage; troca de `window.confirm` por `ConfirmDialog`; `InlineFeedback` de "Salvo!"; registro do `NavGuard` por `isDirty` |
| `src/components/organisms/MapEditorToolbar.tsx` | Botões Desfazer/Refazer; estilos responsivos (container query, `clamp`/`cqi`) |
| `src/components/organisms/TacticalMapStage.tsx` | Callbacks `onPieceDragStart`/`onPieceDragEnd` para o highlight do roster |
| `src/components/molecules/GridConfigPanel.tsx`, `BgImagePanel.tsx`, `PiecePropertyPanel.tsx` | Ajustes responsivos (largura/toque de sliders e campos) |
| `src/components/ions/BackButton.tsx` | Consulta `confirmNavigation()` antes de `navigate(-1)` |
| `src/components/atoms/LogoButton.tsx` | Consulta `confirmNavigation()` antes de `navigate("/")` |
| `src/App.tsx` | Envolve as rotas com `NavGuardProvider` |
| `src/components/templates/MapEditorTemplate.tsx` | Eventuais ajustes finos de altura/scroll do menu no mobile (se necessário) |

---

## 11. Fora de escopo / capacidades futuras

- **Toast/log global estilo FoundVTT** (`ui.notifications`): sistema de avisos do app inteiro, colorido por gravidade, com erros "grudados". Construir uma vez e reusar no site quando virar foco. Não nesta fase.
- **Guard de popstate** (botão voltar do navegador dentro da SPA): exige data router (`useBlocker`) ou hack de history. Futuro.
- **Migração para data router** (`createBrowserRouter`): destravaria `useBlocker` e loaders/actions, mas toca todas as rotas — projeto à parte.
- **Zerar `isDirty` ao desfazer até o estado salvo**: comparar com snapshot salvo. Over-engineering por ora.
- **Empilhamento de peças**, **movimento in-game**, **distorção isométrica** etc.: fases próprias (spec master §6).

---

## 12. Testes

| Camada | O que testar | Como |
|---|---|---|
| `editorStore` | `undo`/`redo` revertem/reaplicam o `map`; `partialize` **não** rastreia `activeTool` (trocar aba não cria passo de histórico) | Vitest unit — instancia store, dispara actions, inspeciona `store.temporal.getState()` |
| `useEditorHistory` | `canUndo`/`canRedo` refletem `pastStates`/`futureStates` | Vitest unit |
| Teclado | setas movem peça selecionada (respeitando limites/ocupado); `Esc` desseleciona; atalhos de undo/redo; guard de foco em input | Testing Library — `fireEvent.keyDown`, asserts no store |
| `InlineFeedback` | renderiza por `variant`; auto-dismiss chama `onDismiss` após `autoDismissMs`; sem auto-dismiss persiste | Testing Library + fake timers |
| `NavGuard` | sem guard → `confirmNavigation` resolve `true`; com guard → resolve conforme confirm; Voltar/logo abortam quando cancelado | Testing Library + mock de `useNavigate` |
| `ConfirmDialog` de truncamento | confirmar aplica grade truncada e salva; cancelar aborta o save | Testing Library + msw |
| Responsivo / drop-zone highlight | layout do menu em 320px↓/tablet; roster acende ao arrastar peça | Validação visual na rota do editor |

Padrão de teste do projeto: Vitest + Testing Library + msw; mock de `@pixi/react` em `vitest.setup.ts` (componentes que tocam o Stage afirmam JSX, não WebGL).

---

## 13. Critério de pronto

1. **Undo/redo:** o mestre move/ajusta peças, mexe em sliders de grade/fundo, e desfaz/refaz por botão **e** por `Ctrl/Cmd+Z` / `Shift+Ctrl/Cmd+Z`; um arraste de slider conta como **um** passo de undo; trocar de aba **não** vira passo de undo; atalhos não disparam ao digitar nome/descrição.
2. **Responsivo:** em 320px (e abaixo), o menu inteiro é usável — abas, sliders, busca/lista de NPCs e botões — sem estouro horizontal; segue funcionando em tablet.
3. **Pontas soltas:** arrastar uma peça acende a lista de NPCs como drop-zone; com uma peça selecionada, as setas a movem slot a slot e `Esc` desseleciona; o truncamento de fundo usa `ConfirmDialog`, não `window.confirm`.
4. **Feedback:** salvar mostra "Salvo!" inline que some sozinho em ~3s; erros aparecem inline e persistem.
5. **Guard:** com alterações não salvas, clicar em Voltar ou na logo abre o `ConfirmDialog`; cancelar mantém o usuário no editor; confirmar navega. Sem alterações, navega direto.

---

## 14. Decisões deste brainstorm (racional)

- **Layout mobile inalterado (canvas em cima, menu embaixo):** decisão explícita do usuário. O trabalho responsivo é só no conteúdo do menu; o canvas Pixi não escala fluido como os SVGs da ficha, então não faz sentido tratá-lo igual.
- **Sem toast/log global agora, feedback inline com auto-dismiss:** VTTs usam toast global, mas introduzi-lo no meio da Fase 5 é desvio; inline mantém zero dependência e segue o padrão do site. `InlineFeedback` encapsula o timer para não reimplementar sumiço em cada tela.
- **`partialize` só `map` + debounce no `handleSet`:** sem isso, o undo fica inutilizável (cada tick de slider e cada troca de aba viram passos). É o que torna o histórico de fato usável.
- **Guard via contexto, não `useBlocker`:** o app é `<BrowserRouter>` clássico; `useBlocker` exigiria migrar todas as rotas. O contexto cobre Voltar + logo sem refator e fica reutilizável; popstate do navegador é limitação documentada.
- **Pontas soltas da Fase 4 incluídas:** o spec master prometia o editor "consolidado" na Fase 5; deixar `isDraggingPieceToRoster` morto e sem teclado contradiz isso. Custo baixo, fecham a experiência.
- **Fase frontend-only:** branch `feat/tactical-map-fase-5` criada **apenas no repo do front**. Sem branch/PR no backend, pois não há mudança de contrato nem de código Go. Decisão do usuário (evita PR vazio no back). O número `fase-5` segue a numeração do spec master, mesmo que a branch anterior do front (`feat/tactical-map-fase-3`) tenha absorvido o trabalho da Fase 4.
