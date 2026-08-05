# Fase 10-E — Fog de polígono (frontend) — Plano de Implementação

> **Para quem implementa:** execute tarefa por tarefa, na ordem. Cada passo é uma ação
> de 2–5 minutos. Não pule os passos de "rodar e ver falhar" — eles são o que prova que
> o teste testa alguma coisa.

**Spec de referência (leia antes de começar):**
`System_X_System/docs/superpowers/specs/2026-08-04-tactical-map-fog-10e-design.md`
(repo do backend). Este plano assume as decisões dela; não re-decida nada aqui.

**Objetivo:** substituir a borda quadriculada do fog do jogador pela borda poligonal
real, aplicando o polígono de visibilidade que o backend **já envia** como máscara
invertida sobre a camada de fog.

**Branch:** `feat/tactical-map-fog-polygon-10e` (já criada)

**Arquivos:**
- Modificar: `src/features/tactical-map/utils/fog.ts`
- Criar: `src/features/tactical-map/utils/fogDraw.ts`
- Reescrever: `src/components/organisms/FogLayer.tsx`
- Modificar: `src/features/tactical-map/utils/__tests__/fogTiers.test.ts`
- Criar: `src/features/tactical-map/utils/__tests__/fogDraw.test.ts`
- Modificar: `docs/dev/tactical-map/pixi-stack.md`

---

## Contexto que você precisa antes de escrever qualquer linha

Leia esta seção inteira. Ela cobre justamente o que não dá para descobrir olhando o
código, e três dos itens já causaram bug em produção nesta feature.

### 1. Os polígonos já vêm em coordenadas de mundo — NÃO aplique `applyTransform`

`fog.visiblePolygons` é `Array<Array<[number, number]>>` em coordenadas de mundo,
produzido pelo backend. As **células** precisam de `applyTransform` (elas nascem em
espaço local do grid); os **polígonos não**. O código atual já os compara direto contra
saídas de `slotToWorld`, então desenhá-los crus mantém o comportamento vigente.

Aplicar `applyTransform` nos polígonos é o erro mais provável desta tarefa. Não faça.

### 2. `setMask` é a única forma correta de ligar o inverse

```ts
container.setMask({ mask: graphics, inverse: true });
```

**Nunca** escreva `container._maskOptions.inverse = true`. `_maskOptions` é um objeto
compartilhado no protótipo do mixin do Pixi: mutá-lo direto liga inverse em todo
container da aplicação que nunca chamou `setMask`. `setMask` cria uma cópia própria.

### 3. A máscara NÃO pode receber `visible={false}`

A máscara é filha do container mascarado. Parece "conteúdo indesejado", mas o
`StencilMaskPipe` do Pixi já resolve isso: ele marca `includeInBuild = false` depois de
coletar a geometria, então ela não é desenhada como conteúdo.

Se você marcar `visible={false}`, o Pixi deixa de coletar a geometria da máscara, a
máscara fica vazia, e a máscara invertida passa a renderizar fog em **todo lugar** — o
mapa inteiro escuro, sem erro nenhum no console. É exatamente o sintoma que a fase 10-D
levou semanas para diagnosticar. Não faça.

### 4. Não use `blendMode` em lugar nenhum

`blendMode="erase"` sem render target isolado perfura o framebuffer principal até a cor
de limpeza do canvas e pinta a área iluminada de preto sólido. `isRenderGroup` **não**
cria render target isolado. Esta fase não usa blending: os níveis de fog são regiões
disjuntas e a área visível é removida pela máscara.

### 5. Sobreposição de polígonos é segura aqui

Um jogador com duas peças gera dois polígonos que podem se sobrepor. No stencil do Pixi
isso vira **união** (o modo de escrita compara `equal` e faz `increment-clamp`, então o
segundo polígono não incrementa de novo por cima do primeiro). Não tente unir polígonos
em software; desenhe cada um como um subpath e chame `fill()` uma vez.

---

## Task 1: `fogTiers` para de classificar visibilidade

