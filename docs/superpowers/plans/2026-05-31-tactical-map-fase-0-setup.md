# Tactical Map — Fase 0 (Setup / Walking Skeleton) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preparar todo o terreno do sistema de mapa tático — dependências instaladas, tipos completos, matemática de coordenadas testada, store esqueleto, núcleo Pixi (`TacticalMapStage`) renderizando grid + bg + peças, e uma rota dev de smoke-test (`/dev/tactical-map-demo`). Nenhuma feature de usuário; nenhuma rota de produção alterada. Phase 1+ encaixa em cima sem refator.

**Architecture:** Padrão híbrido descrito no spec § 3 — um organism núcleo (`TacticalMapStage`) que recebe `map: TacticalMap` por prop e transforma dados em pixels, e duas cascas vazias (`TacticalMapEditor` / `TacticalMapViewer`) em `features/tactical-map/` que só importam o Stage por ora. Coords e store são módulos puros, testados isoladamente. WebGL não é exercido em jsdom — `@pixi/react` é mockado nos testes para validar o JSX declarado, e a renderização real fica para validação visual via demo route.

**Tech Stack:** TypeScript 5.8 estrito (`verbatimModuleSyntax` — usar `import type {…}`), React 19, Vite 6, Vitest 4 + jsdom + MSW (já configurados em `src/test/setup.ts`), `pixi.js@^8`, `@pixi/react@^8`, `pixi-viewport@^6`, `zustand@^5`, `zundo@^2`, `immer@^10` (a instalar nesta fase).

**Spec de referência:** `System_X_System/docs/superpowers/specs/2026-05-31-tactical-map-design.md` (especialmente §§ 2, 3, 4, 5, 6 Fase 0, 8.1).

**Dev docs (referência humana, ainda na branch `docs/tactical-map-dev-docs`):** `System_X_System_React/docs/dev/tactical-map/` (overview, pixi-stack, state-management, coordinates, sync-and-delta, testing). Se ainda não merged ao iniciar a Fase 0, leitura é opcional — este plan é auto-contido.

---

## File Structure

**Criados nesta fase:**

- `src/types/tacticalMap.ts` — todos os tipos da seção 4 do spec (incluindo `Wall`/`Decoration`/`MapItem` como placeholders futuros)
- `src/features/tactical-map/utils/coords.ts` — `slotToWorld` / `worldToSlot` (dispatch por `grid.kind`, aplica skew + rotation)
- `src/features/tactical-map/utils/hex.ts` — matemática pura de axial (hex↔pixel, hex rounding, axial↔cube)
- `src/features/tactical-map/utils/__tests__/coords.test.ts`
- `src/features/tactical-map/utils/__tests__/hex.test.ts`
- `src/features/tactical-map/store/editorStore.ts` — Zustand + `zundo` (undo/redo) + `immer` (mutação aparente). Actions tipadas; implementações mínimas para wiring; sem consumidores ainda.
- `src/features/tactical-map/store/__tests__/editorStore.test.ts` — smoke do wiring (cria store, dispara uma action, valida undo)
- `src/features/tactical-map/TacticalMapEditor.tsx` — casca mestre (importa Stage, sem toolbar)
- `src/features/tactical-map/TacticalMapViewer.tsx` — casca jogador (importa Stage, sem interação)
- `src/components/organisms/TacticalMapStage.tsx` — núcleo Pixi (Layer 0 bg + Layer 1 grid + Layer 3 pieces; layers 2/4/5 reservadas como container vazio)
- `src/pages/TacticalMapDemoPage.tsx` — fixture hardcoded; smoke visual

**Modificados:**

- `package.json` — + 6 dependências (pin nas versões alvo do spec § Anexo A)
- `src/test/setup.ts` — `vi.mock("@pixi/react", …)` global (renderiza children como `<div data-pixi-…>` em jsdom)
- `src/App.tsx` — `React.lazy(() => import("./pages/TacticalMapDemoPage"))` + `<Route path="/dev/tactical-map-demo" …>` envolto em `<Suspense>`, montado **apenas** em dev (`import.meta.env.DEV`)

**Nunca tocados nesta fase:** qualquer arquivo de produção fora de `src/App.tsx` (a alteração lá é só montar a rota dev). Nenhuma página existente ganha import. Nenhum service/hook novo. Nenhum endpoint backend.

---

## Convenções desta fase

- **Imports de tipo:** sempre `import type { X } from "…"` (verbatimModuleSyntax).
- **Hex orientation:** **pointy-top** axial (q, r). Esta decisão é canônica em todo o sistema — código e testes assumem pointy-top desde já.
- **`grid.cellSize` semântica:**
  - `kind: "square"` → comprimento do lado do quadrado (px do mundo).
  - `kind: "hex"` → "size" do hex (centro até o vértice, em px do mundo). Largura visível do hex pointy-top = `cellSize * √3`; altura = `cellSize * 2`.
- **Origem do espaço world:** `(0, 0)` é o canto sup-esquerdo do mundo (antes de skew/rotation). Slot `(col=0, row=0)` → world `(cellSize/2, cellSize/2)` (centro do primeiro slot). Hex `(q=0, r=0)` → world `(0, 0)` (centro do hex de origem).
- **Skew + rotation aplicados na ordem:** baseline → skew (multiplica `y` por `skewRatio`) → rotation (gira em torno da origem por `grid.rotation` graus). Inversa: world → un-rotate → un-skew → baseline.
- **Defaults sãos:** `skewRatio = 1` (top-down), `rotation = 0` (sem rotação). Tests verificam invariância nesses defaults antes de exercitar valores não-triviais.
- **Commits:** Conventional Commits (`feat:`, `chore:`, `test:`). Um commit por task (ou por par task de teste + task de impl, quando muito pequenos). Mensagens em inglês conciso, body em PT quando útil.

---

## Task 1: Instalar dependências

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Conferir CWD**

```bash
pwd
# deve terminar em /System_X_System_Project/System_X_System_React
```

- [ ] **Step 2: Instalar as 6 dependências de runtime**

```bash
npm install pixi.js@^8 @pixi/react@^8 pixi-viewport@^6 zustand@^5 zundo@^2 immer@^10
```

Verificar que `package.json` agora lista as 6 em `dependencies` com as versões `^8` / `^6` / `^5` / `^2` / `^10` conforme spec § Anexo A.

- [ ] **Step 3: Validar que `tsc -b && vite build` ainda passa**

```bash
npm run build
```

Esperado: build bem-sucedido, sem erro de TS. Se quebrar, abrir issue — pode haver conflito de tipos com `@types/react@^19`.

- [ ] **Step 4: Rodar lint e testes existentes**

```bash
npm run lint && npm test
```

