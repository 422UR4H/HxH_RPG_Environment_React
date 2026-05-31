# Testes do tactical map

> O que dá pra testar com Vitest, o que **não dá** (e por quê), e como validar o resto.

## A verdade sobre testar PixiJS

PixiJS desenha com **WebGL**. O Vitest roda em **jsdom** — um "navegador" sem GPU. Não tem WebGL, não tem `<canvas>` funcional pra renderização real.

Consequência: **a saída visual do Pixi não é testável em CI**. Pode ler "a árvore JSX que vai pro Pixi", mas não ver pixels.

Isso **não é problema**. Outros sistemas grandes também separam:

- **Lógica determinística**: testes unitários cobrem 100%
- **Renderização visual**: validação manual + screenshot/visual regression no futuro se virar dor

Aceita a divisão e foca no que é testável.

## Pirâmide de testes deste sistema

```
                  ┌────────────────────┐
                  │ Validação visual   │  ← humano, navegador, /dev/tactical-map-demo
                  └────────────────────┘
              ┌──────────────────────────┐
              │ Integração (msw, Stage   │  ← Vitest, mocka @pixi/react
              │ mockado, fluxos UI)      │
              └──────────────────────────┘
        ┌──────────────────────────────────────┐
        │ Componentes React (Toolbar, painéis) │  ← Testing Library, sem Pixi
        └──────────────────────────────────────┘
   ┌─────────────────────────────────────────────────┐
   │ Store Zustand (actions, undo/redo, save flow)   │  ← Vitest unit
   └─────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ Funções puras (coords, hex, distorção, JSON Patch)       │  ← Vitest unit, table-driven
└──────────────────────────────────────────────────────────┘
```

A base é grande (puro = barato e confiável). O topo é pequeno (manual = caro mas necessário).

## Camada 1 — Funções puras

Onde mora a maior cobertura. Coords, hex, distorção, geração de patches. Sem render, sem mock, sem nada — só math.

```ts
// utils/coords.test.ts
describe('worldToSlot (square)', () => {
  const grid: GridShape = { /* ... */ };

  it.each([
    [{ x: 50, y: 50 }, { kind: 'square', col: 0, row: 0 }],
    [{ x: 150, y: 250 }, { kind: 'square', col: 1, row: 2 }],
    [{ x: 999, y: 999 }, { kind: 'square', col: 9, row: 9 }],
  ])('worldToSlot(%j) → %j', (world, expected) => {
    expect(worldToSlot(world, grid)).toEqual(expected);
  });

  it('respeita skewRatio', () => { /* ... */ });
  it('respeita rotation', () => { /* ... */ });
});
```

Casos especiais que valem testes:
- Borda exata do slot (ex: `{ x: 100, y: 100 }` com `cellSize: 100` → qual slot?)
- Coordenadas negativas (fora do grid)
- Hex com `(0, 0)` e os 6 vizinhos diretos
- Distorção isométrica e rotação combinadas

## Camada 2 — Store Zustand

Instancia a store, dispara actions, asserta estado:

```ts
// store/editorStore.test.ts
describe('editorStore', () => {
  beforeEach(() => {
    useEditorStore.setState(initialState);
  });

  it('placePiece adiciona uma peça e marca isDirty', () => {
    useEditorStore.getState().loadMap(fakeMap);
    useEditorStore.getState().placePiece('char-1', { kind: 'square', col: 3, row: 4 });

    const state = useEditorStore.getState();
    expect(state.map?.pieces).toHaveLength(1);
    expect(state.isDirty).toBe(true);
  });

  it('undo() reverte a última mudança', () => {
    useEditorStore.getState().loadMap(fakeMap);
    useEditorStore.getState().placePiece('char-1', { kind: 'square', col: 3, row: 4 });
    useEditorStore.temporal.getState().undo();

    expect(useEditorStore.getState().map?.pieces).toHaveLength(0);
  });
});
```

## Camada 3 — Componentes React (sem Pixi)

Tudo que é HTML puro: toolbar, painéis, modais, roster. Testing Library normal:

```tsx
// GridConfigPanel.test.tsx
it('muda o tipo de malha ao clicar em hex', async () => {
  const setGrid = vi.fn();
  render(<GridConfigPanel grid={squareGrid} onChange={setGrid} />);

  await userEvent.click(screen.getByRole('button', { name: /hexagonal/i }));

  expect(setGrid).toHaveBeenCalledWith(expect.objectContaining({ kind: 'hex' }));
});
```

Esses componentes não conhecem PixiJS. Não tem mock. Não tem complicação.

## Camada 4 — `TacticalMapStage` (com @pixi/react mockado)

Aqui mocka `@pixi/react` no `vitest.setup.ts`:

```ts
// vitest.setup.ts
vi.mock('@pixi/react', () => ({
  Application: ({ children }: any) => <div data-testid="pixi-app">{children}</div>,
  Viewport: ({ children }: any) => <div data-testid="pixi-viewport">{children}</div>,
  // ... outros componentes mockados como divs com data-testid
}));
```

Com isso, testes podem asserir **a estrutura da árvore Pixi** mesmo sem WebGL:

```tsx
// TacticalMapStage.test.tsx
it('renderiza uma sprite por peça', () => {
  render(<TacticalMapStage map={mapWith3Pieces} />);

  expect(screen.getAllByTestId('pixi-sprite')).toHaveLength(3);
});

it('renderiza bg quando bg !== null', () => {
  render(<TacticalMapStage map={{ ...mapEmpty, bg: fakeBg }} />);

  expect(screen.getByTestId('pixi-bg-sprite')).toBeInTheDocument();
});
```

