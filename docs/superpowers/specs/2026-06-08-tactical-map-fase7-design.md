# Tactical Map — Fase 7: Handles no Canvas, Distorção Isométrica, Rotação e Fixes

**Data:** 2026-06-08
**Status:** Aprovado — pronto para writing-plans
**Escopo:** Frontend apenas (`System_X_System_React`)
**Branch:** `feat/tactical-map-fase-7` (a criar a partir de `main`)
**Spec master:** [Tactical Map — Design Geral](./2026-05-31-tactical-map-fase-1-design.md) §6 (Fase 9 do spec original)
**Fase anterior:** [Fase 6 — Viewer in-Match](./2026-06-04-tactical-map-fase-6-design.md)

> **Nota de numeração:** Fases 7 e 8 do spec original (WS sync in-game, intent de movimento do jogador)
> foram extraídas para a próxima sprint ("próxima jornada"). Esta fase cobre o conteúdo
> do spec Fase 9 (distorção isométrica + rotação) somado a um conjunto de fixes e melhorias
> de editor identificados durante os testes. Não há mudanças no backend.

---

## 1. Visão geral

Esta fase torna o editor de mapa visualmente interativo: o mestre pode manipular a imagem
de fundo e a malha diretamente no canvas usando handles — redimensionar arrastando bordas,
rotacionar arrastando um handle dedicado, e aplicar distorção isométrica segurando Shift.

Além disso, corrige três regressões críticas introduzidas em fases anteriores (drag do
background, pivot de rotação, fonte Roboto) e melhora a sidebar do editor.

### O que "pronto" significa para esta fase

- Mestre consegue arrastar as bordas da imagem de fundo no canvas para redimensioná-la
- Mestre consegue arrastar as bordas da malha no canvas para redimensioná-la (altera `cellSize`)
- Shift + arrastar borda superior/inferior da malha aplica distorção isométrica (`skewRatio`)
- Handles de rotação no canvas funcionam para imagem e malha (rotação a partir do centro)
- Drag da imagem dentro dela mesma move a imagem; drag fora dela move o viewport
- Fonte Roboto aplicada corretamente em todo o editor
- Sidebar com largura adequada (sem scroll horizontal)
- Botão "Encaixar no grid" calcula cols/rows ideais a partir das dimensões da imagem
- Aba "Fundo" aparece antes da aba "Grade" na toolbar

---

## 2. Princípio de design: seguir VTTs de referência

> **Regra (mantida das fases anteriores):** toda decisão de UX deve primeiro verificar como
> FoundryVTT e VTTs de qualidade resolvem o mesmo problema.

Aplicações nesta fase:

- **Handles no canvas (Approach A — Pixi puro):** FoundryVTT implementa todos os handles
  interativos como objetos PixiJS no overlay layer — nunca como DOM overlays. Esta decisão
  é arquitetural: à medida que o mapa ganhar distorção isométrica, rotação, múltiplos andares
  e iluminação, os handles DOM precisariam computar inversas de transforms complexas. Handles
  Pixi vivem no mesmo espaço de coordenadas que os objetos que controlam. Esta fase estabelece
  o padrão correto que escala até FoundryVTT quality.
- **Drag do canvas fora da imagem:** comportamento correto e esperado pelo usuário é que
  arrastar fora da imagem (aba Fundo) mova o viewport, igual às outras abas.
- **Feedback visual de Shift:** cursor e cor dos handles mudam ao segurar Shift para comunicar
  o modo especial — sem isso o usuário pode pensar que é um bug.

---

## 3. Fora de escopo desta fase

- Qualquer interação durante a partida (WS sync, MasterAction de mapa) — próxima sprint
- Múltiplos andares (floors)
- Paredes, decorações, itens
- Distorção isométrica horizontal (apenas vertical — `skewRatio` em Y)
- Drag do handle de rotação em mobile (touch events — polish futuro)

---

## 4. Fixes obrigatórios

### 4.1 Bug crítico: drag do background não funciona (regressão)

