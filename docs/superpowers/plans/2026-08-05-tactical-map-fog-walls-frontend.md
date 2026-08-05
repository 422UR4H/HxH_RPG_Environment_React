# Fog de nível único + paredes divididas por LOS (frontend) — Plano de Implementação

> **Para quem implementa:** execute tarefa por tarefa, na ordem. Cada passo é uma ação
> de 2–5 minutos. Não pule os passos de "rodar e ver falhar".

**Spec de referência (leia antes de começar):**
`System_X_System/docs/superpowers/specs/2026-08-05-tactical-map-wall-memory-design.md`
(repo do backend).

**Pré-requisito obrigatório:** o plano do backend
(`System_X_System/docs/superpowers/plans/2026-08-05-tactical-map-wall-memory-backend.md`)
precisa estar **concluído e commitado** antes de começar aqui. Este plano consome o
contrato novo (sem `explored_cells`/`explored_delta`). Se você começar por aqui, vai
escrever código contra um payload que ainda existe e depois desfazer.

**Objetivo:** remover a camada de fog "lembrado" (quadriculada) e passar as paredes para
cima do fog, divididas em dois passes pelo mesmo polígono de LOS — nítidas dentro da
visão, esmaecidas na memória.

**Branch:** `feat/tactical-map-fog-polygon-10e` (já criada, já tem commits)

**Arquivos:**
- Modificar: `src/types/tacticalMap.ts`
- Modificar: `src/hooks/useMatchWs.ts`
- Modificar: `src/pages/GamePage.tsx`
- Modificar: `src/features/tactical-map/utils/fogDraw.ts`
- Criar: `src/features/tactical-map/utils/losMask.ts`
- Criar: `src/features/tactical-map/utils/__tests__/losMask.test.ts`
- Apagar: `src/features/tactical-map/utils/fog.ts` e seus testes
- Criar: `src/components/organisms/LosSplit.tsx`
- Modificar: `src/components/organisms/FogLayer.tsx`
- Modificar: `src/components/organisms/WallsLayer.tsx`
- Modificar: `src/components/organisms/TacticalMapStage.tsx`
- Modificar: `src/features/tactical-map/utils/__tests__/fogDraw.test.ts`
- Modificar: `docs/dev/tactical-map/pixi-stack.md`

---

## Contexto que você precisa antes de escrever qualquer linha

Leia esta seção inteira. Cada item já causou (ou causaria) um bug silencioso.

### 1. `WallsLayer` registra listeners de DOM — nunca renderize o componente duas vezes

`WallsLayer.tsx` tem `useEffect`s que fazem `canvasEl.addEventListener("pointerup", ...)`
(por volta da linha 265, o clique de porta em modo jogador) e outros em modo editor.

O `LosSplit` renderiza seus filhos **duas vezes**. Se você passar `<WallsLayer />` como
filho dele, o componente monta duas vezes, o listener registra duas vezes, e **cada
clique numa porta dispara a ação duas vezes** — a porta abre e fecha no mesmo clique. Não
haverá erro no console; só o comportamento errado no jogo.

Por isso a Task 5 **extrai o desenho puro** (`WallGraphics`, só elementos
`<pixiGraphics>`, zero hooks) e duplica apenas ele. `WallsLayer` continua montando uma
vez só e continua dono de toda a interação.

**Regra geral do `LosSplit`: seus filhos precisam ser puramente apresentacionais.** Está
escrito no JSDoc do componente — mantenha lá.

### 2. Uma `Graphics` não pode ser máscara de dois containers

Cada container mascarado precisa da **sua própria** instância de `Graphics` desenhando o
polígono. Nesta fase são três no total: uma no `FogLayer`, e duas dentro do `LosSplit`
(uma para o passe nítido, outra para o esmaecido). É barato — é o mesmo `drawLosMask`
chamado três vezes.

### 3. A máscara não pode receber `visible={false}`

Ela é filha do container mascarado e parece conteúdo indesejado, mas o `StencilMaskPipe`
do Pixi já cuida disso (marca `includeInBuild = false` depois de coletar a geometria).
Se você escondê-la, o Pixi para de coletar a geometria, a máscara fica vazia, e o
resultado depende do passe:
- máscara **invertida** vazia → renderiza em **todo lugar** (tabuleiro inteiro escuro);
- máscara **normal** vazia → não renderiza **em lugar nenhum** (paredes somem).