Com a máscara cuidando da área visível, o classificador só precisa separar "lembrado"
de "desconhecido". Isso remove ~120 mil operações de point-in-polygon por atualização
de fog e elimina a fonte do quadriculado.

**Arquivos:**
- Modificar: `src/features/tactical-map/utils/fog.ts`
- Modificar: `src/features/tactical-map/utils/__tests__/fogTiers.test.ts`

- [ ] **Passo 1: reescrever o teste primeiro**

Substitua o conteúdo inteiro de
`src/features/tactical-map/utils/__tests__/fogTiers.test.ts` por:

```ts
import { describe, it, expect } from "vitest";
import { fogTiers, cellKey } from "../fog";
import type { GridShape } from "../../../../types/tacticalMap";
import realPayload from "./fixtures/realFogPayload.json";

// A fixture is produced by the backend smoke test running against the real match
// (System_X_System/internal/app/game/fog_smoke_test.go, SMOKE_DUMP). Testing against
// it means the frontend is validated with production data rather than numbers invented
// to make the test pass.

type Payload = {
  visible_polygons: Array<Array<{ x: number; y: number }>>;
  explored_cells: Array<[number, number]>;
  fog_mode: string;
  grid: { kind: string; cols: number; rows: number; cell_size: number; skew_ratio: number };
};

const payload = realPayload as unknown as Payload;

const grid: GridShape = {
  kind: "square",
  cols: payload.grid.cols,
  rows: payload.grid.rows,
  cellSize: payload.grid.cell_size,
  skewRatio: payload.grid.skew_ratio,
  rotation: 0,
} as GridShape;

const explored = new Set(payload.explored_cells.map(([a, b]) => cellKey(a, b)));

describe("fogTiers", () => {
  it("covers every cell of the board exactly once", () => {
    const tiers = fogTiers(grid, explored, "explored");
    const seen = new Set<string>();
    for (const [a, b] of [...tiers.hidden, ...tiers.explored]) {
      const k = cellKey(a, b);
      expect(seen.has(k)).toBe(false);
      seen.add(k);
    }
    expect(seen.size).toBe(grid.cols * grid.rows);
  });

  it("keeps every classified cell on the board", () => {
    const tiers = fogTiers(grid, explored, "explored");
    for (const [a, b] of [...tiers.hidden, ...tiers.explored]) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(grid.cols);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(grid.rows);
    }
  });

  it("marks the explored cells the backend sent as remembered", () => {
    const tiers = fogTiers(grid, explored, "explored");
    const remembered = new Set(tiers.explored.map(([a, b]) => cellKey(a, b)));
    for (const key of explored) {
      expect(remembered.has(key)).toBe(true);
    }
  });

  it("ignores explored cells in live mode — everything unseen is unknown", () => {
    const live = fogTiers(grid, explored, "live");
    expect(live.explored.length).toBe(0);
    expect(live.hidden.length).toBe(grid.cols * grid.rows);
  });

  it("falls back to full darkness when nothing was ever explored", () => {
    const dark = fogTiers(grid, new Set(), "explored");
    expect(dark.hidden.length).toBe(grid.cols * grid.rows);
    expect(dark.explored.length).toBe(0);
  });
});
```

> Nota: o teste `"marks the explored cells the backend sent as remembered"` só é válido
> porque o backend nunca envia célula fora do tabuleiro. Se ele falhar, o bug está no
> backend, não aqui.

- [ ] **Passo 2: rodar e ver falhar**

```bash
npm test -- fogTiers
```

Esperado: FALHA de tipo/aridade — `fogTiers` ainda espera 5 argumentos.

- [ ] **Passo 3: simplificar `fogTiers` e remover `pointInPolygon`**

Em `src/features/tactical-map/utils/fog.ts`:

**Remova** integralmente a função `pointInPolygon` (linhas 20–31 do arquivo atual). Ela
fica sem nenhum uso depois desta fase, e mantê-la convida alguém a reintroduzir fog por
célula. Se algum dia precisar de novo, o git tem.

