# Coordenadas — três espaços e como converter entre eles

> O conceito mais importante deste sistema. Tudo que envolve mover peça, clicar slot, renderizar grade passa por aqui.

## Os três espaços

```
┌─────────────────────────────────────────────────────────┐
│ SCREEN — pixels do navegador (event.clientX, clientY)   │
│  ┌───────────────────────────────────────────────────┐  │
│  │ WORLD — pixels da cena Pixi (independente de zoom)│  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │ SLOT — coordenada do jogo (col, row) ou(q,r)│  │  │
│  │  │                                             │  │  │
│  │  │ "peça 3 está no slot (5, 8, z=2)"           │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Slot

**O que o jogo entende.** Discreto. Coordenada lógica.

- Em **malha quadrada**: `{ kind: 'square', col, row }`. `(0, 0)` é o slot do canto sup. esq.; `(cols-1, rows-1)` o canto inf. dir.
- Em **malha hexagonal**: `{ kind: 'hex', q, r }`. Sistema axial — explicado abaixo.

`z` é separado: é a altura em "metros virtuais" que a peça está sobre o slot. Não muda em qual slot ela está; só ergue visualmente.

**Quem usa**: regras de jogo (distância entre 2 peças, vizinhos de um slot, validar movimento). Backend (`Move.Position [3]int`).

### World

**Pixels do mundo Pixi**. Contínuo. `(0, 0)` é a origem do `worldContainer`. Não muda quando o usuário dá zoom ou pan — o `pixi-viewport` translada/escala a visualização da câmera, não os elementos do mundo.

**Quem usa**: renderização. "Onde desenhar este sprite?"

### Screen

**Pixel do navegador**. `event.clientX`, `event.clientY`. Muda com zoom e pan.

**Quem usa**: input. "Onde o usuário tocou?"

## Conversões — quem cuida

| Conversão | Quem |
|---|---|
| Screen ↔ World | **`pixi-viewport`** (automático em todos os eventos do canvas) |
| World ↔ Slot | **`coords.ts`** (nosso código, puro, testado) |

Você quase nunca pensa em Screen. Quando um evento de tap/click chega, o Pixi já te entrega `event.global` ou `event.local` em coordenadas do **world**.

## Quadrada — math simples

```ts
function slotToWorld(slot: SquareCoord, grid: GridShape): { x: number; y: number } {
  return {
    x: slot.col * grid.cellSize + grid.cellSize / 2,  // centro do slot
    y: slot.row * grid.cellSize + grid.cellSize / 2,
  };
}

function worldToSlot(world: { x: number; y: number }, grid: GridShape): SquareCoord {
  return {
    kind: 'square',
    col: Math.floor(world.x / grid.cellSize),
    row: Math.floor(world.y / grid.cellSize),
  };
}
```

(Versão simplificada — a real aplica `skewRatio` e `rotation` também; veja abaixo.)

## Hexagonal — coords axiais

Hexes são chatos. Tem várias convenções (offset, cube, axial, doubled). A literatura de jogos converge em **axial** porque é a mais compacta e a melhor para distância/vizinhos.

**Referência mestre**: [RedBlobGames — Hexagonal Grids](https://www.redblobgames.com/grids/hexagons/). Leia se quiser entender a fundo; o que você precisa pra usar nosso código é:

- Cada hex tem duas coordenadas: `q` (oblíqua para direita-baixo) e `r` (vertical para baixo)
- Vizinhos: 6 deltas fixos `[(+1, 0), (-1, 0), (0, +1), (0, -1), (+1, -1), (-1, +1)]`
- Distância entre dois hexes: `(abs(dq) + abs(dr) + abs(dq+dr)) / 2`
- Conversão world ↔ axial: usa raízes de 3 (no `pointy-top hex layout`)

Tudo isso vive em `utils/hex.ts` como funções puras. Você só importa.

```ts
// utils/hex.ts (esboço)
const SQRT_3 = Math.sqrt(3);

export function hexToWorld(hex: HexCoord, grid: GridShape): { x: number; y: number } {
  const size = grid.cellSize / 2;
  return {
    x: size * (SQRT_3 * hex.q + (SQRT_3 / 2) * hex.r),
    y: size * (3 / 2) * hex.r,
  };
}

export function worldToHex(world: { x: number; y: number }, grid: GridShape): HexCoord {
  const size = grid.cellSize / 2;
  const q = (SQRT_3 / 3 * world.x - 1 / 3 * world.y) / size;
  const r = (2 / 3 * world.y) / size;
  return roundAxial(q, r);  // arredondamento especial pra evitar tile errado
}