**O que NÃO se testa aqui**: posições em pixels, cores das sprites, animações. Isso vai pra validação visual.

## Camada 5 — Integração (drag → store → save)

Testa fluxos do editor de ponta a ponta, sem o Pixi real:

```tsx
// CreateMapPage.test.tsx
it('mestre cria mapa quadrado 10x10 e salva', async () => {
  // msw mocka POST /campaigns/:id/maps
  render(<CreateMapPage />, { wrapper: testWrapper });

  await userEvent.click(screen.getByRole('button', { name: /quadrada/i }));
  await userEvent.type(screen.getByLabelText(/colunas/i), '10');
  await userEvent.type(screen.getByLabelText(/linhas/i), '10');
  await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

  await waitFor(() => {
    expect(screen.getByText(/salvo/i)).toBeInTheDocument();
  });
});
```

O `TacticalMapStage` aparece mockado (não renderiza Pixi). Foco no fluxo de dados e na UI HTML.

## Camada 6 — Sincronização WS (Fase 7+)

Igual ao padrão de `useLobbyWs.test.tsx`: msw com handler de WebSocket:

```ts
// useMatchMapWs.test.ts
const wsHandler = ws.link('ws://localhost/match-map');

const server = setupServer(
  wsHandler.addEventListener('connection', ({ client }) => {
    client.send(JSON.stringify({
      type: 'master_action_broadcast',
      payload: { kind: 'move_piece', /* ... */ }
    }));
  })
);

it('aplica master_action recebida no store', async () => {
  render(<TestComponent />, { wrapper: testWrapper });

  await waitFor(() => {
    expect(useEditorStore.getState().map?.pieces[0].coord.slot.col).toBe(6);
  });
});
```

## Camada 7 — Validação visual

A rota `/dev/tactical-map-demo` (criada na Fase 0) é onde você abre o navegador e **olha**. Tem mapa hardcoded com:
- Malha quadrada e hexagonal alternando
- Bg image fictícia
- 5 peças com z variando
- (Fases futuras: paredes, decorações, etc.)

Cada feature nova → essa rota cresce → você dá uma olhada visualmente antes de PR. Quando entrar Fase 9 (isométrico), adicione um mapa isométrico ali. Quando entrar Fase 11 (PNGs), adicione decoração ali.

**O que validar visualmente**:
- Malha aparece com o número certo de slots
- Peças no centro do slot
- Bg aparece debaixo da malha
- Pan e pinch-zoom funcionam (mobile e desktop)
- Animação de movimento é suave
- Rotação e distorção isométrica não quebram o math (peças continuam nos slots certos)

## Mocks padronizados

Centralize fixtures em `src/features/tactical-map/__fixtures__/` (siga o padrão dos `factories/` do sheet feature):

```ts
// __fixtures__/maps.ts
export const fakeSquareMap10x10: TacticalMap = {
  id: 'fake-map-1',
  campaignId: 'fake-campaign-1',
  name: 'Test Map',
  grid: { kind: 'square', cols: 10, rows: 10, /* ... */ },
  bg: null,
  pieces: [],
  walls: [],
  decorations: [],
  items: [],
  createdAt: '2026-05-31T00:00:00Z',
  updatedAt: '2026-05-31T00:00:00Z',
};

export const fakePiece = (overrides?: Partial<Piece>): Piece => ({
  id: 'p1',
  characterId: 'char-1',
  coord: { slot: { kind: 'square', col: 0, row: 0 }, z: 0 },
  visible: true,
  ...overrides,
});
```

Reuso entre testes evita duplicação e mantém consistência.

## Quando algo "passa nos testes" mas quebra no navegador

Quase sempre uma das causas:

1. **Math errado de coord** (tema do `coordinates.md`). Bug de pixel? Cheque `slotToWorld` / `worldToSlot` com testes table-driven. Provavelmente falta um caso.
2. **Re-render que não deveria acontecer**. Use selectors granulares do Zustand. Devtools do React mostram cascata.
3. **Memory leak**. `@pixi/react` cuida da maior parte, mas se você cria recursos Pixi por fora (texturas, filtros), tem que dar `destroy()` no cleanup.
4. **Touch event não dispara**. Em mobile, `eventMode` precisa ser `static`; em alguns navegadores velhos, precisa adicionar `touch-action: none` no CSS do container.

## Métrica subjetiva: "está testado o suficiente"

Pergunta-guia: **se eu mudar este código sem querer, algum teste vai gritar?**

- Math/coords: SIM, sempre. Não muda math sem teste.
- Store actions: SIM, fluxo crítico de undo/save.
- Componentes React: SIM, mas só pra comportamento (não pra style).
- Pixi rendering: depende da rota dev visual.

Quando a resposta é "não, e o usuário vai gritar", é hora de adicionar teste.

## Ferramentas relevantes

- **Vitest** (já no projeto): runner de testes.
- **Testing Library** (já no projeto): renderiza React, simula interação.
- **msw** (já no projeto): mocka REST e WebSocket.
- **Visual companion** das skills do Claude Code: durante brainstorm, valida mockups antes de codar.
- (Futuro) **Playwright + visual regression**: se a validação manual virar gargalo, automatizamos com screenshots.