**Substitua** o bloco `export type FogTier` + `export function fogTiers(...)` inteiro
por:

```ts
export type FogTier = "hidden" | "explored" | "visible";

/**
 * Fog tier for every cell of the grid.
 *
 * This classifier does NOT know about line of sight. The currently visible area is
 * removed by an inverse stencil mask built from the backend's visibility polygons
 * (see FogLayer and fogDraw.ts), which is what gives the fog its smooth polygonal
 * edge instead of a grid-aligned one.
 *
 * The two tiers are DISJOINT on purpose. Stacking translucent layers would darken
 * their overlap, and the obvious fix — an "erase" blend mode — only works when the
 * layer owns an isolated render target. Erasing onto the main framebuffer punches
 * through to the canvas clear colour, so the lit area comes out pure black. Disjoint
 * regions need no blending at all: each cell is painted exactly once.
 */
export function fogTiers(
  grid: GridShape,
  exploredCells: ReadonlySet<string>,
  fogMode: "live" | "explored",
): { hidden: Array<[number, number]>; explored: Array<[number, number]> } {
  const hidden: Array<[number, number]> = [];
  const explored: Array<[number, number]> = [];

  for (let b = 0; b < grid.rows; b++) {
    for (let a = 0; a < grid.cols; a++) {
      if (fogMode === "explored" && exploredCells.has(cellKey(a, b))) {
        explored.push([a, b]);
      } else {
        hidden.push([a, b]);
      }
    }
  }
  return { hidden, explored };
}
```

Mantenha `cellKey`, `parseExploredDelta`, `mergeExplored` e `cellCornersLocal`
exatamente como estão.

- [ ] **Passo 4: rodar e ver passar**

```bash
npm test -- fogTiers
```

Esperado: PASS, 5 testes.

> `FogLayer.tsx` fica quebrado neste ponto (ainda chama `fogTiers` com 5 argumentos).
> É esperado — a Task 3 conserta. Não tente consertar agora.

- [ ] **Passo 5: commit**

```bash
git add src/features/tactical-map/utils/fog.ts \
        src/features/tactical-map/utils/__tests__/fogTiers.test.ts
git commit -m "refactor(fog): fogTiers deixa de classificar visibilidade

A área visível passa a ser removida por máscara invertida, então o
classificador só precisa separar célula lembrada de desconhecida. Remove
~120k operações de point-in-polygon por atualização de fog e elimina a
fonte da borda quadriculada."
```

---

## Task 2: funções de desenho puras e testáveis

Extrair o desenho para funções puras é o que torna possível testar composição de fog
sem WebGL. O alvo é uma interface estrutural mínima, não `Graphics` do Pixi, para que o
teste possa gravar as chamadas.

**Arquivos:**
- Criar: `src/features/tactical-map/utils/fogDraw.ts`
- Criar: `src/features/tactical-map/utils/__tests__/fogDraw.test.ts`

- [ ] **Passo 1: escrever o teste primeiro**