**Causa raiz identificada:** o commit `5fb05f3` adicionou `hitArea = Rectangle(0, 0, gridW, gridH)`
ao container `PiecesLayer` com `eventMode="static"`. O container fica acima do `BgLayer` no
z-order da cena Pixi. No sistema de federated events do PixiJS v8, o hit-test percorre de
frente para trás — então `PiecesLayer` intercepta **todos** os `pointerdown` no grid, mesmo
quando `piecesInteractive=false`. A sprite do bg nunca recebe os eventos.

**Fix — dois pontos de mudança em `TacticalMapStage.tsx`:**

1. `PiecesLayer` container:
   ```tsx
   // Antes (sempre static):
   eventMode="static"
   hitArea={gridHitArea}

   // Depois (condicional):
   eventMode={piecesInteractive ? "static" : "none"}
   hitArea={piecesInteractive ? gridHitArea : undefined}
   ```

2. Cada `PieceSprite` (necessário porque filhos de `eventMode="none"` ainda participam
   do hit-test se eles próprios forem `"static"`):
   ```tsx
   // Adicionar prop piecesInteractive ao PieceSpriteProps e usar:
   eventMode={piecesInteractive ? "static" : "none"}
   cursor={piecesInteractive ? "pointer" : "default"}
   ```

**Preservação das features do commit 5fb05f3:**
- `hitArea` só é aplicado quando `piecesInteractive=true` → empty-slot clicks continuam
  funcionando na aba "Peças" e no `TacticalMapPlacer`
- `pieceDragActiveRef.current = true` em `onEmptySlotClick` → sem mudança
- O `TacticalMapPlacer` passa `piecesInteractive` explicitamente como `true` → não afetado

**Preservação dos avatares (commit cc62aad):**
- O fix de avatar foi: `npcMap` não chegava ao `TacticalMapViewer`, e `useResizeObserver`
  falhava por early-return. Este fix não toca `npcMap`, carregamento de texture, nem
  `TacticalMapViewer`. Apenas `eventMode` e `cursor` mudam nos containers.

### 4.2 Bug: drag do background — sistema de coordenadas errado

Além do problema de interceptação, o drag existente usa `e.global.x/y` (screen space) mas
`bg.x/y` estão em world space. Quando o viewport está com zoom ≠ 1 o delta fica errado.

**Fix — migrar handlers de drag do bg para window events em `ViewportInner`:**

Padrão atual (problemático): `onPointerMove` no sprite → só dispara quando pointer está
sobre o sprite.

Padrão correto (FoundryVTT/Pixi standard):
```
1. BgLayer.onPointerDown → seta bgDragState ref (world coords via vp.toWorld())
2. window.pointermove em ViewportInner → aplica delta se bgDragState !== null
3. window.pointerup → limpa bgDragState
```

```tsx
// bgDragState ref em ViewportInner (junto de dragState existente):
type BgDragState = {
  startWorldX: number; startWorldY: number;
  startBgX: number;    startBgY: number;
} | null;
const bgDragState = useRef<BgDragState>(null);

// BgLayer passa onPointerDown callback que recebe coords world:
// (vpRef precisa ser passado para BgLayer ou callback encapsula conversão)

// Em onWindowMove (já existe para pan):
const onWindowMove = (e: PointerEvent) => {
  if (bgDragState.current) {
    const canvas = app?.renderer ? app.canvas : null;
    const vp = vpRef.current;
    if (!canvas || !vp) return;
    const rect = canvas.getBoundingClientRect();
    const world = vp.toWorld(e.clientX - rect.left, e.clientY - rect.top);
    onBgPositionChange?.(
      bgDragState.current.startBgX + (world.x - bgDragState.current.startWorldX),
      bgDragState.current.startBgY + (world.y - bgDragState.current.startWorldY),
    );
    return;
  }
  if (!isPanningRef.current) return;
  // ... pan existente
};
```

### 4.3 Fix: pan fora da imagem na aba "Fundo"

Quando `bgInteractive=true` e o usuário clica **fora** da imagem (bgDragState não foi setado
pela sprite), o viewport deve panner normalmente.

