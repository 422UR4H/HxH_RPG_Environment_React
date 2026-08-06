# Refactor do mapa tático — Fase 2: extrair lógica pura e cobrir com teste

> **Para quem implementa:** execute tarefa por tarefa, na ordem. Cada passo é uma ação
> de 2–5 minutos. Não pule os passos de "rodar e ver falhar".

**Spec de referência (leia a §1.2 e a §4 antes de começar):**
`docs/superpowers/specs/2026-08-06-tactical-map-refactor-design.md`

**Pré-requisito obrigatório:** a **Fase 1**
(`2026-08-06-tactical-map-refactor-fase-1-higiene.md`) precisa estar concluída e
mergeada. Esta fase parte de uma suíte verde.

**Branch:** `refactor/tactical-map-fase-2-logica-pura`

---

## Objetivo e o porquê

A camada Pixi do mapa tem **cobertura de teste zero** — `src/test/setup.ts` mocka
`ResizeObserver` com dimensão zero e `TacticalMapStage` só renderiza sob
`width > 0 && height > 0`. Nenhum teste monta esses componentes.

Isso não vai mudar nesta fase (montar Pixi em jsdom seria caro e frágil). O que vai
mudar é **onde a lógica mora**: tudo que é cálculo puro sai de dentro dos componentes,
vira função exportada em `utils/`, e ganha teste unitário.

Ao fim desta fase, a Fase 4 (quebrar o `TacticalMapStage` em arquivos) deixa de ser um
salto no escuro: o que ela move passa a ser sobretudo *JSX e wiring*, com a matemática
já verificada fora.

**Cada tarefa segue o mesmo ritmo:**
1. Criar o arquivo de teste com os casos, apontando para a função que ainda não existe.
2. Rodar — **ver falhar** (erro de import / função inexistente). Isso prova que o teste
   está de fato exercitando o código novo.
3. Extrair a função para o `utils/`.
4. Rodar — ver passar.
5. Trocar o componente para consumir a função extraída.
6. Rodar `tsc -b` + suíte inteira — ver verde.

**Regra que vale para as 5 tarefas:** ao mover código, mova os comentários junto,
intactos. Vários deles documentam bugs reais (spec §4).

**Arquivos:**
- Criar: `src/features/tactical-map/utils/bgHandles.ts` + `__tests__/bgHandles.test.ts`
- Criar: `src/features/tactical-map/utils/wallHit.ts` + `__tests__/wallHit.test.ts`
- Criar: `src/features/tactical-map/utils/stipple.ts` + `__tests__/stipple.test.ts`
- Modificar: `src/features/tactical-map/utils/coords.ts` + `__tests__/coords.test.ts`
- Modificar: `src/features/tactical-map/utils/walls.ts` + `__tests__/walls.test.ts`
- Modificar: `src/components/organisms/MapHandlesLayer.tsx`
- Modificar: `src/components/organisms/WallsLayer.tsx`
- Modificar: `src/components/organisms/TacticalMapStage.tsx`
- Modificar: `src/features/tactical-map/TacticalMapEditor.tsx`
- Modificar: `src/features/tactical-map/TacticalMapPlacer.tsx`

---

## Task 1 — `isSameSlot`: acabar com o `JSON.stringify`

**O problema:** `JSON.stringify(p.coord.slot) === JSON.stringify(slot)` aparece em
**6 lugares**. Além de repetido, é frágil — depende da ordem em que as chaves foram
inseridas no objeto. `{kind,col,row}` e `{kind,row,col}` são o mesmo slot e comparam
como diferentes.

### 1.1 Escrever o teste primeiro

**Arquivo:** `src/features/tactical-map/utils/__tests__/coords.test.ts` (já existe —
acrescente um `describe` novo no fim).

