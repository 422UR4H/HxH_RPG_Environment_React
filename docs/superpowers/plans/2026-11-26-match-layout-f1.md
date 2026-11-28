# Mesa — layout da Fase 1 (F1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rearrumar a mesa (mestre e jogador) por papel e por tamanho de tela — fila fixa do mestre, aba "Partida", ficha como folha/caixa, Histórico em coluna estreita — sem mudar o que cada tela faz e sem nada de efeitos de status.

**Architecture:** `MatchStageTemplate` continua dono de ONDE cada zona aparece (CSS por media query); ganha duas zonas novas (`queue`, `sheet`). Um hook `useMatchLayout` diz à página O QUE vai em cada zona (ex.: a fila é zona própria ou aba do painel). As páginas `GameMasterPage`/`GamePlayerPage` continuam orquestradoras.

**Tech Stack:** React 19 + TypeScript strict, styled-components, Vitest + Testing Library (jsdom; `matchMedia` mockado como `matches: false`).

**Spec:** `docs/superpowers/specs/2026-11-25-match-front-status-effects-po.md` §4 (F1) + `docs/superpowers/specs/2026-11-22-status-effects-front-prompt-po.md` (regras de desenho). **Onde este plano diverge do spec, vale o plano**: as decisões abaixo foram tomadas pelo dono em 2026-11-26 sobre os protótipos `https://claude.ai/artifact/X4szxTRx2LPQMDB1bBYAw6` (v3, final) — v1/v2 são histórico.

## Global Constraints

- **Idioma:** identificadores, nomes de arquivo e títulos de teste (`describe`/`it`) em **inglês**. Texto de UI, comentários e asserções sobre texto de UI em **português**. Nunca escreva título de teste em português.
- **Cor só por token** (`colors`/`alpha` de `src/styles/tokens.ts`); nada de hex/rgba/`white` em componente (o teste `noRawColors` falha). **Nenhum token novo.** O véu escuro da fila é `linear-gradient(${colors.shadowSoft}, ${colors.shadowSoft}), ${colors.surfaceSidebar}` (`shadowSoft` = preto a 30%, exatamente o `alpha(neutral1000, 0.3)` pedido).
- **Mude só o que este plano pede.** Texto, ícone ou espaçamento mexido sem pedido conta como regressão. A Fila mantém o espaçamento de hoje (`PanelSection` com `padding: 12px 12px 0`, `QueuePanel` com `padding: 12px`, linhas como hoje).
- **Header:** a ordem continua `cena · conexão ("Conectado") · ações do mestre · Histórico · Tela cheia`. A conexão fica SEMPRE à esquerda do controle de Round.
- **Breakpoints com nome**, nunca número solto: `src/styles/breakpoints.ts`.
- **Zona pixel-tuned** (`src/components/CLAUDE.md`) não é tocada.
- `import type` para tipos (`verbatimModuleSyntax`).
- Antes de cada commit: confira `git branch --show-current` == `feat/match-layout-f1`; se não for, PARE. Faça `git add` só dos seus arquivos. Nada de `git stash`, `checkout`, `reset`.
- Verificação por task: `npx vitest run <arquivos de teste da task>` e `npx tsc -b`. No fim: `npm run lint` e `npx vitest run` completo.

## Decisões de produto (as que o dono fechou nos protótipos)

**Larguras (px) por tamanho de tela.** "Celular em pé" = largura < 768 e não deitado. "Celular deitado" = `(orientation: landscape) and (max-height: 540px)` (vale sobre os outros). "Tablet" = 768–1279. "Computador" = 1280–1599. "Widescreen" = ≥ 1600.

| Zona | Celular em pé | Celular deitado | Tablet | Computador | Widescreen |
|---|---|---|---|---|---|
| Navegação | rodapé 56 | coluna 72, itens dividem a altura | mestre: coluna 72; jogador: rodapé abaixo de 1024, coluna 72 a partir de 1024 | coluna 72 | coluna 72 |
| Painel do mestre (Agir/Partida…) | metade da altura, fixo | coluna 280 (metade de cima, se dividir) | coluna 280, metade de cima | coluna 320, metade de cima | coluna 320 |
| Fila do mestre | aba do painel | metade de baixo (280) se dividir; senão aba | metade de baixo (280) | metade de baixo (320) | coluna 240, à esquerda do painel |
| Painel do jogador | como hoje | coluna 280 | em pé: embaixo, como hoje; ≥1024: coluna 280 | coluna 340 | coluna 340 |
| Ficha do mestre | folha | caixa 280 | caixa 280 | caixa `clamp(340px, 100% − 300px, 420px)` | idem |
| Ficha do jogador | folha | no painel (280) | no painel, como hoje (em pé embaixo; ≥1024 coluna 280) | no painel, 420 | caixa `clamp(…)` |
| Histórico (aside) | gaveta, como hoje | coluna 200 | coluna 200 | coluna 200 | coluna 200 |