**Fix no `onWindowDown` em `ViewportInner`:**
```tsx
// Antes: return quando bgInteractive=true (bloqueia todo o pan)
if (!canvas || placingNpcId || bgInteractive || e.button !== 0) return;

// Depois: só bloqueia se o bg foi clicado (bgDragState já foi setado pela sprite Pixi)
if (!canvas || placingNpcId || e.button !== 0) return;
if (bgInteractive && bgDragState.current) return; // bg drag em andamento
// ... rest of pan logic (executa quando bgInteractive mas clique foi fora da imagem)
```

**Timing garantido:** a sprite Pixi processa seu `onPointerDown` no mesmo tick do evento DOM,
antes do `window.pointerdown` bubble. Portanto `bgDragState.current` já está setado quando
o window handler verifica.

### 4.4 Fix: pivot de rotação — bg e grid

**Bg:** a sprite usa anchor `(0, 0)` por padrão → roda pelo canto superior esquerdo.

Fix em `BgLayer`:
```tsx
// Antes:
<pixiSprite
  x={bg.x}
  y={bg.y}
  width={bg.width}
  height={bg.height}
  rotation={(bg.rotation * Math.PI) / 180}
/>

// Depois:
<pixiSprite
  anchor={0.5}                        // âncora no centro
  x={bg.x + bg.width / 2}            // posição = canto-sup-esq + metade
  y={bg.y + bg.height / 2}
  width={bg.width}
  height={bg.height}
  rotation={(bg.rotation * Math.PI) / 180}
/>
```

`bg.x/y` continua sendo o canto superior esquerdo na store/tipo. A conversão é feita
na renderização, não nos dados.

**Grid:** `GridLayer` não tem Container com transform. Fix: envolver em pixiContainer
com pivot no centro e aplicar rotation e skewRatio:

```tsx
function GridLayer({ grid, vpScale }: { grid: GridShape; vpScale: number }) {
  const gridCenterX = (grid.cols * grid.cellSize) / 2;
  const gridCenterY = (grid.rows * grid.cellSize) / 2;
  // draw callback não muda
  return (
    <pixiContainer
      pivot={{ x: gridCenterX, y: gridCenterY }}
      position={{ x: gridCenterX, y: gridCenterY }}
      rotation={(grid.rotation * Math.PI) / 180}
      scale={{ x: 1, y: grid.skewRatio }}
    >
      <pixiGraphics draw={draw} />
    </pixiContainer>
  );
}
```

`skewRatio = 1` (default) → `scale.y = 1` → nenhuma mudança visual para mapas existentes.

### 4.5 Fix: fonte Roboto não aplicada no editor

`MapEditorTemplate.PageBody` não define `font-family`. Elementos que não setam
explicitamente herdam o default do browser (geralmente Times New Roman / serif).

Fix em `MapEditorTemplate.tsx`:
```tsx
const PageBody = styled.main`
  font-family: ${fonts.sans};  // ← adicionar
  color: ${colors.textPrimary};
  // ... resto
`;
```

### 4.6 Fix: largura da sidebar

`MapEditorTemplate.Sidebar` tem `width: 280px`. Elementos internos (especialmente os
botões da toolbar de ferramentas e campos do `GridConfigPanel`) têm dimensões que
causam scroll horizontal.

Fix: `width: 280px` → `width: 320px`.

---

## 5. Nova feature: Tab order e "Encaixar" melhorado

### 5.1 Tab order — "Fundo" antes de "Grade"

Em `MapEditorToolbar.tsx`, o array `TABS` atual é:
```ts
[{ tool: "grid", label: "Grade" }, { tool: "bg", label: "Fundo" }, ...]
```

Novo order:
```ts
[{ tool: "bg", label: "Fundo" }, { tool: "grid", label: "Grade" }, ...]
```

**Rationale:** o fluxo natural é: upload da imagem → ajuste da malha sobre ela. Colocar
"Fundo" primeiro reflete esse workflow.

### 5.2 Botão "Encaixar no grid" — lógica melhorada