```ts
describe("isSameSlot", () => {
  it("compara slots quadrados por valor", () => {
    expect(isSameSlot({ kind: "square", col: 2, row: 3 }, { kind: "square", col: 2, row: 3 })).toBe(true);
    expect(isSameSlot({ kind: "square", col: 2, row: 3 }, { kind: "square", col: 3, row: 2 })).toBe(false);
  });

  it("independe da ordem das chaves — o que JSON.stringify não garantia", () => {
    const a = { kind: "square", col: 1, row: 4 } as const;
    const b = { row: 4, col: 1, kind: "square" } as const;
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b)); // a armadilha antiga
    expect(isSameSlot(a, b)).toBe(true);
  });

  it("compara slots hex por valor", () => {
    expect(isSameSlot({ kind: "hex", q: 1, r: -2 }, { kind: "hex", q: 1, r: -2 })).toBe(true);
    expect(isSameSlot({ kind: "hex", q: 1, r: -2 }, { kind: "hex", q: -2, r: 1 })).toBe(false);
  });

  it("slots de tipos diferentes nunca são iguais", () => {
    expect(isSameSlot({ kind: "square", col: 0, row: 0 }, { kind: "hex", q: 0, r: 0 })).toBe(false);
  });
});
```

Adicione `isSameSlot` ao import de `../coords` no topo do arquivo.

**Rode e veja falhar.**

### 1.2 Implementar

**Arquivo:** `src/features/tactical-map/utils/coords.ts`, no fim.

```ts
// Igualdade estrutural de slot. Substitui a comparação por JSON.stringify que existia
// espalhada pelo código: aquela dependia da ordem de inserção das chaves, então dois
// slots iguais escritos em ordens diferentes comparavam como distintos.
export function isSameSlot(a: SlotCoord, b: SlotCoord): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind === "square"
    ? a.col === (b as typeof a).col && a.row === (b as typeof a).row
    : a.q === (b as typeof a).q && a.r === (b as typeof a).r;
}
```

**Rode e veja passar.**

### 1.3 Substituir nos 6 chamadores

Localize com:

```
grep -rn "JSON.stringify(p.coord.slot)" src/
```

São 6 ocorrências, em 3 arquivos:

| Arquivo | Linhas aprox. | Forma atual |
|---|---|---|
| `components/organisms/TacticalMapStage.tsx` | 864, 898 | `p.id !== drag.pieceId && JSON.stringify(p.coord.slot) === JSON.stringify(slot)` |
| `components/organisms/TacticalMapStage.tsx` | 956 | `p.id !== draggingPieceId && JSON.stringify(p.coord.slot) === JSON.stringify(hoverSlot)` |
| `features/tactical-map/TacticalMapPlacer.tsx` | 147, 196 | `JSON.stringify(p.coord.slot) === JSON.stringify(slot)` |
| `features/tactical-map/TacticalMapEditor.tsx` | 301 | `JSON.stringify(p.coord.slot) === JSON.stringify(slot)` |

Troque cada uma por `isSameSlot(p.coord.slot, slot)` (ou `hoverSlot`), **preservando o
resto da condição**, incluindo os guards `p.id !== ...`. Importe `isSameSlot` de
`../features/tactical-map/utils/coords` (ou `./utils/coords`, conforme o arquivo).

**Verificar:** `npx tsc -b` limpo + `npm test` verde.

---

## Task 2 — `computeNewBgFromDrag`: extrair e cobrir

São ~80 linhas de matemática de resize com aspect ratio e rotação, oito casos
(`TL`…`BR`) mais `rotate`, e **zero testes**. É o maior bloco de lógica não testada do
refactor inteiro.

### 2.1 Extrair primeiro, testar em seguida

Aqui a ordem inverte de propósito: a função **já existe** e está correta em produção.
Movê-la sem alterar uma linha é seguro, e permite escrever os testes contra a
implementação real em vez de contra uma reescrita.

**Crie** `src/features/tactical-map/utils/bgHandles.ts` e mova para lá, **sem alterar
nenhuma linha do corpo**, a função `computeNewBgFromDrag` de
`MapHandlesLayer.tsx:288-367` — junto com todos os comentários dela. Exporte-a.

Ela precisa de `import type { BgImage } from "../../../types/tacticalMap";`.

Em `MapHandlesLayer.tsx`, apague a definição local e importe do novo módulo.

**Verificar:** `npx tsc -b` limpo, `npm test` verde. Nada mudou de comportamento.

### 2.2 Agora os testes

**Crie** `src/features/tactical-map/utils/__tests__/bgHandles.test.ts`.

Use um bg de partida simples, sem rotação, para que a matemática seja conferível de
cabeça:

