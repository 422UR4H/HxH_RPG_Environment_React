# Fundação: tipografia, foco, aba e tokens (PR 2 da fase 2) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** acabar com a serifada e com a Oswald que nunca carrega, dar ao produto um anel de foco só, um favicon e títulos de aba, e corrigir quatro cores de contraste e de papel.

**Architecture:** a fonte passa a ser declarada uma vez, no `body` do reset, e todo o resto herda. O anel de foco também vive no reset, com especificidade zero (`:where`) e a cor numa variável CSS (`--focus-ring`) que superfícies claras redefinem. Os títulos de aba saem de um hook pequeno que cada página chama.

**Tech Stack:** React 19, TypeScript strict (`verbatimModuleSyntax`), styled-components 6, react-router 6, Vitest + Testing Library + MSW.

**Spec:** `docs/superpowers/specs/2026-10-26-front-fase2-auditoria-tcc-design.md`, seção “PR 2” e “Zona pixel-tuned”. Ids e locais dos achados em `docs/audits/2026-10-auditoria-tcc.md` (TIP-01, TIP-02, A11Y-01, HALO-01, FAV-01, FAV-02, COR-02, COR-03, COR-06, COR-07).

## Global Constraints

- Cor só por token de `src/styles/tokens.ts`. Token semântico novo aponta para cor que já existe na `palette`, num grupo fechado, com um comentário dizendo o papel (`src/styles/CLAUDE.md`). Cor fora da `palette`: **pare e reporte**.
- `import type` para tipos; sem `any`. Textos e comentários em português; reticência é `…`.
- Antes de cada commit: `npm run typecheck && npm run lint && npm test` passando (lint com zero warning).
- Git: só `git add` dos arquivos da tarefa e `git commit`, no branch `fix/ux-fundacao`. Nada de `stash`, `checkout`, `reset`, `rebase` ou `push`. Mensagem no estilo do repo (`fix(ui): …`, em português), terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Não suba, mate nem reinicie servidores. Não rode `dev-checkout.sh`. Não mexa nas worktrees `end-match`.
- **Zona pixel-tuned** (`CharacterSheetHeader.tsx`, `MentalsDiagram.tsx`, `PhysicalsDiagram.tsx`, `NenPrinciplesDiagram.tsx`): nenhuma linha muda neste PR, nem as declarações de fonte.
- O rótulo do `ProgressBar` (`src/components/ions/ProgressBar.tsx`) continua com `"Oswald", sans-serif` literal: ele aparece dentro dos cards da zona e é reescrito no PR 5.
- Nome do produto: **System X System**. Separador dos títulos de aba: ` · ` (espaço, ponto médio, espaço).

## Decisões deste plano (o porquê, para quem revisa)

1. **Controles herdam só a família (`font-family: inherit`), não o `font` inteiro.** A spec e o relatório dizem `font: inherit`. Isso também faria os botões e campos sem `font-size` próprio trocarem os 13,33 px do navegador pelo tamanho do pai, e o `line-height: 1` do `body`: mudança de tamanho que ninguém pediu, a semanas da banca. A família resolve a serifada, que é o problema.
2. **Saem também os `font-family: ${fonts.sans}` repetidos**, não só os literais: “declarada uma vez só” vale para os dois, e deixá-los mantém o padrão de forçar fonte em cada elemento. Ficam só onde um ancestro do mesmo componente declara `fonts.display` (o filho precisa voltar à sans se o designer um dia trocar a display), no atalho `font: 12px ${fonts.sans}` do `ActionBalloon` (o atalho define tamanho e peso juntos) e na zona pixel-tuned.
3. **`fonts.display` recebe a mesma pilha da `sans`**, como valor próprio: o papel continua existindo para o designer trocar depois.
4. **Anel global com especificidade zero (`:where`)**: qualquer regra de componente vence sem depender da ordem de injeção dos estilos, que o styled-components não garante entre o global e os componentes.
5. **Títulos de aba: o nome mais específico primeiro** (a tabela da tarefa 3). Enquanto o nome do recurso carrega, a aba mostra só a parte fixa.

## Review Focus

