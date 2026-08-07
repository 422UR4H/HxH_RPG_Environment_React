# Refactor do mapa tático — Fase 5: `MapEditorToolbar` assina o store

> **Para quem implementa:** execute tarefa por tarefa, na ordem. A seção "A armadilha
> do zustand" resolve o único erro que trava esta fase — leia antes de escrever
> qualquer seletor.

**Spec de referência:**
`docs/superpowers/specs/2026-08-06-tactical-map-refactor-design.md` (achado C5)

**Pré-requisitos:** Fases 1 a 4 concluídas e mergeadas. Esta fase assume que a Fase 4
já moveu `MapEditorToolbar.tsx` para `src/features/tactical-map/`.

**Branch:** `refactor/tactical-map-fase-5-toolbar-store`

---

## O problema

`MapEditorToolbar` tem **45 props**. Não é um componente complexo — é um funil: o
`TacticalMapEditor` desmonta o store em 45 valores, passa todos, e o toolbar repassa a
6 painéis. Adicionar um campo a um painel obriga a tocar em três arquivos.

O `editorStore` já é um store zustand por instância (`createEditorStore(initialMap)`,
guardado num ref do editor). Ele só não é acessível de baixo porque não há contexto.

**Meta:** de 45 para ~6 props, sem mudar um pixel de comportamento.

De onde vem a redução:

| Origem | Props que somem |
|---|---|
| Store via contexto | ~19 (`grid`, `bg`, `mapName`, `selectedPiece`, `selectedWall`, seus setters…) |
| Estado da ferramenta de parede movido para o store | 6 |
| `useEditorHistory` chamado no próprio toolbar | 4 |
| `npcMap` derivado no toolbar (o painel já faz a mesma query) | 1 |
| Props de save agrupadas num objeto | 7 → 1 |
| Props de arraste de roster agrupadas num objeto | 3 → 1 |

Restam: `campaignId`, `onBgUploadingChange`, `save`, `roster`. Mais o que o `tsc`
apontar.

---

## A armadilha do zustand — leia antes de escrever seletor

Um seletor que **cria um objeto novo a cada chamada** faz o zustand achar que o estado
mudou em todo render, e o componente entra em loop infinito de re-render. O React
eventualmente estoura com "Maximum update depth exceeded", mas às vezes só fica lento e
o Vite não reclama de nada.

Nesta fase há **dois** valores que caem exatamente nessa armadilha:

```ts
// ERRADO — new Set() é um objeto novo toda vez
const placedCharacterIds = useEditorStore((s) => new Set(s.map.pieces.map((p) => p.characterId)));

// ERRADO — .find() sobre um array derivado; e o objeto do seletor também é novo
const selectedPiece = useEditorStore((s) =>
  s.selection?.kind === "piece" ? s.map.pieces.find((p) => p.id === s.selection.id) ?? null : null
);
```

O `.find()` acima na verdade devolve a **mesma referência** de peça enquanto a peça não
muda, então esse caso específico é tolerável. Mas o `new Set` **não é**.

**A regra:** o seletor devolve só o que já existe no estado (uma referência ou um
primitivo). Derivação com alocação (`new Set`, `.map`, `.filter`, objeto literal) fica
**fora** do seletor, num `useMemo` do componente:

```ts
// CERTO — seletor devolve a referência do array; a derivação é memoizada fora
const pieces = useEditorStore((s) => s.map.pieces);
const placedCharacterIds = useMemo(
  () => new Set(pieces.map((p) => p.characterId)),
  [pieces],
);
```

Se você vir a tela congelar ou o console acusar profundidade de update, é isto. Não
tente resolver com `shallow` antes de checar se o seletor está alocando.

---

## Task 1 — Contexto do store

**Crie** `src/features/tactical-map/store/EditorStoreContext.tsx`:

```tsx
// O editorStore é criado por instância (createEditorStore(initialMap) num ref do
// TacticalMapEditor), não é um singleton de módulo — por isso precisa de contexto em
// vez de um import direto. Dois editores na mesma tela teriam stores independentes.
const EditorStoreContext = createContext<EditorStore | null>(null);

export function EditorStoreProvider({ store, children }: { store: EditorStore; children: ReactNode }) { ... }

// Assina uma fatia do store. O seletor precisa devolver referência ou primitivo —
// derivação com alocação (new Set, .map, objeto literal) causa re-render infinito.
// Ver o plano da Fase 5, seção "A armadilha do zustand".
export function useEditorStore<T>(selector: (s: EditorState) => T): T {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("useEditorStore precisa de <EditorStoreProvider> acima na árvore");
  return store(selector);
}

// Para quem precisa do store inteiro (ex.: useEditorHistory, que assina store.temporal).
export function useEditorStoreRef(): EditorStore { ... }
```

