# Plano — liberar rotação, perspectiva e predefinições da grade (mapa isométrico)

Pedido do dono do produto (2026-10-12): poder girar a grade quadrada e achatá-la para testar e
montar mapas isométricos; botões de predefinição (Isométrico, Top-down) e ajuste manual (ângulo
qualquer, achatamento qualquer) para alinhar a grade ao grid embutido em imagens de mapa.

Os controles existem e foram **ocultados** em 2026-06-09 (commit `24a1222`, "not exposed to users
yet"), comentados com `OCULTO POR ORA` em `GridConfigPanel.tsx` e `MapHandlesLayer.tsx`. O spec do
refactor (2026-08-06 §2.4) mandava mantê-los comentados "por decisão do dono do produto"; o dono
agora decide liberá-los. O servidor já não transforma nada (branch `fix/grid-coord-spaces`: tudo em
espaço LOCAL), então rotação/achatamento são só de desenho e de entrada de ponteiro no front.

Repo: `/home/azzurah/Documentos/HxH_RPG_Environment_Project/System_X_System_Project/System_X_System_React`,
branch `fix/grid-coord-spaces` (já em uso; trabalhe direto no checkout, sem worktree, sem trocar de
branch). Commits só com `git add` dos seus arquivos + `git commit`; nada de `stash`, `checkout`,
`reset`, `restore`, `push`.

## Global Constraints

- **O transform da grade** (`applyTransform` em `src/features/tactical-map/utils/coords.ts`): gira
  em torno do pivô `(cols·cellSize/2, rows·cellSize/2)`, DEPOIS achata o y por `skewRatio` em espaço
  de tela, DEPOIS soma `originX/originY`. Toda fórmula nova usa exatamente esse pivô e essa ordem.
- `skewRatio` vai de 0.3 a 1.0 na interface (1 = top-down). `rotation` em graus, aceita decimal.
- **Isométrico** = `rotation: 45, skewRatio: 0.5`. **Top-down** = `rotation: 0, skewRatio: 1`.
- Regras de jogo medem em LOCAL; WORLD é só desenho e ponteiro. Nada aqui muda o servidor.
- Comportamento de grade sem transform (rotação 0, achatamento 1) não muda em nada: os testes
  existentes continuam passando sem alteração, salvo onde a task diz o contrário.
- vitest; `verbatimModuleSyntax` (import só de tipo com `import type`); `noUnusedLocals`.
  Ponto flutuante em teste: tolerância `1e-6` para geometria de tela.
- Comentários e textos seguem o idioma do arquivo. Texto de interface em PT-BR.
- Ao fim de cada task: `npx tsc -b`, `npx vitest run src/features/tactical-map src/components/molecules`,
  `npm run lint` (2 erros antigos em sheet/Diagram são conhecidos; não adicione nenhum).

## Task 1: Painel da Grade — reativar Predefinições, Rotação e Perspectiva

Arquivo: `src/components/molecules/GridConfigPanel.tsx`.

- Descomentar e religar o bloco `OCULTO POR ORA` do JSX (Predefinições, Rotação, Perspectiva), os
  helpers `handleFloat`/`fmtDeg` e os styled `SkewRow`/`SkewInput`/`SkewLabels`. Remover os
  comentários `OCULTO POR ORA` (o recurso agora é liberado).
- Abaixo da Perspectiva, uma linha de ajuda curta (texto pequeno, token de cor existente):
  "No mapa: arraste a esfera dourada para girar; segure Shift e arraste a alça de cima ou de baixo
  para achatar."
- Testes em `src/components/molecules/__tests__/GridConfigPanel.test.tsx`: trocar o teste
  "não expõe Rotação nem Perspectiva" por testes que provam: clicar "Isométrico" chama `onChange`
  com `rotation: 45, skewRatio: 0.5` (e o resto da grade igual); "Top-down" chama com `0`/`1`;
  digitar `30.5` em Rotação chama com `rotation: 30.5`; o número da Perspectiva aceita `0.42`;
  valores fora da faixa (Rotação 200, Perspectiva 0.1) não chamam `onChange`.

## Task 2: Alças no mapa — esfera de rotação de volta, e rotação/perspectiva sem "pulo"

Arquivos: `src/features/tactical-map/MapHandlesLayer.tsx`, `src/features/tactical-map/utils/coords.ts`
(`gridFromHandleDrag`), testes em `src/features/tactical-map/utils/__tests__/coords.test.ts`.

**Reativar** a esfera de rotação da grade em `MapHandlesLayer` (descomentar `rr`/`ro`, `pts.rot`,
`drawRotate` e o JSX; tirar os comentários `OCULTO POR ORA`).

**Bug 1 — rotação pula numa grade achatada.** `gridFromHandleDrag("rotate")` usa
`atan2(worldY - cy, worldX - cx) + 90`. A esfera fica no raio centro→TC do desenho, mas com
`skewRatio ≠ 1` esse raio está achatado: ao pegar a esfera de uma grade 45°/0.5 a rotação salta de
45 para ≈63,4. Correção: medir o ângulo no espaço sem achatamento:
`atan2((worldY - cy) / startGrid.skewRatio, worldX - cx) * 180/π + 90` (com `cx, cy` como hoje:
pivô + origem). Com `skewRatio = 1` é idêntico ao atual.
Teste: grade `{ ...squareGrid(40), rotation: 45, skewRatio: 0.5, originX: 15, originY: -20 }`;
cursor no ponto WORLD do TC (`applyTransform(gridHandleLocal("TC", g), g)`) e também num ponto mais
longe no mesmo raio centro→TC → `rotation` ≈ 45 (1e-6). E o teste atual de rotação continua.

**Bug 2 — Shift + alça de cima/baixo (perspectiva) pula para 1 e anda na metade da velocidade.**
Hoje: `local = inverseTransform(cursor, startGrid)`, `newH = TC ? b.maxY - local.y : local.y - b.minY`,
`ratio = newH / gh`. No instante em que o arraste começa (cursor sobre a alça) `local.y = b.minY`,
então `ratio = 1` — a perspectiva salta para top-down. E como o achatamento é em torno do pivô (as
duas bordas se movem), a alça anda metade do que o cursor anda.
Correção: a alça deve ficar sob o cursor em y. Para a alça `H` (TC ou BC):
`(dx, dy) = gridHandleLocal(H, startGrid) − pivô`; `ry = dx·sin θ + dy·cos θ` (θ = rotação em radianos;
é o y da alça girada, antes do achatamento); `s = (worldY − originY − pivôY) / ry`, limitado a
[0.3, 1]. Se `|ry| < 1e-9`, devolver `null` (a alça está na horizontal do pivô; nada a fazer).
Testes:
- grade 45°/0.5 com origem `(15, -20)`: cursor exatamente sobre a alça TC → `skewRatio` ≈ 0.5 (sem pulo);
- grade top-down 10×10, cellSize 40 (pivô y = 200, `ry` da TC = −200): cursor em y=100 →
  `skewRatio` ≈ 0.5 e a alça TC do resultado fica em y ≈ 100 (segue o cursor); y=50 → ≈ 0.75 com a
  alça em y ≈ 50; y=−100 → limita em 1; y=190 → limita em 0.3;
- BC na grade 45°/0.5: cursor sobre a alça → 0.5.

A camada Pixi não tem teste (o `@pixi/react` é mockado); o controlador verifica no browser.

## Task 3: Salvar — o aviso de "colunas/linhas não cobertas" entende grade girada e hex

Hoje `TacticalMapEditor.handleSave` ("Truncation check") compara `cols·cellSize × rows·cellSize`
com o retângulo da imagem. Num mapa isométrico isso acusa linhas "não cobertas" que estão cobertas
e, se o mestre confirmar, **corta linhas da grade**. Exemplo: grade 10×10, cellSize 40, 45°/0.5,
imagem cobrindo exatamente a caixa do losango (x −82,84…482,84, y 58,58…341,42): a fórmula atual
diz 2 linhas descobertas e corta 1. No hex a unidade também está errada.

**Novo util puro** `src/features/tactical-map/utils/bgCoverage.ts`:
`export function uncoveredGridLines(grid: GridShape, bg: NonNullable<BgImage>): { left: number; right: number; top: number; bottom: number }`
- Uma coluna `c` (offset: quadrado `col = c`; hex `offsetToAxial(c, row)`) está **descoberta** se
  NENHUMA de suas células sobrepõe a imagem; idem uma linha `r`. Sobrepor = interseção de área
  positiva (encostar na borda não conta), por eixo separador (SAT) entre polígonos convexos.
- Célula em WORLD: `slotCorners(slot, grid)` (4 cantos no quadrado, 6 no hex; já aplica o transform).
- Imagem em WORLD: retângulo `bg.x, bg.y, bg.width, bg.height`, girado `bg.rotation` graus em torno
  do próprio centro (é assim que o `BgLayer` desenha: `anchor 0.5` + `rotation`).
- `right` = colunas descobertas contadas do fim (c = cols−1 para trás) até a primeira coberta;
  `left` = do começo; `bottom`/`top` idem para linhas. Se nenhuma célula é coberta, tudo 0.
- Testes (`__tests__/bgCoverage.test.ts`):
  - quadrado sem transform 10×10, cellSize 40 — mesmos números da fórmula antiga:
    bg `{x:0,y:0,w:330,h:400}` → right 1, resto 0; bg `{x:50,y:90,w:350,h:310}` → left 1, top 2, resto 0;
    bg `{x:0,y:0,w:320,h:320}` → right 2, bottom 2 (a coluna que só encosta conta como descoberta);
    bg cobrindo exatamente → tudo 0;
  - o isométrico do exemplo acima → tudo 0;
  - hex 6×6, cellSize 20, imagem de x = −17,32050807568877 a 138,56406460551017 (largura
    155,88457268119894), y = −20, altura 190 → right 1 (a coluna 5 fica toda além; a 4 é coberta nas
    linhas pares), resto 0;
  - imagem longe da grade → tudo 0;
  - imagem girada 90° (quadrado sem transform, bg `{x:0,y:0,w:400,h:200, rotation:90}` — em tela
    ocupa x 100…300, y −100…300): left 2, right 2, bottom 2, top 0. Confira os números contra a
    geometria antes de fixar; se discordar, ajuste o teste com a conta escrita no comentário.

**Ligação:** `handleSave` usa `uncoveredGridLines(normalized.grid, normalized.bg)`; mensagem e corte
iguais aos de hoje (`totalUncoveredCols = left + right`, corta só `right`; idem linhas com `bottom`).

## Task 4: "Encaixar Grade" com grade girada/achatada

`fitGridToImage` e `computeCoverFit` (`src/features/tactical-map/utils/bgFit.ts`) usam a caixa LOCAL
da grade e ignoram rotação/achatamento: num isométrico a imagem fica do tamanho da grade "em pé",
e o losango desenhado sai maior que ela.

- Trocar a caixa LOCAL pela caixa WORLD da grade **com origem zero**:
  `gridWorldBounds({ ...grid, originX: 0, originY: 0 })` (as extensões escalam linearmente com
  `cellSize`, então a conta de `ideal` e o laço de `MAX_CELL` continuam valendo). `fitGridAndCover`
  continua somando a origem por fora (não dobrar a origem).
- Sem transform, o resultado é idêntico ao de hoje: os testes existentes de `bgFit` passam sem mudar.
- Teste novo: quadrado 10×10, 45°/0.5, imagem 1000×500 → `cellSize` 71, a caixa WORLD do resultado
  (origem 0) cobre 1000×500 e a imagem de `computeCoverFit` coincide com essa caixa (1e-6);
  `rotation`/`skewRatio` preservados.

## Task 5: Docs

- `docs/dev/tactical-map/coordinates.md`, seção "`skewRatio` e `rotation`": o código de exemplo está
  na ordem antiga (achata e depois gira, sem pivô). Reescrever curto: gira em torno do centro da
  grade, depois achata em tela, depois origem (`applyTransform`); o servidor nunca transforma (tudo
  LOCAL); onde o mestre controla isso (painel Grade: Predefinições Isométrico/Top-down, Rotação,
  Perspectiva; no mapa: esfera dourada gira, Shift + alça de cima/baixo achata); "Encaixar Grade" e
  o aviso de colunas descobertas consideram a grade transformada.
- Remover o parágrafo "Quando a Fase 9 ligar a UI…" (ligou).
- Commit separado.

## Fora do escopo

- Peça elevada (z > 0) na borda de cima fora da hit area (follow-up registrado no PR #75).
- Teclas de seta do editor seguem só para grade quadrada (`TacticalMapEditor`, "hex = best-effort futuro").

## Verificação final (controlador)

- `npx tsc -b`, `npm run lint`, `npm run test`.
- Browser com uma mesa quadrada nova do `devseed` (`-suffix i`): no editor, Predefinição Isométrico,
  esfera e Shift+alça sem pulo, salvar e reabrir; na mesa (jogador), grade isométrica com fog
  alinhado às paredes, peça clicável, movimento bloqueado pela parede.