```ts
const bg = { url: "x", x: 100, y: 100, width: 200, height: 100, rotation: 0, opacity: 1 };
// aspectRatio = 200/100 = 2
```

Casos mínimos a cobrir — **um `it` por linha**:

1. `handle: "rotate"` — devolve `rotation` novo e **não** altera `x/y/width/height`.
   Com o cursor exatamente acima do centro, o ângulo esperado é `0`
   (a fórmula é `atan2(dy,dx)*180/π + 90`).
2. `"BR"` **sem** `freeResize` (Shift solto) — largura vem do cursor, altura sai de
   `newW / aspectRatio`, e `x/y` **não** mudam (o canto TL é a âncora).
3. `"BR"` **com** `freeResize: true` — largura e altura são independentes.
4. `"TL"` sem freeResize — o canto **oposto** (`x+w`, `y+h`) fica parado; confirme que
   `x` e `y` mudaram e que `x+width` e `y+height` continuam nos valores originais.
5. `"MR"` — só a largura muda pelo cursor; a altura sai do aspect ratio e o bloco fica
   **centrado verticalmente** (`y` é reajustado). Confirme o centro vertical estável.
6. `"TC"` — só a altura muda pelo cursor; largura sai do aspect ratio e o bloco fica
   centrado horizontalmente.
7. **Clamp mínimo:** arraste `"BR"` para um ponto muito à esquerda/acima da âncora e
   confirme que `width >= 16` e `height >= 16` (a constante `MIN` da função).
8. **Handle desconhecido** (ex.: `"XX"`) devolve `null`.
9. **Com rotação:** `rotation: 90`, handle `"MR"`. Não tente prever o número exato de
   cabeça — em vez disso, afirme a **propriedade**: o resultado é finito, `width > 0`,
   `height > 0`, e o aspect ratio se manteve (`width/height ≈ 2`, com `toBeCloseTo`).
   Comparações de ponto flutuante: use `toBeCloseTo`, nunca `toBe`.

**Rode e veja passar.** Se algum caso falhar, **não ajuste a função** — ela é o
comportamento de produção atual. Ajuste sua expectativa, ou, se você tiver certeza de
que encontrou um bug real, **pare e reporte**: bug em matemática de resize é achado
novo, fora do escopo desta fase.

---

## Task 3 — `findNearestWall` / `ptSegDist`: extrair e cobrir

**Crie** `src/features/tactical-map/utils/wallHit.ts` e mova para lá, sem alterar o
corpo, `ptSegDist` e `findNearestWall` de `WallsLayer.tsx:583-599`. Exporte as duas
(`ptSegDist` também — ela merece teste próprio).

Em `WallsLayer.tsx`, apague as definições locais e importe.

**Crie** `src/features/tactical-map/utils/__tests__/wallHit.test.ts`:

Para `ptSegDist` (o ponto está fora do segmento? em cima? na perpendicular?):

1. Ponto sobre o segmento → distância `0`.
2. Ponto na perpendicular ao meio de um segmento horizontal de `(0,0)` a `(10,0)`:
   `ptSegDist(5, 3, 0,0, 10,0)` → `3`.
3. Ponto **além** da extremidade — a distância é até a **ponta**, não até a reta
   infinita: `ptSegDist(20, 0, 0,0, 10,0)` → `10`.
4. Segmento degenerado (p1 == p2) → distância euclidiana até o ponto, sem `NaN`.

Para `findNearestWall`:

5. Lista vazia → `null`.
6. Duas paredes, uma claramente mais perto → devolve a mais perto.
7. Parede além do `threshold` → `null` (o threshold é exclusivo: `d < bestD`).
8. Empate exato entre duas paredes → devolve a **primeira** da lista (o `<` estrito
   preserva a primeira; documente isso no teste, é o comportamento atual).

Você vai precisar de um helper `mockWall(p1, p2)` no arquivo de teste. Copie o formato
de `src/features/tactical-map/store/__tests__/editorStore.test.ts` (~linha 120) para
manter consistência.

---

## Task 4 — Defaults de parede: uma fonte só

**O problema:** o objeto de atributos default da parede é montado **duas vezes** em
`WallsLayer.tsx` — em `finishPolyline` (~linha 109) e no auto-finish de vãos
(~linha 225). Se um default mudar, o outro fica para trás em silêncio.