Nenhum dos dois emite erro. Não esconda a máscara.

### 4. `inverse` só se liga por `setMask`

```ts
container.setMask({ mask, inverse: true });
```

`_maskOptions` é objeto compartilhado no protótipo do mixin do Pixi; mutá-lo direto
(`container._maskOptions.inverse = true`) vaza inverse para todo container da aplicação
que nunca chamou `setMask`.

### 5. Os polígonos já vêm em coordenadas de mundo

`fog.visiblePolygons` vem pronto do backend. **Não** aplique `applyTransform` neles. Só
geometria que nasce em espaço local do grid (células, paredes) precisa da transformação.

### 6. O mestre e o editor não têm split

Quando não há fog (mestre, ou modo de edição de paredes), `WallsLayer` renderiza o
desenho **uma vez, sem máscara nenhuma**. É um `if` no retorno, não uma segunda
arquitetura. Se você mascarar o mestre, ele perde metade das paredes.

---

## Task 1: contrato — tirar `exploredCells` do cliente

**Arquivos:**
- Modificar: `src/types/tacticalMap.ts`, `src/hooks/useMatchWs.ts`, `src/pages/GamePage.tsx`

- [ ] **Passo 1: `src/types/tacticalMap.ts`**

Em `FogState` (por volta da linha 158), remova a linha de `exploredCells` e o comentário
acima dela:

```ts
export type FogState = {
  fogMode: FogMode;
  visiblePolygons: VisibilityPolygon[];
};
```

- [ ] **Passo 2: `src/hooks/useMatchWs.ts`**

Três pontos:

1. No tipo do callback de `map_full_state` (por volta da linha 86), remova
   `exploredCells: Array<[number, number]>;`.
2. No tipo do callback de `visibility_updated` (por volta da linha 92), remova o
   parâmetro `exploredDelta`.
3. No parsing das mensagens (por volta das linhas 191-211), remova os campos
   `explored_cells` / `explored_delta` dos tipos inline e das chamadas:

```ts
          } else if (msg.type === "map_full_state") {
            const p = msg.payload as {
              pieces?: WirePiece[];
              walls?: unknown[];
              visible_polygons?: Array<Array<{ x: number; y: number }>>;
              fog_mode?: string;
            };
            onMapFullStateRef.current?.({
              pieces: (p.pieces ?? []).map(fromPiecePayload),
              walls: (p.walls ?? []).map(
                (w) => objToCamelCase(w as Record<string, unknown>) as unknown as WallSegment,
              ),
              visiblePolygons: parsePolys(p.visible_polygons ?? []),
              fogMode: p.fog_mode === "explored" ? "explored" : "live",
            });
          } else if (msg.type === "visibility_updated") {
            const p = msg.payload as {
              visible_polygons?: Array<Array<{ x: number; y: number }>>;
            };
            onVisibilityUpdatedRef.current?.(parsePolys(p.visible_polygons ?? []));
```

- [ ] **Passo 3: `src/pages/GamePage.tsx`**

```tsx
  const [fog, setFog] = useState<FogState>({ fogMode: "explored", visiblePolygons: [] });
```

```tsx
  const handleMapFullState = useCallback((s: {
    pieces: Piece[]; walls: WallSegment[];
    visiblePolygons: Array<Array<[number, number]>>;
    fogMode: "live" | "explored";
  }) => {
    setLiveWalls(s.walls);
    // The WS piece payload carries no elevation, so restore z from the REST map;
    // otherwise every piece would flatten to the ground on each server push.
    const zById = new Map((map?.pieces ?? []).map((p) => [p.id, p.coord.z]));
    setLivePieces(
      s.pieces.map((p) => ({ ...p, coord: { ...p.coord, z: zById.get(p.id) ?? 0 } })),
    );
    setFog({ fogMode: s.fogMode, visiblePolygons: s.visiblePolygons });
  }, [map]);

  const handleVisibilityUpdated = useCallback(
    (polys: Array<Array<[number, number]>>) => {
      setFog((f) => ({ ...f, visiblePolygons: polys }));
    },
    [],
  );
```

- [ ] **Passo 4: typecheck**

```bash
npm run build 2>&1 | tail -20
```

Vai quebrar em `FogLayer.tsx` (usa `fog.exploredCells`). Esperado — Task 3 conserta.