Esperado: PASS em ambos. Esta fase não pode regredir nada existente.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(tactical-map): install pixi + zustand + zundo + immer (fase 0)"
```

---

## Task 2: Tipos do mapa tático

**Files:**
- Create: `src/types/tacticalMap.ts`

- [ ] **Step 1: Criar `src/types/tacticalMap.ts` com todos os tipos**

```ts
// src/types/tacticalMap.ts
//
// Tipos canônicos do sistema de mapa tático. Espelham §4 do spec
// `System_X_System/docs/superpowers/specs/2026-05-31-tactical-map-design.md`.
// Mantenha sincronizado: schema backend (Fase 1 do spec) deve ser o snake_case
// equivalente.

// ─── Coordenadas ───────────────────────────────────────────────────────────
export type SquareCoord = { kind: "square"; col: number; row: number };
export type HexCoord    = { kind: "hex";    q: number;   r: number };
export type SlotCoord   = SquareCoord | HexCoord;

export type PieceCoord = {
  slot: SlotCoord;
  z: number; // altura "virtual" em metros; 0 = chão
};

// ─── Malha ─────────────────────────────────────────────────────────────────
export type GridKind  = "square" | "hex";
export type LineStyle = "solid" | "dashed";

export type GridShape = {
  kind: GridKind;
  cols: number;        // ignorado em hex (usa rows como alcance retangular q/r)
  rows: number;
  cellSize: number;    // square: lado do quadrado; hex: size (centro→vértice)
  skewRatio: number;   // 1 = top-down; <1 = isométrico (1:2 = 0.5)
  rotation: number;    // graus; default 0
  color: string;       // token de cor
  opacity: number;     // 0–1
  lineStyle: LineStyle;
};

// ─── Imagem de fundo ───────────────────────────────────────────────────────
export type BgImage = {
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
} | null;

// ─── Peça ──────────────────────────────────────────────────────────────────
export type Piece = {
  id: string;          // uuid próprio da peça no mapa (não é character.id)
  characterId: string; // FK pra CharacterSheet (jogador ou NPC)
  coord: PieceCoord;
  visible: boolean;    // Fase 7. Default true. Evolui pra visibleTo: 'all' | UserId[]
};

// ─── Capacidades futuras (placeholders declarados desde já) ────────────────
export type Wall = {
  id: string;
  points: Array<[number, number]>; // pares (x,y) em coords do mundo
  thickness: number;
};

export type Decoration = {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zOrder: number;
  opacity: number;
};

export type MapItem = {
  id: string;
  itemDefId: string;
  coord: SlotCoord;
};

// ─── Raiz ──────────────────────────────────────────────────────────────────
export type TacticalMap = {
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  grid: GridShape;
  bg: BgImage;
  pieces: Piece[];
  walls: Wall[];         // [] por enquanto
  decorations: Decoration[]; // []
  items: MapItem[];      // []
  createdAt: string;     // ISO
  updatedAt: string;     // ISO
};
```

- [ ] **Step 2: Validar TS**

```bash
npm run build
```

Esperado: PASS. Se falhar com `noUnusedLocals` por nada importar os tipos ainda, ignorar — eles serão usados a partir da Task 3.

Atalho mais barato:

```bash
npx tsc -b --pretty
```

- [ ] **Step 3: Commit**

```bash
git add src/types/tacticalMap.ts
git commit -m "feat(tactical-map): add canonical types (TacticalMap, Piece, GridShape, …)"
```

---

## Task 3: Square coords (sem skew/rotation ainda) — TDD

Implementar `slotToWorld` e `worldToSlot` para `kind: "square"` com defaults `skewRatio=1`, `rotation=0`. Skew e rotation entram na Task 6.

**Files:**
- Create: `src/features/tactical-map/utils/__tests__/coords.test.ts`
- Create: `src/features/tactical-map/utils/coords.ts`

- [ ] **Step 1: Escrever o teste vermelho**

```ts
// src/features/tactical-map/utils/__tests__/coords.test.ts
import { describe, it, expect } from "vitest";
import { slotToWorld, worldToSlot } from "../coords";
import type { GridShape } from "../../../../types/tacticalMap";

const squareGrid = (cellSize = 40): GridShape => ({
  kind: "square",
  cols: 10,
  rows: 10,
  cellSize,
  skewRatio: 1,
  rotation: 0,
  color: "#000",
  opacity: 1,
  lineStyle: "solid",
});

describe("coords — square (no skew, no rotation)", () => {
  it("slotToWorld returns the center of the slot", () => {
    const g = squareGrid(40);
    expect(slotToWorld({ kind: "square", col: 0, row: 0 }, g)).toEqual({ x: 20, y: 20 });
    expect(slotToWorld({ kind: "square", col: 1, row: 0 }, g)).toEqual({ x: 60, y: 20 });
    expect(slotToWorld({ kind: "square", col: 0, row: 2 }, g)).toEqual({ x: 20, y: 100 });
  });

  it("worldToSlot snaps a world point to its slot", () => {
    const g = squareGrid(40);
    expect(worldToSlot({ x: 20, y: 20 }, g)).toEqual({ kind: "square", col: 0, row: 0 });
    expect(worldToSlot({ x: 39.9, y: 0.1 }, g)).toEqual({ kind: "square", col: 0, row: 0 });
    expect(worldToSlot({ x: 40, y: 40 }, g)).toEqual({ kind: "square", col: 1, row: 1 });
    expect(worldToSlot({ x: 199, y: 79 }, g)).toEqual({ kind: "square", col: 4, row: 1 });
  });

  it("slotToWorld and worldToSlot are inverses on slot centers", () => {
    const g = squareGrid(50);
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 5; row++) {
        const world = slotToWorld({ kind: "square", col, row }, g);
        expect(worldToSlot(world, g)).toEqual({ kind: "square", col, row });
      }
    }
  });
});
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
npx vitest run src/features/tactical-map/utils/__tests__/coords.test.ts
```

Esperado: FAIL — `Cannot find module '../coords'`.

- [ ] **Step 3: Implementar o mínimo para passar**

```ts
// src/features/tactical-map/utils/coords.ts
import type { GridShape, SlotCoord } from "../../../types/tacticalMap";

export function slotToWorld(slot: SlotCoord, grid: GridShape): { x: number; y: number } {
  if (slot.kind === "square") {
    const { cellSize } = grid;
    return {
      x: slot.col * cellSize + cellSize / 2,
      y: slot.row * cellSize + cellSize / 2,
    };
  }
  // hex: implementado na Task 5
  throw new Error(`slotToWorld: kind "${slot.kind}" not implemented yet`);
}

export function worldToSlot(world: { x: number; y: number }, grid: GridShape): SlotCoord {
  if (grid.kind === "square") {
    return {
      kind: "square",
      col: Math.floor(world.x / grid.cellSize),
      row: Math.floor(world.y / grid.cellSize),
    };
  }
  // hex: implementado na Task 5
  throw new Error(`worldToSlot: grid.kind "${grid.kind}" not implemented yet`);
}
```

- [ ] **Step 4: Rodar para confirmar que passa**

```bash
npx vitest run src/features/tactical-map/utils/__tests__/coords.test.ts
```

Esperado: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/tactical-map/utils/coords.ts src/features/tactical-map/utils/__tests__/coords.test.ts
git commit -m "feat(tactical-map): slot↔world for square grids"
```