**Comportamento atual** (`computeCoverFit` + `deriveGridFromImage`):
- `deriveGridFromImage`: `cellSize = naturalWidth / cols`, `rows = floor(naturalHeight / cellSize)` — deriva cellSize da imagem mantendo cols fixo
- `computeCoverFit`: escala imagem para cobrir o grid

**Novo comportamento do botão "Encaixar no grid"** (disponível no `BgImagePanel` quando há imagem):

Calcular o número "correto" de cols e rows baseado nos pixels da imagem e no cellSize atual:

```ts
// Square grid:
const fitCols = Math.round(naturalWidth / grid.cellSize);
const fitRows = Math.round(naturalHeight / grid.cellSize);

// Hex grid (flat-top: hexW = cellSize * sqrt(3), hexH = cellSize * 1.5):
// Ou point-top (o que o projeto usa baseado no GridLayer):
// hexW = cellSize * sqrt(3), hexH = cellSize * 2 (aproximado)
const fitColsHex = Math.round(naturalWidth / (grid.cellSize * Math.sqrt(3)));
const fitRowsHex = Math.round(naturalHeight / (grid.cellSize * 1.5));

const newGrid = { ...grid, cols: fitCols, rows: fitRows };
const newBg = computeCoverFit(naturalWidth, naturalHeight, newGrid);
onApplyBg?.(newBg, newGrid);
```

**Clamp de segurança:** `fitCols` e `fitRows` mínimo de 1, máximo de 200 (limites existentes).

**Auto-fit ao adicionar imagem** (comportamento atual via `applyImage`):
O código atual já chama `deriveGridFromImage` ao adicionar — isso muda `cellSize` para
alinhar com a imagem. Com esta fase, o auto-fit na adição de imagem passa a usar a nova
lógica (ajusta `cols`/`rows` mantendo `cellSize` aproximado). Isso é mais natural porque
o mestre geralmente configurou o cellSize desejado antes de subir a imagem.

**Nota:** o botão "Encaixar no grid" existente faz a mesma coisa que o auto-fit —
ambos chamam a mesma função. A melhoria é na função em si.

---

## 6. Nova feature: Canvas handles (Approach A — Pixi overlay)

### 6.1 Arquitetura

Um novo componente `MapHandlesLayer` renderizado dentro do `pixiViewport`, **no overlay-layer**
existente da cena:

```
pixiViewport
└─ worldContainer
   ├─ BgLayer
   ├─ GridLayer       ← agora com Container de transforms (rotation + skewRatio)
   ├─ decorations-layer
   ├─ PiecesLayer
   ├─ walls-layer
   └─ overlay-layer
      └─ MapHandlesLayer   ← NOVO
         ├─ BgHandles      visível quando activeTool="bg" && bg !== null
         └─ GridHandles    visível quando activeTool="grid"
```

`MapHandlesLayer` recebe via props:
```ts
type MapHandlesLayerProps = {
  activeTool: ToolKind;
  bg: BgImage;
  grid: GridShape;
  vpScale: number;  // para manter handles com tamanho fixo na tela
  onBgChange: (bg: BgImage) => void;
  onGridChange: (grid: GridShape) => void;
  vpRef: React.MutableRefObject<Viewport | null>;  // para vp.toWorld()
};
```

**Por que Pixi e não DOM overlay:**
Handles DOM precisariam computar a inversa de todos os transforms Pixi (zoom, pan, e futuramente
rotação, skew, isométrico) para se posicionar corretamente. À medida que o mapa evolui para
FoundryVTT quality (multi-floor, iluminação, etc.), essa complexidade se torna inviável.
Handles Pixi vivem no mesmo espaço de coordenadas, são naturalmente corretos sob qualquer
transform, e seguem o padrão da indústria (FoundryVTT, Owlbear Rodeo).

### 6.2 Padrão de drag dos handles (canônico para Pixi)

Todos os handles usam o mesmo padrão:
```
1. handle.onPointerDown(e) → salva dragHandleState (world coords via vp.toWorld()),
                              chama app.stage.addEventListener("pointermove", onMove)
                              chama app.stage.addEventListener("pointerup", onUp)
                              e.stopPropagation() — evita iniciar pan do viewport

2. onMove(e) → world = vp.toWorld(e.global); calcula nova propriedade; chama callback

3. onUp() → limpa dragHandleState; remove stage listeners
```