1. **Botão ou campo que muda de tamanho ou de fonte** depois da troca do reset (um controle sem `font-size` próprio, um filho de elemento com `fonts.display`). A tarefa 1 lista no relatório cada `font-family` removida por arquivo; a verificação no navegador compara antes e depois.
2. **Foco invisível:** um `outline: none` que sobra num botão, link ou controle próprio sem foco equivalente. A tarefa 2 entrega a tabela de todos os `outline: none|0` com o destino de cada um.
3. **Anel de foco aparecendo no clique do mouse** em campo de texto, área de texto ou select. Teste na tarefa 2.
4. **Título de aba velho**: a página seguinte herdando o título da anterior, ou o título ficando com “undefined”. Testes na tarefa 3.
5. **Zona pixel-tuned mudando** por herança (um filho dela que perdeu a fonte própria). A verificação final compara prints de antes e depois, pixel a pixel.

---

### Task 1: Fonte uma vez só (TIP-01, TIP-02)

**Files:**
- Modify: `src/styles/ResetStyle.ts`, `src/styles/tokens.ts` (objeto `fonts`)
- Modify: todo arquivo de `src/` com `font-family` de Roboto, Oswald ou Lato, literal ou por `${fonts.sans}`, fora da zona pixel-tuned e do `ProgressBar` (o `grep` do passo 3 lista; hoje são cerca de 80 arquivos)
- Modify: `src/components/templates/MatchStageTemplate.tsx` (contorno das linhas 106-116), `src/components/templates/PageState.styles.ts` (contorno `& *` do `Shell`)
- Create: `src/styles/__tests__/noRawFonts.test.ts`

**Interfaces:**
- Produces: `fonts.sans` = `fonts.display` = `'"Roboto", system-ui, -apple-system, "Segoe UI", Arial, sans-serif'` (dois valores escritos, não um alias). Nenhuma tarefa seguinte declara `font-family` para Roboto.

- [ ] **Step 1: Escreva o guardião `noRawFonts.test.ts`** no molde de `noRawColors.test.ts` (mesmo `import.meta.glob`, mesma lista `PIXEL_TUNED`, mesmo jeito de isentar testes). Regra: fora de `src/styles/tokens.ts`, da zona pixel-tuned e de `src/components/ions/ProgressBar.tsx`, nenhum arquivo de `src/` contém o nome de fonte `Roboto`, `Oswald` ou `Lato` entre aspas (`/["'](?:Roboto|Oswald|Lato)["']/`). A mensagem de falha diz: “Fonte vem do body (ResetStyle). Use `fonts.display` só para o papel de título; a sans é herdada.” Um segundo caso: o texto de `src/styles/ResetStyle.ts` não contém `Lato`.
- [ ] **Step 2: Rode e veja falhar** — `npx vitest run src/styles/__tests__/noRawFonts.test.ts` → FAIL, listando os arquivos com Roboto literal e o reset com Lato.
- [ ] **Step 3: Troque a fonte de lugar.**
  - `tokens.ts`: os dois valores da Interface acima.
  - `ResetStyle.ts`: o `*` perde o `font-family: 'Lato'` (mantém `transition` e `box-sizing`). O `body` ganha `font-family: ${fonts.sans}`. Uma regra nova `button, input, select, textarea, optgroup { font-family: inherit; }` (decisão 1), com um comentário de uma linha: controles não herdam a fonte por padrão.
  - Remova cada declaração `font-family` de Roboto (literal ou `${fonts.sans}`) listada por `grep -rnE 'font-family: *("Roboto|\$\{fonts\.sans\})' src --include=*.ts --include=*.tsx`, exceto as da decisão 2. Tire o import `fonts` que ficar sem uso.
  - Oswald literal fora do `ProgressBar` (`AttributeSkillGroup.tsx:80`) vira `${fonts.display}`. Os filhos dele (`AttributeTitle`, `AttributePower`) declaram a sans, então ficam com `font-family: ${fonts.sans}` pela decisão 2; o mesmo para `NavigationCard` (`Description`, filho do cartão cujo `Title` é display: confira a árvore) e qualquer outro caso que o grep de `fonts.display` mostrar.
  - `"sans-serif"` entre aspas (`BaseButton.tsx:17`, `BaseInput.tsx:22`, `SignPagesTemplate.tsx:45`): somem com as demais (são Roboto).
  - `MatchStageTemplate.tsx`: sai o comentário das linhas 106-108 e o `font-family` do `Shell`. `PageState.styles.ts`: saem o `font-family` do `Shell`, o comentário e o bloco `& *`.
  - O comentário de `ProgressBar.tsx:59` (Oswald comentado) fica como está.