---

## Task 2: fog de nível único

**Arquivos:**
- Modificar: `src/features/tactical-map/utils/fogDraw.ts`
- Modificar: `src/features/tactical-map/utils/__tests__/fogDraw.test.ts`
- Apagar: `src/features/tactical-map/utils/fog.ts` e testes

- [ ] **Passo 1: reescrever os testes de `drawFog` primeiro**

Em `src/features/tactical-map/utils/__tests__/fogDraw.test.ts`, substitua **todo o
`describe("drawFogTiers", ...)`** por:

```ts
describe("drawFog", () => {
  const w = grid.cols * grid.cellSize;
  const h = grid.rows * grid.cellSize;

  it("paints one single region at one single alpha", () => {
    const { g, calls } = recorder();
    drawFog(g, w, h);

    const fills = fillsOf(calls);
    expect(fills.length).toBe(1);
    expect(fills[0].style.alpha).toBe(FOG_ALPHA);
    // Exactly these keys: a blendMode slipping into the fill is the phase 10-D bug.
    expect(Object.keys(fills[0].style).sort()).toEqual(["alpha", "color"]);
    // One rectangle: there is no per-cell painting any more.
    expect(calls.filter((c) => c.op === "closePath").length).toBe(1);
  });

  it("pads the fog well beyond the board so panning never exposes a bare edge", () => {
    const { g, calls } = recorder();
    drawFog(g, w, h);

    const pts = points(calls);
    const minX = pts.reduce((m, p) => Math.min(m, p.x), Infinity);
    const maxX = pts.reduce((m, p) => Math.max(m, p.x), -Infinity);
    const minY = pts.reduce((m, p) => Math.min(m, p.y), Infinity);
    const maxY = pts.reduce((m, p) => Math.max(m, p.y), -Infinity);
    expect(minX).toBeLessThanOrEqual(-FOG_PADDING);
    expect(maxX).toBeGreaterThanOrEqual(w + FOG_PADDING);
    expect(minY).toBeLessThanOrEqual(-FOG_PADDING);
    expect(maxY).toBeGreaterThanOrEqual(h + FOG_PADDING);
  });

  it("clears before drawing so repeated frames do not accumulate geometry", () => {
    const { g, calls } = recorder();
    drawFog(g, w, h);
    expect(calls[0].op).toBe("clear");
  });
});
```

E no topo do arquivo, ajuste o import e apague o que ficou sem uso:

```ts
import {
  drawFog,
  drawLosMask,
  FOG_ALPHA,
  FOG_PADDING,
  type FogDrawTarget,
} from "../fogDraw";
import type { GridShape, VisibilityPolygon } from "../../../../types/tacticalMap";
import realPayload from "./fixtures/realFogPayload.json";
```

O import de `fogTiers`/`cellKey` sai, e a linha `const explored = new Set(...)` também.
O bloco `describe("drawLosMask", ...)` fica **intacto** — não encoste nele.

> A fixture `realFogPayload.json` continua servindo: ela tem um campo `explored_cells`
> que ninguém mais lê. Não precisa regenerar.

- [ ] **Passo 2: rodar e ver falhar**

```bash
npm test -- fogDraw
```

Esperado: FALHA — `drawFog` e `FOG_ALPHA` não existem.

- [ ] **Passo 3: reescrever `fogDraw.ts`**

Conteúdo completo do arquivo:

```ts
import type { VisibilityPolygon } from "../../../types/tacticalMap";

export const FOG_COLOR = 0x05070a;
export const FOG_ALPHA = 0.92;
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

/**
 * Paints the fog: one rectangle covering the board plus generous padding, at a single
 * alpha.
 *
 * There is no "remembered area" tier any more. The map terrain is not kept in the
 * character's memory — only static structure is, and that is enforced server-side by
 * which walls the player receives. The lit area is carved out of this rectangle by an
 * inverse stencil mask (see LosSplit / FogLayer), which is why no cell classification
 * happens here and the fog edge is smooth rather than grid-aligned.
 */
export function drawFog(g: FogDrawTarget, worldWidth: number, worldHeight: number): void {
  g.clear();

  const P = FOG_PADDING;
  g.moveTo(-P, -P);
  g.lineTo(worldWidth + P, -P);
  g.lineTo(worldWidth + P, worldHeight + P);
  g.lineTo(-P, worldHeight + P);
  g.closePath();
  g.fill({ color: FOG_COLOR, alpha: FOG_ALPHA });
}

/**
 * Draws the player's line of sight, used as a stencil mask over other layers.
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
  // must happen, otherwise there is no geometry and the mask degenerates: an inverse
  // mask then covers everything, a normal mask hides everything.
  if (drewAny) g.fill({ color: 0xffffff, alpha: 1 });
}
```

