# Mesa F1, 2ª rodada de ajustes do dono — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O layout da mesa decide larguras pelo espaço que sobra para o mapa (não só pela altura), o Histórico ganha a alternância 200/280/escondido onde é estreito, a fila ganha duas colunas e o lado do painel de baixo onde cabe, e quatro regressões são corrigidas (texto vazando a 200, folha com margem curta, barra de rolagem no canto da folha, peça sumindo no arraste do Arrumar).

**Architecture:** Continua a divisão do PR: `MatchStageTemplate` decide ONDE com media queries, `useMatchLayout`/`useStageOverlays` e as páginas decidem O QUE. As queries novas nascem em `src/styles/breakpoints.ts` como funções/constantes, e o CSS e o hook usam a MESMA string — o teste de varredura CSS×hook (`MatchStageTemplate.test.tsx` / `useMatchLayout.test.ts`, com `src/test/mockScreen.ts`) cobre as telas novas.

**Tech Stack:** React 19, TS strict, styled-components, Vitest + jsdom (`matchMedia` falso = celular em pé), Pixi (sem teste; verificação no browser).

**Spec:** a revisão do dono em 2026-11-28 (na conversa), por cima de `docs/superpowers/plans/2026-11-27-match-layout-f1-ajustes.md` e `docs/dev/match/layout-da-mesa.md`. As decisões abaixo foram fechadas com ele; o texto aqui é a fonte.

## Global Constraints

- Código em inglês (identificadores, títulos de teste); comentários, UI e mensagens em português.
- Cor só por token de `src/styles/tokens.ts`; nada de hex cru. `::-webkit-scrollbar` só em `src/styles/scrollbar.ts`.
- O mapa nunca se desloca ao abrir/fechar/alargar coluna. Coisa por cima do mapa (gaveta, Histórico ampliado) tem sombra e fecha ao tocar fora; coluna encaixada não tem sombra e não fecha ao tocar fora.
- Botão só de ícone vaza (ver `src/components/CLAUDE.md`, "Botões só de ícone vazam"): grande, transbordando para a borda vizinha, hover por `iconButtonFx`, nunca cobrindo outro controle.
- Valores exatos:
  - `MAP_MIN_WIDTH = 320` — o Histórico tem 280 quando, descontados os 280, sobram ≥ 320 px de mapa; senão 200.
  - `RAIL_WIDTH = 72` (a coluna da navegação; hoje literal `72px` no grid).
  - `QUEUE_COLUMN_WIDTH = 240` (a fila em coluna própria; hoje literal `240px`).
  - `LANDSCAPE_SPLIT_MIN_HEIGHT = 400` (era 364). O celular do dono em tela cheia/web app tem 427 px de altura (manifest `display: "fullscreen"`; no navegador, 303): 400 dá 27 px de margem.
  - Duas colunas no celular deitado baixo: largura ≥ `RAIL_WIDTH + QUEUE_COLUMN_WIDTH + MASTER_COLUMN_WIDTH + ASIDE_NARROW_WIDTH + MAP_MIN_WIDTH` = 1152.
  - Empilhado largo (`STACKED_WIDE_MIN_WIDTH = 900`): em pé, de 900 a 1279.98 px.
  - Folha da ficha no empilhado: 16 px das bordas laterais da tela (era 8).
  - Textos curtos a 200: "Escolha um NPC" (no lugar de "Escolha um NPC da campanha").
- O teto com fração continua `1279.98px` (`BELOW_ASIDE_UP_MAX`); tetos novos seguem a mesma regra (`N - 0.02`).

## Review Focus

1. Girar ou redimensionar com o Histórico ampliado (280 por cima): ao sair da tela estreita, ele vira coluna normal; nada fica preso em "ampliado" com véu invisível bloqueando o mapa.
2. Tocar fora com o Histórico ampliado não pode selecionar peça nem iniciar pan (o mesmo `stopPointerDown` da ficha).
3. Celular deitado em duas colunas com a ficha aberta: a ficha toma o lugar só do painel; a fila continua.
4. Empilhado largo: o botão Fila sai da navegação e o painel nunca mostra a seção "fila" (cai em Agir), como já acontece com `queueIsSplit`.
5. Arrastar peça no Arrumar sobre a lista de Personagens (soltar para tirar do mapa) continua funcionando com o fantasma novo.

---

### Task 1: Regras por espaço — larguras do Histórico, duas colunas, critério de altura, empilhado largo

