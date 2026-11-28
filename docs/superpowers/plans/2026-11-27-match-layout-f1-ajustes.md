# Mesa F1 — ajustes da revisão do dono (2026-11-27) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar no PR #118 os ajustes que o dono pediu ao revisar a F1: a cor Marrom 950 e a lista de personagens de 280 px, as larguras da mesa fixas nas medidas do computador, a ficha no lugar da coluna abaixo de 1280 px e o mapa que nunca se desloca quando uma coluna abre ou fecha.

**Architecture:** Mesma divisão da F1: `MatchStageTemplate` decide ONDE (CSS, media queries), `useMatchLayout` e as páginas decidem O QUE. A regra "o mapa não se mexe" mora no `ViewportInner` (Pixi): mudança só de largura do canvas não reenquadra; compensa o deslocamento da borda esquerda.

**Tech Stack:** React 19 + TS strict, styled-components, Vitest + Testing Library (jsdom: `matchMedia` falso = celular em pé), pixi-viewport.

**Spec:** a F1 parte de `docs/superpowers/specs/2026-11-25-match-front-status-effects-po.md` §4 e do plano `docs/superpowers/plans/2026-11-26-match-layout-f1.md`; este plano registra as decisões do dono de 2026-11-27, que valem sobre os dois.

## Global Constraints

- Código em inglês (identificadores, títulos de `describe`/`it`); UI, comentários e docs em português.
- Cor só em `src/styles/tokens.ts`. A paleta ganha **uma** cor, autorizada pelo dono: `brown950: "#1f180f"` (mesmo matiz ~32° e saturação ~36% da família; luz 9%, o passo seguinte da escada 16% → 13% → 9%). Componentes usam só tokens semânticos.
- Tokens semânticos novos (todos apontam para `palette.brown950`), cada um com comentário do papel:
  - `surfaceSidebarGutter` — as laterais de 8 px das listas de personagens;
  - `surfaceTabStrip` — a faixa das abas Histórico/Personagens da coluna da mesa;
  - `surfaceRecessed` — fundo rebaixado do painel da mesa: a fila do mestre.
- Larguras (px CSS), fora do celular em pé (< 768 px de largura e não deitado):
  - lista de personagens (`CharactersSidebar`, não fluida): **280** (era 300); padding **20 px em cima e embaixo, 8 px nas laterais**; as laterais de 8 px pintadas com `surfaceSidebarGutter`. Vale para a versão fluida (mesa) também: padding e laterais iguais.
  - coluna da esquerda do mestre (painel e fila): **320** em todo tamanho (tablet e celular deitado também). Widescreen (≥ 1600): fila 240 + seção 320, como hoje.
  - coluna da esquerda do jogador (Ação): **340** em todo tamanho em que é coluna (tablet deitado, computador, celular deitado). Aba Ficha do jogador: 420 a partir de 1280 px, como hoje; abaixo, 340.
  - Histórico (coluna da direita): **280**. Exceções, onde não cabe: **200** no celular deitado (mestre e jogador) e no tablet em pé do mestre (768–1023 px). No celular em pé continua gaveta por cima, com véu, mas `min(86%, 280px)` (era `min(86%, 360px)`).
  - ficha como caixa ao lado da coluna (a partir de 1280 px, fora do celular deitado): `clamp(340px, calc(100% - 300px), 420px)`, como hoje.
  - ficha abaixo de 1280 px e no celular deitado (mestre): **toma o lugar da coluna da esquerda** (painel + fila somem enquanto ela está aberta), 340 px, encaixada (sem sombra, sem canto arredondado).
- Coluna encaixada (Histórico, ficha no lugar da coluna) não tem sombra e não fecha ao tocar fora. Sombra + fechar ao tocar fora são só de quem abre por cima (gaveta do celular em pé, caixa da ficha a partir de 1280 px).
- **O mapa nunca se desloca** quando uma coluna abre, fecha ou muda de largura: as peças ficam no mesmo pixel da tela.
- Não mudar: celular em pé (fora a largura da gaveta), breakpoints, regras da ficha (dica, toque no mapa fecha), conteúdo de Agir/Ação/Fila/ficha.

