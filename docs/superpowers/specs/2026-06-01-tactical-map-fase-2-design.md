# Tactical Map — Fase 2: Editor de Malha

**Data:** 2026-06-01
**Status:** Aprovado — pronto para implementação
**Escopo:** Frontend apenas (`System_X_System_React`)
**Fase anterior:** Fase 1 — Persistência + listagem de mapas
**Spec mestre:** `docs/superpowers/specs/2026-05-31-tactical-map-design.md`

---

## 1. Objetivo

Transformar o `CreateMapPage` atual (formulário simples de nome/descrição) em um editor completo com canvas e sidebar de configuração. O mestre consegue criar um mapa, configurar a malha (tipo, dimensões, cor) e salvar — tudo em uma tela.

**Critério de pronto:** mestre cria um mapa novo, escolhe square ou hex, define 20×15, salva, recarrega — malha aparece corretamente.

---

## 2. O que já existe

| Arquivo | Estado |
|---|---|
| `src/pages/CreateMapPage.tsx` | Formulário de nome + descrição; cria mapa via POST e redireciona para CampaignPage |
| `src/pages/EditMapPage.tsx` | Placeholder vazio |
| `src/components/organisms/TacticalMapStage.tsx` | Funcional — renderiza grid (square + hex), bg, peças, com pixi-viewport |
| `src/features/tactical-map/store/editorStore.ts` | Completo — Zustand + zundo + immer, `setGrid`, `isDirty`, `markClean` |
| `src/features/tactical-map/TacticalMapEditor.tsx` | Casca vazia — só repassa props para o Stage |
| `src/hooks/useCreateMap.ts` / `useUpdateMap.ts` | Funcionais |
| `src/types/tacticalMap.ts` | Completo com todos os tipos da Fase 0 |

---

## 3. Arquitetura

### Árvore de componentes

```
CreateMapPage                   EditMapPage
  └─ TacticalMapEditor            └─ TacticalMapEditor
       ├─ cria editorStore              ├─ cria editorStore
       │   (mapa padrão)                │   (mapa carregado)
       └─ MapEditorTemplate            └─ MapEditorTemplate
            ├─ sidebar:                     ├─ sidebar:
            │   MapEditorToolbar                MapEditorToolbar
            └─ children:                   └─ children:
                CanvasArea                      CanvasArea
                  └─ TacticalMapStage             └─ TacticalMapStage
```

### Interface do `TacticalMapEditor`

```ts
type TacticalMapEditorProps = {
  campaignId: string;
  initialMap: TacticalMap;
  onSave: (map: TacticalMap) => Promise<void>;
  saveLabel?: string;   // "Criar Mapa" | "Salvar" — default "Salvar"
};
```

O editor não sabe se é POST ou PUT — apenas chama `onSave`. As páginas injetam a mutation correta.

### Responsabilidades

| Componente | Responsabilidade |
|---|---|
| `CreateMapPage` | Fornece `initialMap` padrão + `onSave` como `useCreateMap` mutation; redireciona após criar |
| `EditMapPage` | Loading guard via `useMap`; fornece `initialMap` carregado + `onSave` como `useUpdateMap` |
| `TacticalMapEditor` | Instancia `editorStore`; orquestra save, `isDirty`, `onbeforeunload`, draft no localStorage |
| `MapEditorTemplate` | Layout responsivo: sidebar esquerda + canvas. Sem lógica de negócio |
| `MapEditorToolbar` | Organism: abas de ferramentas + painel ativo. Fase 2 ativa só a aba "grid" |
| `GridConfigPanel` | Molecule: campos para `GridShape` (kind, cols, rows, cellSize, color, opacity) |

---

## 4. Novos arquivos

```
src/
├─ components/
│  ├─ templates/
│  │  └─ MapEditorTemplate.tsx          ← novo template
│  ├─ organisms/
│  │  └─ MapEditorToolbar.tsx           ← abas + painel ativo
│  └─ molecules/
│     └─ GridConfigPanel.tsx            ← controles de GridShape
├─ hooks/
│  └─ useResizeObserver.ts              ← mede CanvasArea para o Stage
├─ features/tactical-map/
│  └─ TacticalMapEditor.tsx             ← substituir casca vazia (existente)
└─ pages/
   ├─ CreateMapPage.tsx                 ← reescrever
   └─ EditMapPage.tsx                   ← implementar
```