**Files:**
- Modify: `src/styles/breakpoints.ts`
- Modify: `src/features/match/combat/useMatchLayout.ts`, `src/features/match/combat/useStageOverlays.ts` (só repassar as opções novas ao `useMatchLayout`)
- Modify: `src/components/templates/MatchStageTemplate.styles.ts`, `MatchStageTemplate.tsx`
- Modify: `src/pages/GameMasterPage.tsx`, `src/pages/GamePlayerPage.tsx` (passar as opções ao hook)
- Test: `src/features/match/combat/__tests__/useMatchLayout.test.ts`, `src/components/templates/__tests__/MatchStageTemplate.test.tsx`

**Interfaces:**
- Produces, em `breakpoints.ts`:
  - `MAP_MIN_WIDTH`, `RAIL_WIDTH`, `QUEUE_COLUMN_WIDTH`, `STACKED_WIDE_MIN_WIDTH` e `LANDSCAPE_SPLIT_MIN_HEIGHT = 400`.
  - `asideNarrowQuery(leftWidth: number): string` → `(orientation: landscape) and (max-width: ${leftWidth + RAIL_WIDTH + 280 + MAP_MIN_WIDTH - 0.02}px)`. `leftWidth` é a soma das colunas à esquerda do mapa. Mestre: 320, ou 560 em duas colunas. Jogador: 340. As larguras 280/200 seguem em `MatchStageTemplate.styles.ts`; mover `ASIDE_WIDTH`/`ASIDE_NARROW_WIDTH` para `breakpoints.ts` se a importação circular pedir.
  - `LANDSCAPE_TWO_COLUMN_QUERY` → `${LANDSCAPE_PHONE_QUERY} and (max-height: 399.98px) and (min-width: 1152px)`.
  - `STACKED_WIDE_QUERY` → `(orientation: portrait) and (min-width: 900px) and (max-width: 1279.98px)`.
  - `media.asideNarrow(leftWidth)`, `media.landscapeTwoColumns` e `media.stackedWide`.
- Produces, em `useMatchLayout.ts`:
  - `useMatchLayout(options: { columnWidth: number; queue: boolean }): MatchLayout`. O mestre passa `{ columnWidth: MASTER_COLUMN_WIDTH, queue: true }` e o jogador `{ columnWidth: PLAYER_COLUMN_WIDTH, queue: false }`. O `useStageOverlays` recebe e repassa as mesmas opções.
  - `MatchLayout` ganha três campos:
    - `twoColumns: boolean`: `queue && LANDSCAPE_TWO_COLUMN_QUERY`;
    - `stackedWide: boolean`: `queue && STACKED_WIDE_QUERY`;
    - `asideNarrow: boolean`: casa `asideNarrowQuery(twoColumns ? QUEUE_COLUMN_WIDTH + columnWidth : columnWidth)`.
  - `queueIsSplit(layout)` passa a ser `(!stacked && (!landscape || landscapeSplit || twoColumns)) || stackedWide`.

Comportamento que os testes fixam (o mestre salvo onde diz "jogador"; tela = largura×altura):

| Tela | Esperado |
|---|---|
| 907×303 (celular do dono, navegador) | `landscape`, `!landscapeSplit`, `!twoColumns`, `asideNarrow` |
| 907×427 (tela cheia / web app) | `landscapeSplit`, `asideNarrow` |
| 844×399 | `!landscapeSplit`; 844×400 → `landscapeSplit` |
| 1200×380 | `twoColumns`, `asideNarrow` (1200 < 560+672) |
| 1240×380 | `twoColumns`, `!asideNarrow` |
| 1100×380 | `!twoColumns` (< 1152), `!asideNarrow` (1100 ≥ 992) |
| 1024×768 | `!asideNarrow` (sobram 352 de mapa) |
| 991×700 | `asideNarrow`; 992×700 → `!asideNarrow` |
| jogador 1000×700 | `asideNarrow` (< 1012); jogador 1012×700 → `!asideNarrow` |
| 753×1205 (Tab S9 em pé) | `stacked`, `!stackedWide`, `!asideNarrow`, `!asideIsDrawer` |
| 1080×1920 (monitor em pé) | `stacked`, `stackedWide`, `queueIsSplit` true; jogador → `stackedWide` false |
| 1440×900 / 1920×1080 | `!asideNarrow`, `!twoColumns` |

CSS (template) que acompanha:
- **AsideZone em coluna:**
  - largura 280 por padrão em `media.tabletPortrait`, `media.side` e `media.landscapePhone`, e 200 só sob `media.asideNarrow(...)`;
  - a regra antiga "celular deitado = 200" e "tablet em pé = 200" sai;
  - o template recebe `columnWidth` e `queue`, então monta a query com o mesmo `leftWidth` do hook. Com fila, em duas colunas usa `media.landscapeTwoColumns` junto com `media.asideNarrow(560)`, declarado depois.