Crie `src/features/tactical-map/utils/__tests__/fogDraw.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  drawFogTiers,
  drawLosMask,
  EXPLORED_ALPHA,
  FOG_PADDING,
  UNEXPLORED_ALPHA,
  type FogDrawTarget,
} from "../fogDraw";
import { fogTiers, cellKey } from "../fog";
import type { GridShape, VisibilityPolygon } from "../../../../types/tacticalMap";
import realPayload from "./fixtures/realFogPayload.json";

type Payload = {
  visible_polygons: Array<Array<{ x: number; y: number }>>;
  explored_cells: Array<[number, number]>;
  grid: { cols: number; rows: number; cell_size: number; skew_ratio: number };
};
const payload = realPayload as unknown as Payload;

const grid: GridShape = {
  kind: "square",
  cols: payload.grid.cols,
  rows: payload.grid.rows,
  cellSize: payload.grid.cell_size,
  skewRatio: payload.grid.skew_ratio,
  rotation: 0,
} as GridShape;

const polys: VisibilityPolygon[] = payload.visible_polygons.map((p) =>
  p.map((pt) => [pt.x, pt.y] as [number, number]),
);

type Call =
  | { op: "clear" }
  | { op: "moveTo" | "lineTo"; x: number; y: number }
  | { op: "closePath" }
  | { op: "fill"; style: { color: number; alpha?: number } };

function recorder() {
  const calls: Call[] = [];
  const g: FogDrawTarget = {
    clear: () => calls.push({ op: "clear" }),
    moveTo: (x, y) => calls.push({ op: "moveTo", x, y }),
    lineTo: (x, y) => calls.push({ op: "lineTo", x, y }),
    closePath: () => calls.push({ op: "closePath" }),
    // The whole style object is kept, not just its fields: asserting on its exact
    // keys is what catches someone reintroducing a blend mode.
    fill: (s) => calls.push({ op: "fill", style: s }),
  };
  return { g, calls };
}

const points = (calls: Call[]) =>
  calls.filter((c): c is Extract<Call, { x: number }> => c.op === "moveTo" || c.op === "lineTo");

const fillsOf = (calls: Call[]) =>
  calls.filter((c): c is Extract<Call, { op: "fill" }> => c.op === "fill");

describe("drawLosMask", () => {
  it("draws one subpath per polygon and fills exactly once, fully opaque", () => {
    const { g, calls } = recorder();
    drawLosMask(g, polys);

    expect(calls.filter((c) => c.op === "closePath").length).toBe(polys.length);
    expect(calls.filter((c) => c.op === "moveTo").length).toBe(polys.length);

    const fills = fillsOf(calls);
    expect(fills.length).toBe(1);
    expect(fills[0].style.alpha).toBe(1);
  });

  it("emits every polygon vertex, untransformed", () => {
    const { g, calls } = recorder();
    drawLosMask(g, polys);

    const total = polys.reduce((n, p) => n + p.length, 0);
    expect(points(calls).length).toBe(total);
    // First vertex must be passed through verbatim: polygons already arrive in world
    // space, so applying the grid transform to them would be a bug.
    expect(points(calls)[0].x).toBe(polys[0][0][0]);
    expect(points(calls)[0].y).toBe(polys[0][0][1]);
  });

  it("keeps the whole polygon inside the board", () => {
    // Regression guard: before BoundaryLOSWalls the sweep produced a 7505x9734
    // polygon on a 3360x3360 board, which lit up the entire screen.
    const { g, calls } = recorder();
    drawLosMask(g, polys);

    const w = grid.cols * grid.cellSize;
    const h = grid.rows * grid.cellSize;
    for (const p of points(calls)) {
      expect(p.x).toBeGreaterThanOrEqual(-1);
      expect(p.x).toBeLessThanOrEqual(w + 1);
      expect(p.y).toBeGreaterThanOrEqual(-1);
      expect(p.y).toBeLessThanOrEqual(h + 1);
    }
  });

  it("encloses a real area — the player can actually see something", () => {
    const { g, calls } = recorder();
    drawLosMask(g, polys);
    const pts = points(calls);

    let area = 0; // shoelace over the first polygon
    const n = polys[0].length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      area += pts[j].x * pts[i].y - pts[i].x * pts[j].y;
    }
    expect(Math.abs(area) / 2).toBeGreaterThan(0);
  });

  it("draws nothing at all when there is no line of sight", () => {
    const { g, calls } = recorder();
    drawLosMask(g, []);
    expect(calls.filter((c) => c.op === "fill").length).toBe(0);
  });

  it("skips degenerate polygons with fewer than three vertices", () => {
    const { g, calls } = recorder();
    drawLosMask(g, [[[0, 0], [10, 10]]]);
    expect(calls.filter((c) => c.op === "fill").length).toBe(0);
    expect(calls.filter((c) => c.op === "closePath").length).toBe(0);
  });
});

describe("drawFogTiers", () => {
  const explored = new Set(payload.explored_cells.map(([a, b]) => cellKey(a, b)));
  const w = grid.cols * grid.cellSize;
  const h = grid.rows * grid.cellSize;

  it("uses only the two fog alphas and never any blend mode", () => {
    const { g, calls } = recorder();
    drawFogTiers(g, fogTiers(grid, explored, "explored"), grid, w, h);

    const fills = fillsOf(calls);
    expect(fills.length).toBe(3); // ring, hidden cells, explored cells
    const alphas = new Set(fills.map((f) => f.style.alpha));
    expect(alphas).toEqual(new Set([UNEXPLORED_ALPHA, EXPLORED_ALPHA]));
    // Exactly these keys: a blendMode slipping into the fill is the phase 10-D bug.
    for (const f of fills) {
      expect(Object.keys(f.style).sort()).toEqual(["alpha", "color"]);
    }
  });

  it("pads the fog well beyond the board so panning never exposes a bare edge", () => {
    const { g, calls } = recorder();
    drawFogTiers(g, fogTiers(grid, explored, "explored"), grid, w, h);

    // reduce, not Math.min(...pts): the board emits thousands of points and spreading
    // them as arguments risks blowing the call stack.
    const pts = points(calls);
    const minX = pts.reduce((m, p) => Math.min(m, p.x), Infinity);
    const maxX = pts.reduce((m, p) => Math.max(m, p.x), -Infinity);
    expect(minX).toBeLessThanOrEqual(-FOG_PADDING);
    expect(maxX).toBeGreaterThanOrEqual(w + FOG_PADDING);
  });

  it("emits a single fill for the ring when the board has no cells to paint", () => {
    const { g, calls } = recorder();
    drawFogTiers(g, { hidden: [], explored: [] }, grid, w, h);
    expect(calls.filter((c) => c.op === "fill").length).toBe(1);
  });

  it("clears before drawing so repeated frames do not accumulate geometry", () => {
    const { g, calls } = recorder();
    drawFogTiers(g, fogTiers(grid, explored, "explored"), grid, w, h);
    expect(calls[0].op).toBe("clear");
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

```bash
npm test -- fogDraw
```

Esperado: FALHA — `../fogDraw` não existe.

- [ ] **Passo 3: criar `fogDraw.ts`**

Crie `src/features/tactical-map/utils/fogDraw.ts` com exatamente:

```ts
import type { GridShape, VisibilityPolygon } from "../../../types/tacticalMap";
import { applyTransform } from "./coords";
import { cellCornersLocal } from "./fog";