O drag é sempre resolvido no espaço world (via `vp.toWorld`), nunca em screen space.

### 6.3 BgHandles — imagem de fundo (aba "Fundo")

**Visual:**
```
[TL]─────[TC]─────[TR]─── ⟳
 │                    │
[ML]                [MR]
 │                    │
[BL]─────[BC]─────[BR]
```

- **Dashed border:** `Graphics` com `setStrokeStyle({ dash: [6, 4], color: 0xffffff, alpha: 0.7 })`
  delimitando o bounding box da imagem (`bg.x, bg.y, bg.width, bg.height`)
- **8 handles de resize:** quadrados 8×8 px na tela (tamanho ajustado por `1/vpScale`)
  preenchidos com `0xffffff`, border `0x333333`
- **1 handle de rotação:** círculo de 10px de raio na tela, cor `0xffd700` (dourado),
  posicionado 24px/vpScale acima do centro do lado superior; conectado à borda por linha
  tracejada fina

**Comportamento dos handles de resize:**

| Handle | Direção livre | Shift |
|---|---|---|
| TC, BC (cima/baixo) | resize mantendo aspect ratio | resize livre (sem lock) |
| ML, MR (lados) | resize mantendo aspect ratio | resize livre |
| TL, TR, BL, BR (cantos) | resize mantendo aspect ratio | resize livre |

**Mantendo aspect ratio (sem Shift):**
Ao redimensionar, manter `newWidth / newHeight = originalWidth / originalHeight`.
O aspect ratio "original" é capturado no momento do `pointerdown`.

**Resize livre (Shift):**
Width e height são alterados independentemente — equivalente ao botão 🔓 já existente na toolbar.

**Math do resize para cada handle (sem Shift, aspect ratio locked):**

O bounding box tem âncora oposta ao handle arrastado (ex: arrastar TR → âncora em BL).
```
// Exemplo para handle TR:
const anchorX = bg.x;                 // left (oposto)
const anchorY = bg.y + bg.height;     // bottom (oposto)
const newW = Math.max(16, worldX - anchorX);
const newH = newW / aspectRatio;
newBg = { ...bg, x: anchorX, y: anchorY - newH, width: newW, height: newH };
```

**Handle de rotação:**
```
const cx = bg.x + bg.width / 2;   // center do bg
const cy = bg.y + bg.height / 2;
const angle = Math.atan2(worldY - cy, worldX - cx) * (180 / Math.PI) + 90;
newBg = { ...bg, rotation: angle };
```
Rotação sempre a partir do centro (`bg.x + bg.width/2`, `bg.y + bg.height/2`).

### 6.4 GridHandles — malha (aba "Grade")

**Visual:**
```
[TL]─────────────[TR]─── ⟳
 │                    │
 │   (grid interior)  │
 │                    │
[BL]─────────────[BR]
      [BC]              ← skew handle, aparece só com Shift
```

- **Dashed border:** ao redor do bounding box do grid (cols × cellSize, rows × cellSize)
- **4 handles de canto:** quadrados 8×8 px
- **2 handles de borda superior/inferior:** TC e BC, círculos 8px (distintos dos cantos
  para comunicar que têm comportamento diferente com Shift)
- **1 handle de rotação:** mesmo padrão do bg, dourado, 24px acima do centro superior
- **Nenhum handle nas bordas laterais (ML, MR):** a distorção isométrica é apenas vertical.
  Não colocar handles nas bordas laterais evita confusão.

**Comportamento dos handles — sem Shift:**

Qualquer drag (canto ou borda superior/inferior) altera **`cellSize`**:

```
// Canto BR (exemplo):
const totalNewW = Math.max(cellSizeMin * grid.cols, worldX); // distância do canto superior-esq
const newCellSize = Math.max(8, totalNewW / grid.cols);
newGrid = { ...grid, cellSize: newCellSize };

// Borda BC:
const totalNewH = Math.max(cellSizeMin * grid.rows, worldY);
const newCellSize = Math.max(8, totalNewH / grid.rows);
newGrid = { ...grid, cellSize: newCellSize };
```