---

## Task 4: Hex axial math (puro) — TDD

Implementar utilitários de hex pointy-top: `hexToPixel`, `pixelToHex`, `hexRound`, `axialToCube`, `cubeToAxial`, `hexDistance`. Funções puras, sem dependência de `GridShape`.

**Files:**
- Create: `src/features/tactical-map/utils/__tests__/hex.test.ts`
- Create: `src/features/tactical-map/utils/hex.ts`

- [ ] **Step 1: Escrever os testes vermelhos**

```ts
// src/features/tactical-map/utils/__tests__/hex.test.ts
import { describe, it, expect } from "vitest";
import {
  hexToPixel,
  pixelToHex,
  hexRound,
  axialToCube,
  cubeToAxial,
  hexDistance,
} from "../hex";

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

describe("hex — pointy-top axial", () => {
  it("hexToPixel(0,0) is origin", () => {
    const p = hexToPixel({ q: 0, r: 0 }, 1);
    expect(close(p.x, 0)).toBe(true);
    expect(close(p.y, 0)).toBe(true);
  });

  it("hexToPixel respects pointy-top formula", () => {
    // pointy-top: x = size * sqrt(3) * (q + r/2); y = size * 3/2 * r
    const size = 10;
    const p = hexToPixel({ q: 2, r: 1 }, size);
    expect(close(p.x, size * Math.sqrt(3) * (2 + 0.5))).toBe(true);
    expect(close(p.y, size * 1.5 * 1)).toBe(true);
  });

  it("pixelToHex is the inverse of hexToPixel on integer axials", () => {
    const size = 12;
    for (let q = -3; q <= 3; q++) {
      for (let r = -3; r <= 3; r++) {
        const pixel = hexToPixel({ q, r }, size);
        const hex = pixelToHex(pixel, size);
        expect(hex).toEqual({ q, r });
      }
    }
  });

  it("hexRound snaps a fractional axial to nearest integer hex", () => {
    expect(hexRound({ q: 0.1, r: 0.2 })).toEqual({ q: 0, r: 0 });
    expect(hexRound({ q: 0.6, r: 0.1 })).toEqual({ q: 1, r: 0 });
    expect(hexRound({ q: -0.6, r: -0.1 })).toEqual({ q: -1, r: 0 });
  });

  it("axialToCube and cubeToAxial roundtrip", () => {
    const a = { q: 2, r: -3 };
    expect(cubeToAxial(axialToCube(a))).toEqual(a);
  });

  it("axialToCube preserves cube invariant x+y+z=0", () => {
    const c = axialToCube({ q: 5, r: -2 });
    expect(c.x + c.y + c.z).toBe(0);
  });

  it("hexDistance is 0 for same hex and grows by 1 for neighbours", () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
    // Os 6 vizinhos pointy-top: (+1,0),(-1,0),(0,+1),(0,-1),(+1,-1),(-1,+1)
    const neighbours = [
      { q: 1, r: 0 }, { q: -1, r: 0 },
      { q: 0, r: 1 }, { q: 0, r: -1 },
      { q: 1, r: -1 }, { q: -1, r: 1 },
    ];
    for (const n of neighbours) {
      expect(hexDistance({ q: 0, r: 0 }, n)).toBe(1);
    }
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: -2 })).toBe(3);
  });
});
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
npx vitest run src/features/tactical-map/utils/__tests__/hex.test.ts
```

Esperado: FAIL — `Cannot find module '../hex'`.

- [ ] **Step 3: Implementar o módulo**

```ts
// src/features/tactical-map/utils/hex.ts
//
// Matemática pura de hex pointy-top em coordenadas axiais (q, r).
// Referência: https://www.redblobgames.com/grids/hexagons/

export type Axial = { q: number; r: number };
export type Cube  = { x: number; y: number; z: number };

const SQRT3 = Math.sqrt(3);

export function hexToPixel({ q, r }: Axial, size: number): { x: number; y: number } {
  return {
    x: size * SQRT3 * (q + r / 2),
    y: size * 1.5 * r,
  };
}

export function pixelToHex(pixel: { x: number; y: number }, size: number): Axial {
  const qFrac = (SQRT3 / 3 * pixel.x - pixel.y / 3) / size;
  const rFrac = (2 / 3 * pixel.y) / size;
  return hexRound({ q: qFrac, r: rFrac });
}

export function axialToCube({ q, r }: Axial): Cube {
  return { x: q, z: r, y: -q - r };
}

export function cubeToAxial({ x, z }: Cube): Axial {
  return { q: x, r: z };
}

export function hexRound(frac: Axial): Axial {
  const c = axialToCube(frac);
  let rx = Math.round(c.x);
  let ry = Math.round(c.y);
  let rz = Math.round(c.z);

  const dx = Math.abs(rx - c.x);
  const dy = Math.abs(ry - c.y);
  const dz = Math.abs(rz - c.z);

  if (dx > dy && dx > dz)      rx = -ry - rz;
  else if (dy > dz)             ry = -rx - rz;
  else                          rz = -rx - ry;

  return cubeToAxial({ x: rx, y: ry, z: rz });
}

export function hexDistance(a: Axial, b: Axial): number {
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  return (Math.abs(ac.x - bc.x) + Math.abs(ac.y - bc.y) + Math.abs(ac.z - bc.z)) / 2;
}
```

- [ ] **Step 4: Rodar para confirmar que passa**

```bash
npx vitest run src/features/tactical-map/utils/__tests__/hex.test.ts
```

Esperado: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/tactical-map/utils/hex.ts src/features/tactical-map/utils/__tests__/hex.test.ts
git commit -m "feat(tactical-map): pointy-top hex axial math (hexToPixel, pixelToHex, hexRound, hexDistance)"
```

---

## Task 5: `slotToWorld`/`worldToSlot` para hex — TDD

Estender as duas funções de `coords.ts` para fazer dispatch quando `grid.kind === "hex"`, delegando a `hex.ts`.

**Files:**
- Modify: `src/features/tactical-map/utils/__tests__/coords.test.ts`
- Modify: `src/features/tactical-map/utils/coords.ts`

- [ ] **Step 1: Adicionar um bloco `describe` para hex no teste**

Adicionar ao final de `coords.test.ts`:

```ts
import { hexToPixel } from "../hex";

const hexGrid = (cellSize = 10): GridShape => ({
  kind: "hex",
  cols: 10,
  rows: 10,
  cellSize,
  skewRatio: 1,
  rotation: 0,
  color: "#000",
  opacity: 1,
  lineStyle: "solid",
});