- **Grade em duas colunas** (`media.landscapeTwoColumns`, só com `$queue`), a mesma do widescreen:
  - colunas `RAIL_WIDTH QUEUE_COLUMN_WIDTH MASTER_COLUMN_WIDTH minmax(0,1fr) auto`, áreas `"rail queue panel stage aside"`;
  - declarada depois do `media.landscapePhone`;
  - QueueZone com 240, sem borda de cima;
  - a ficha no lugar da coluna ocupa a coluna do painel (`grid-column: 3`) e a fila continua visível (o `hiddenBySheet` não vale para a fila aqui).
- **Grade do empilhado largo** (`media.stackedWide`, só com `$queue`):
  - colunas `MASTER_COLUMN_WIDTH minmax(0,1fr) auto`;
  - linhas `minmax(0,1fr) minmax(0,1fr) RAIL_BAR_HEIGHT`;
  - áreas `"stage stage aside" "queue panel panel" "rail rail rail"`;
  - QueueZone visível, com 320, borda direita e de cima.
- Os literais `72px`/`240px` do grid passam a usar as constantes.

- [ ] **Step 1:** Escrever os testes da tabela em `useMatchLayout.test.ts`, com `mockScreen`. Estender a varredura CSS×hook em `MatchStageTemplate.test.tsx` para as telas novas, conferindo que `asideNarrow`, `twoColumns` e `stackedWide` do hook batem com as queries que o template usa (mesmo padrão dos casos existentes).
- [ ] **Step 2:** Rodar `npx vitest run src/features/match/combat src/components/templates` e ver falhar.
- [ ] **Step 3:** Implementar breakpoints, hook, template e a passagem das opções nas duas páginas. Na página do mestre, `split` já esconde Fila e Personagens da navegação; conferir que o empilhado largo herda isso.
- [ ] **Step 4:** Rodar a suíte completa (`npm run test`), `npx tsc -b` e `npm run lint`. Tudo verde.
- [ ] **Step 5:** Commit `feat(match): widths by the space left for the map, two columns and the wide stacked queue`.

### Task 2: Histórico com alternância 200 / 280 / escondido nas telas estreitas

**Files:**
- Modify: `src/features/match/combat/useStageOverlays.ts`
- Modify: `src/components/templates/MatchStageTemplate.tsx`, `.styles.ts`
- Modify: `src/pages/GameMasterPage.tsx`, `src/pages/GamePlayerPage.tsx`
- Test: `src/features/match/combat/__tests__/useStageOverlays.test.ts` (criar se não existir; senão estender), `src/components/templates/__tests__/MatchStageTemplate.test.tsx` e um caso de página em cada `src/pages/__tests__/GameMasterPage*.test.tsx` / `GamePlayerPage*.test.tsx` existente.

**Interfaces:**
- Consumes: `layout.asideNarrow` (Task 1).
- Produces:
  - Em `MatchStageTemplate.tsx`: `export type AsideMode = "closed" | "docked" | "expanded" | "expandedOverDocked"`.
  - O template troca a prop `asideOpen?: boolean` por `asideMode?: AsideMode` (padrão `"docked"`). Props novas:
    - `onToggleAsideWidth?: () => void`: renderiza o botão de ampliar/reduzir; a página só passa nas telas estreitas;
    - `onDismissExpandedAside?: () => void`: o véu transparente do toque fora.
  - `useStageOverlays` passa a guardar `aside: AsideMode`:
    - `asideOpen = asideMode !== "closed"`, como hoje para quem só lê "está à mostra";
    - funções novas: `toggleAsideWidth()` e `dismissExpandedAside()`;
    - `setAsideOpen` continua com a mesma assinatura e as regras abaixo.

Regras (o dono definiu, 2026-11-28):
- **Só onde `asideNarrow`.** No resto, `setAsideOpen(true)` dá `"docked"`, como hoje, e nunca há modo ampliado.
- **Fechado + botão Histórico da navegação** (`setAsideOpen(true)` ou o toggle) → `"expanded"`: 280 por cima do mapa, sem coluna embaixo (a célula da grade tem 0 de largura, então o mapa não muda).
- **Encaixado (200) + botão de ampliar** → `"expandedOverDocked"`: a célula continua com 200 e a superfície de 280 transborda 80 px para a esquerda, por cima do mapa.
- **Toque fora em modo ampliado** (`dismissExpandedAside`): `"expanded"` → `"closed"` e `"expandedOverDocked"` → `"docked"`.
- **Botão de reduzir em qualquer modo ampliado** (`toggleAsideWidth`) → `"docked"`: ele fixa em 200.
- **Botão Histórico da navegação com o Histórico à mostra** (qualquer modo) → `"closed"`.
- **Se `asideNarrow` vira falso** (girou, redimensionou): `"expanded"` e `"expandedOverDocked"` passam a valer `"docked"`. Normalizar na leitura, sem efeito. Nunca sobra véu invisível.
- **O "abre um, fecha o outro" da gaveta** (`asideIsDrawer`) não muda: tela estreita é sempre deitada, onde não há gaveta.