Células ficam maiores ou menores; número de linhas/colunas não muda.

**Comportamento dos handles TC/BC — com Shift (distorção isométrica):**

Shift + arrastar TC ou BC altera **`skewRatio`**:

```
// Drag vertical: quanto mais arrasto para cima, mais comprime Y (mais isométrico)
// skewRatio = 1.0 (top-down) → 0.3 (muito isométrico)
const baseH = grid.rows * grid.cellSize;   // altura do grid sem skew
const newH = Math.max(baseH * 0.3, worldY - gridOriginY); // gridOriginY = 0
const newSkewRatio = Math.max(0.3, Math.min(1.0, newH / baseH));
newGrid = { ...grid, skewRatio: newSkewRatio };
```

**Shift + arrastar cantos (TL, TR, BL, BR):** comportamento normal (muda `cellSize`).
Cantos não têm comportamento especial com Shift.

**Shift + arrastar bordas laterais (ML, MR):** não há handles laterais → não se aplica.

**Handle de rotação:**
```
const cx = (grid.cols * grid.cellSize) / 2;
const cy = (grid.rows * grid.cellSize) / 2;
const angle = Math.atan2(worldY - cy, worldX - cx) * (180 / Math.PI) + 90;
newGrid = { ...grid, rotation: angle };
```

### 6.5 Feedback visual ao segurar Shift (apenas GridHandles)

Quando `shiftPressed` é true (detectado via `keydown`/`keyup` no `MapHandlesLayer`):

- **TC e BC** (bordas superior e inferior): cor muda de `0xffffff` → `0xffaa00` (âmbar)
  e ficam levemente maiores (10×10 px ao invés de 8×8 — escala 1.25×)
- **TL, TR, BL, BR** (cantos): permanecem na cor normal (`0xffffff`)
- **ML, MR:** não existem → sem mudança
- **Cursor sobre TC/BC com Shift:** `ns-resize` + indicador textual "Modo isométrico"
  (tooltip via DOM ou Pixi Text, 12px, aparece perto do handle)
- **Dashed border do grid** com Shift: cor muda para `0xffaa00` (âmbar) para reforçar
  o modo especial

Essa distinção visual comunica claramente: "Shift ativa distorção isométrica APENAS
nas bordas superiores e inferiores". Não há feedback visual especial nos cantos ao
segurar Shift porque o comportamento é o mesmo (muda cellSize).

---

## 7. GridConfigPanel — novos controles na toolbar

Adicionar ao `GridConfigPanel`:

### 7.1 Campo Rotação

```tsx
<Field>
  <FieldLabel htmlFor="grid-rotation">
    Rotação ({grid.rotation}°)
  </FieldLabel>
  <NumInput
    id="grid-rotation"
    type="number"
    min={-180}
    max={180}
    step={1}
    value={inputValue("rotation")}
    onChange={handleInt("rotation", -180, 180)}
  />
</Field>
```

### 7.2 Slider de Perspectiva (skewRatio)

```tsx
<Field>
  <FieldLabel htmlFor="grid-skew">
    Perspectiva (
      {grid.skewRatio === 1
        ? "Top-down"
        : grid.skewRatio <= 0.5
          ? "Isométrico"
          : "Semi-isométrico"}
    )
  </FieldLabel>
  <OpacityRange
    id="grid-skew"
    type="range"
    min={0.3}
    max={1.0}
    step={0.05}
    value={grid.skewRatio}
    onChange={(e) => update({ skewRatio: parseFloat(e.target.value) })}
  />
  <SkewLabels>
    <span>Isométrico</span>
    <span>Top-down</span>
  </SkewLabels>
</Field>
```

Os labels "Isométrico" ↔ "Top-down" embaixo do slider comunicam a direção do controle.

---

## 8. Arquivos — mapa completo

### 8.1 Modificados