- **Mestre, "dividir" no celular deitado:** só quando cada metade tem ≥ 160 px, isto é, altura da tela ≥ 364 px (44 do header + 2 × 160). Abaixo disso (ex.: com a barra do navegador) a coluna mostra uma seção por vez, com os 5 itens na navegação.
- **Celular em pé, mestre:** mapa e painel com a MESMA altura (`minmax(0,1fr) minmax(0,1fr) 56px`); o painel nunca fecha, não tem X, rola por dentro.
- **Histórico:** coluna de 200 px que pode ficar aberta junto com tudo, em todo tamanho menos o celular em pé (lá continua a gaveta de hoje). Abre/fecha pelo botão "Histórico" do header. Começa aberto só a partir de 1280 (como hoje). No tablet em pé do jogador, a coluna fica ao lado do mapa e o painel de baixo passa por baixo dela em toda a largura (o Histórico nunca cobre o painel nem a folha).
- **Folha (celular em pé, mestre e jogador):** afastada 8 px das laterais, topo a 20% da altura abaixo do header, cantos de 22 px em cima, desce até o fim da tela por TRÁS da navegação (o rodapé fica por cima; o conteúdo da folha tem `padding-bottom` de 56 px). X vermelho de 36 px (o mesmo do `EdgeDrawer`: `CloseButton` + `iconButtonFx(1.15)`), vazando 10 px para cima e 5 px para a direita (`top: -10px; right: -5px`).
- **Caixa (fora do celular em pé):** retângulo da altura do palco, colado na borda esquerda do mapa (logo depois da coluna da esquerda), **por cima do mapa, sem deslocá-lo**, sem cantos arredondados, `border-right: 1px solid ${colors.surfaceInput}`, sombra `8px 0 24px ${colors.shadowStrong}`. Sem X.
- **Fechar a ficha:** tocar de novo em "Ficha", tocar em qualquer lugar do mapa (fecha e NÃO seleciona nada) ou, na folha, o X.
- **De quem é a ficha:** jogador = sempre o próprio personagem (como hoje). Mestre = o último personagem que ele tocou no mapa, escolheu no "Agir por" ou abriu pelo card de Personagens. Sem nenhum, tocar em "Ficha" NÃO abre nada: o item "Ficha" fica marcado e a dica `${verb} numa peça para ver a ficha.` aparece no lugar das dicas do mapa (`MapHint`) até ele tocar numa peça — essa peça abre a ficha (e só isso). Tocar no mapa fora de uma peça, numa parede ou de novo em "Ficha" desiste.
- **Navegação do mestre:** sem fila fixa (celular em pé e deitado baixo): `Fila ☰ (badge) · Ficha 📜 · Agir ⚔ · Personagens 👥 · Partida 🎲`, nesta ordem. Com fila fixa: `Agir ⚔ · Ficha 📜 · Partida 🎲`. Seção inicial: Fila (sem fila fixa) / Agir (com fila fixa). Tocar no item ativo não fecha nada (o painel do mestre é fixo).
- **Navegação do jogador:** `Ação ⚔ · Ficha 📜` (como hoje). Onde a ficha é folha ou caixa, "Ficha" abre/fecha a ficha e não troca o painel (no celular em pé, abrir a folha fecha o painel de Ação).
- **Header do mestre:** a partir de 768 px, depois da conexão, o rótulo **"Round"** + o seletor Livre/Disputado (o seletor que hoje está lá, com o rótulo novo à esquerda). No celular em pé, nada do mestre no header. **"Nova cena", "Encerrar partida", "Abrir próxima"/"Encerrar rodada" e "Fechar turno" saem do header em todo tamanho.** O jogador: header igual ao de hoje.
- **Topo da Fila (todo tamanho):** `Abrir próxima`/`Encerrar rodada` (com o Tooltip e o `aria-disabled` de hoje) e `Fechar turno`, lado a lado. No celular em pé, antes deles, o título **"Round"** (no lugar de "Regime") + o seletor; a linha quebra como hoje.
- **Aba "Partida" do mestre:** título de grupo "Cena" com o nome da cena atual (o mesmo texto do header) e o botão "Nova cena" (abre o fluxo de hoje; desabilitado com turno aberto, com o `title` de hoje); grupo "Revelar barras de vida e stamina" + `ComingSoonBadge`, com dois checkboxes desabilitados: "De todos os personagens de jogador, para todos" e "De todos os NPCs"; grupo "Configurações da mesa" + `ComingSoonBadge`; um traço; "Encerrar partida" (`EndMatchButton` de hoje).
- **Aba "Personagens" do mestre (sem fila fixa):** a mesma `MatchCharactersSidebar` da aba Personagens do Histórico, sem mudança. A gaveta/coluna do Histórico continua com as duas abas.
- **Fora da F1:** painel de ação novo, rodapé com recorte e botão "Enviar ação" (F2); tudo de status.