describe("coords — hex (no skew, no rotation)", () => {
  it("slotToWorld(hex 0,0) is the origin", () => {
    const g = hexGrid(10);
    expect(slotToWorld({ kind: "hex", q: 0, r: 0 }, g)).toEqual({ x: 0, y: 0 });
  });

  it("slotToWorld(hex q,r) matches hexToPixel with grid.cellSize as size", () => {
    const g = hexGrid(12);
    const samples = [
      { q: 1, r: 0 }, { q: 0, r: 1 }, { q: 2, r: -1 }, { q: -1, r: 2 },
    ];
    for (const s of samples) {
      expect(slotToWorld({ kind: "hex", ...s }, g)).toEqual(hexToPixel(s, 12));
    }
  });

  it("worldToSlot inverts slotToWorld on hex centers", () => {
    const g = hexGrid(15);
    for (let q = -3; q <= 3; q++) {
      for (let r = -3; r <= 3; r++) {
        const world = slotToWorld({ kind: "hex", q, r }, g);
        expect(worldToSlot(world, g)).toEqual({ kind: "hex", q, r });
      }
    }
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
npx vitest run src/features/tactical-map/utils/__tests__/coords.test.ts
```

Esperado: FAIL nos novos testes (mensagem `kind "hex" not implemented yet`).

- [ ] **Step 3: Implementar dispatch para hex**

Substituir o conteúdo de `coords.ts`:

```ts
// src/features/tactical-map/utils/coords.ts
import type { GridShape, SlotCoord } from "../../../types/tacticalMap";
import { hexToPixel, pixelToHex } from "./hex";

export function slotToWorld(slot: SlotCoord, grid: GridShape): { x: number; y: number } {
  if (slot.kind === "square") {
    const { cellSize } = grid;
    return {
      x: slot.col * cellSize + cellSize / 2,
      y: slot.row * cellSize + cellSize / 2,
    };
  }
  // hex: usa grid.cellSize como "size" (centro→vértice)
  return hexToPixel({ q: slot.q, r: slot.r }, grid.cellSize);
}

export function worldToSlot(world: { x: number; y: number }, grid: GridShape): SlotCoord {
  if (grid.kind === "square") {
    return {
      kind: "square",
      col: Math.floor(world.x / grid.cellSize),
      row: Math.floor(world.y / grid.cellSize),
    };
  }
  const { q, r } = pixelToHex(world, grid.cellSize);
  return { kind: "hex", q, r };
}
```

- [ ] **Step 4: Rodar e confirmar passa**

```bash
npx vitest run src/features/tactical-map/utils/__tests__/coords.test.ts
```

Esperado: PASS (6 tests no arquivo todo: 3 square + 3 hex).

- [ ] **Step 5: Commit**

```bash
git add src/features/tactical-map/utils/coords.ts src/features/tactical-map/utils/__tests__/coords.test.ts
git commit -m "feat(tactical-map): slot↔world for hex grids (pointy-top axial)"
```

---

## Task 6: Aplicar `skewRatio` + `rotation` em `coords` — TDD

Spec § 5: "Ambas aplicam `skewRatio` e `rotation` desde o dia 1, com defaults `1` e `0`. A UI de distorção/rotação (Fase 9) só liga os controles; matemática já está lá."

Ordem forward: **baseline → skew → rotate → world**.
Ordem inversa: **world → un-rotate → un-skew → baseline**.

**Files:**
- Modify: `src/features/tactical-map/utils/__tests__/coords.test.ts`
- Modify: `src/features/tactical-map/utils/coords.ts`

- [ ] **Step 1: Adicionar testes para skew + rotation**

Adicionar ao final de `coords.test.ts`:

```ts
describe("coords — skew + rotation", () => {
  it("default skew=1, rotation=0 leaves results unchanged", () => {
    // já coberto nos testes anteriores; aqui só re-afirmamos um caso
    const g = squareGrid(40);
    expect(slotToWorld({ kind: "square", col: 1, row: 1 }, g)).toEqual({ x: 60, y: 60 });
  });

  it("skewRatio < 1 squashes the y coordinate", () => {
    const g: GridShape = { ...squareGrid(40), skewRatio: 0.5 };
    // baseline y = 60 → skewed y = 30
    expect(slotToWorld({ kind: "square", col: 1, row: 1 }, g)).toEqual({ x: 60, y: 30 });
  });

  it("rotation rotates around the world origin", () => {
    const g: GridShape = { ...squareGrid(40), rotation: 90 };
    // baseline (20, 20) → rotated 90° → (-20, 20)
    const p = slotToWorld({ kind: "square", col: 0, row: 0 }, g);
    expect(p.x).toBeCloseTo(-20, 6);
    expect(p.y).toBeCloseTo(20, 6);
  });

  it("worldToSlot reverses skew + rotation for square", () => {
    const g: GridShape = { ...squareGrid(40), skewRatio: 0.5, rotation: 30 };
    const slot = { kind: "square" as const, col: 2, row: 3 };
    const world = slotToWorld(slot, g);
    expect(worldToSlot(world, g)).toEqual(slot);
  });

  it("worldToSlot reverses skew + rotation for hex", () => {
    const g: GridShape = { ...hexGrid(20), skewRatio: 0.7, rotation: -45 };
    const slot = { kind: "hex" as const, q: 2, r: -1 };
    const world = slotToWorld(slot, g);
    expect(worldToSlot(world, g)).toEqual(slot);
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
npx vitest run src/features/tactical-map/utils/__tests__/coords.test.ts
```

Esperado: FAIL nos 4 novos testes (com exceção do default, que passa por acaso).

- [ ] **Step 3: Adicionar helpers internos e reescrever as funções**

Substituir `coords.ts` por:

```ts
// src/features/tactical-map/utils/coords.ts
import type { GridShape, SlotCoord } from "../../../types/tacticalMap";
import { hexToPixel, pixelToHex } from "./hex";

type XY = { x: number; y: number };

const DEG_TO_RAD = Math.PI / 180;

// baseline → world: aplica skew (squash y) e rotation (gira ao redor da origem)
function applyTransform(p: XY, grid: GridShape): XY {
  const skewed: XY = { x: p.x, y: p.y * grid.skewRatio };
  if (grid.rotation === 0) return skewed;
  const t = grid.rotation * DEG_TO_RAD;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  return {
    x: skewed.x * cos - skewed.y * sin,
    y: skewed.x * sin + skewed.y * cos,
  };
}

// world → baseline: inverso de applyTransform
function inverseTransform(p: XY, grid: GridShape): XY {
  let unrotated: XY = p;
  if (grid.rotation !== 0) {
    const t = grid.rotation * DEG_TO_RAD;
    const cos = Math.cos(t);
    const sin = Math.sin(t);
    unrotated = {
      x: p.x * cos + p.y * sin,
      y: -p.x * sin + p.y * cos,
    };
  }
  return {
    x: unrotated.x,
    y: unrotated.y / grid.skewRatio,
  };
}

function slotToBaseline(slot: SlotCoord, grid: GridShape): XY {
  if (slot.kind === "square") {
    const { cellSize } = grid;
    return {
      x: slot.col * cellSize + cellSize / 2,
      y: slot.row * cellSize + cellSize / 2,
    };
  }
  return hexToPixel({ q: slot.q, r: slot.r }, grid.cellSize);
}

function baselineToSlot(b: XY, grid: GridShape): SlotCoord {
  if (grid.kind === "square") {
    return {
      kind: "square",
      col: Math.floor(b.x / grid.cellSize),
      row: Math.floor(b.y / grid.cellSize),
    };
  }
  const { q, r } = pixelToHex(b, grid.cellSize);
  return { kind: "hex", q, r };
}

export function slotToWorld(slot: SlotCoord, grid: GridShape): XY {
  return applyTransform(slotToBaseline(slot, grid), grid);
}

export function worldToSlot(world: XY, grid: GridShape): SlotCoord {
  return baselineToSlot(inverseTransform(world, grid), grid);
}
```

- [ ] **Step 4: Rodar e confirmar passa**

```bash
npx vitest run src/features/tactical-map/utils/__tests__/coords.test.ts
```

Esperado: PASS (todos os tests do arquivo).

- [ ] **Step 5: Suite completa**

```bash
npm test
```

Esperado: PASS — nenhuma regressão nas suítes existentes.

- [ ] **Step 6: Commit**

```bash
git add src/features/tactical-map/utils/coords.ts src/features/tactical-map/utils/__tests__/coords.test.ts
git commit -m "feat(tactical-map): apply skewRatio + rotation in slot↔world (ready for fase 9)"
```

---

## Task 7: Editor store esqueleto (Zustand + zundo + immer)

Wiring completo dos middlewares + actions tipadas com implementações mínimas via immer. Smoke test garante que o middleware composto funciona (state muda, undo reverte).

**Files:**
- Create: `src/features/tactical-map/store/editorStore.ts`
- Create: `src/features/tactical-map/store/__tests__/editorStore.test.ts`

- [ ] **Step 1: Escrever o teste do wiring (vermelho)**

```ts
// src/features/tactical-map/store/__tests__/editorStore.test.ts
import { describe, it, expect } from "vitest";
import { createEditorStore } from "../editorStore";
import type { TacticalMap } from "../../../../types/tacticalMap";

const emptyMap = (): TacticalMap => ({
  id: "map-1",
  campaignId: "camp-1",
  name: "Test",
  grid: {
    kind: "square", cols: 5, rows: 5, cellSize: 40,
    skewRatio: 1, rotation: 0,
    color: "#000", opacity: 1, lineStyle: "solid",
  },
  bg: null,
  pieces: [],
  walls: [],
  decorations: [],
  items: [],
  createdAt: "2026-05-31T00:00:00Z",
  updatedAt: "2026-05-31T00:00:00Z",
});

describe("editorStore", () => {
  it("can be instantiated with an initial map and reports isDirty=false", () => {
    const store = createEditorStore(emptyMap());
    const s = store.getState();
    expect(s.map.id).toBe("map-1");
    expect(s.isDirty).toBe(false);
    expect(s.activeTool).toBe("grid");
    expect(s.selection).toBeNull();
  });

  it("setGrid mutates map.grid and marks isDirty=true", () => {
    const store = createEditorStore(emptyMap());
    store.getState().setGrid({
      ...store.getState().map.grid,
      cols: 20,
      rows: 20,
    });
    expect(store.getState().map.grid.cols).toBe(20);
    expect(store.getState().isDirty).toBe(true);
  });

  it("zundo middleware exposes undo() and reverts the last change", () => {
    const store = createEditorStore(emptyMap());
    store.getState().setActiveTool("pieces");
    expect(store.getState().activeTool).toBe("pieces");

    // zundo temporal API: store.temporal.getState().undo()
    store.temporal.getState().undo();
    expect(store.getState().activeTool).toBe("grid");
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
npx vitest run src/features/tactical-map/store/__tests__/editorStore.test.ts
```

Esperado: FAIL — `Cannot find module '../editorStore'`.

- [ ] **Step 3: Implementar o store**

```ts
// src/features/tactical-map/store/editorStore.ts
//
// Store do editor de mapa tático.
// Composição: Zustand (state) + zundo (undo/redo) + immer (mutação aparente).
// Phase 0: wiring + actions mínimas. Consumidores reais entram a partir da Fase 2.

import { create } from "zustand";
import { temporal } from "zundo";
import { immer } from "zustand/middleware/immer";
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

  // actions — implementações mínimas via immer; consumidores entram a partir da Fase 2
  setGrid: (grid: GridShape) => void;
  setBg: (bg: BgImage) => void;
  placePiece: (piece: Piece) => void;
  movePiece: (pieceId: string, slot: SlotCoord) => void;
  setPieceZ: (pieceId: string, z: number) => void;
  removePiece: (pieceId: string) => void;
  setActiveTool: (tool: ToolKind) => void;
  setSelection: (sel: Selection) => void;
  markClean: () => void;
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
      })),
      // zundo opções: ignora isDirty/selection do tracking (não fazem sentido no histórico)
      {
        partialize: (state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { isDirty, selection, ...tracked } = state;
          return tracked;
        },
      },
    ),
  );
}

export type EditorStore = ReturnType<typeof createEditorStore>;
```

- [ ] **Step 4: Rodar e confirmar passa**

```bash
npx vitest run src/features/tactical-map/store/__tests__/editorStore.test.ts
```

Esperado: PASS (3 tests).

> **Nota sobre versões:** se a import `zustand/middleware/immer` não resolver, é possível que precise importar via `"zustand/middleware/immer"` com `@ts-expect-error` ou usar `import { immer } from "zustand/middleware"` — verificar nos `@types/zustand@^5` instalados. Ajustar conforme a versão exata resolvida pelo `npm install`.

- [ ] **Step 5: Commit**

```bash
git add src/features/tactical-map/store/editorStore.ts src/features/tactical-map/store/__tests__/editorStore.test.ts
git commit -m "feat(tactical-map): editor store skeleton (zustand + zundo + immer)"
```

---

## Task 8: Mock global de `@pixi/react` no Vitest

Spec § 8.1: "Mock do @pixi/react em `vitest.setup.ts`; assert 'qual JSX foi renderizado pro Pixi'". Mock leve que renderiza `children` em `<div data-pixi-*>`. Permite que componentes que importam `@pixi/react` montem em jsdom sem WebGL.

**Files:**
- Modify: `src/test/setup.ts`

- [ ] **Step 1: Adicionar o mock no final de `src/test/setup.ts`**

Inserir, **antes do bloco de `LocalStorageMock`**:

```ts
// --- @pixi/react mock --------------------------------------------------------
// @pixi/react renderiza para um <canvas> via WebGL, que jsdom não suporta.
// Aqui substituímos por shims que renderizam <div data-pixi-*> com children,
// permitindo asserts sobre o JSX declarado.
import { vi } from "vitest";

vi.mock("@pixi/react", async () => {
  const React = await import("react");
  type AnyProps = Record<string, unknown> & { children?: React.ReactNode };

  const make = (tag: string) =>
    React.forwardRef<HTMLDivElement, AnyProps>((props, ref) =>
      React.createElement("div", { "data-pixi": tag, ref }, props.children as React.ReactNode),
    );

  return {
    Application: make("application"),
    extend: () => {},
    // intrinsics PixiJS comuns; adicione conforme o codebase usar
    pixiContainer: make("container"),
    pixiGraphics: make("graphics"),
    pixiSprite: make("sprite"),
    pixiText: make("text"),
    useApplication: () => ({ app: null }),
    useTick: () => {},
  };
});
```

> Importante: o `vi.mock` aceita uma fábrica assíncrona. Importar `vitest`/`react` dentro do `setup.ts` está OK — esse arquivo já roda no ambiente Vitest.

- [ ] **Step 2: Validar que os testes existentes ainda passam**

```bash
npm test
```

Esperado: PASS, suíte completa (testes anteriores não importavam `@pixi/react`; o mock é inerte para eles).

- [ ] **Step 3: Commit**

```bash
git add src/test/setup.ts
git commit -m "test(tactical-map): mock @pixi/react in vitest setup (jsdom has no WebGL)"
```

---

## Task 9: `TacticalMapStage` organism (núcleo Pixi)

Componente que recebe `map: TacticalMap` e renderiza:
- Layer 0: bg (se presente)
- Layer 1: grid (linhas via Graphics)
- Layer 2: decorations (Container vazio — placeholder)
- Layer 3: pieces (Sprite + sombra + badge Z) — Phase 0: círculo placeholder + label
- Layer 4: walls (Container vazio — placeholder)
- Layer 5: overlay (Container vazio — placeholder)

Tudo dentro de um `<pixiViewport>` (pan + pinch-zoom). Phase 0 não implementa interação além do viewport pronto.

> **Nota sobre `@pixi/react` v8:** a lib usa o padrão `extend({ Viewport })` para registrar componentes vanilla do Pixi como JSX. O `Viewport` vem de `pixi-viewport`. Veja https://github.com/pixijs/pixi-react para a API atual; se houver divergência, seguir os docs e ajustar.

**Files:**
- Create: `src/components/organisms/TacticalMapStage.tsx`

- [ ] **Step 1: Implementar o componente**

```tsx
// src/components/organisms/TacticalMapStage.tsx
//
// Núcleo de renderização do mapa tático. Recebe `map: TacticalMap` por prop
// e desenha as camadas. Não conhece "editor" vs "viewer".
// Phase 0: rendering passivo (sem interação). Pan/zoom vêm do pixi-viewport.

import { useCallback, useMemo } from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { Viewport } from "pixi-viewport";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { TacticalMap, GridShape, Piece } from "../../types/tacticalMap";
import { slotToWorld } from "../../features/tactical-map/utils/coords";

extend({ Container, Graphics, Sprite, Text, Viewport });

type Props = {
  map: TacticalMap;
  width: number;
  height: number;
};

export default function TacticalMapStage({ map, width, height }: Props) {
  return (
    <Application width={width} height={height} background={0x101820}>
      <pixiViewport
        screenWidth={width}
        screenHeight={height}
        worldWidth={map.grid.cols * map.grid.cellSize * 2}
        worldHeight={map.grid.rows * map.grid.cellSize * 2}
        events={undefined /* @pixi/react passa o EventSystem real em runtime */}
      >
        <BgLayer bg={map.bg} />
        <GridLayer grid={map.grid} />
        <pixiContainer label="decorations-layer" />
        <PiecesLayer map={map} />
        <pixiContainer label="walls-layer" />
        <pixiContainer label="overlay-layer" />
      </pixiViewport>
    </Application>
  );
}

// ─── Layer 0: bg ─────────────────────────────────────────────────────────────
function BgLayer({ bg }: { bg: TacticalMap["bg"] }) {
  if (!bg) return null;
  return (
    <pixiSprite
      texture={Texture.from(bg.url)}
      x={bg.x}
      y={bg.y}
      width={bg.width}
      height={bg.height}
      rotation={(bg.rotation * Math.PI) / 180}
      alpha={bg.opacity}
    />
  );
}

// ─── Layer 1: grid ───────────────────────────────────────────────────────────
function GridLayer({ grid }: { grid: GridShape }) {
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      const colorHex = parseInt(grid.color.replace("#", ""), 16);
      g.setStrokeStyle({ width: 1, color: colorHex, alpha: grid.opacity });
      if (grid.kind === "square") {
        const { cols, rows, cellSize } = grid;
        for (let c = 0; c <= cols; c++) {
          g.moveTo(c * cellSize, 0).lineTo(c * cellSize, rows * cellSize);
        }
        for (let r = 0; r <= rows; r++) {
          g.moveTo(0, r * cellSize).lineTo(cols * cellSize, r * cellSize);
        }
      } else {
        // hex: desenha contorno de cada hex dentro do retângulo cols x rows
        for (let r = 0; r < grid.rows; r++) {
          for (let c = 0; c < grid.cols; c++) {
            const center = slotToWorld({ kind: "hex", q: c, r }, grid);
            const size = grid.cellSize;
            for (let i = 0; i < 6; i++) {
              const angle = ((60 * i - 30) * Math.PI) / 180; // pointy-top
              const x = center.x + size * Math.cos(angle);
              const y = center.y + size * Math.sin(angle);
              if (i === 0) g.moveTo(x, y);
              else g.lineTo(x, y);
            }
            g.closePath();
          }
        }
      }
      g.stroke();
    },
    [grid],
  );

  return <pixiGraphics draw={draw} />;
}

// ─── Layer 3: pieces ─────────────────────────────────────────────────────────
function PiecesLayer({ map }: { map: TacticalMap }) {
  const pieces = useMemo(() => map.pieces, [map.pieces]);
  return (
    <pixiContainer label="pieces-layer">
      {pieces.map((p) => (
        <PieceSprite key={p.id} piece={p} grid={map.grid} />
      ))}
    </pixiContainer>
  );
}

function PieceSprite({ piece, grid }: { piece: Piece; grid: GridShape }) {
  const center = slotToWorld(piece.coord.slot, grid);
  const radius = grid.cellSize / 3;
  const zOffsetPx = piece.coord.z * 10; // 10px/m — placeholder visual; Fase 4 refina

  const drawShadow = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.setFillStyle({ color: 0x000000, alpha: 0.35 });
      g.circle(center.x, center.y, radius);
      g.fill();
    },
    [center.x, center.y, radius],
  );

  const drawBody = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.setFillStyle({ color: 0xff8800 });
      g.circle(center.x, center.y - zOffsetPx, radius);
      g.fill();
    },
    [center.x, center.y, radius, zOffsetPx],
  );

  return (
    <pixiContainer label={`piece-${piece.id}`}>
      <pixiGraphics draw={drawShadow} />
      <pixiGraphics draw={drawBody} />
      {piece.coord.z > 0 && (
        <pixiText
          text={`+${piece.coord.z}m`}
          x={center.x + radius}
          y={center.y - zOffsetPx - radius - 12}
          style={{ fontSize: 12, fill: 0xffffff }}
        />
      )}
    </pixiContainer>
  );
}
```

- [ ] **Step 2: Validar que o TS passa**

```bash
npx tsc -b --pretty
```

Esperado: PASS. Se aparecerem erros sobre JSX intrinsics `pixiViewport`/`pixiContainer`/etc., é porque o `extend()` ainda não populou os tipos globais — `@pixi/react` declara esses tipos via augmentation. Verificar versão instalada e seguir os docs da lib.

- [ ] **Step 3: Validar que a suíte de testes continua verde**

```bash
npm test
```

Esperado: PASS. O componente não é testado em Phase 0 (foco é coords + store), mas o mock em Task 8 deve permitir que qualquer teste futuro que o importe não quebre.

- [ ] **Step 4: Commit**

```bash
git add src/components/organisms/TacticalMapStage.tsx
git commit -m "feat(tactical-map): TacticalMapStage core (bg + grid + pieces, no interaction)"
```

---

## Task 10: Cascas vazias `TacticalMapEditor` + `TacticalMapViewer`

Cascas mínimas em `features/tactical-map/`. Phase 0 não adiciona toolbar nem interação — só estabelecem o **lugar** onde o Editor e o Viewer vão crescer (Phases 2-5 e 6 respectivamente).

**Files:**
- Create: `src/features/tactical-map/TacticalMapEditor.tsx`
- Create: `src/features/tactical-map/TacticalMapViewer.tsx`

- [ ] **Step 1: `TacticalMapEditor.tsx`**

```tsx
// src/features/tactical-map/TacticalMapEditor.tsx
//
// Casca do editor (mestre). Phase 0: só envolve o Stage. Phases 2-5 adicionam
// toolbar, roster, drag-and-drop, undo/redo, save flow.