- [ ] **Step 4: Rode** — `npx vitest run src/styles/__tests__/noRawFonts.test.ts` → PASS. Depois `npm run typecheck && npm run lint && npm test` → tudo verde.
- [ ] **Step 5: Relatório.** No arquivo de relatório, uma tabela por arquivo: quantas declarações saíram e quais ficaram (com o motivo da decisão 2). Liste os pesos (`font-weight`) dos textos que usam `fonts.display` (títulos da Home, SAIR, grupos de atributo), para o coordenador conferir no navegador.
- [ ] **Step 6: Commit** — `fix(ui): fonte declarada uma vez no body, Roboto com fallback do sistema`.

### Task 2: Anel de foco único e halo só no hover (A11Y-01, HALO-01)

**Files:**
- Modify: `src/styles/ResetStyle.ts`, `src/styles/tokens.ts` (grupo `action`)
- Modify: `src/components/templates/SignPagesTemplate.tsx` (cartão branco `.form-div`)
- Modify: `src/components/ions/BackButton.tsx`, `src/components/atoms/LogoButton.tsx`
- Modify: cada arquivo com `outline: none` ou `outline: 0` (`grep -rnE 'outline: *(none|0)' src`, fora da zona pixel-tuned; hoje 15 arquivos) e cada `&:focus-visible` de componente (`grep -rn focus-visible src`; hoje 7 arquivos)
- Test: `src/styles/__tests__/focusRing.test.tsx`

**Interfaces:**
- Consumes: nada da tarefa 1 além do reset já sem `font-family` no `*`.
- Produces: variável CSS `--focus-ring` no `:root`; token `colors.actionHighlightOnLight` (→ `palette.blue700`, comentário: “anel de foco sobre superfície clara: cartão do login e do cadastro”). O PR 3 usa os dois.

- [ ] **Step 1: Escreva o teste `focusRing.test.tsx`.** Renderize `<ResetStyle />` e leia o CSS injetado (`document.head` → texto dos `<style>`). Casos:
  - `define --focus-ring no :root` — o CSS contém `--focus-ring:` com o valor de `colors.actionHighlight`.
  - `anel global com especificidade zero` — contém um seletor `:where(` com `:focus-visible` e `outline: 2px solid var(--focus-ring)` e `outline-offset: 3px`.
  - `campos de texto ficam fora do anel` — o seletor do anel exclui `input`, `textarea` e `select`, mas inclui `input[type="checkbox"]`, `input[type="radio"]` e `input[type="range"]` (afira pela string do seletor).
- [ ] **Step 2: Rode e veja falhar** — `npx vitest run src/styles/__tests__/focusRing.test.tsx` → FAIL.
- [ ] **Step 3: Implemente no reset.** `:root { --focus-ring: ${colors.actionHighlight}; }` e o anel: `:where(:not(input, textarea, select)):focus-visible, :where(input[type="checkbox"], input[type="radio"], input[type="range"]):focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 3px; }`. Comentário curto: por que `:where` (decisão 4) e por que campos de texto ficam de fora (o navegador marca `:focus-visible` neles também no clique; eles têm a borda própria).
- [ ] **Step 4: Rode o teste** → PASS.
- [ ] **Step 5: Superfície clara.** Token `actionHighlightOnLight` em `tokens.ts`. Em `SignPagesTemplate.tsx`, o `.form-div` redefine `--focus-ring: ${colors.actionHighlightOnLight};`.
- [ ] **Step 6: Inventário de `outline` e `focus-visible`.** Para cada ocorrência dos dois greps, uma decisão, registrada numa tabela no relatório (arquivo:linha → o que é → o que você fez):
  - campo de texto, área de texto ou select com foco próprio visível (borda que muda de cor): fica.
  - campo de texto sem foco próprio visível: ganha `&:focus` com `border-color: ${colors.borderFocus}` ou o token de borda de foco que o arquivo já usa (procure em `tokens.ts` o grupo `border`); se nenhum servir, reporte.
  - botão, link, aba, card ou controle próprio com `outline: none`: a linha sai, e o anel global aparece.
  - `&:focus-visible` de componente igual ao global (2 px `actionHighlight`, afastamento de 3 px: `PageState.styles.ts`, `LobbyPage.tsx`, e confira `LogoutButton`, `NavigationCard`, `ReactionButtons`): sai. Diferente de propósito (afastamento de 5 px da seta e da logo, um anel sobre fundo onde o dourado não aparece): fica, com um comentário do porquê se não tiver.
  - `img` dentro de botão com `outline: none` (`BackButton` `Arrow`): fica (o anel é do botão).
  - `LogoButton.tsx:45` é comentário: apague o bloco comentado se ele só repete o que já existe.