O `throw` no contexto ausente não é cerimônia: sem ele o toolbar renderizaria com
`undefined` e falharia com um erro sem relação, longe da causa.

**Teste** em `src/features/tactical-map/store/__tests__/EditorStoreContext.test.tsx`:

1. Componente dentro do provider lê um valor do store.
2. `set` no store re-renderiza o consumidor com o valor novo.
3. Consumidor **fora** do provider lança o erro com a mensagem acima.
4. Dois providers com stores diferentes na mesma árvore não se contaminam.

Em `TacticalMapEditor`, envolva o que hoje está dentro do `<MapEditorTemplate>` (ou o
componente inteiro) com `<EditorStoreProvider store={store}>`.

---

## Task 2 — Estado da ferramenta de parede vai para o store

Hoje são três `useState` no `TacticalMapEditor` (`activeWallType`, `activeMaterial`,
`wallsDrawMode`) mais dois callbacks (`enterWallsDrawMode`, `exitWallsDrawMode`).

Eles são **exatamente** da mesma natureza que `activeTool` e `selection`, que já vivem
no store: estado de UI, não de conteúdo. O `partialize` do zundo já rastreia só `map`,
então nada disso entra no histórico de undo — **confirme lendo `editorStore.ts:150-163`
antes de mexer**, e não altere o `partialize`.

**Em `editorStore.ts`**, acrescente ao `EditorState`:

```ts
  activeWallType: WallType;
  activeMaterial: WallMaterial;
  wallsDrawMode: "browse" | "draw";

  setActiveMaterial: (m: WallMaterial) => void;
  enterWallsDrawMode: (t: WallType) => void;   // seta activeWallType E wallsDrawMode="draw"
  exitWallsDrawMode: () => void;
```

Valores iniciais: `"wall"`, `"stone"`, `"browse"` — os mesmos dos `useState` de hoje.

**Preserve o effect de reset:** hoje `TacticalMapEditor` tem
`useEffect(() => { if (activeTool !== "walls") setWallsDrawMode("browse"); }, [activeTool])`.
Melhor lugar agora é dentro do próprio `setActiveTool` do store:

```ts
setActiveTool: (tool) =>
  set((s) => {
    s.activeTool = tool;
    // Sair da aba de paredes sempre volta para browse: continuar em "draw" numa outra
    // aba deixaria o desenho armado invisível, e o próximo clique no canvas criaria
    // parede sem o usuário pedir.
    if (tool !== "walls") s.wallsDrawMode = "browse";
  }),
```

E **apague o `useEffect`** correspondente no editor. Se preferir não mover a regra para
o setter, mantenha o effect — mas então ele passa a chamar
`store.getState().exitWallsDrawMode()`. **Uma das duas, nunca as duas** (duas fontes
para a mesma regra é como ela se perde depois).

**Testes** em `editorStore.test.ts`:

1. `enterWallsDrawMode("door")` → `activeWallType === "door"` **e** `wallsDrawMode === "draw"`.
2. `exitWallsDrawMode()` → `wallsDrawMode === "browse"`, e `activeWallType` **não** muda.
3. `setActiveTool("grid")` estando em draw → volta para `"browse"`.
4. `setActiveTool("walls")` **não** força draw (continua browse).
5. **Nada disso cria passo de undo:** mude os três, e confirme que
   `store.temporal.getState().pastStates` continua vazio. Este é o teste que protege o
   `partialize`.

`TacticalMapStage` continua recebendo `activeWallType`/`activeMaterial`/`drawingEnabled`
**como props** — ele é compartilhado com o `TacticalMapPlacer`, que não tem store. O
editor passa a ler esses valores do store para repassar ao stage.

---

## Task 3 — O toolbar assina o store

Em `MapEditorToolbar.tsx`, troque as props por `useEditorStore`. O mapeamento:

| Prop que sai | Vira |
|---|---|
| `activeTool`, `onToolChange` | `useEditorStore(s => s.activeTool)`, `…s.setActiveTool` |
| `grid`, `onGridChange` | `…s.map.grid`, `…s.setGrid` |
| `bg`, `onBgChange`, `onApplyBg` | `…s.map.bg`, `…s.setBg`, `…s.setBgWithGrid` |
| `mapId`, `mapName`, `mapDescription` | `…s.map.id`, `…s.map.name`, `…s.map.description` |
| `onNameChange`, `onDescriptionChange` | `…s.setName`, `…s.setDescription` |
| `onZChange`, `onRemovePiece` | `…s.setPieceZ` + `…s.removePiece` |
| `onWallUpdate`, `onRemoveWall` | `…s.updateWallSegment` + `…s.removeWallSegment` |
| `activeWallType`, `activeMaterial`, `wallsDrawMode` | do store (Task 2) |
| `onEnterWallsDrawMode`, `onExitWallsDrawMode`, `onMaterialChange` | do store (Task 2) |
| `placedCharacterIds` | `useMemo` sobre `…s.map.pieces` — **ver a armadilha** |
| `selectedPiece` | derivado de `…s.selection` + `…s.map.pieces` |
| `selectedWall` | derivado de `…s.selection` + `…s.map.walls` |
| `onUndo`, `onRedo`, `canUndo`, `canRedo` | `useEditorHistory` (Task 4) |
| `npcMap` | `useCampaignDetails(token, campaignId)` no próprio toolbar |

**Sobre `onRemovePiece` e `onRemoveWall`:** hoje o editor passa
`(id) => { removePiece(id); setSelection(null); }` — remover **e** limpar a seleção.
Se o toolbar chamar só `removePiece`, a seleção fica apontando para uma peça que não
existe mais e o painel de propriedades quebra. Faça o par no próprio toolbar, ou (melhor)
mova a limpeza para dentro das actions do store:

```ts
removePiece: (pieceId) =>
  set((s) => {
    s.map.pieces = s.map.pieces.filter((x) => x.id !== pieceId);
    // A seleção não pode sobreviver ao alvo: um painel de propriedades apontando para
    // uma peça removida renderiza com dados fantasma.
    if (s.selection?.kind === "piece" && s.selection.id === pieceId) s.selection = null;
    s.isDirty = true;
  }),
```

Faça o mesmo em `removeWallSegment`. **Adicione teste para os dois** (remover o item
selecionado zera a seleção; remover outro item não mexe na seleção). Se você mover a
regra para o store, **apague** os wrappers correspondentes no `TacticalMapEditor` —
senão `setSelection(null)` roda duas vezes (inofensivo hoje, mas é a duplicação de
regra que este refactor existe para eliminar).

**Sobre `npcMap`:** `NpcRosterPanel` já chama `useCampaignDetails(token, campaignId)`
por conta própria. React Query deduplica por `queryKey`, então derivar `npcMap` no
toolbar não gera request extra. Copie o `useMemo` que hoje está no `TacticalMapEditor`.
**Atenção:** o editor também usa `npcMap` (passa para o `TacticalMapStage`) — ele
**mantém** o dele. Os dois derivam do mesmo cache; não tente compartilhar por prop.

---

## Task 4 — Separar `useEditorHistory`

O toolbar precisa de `undo`/`redo`/`canUndo`/`canRedo`. O `TacticalMapEditor` precisa
disso **mais** `beginGesture`/`endGesture` (que passa ao stage).

Chamar `useEditorHistory` nos dois lugares funciona — `undo`/`redo`/`can*` vêm de
`useStore(store.temporal, …)`, sem estado local. Mas o `gestureBase` (`useRef`) ficaria
alocado e morto na instância do toolbar. Separe:

```ts
// useEditorHistory.ts — mantém o nome, devolve só undo/redo/canUndo/canRedo
export function useEditorHistory(store: EditorStore) { … }

// Gesto de canvas: pausa o histórico durante o arraste e commita UM passo no release.
// Só quem hospeda o canvas chama isto. O comentário longo que explica o porquê
// (fragmentação do debounce de 400ms) vem junto — não o resuma.
export function useGestureHistory(store: EditorStore) {
  // gestureBase + beginGesture + endGesture, movidos sem alterar o corpo
}
```

`TacticalMapEditor` passa a chamar os dois; `MapEditorToolbar` chama só o primeiro.

`useEditorHistory.test.ts` / `.test.tsx` já existem — **atualize-os** para a nova
divisão em vez de deletar. Todos os casos atuais têm que continuar passando, em um dos
dois hooks.

---

## Task 5 — Enxugar as props restantes

Depois das tasks 1–4, sobram ~14 props. Agrupe as duas famílias coesas:

```ts
type Props = {
  campaignId: string;
  onBgUploadingChange?: (uploading: boolean) => void;

  // Fluxo de salvamento: vive no TacticalMapEditor porque depende do onSave que a
  // página injeta (criar vs editar mapa).
  save: {
    onSave: () => void;
    isSaving: boolean;
    label: string;
    nameError?: string | null;
    error?: string | null;
    successMsg?: string | null;
    onSuccessDismiss?: () => void;
  };

  // Arraste do roster: o TacticalMapEditor é dono do useRosterDrag (Fase 3) porque
  // ele também renderiza os ghosts e alimenta o TacticalMapStage.
  roster: {
    placingNpcId: string | null;
    isDropTarget: boolean;
    onPointerDownNpc: (npc: CharacterPrivateSummary, e: React.PointerEvent) => void;
  };
};
```