import TacticalMapStage from "../../components/organisms/TacticalMapStage";
import type { TacticalMap } from "../../types/tacticalMap";

type Props = {
  map: TacticalMap;
  width: number;
  height: number;
};

export default function TacticalMapEditor({ map, width, height }: Props) {
  return <TacticalMapStage map={map} width={width} height={height} />;
}
```

- [ ] **Step 2: `TacticalMapViewer.tsx`**

```tsx
// src/features/tactical-map/TacticalMapViewer.tsx
//
// Casca do viewer (jogador / mestre em modo apresentação). Phase 0: só envolve
// o Stage. Phase 6 conecta o mapa anexado à partida; Phase 8 adiciona
// tap-to-move (intent).

import TacticalMapStage from "../../components/organisms/TacticalMapStage";
import type { TacticalMap } from "../../types/tacticalMap";

type Props = {
  map: TacticalMap;
  width: number;
  height: number;
};

export default function TacticalMapViewer({ map, width, height }: Props) {
  return <TacticalMapStage map={map} width={width} height={height} />;
}
```

- [ ] **Step 3: Validar TS**

```bash
npx tsc -b --pretty
```

Esperado: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/tactical-map/TacticalMapEditor.tsx src/features/tactical-map/TacticalMapViewer.tsx
git commit -m "feat(tactical-map): empty Editor + Viewer shells (wrap Stage)"
```