- [ ] **Passo 4: apagar `fog.ts`**

Antes de apagar, confirme que ninguém mais importa nada dele:

```bash
grep -rn "utils/fog\"" src/ | grep -v node_modules
grep -rnE "cellKey|mergeExplored|parseExploredDelta|cellCornersLocal|fogTiers" src/ | grep -v node_modules
```

Se as duas buscas só apontarem para o próprio `fog.ts` e seus testes:

```bash
rm src/features/tactical-map/utils/fog.ts \
   src/features/tactical-map/utils/__tests__/fog.test.ts \
   src/features/tactical-map/utils/__tests__/fogTiers.test.ts
```

> Se alguma dessas funções aparecer em outro arquivo (por exemplo `cellCornersLocal` em
> alguma camada de grid), **não apague o arquivo**: remova só o que ficou órfão e
> mantenha o resto. Verifique, não presuma.

- [ ] **Passo 5: rodar e ver passar**

```bash
npm test -- fogDraw
```

Esperado: PASS (os 6 de `drawLosMask` + os 3 novos de `drawFog`).

- [ ] **Passo 6: commit**

```bash
git add -A src/features/tactical-map/utils/
git commit -m "feat(fog): fog de nível único, sem camada de memória quadriculada

O terreno já visto deixa de ter nível próprio de fog. A memória agora guarda
estrutura estática (paredes) no backend, não região do mapa — então o cliente
não precisa mais classificar célula, e some o bloco quadriculado que
destoava da borda de luz lisa."
```

---

## Task 3: `applyLosMask` — a aplicação da máscara, testável

Isolar isso numa função pura permite testar as duas armadilhas (máscara ausente,
reaplicação) sem WebGL.

**Arquivos:**
- Criar: `src/features/tactical-map/utils/losMask.ts`
- Criar: `src/features/tactical-map/utils/__tests__/losMask.test.ts`

- [ ] **Passo 1: escrever o teste primeiro**

```ts
import { describe, it, expect } from "vitest";
import { applyLosMask, type MaskableContainer, type MaskSource } from "../losMask";

const mask = {} as MaskSource;
const otherMask = {} as MaskSource;

function fakeContainer(overrides: Partial<MaskableContainer> = {}) {
  const calls: Array<{ mask: MaskSource; inverse: boolean }> = [];
  const c: MaskableContainer = {
    mask: null,
    setMask(options) {
      calls.push({ mask: options.mask, inverse: options.inverse });
      c.mask = options.mask;
    },
    ...overrides,
  };
  return { c, calls };
}

describe("applyLosMask", () => {
  it("applies the mask once with the requested inverse flag", () => {
    const { c, calls } = fakeContainer();
    applyLosMask(c, mask, true);
    expect(calls).toEqual([{ mask, inverse: true }]);
  });

  it("does not reapply an identical mask on every render", () => {
    const { c, calls } = fakeContainer();
    applyLosMask(c, mask, false);
    applyLosMask(c, mask, false);
    applyLosMask(c, mask, false);
    expect(calls.length).toBe(1);
  });

  it("reapplies when the mask instance changes", () => {
    const { c, calls } = fakeContainer();
    applyLosMask(c, mask, false);
    applyLosMask(c, otherMask, false);
    expect(calls.length).toBe(2);
  });

  it("is a no-op while either ref is still null", () => {
    const { c, calls } = fakeContainer();
    applyLosMask(null, mask, true);
    applyLosMask(c, null, true);
    expect(calls.length).toBe(0);
  });

  it("throws when setMask is unavailable instead of silently rendering wrong", () => {
    // A missing setMask means no mask at all. For the fog that reads as "the whole
    // board is dark"; for the walls, "every wall vanished". Neither logs anything, so
    // the failure has to be loud here.
    const broken = { mask: null } as unknown as MaskableContainer;
    expect(() => applyLosMask(broken, mask, true)).toThrow(/setMask/);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

```bash
npm test -- losMask
```

Esperado: FALHA — `../losMask` não existe.

- [ ] **Passo 3: criar `src/features/tactical-map/utils/losMask.ts`**

```ts
/**
 * Minimal structural view of what applyLosMask needs from a Pixi Container. Keeping it
 * structural is what lets the tests drive it without a renderer.
 */