- [ ] **Step 7: Halo da seta (HALO-01).** Em `BackButton.tsx`: o hover (dentro do `@media (any-hover: hover)`) recebe o zoom **e** o halo (descomente o `filter`, e a transição de `Arrow` passa a `transform 0.2s ease, filter 0.2s ease`). O `:focus-visible > img` fica só com o zoom, sem halo. Reescreva o comentário do `lit` para dizer isso (sem “aguardando aprovação”). Mantenha o `outline-offset: 5px` do botão.
- [ ] **Step 8: Rode** — `npm run typecheck && npm run lint && npm test` → verde.
- [ ] **Step 9: Commit** — `fix(a11y): anel de foco único no reset e halo da seta só no hover`.

### Task 3: Favicon e título de aba (FAV-01, FAV-02)

**Files:**
- Create: `public/favicon.svg`, `public/apple-touch-icon.png`
- Modify: `index.html`
- Create: `src/hooks/useDocumentTitle.ts`, `src/hooks/__tests__/useDocumentTitle.test.ts`
- Modify: as páginas de `src/pages/` da tabela abaixo
- Test: `src/pages/__tests__/CampaignsPage.test.tsx`, `src/pages/__tests__/MatchPage.test.tsx` (um caso cada)
- Commit também: `src/assets/images/sxs-logo-mini.svg` (o dono do produto pôs o arquivo; está sem commit)

**Interfaces:**
- Produces: `export const APP_NAME = "System X System"` e `export default function useDocumentTitle(...parts: Array<string | null | undefined | false>): void` em `src/hooks/useDocumentTitle.ts`.

- [ ] **Step 1: Teste do hook** (`renderHook`, Testing Library):
  - `junta as partes e o nome do produto` — `useDocumentTitle("Mesa", "O Grande Início")` → `document.title === "Mesa · O Grande Início · System X System"`.
  - `ignora partes vazias` — `useDocumentTitle("Mesa", undefined)` → `"Mesa · System X System"`; `useDocumentTitle()` → `"System X System"`.
  - `atualiza quando o nome chega` — `rerender` com a parte nova muda o título.
  - `volta ao nome do produto ao desmontar` — depois de `unmount`, `document.title === "System X System"`.
- [ ] **Step 2: Rode e veja falhar** → FAIL (módulo não existe).
- [ ] **Step 3: Implemente o hook** com `useEffect` dependente da string montada; a limpeza devolve `APP_NAME`.
- [ ] **Step 4: Rode** → PASS.
- [ ] **Step 5: Chame o hook nas páginas.** O nome do recurso é o que a página já mostra no cabeçalho dela (o nome da campanha, o título da partida, o nickname da ficha, o nome do mapa); enquanto ele não chega, passe `undefined`. Chame antes dos guards de retorno (regra dos hooks).

| Rota | Partes |
|---|---|
| `/` | `"Entrar"` |
| `/sign-up` | `"Criar conta"` |
| `/home` | `"Início"` |
| `/charactersheets` | `"Personagens"` |
| `/charactersheet/new` | `"Nova ficha"` |
| `/charactersheet/:id` | nickname |
| `/charactersheet/:id/edit` | `"Editar"`, nickname |
| `/campaigns` | `"Campanhas"` |
| `/campaigns/public` | `"Campanhas públicas"` |
| `/campaigns/new` | `"Nova campanha"` |
| `/campaigns/:id` | nome da campanha |
| `/campaigns/:id/edit` | `"Editar"`, nome da campanha |
| `…/npcs/new` | `"Novo NPC"` |
| `…/matches/new` | `"Nova partida"` |
| `…/matches/:matchId` | título da partida |
| `…/matches/:matchId/edit` | `"Editar"`, título da partida |
| `…/matches/:matchId/lobby` | `"Lobby"`, título da partida |
| `…/matches/:matchId/game` | `"Mesa"`, título da partida |
| `…/maps/new` | `"Novo mapa"` |
| `…/maps/:mapId/edit` | `"Editar"`, nome do mapa |
| `*` (`NotFoundPage`) | `"Página não encontrada"` |

  A rota `/dev/tactical-map-demo` fica sem título próprio. Se uma página não tiver o nome do recurso à mão (só o id), use só a parte fixa e diga no relatório.