---

## Task 11: `TacticalMapDemoPage` com fixture hardcoded

Página dev-only com um `TacticalMap` montado inline. Permite validar visualmente que a stack inteira (Pixi + viewport + Stage + camadas) funciona em browser real.

**Files:**
- Create: `src/pages/TacticalMapDemoPage.tsx`

- [ ] **Step 1: Implementar a página**

```tsx
// src/pages/TacticalMapDemoPage.tsx
//
// Rota dev-only de smoke-test para a Fase 0 do mapa tático.
// Fixture estática; permite validar pan, pinch-zoom e renderização das camadas.
// Removível a qualquer momento sem afetar produção.

import TacticalMapEditor from "../features/tactical-map/TacticalMapEditor";
import type { TacticalMap } from "../types/tacticalMap";

const demoMap: TacticalMap = {
  id: "demo-map",
  campaignId: "demo-campaign",
  name: "Demo — Walking Skeleton",
  description: "Smoke test: grade 10×10 + 2 peças + bg fictícia",
  grid: {
    kind: "square",
    cols: 10,
    rows: 10,
    cellSize: 50,
    skewRatio: 1,
    rotation: 0,
    color: "#888888",
    opacity: 1,
    lineStyle: "solid",
  },
  bg: {
    // Imagem livre de qualquer fonte placeholder; troque pra um asset local se
    // o domínio bloquear external loading no dev.
    url: "https://placehold.co/500x500/0b1a3a/ffffff?text=BG",
    x: 0,
    y: 0,
    width: 500,
    height: 500,
    rotation: 0,
    opacity: 0.6,
  },
  pieces: [
    {
      id: "piece-1",
      characterId: "char-1",
      coord: { slot: { kind: "square", col: 2, row: 2 }, z: 0 },
      visible: true,
    },
    {
      id: "piece-2",
      characterId: "char-2",
      coord: { slot: { kind: "square", col: 6, row: 5 }, z: 2 },
      visible: true,
    },
  ],
  walls: [],
  decorations: [],
  items: [],
  createdAt: "2026-05-31T00:00:00Z",
  updatedAt: "2026-05-31T00:00:00Z",
};

export default function TacticalMapDemoPage() {
  return (
    <div style={{ width: "100vw", height: "100vh", margin: 0, overflow: "hidden" }}>
      <TacticalMapEditor map={demoMap} width={window.innerWidth} height={window.innerHeight} />
    </div>
  );
}
```