## Review Focus

1. **Girar o aparelho com a ficha aberta ou esperando peça:** ao trocar entre folha e caixa, a ficha continua aberta no mesmo personagem; a espera continua. (Task 5 cobre com teste de troca de largura.)
2. **Arrumar ligado no mestre:** o `ArrangePanel` aparece no painel (metade de cima com fila fixa); entrar no Arrumar fecha a ficha. (Task 5.)
3. **Toque no mapa com a ficha aberta não pode agir:** nem escolher NPC, nem marcar alvo, nem segurar peça. O véu transparente do template barra no browser; a página também barra (testes rodam sem CSS). (Task 5 e 6.)
4. **Reação esperando com a fila fixa à mostra:** a dica "Reagir pelo NPC" (que leva à Fila) não aparece, porque a seção já está na tela. (Task 5.)
5. **Gaveta do Histórico no celular em pé continua com o comportamento de hoje** (abrir a gaveta fecha o painel do jogador; o painel do mestre, que é fixo, não fecha). (Task 2.)

---

### Task 1: Breakpoints e `useMatchLayout`

**Files:**
- Modify: `src/styles/breakpoints.ts`
- Create: `src/features/match/combat/useMatchLayout.ts`
- Test: `src/features/match/combat/__tests__/useMatchLayout.test.ts`

**Interfaces:**
- Produces:
  - `breakpoints = { tabletUp: 768, railUp: 1024, asideUp: 1280, wideUp: 1600 }`
  - `LANDSCAPE_PHONE_QUERY = "(orientation: landscape) and (max-height: 540px)"`
  - `LANDSCAPE_SPLIT_MIN_HEIGHT = 364` (44 do header + 2 × 160)
  - `media.wideUp`, `media.landscapePhone` (`@media ${LANDSCAPE_PHONE_QUERY}`), `media.landscapeSplit` (`@media ${LANDSCAPE_PHONE_QUERY} and (min-height: 364px)`), mantendo `phone`, `tabletUp`, `railUp`, `asideUp`.
  - `useMatchLayout(): { phonePortrait: boolean; landscape: boolean; landscapeSplit: boolean; wide: boolean; asideIsDrawer: boolean }` — `landscape` = query de celular deitado; `phonePortrait` = `!landscape && largura < tabletUp`; `landscapeSplit` = `landscape && altura ≥ 364`; `wide` = `!landscape && largura ≥ wideUp`; `asideIsDrawer` = `phonePortrait`. Use `useMediaQuery` com queries `min-width`/`min-height` (o mock dos testes responde `false` → tudo cai em celular em pé, que é o que a suíte de hoje exercita).
  - `queueIsSplit(layout): boolean` = `!layout.phonePortrait && (!layout.landscape || layout.landscapeSplit)` — usado só pela página do mestre.

- [ ] **Step 1: Write the failing tests** (`useMatchLayout.test.ts`). Use um helper `mockScreen({ width, height, landscape })` que troca `window.matchMedia` respondendo por `min-width`, `min-height`, `orientation: landscape` e `max-height` (copie o padrão de `useStageOverlays.test.ts`, restaurando em `afterEach`):

```ts
it("treats the jsdom default as a portrait phone", () => { /* sem mock */ expect(result.current).toEqual({ phonePortrait: true, landscape: false, landscapeSplit: false, wide: false, asideIsDrawer: true }); });
it("reports a landscape phone tall enough to split", () => { mockScreen({ width: 844, height: 390, landscape: true }); /* landscape true, landscapeSplit true, phonePortrait false, wide false, asideIsDrawer false */ });
it("reports a short landscape phone that cannot split", () => { mockScreen({ width: 844, height: 330, landscape: true }); /* landscapeSplit false */ });
it("reports a portrait tablet as neither phone nor wide", () => { mockScreen({ width: 768, height: 1024 }); /* all false */ });
it("reports widescreen from 1600 px", () => { mockScreen({ width: 1600, height: 900 }); /* wide true */ });
it("never reports widescreen in landscape-phone mode", () => { mockScreen({ width: 1700, height: 500, landscape: true }); /* wide false, landscape true */ });
describe("queueIsSplit", () => { /* false em celular em pé e em deitado baixo; true em deitado alto, tablet, computador, widescreen */ });
```