export const FOG_COLOR = 0x05070a;
export const UNEXPLORED_ALPHA = 0.92;
export const EXPLORED_ALPHA = 0.5;
/** Padding around the board so panning never exposes an un-fogged edge. */
export const FOG_PADDING = 2000;

/**
 * The subset of Pixi's Graphics API these drawing routines use.
 *
 * Depending on the structural type instead of Graphics itself is what lets the tests
 * record the calls and assert on the resulting geometry and alphas without a WebGL
 * context. Return types are `unknown` because Pixi's methods return `this`.
 */
export type FogDrawTarget = {
  clear(): unknown;
  moveTo(x: number, y: number): unknown;
  lineTo(x: number, y: number): unknown;
  closePath(): unknown;
  fill(style: { color: number; alpha?: number }): unknown;
};

function paintCells(
  g: FogDrawTarget,
  cells: Array<[number, number]>,
  grid: GridShape,
  alpha: number,
): void {
  if (cells.length === 0) return;
  for (const [a, b] of cells) {
    const corners = cellCornersLocal(a, b, grid);
    const first = applyTransform({ x: corners[0][0], y: corners[0][1] }, grid);
    g.moveTo(first.x, first.y);
    for (let i = 1; i < corners.length; i++) {
      const pt = applyTransform({ x: corners[i][0], y: corners[i][1] }, grid);
      g.lineTo(pt.x, pt.y);
    }
    g.closePath();
  }
  g.fill({ color: FOG_COLOR, alpha });
}