export type MaskSource = object;

export type MaskableContainer = {
  mask: MaskSource | null;
  setMask?: (options: { mask: MaskSource; inverse: boolean }) => void;
};

/**
 * Applies `mask` to `container`, optionally inverted, exactly once per mask instance.
 *
 * Always through setMask: `inverse` lives in `_maskOptions`, which Pixi defines as a
 * SHARED object on the mixin prototype. Mutating it directly turns inverse on for every
 * container in the application that never called setMask. setMask makes an own copy.
 */
export function applyLosMask(
  container: MaskableContainer | null,
  mask: MaskSource | null,
  inverse: boolean,
): void {
  if (!container || !mask || container.mask === mask) return;

  if (typeof container.setMask !== "function") {
    // Failing loudly matters: with no mask applied, an inverse pass covers the whole
    // board and a normal pass hides everything it was meant to show. Neither produces
    // a console error, which is exactly how the phase 10-D bugs stayed hidden.
    throw new Error("applyLosMask: Container.setMask is unavailable — cannot apply the LOS mask");
  }
  container.setMask({ mask, inverse });
}
```

- [ ] **Passo 4: rodar e ver passar**

```bash
npm test -- losMask
```

Esperado: PASS, 5 testes.

- [ ] **Passo 5: commit**

```bash
git add src/features/tactical-map/utils/losMask.ts \
        src/features/tactical-map/utils/__tests__/losMask.test.ts
git commit -m "feat(fog): extrair aplicação da máscara de LOS para função testável"
```

---

## Task 4: `LosSplit`

**Arquivos:**
- Criar: `src/components/organisms/LosSplit.tsx`

- [ ] **Passo 1: criar o componente**

```tsx
import { useCallback, useLayoutEffect, useRef, type ReactNode } from "react";
import type { Container as PixiContainer, Graphics as PixiGraphics } from "pixi.js";
import type { VisibilityPolygon } from "../../types/tacticalMap";
import { drawLosMask } from "../../features/tactical-map/utils/fogDraw";
import { applyLosMask } from "../../features/tactical-map/utils/losMask";

type Props = {
  /** Visibility polygons in world space, straight from the backend. */
  polygons: VisibilityPolygon[];
  /** Alpha for the remembered (out of sight) copy. */
  dimAlpha: number;
  children: ReactNode;
};

/**
 * Renders `children` twice, split by the player's line of sight: full brightness inside
 * it, dimmed outside it. The split is per-pixel, cut by the same smooth visibility
 * polygon the fog uses — so a wall that is half in view comes out correctly divided,
 * with no grid alignment anywhere.
 *
 * IMPORTANT — `children` MUST be purely presentational (only `<pixiGraphics>` /
 * `<pixiSprite>` and the like, no hooks, no effects, no refs of their own). They are
 * mounted twice. A component that registers a DOM listener in an effect would register
 * it twice: for WallsLayer that means every door click firing twice, with nothing in
 * the console to hint at it. Pass the drawing part, never the interactive component.
 */