- [ ] **Step 2:** `npx vitest run src/features/match/combat/__tests__/useMatchLayout.test.ts` → FAIL (módulo não existe).
- [ ] **Step 3:** Implemente `breakpoints.ts` (atualize o comentário: "Os cinco breakpoints da partida…" e explique que o celular deitado é reconhecido pela altura porque passa de 768 px de largura) e `useMatchLayout.ts` (comentário curto em PT dizendo que o template decide onde, o hook decide o quê).
- [ ] **Step 4:** Rode o teste → PASS. `npx tsc -b` → sem erros.
- [ ] **Step 5: Commit** `feat(match): name the landscape-phone and widescreen breakpoints and add useMatchLayout`

---

### Task 2: `useStageOverlays` — gaveta só no celular em pé e painel fixo do mestre

**Files:**
- Modify: `src/features/match/combat/useStageOverlays.ts`
- Test: `src/features/match/combat/__tests__/useStageOverlays.test.ts`

**Interfaces:**
- Consumes: `useMatchLayout` (Task 1).
- Produces: `useStageOverlays(options?: { panelFixed?: boolean })` com a mesma forma de retorno de hoje (`panelOpen`, `setPanelOpen`, `asideOpen`, `setAsideOpen`, `closeAsideIfDrawer`). Regras novas:
  - "Abrir um fecha o outro" só quando `asideIsDrawer` (celular em pé). Fora dele, a coluna do Histórico convive com tudo.
  - `panelFixed: true` → `panelOpen` é sempre `true`, `setPanelOpen` não muda nada e abrir a gaveta não fecha o painel.
  - Painel abre de início a partir de `railUp` (como hoje) **ou no celular deitado**; Histórico abre de início a partir de `asideUp` e nunca no celular deitado.
  - `closeAsideIfDrawer` só fecha no celular em pé.
  - **Apague `masterPanelDismissible`** (o painel do mestre nunca mais é folha) e os testes dela. `playerPanelDismissible` fica como está.

- [ ] **Step 1: Write the failing tests** — novos `it`s (o mock de largura existente ganha altura/orientação como na Task 1):

```ts
it("keeps a fixed panel open and ignores setPanelOpen(false)", …)            // panelFixed
it("opening the drawer does not close a fixed panel on a portrait phone", …)  // panelFixed + setAsideOpen(true) → panelOpen true
it("lets the aside column and the panel stay open together from 768 px", …)  // setWidth(768): abrir um não fecha o outro
it("opens the panel at start on a landscape phone and keeps the aside closed", …)
it("closeAsideIfDrawer leaves the aside column open on a tablet", …)
```
  Os testes de hoje de "tela estreita" continuam valendo (jsdom = celular em pé). Remova os de `masterPanelDismissible`.
- [ ] **Step 2:** Rode → FAIL.
- [ ] **Step 3:** Implemente. Atualize o comentário do hook (as regras acima, em PT).
- [ ] **Step 4:** Rode → PASS. `npx tsc -b` vai acusar o import de `masterPanelDismissible` em `GameMasterPage.tsx`: troque a chamada por `panelDismissible={false}` (a Task 5 reescreve isso) só para compilar.
- [ ] **Step 5: Commit** `refactor(match): aside column from 768 px and a fixed master panel in useStageOverlays`

---

### Task 3: `MatchStageTemplate` — zonas `queue` e `sheet`, larguras novas, rail que deita por CSS

**Files:**
- Modify: `src/components/templates/MatchStageTemplate.tsx` (extraia os styled-components para `src/components/templates/MatchStageTemplate.styles.ts`, já passa de 150 linhas)
- Modify: `src/features/match/combat/RailNav.tsx` (+ `__tests__/RailNav.test.tsx`)
- Test: `src/components/templates/__tests__/MatchStageTemplate.test.tsx`