### 4.1 Extrair

**Arquivo:** `src/features/tactical-map/utils/walls.ts` (já existe — acrescente).

Mova para cá `HP_DEFAULTS` e `RESISTANCE_DEFAULTS` (hoje em `WallsLayer.tsx:16-21`) e
crie a fábrica:

```ts
// Atributos default de um segmento novo, por tipo e material. Fonte única: antes isto
// era montado à mão em dois lugares de WallsLayer (desenho de polilinha e auto-finish
// de vão), e um default alterado num deles não chegava ao outro.
export function newWallAttrs(
  wallType: WallType,
  material: WallMaterial,
): Omit<WallSegment, "id" | "p1" | "p2"> {
  return {
    wallType,
    material,
    move: true,
    sense: "full",
    direction: wallType === "terrain" ? "left" : "both",
    open: false,
    locked: false,
    hp: HP_DEFAULTS[material],
    maxHp: HP_DEFAULTS[material],
    resistance: RESISTANCE_DEFAULTS[material],
    destroyed: false,
  };
}
```

**Atenção a uma diferença real entre os dois trechos atuais:** em `finishPolyline` o
`direction` é `wallType === "terrain" ? "left" : "both"`; no auto-finish de vãos é
`"both"` fixo. Os dois batem, porque o auto-finish só roda para
`door`/`window`/`secret_door` — nenhum deles é `terrain`. A fábrica acima preserva o
comportamento dos dois. **Não "simplifique" removendo a checagem de `terrain`.**

Exporte também um predicado, que hoje é uma condição repetida duas vezes:

```ts
// Vãos não podem ser divididos em pontos médios: explodePolyline transformaria uma
// porta de uma célula em dois meios-vãos.
export function isOpening(wallType: WallType): boolean {
  return wallType === "door" || wallType === "window" || wallType === "secret_door";
}
```

### 4.2 Testar

Em `src/features/tactical-map/utils/__tests__/walls.test.ts`, acrescente:

1. `newWallAttrs("wall", "stone")` → `hp === 100`, `maxHp === 100`, `resistance === 5`,
   `direction === "both"`, `destroyed === false`, `open === false`.
2. `newWallAttrs("terrain", "wood")` → `direction === "left"`, `hp === 40`,
   `resistance === 2`.
3. `newWallAttrs("door", "iron")` → `direction === "both"`, `hp === 500`,
   `resistance === 15`.
4. `hp` e `maxHp` sempre saem iguais, para os 4 materiais.
5. `isOpening`: `true` para `door`/`window`/`secret_door`, `false` para
   `wall`/`terrain`.

### 4.3 Consumir em `WallsLayer.tsx`

Nos dois pontos, substitua a montagem manual por `newWallAttrs(wallType, mat)` e as
condições `wallType === "door" || wallType === "window" || wallType === "secret_door"`
por `isOpening(wallType)`.

**Cuidado no auto-finish** (~linha 225): lá o objeto literal inclui `id`, `p1` e `p2`
junto dos atributos. Fica:

```ts
onDrawComplete([{
  ...newWallAttrs(wallType, mat),
  id: crypto.randomUUID(),
  p1: currentPts[0],
  p2: pt,
}]);
```

**Não remova** os comentários que explicam o auto-finish e a sincronização do
`drawRef` — eles documentam um bug real de clique rápido.

---

## Task 5 — Stipple: um loop só, parametrizado

**O problema:** `drawDashedLine` (~428), `drawDottedLine` (~455) e a primeira metade de
`drawDestroyedWall` (~548) são o mesmo loop, com `(dotLen, gapLen, alpha)` diferentes.

### 5.1 Escrever o teste primeiro

Este é o único ponto da fase em que se testa desenho. Use o padrão **recorder** que já
existe em `src/features/tactical-map/utils/__tests__/fogDraw.test.ts` (~linha 30) — um
objeto que grava as chamadas `moveTo`/`lineTo`/`stroke` em vez de desenhar. Copie a
estrutura de lá; não invente outra.

**Crie** `src/features/tactical-map/utils/__tests__/stipple.test.ts`:

1. Segmento de `(0,0)` a `(24,0)` com `dashLen: 8, gapLen: 4` → grava **2** pares
   moveTo/lineTo (traço em 0–8, vão 8–12, traço 12–20, vão 20–24 → na verdade confirme
   contando; o loop alterna começando por traço). Afirme a contagem **e** as
   coordenadas do primeiro traço: `moveTo(0,0)` / `lineTo(8,0)`.
2. Segmento mais curto que um traço → um único traço, terminando no fim do segmento
   (não passa do comprimento total).
3. Segmento de comprimento ~0 (`totalLen < 0.1`) → **nenhuma** chamada de desenho.
4. Segmento na diagonal → o primeiro traço tem comprimento `dashLen` (confira com
   `Math.hypot` entre `moveTo` e `lineTo`, `toBeCloseTo`).
5. `alpha` chega no `setStrokeStyle` de cada traço.

**Rode e veja falhar.**

### 5.2 Implementar

**Crie** `src/features/tactical-map/utils/stipple.ts`:

```ts
// Desenha um segmento tracejado/pontilhado, alternando traço e vão ao longo da linha.
// Parametriza os três estilos que existiam como cópias separadas em WallsLayer:
// tracejado (8/4), pontilhado (2/4) e destruído (1/7).
export function drawStippledSegment(
  g: StippleTarget,
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  opts: { color: number; width: number; alpha: number; dashLen: number; gapLen: number },
): void { /* ... */ }
```

Mova o corpo de `drawDashedLine` para cá, trocando as constantes locais `dashLen`/
`gapLen` pelos campos de `opts`. Defina `StippleTarget` como o tipo estrutural mínimo
que o loop usa (`setStrokeStyle`, `moveTo`, `lineTo`, `stroke`) — **não** importe
`Graphics` da `pixi.js`. É esse tipo estreito que torna a função testável sem contexto
WebGL; `losMask.ts` já usa exatamente essa técnica, veja lá antes de escrever.

**Rode e veja passar.**

### 5.3 Consumir em `WallsLayer.tsx`

- `drawDashedLine(g, a1, a2, color, width, alpha)` → `drawStippledSegment(g, a1, a2, { color, width, alpha, dashLen: 8, gapLen: 4 })`
- `drawDottedLine(...)` → o mesmo, com `dashLen: 2, gapLen: 4`
- em `drawDestroyedWall`, a primeira metade (o loop) → `drawStippledSegment(..., { color, width, alpha: 0.4, dashLen: 1, gapLen: 7 })`. **Mantenha** a segunda metade
  (as marcas `×` nas extremidades) onde está.

Apague `drawDashedLine` e `drawDottedLine`.

Enquanto estiver aí: `drawDestroyedWall` está com **indentação de 4 espaços** enquanto
o resto do arquivo usa 2. Reindente para 2. É o único ajuste cosmético autorizado nesta
fase.

---

## Task 6 — `GridLayer` usa `hexToPixel`

**O problema:** `GridLayer` (`TacticalMapStage.tsx:744-756`) reimplementa a geometria
hex à mão. O resultado **confere numericamente** com `hexToPixel` (verificado), mas a
conversão offset↔axial fica implícita ali e explícita em `isSlotInBounds`, sem helper
nomeado.

### 6.1 Nomear a conversão

**Arquivo:** `src/features/tactical-map/utils/coords.ts`.

```ts
// Conversão offset (odd-r) → axial. A grade hex é armazenada e percorrida em
// coordenadas de offset (col, row), mas toda a matemática de hex.ts é axial (q, r).
// Esta é a única ponte entre os dois; isSlotInBounds faz o caminho inverso.
export function offsetToAxial(col: number, row: number): { q: number; r: number } {
  return { q: col - Math.floor(row / 2), r: row };
}
```

Teste em `__tests__/coords.test.ts` — a propriedade que importa é o **ida-e-volta**:
para vários `(col,row)`, `offsetToAxial` seguido da fórmula de `isSlotInBounds`
(`col = q + floor(r/2)`) devolve o `col` original. Cubra linhas pares e ímpares, e
colunas negativas.

### 6.2 Consumir

Em `GridLayer`, o loop de hex passa a:

```ts
const { q, r: ar } = offsetToAxial(c, r);
const center = hexToPixel({ q, r: ar }, size);
// desenha os 6 vértices em torno de center, como já fazia
```

Importe `hexToPixel` de `../../features/tactical-map/utils/hex`.

**Preserve** o comentário do bloco `GridLayer` sobre desenhar em espaço de mundo com
`applyTransform` por extremidade (invariante §4.8 do spec) — ele continua valendo e é
independente desta mudança.

**Verificação obrigatória desta task:** ela é a única da fase que muda pixel na tela.
Depois de trocar, abra o editor no browser, crie um mapa com grade **hexagonal**
(`GridConfigPanel` → tipo hex) e confirme que a grade desenha idêntica ao que era.
Se você não conseguir comparar lado a lado, tire um print antes e depois.

---

## Task 7 — Verificação final

Nesta ordem:

1. `npx tsc -b` — limpo.
2. `npm run lint` — **não fica limpo**, e não é para ficar: sobram ~20 erros
   pré-existentes de `no-explicit-any` fora da superfície do mapa (spec, C8). O que
   você precisa garantir é **zero** erro em arquivo do mapa:
   ```
   npx eslint src -f json | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const r=JSON.parse(d);for(const f of r){const e=f.messages.filter(m=>m.severity===2);if(e.length&&/tactical-map|Map[A-Z]|Walls/.test(f.filePath))console.log(f.filePath,e.length)}})"
   ```
   Saída vazia = ok. Os arquivos novos que você criar entram nesse filtro.
3. `npm test` — verde. A contagem tem que ter **subido bastante** em relação à Fase 1
   (esta fase adiciona ~35 testes novos). Nenhum teste pré-existente pode ter sido
   apagado ou afrouxado para passar.
4. `grep -rn "JSON.stringify(p.coord.slot)" src/` → **nenhum resultado**.
5. `grep -n "drawDashedLine\|drawDottedLine" src/components/organisms/WallsLayer.tsx` →
   **nenhum resultado**.

---

## Entrega

1. `./dev-checkout.sh refactor/tactical-map-fase-2-logica-pura` a partir de
   `System_X_System_Project/`.
2. **Verificação visual** em `http://localhost:5173` — esta fase toca desenho de grade,
   desenho de parede e ocupação de slot. Roteiro:
   - Editor, aba **Grade**: criar grade **quadrada** e depois **hexagonal**; confirmar
     que as duas desenham como antes (Task 6).
   - Editor, aba **Fundo**: redimensionar por canto, por borda, com e sem Shift, e
     rotacionar (Task 2 — a matemática foi movida, não alterada, mas é o ponto de maior
     risco da fase).
   - Editor, aba **Paredes**: desenhar uma polilinha de parede, uma porta, uma parede de
     terreno; selecionar clicando; confirmar que o clique ainda "pega" a parede (Task 3);
     danificar/destruir uma parede se houver como, para ver o tracejado (Task 5).
   - Editor, aba **Peças**: arrastar peça para um slot **ocupado** e confirmar que o
     realce fica **vermelho** e a peça não move (Task 1).
3. Só então abrir o PR.

**Título do PR:** `refactor(tactical-map): fase 2 — extrair lógica pura e cobrir com teste`

No corpo, liste B3, B4, B5, B6 e C6 do spec, e diga a contagem de testes antes e depois.

---

## O que NÃO fazer nesta fase

- **Não mova componentes de arquivo.** `TacticalMapStage.tsx` continua com 6
  componentes dentro — quebrar é a Fase 4. Aqui só sai lógica pura.
- **Não** unifique `BgHandles` com `GridHandles` (B7) — é Fase 4.
- **Não** mexa em `ghostStyle` / `PieceDragGhost` / estado de drag (B1, B2) — é Fase 3.
- **Não** toque nas props do `MapEditorToolbar` — é Fase 5.
- **Não remova os blocos `OCULTO POR ORA`** de `MapHandlesLayer` — decisão do dono do
  produto. Se a Task 2 mover código perto deles, mova-os junto, intactos.
- **Não corrija bug que encontrar** na matemática extraída. Reporte e siga; extrair e
  corrigir no mesmo PR torna impossível saber qual dos dois quebrou algo.