Visual:
- **Modo ampliado:**
  - superfície com sombra `-8px 0 24px colors.shadowStrong`, a mesma da gaveta;
  - `z-index` da gaveta (`ASIDE_DRAWER_Z_INDEX`);
  - véu transparente (`background: transparent`) sobre o `Middle` inteiro, abaixo da superfície, com `onPointerDown={stopPointerDown}` e `onClick={onDismissExpandedAside}`.
- **Modo encaixado:** sem sombra, sem véu.
- **Botão de largura:**
  - um ion existente (`ExpandButton`, girado para apontar ‹ ou ›) dentro de um `<button>` com `iconButtonFx`;
  - preso à borda esquerda do Histórico, na altura da faixa das abas, vazando metade para o lado do mapa;
  - alvo de toque ≥ 44 px;
  - `aria-label` "Ampliar o Histórico" quando está em 200 e "Reduzir o Histórico" quando ampliado;
  - não pode cobrir as abas Histórico/Personagens.
- **Personagens no modo encaixado a 200:** a página do mestre passa `compact` ao `AddNpcPicker` (Task 3) quando `layout.asideNarrow && asideMode === "docked"`.

- [ ] **Step 1:** Testes do hook, com `mockScreen` a 907×427 (estreito) e 1024×768 (não estreito):
  - as transições acima, uma por teste;
  - a normalização ao redimensionar de 907×427 para 1024×768 com `"expanded"` → `asideOpen` verdadeiro e modo `"docked"`.

  Testes do template:
  - `data-aside-mode` no `match-aside`;
  - o véu `aside-expand-scrim` só nos modos ampliados;
  - clicar nele chama `onDismissExpandedAside`;
  - o botão com os dois `aria-label`.
- [ ] **Step 2:** Ver falhar.
- [ ] **Step 3:** Implementar. Trocar `asideOpen` por `asideMode` nas duas páginas e nos testes delas. O botão Histórico da navegação segue `pressed` quando `asideOpen`.
- [ ] **Step 4:** Suíte completa, `tsc` e lint verdes.
- [ ] **Step 5:** Commit `feat(match): the Histórico toggles 200/280/hidden on narrow screens`.

### Task 3: Nada vaza a 200

**Files:**
- Modify: `src/components/organisms/CharactersSidebar.tsx` (título)
- Modify: `src/features/match/combat/MasterControls.tsx` (`AddNpcPicker`)
- Modify: `src/pages/GameMasterPage.tsx` (passar `compact`)
- Modify: `src/features/match/combat/AsideTabs.tsx` (se as abas vazarem)
- Test: o teste de página do mestre que já cobre o `AddNpcPicker` (procurar por "Escolha um NPC da campanha" em `src/pages/__tests__/`)

**Interfaces:**
- Produces: `AddNpcPicker({ candidates, onAdd, compact?: boolean })`. Com `compact`, o placeholder é "Escolha um NPC".

O que fazer:
- **Título "PERSONAGENS" (32px):**
  - `SidebarContainer` ganha `container-type: inline-size`;
  - o `SidebarTitle` usa `font-size: min(32px, 12cqi)`: a 280 continua 32, e a 200 cai para ~22 e cabe;
  - na campanha e no lobby a 280 nada muda.
- **Placeholder do NPC:** a página passa `compact` conforme a Task 2.
- **Abas e itens:** conferir as abas "Histórico | Personagens", os itens da lista (`CharacterSidebarItem`) e as linhas do Histórico a 200 de largura (184 úteis). O que vazar encolhe com a mesma técnica (container query no pai), nunca com fonte fixa menor para todos os tamanhos.
- **Critério de "não vaza":** `scrollWidth <= clientWidth` em todo elemento dentro do `match-aside` a 200. Quem verifica no browser é o controlador. O implementador garante pelo CSS e cobre o placeholder no teste de página.