| Arquivo | O que muda |
|---|---|
| `src/components/organisms/TacticalMapStage.tsx` | Fix PiecesLayer eventMode; fix BgLayer drag (window events + world coords); fix BgLayer anchor; GridLayer em Container com transforms; adicionar MapHandlesLayer; passar props necessárias |
| `src/components/molecules/GridConfigPanel.tsx` | Adicionar campos rotation e skewRatio |
| `src/components/molecules/BgImagePanel.tsx` | Melhorar lógica do "Encaixar" (fitCols/fitRows); fix auto-fit ao adicionar imagem |
| `src/components/organisms/MapEditorToolbar.tsx` | Reordenar TABS: "Fundo" antes de "Grade" |
| `src/components/templates/MapEditorTemplate.tsx` | font-family em PageBody; sidebar width 280→320px |
| `src/features/tactical-map/utils/bgFit.ts` | Adicionar `fitGridToImage(naturalW, naturalH, grid): GridShape` (lógica do novo "Encaixar") |
| `src/features/tactical-map/TacticalMapEditor.tsx` | Passar `activeTool` para `TacticalMapStage` se necessário para handles |

### 8.2 Criados

| Arquivo | O que é |
|---|---|
| `src/components/organisms/MapHandlesLayer.tsx` | Componente Pixi com BgHandles e GridHandles |

### 8.3 NÃO modificados nesta fase

- `src/types/tacticalMap.ts` — `skewRatio` e `rotation` já existem no `GridShape` desde Fase 0 ✅
- `src/features/tactical-map/store/editorStore.ts` — `setGrid` já aceita qualquer GridShape ✅
- `src/features/tactical-map/utils/coords.ts` — `slotToWorld`/`worldToSlot` já aceitam `skewRatio`/`rotation` (aplicados desde Fase 0) ✅
- Backend — nenhuma mudança necessária
- `src/features/tactical-map/TacticalMapViewer.tsx` — viewer é read-only, sem handles
- `src/features/tactical-map/TacticalMapPlacer.tsx` — placer usa piecesInteractive=true sempre

---

## 9. Testes

### 9.1 Unitários — utils

| Teste | Arquivo | O que verifica |
|---|---|---|
| `fitGridToImage square` | `bgFit.test.ts` | cols/rows corretos para imagem 1200×800 com cellSize=60 |
| `fitGridToImage hex` | `bgFit.test.ts` | cols/rows corretos para hex com cellSize=40 |
| `fitGridToImage clamp` | `bgFit.test.ts` | resultado clampado a [1, 200] |
| `computeCoverFit` | `bgFit.test.ts` | testes existentes mantidos |

### 9.2 Unitários — store

Testes existentes em `editorStore.test.ts` cobrem `setGrid` — sem mudanças necessárias.

### 9.3 Integration — componentes

| Teste | Arquivo | O que verifica |
|---|---|---|
| `GridConfigPanel` — rotation input | `GridConfigPanel.test.tsx` | valor inválido não aplica; range -180/180 |
| `GridConfigPanel` — skewRatio slider | `GridConfigPanel.test.tsx` | valor 1.0 → 0.5 chama onChange com skewRatio correto |
| `BgImagePanel` — encaixar calcula cols/rows | `BgImagePanel.test.tsx` | com naturalSize 1200×800 e cellSize=60 → cols=20, rows=13 |
| `BgImagePanel` — auto-fit ao adicionar | `BgImagePanel.test.tsx` | onApplyBg chamado com grid cols/rows calculados |
| `MapEditorToolbar` — tab order | `MapEditorToolbar.test.tsx` | primeira aba = "Fundo" |
| `TacticalMapStage` — PiecesLayer eventMode | `TacticalMapStage` mock tests | eventMode="none" quando piecesInteractive=false |

### 9.4 Visual/manual (rota /dev/tactical-map-demo)