## Review Focus

1. Mestre no celular deitado sem divisão (altura < 364 px, uma seção por vez): abrir a ficha some com a seção; tocar num item da navegação (Fila, Agir, Personagens, Partida) fecha a ficha e mostra a seção.
2. Mestre no tablet deitado (1024–1279) com a ficha aberta e o Histórico aberto: a ficha no lugar da coluna, o Histórico de 280 à direita, nada sobreposto.
3. Jogador no tablet em pé (768–1023): o painel de baixo continua passando por baixo do Histórico, agora de 280 px.
4. Arrastar uma peça para a lista de Personagens no Arrumar continua funcionando com a lista de 280 px (os refs `asideListRef`/`panelListRef` não mudam).
5. Primeira abertura da mesa: o enquadramento inicial continua centrado (a regra nova de redimensionar não pode impedir o primeiro enquadramento).

---

### Task 1: Marrom 950 e a lista de personagens de 280 px

**Files:**
- Modify: `src/styles/tokens.ts` (palette + 3 tokens semânticos)
- Modify: `src/components/organisms/CharactersSidebar.tsx`
- Modify: `src/components/templates/DetailPageTemplate.tsx` (a `EdgeDrawer` da coluna PERSONAGENS: `width={300}` → `280`)
- Modify: `src/features/match/combat/AsideTabs.tsx` (fundo da `TabList`: `colors.surfaceTabStrip`)
- Modify: `src/components/templates/MatchStageTemplate.styles.ts` (`QueueZone`: `background: ${colors.surfaceRecessed}` no lugar do gradiente com `shadowSoft`)
- Test: testes existentes que fixem 300 px / padding 20 da lista (ajustar) e um teste novo do estilo da lista.

**Interfaces:**
- Produces: `palette.brown950`, `colors.surfaceSidebarGutter`, `colors.surfaceTabStrip`, `colors.surfaceRecessed`.

- [ ] **Step 1: Write the failing test** — num teste de componente da lista (crie `src/components/organisms/__tests__/CharactersSidebar.test.tsx` se não existir), renderize `CharactersSidebar` com 1 item e verifique com `toHaveStyleRule` (jest-styled-components já é usado no repo? se não, use `getComputedStyle`) que o container tem `width: 280px`, `padding: 20px 8px` e um `box-shadow` com as duas laterais inset de 8 px em `surfaceSidebarGutter`; com `fluid`, `width: 100%` e o mesmo padding.
- [ ] **Step 2:** rodar o teste e ver falhar.
- [ ] **Step 3:** implementar. Laterais: `box-shadow: inset 8px 0 0 ${colors.surfaceSidebarGutter}, inset -8px 0 0 ${colors.surfaceSidebarGutter};` (não use `border`, que mudaria a largura útil, nem o `background-image`, que já é do realce de alvo de soltura). Atualizar o comentário da prop `fluid` ("300px" → "280px"). Tokens novos com comentário do papel em português.
- [ ] **Step 4:** `npx vitest run` dos testes tocados, `npx tsc -b`, `npm run lint`.
- [ ] **Step 5: Commit** `feat(styles): Marrom 950 and the 280 px character list`.

### Task 2: Larguras da mesa, ficha no lugar da coluna e Histórico encaixado

**Files:**
- Modify: `src/features/match/combat/useMatchLayout.ts` (+ teste)
- Modify: `src/components/templates/MatchStageTemplate.tsx` e `.styles.ts` (+ teste do template)
- Modify: `src/pages/GameMasterPage.tsx`, `src/pages/GamePlayerPage.tsx`
- Modify: `docs/dev/match/layout-da-mesa.md`