- [ ] **Step 1:** Teste de página: com o Histórico estreito encaixado (mock 907×427), a aba Personagens mostra "Escolha um NPC". A 1024×768 mostra "Escolha um NPC da campanha".
- [ ] **Step 2:** Ver falhar.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Suíte, `tsc` e lint verdes.
- [ ] **Step 5:** Commit `fix(match): nothing overflows the 200 px Histórico`.

### Task 4: Folha da ficha — margem e barra de rolagem no canto

**Files:**
- Modify: `src/components/templates/MatchStageTemplate.styles.ts` (`SheetZone`, `SheetBody`)
- Modify: `src/styles/scrollbar.ts` (helper novo)
- Test: `src/components/templates/__tests__/MatchStageTemplate.test.tsx` (só se já houver asserção de estilo da folha; senão, nenhuma, e verificação no browser)

**Interfaces:**
- Produces: `scrollbarTrackInset(topPx: number)` em `scrollbar.ts` → `&::-webkit-scrollbar-track { margin-top: ${topPx}px; }`. É o trilho que começa abaixo do canto arredondado.

O que fazer:
- **SheetZone no empilhado:** `left: 16px; right: 16px`. Nas outras formas (coluna, caixa) nada muda, porque elas já zeram o `inset`.
- **SheetBody:** `${scrollbarTrackInset(22)}`, os mesmos 22 px do raio. Assim a barra não entra no canto arredondado de cima nem fica por trás do X.

- [ ] **Step 1:** Implementar.
- [ ] **Step 2:** Suíte, `tsc` e lint verdes.
- [ ] **Step 3:** Commit `fix(match): the sheet keeps 16 px from the screen edges and its scrollbar clears the rounded corner`.

### Task 5: A peça acompanha o ponteiro no Arrumar

**Causa (já investigada):** `PiecesLayer` esconde a peça arrastada da cena (`visiblePieces`) e conta com um fantasma DOM que o pai desenha. `TacticalMapEditor` e `TacticalMapPlacer` desenham esse fantasma. `GameMasterPage` só guarda `draggingPieceId`, para o realce da lista, e só desenha fantasma no arraste de card (`cardDrag`). Resultado: no Arrumar a peça some e só a casa de destino acende. Isso já acontecia no `main`; não foi esta branch que causou.

**Files:**
- Modify: `src/features/tactical-map/stage/PiecesLayer.tsx`, `TacticalMapStage.tsx`, `TacticalMapViewer.tsx`, `stage/ViewportInner.tsx` (assinatura do callback)
- Modify: `src/pages/GameMasterPage.tsx`
- Test: nenhum automatizado possível na camada Pixi (mockada). A verificação é do controlador, no browser.

**Interfaces:**
- `onPieceDragStart?: (pieceId: string, npc: CharacterPrivateSummary | undefined, point: { x: number; y: number }) => void`. `point` são as coordenadas de cliente do `pointermove` que começou o arraste. O editor e o posicionador ignoram o argumento novo.

O que fazer:
- **Ao começar o arraste:**
  - `GameMasterPage` monta o fantasma com `usePointerGhost(origem)` e `PieceDragGhostPortal`, como o `cardDrag` já faz;
  - o avatar é o do participante dono da peça (`game.boardPieces` → `characterId` → `participants`);
  - o tamanho segue a mesma fórmula do `cardDrag`: `Math.max(44, slotScreenInradius(map.grid) * 2 * 0.9 * scale)`;
  - a origem é `point`.
- **No fim** (`onPieceDragEnd`): o fantasma some.
- **O que não muda:** o realce da lista (`draggingPieceId`) e a soltura (confirmação do Arrumar).
- **Duplicação:** extrair o cálculo de tamanho e avatar compartilhado com o `cardDrag` numa função local, sem duplicar a fórmula.

- [ ] **Step 1:** Implementar.
- [ ] **Step 2:** Suíte, `tsc` e lint verdes (os testes do editor e do posicionador que chamam `onPieceDragStart` continuam passando).
- [ ] **Step 3:** Commit `fix(match): the dragged piece follows the pointer in Arrumar`.

### Task 6 (controlador): docs, browser, PR

- `docs/dev/match/layout-da-mesa.md`: a regra de 320 px de mapa, a alternância do Histórico, as duas colunas, o empilhado largo, o 400 e a folha.
- Browser (CDP headless, contas seed), mestre e jogador:
  - larguras em 907×303, 907×427, 1200×380, 1024×768, 753×1205, 1080×1920 e 1400×900;
  - "nada vaza" a 200;
  - as transições do Histórico, com o mapa parado;
  - a folha a 753×1205;
  - o fantasma do Arrumar.
- PR #118: atualizar a descrição.