**Interfaces:**
- Consumes: `media.*` da Task 1.
- Produces — props novas do template (as de hoje continuam):
  - `queue?: ReactNode` — a fila fixa do mestre. **A presença dela muda a grade**: com `queue`, a navegação fica em pé a partir de `tabletUp` e a coluna da esquerda divide em duas metades (`panel` em cima, `queue` embaixo); no widescreen a fila vira coluna própria (240) à esquerda do painel (320). Zona com `data-testid="match-queue"` e o fundo escuro da Global Constraints.
  - `panelHalf?: boolean` — abaixo de `tabletUp`, painel e palco dividem a altura meio a meio (linhas `minmax(0,1fr) minmax(0,1fr) ${RAIL_BAR_HEIGHT}px`), o painel ocupa a linha inteira (sem `max-height`).
  - `sheet?: ReactNode`, `sheetOpen?: boolean` (padrão `false`), `onDismissSheet?: () => void` — a ficha. Zona `data-testid="match-sheet-zone"` com `data-open`. Celular em pé: folha (medidas na seção de decisões), com o botão X (`aria-label="Fechar a ficha"`) que chama `onDismissSheet`; demais tamanhos: caixa na área `stage` (`grid-area: stage; justify-self: start;`), largura 280 no tablet e no celular deitado e `clamp(340px, calc(100% - 300px), 420px)` a partir de `asideUp`; o X some (`display: none`) fora do celular em pé. Com `sheetOpen && onDismissSheet`, um véu **transparente** (`data-testid="sheet-scrim"`) cobre o palco; `click` nele chama `onDismissSheet`, `pointerdown` morre nele (mesmo `stopPointerDown` dos outros véus).
  - Larguras: Histórico vira coluna de 200 px de `tabletUp` em diante e no celular deitado (o `AsideScrim` só existe no celular em pé); painel do jogador 280 de `railUp` até `asideUp` e no celular deitado, 340 a partir de `asideUp`; `panelWide` = 420 a partir de `asideUp`, 280 antes e no celular deitado (hoje é `clamp(340px, 46vw, 640px)`); painel do mestre (com `queue`) 280 até `asideUp` e no deitado, 320 a partir dele.
  - Jogador no tablet em pé (sem `queue`, entre `tabletUp` e `railUp`): grade `"stage aside" / "panel panel" / "rail rail"` — o painel passa por baixo do Histórico.
  - Celular deitado vale sobre os outros (escreva as regras dele por último). Com `queue` mas altura < 364 px a página não manda `queue` (Task 5), então a regra do deitado sem `queue` é a de coluna única.
  - Pilha de camadas: escreva as constantes junto das de hoje e atualize o comentário longo (BF4): avisos do palco 50, painel do relógio 52, **`SHEET_SCRIM_Z_INDEX = 53`** (dentro do palco), **`SHEET_Z_INDEX = 54`**, **navegação 55** (`position: relative; z-index: 55` — fica por cima da folha; o `AsideScrim`, 55 e depois no DOM, continua por cima dela), véus 55, gaveta 60.
  - `RailNav`: a orientação dos itens deixa de depender de `media.railUp`. O template define no `RailZone` as variáveis `--rail-item-flex` e `--rail-item-min-height` (deitada: `1` / `auto`; em pé: `0 0 auto` / `64px`; celular deitado: `1 1 0` / `0`, para 5 itens caberem na altura) e o `NavButton` usa `flex: var(--rail-item-flex, 1); min-height: var(--rail-item-min-height, auto);`. O `RailZone` em pé tem `border-right`, deitado `border-top` (como hoje). `RailNavItem` ganha `pressed?: boolean`, que, quando definido, substitui o cálculo `id === active && panelOpen` (para "Ficha" marcada com o painel em outra aba).

- [ ] **Step 1: Write the failing tests** (`MatchStageTemplate.test.tsx`; jsdom não aplica media query — teste o contrato e o CSS gerado, como o teste "stacks stage, panel and rail" de hoje faz):

```ts
it("renders the queue zone only when a queue is given", …)
it("renders the sheet zone closed by default and reflects sheetOpen", …)        // data-open
it("dismisses the sheet from the close button and from the transparent scrim", …) // getByRole("button",{name:"Fechar a ficha"}), getByTestId("sheet-scrim")
it("has no sheet scrim while the sheet is closed", …)
it("stops pointerdown on the sheet scrim before it reaches the window", …)
it("splits the left column into panel and queue when a queue is given", …)     // css contém '"rail panel stage aside" "rail queue stage aside"'
it("gives the widescreen master a queue column left of the panel", …)          // css contém '"rail queue panel stage aside"' e 'grid-template-columns:72px 240px 320px'
it("makes the aside a 200 px column outside the portrait phone", …)            // css contém 'width:200px'
it("lets the player's bottom panel run under the aside on a portrait tablet", …) // '"stage aside" "panel panel" "rail rail"'
it("splits the portrait phone in equal halves with panelHalf", …)              // 'minmax(0,1fr) minmax(0,1fr) 56px'
it("caps the sheet box at 420 px and leaves the map 300 px", …)                 // 'clamp(340px,calc(100% - 300px),420px)'
```
  `RailNav.test.tsx`: `it("marks an item pressed by its own pressed flag", …)`.
  Os testes de hoje continuam passando, exceto o que hoje afirma `data-wide`/largura antiga, se houver — ajuste-o para os valores novos.