- [ ] **Step 2: Validar TS**

```bash
npx tsc -b --pretty
```

Esperado: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/TacticalMapDemoPage.tsx
git commit -m "feat(tactical-map): dev-only demo page with hardcoded fixture"
```

---

## Task 12: Montar a rota dev em `App.tsx` com `React.lazy` + Suspense

A rota só é montada quando `import.meta.env.DEV` (dev server). Em produção, o bundle nem importa a página. Lazy-load garante que o código do Pixi nunca entre no bundle inicial.

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Editar `App.tsx`**

No topo de `src/App.tsx`, **substituir o bloco de imports atuais por** (mantendo a ordem original; apenas adicionando o lazy import e ajustando o React import):

```tsx
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
// … (manter todos os imports atuais idênticos) …
import GamePage from "./pages/GamePage";

const TacticalMapDemoPage = lazy(() => import("./pages/TacticalMapDemoPage"));
```

Dentro de `<Routes>`, **adicionar como última rota**, ainda dentro de `<Routes>`:

```tsx
{import.meta.env.DEV && (
  <Route
    path="/dev/tactical-map-demo"
    element={
      <Suspense fallback={<div>Loading map demo…</div>}>
        <TacticalMapDemoPage />
      </Suspense>
    }
  />
)}
```

> **Importante:** **não** envolver o `<Routes>` inteiro em `<Suspense>` — só a rota dev. Isso preserva o comportamento atual das rotas de produção (zero risco de regressão).

- [ ] **Step 2: Lint + TS + testes**

```bash
npm run lint && npm run build && npm test
```

Esperado: PASS em todos.

- [ ] **Step 3: Subir o dev server e validar visualmente**

```bash
npm run dev
```

Esperado: dev server em http://localhost:5173. Abrir http://localhost:5173/dev/tactical-map-demo no browser:

- Grade 10×10 com linhas cinza visíveis
- Imagem de fundo (azul-escuro com texto "BG") sob a grade, com opacidade
- 2 círculos laranja (peças); a segunda peça mostra "+2m" acima e fica deslocada para cima
- Pan: arrastar com mouse / dois dedos no touch funciona
- Zoom: scroll de mouse / pinch no touch funciona

Se algo não aparecer, abrir DevTools — console deve estar limpo. Se houver erro do `pixi-viewport` exigindo `events` no construtor, ler o erro e ajustar a prop em `TacticalMapStage` (a API real pode pedir o `EventSystem` da Application).

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(tactical-map): mount /dev/tactical-map-demo lazy route (dev only)"
```