- Handles aparecem ao selecionar aba "Fundo" (com imagem carregada)
- Handles aparecem ao selecionar aba "Grade"
- Resize da imagem mantém proporção; com Shift perde proporção
- Resize do grid muda cellSize; com Shift nas bordas sup/inf aplica skew
- Rotação funciona a partir do centro (não do canto sup-esq)
- Drag dentro da imagem move a imagem; drag fora move o viewport
- Fonte Roboto visível em toda a sidebar
- Sem scroll horizontal na sidebar
- Botão "Encaixar no grid" ajusta cols/rows da malha para cobrir a imagem

---

## 10. Critério de pronto

1. **Drag do bg:** arrastar dentro da imagem (aba Fundo) move a imagem corretamente em qualquer nível de zoom; arrastar fora move o viewport
2. **Handles de bg:** os 8 handles de resize + handle de rotação aparecem ao entrar na aba "Fundo"; resize sem Shift mantém proporção; com Shift resize livre; rotação é centrada
3. **Handles de grid:** os 4 cantos + 2 bordas sup/inf + handle de rotação aparecem na aba "Grade"; drag muda cellSize; Shift+drag TC/BC muda skewRatio; rotação centrada; sem handles laterais
4. **Feedback Shift:** TC/BC ficam âmbar ao segurar Shift; cantos e bordas sem handles laterais permanecem normais
5. **Rotação a partir do centro:** bg e grid rotacionam em torno do próprio centro
6. **Font Roboto:** toda a sidebar do editor exibe fonte Roboto
7. **Sidebar:** sem scroll horizontal; largura 320px
8. **Tab order:** aba "Fundo" é a primeira
9. **"Encaixar no grid":** calcula cols/rows a partir das dimensões da imagem e cellSize atual; funciona para square e hex
10. **Auto-fit ao adicionar imagem:** grid ajusta cols/rows automaticamente ao subir imagem
11. **Avatares das peças:** funcionam normalmente (sem regressão)
12. **Empty-slot clicks (aba Peças):** funcionam normalmente (sem regressão do hitArea fix)
13. **Lobby (TacticalMapPlacer):** funciona normalmente (piecesInteractive=true não afetado)

---

## 11. Limitações conhecidas e TODOs

| Limitação | Nota no código | Resolve quando |
|---|---|---|
| Handles em mobile/touch para rotação | TODO: touch events para rotate handle | Polish futuro |
| Skew horizontal (distorção em X) | Fora de escopo — apenas vertical | Fase futura se necessário |
| `MapHandlesLayer` não tem testes de interação Pixi | Validação visual obrigatória | Vitest não tem WebGL |
| Grid não tem posição X/Y (sempre começa em 0,0) | Por design — bg é que se move | Fase futura se necessário |
| Distorção isométrica não afeta a imagem de fundo | bg e grid são independentes | Intencional — mestre alinha manualmente |

---

## 12. Decisões deste brainstorm

- **Approach A (Pixi handles) sobre DOM overlay:** handles DOM exigem inverter transforms
  complexas que crescerão com multi-floor, iluminação e rotação. Pixi handles vivem no
  espaço correto. FoundryVTT usa exatamente esse padrão.
- **`cellSize` uniforme:** células são quadradas por design. Edge handles mudando cellSize
  é o comportamento mais previsível; o usuário ajusta cols/rows pelo novo "Encaixar".
- **Shift apenas em TC/BC para skew:** distorção isométrica é compressão vertical (scale.y).
  Bordas laterais com Shift seriam confusas pois skew horizontal não está no roadmap.
- **Sem handles laterais (ML/MR) no grid:** evita confundir usuário sobre comportamento
  com Shift. Ausência de handle = ausência de comportamento = sem bug aparente.
- **`bg.x/y` como canto superior esquerdo na store:** convenção mantida. A conversão
  anchor↔position é feita na renderização (Pixi), não nos dados.
- **auto-fit ao adicionar imagem calcula cols/rows (não cellSize):** mais natural quando
  mestre já configurou o cellSize desejado. `deriveGridFromImage` atual é inverso (calcula
  cellSize) — nova `fitGridToImage` mantém cellSize e ajusta contagem de células.
- **Aba "Fundo" antes de "Grade":** reflete fluxo natural de criação de mapa.