- [ ] **Step 2:** Rode os dois arquivos → FAIL.
- [ ] **Step 3:** Implemente. Reescreva o comentário do topo do template descrevendo os cinco tamanhos (curto, em PT).
- [ ] **Step 4:** Rode → PASS; `npx tsc -b`.
- [ ] **Step 5: Commit** `feat(match): queue and sheet zones, narrow aside column and landscape layout in MatchStageTemplate`

---

### Task 4: Controles do mestre — Round no header, turno na Fila, aba Partida

**Files:**
- Modify: `src/features/match/combat/MasterControls.tsx` (e `.styles` se passar de 150 linhas de styled)
- Create: `src/features/match/combat/MatchTabPanel.tsx` (a aba "Partida")
- Modify: `src/pages/GameMasterPage.tsx` (só o header e o topo da Fila; o resto é da Task 5)
- Test: `src/pages/__tests__/GameMasterPage.test.tsx`

**Interfaces:**
- Produces:
  - `HeaderRound({ mode, onModeChange })` — no header: `<Label>Round</Label>` + `RoundModeSwitch placement="topbar"`; tudo some no celular em pé (`media.phone`). Substitui `RegencyControls` (apague-o).
  - `TurnControls({ mode, onOpenNext, onCloseTurn, canCloseTurn, queueLength, orderLength, roundTurns })` — o "Abrir próxima"/"Encerrar rodada" de hoje (mesma regra `endsRound`/`idleRound`, mesmo Tooltip, `aria-disabled`) + "Fechar turno" (desabilitado sem turno aberto), lado a lado.
  - `QueueHeader({ round: ReactNode; turn: ReactNode })` ou equivalente: o `PanelSection` de hoje (mesmo padding, `justify-content: space-between`, quebra de linha) **visível em todo tamanho**; o bloco do Round (título "Round" + `RoundModeSwitch placement="panel"`) só no celular em pé; o `TurnControls` sempre.
  - `RoundModeSwitch`: `aria-label` do grupo vira "Round".
  - `MatchTabPanel({ sceneLabel: string; onNewScene: () => void; canChangeScene: boolean; endMatchBlockedReason: string | null; onEndMatch: () => void })` — conteúdo e textos da seção de decisões ("Cena", "Nova cena", "Revelar barras de vida e stamina", os dois checkboxes desabilitados, "Configurações da mesa", `ComingSoonBadge`, traço, `EndMatchButton`). Títulos de grupo com `PanelTitle`; botão "Nova cena" com o `SmallButton` de hoje e o `title` "Feche o turno antes de trocar de cena" quando desabilitado. Checkbox: `<input type="checkbox" disabled>` com `<label>` (o `FormCheckbox` não aceita `disabled`).
  - O texto da cena para `sceneLabel` deve ser o mesmo do header: extraia de `MatchTopBar` uma função exportada `sceneTitle(scene?: ScenePayload): string` (`briefInitialDescription || SCENE_LABEL[category] || "Sem cena"`) e use nos dois lugares.
  - Página do mestre nesta task: `actions={<HeaderRound …/>}` no `MatchTopBar`; o `PanelSection` da Fila vira `QueueHeader` com `TurnControls` (sai dali "Nova cena" e "Encerrar partida"); acrescente `{ id: "partida", label: "Partida", icon: "🎲" }` ao rail atual e um ramo `railActive === "partida"` renderizando `MatchTabPanel` (o `RailTab` ganha `"partida"`). A Task 5 reorganiza a navegação inteira.

- [ ] **Step 1: Write the failing tests** (GameMasterPage, título em inglês):

```ts
it("keeps scene, end-match and turn buttons out of the header", …)   // dentro de getByRole("banner"): sem "Nova cena", "Encerrar partida", "Abrir próxima", "Fechar turno"
it("labels the header round switch 'Round'", …)                     // banner contém "Round" e o radiogroup "Round"
it("puts Abrir próxima and Fechar turno at the top of the queue", …)
it("titles the queue round switch 'Round' on a portrait phone", …)
it("shows the Partida tab with Nova cena, coming-soon groups and Encerrar partida", …) // checkboxes desabilitados com os dois textos; dois "Em breve"
```
  Ajuste os testes existentes que procuravam esses botões com `getAllByRole(...)[0]`/no header: agora há uma instância só (Fila ou Partida). Os testes de comportamento ("F8: com turno aberto, Nova cena fica desabilitado", "Encerrar partida" bloqueado/diálogo, "Abrir próxima") continuam, abrindo antes a aba certa.