export default function LosSplit({ polygons, dimAlpha, children }: Props) {
  const litRef = useRef<PixiContainer>(null);
  const litMaskRef = useRef<PixiGraphics>(null);
  const dimRef = useRef<PixiContainer>(null);
  const dimMaskRef = useRef<PixiGraphics>(null);

  const drawMask = useCallback(
    (g: PixiGraphics) => drawLosMask(g, polygons),
    [polygons],
  );

  // No dependency array on purpose: applyLosMask no-ops when nothing changed, and this
  // keeps both masks correct if @pixi/react ever swaps an instance.
  useLayoutEffect(() => {
    applyLosMask(litRef.current, litMaskRef.current, false);
    applyLosMask(dimRef.current, dimMaskRef.current, true);
  });

  return (
    <>
      <pixiContainer label="los-lit" ref={litRef}>
        {children}
        {/* Each masked container needs its OWN Graphics: one display object cannot be
            the mask of two containers at the same time. And never visible={false} —
            Pixi's StencilMaskPipe already keeps the mask out of the rendered content,
            while hiding it empties the mask and breaks both passes silently. */}
        <pixiGraphics draw={drawMask} label="los-lit-mask" ref={litMaskRef} />
      </pixiContainer>
      <pixiContainer label="los-dim" ref={dimRef} alpha={dimAlpha}>
        {children}
        <pixiGraphics draw={drawMask} label="los-dim-mask" ref={dimMaskRef} />
      </pixiContainer>
    </>
  );
}
```

- [ ] **Passo 2: typecheck**

```bash
npm run build 2>&1 | tail -20
```

`FogLayer.tsx` e `WallsLayer.tsx` ainda quebram — Tasks 5 e 6.

---

## Task 5: `FogLayer` sobre o fog único

**Arquivos:**
- Modificar: `src/components/organisms/FogLayer.tsx`

- [ ] **Passo 1: substituir o arquivo inteiro**

```tsx
import { useCallback, useLayoutEffect, useRef } from "react";
import type { Container as PixiContainer, Graphics as PixiGraphics } from "pixi.js";
import type { FogState } from "../../types/tacticalMap";
import { drawFog, drawLosMask } from "../../features/tactical-map/utils/fogDraw";
import { applyLosMask } from "../../features/tactical-map/utils/losMask";

type Props = {
  fog: FogState;
  worldWidth: number;
  worldHeight: number;
  disabled: boolean;
};

export default function FogLayer({ fog, worldWidth, worldHeight, disabled }: Props) {
  if (disabled) return null;

  return <FogLayerInner fog={fog} worldWidth={worldWidth} worldHeight={worldHeight} />;
}

// Inner component avoids calling hooks conditionally (hooks must not be called after
// an early return that depends on a prop).
type InnerProps = Omit<Props, "disabled">;

function FogLayerInner({ fog, worldWidth, worldHeight }: InnerProps) {
  const containerRef = useRef<PixiContainer>(null);
  const maskRef = useRef<PixiGraphics>(null);

  const draw = useCallback(
    (g: PixiGraphics) => drawFog(g, worldWidth, worldHeight),
    [worldWidth, worldHeight],
  );

  const drawMask = useCallback(
    (g: PixiGraphics) => drawLosMask(g, fog.visiblePolygons),
    [fog.visiblePolygons],
  );

  // The lit area is carved out of the fog by an inverse stencil mask built from the
  // backend's visibility polygons — that is what makes the edge follow the real rays
  // from the wall corners instead of the grid.
  useLayoutEffect(() => {
    applyLosMask(containerRef.current, maskRef.current, true);
  });

  return (
    <pixiContainer label="fog-layer" ref={containerRef}>
      <pixiGraphics draw={draw} />
      <pixiGraphics draw={drawMask} label="fog-los-mask" ref={maskRef} />
    </pixiContainer>
  );
}
```

> A prop `grid` sai: sem classificação por célula, o fog não precisa mais da malha.
> Você vai removê-la do call site na Task 7.

---

## Task 6: separar desenho de interação em `WallsLayer`

**Arquivos:**
- Modificar: `src/components/organisms/WallsLayer.tsx`

- [ ] **Passo 1: acrescentar a prop `losPolygons`**

No tipo de props do componente (junto de `wallsInteractive`, por volta da linha 29):

```ts
  /**
   * Player line of sight. When present, the walls are drawn in two passes — crisp
   * inside it, dimmed outside it. Absent for the master and for wall-editing mode,
   * where every wall renders once at full brightness.
   */
  losPolygons?: VisibilityPolygon[];