export function hexNeighbors(hex: HexCoord): HexCoord[] {
  const DELTAS: Array<[number, number]> = [
    [+1, 0], [-1, 0], [0, +1], [0, -1], [+1, -1], [-1, +1]
  ];
  return DELTAS.map(([dq, dr]) => ({ kind: 'hex', q: hex.q + dq, r: hex.r + dr }));
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
}
```

`roundAxial` é a função sutil — o RedBlobGames explica. Você confia no código testado.

## `skewRatio` e `rotation` — isométrico + rotação

`GridShape.skewRatio` controla a distorção vertical da malha:
- `1.0` = top-down (sem distorção)
- `0.5` = isométrico 2:1 (clássico)
- `0.33` = "achatado" (3:1)

`GridShape.rotation` = graus pra rotacionar a malha inteira.

Como isso entra no math? Aplicamos uma **matriz de transformação** afim depois de calcular o `(x, y)` "base":

```ts
function slotToWorld(slot: SlotCoord, grid: GridShape): { x: number; y: number } {
  // 1. coord base (sem distorção)
  const base = slot.kind === 'square'
    ? squareToWorldBase(slot, grid)
    : hexToWorldBase(slot, grid);

  // 2. aplica skew vertical
  const skewed = { x: base.x, y: base.y * grid.skewRatio };

  // 3. aplica rotação
  if (grid.rotation === 0) return skewed;
  const rad = (grid.rotation * Math.PI) / 180;
  return {
    x: skewed.x * Math.cos(rad) - skewed.y * Math.sin(rad),
    y: skewed.x * Math.sin(rad) + skewed.y * Math.cos(rad),
  };
}
```

E o `worldToSlot` faz o **inverso** (rotação inversa primeiro, depois undo do skew, depois conversão base).

**Importante**: essas transformações estão no math **desde a Fase 0** com defaults `1.0` e `0`. Quando a Fase 9 ligar a UI (sliders pro mestre), o math já está pronto e testado.

## Onde isto é usado

| Lugar | Por quê |
|---|---|
| Renderização das peças | `slotToWorld(piece.coord.slot, grid)` → onde desenhar |
| Drag-and-drop | Sprite move em `world`; no `pointerup`, `worldToSlot` decide o slot final |
| Tap em slot vazio | Evento dá `event.global` em world; `worldToSlot` decide qual slot |
| Distância entre peças | `hexDistance` (hex) ou Pythagoras simples (square) |
| Validação de movimento | Slot dentro de `[0, cols)` × `[0, rows)` |
| Pathfinding (futuro) | A* sobre vizinhos retornados por `hexNeighbors` ou equivalente quadrado |

## Testes

Coords são puros, table-driven:

```ts
// utils/coords.test.ts (Fase 0)
describe('slotToWorld', () => {
  const baseGrid: GridShape = {
    kind: 'square',
    cols: 10, rows: 10,
    cellSize: 100,
    skewRatio: 1,
    rotation: 0,
    color: '#fff', opacity: 1, lineStyle: 'solid',
  };

  it.each([
    [{ kind: 'square', col: 0, row: 0 }, { x: 50, y: 50 }],
    [{ kind: 'square', col: 5, row: 3 }, { x: 550, y: 350 }],
  ])('squareToWorld(%j) → %j', (slot, expected) => {
    expect(slotToWorld(slot as SquareCoord, baseGrid)).toEqual(expected);
  });

  it('aplica skewRatio', () => {
    expect(slotToWorld({ kind: 'square', col: 0, row: 1 }, { ...baseGrid, skewRatio: 0.5 }))
      .toEqual({ x: 50, y: 75 });  // y * 0.5 + cellSize/2
  });
});
```

Quando bug de rendering aparecer, esses testes de coords vão ser sua primeira parada — porque 80% dos bugs visuais começam em "math errado de coord".

## Dicas de debugging

- **Peça aparece no canto errado**: cheque se está usando `world` em vez de `slot` (ou vice-versa) em algum lugar.
- **Drag não detecta o slot certo**: confira que `event.global` está sendo convertido de `screen` pra `world` pelo viewport antes de você passar pra `worldToSlot`.
- **Math hex parece quebrado**: troque temporariamente `kind` pra square com mesma `cellSize`; se quadrado funciona, é especificamente bug no hex math (não no resto do código).

## Referências externas

- [RedBlobGames — Hexagonal Grids](https://www.redblobgames.com/grids/hexagons/) — leitura essencial se for tocar no hex
- [RedBlobGames — Implementation Notes](https://www.redblobgames.com/grids/hexagons/implementation.html) — exemplos de código
- O nome "axial" vs "cube" coords: começa nos dois; convertendo entre eles, você entende rápido. Usamos axial pra payload e cube pra distância.