- [ ] **Step 2:** Rode → FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** `npx vitest run src/pages/__tests__/GameMasterPage.test.tsx src/features/match/combat` → PASS; `npx tsc -b`.
- [ ] **Step 5: Commit** `feat(match): round switch labelled in the header, turn controls in the queue and the Partida tab`

---

### Task 5: Página do mestre no layout novo

**Files:**
- Modify: `src/pages/GameMasterPage.tsx`
- Test: `src/pages/__tests__/GameMasterPage.test.tsx`

**Interfaces:**
- Consumes: `useMatchLayout`, `queueIsSplit` (T1); `useStageOverlays({ panelFixed: true })` (T2); props `queue`, `panelHalf`, `sheet`, `sheetOpen`, `onDismissSheet`, `RailNavItem.pressed` (T3); `QueueHeader`, `TurnControls`, `MatchTabPanel` (T4).
- Comportamento (seção de decisões é a referência):
  - `type MasterSection = "fila" | "agir" | "personagens" | "partida"`; estado `section` (inicial `"fila"`). `split = queueIsSplit(layout)`. Seção mostrada no painel: com `split`, `section` se for `"agir" | "partida"`, senão `"agir"`; sem `split`, `section`.
  - `rail`: sem `split` os 5 itens (ordem e ícones da seção de decisões, badge da fila em "Fila"); com `split`, Agir · Ficha · Partida. "Ficha" com `pressed={sheetOpen || sheetWaiting}`; os outros pelo `active`.
  - `panel`: `arranging ? <ArrangePanel…/> : conteúdo da seção` — Fila (`ReactionPanel` + `QueueHeader` + `QueuePanel`), Agir (como hoje), Personagens (o mesmo elemento `MatchCharactersSidebar` do Histórico — extraia para uma variável e use nos dois lugares), Partida (`MatchTabPanel`). Com `split`, a Fila vai no slot `queue` e nunca no painel.
  - `panelOpen` sempre `true` (`panelFixed`); `panelHalf` sempre `true` (o template só aplica abaixo de 768); `panelDismissible={false}`. A aba Ficha sai do `panel` e `panelWide` sai do mestre.
  - Ficha: estados `sheetOpen`, `sheetWaiting`, `lastCharacterId`. `lastCharacterId` muda ao tocar numa peça (qualquer ramo do `handlePieceTap`), em `chooseActor(id)` com id e no "ficha" do card de Personagens. Tocar em "Ficha": aberta → fecha; esperando → desiste; com `lastCharacterId` → abre nele (`sheetId = lastCharacterId`); sem → `sheetWaiting = true`. Com `sheetWaiting`, tocar numa peça abre a ficha dela e não faz mais nada; tocar em slot/parede desiste. Com a ficha aberta, todo toque no mapa (peça, slot, parede, segurar) só fecha a ficha. `onDismissSheet` fecha. Entrar no Arrumar fecha a ficha e desiste da espera. O card de Personagens abre a ficha (como hoje) e fecha a gaveta se for gaveta.
  - `sheet={<MatchSheetPanel token sheetUuid={sheetId} liveHp emptyHint/>}`.
  - Apague `sheetVisible` e seus ramos (o toque na peça com a Ficha visível, o `onPieceLongPress`/`highlightHoverSlot`/`onSlotClick` condicionados a ela); os mesmos props passam a depender de `!sheetOpen`.
  - `pickMapHint`: some o ramo da Ficha visível; `sheetWaiting` → `${verb} numa peça para ver a ficha.` (depois das dicas dos modos, antes da dica de reação).
  - `reactionSectionShown = split || section === "fila"`; `showReactionSection` só troca a seção quando não há `split`.
  - Todo `setRailActive("agir")`/`setPanelOpen(true)` de hoje vira `setSection("agir")`.
- [ ] **Step 1: Write the failing tests** (jsdom = celular em pé; para os outros tamanhos, mocke `matchMedia` como na Task 1 dentro do `it`):