```

Adicione `losPolygons` à desestruturação dos parâmetros e o import do tipo:

```ts
import type { VisibilityPolygon } from "../../types/tacticalMap";
```

(o arquivo já importa outros tipos desse módulo — junte no import existente em vez de
criar um segundo.)

- [ ] **Passo 2: acrescentar a constante, perto das outras constantes do topo**

```ts
// Walls the character has seen but is not currently looking at. 0.92 (the fog's own
// alpha) left them all but invisible; this is the legibility level chosen on screen.
const MEMORY_WALL_ALPHA = 0.5;
```

- [ ] **Passo 3: trocar o bloco de retorno**

O retorno atual (por volta da linha 386) é um fragmento com seis `<pixiGraphics>`.
Substitua por:

```tsx
  // Pure drawing, no hooks and no effects — this is what LosSplit is allowed to mount
  // twice. Everything interactive stays in this component, which mounts once.
  const graphics = (
    <>
      <pixiGraphics draw={drawMaterial("stone")} />
      <pixiGraphics draw={drawMaterial("wood")} />
      <pixiGraphics draw={drawMaterial("iron")} />
      <pixiGraphics draw={drawMaterial("magical")} />
      <pixiGraphics draw={drawSelected} />
      <pixiGraphics draw={drawPreview} />
    </>
  );

  if (!losPolygons) return graphics;

  return (
    <LosSplit polygons={losPolygons} dimAlpha={MEMORY_WALL_ALPHA}>
      {graphics}
    </LosSplit>
  );
```

E importe o `LosSplit`:

```ts
import LosSplit from "./LosSplit";
```

> Não mova nenhum `useEffect`, `useCallback` ou `useRef` para dentro de `graphics`.
> `graphics` é só JSX; os hooks continuam no corpo de `WallsLayer`, executando uma vez.

- [ ] **Passo 4: typecheck**

```bash
npm run build 2>&1 | tail -20
```

Sobra só o call site em `TacticalMapStage.tsx` — Task 7.

---

## Task 7: ordem de camadas na cena

**Arquivos:**
- Modificar: `src/components/organisms/TacticalMapStage.tsx`

- [ ] **Passo 1: trocar a ordem de `WallsLayer` e `FogLayer`**

Hoje é `PiecesLayer → WallsLayer → FogLayer`. Passa a ser `PiecesLayer → FogLayer →
WallsLayer`: **mova o bloco `{fog && !fogDisabled && (<FogLayer ... />)}` para antes do
`<WallsLayer ... />`**, sem alterar mais nada da cena.

O `FogLayer` perde a prop `grid`:

```tsx
      {fog && !fogDisabled && (
        <FogLayer
          fog={fog}
          worldWidth={worldWidth ?? map.grid.cols * map.grid.cellSize}
          worldHeight={worldHeight ?? map.grid.rows * map.grid.cellSize}
          disabled={fogDisabled}
        />
      )}
```

- [ ] **Passo 2: passar a LOS para o `WallsLayer`**

Acrescente uma única prop ao `<WallsLayer ... />` já existente, sem mexer nas outras:

```tsx
        losPolygons={fog && !fogDisabled ? fog.visiblePolygons : undefined}
```

> É seguro desenhar as paredes por cima do fog porque o backend só envia parede que o
> jogador tem direito de conhecer — parede atrás de outra e nunca vista nunca chega ao
> cliente (`FilterMapState`). Isso inverte a ordem que a 10-D tinha revertido; a premissa
> mudou por decisão do dono do produto, e está registrada na spec.

- [ ] **Passo 3: build, lint dos arquivos tocados e suíte**

```bash
npm run build
npx eslint src/components/organisms/LosSplit.tsx \
           src/components/organisms/FogLayer.tsx \
           src/components/organisms/WallsLayer.tsx \
           src/components/organisms/TacticalMapStage.tsx \
           src/features/tactical-map/utils/
npm test
```

Esperado: build limpo; eslint sem issues nesses arquivos; suíte passando **exceto** a
falha pré-existente em `NpcRosterPanel`, que já falhava antes desta branch e não é
escopo desta fase.

> `npm run lint` no repo inteiro reporta ~120 erros pré-existentes em ~107 arquivos.
> Isso é baseline da `main`, não regressão sua — por isso lintamos só o que tocamos.

- [ ] **Passo 4: commit**

```bash
git add src/components/organisms/
git commit -m "feat(fog): paredes acima do fog, divididas por linha de visão

Paredes na LOS ficam nítidas; paredes só na memória ficam esmaecidas. O
recorte é o mesmo polígono liso do fog, então é per-pixel: uma parede metade
dentro e metade fora sai corretamente dividida — o que também resolve a
queixa das paredes cobertas pela metade.