---

## 5. Layout e responsividade

### Desktop (≥750px) — sidebar esquerda + canvas

```
┌─────────────────────────────────────────────────────────┐
│  ←  NOME DO MAPA                           [Salvar]     │
├──────────────┬──────────────────────────────────────────┤
│ [Grid][BG].. │                                          │
│ ─────────── │         CANVAS (TacticalMapStage)        │
│ Tipo: [■ □] │                                          │
│ Cols: [20 ] │                                          │
│ Rows: [15 ] │                                          │
│ Tamanho:[40]│                                          │
│ Cor:  [####]│                                          │
│ Opac: [───●]│                                          │
│             │                                          │
│ Nome        │                                          │
│ [Floresta…] │                                          │
│ Descrição   │                                          │
│ [          ]│                                          │
└─────────────┴──────────────────────────────────────────┘
  280px fixo         flex: 1
```

### Mobile (<750px) — canvas topo + sidebar embaixo

```
┌──────────────────────┐
│  ← MAPA    [Salvar]  │
├──────────────────────┤
│   CANVAS  (~50vh)    │
├──────────────────────┤
│ [Grid][BG][♟]...     │  ← abas horizontais
├──────────────────────┤
│ Tipo: [■ □]          │
│ Cols: [20  ]         │
│ ...                  │
│ Nome: [Floresta...]  │
└──────────────────────┘
  ↕ scroll
```

`MapEditorTemplate` usa `flex-direction: column` abaixo de `750px`. Sem drawer/EdgeTab — a sidebar simplesmente vai abaixo do canvas.

---

## 6. `MapEditorTemplate`

Segue o padrão estrutural do `DetailPageTemplate`, simplificado:

```ts
type MapEditorTemplateProps = {
  sidebar: ReactNode;
  sidebarLabel?: string;
  headerColor?: string;
  headerTitle: string;
  headerActions?: ReactNode;   // slot para botão Salvar
  hideBack?: boolean;
  children: ReactNode;         // canvas area
};
```

Diferenças em relação ao `DetailPageTemplate`:

| | `DetailPageTemplate` | `MapEditorTemplate` |
|---|---|---|
| bg image no main | worldmap.png | nenhuma |
| padding no main | 30px | 0 |
| overflow no main | auto | hidden |
| right sidebar | opcional | ausente (Fase 4) |
| mobile behavior | drawer | empilha embaixo |

---

## 7. `MapEditorToolbar`

Organism com duas zonas:

1. **Abas de ferramentas** — ícone + label para cada `ToolKind`: grid, bg, peças, paredes, decorações.
   - Fase 2: apenas `grid` é interativa. As demais ficam visivelmente desabilitadas (`opacity: 0.4`, `cursor: not-allowed`).
   - No mobile as abas ficam em linha horizontal na parte superior da sidebar.

2. **Painel ativo** — monta o painel correspondente à aba selecionada. Na Fase 2 só existe `GridConfigPanel`.

---

## 8. `GridConfigPanel`

Molecule com campos para cada propriedade de `GridShape`:

| Campo | Tipo de input | Validação |
|---|---|---|
| `kind` | Toggle "Quadrada / Hexagonal" | — |
| `cols` | Input numérico | ≥ 1, ≤ 200 |
| `rows` | Input numérico | ≥ 1, ≤ 200 |
| `cellSize` | Input numérico (px) | ≥ 8, ≤ 256 |
| `color` | Color picker (input type="color") | — |
| `opacity` | Slider 0–1 (step 0.05) | — |

Cada mudança chama `store.setGrid(newGrid)` imediatamente — preview ao vivo no canvas.

`skewRatio` e `rotation` existem no `GridShape` mas não têm UI na Fase 2 (entram na Fase 9). O painel não os expõe.

---

## 9. Fluxo de save

