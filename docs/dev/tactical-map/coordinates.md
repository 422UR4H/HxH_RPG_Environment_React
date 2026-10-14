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

`GridShape.rotation` = graus pra rotacionar a malha inteira (em torno do centro da grade: o pivô `gridPivot`, centro de `gridLocalBounds`; no quadrado é `cols·cellSize/2`, `rows·cellSize/2`).

A ordem importa. `applyTransform` (`utils/coords.ts`) leva um ponto do espaço LOCAL
(`col * cellSize`, `row * cellSize`) pro espaço do mundo assim:

```ts
export function applyTransform(p: XY, grid: GridShape): XY {
  const { x: pivotX, y: pivotY } = gridPivot(grid); // centro de gridLocalBounds, em LOCAL
                                                    // (quadrado: cols·cellSize/2, rows·cellSize/2)
  const dx = p.x - pivotX;
  const dy = p.y - pivotY;
  // 1. gira em torno do centro
  const t = grid.rotation * DEG_TO_RAD;
  const rx = dx * Math.cos(t) - dy * Math.sin(t);
  let ry = dx * Math.sin(t) + dy * Math.cos(t);
  // 2. achata y em espaço de TELA (depois de girar)
  ry *= grid.skewRatio;
  // 3. volta ao pivô e soma a origem
  return { x: rx + pivotX + (grid.originX ?? 0), y: ry + pivotY + (grid.originY ?? 0) };
}
```

Achatar **depois** de girar é o que faz o isométrico: girar 45° e comprimir y vira losangos 2:1.
Achatar antes só comprimiria o eixo vertical local. `inverseTransform` desfaz na ordem inversa
(tira a origem, divide por `skewRatio`, desgira).

**O servidor nunca transforma.** Paredes, posições e fog trafegam em espaço LOCAL; `rotation` e
`skewRatio` só afetam o desenho e a entrada de ponteiro no cliente (`applyTransform` pra desenhar,
`inverseTransform` pra converter o clique em slot).

### Onde o mestre controla

- **Painel Grade** (`GridConfigPanel`): Predefinições (Isométrico = rotação 45 + `skewRatio` 0.5;
  Top-down = 0 / 1), campo numérico de Rotação e Perspectiva (slider + número, 0.3 a 1.0).
- **No mapa** (`MapHandlesLayer`, `gridFromHandleDrag`): a esfera dourada gira a grade;
  Shift + alça do par mais vertical na tela achata (`skewRatio`). Só o ângulo decide
  (`skewHandlePair`): `|cos θ| >= |sin θ|` → `TC`/`BC`, senão `ML`/`MR` — empate (45°) fica com
  `TC`/`BC`, e a proporção da grade (colunas × linhas, quadrada ou hex) não entra. O outro par,
  com Shift, redimensiona normalmente.
- **Encaixar Grade** (`fitGridToImage`) usa a caixa da grade no MUNDO (com rotação e perspectiva) e
  preserva ambas. O aviso "colunas/linhas não cobertas pela imagem" ao salvar
  (`uncoveredGridLines`, `utils/bgCoverage.ts`) também testa a grade transformada, quadrada ou hex.

## O que se mede em LOCAL e o que se mede na tela

Com rotação e perspectiva, "um passo" e "um pixel" deixam de ser a mesma coisa nos dois espaços.
A regra: **geometria do jogo em LOCAL; o que o olho ou o dedo mede, na tela (WORLD).**

| Medida | Espaço | Por quê |
|---|---|---|
| Posição de peça, parede, fog, alcance, distância em casas | LOCAL (slot) | É o que o servidor guarda e valida |
| Tamanho da ficha | Tela: `slotScreenInradius` | A ficha tem de caber na casa como ela aparece (losango achatado), não no quadrado LOCAL |
| Tolerância de clique/encaixe em parede (`findNearestWallWorld`, `snapWallPointWorld`) | WORLD | Pixels que o usuário vê; medir em LOCAL encolheria o acerto no eixo achatado |
| Setas do teclado (`neighborTowardScreen`, `utils/reach.ts`) | Tela | Escolhe, entre os vizinhos da casa (8 no quadrado, 6 no hex), o de maior cosseno com a direção da seta (y para baixo); empate fica, no hex, com o que mantém a coluna de offset (`q + floor(r/2)`) — ↑/↓ num hex sem giro sobem/descem a própria coluna, alternando `(q+1, r−1)` e `(q, r−1)` pela paridade da linha —, e depois com o primeiro de `neighborSlots`. Na grade girada 45° e achatada, ↑ vai para `(col−1, row−1)` |
| Alças de edição | Tela | Seguem o cursor em y depois de girar e achatar |

**Paredes escalam com o tamanho da célula.** Paredes e células vivem no mesmo espaço LOCAL; ao mudar
`cellSize` (mesmo `kind`), `scaleWallsToGrid` multiplica as pontas pela razão `next/prev` em torno do
(0,0) LOCAL. Trocar quadrado↔hex não tem correspondência geométrica: as paredes ficam como estão.

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
      .toEqual({ x: 50, y: 325 });  // pivô (500,500): 500 + (150 - 500) * 0.5
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