**Interfaces:**
- Consumes: Task 1 (tokens).
- Produces:
  - `MatchLayout.sheetReplacesColumn: boolean` = `!phonePortrait && (landscape || !asideUp)`, com `asideUp` = `(min-width: 1280px)` (`breakpoints.asideUp`).
  - Template: nova prop `columnWidth: number` (largura da coluna da esquerda fora do celular em pé), e constantes exportadas `MASTER_COLUMN_WIDTH = 320`, `PLAYER_COLUMN_WIDTH = 340`, `ASIDE_WIDTH = 280`, `ASIDE_NARROW_WIDTH = 200`, `SHEET_COLUMN_WIDTH = 340`. O mestre passa `MASTER_COLUMN_WIDTH`, o jogador `PLAYER_COLUMN_WIDTH`.

- [ ] **Step 1: Write the failing tests**
  - `useMatchLayout`: com `matchMedia` mockado, `sheetReplacesColumn` é `true` no celular deitado e entre 768 e 1279 px; `false` no celular em pé e a partir de 1280 px (fora do celular deitado).
  - Template (estilos via `toHaveStyleRule` com `media`, como os testes da F1 já fazem): `PanelZone` usa `columnWidth` em `tabletUp`/`railUp`/`landscapePhone` (master 320); `QueueZone` 320 em `tabletUp` e `landscapePhone`; `AsideZone` 280 em coluna, 200 em `landscapePhone` e, quando há `queue`, em `tabletUp` abaixo de `railUp`; gaveta `min(86%, 280px)`; `AsideZone` em coluna sem `box-shadow`.
  - Template: com `sheet` + `sheetOpen` abaixo de 1280 px / no celular deitado, a ficha ocupa a coluna da esquerda (`grid-column: 2`, `grid-row: 1 / -1`, 340 px, sem sombra) e `PanelZone`/`QueueZone` ficam `display: none`. A partir de 1280 px (fora do deitado) continua a caixa `sheetBox` de hoje.
  - `GameMasterPage`: com `sheetReplacesColumn` (mock de layout ou de `matchMedia`), escolher uma seção na navegação fecha a ficha.
- [ ] **Step 2:** rodar e ver falhar.
- [ ] **Step 3: Implement**
  - Remover as larguras 280 da coluna/fila no tablet e no deitado: `sideColumn(\`${columnWidth}px\`)`; a partir de `asideUp` mantém 320 (mestre com fila), 420 (`$wide`) ou 340.
  - Aba Ficha do jogador abaixo de 1280: 340 (= `columnWidth`), já que `$wide` só vale de `asideUp`.
  - Ficha no lugar da coluna: o template recebe `sheetOpen` (já recebe); em `@media (min-width: 768px) and (max-width: 1279px)` e em `landscapePhone`, quando `sheet && sheetOpen`, esconder `PanelZone` e `QueueZone` e pôr a `SheetZone` em `grid-column: 2; grid-row: 1 / -1;` com 340 px, `position: relative`, `inset: auto`, sem `border-radius`, sem `box-shadow`, `border-right: 1px solid ${colors.surfaceInput}`, `padding-bottom: 0`. Declarar depois das regras de tamanho (o celular deitado vale sobre os outros, por último). O véu da ficha (`SheetScrim`) continua: tocar no mapa fecha.
  - Histórico: larguras como nas Global Constraints; coluna encaixada sem sombra; gaveta do celular em pé `min(86%, 280px)`.
  - `GameMasterPage.handleRailSelect`: `if (layout.phonePortrait || layout.sheetReplacesColumn) setSheetOpen(false);` com o comentário atualizado (a ficha ocupa o lugar da seção).
  - Doc `layout-da-mesa.md`: atualizar a tabela de larguras, a regra da ficha abaixo de 1280, o Histórico de 280/200 e a regra "coluna encaixada = sem sombra, não fecha ao tocar fora".