```
Usuário edita qualquer campo
  → store action (setGrid / setBg / etc.)
  → isDirty = true
  → botão "Salvar" fica com estilo primário (brandAccent)
  → localStorage["tactical-map-draft:new"] ou ["tactical-map-draft:<id>"] atualizado

Usuário clica "Salvar"
  → TacticalMapEditor.handleSave()
  → validação: nome não vazio, cols/rows/cellSize dentro dos limites
  → onSave(store.map)   // POST em Create, PUT em Edit
  → sucesso:
      store.markClean()
      CreateMapPage: navigate para /campaigns/:campaignId
      EditMapPage: permanece na página, toast "Mapa salvo"
  → erro:
      toast "Não foi possível salvar. Suas alterações estão protegidas localmente."

Usuário tenta sair com isDirty = true
  → window.onbeforeunload dispara → diálogo nativo do browser
```

**Nota sobre draft:** na Fase 2 apenas gravamos no localStorage. A restauração automática ao reabrir uma aba fechada entra na Fase 5 junto com o `EditMapPage` completo.

---

## 10. Canvas sizing via `useResizeObserver`

`TacticalMapStage` precisa de `width` e `height` numéricos explícitos. A `CanvasArea` (div `flex: 1` dentro do template) é medida por um `ResizeObserver`:

```ts
// src/hooks/useResizeObserver.ts
function useResizeObserver(ref: RefObject<Element | null>) {
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

`TacticalMapStage` renderiza somente quando `width > 0 && height > 0` — evita flash com tamanho zero na primeira renderização.

---

## 11. Mapa padrão (Create)

```ts
export const DEFAULT_MAP: Omit<TacticalMap, 'id' | 'campaignId' | 'createdAt' | 'updatedAt'> = {
  name: '',
  description: '',
  grid: {
    kind: 'square',
    cols: 10,
    rows: 10,
    cellSize: 40,
    skewRatio: 1,
    rotation: 0,
    color: '#4a90a4',
    opacity: 0.6,
    lineStyle: 'solid',
  },
  bg: null,
  pieces: [],
  walls: [],
  decorations: [],
  items: [],
};
```

`CreateMapPage` monta um `TacticalMap` completo com este default + `id: crypto.randomUUID()` e `campaignId` da URL. O id temporário existe apenas no estado local do editor — após o POST, o backend retorna o id real e `CreateMapPage` navega para `CampaignPage`, descartando o estado.

---

## 12. Erros

| Situação | Tratamento |
|---|---|
| Save falha (rede/servidor) | Toast genérico; rascunho no localStorage protege alterações |
| Nome vazio ao salvar | Inline error abaixo do campo; save bloqueado |
| cols / rows / cellSize fora do limite | Erro inline no campo; save bloqueado |
| Canvas sem WebGL | Pixi faz fallback Canvas2D automaticamente; sem tratamento extra |

---

## 13. Testes

| O que | Como |
|---|---|
| `GridConfigPanel` | RTL: renderiza, interage com inputs, verifica que `setGrid` é chamado com valores corretos |
| `MapEditorToolbar` — abas | RTL: aba grid ativa abre painel; abas desabilitadas não respondem ao click |
| Fluxo de save em `CreateMapPage` | RTL + msw: preenche nome, altera grid, clica salvar, verifica POST e redirect |
| Fluxo de save em `EditMapPage` | RTL + msw: GET mapa mockado, altera grid, salva, verifica PUT |
| `isDirty` + `onbeforeunload` | RTL: dispara `setGrid`, verifica que `window.onbeforeunload` foi registrado |
| `useResizeObserver` | Não testado em jsdom (ResizeObserver não funciona); validado visualmente em `/dev/tactical-map-demo` |

---

## 14. Integração com o sistema existente

| Surface | Mudança |
|---|---|
| `src/pages/CreateMapPage.tsx` | Reescrever completamente |
| `src/pages/EditMapPage.tsx` | Implementar (era placeholder) |
| `src/features/tactical-map/TacticalMapEditor.tsx` | Substituir casca vazia pela implementação real |
| `src/components/templates/` | + `MapEditorTemplate.tsx` |
| `src/components/organisms/` | + `MapEditorToolbar.tsx` |
| `src/components/molecules/` | + `GridConfigPanel.tsx` |
| `src/hooks/` | + `useResizeObserver.ts` |
| `src/App.tsx` | Nenhuma mudança — rotas já existem da Fase 1 |

Padrões do projeto mantidos: tokens de cor, `import type`, React Query com `enabled: !!token`, `objToSnakeCase` / `objToCamelCase` no service.