/**
 * Paints the fog itself: a ring well outside the board plus one quad per fogged cell.
 *
 * Every region is disjoint, so no blending is involved and each area lands at exactly
 * its intended alpha. The currently visible area is NOT handled here — it is removed
 * by the inverse mask drawn by drawLosMask.
 */
export function drawFogTiers(
  g: FogDrawTarget,
  tiers: { hidden: Array<[number, number]>; explored: Array<[number, number]> },
  grid: GridShape,
  worldWidth: number,
  worldHeight: number,
): void {
  g.clear();

  const P = FOG_PADDING;
  const ring: Array<[number, number, number, number]> = [
    [-P, -P, worldWidth + P, 0],
    [-P, worldHeight, worldWidth + P, worldHeight + P],
    [-P, 0, 0, worldHeight],
    [worldWidth, 0, worldWidth + P, worldHeight],
  ];
  for (const [x0, y0, x1, y1] of ring) {
    g.moveTo(x0, y0);
    g.lineTo(x1, y0);
    g.lineTo(x1, y1);
    g.lineTo(x0, y1);
    g.closePath();
  }
  g.fill({ color: FOG_COLOR, alpha: UNEXPLORED_ALPHA });

  paintCells(g, tiers.hidden, grid, UNEXPLORED_ALPHA);
  paintCells(g, tiers.explored, grid, EXPLORED_ALPHA);
}

/**
 * Draws the player's line of sight, to be used as an INVERSE mask over the fog.
 *
 * The points are written verbatim: the backend already produces them in world space,
 * so running them through applyTransform would displace the lit area.
 *
 * Overlapping polygons (a player with two pieces standing close together) are safe.
 * Pixi's stencil mask writes with `compare: equal` + `increment-clamp`, so a second
 * polygon over the same pixel does not increment again — overlaps union rather than
 * cancel out.
 */
export function drawLosMask(g: FogDrawTarget, polygons: VisibilityPolygon[]): void {
  g.clear();

  let drewAny = false;
  for (const poly of polygons) {
    if (poly.length < 3) continue;
    g.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) {
      g.lineTo(poly[i][0], poly[i][1]);
    }
    g.closePath();
    drewAny = true;
  }
  // The colour is irrelevant — a stencil mask only cares about coverage — but the fill
  // must happen, otherwise there is no geometry and the inverse mask fogs everything.
  if (drewAny) g.fill({ color: 0xffffff, alpha: 1 });
}
```

- [ ] **Passo 4: rodar e ver passar**

```bash
npm test -- fogDraw
```

Esperado: PASS, 10 testes.

- [ ] **Passo 5: commit**

```bash
git add src/features/tactical-map/utils/fogDraw.ts \
        src/features/tactical-map/utils/__tests__/fogDraw.test.ts
git commit -m "feat(fog): funções de desenho puras para fog e máscara de LOS

Extrai o desenho do FogLayer para funções puras sobre um alvo estrutural
mínimo, testáveis sem contexto WebGL. Os testes rodam contra o payload real
exportado da partida de teste e guardam a regressão do polígono maior que o
tabuleiro."
```

---

## Task 3: `FogLayer` aplica a máscara invertida

**Arquivos:**
- Reescrever: `src/components/organisms/FogLayer.tsx`

- [ ] **Passo 1: substituir o arquivo inteiro**

Conteúdo completo de `src/components/organisms/FogLayer.tsx`:

```tsx
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import type { Container as PixiContainer, Graphics as PixiGraphics } from "pixi.js";
import type { GridShape, FogState } from "../../types/tacticalMap";
import { fogTiers } from "../../features/tactical-map/utils/fog";
import { drawFogTiers, drawLosMask } from "../../features/tactical-map/utils/fogDraw";

type Props = {
  fog: FogState;
  grid: GridShape;
  worldWidth: number;
  worldHeight: number;
  disabled: boolean;
};