```ts
it("keeps the master panel open on a portrait phone with Fila first", …)            // match-panel data-open true; Fila ativa
it("lists Fila, Ficha, Agir, Personagens and Partida in the phone navigation", …)  // ordem
it("shows the characters list in the Personagens section", …)
it("opens the sheet on the last touched piece", …)                                 // toca peça → Ficha → match-sheet-zone data-open true com a ficha dela
it("waits for a piece when Ficha is tapped with nothing touched", …)               // Ficha → dica "Toque numa peça para ver a ficha." + Ficha aria-pressed; toca peça → abre
it("gives up waiting when the empty map is tapped", …)
it("closes the sheet on a map tap without choosing an actor", …)                  // ficha aberta, toca NPC → ficha fecha; Agir por continua sem ator
it("closes the sheet when entering Arrumar", …)
it("renders the queue in its own zone with Agir first once the queue splits", …)  // mock 1400×900: match-queue presente, rail Agir·Ficha·Partida, painel = Agir
it("falls back to one section at a time on a short landscape phone", …)           // mock 844×330 landscape: sem match-queue, 5 itens
it("keeps the sheet open on the same character across a layout change", …)        // Review Focus 1
it("hides the reaction hint while the split queue is on screen", …)               // Review Focus 4
```
  Reescreva os testes antigos que dependiam da Ficha no painel ("D3: com a Ficha aberta, tocar numa peça mostra a ficha dela", `data-wide`, "Painel fechado ao abrir em tela estreita: abre a Fila pela aba do rail") para o comportamento novo; não apague cobertura de comportamento que continua existindo.
- [ ] **Step 2:** Rode → FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** `npx vitest run src/pages/__tests__/GameMasterPage.test.tsx src/pages/__tests__/GamePage.test.tsx` → PASS; `npx tsc -b`.
- [ ] **Step 5: Commit** `feat(match): master table layout — fixed queue, five-item phone navigation and the sheet as sheet/box`

---

### Task 6: Página do jogador no layout novo

**Files:**
- Modify: `src/pages/GamePlayerPage.tsx`
- Test: `src/pages/__tests__/GamePlayerPage.test.tsx`

**Interfaces:**
- Consumes: `useMatchLayout` (T1), `useStageOverlays()` (T2), props `sheet`/`sheetOpen`/`onDismissSheet`/`RailNavItem.pressed` (T3).
- Comportamento:
  - `sheetAsZone = layout.phonePortrait || layout.wide`. Com `sheetAsZone`, "Ficha" abre/fecha a ficha (estado `sheetOpen`) no slot `sheet` com a ficha do próprio personagem; no celular em pé abrir a folha fecha o painel de Ação; "Ação" continua abrindo/fechando o painel. "Ficha" com `pressed={sheetOpen}`, "Ação" com `pressed={panelOpen && railActive === "acao"}`. Sem `sheetAsZone`, tudo como hoje (a ficha no painel, `panelWide` como hoje — o template já trata as larguras).
  - Ficha aberta: todo toque no mapa só a fecha (mesma regra do mestre). `onDismissSheet` fecha.
  - Ao trocar de tamanho com a ficha aberta, ela continua aberta: no painel (`railActive = "ficha"`, `panelOpen = true`) quando sai de `sheetAsZone`, e no slot quando entra.
- [ ] **Step 1: Write the failing tests:**

```ts
it("opens the player's own sheet as a bottom sheet on a portrait phone", …)  // match-sheet-zone data-open true; match-panel fechado
it("closes the bottom sheet from the close button, the map and the Ficha item", …)
it("keeps the Ação panel independent from the sheet on widescreen", …)        // mock 1920×1080: painel de Ação aberto + ficha aberta juntos
it("keeps the sheet in the panel on a regular desktop", …)                     // mock 1400×900: Ficha → match-panel com a ficha, sem sheet zone aberta
```
  Ajuste os testes de hoje que abriam a Ficha no painel em tela estreita.
- [ ] **Step 2:** Rode → FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** `npx vitest run src/pages/__tests__/GamePlayerPage.test.tsx` → PASS; `npx tsc -b`.
- [ ] **Step 5: Commit** `feat(match): player sheet as bottom sheet on phones and as a box on widescreen`

---

### Task 7: Documentação

**Files:**
- Create: `docs/dev/match/layout-da-mesa.md`
- Modify: `CLAUDE.md` (seção "Feature: match combat": uma frase apontando o doc novo), `docs/dev/match/combate-polimento-mesa.md` (onde fala de `masterPanelDismissible`: o painel do mestre agora é fixo; aponte para o doc novo)

- [ ] **Step 1:** Escreva `layout-da-mesa.md` em PT: a tabela de larguras, como o celular deitado é reconhecido (altura) e por quê, quem decide o quê (template × `useMatchLayout` × página), a pilha de camadas (z-index), as regras da ficha (folha × caixa, de quem é, espera, fechar), o Histórico em coluna e o que ficou para a F2. Curto: é referência, não narrativa.
- [ ] **Step 2:** `npm run lint` e `npx vitest run` completo → tudo verde.
- [ ] **Step 3: Commit** `docs(match): table layout by role and screen size`