---

## Task 13: Verificar bundle split e fechar a fase

Confirmar que o chunk do Pixi **não** está no bundle inicial da app — só carrega quando a rota dev é acessada. Em produção, a rota nem existe (`import.meta.env.DEV === false`).

**Files:** (nenhum — só inspeção e commit final)

- [ ] **Step 1: Build de produção**

```bash
npm run build
```

Esperado: PASS. Output mostra os chunks emitidos.

- [ ] **Step 2: Inspecionar o output**

```bash
ls -lah dist/assets | sort -k5 -h
```

Esperado:
- Um chunk grande (`index-*.js`) — o app — **sem** o nome `pixi` no conteúdo (validar com `grep -c "pixi" dist/assets/index-*.js` → 0 ou número trivial).
- Em DEV, lazy ainda gera chunks separados (`TacticalMapDemoPage-*.js`), mas em build de produção, como a rota está guardada por `import.meta.env.DEV`, o tree-shake **pode remover** o chunk inteiro. Aceitável dos dois jeitos — o crítico é o bundle principal ficar limpo.

Sanity check:

```bash
grep -c "pixi" dist/assets/index-*.js || true
```

Esperado: `0` (ou um número muito baixo, p.ex. uma string em comentário). Se for grande, investigar — possivelmente o `extend()` em escopo de módulo no Stage está sendo eager-imported em algum lugar.

- [ ] **Step 3: Suíte completa final**

```bash
npm run lint && npm test && npm run build
```

Esperado: PASS em todos os três.

- [ ] **Step 4: Validar o git status**

```bash
git status
```

Esperado: working tree clean. Todos os commits da Fase 0 já foram criados.

- [ ] **Step 5 (opcional): Squash dos commits da Fase 0 em um único commit antes do PR**

Decisão do executor: manter commits granulares (melhor para revisar passo-a-passo) **ou** squashar em um commit único para o PR. O padrão do projeto é **um PR por fase** — a quantidade de commits dentro do PR é livre.

- [ ] **Step 6: Verificar log para preparar a descrição do PR**

```bash
git log --oneline main..HEAD
```

Listar os commits da Fase 0 e usar como base para a descrição do PR.

---

## Self-Review

**Spec coverage (§6 — Fase 0):**

| Entregável do spec | Task |
|---|---|
| Instalar `pixi.js`, `@pixi/react`, `pixi-viewport`, `zustand`, `zundo`, `immer` | Task 1 |
| `src/types/tacticalMap.ts` com todos os tipos | Task 2 |
| `utils/coords.ts` (square + hex, com skew + rotation) | Tasks 3, 5, 6 |
| `utils/hex.ts` (axial puro) | Task 4 |
| `store/editorStore.ts` (zustand + zundo + immer) | Task 7 |
| `organisms/TacticalMapStage.tsx` (grid + bg + pieces) | Task 9 |
| `features/tactical-map/TacticalMapEditor.tsx` + `Viewer.tsx` cascas | Task 10 |
| Rota dev `/dev/tactical-map-demo` com mapa hardcoded | Tasks 11, 12 |
| Mock WebGL em `vitest.setup.ts` + unit tests de coords | Tasks 8, 3-6 |
| Lazy-loading da rota via `React.lazy` (bundle limpo) | Tasks 12, 13 |

Cobertura completa do escopo da Fase 0.

**Critério de pronto do spec:** "rota `/dev/tactical-map-demo` mostra grade quadrada 10×10 + 2 peças placeholder + bg image fictícia, pan/pinch-zoom funcionando" — validado em Task 12 step 3 e Task 13.

**Type consistency check (passada com olhos frescos):**

- `slotToWorld` / `worldToSlot`: assinaturas idênticas em todos os tasks ✓
- `hexToPixel` / `pixelToHex`: assinaturas idênticas em hex.test.ts e hex.ts ✓
- `EditorState` actions: `setGrid`, `setBg`, `placePiece`, `movePiece`, `setPieceZ`, `removePiece`, `setActiveTool`, `setSelection`, `markClean` — consistentes entre o teste e a impl ✓
- Tipos importados via `import type {…}` em todos os arquivos (verbatimModuleSyntax) ✓
- `grid.cellSize` semântica documentada uma vez ("Convenções desta fase") e respeitada em `coords.ts` e no `GridLayer` ✓

**Placeholder scan:** nenhum "TBD"/"TODO"/"implementar depois" em código de produção. Comentários do tipo "Phase 4 refina" são referências de roadmap, não placeholders.

---

## Execution Handoff

**Plan complete and saved to** `System_X_System_React/docs/superpowers/plans/2026-05-31-tactical-map-fase-0-setup.md`.

**Próxima ação recomendada:** abrir nova sessão Sonnet com este plan + o spec mestre como contexto. Sonnet executa task a task, commit por task (ou squash final). PR único por fase, conforme política do projeto.

Após a Fase 0 entrar no main, abrir nova sessão Opus para planejar a **Fase 1** (Persistência + listagem de mapas — backend + frontend), que assume o `TacticalMap` type e os utilitários desta fase como base.