- [ ] **Step 6: Testes de página.** `CampaignsPage.test.tsx`: `exibe o título da aba` → depois de carregar, `document.title === "Campanhas · System X System"`. `MatchPage.test.tsx`: depois de carregar, `document.title` é `"<título da partida da fixture> · System X System"`.
- [ ] **Step 7: Favicon.**
  - `public/favicon.svg`: cópia de `src/assets/images/sxs-logo-mini.svg` com o `viewBox` quadrado e a arte centralizada na vertical (o original é `0 0 683.38 395.11`; o quadrado é `0 -144.135 683.38 683.38`). Só o `viewBox` muda.
  - `public/apple-touch-icon.png`: 180 × 180, a logo centralizada com 12 px de margem, fundo preto (o iOS pinta de preto o que for transparente). Gere com `magick` a partir do `public/favicon.svg` e confira o resultado abrindo o PNG.
  - `index.html`: `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`, `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`, sem `/vite.svg`; `<title>System X System</title>`.
- [ ] **Step 8: Rode** — `npm run typecheck && npm run lint && npm test` → verde.
- [ ] **Step 9: Commit** — `feat(ui): favicon da marca e título de aba por página`.

### Task 4: Cores de contraste e de papel (COR-02, COR-03, COR-06, COR-07)

**Files:**
- Modify: `src/styles/tokens.ts`
- Modify: `src/components/molecules/ManageButton.tsx`, `src/features/sheet/AttributeSkillGroup.tsx`, `src/features/match/LobbyConnectionSidebarItem.tsx`, `src/features/match/combat/MasterControls.tsx`

**Interfaces:**
- Produces: `colors.surfaceDisabled` (→ `palette.neutral700`, comentário: “controle desativado sobre painel escuro: lobby, barra do mestre”) e `colors.textDisabledOnDark` (→ `palette.neutral300`, comentário: “rótulo de controle desativado sobre `surfaceDisabled`”; 4,2:1). Os PRs 4 e 7 usam os dois.

- [ ] **Step 1: COR-02.** `statusScheduled` passa a `palette.blue700`. Confira com `grep -rn statusScheduled src` que todo uso tem texto `textPrimary` (o `StatusPill` de `MatchHeaderSection.tsx` já tem). Se o comentário de `gold800` na `palette` diz “tag agendada”, atualize para o que sobrar usando a cor, ou deixe só o matiz se nada mais usar.
- [ ] **Step 2: COR-03.** No `ConfirmDialog` de `ManageButton.tsx`: `confirmBackground={colors.actionDestructive}` e `confirmTextColor={colors.textPrimary}`. Confira se o `ConfirmDialog` aceita cor sólida nesse prop (hoje recebe um gradiente); se o tipo ou o CSS precisar de ajuste, ajuste no `ConfirmDialog`.
- [ ] **Step 3: COR-06.** O “Lv” das perícias (`SkillLevel`) e do atributo (`AttributePower`) em `AttributeSkillGroup.tsx` passa a `colors.textMuted`.
- [ ] **Step 4: COR-07.** Os dois tokens da Interface. `KickButton:disabled` (`LobbyConnectionSidebarItem.tsx`), `SmallButton:disabled` e `PrimaryButton[aria-disabled="true"]` (`MasterControls.tsx`) trocam a `opacity` por `background: surfaceDisabled`, `border-color: surfaceDisabled` (onde houver borda), `color: textDisabledOnDark` e `filter: none`; o `cursor: not-allowed` fica. Procure no `MasterControls.tsx` outros desativados por opacidade e aplique o mesmo.
- [ ] **Step 5: Rode** — `npm run typecheck && npm run lint && npm test` → verde (o `noRawColors` tem que passar).
- [ ] **Step 6: Commit** — `fix(ui): contraste do selo agendada, exclusão destrutiva, Lv legível e desativado com token`.

---

## Verificação final (coordenador, depois das quatro tarefas)

- **Prints de antes:** tirados antes da tarefa 1, a partir deste branch ainda igual à `main`.
- **Zona pixel-tuned:** os cards (barra lateral da campanha, partida, lobby, mesa e cabeçalho da ficha) em 320, 360, 390, 412, 600, 768, 820, 1024, 1180, 1280, 1440 e 1920 px, e em 1280 px com zoom de 80, 90, 110, 125 e 150%, comparados pixel a pixel com os de antes. Diferença nos cards: parar e mostrar.
- **Fonte:** nenhum texto em serifada (lobby, selos, telas de estado, tooltip do Sair); a fonte calculada é Roboto nos controles; títulos da Home, SAIR e grupos de atributo conferidos no peso.
- **Foco:** Tab por login, home, campanha, lobby e mesa: anel dourado em botões e cards, azul no cartão branco do login; campo de texto sem anel no clique.
- **Aba:** favicon servido, títulos da tabela da tarefa 3.
- **Cores:** selo agendada, diálogo de exclusão, Lv da ficha, Expulsar desativado e a barra do mestre.