Seguro porque o backend só envia parede que o jogador pode conhecer."
```

---

## Task 8: documentação

**Arquivos:**
- Modificar: `docs/dev/tactical-map/pixi-stack.md`

- [ ] **Passo 1: atualizar a seção "Fog de guerra: composição sem blending"**

Ela hoje descreve três níveis e regiões disjuntas por célula. Substitua o miolo por:

```markdown
O fog do jogador tem **um nível só** e **não** usa blend mode. Duas tentativas erradas,
para não repetir:

- `blendMode="erase"` na camada de fog perfura o framebuffer principal até a cor de
  limpeza do canvas. A área "iluminada" sai preta sólida em vez de revelar o mapa.
- `isRenderGroup` **não** resolve: ele não cria render target isolado.

O que funciona é stencil, em dois usos do mesmo polígono de visibilidade:

1. **Fog** — um retângulo único (tabuleiro + padding) com máscara **invertida**:
   `container.setMask({ mask, inverse: true })`. Some exatamente dentro da LOS.
2. **Paredes** — desenhadas *acima* do fog, em dois passes (`LosSplit`): máscara normal
   em alpha cheio (o que o personagem vê agora) e máscara invertida em alpha 0.5 (o que
   ele lembra). Per-pixel, então uma parede metade em visão sai corretamente dividida.

Não existe classificação por célula em lugar nenhum. A memória do personagem é de
**estrutura estática**, resolvida no backend por id de parede — o cliente desenha o que
recebeu e deixa o stencil decidir o brilho.

Quatro armadilhas do Pixi v8 nesse caminho:

- Os filhos de `LosSplit` são montados **duas vezes**, então precisam ser puramente
  apresentacionais. Um componente que registra listener de DOM em efeito registraria
  duas vezes — em `WallsLayer` isso significa cada clique de porta disparando em dobro,
  sem nada no console.
- Cada container mascarado precisa da **sua própria** `Graphics`: um mesmo display
  object não pode ser máscara de dois containers.
- A máscara **não pode** receber `visible={false}` — o `StencilMaskPipe` deixaria de
  coletar a geometria. Máscara invertida vazia escurece tudo; máscara normal vazia
  esconde tudo. Nenhum dos dois emite erro.
- `inverse` só se liga por `setMask({ mask, inverse: true })`. `_maskOptions` é objeto
  compartilhado no protótipo do mixin; mutá-lo direto vaza para outros containers.

`Graphics.cut()` foi avaliado e descartado: earcut não define comportamento para furos
sobrepostos (jogador com duas peças), e `cut()` anexa o segundo furo em diante também à
instrução de fill anterior.
```

- [ ] **Passo 2: commit**

```bash
git add docs/dev/tactical-map/pixi-stack.md
git commit -m "docs(tactical-map): fog de nível único e split de paredes por LOS"
```

---

## Verificação final (obrigatória antes de abrir PR)

Exigida pelo `CLAUDE.md` da raiz do projeto. Nenhuma das duas etapas é opcional.

- [ ] **Passo 1: a partir de `System_X_System_Project/`**

```bash
./dev-checkout.sh feat/tactical-map-fog-polygon-10e
```

- [ ] **Passo 2: verificação visual em `http://localhost:5173`**

Duas janelas, mesma partida, uma como mestre e outra como jogador:

- [ ] Não existe mais nenhum bloco de fog quadriculado em lugar nenhum da tela.
- [ ] A borda da área iluminada continua lisa e poligonal.
- [ ] Paredes dentro da LOS aparecem nítidas e **inteiras** — não cortadas ao meio.
- [ ] Paredes já vistas e fora da LOS aparecem esmaecidas, legíveis, por cima do fog.
- [ ] Uma parede que o personagem nunca viu **não aparece de forma alguma**.
- [ ] Andar até uma parede e voltar: ela **permanece** esmaecida (não some). Este é o
      falso negativo do modelo por célula — se falhar, o bug está no backend.
- [ ] O mestre continua sem fog e com todas as paredes nítidas.
- [ ] Clicar numa porta abre/fecha **uma** vez. Se abrir e fechar no mesmo clique, o
      `WallsLayer` foi montado duas vezes — reveja a Task 6.

Se qualquer item falhar, **não abra o PR**. Relate o que viu, com print, antes de tentar
corrigir.

- [ ] **Passo 3: abrir o PR**

```bash
git push
gh pr create --title "feat(fog): fog poligonal, memória por parede (Fase 10-E)" --body "..."
```

Cross-link com o PR do backend na descrição.