- [ ] **Step 4:** suíte completa `npm run test`, `npx tsc -b`, `npm run lint` (0 avisos).
- [ ] **Step 5: Commit** `feat(match): fixed column widths, sheet in place of the column below 1280 px, 280 px Histórico`.

### Task 3: O mapa não se desloca quando uma coluna abre ou fecha

**Files:**
- Create: `src/features/tactical-map/stage/resizeAnchor.ts` (+ `__tests__/resizeAnchor.test.ts`)
- Modify: `src/features/tactical-map/stage/ViewportInner.tsx`
- Modify: `docs/dev/match/layout-da-mesa.md` (seção curta "O mapa não se mexe") e, se citar o reenquadramento ao redimensionar, `docs/dev/match/combate-fechamento-fase-6.md`

**Interfaces:**
- Produces: `resizeShift(prev: CanvasBox | null, next: CanvasBox): { dx: number; dy: number; refit: boolean }` com `interface CanvasBox { left: number; top: number; width: number; height: number }` (posição na tela, de `getBoundingClientRect`, e tamanho). Regras:
  - `prev === null` (primeira medida) → `{ dx: 0, dy: 0, refit: true }`.
  - mudou a **altura** → `refit: true` (o comportamento de hoje: painel de baixo do celular), `dx = dy = 0`.
  - mudou só a **largura** e/ou a posição → `refit: false`, `dx = prev.left - next.left`, `dy = prev.top - next.top` (somar a `vp.x`/`vp.y` mantém cada ponto do mundo no mesmo pixel da tela).

- [ ] **Step 1: Write the failing test** — `resizeShift`: primeira medida reenquadra; coluna da direita abrindo (largura −280, left igual) → `{dx: 0, dy: 0, refit: false}`; coluna da esquerda trocando 320 → 340 (left +20, largura −20) → `{dx: -20, dy: 0, refit: false}`; altura mudando → `refit: true`.
- [ ] **Step 2:** rodar e ver falhar.
- [ ] **Step 3: Implement** em `ViewportInner`: guardar a última `CanvasBox` num ref; no efeito que já faz `renderer.resize`/`vp.resize` (trocar para `useLayoutEffect`, para compensar antes de pintar), medir o container do canvas, chamar `resizeShift` e, se `!refit`, `vp.x += dx; vp.y += dy`. O efeito de enquadramento (`fitRequest`) passa a reenquadrar por mudança de tamanho **só** quando a última `resizeShift` pediu `refit` (pedido novo de `fitRequest` — montagem ou botão Enquadrar — continua enquadrando sempre). Comentário em português explicando a regra do dono (abrir/fechar coluna não mexe no mapa).
- [ ] **Step 4:** suíte completa, `tsc`, lint. (A camada Pixi não tem teste: a verificação no browser fica com o controlador.)
- [ ] **Step 5: Commit** `fix(map): opening or closing a side column no longer moves the map`.

---

## Depois do plano (decisões do dono no meio da execução)

- **Task 4 — tablet em pé empilhado:** em pé, todo aparelho até 1279 px usa o layout empilhado do celular (mapa em cima, ações em bottom sheet, navegação no rodapé), mestre e jogador. Colunas laterais só deitado e a partir de 1280 px (`SIDE_LAYOUT_QUERY = "(orientation: landscape), (min-width: 1280px)"`). No tablet em pé (≥ 600 px) o Histórico é coluna encaixada de 200 px ao lado do mapa; abaixo de 600 px, gaveta `min(86%, 280px)`. Isso substitui as regras de "tablet em pé com colunas" das Tasks 2 e acima. `phonePortrait` virou `stacked`.
- **Abas Histórico/Personagens em Marrom 850** (`surfaceTabStrip`); as laterais e a fila seguem em Marrom 950.
- **Revisão final:** mudar a largura da **janela** reenquadra como antes; só a coluna (janela igual) deixa o mapa parado. Limites superiores em `1279.98px`; um teste varre telas e amarra as queries do CSS às flags do `useMatchLayout`.