export default function FogLayer({ fog, grid, worldWidth, worldHeight, disabled }: Props) {
  if (disabled) return null;

  return (
    <FogLayerInner
      fog={fog}
      grid={grid}
      worldWidth={worldWidth}
      worldHeight={worldHeight}
    />
  );
}

// Inner component avoids calling hooks conditionally (hooks must not be called after
// an early return that depends on a prop).
type InnerProps = Omit<Props, "disabled">;

function FogLayerInner({ fog, grid, worldWidth, worldHeight }: InnerProps) {
  const containerRef = useRef<PixiContainer>(null);
  const maskRef = useRef<PixiGraphics>(null);

  // Cells are classified once per fog/grid change, not per frame.
  const tiers = useMemo(
    () => fogTiers(grid, fog.exploredCells, fog.fogMode),
    [grid, fog.exploredCells, fog.fogMode],
  );

  const drawTiers = useCallback(
    (g: PixiGraphics) => drawFogTiers(g, tiers, grid, worldWidth, worldHeight),
    [tiers, grid, worldWidth, worldHeight],
  );

  const drawMask = useCallback(
    (g: PixiGraphics) => drawLosMask(g, fog.visiblePolygons),
    [fog.visiblePolygons],
  );

  // The lit area is carved out of the fog by an INVERSE stencil mask built from the
  // backend's visibility polygons. That is what gives the edge its true polygonal
  // shape — rays from the wall corners — instead of following the grid.
  //
  // No dependency array on purpose: the guard makes re-runs free, and it keeps the
  // mask correct if @pixi/react ever swaps either instance.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const mask = maskRef.current;
    if (!container || !mask || container.mask === mask) return;

    if (typeof container.setMask !== "function") {
      // Failing loudly matters here: without the mask the fog silently covers the
      // whole board with no console error, which is precisely the failure mode that
      // hid the phase 10-D bugs for weeks.
      throw new Error("FogLayer: Container.setMask is unavailable — cannot apply the inverse LOS mask");
    }
    container.setMask({ mask, inverse: true });
  });

  return (
    <pixiContainer label="fog-layer" ref={containerRef}>
      <pixiGraphics draw={drawTiers} />
      {/* Do NOT set visible={false} here. Pixi's StencilMaskPipe already keeps the
          mask out of the rendered content (it flips includeInBuild off after
          collecting the geometry). Hiding it makes the mask empty, and an empty
          inverse mask fogs the entire board. */}
      <pixiGraphics draw={drawMask} label="fog-los-mask" ref={maskRef} />
    </pixiContainer>
  );
}
```

- [ ] **Passo 2: typecheck e lint**

```bash
npm run build && npm run lint
```

Esperado: ambos limpos.

> Se `drawFogTiers(g, ...)` acusar incompatibilidade entre `PixiGraphics` e
> `FogDrawTarget`, **não** relaxe o tipo para `any`. O ponto de fricção provável é a
> assinatura de `fill`; alinhe o parâmetro em `FogDrawTarget` ao que o Pixi declara,
> mantendo `color` e `alpha` acessíveis para os testes.

- [ ] **Passo 3: suíte completa**

```bash
npm test
```

Esperado: tudo passa **exceto** a falha pré-existente em `NpcRosterPanel`, que já
falhava antes desta branch e não é escopo desta fase.

- [ ] **Passo 4: commit**

```bash
git add src/components/organisms/FogLayer.tsx
git commit -m "feat(fog): borda de luz poligonal via máscara invertida

Aplica os polígonos de visibilidade do backend como máscara invertida
(setMask inverse) sobre a camada de fog, no lugar da classificação por
célula. A fronteira da visão passa a ser a geometria real — arestas saindo
das quinas das paredes — como no Foundry.