**Não agrupe por agrupar.** Se sobrar alguma prop solta que não pertence a nenhuma das
duas famílias, deixe solta. Quatro props soltas são melhores que um objeto `misc`.

`MapEditorToolbar.test.tsx` vai quebrar — ele monta o componente com as props antigas.
**Atualize-o**: envolva o render com `<EditorStoreProvider store={createEditorStore(fixture)}>`
e passe só as props novas. Todos os casos de teste atuais têm que continuar passando
sem afrouxar asserção. Se algum caso testava só o repasse de prop e virou redundante,
substitua por um que exercite o mesmo comportamento via store — não apague cobertura.

---

## Verificação

1. `npx tsc -b` — limpo.
2. `npm test` — verde, com ~12 testes a mais.
3. Lint — zero erro na superfície do mapa (mesmo comando das fases anteriores).
4. Contagem de props:
   ```
   sed -n '/^type Props = {/,/^};/p' src/features/tactical-map/MapEditorToolbar.tsx | grep -c ":"
   ```
   Esperado: **≤ 8** no nível de cima (as chaves aninhadas de `save`/`roster` contam no
   grep; o que importa é o `type Props` caber numa tela).
5. `wc -l src/features/tactical-map/MapEditorToolbar.tsx` — a queda é modesta (~469 →
   ~420), porque ~180 linhas são styled-components. **Isso é esperado.** O ganho desta
   fase é acoplamento, não tamanho.

---

## Entrega

1. `./dev-checkout.sh refactor/tactical-map-fase-5-toolbar-store` (copie o `.env` se
   usar worktree).
2. **Verificação visual.** O risco aqui não é o canvas — é o toolbar parar de
   re-renderizar quando o store muda, ou re-renderizar demais. Roteiro:
   - **Abas**: trocar entre Fundo / Grade / Peças / Paredes; a aba ativa destaca; o
     painel certo aparece.
   - **Grade**: mexer nos sliders do `GridConfigPanel` e ver a grade mudar no canvas
     em tempo real (é o caminho store → canvas **e** store → painel).
   - **Nome e descrição**: digitar no campo de nome; confirmar que **não** trava nem
     perde caractere (se travar, é seletor alocando — ver a armadilha).
   - **Peças**: selecionar uma peça → o `PiecePropertyPanel` aparece; mudar o Z; clicar
     em remover → o painel some **e** a peça some (é a regra de seleção da Task 3).
   - **Paredes**: escolher tipo e material nos chips; desenhar; sair para outra aba e
     voltar (tem que estar em "browse", não armado — regra da Task 2); selecionar
     parede → `WallConfigPanel` aparece; remover → some.
   - **Undo/Redo**: os botões habilitam/desabilitam corretamente; Ctrl+Z também.
   - **Salvar**: mensagem de sucesso aparece e some sozinha; salvar com nome vazio
     mostra o erro.
3. Só então abrir o PR.

**Título do PR:** `refactor(tactical-map): fase 5 — MapEditorToolbar assina o editorStore`

No corpo: contagem de props antes/depois, e o roteiro visual executado.

---

## O que NÃO fazer

- **Não** transforme o `editorStore` num singleton de módulo para evitar o contexto.
  Ele é por instância de propósito.
- **Não** mexa no `partialize`, no `equality` nem no `handleSet` do zundo
  (`editorStore.ts:150-163`). O teste 5 da Task 2 existe para provar que você não
  mexeu.
- **Não** faça `TacticalMapStage` ler o store. Ele é compartilhado com o
  `TacticalMapPlacer`, que não tem store — continua recebendo tudo por prop.
- **Não** dê ao `useEditorStore` um seletor que aloca. Sério.
- **Não** aproveite para tipar os `any` de `caseConverter`/`useForm`/páginas de
  formulário (spec, C8). Continua fora de escopo.

---

## Depois desta fase

O refactor está completo. Rode os critérios de aceite da §6 do spec e, se todos
passarem, o mapa está pronto para o MVP. As Fases 11 e 12 podem retomar.

Vale abrir um PR pequeno em seguida com a **Fase 1-B do backend**
(`System_X_System/docs/superpowers/plans/2026-08-06-fog-mode-pendente-config-partida.md`),
que é só documentação e ficou pendente.