Nada de blendMode: erase sem render target isolado perfura o framebuffer
principal e pinta a área iluminada de preto."
```

---

## Task 4: documentar a técnica

O "por que não blendMode" e o "por que máscara invertida" são conhecimento caro. Sem
registro, alguém tenta `erase` de novo.

**Arquivos:**
- Modificar: `docs/dev/tactical-map/pixi-stack.md`

- [ ] **Passo 1: acrescentar seção ao fim de `docs/dev/tactical-map/pixi-stack.md`**

```markdown
## Fog de guerra: composição sem blending

O fog do jogador tem três níveis (desconhecido, lembrado, visível) e **não** usa
blend mode. Duas tentativas erradas, para não repetir:

- `blendMode="erase"` na camada de fog perfura o framebuffer principal até a cor de
  limpeza do canvas. A área "iluminada" sai preta sólida em vez de revelar o mapa.
- `isRenderGroup` **não** resolve: ele não cria render target isolado.

O que funciona:

1. **Regiões disjuntas** para os níveis de fog. Cada célula é pintada no máximo uma
   vez, com o alpha do seu nível (`drawFogTiers` em
   `features/tactical-map/utils/fogDraw.ts`). Sem sobreposição, sem blending.
2. **Máscara invertida** para a área visível:
   `container.setMask({ mask: losGraphics, inverse: true })`. O conteúdo renderiza
   onde a máscara não está, então o fog some exatamente dentro do polígono de
   visibilidade que o backend envia.

Três armadilhas do Pixi v8 nesse caminho:

- A máscara é filha do container mascarado e **não pode** receber `visible={false}` —
  o `StencilMaskPipe` deixaria de coletar a geometria, a máscara ficaria vazia, e uma
  máscara invertida vazia escurece o tabuleiro inteiro, sem erro no console.
- `inverse` só se liga por `setMask({ mask, inverse: true })`. `_maskOptions` é objeto
  compartilhado no protótipo do mixin; mutá-lo direto vaza para outros containers.
- Polígonos sobrepostos são seguros: o stencil escreve com `compare: equal` +
  `increment-clamp`, então sobreposição vira união, não XOR.

`Graphics.cut()` foi avaliado e descartado: earcut não define comportamento para furos
sobrepostos (jogador com duas peças), e `cut()` anexa o segundo furo em diante também
à instrução de fill anterior.
```

- [ ] **Passo 2: commit**

```bash
git add docs/dev/tactical-map/pixi-stack.md
git commit -m "docs(tactical-map): registrar composição do fog sem blending"
```

---

## Verificação final (obrigatória antes de abrir PR)

Exigida pelo `CLAUDE.md` da raiz do projeto — nenhuma das duas etapas é opcional.

- [ ] **Passo 1: a partir de `System_X_System_Project/`**

```bash
./dev-checkout.sh feat/tactical-map-fog-polygon-10e
```

- [ ] **Passo 2: verificação visual em `http://localhost:5173`**

Abra a mesma partida em duas janelas, uma como mestre e outra como jogador, e confira
a lista da seção 7 da spec:

- [ ] A área iluminada do jogador é um leque de arestas retas saindo das quinas das
      paredes, em ângulos arbitrários — não segue as bordas do grid.
- [ ] Não existe retângulo preto sólido em lugar nenhum.
- [ ] Paredes e portas continuam visíveis para o jogador.
- [ ] Em modo `explored`, a área lembrada continua cinza médio e quadriculada, e a
      transição para a área iluminada corta as células ao meio.
- [ ] O mestre continua sem fog nenhum.
- [ ] Mover uma peça reacende o leque na posição nova sem piscar preto.

Se qualquer item falhar, **não abra o PR**. Relate o que viu, com print, antes de
tentar corrigir — o histórico desta feature mostra que consertar por palpite custa
mais caro que diagnosticar.

- [ ] **Passo 3: abrir o PR**

```bash
git push -u origin feat/tactical-map-fog-polygon-10e
gh pr create --title "feat(fog): borda de luz poligonal (Fase 10-E)" --body "..."
```

Faça cross-link com o PR do backend desta fase (correção de lint da 10-D) na descrição.
