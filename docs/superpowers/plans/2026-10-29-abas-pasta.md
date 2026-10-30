# Abas de pasta na campanha e na partida — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** trocar a barra de abas sublinhada da campanha e da partida pela opção B do Claude Design (abas de pasta coladas num painel marrom), tirar as abas do jogador e marcar "Eventos" como "Em breve".

**Architecture:** um organism novo, `TabbedPanel`, junta a barra de abas (o `PageTabNav` atual, redesenhado) e o painel abaixo dela. As páginas trocam `<PageTabNav>` + conteúdo solto por `<TabbedPanel tabs>{conteúdo}</TabbedPanel>`; os botões flutuantes (`ActionsList`/`BottomActions`/`AdaptiveActionButton`) ficam **fora** do painel, logo depois dele.

**Tech Stack:** React 19, TS strict, styled-components 6, Vitest + MSW.

**Spec:** briefing 4 de `docs/audits/2026-10-briefings-claude-design.md` (seção "4. Abas da campanha e da partida") + a escolha do dono do produto no Claude Design: **opção B, abas de pasta**. Referência visual: `/home/azzurah/Downloads/Abas da campanha e da partida.html` (prancheta "B · …"). O Claude Design desenhou sem ver as telas reais: dele vem só a forma das abas e do painel, não o resto da página (cabeçalho, cartão do nome da campanha, fundo).

## Global Constraints

- Código em inglês (identificadores, nomes de arquivo, títulos de teste `describe`/`it`); UI, comentários e mensagens de guardião em português.
- Cor só por token de `src/styles/tokens.ts`; leia `src/styles/CLAUDE.md` antes. Tokens novos só nos grupos `surface`/`border`, nome pelo papel (nunca nome de componente nem de matiz), apontando para cores **que já estão** na `palette`, com comentário do papel. Nenhuma cor nova na palette.
- Não mexer na zona pixel-tuned (`CharacterSheetHeader.tsx`, `MentalsDiagram.tsx`, `PhysicalsDiagram.tsx`, `NenPrinciplesDiagram.tsx`).
- Botões flutuantes (Gerenciar, Criar Partida, Criar Mapa, Abrir Lobby, Entrar…): posição, flutuar e encaixar **intactos**. O encaixe não pode ficar igual ao flutuante.
- Alvo de toque de pelo menos 44 px; contraste de texto 4,5:1; nada de rolagem horizontal de 320 a 1920 px.
- Antes de cada commit: `npm run typecheck && npm run lint && npm test` (lint sem warning, sem `eslint-disable`). Git: confira `git branch --show-current` = `fix/abas-pasta`; só `git add` dos arquivos e `git commit`; nada de stash/checkout/reset/rebase/push. Mensagem em português terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Não suba servidores.

## Review Focus

1. **Botões flutuantes:** com o painel envolvendo a lista, o "Gerenciar"/"Criar Partida" ainda flutua quando a página é longa e encaixa um gap depois do painel quando é curta (verificação no navegador, não há teste).
2. **Lista vazia:** campanha sem partidas mostra um texto dentro do painel, não um painel vazio.
3. **Jogador na partida encerrada:** sem aba "Mapas", sem o aviso "Os mapas jogados nesta partida estarão disponíveis em breve.", e `?tab=maps` na URL cai em "Eventos".
4. **320 px:** "Partidas"/"Mapas" e "Eventos"/"Mapas" inteiros numa linha, sem rolagem horizontal.
5. **Foco por teclado:** o anel global continua visível nas abas (o painel não o corta).

---

### Task 1: `TabbedPanel` e a página da campanha

**Files:**
- Modify: `src/styles/tokens.ts` (tokens novos, abaixo)
- Modify: `src/components/organisms/PageTabNav.tsx` (forma de pasta)
- Create: `src/components/organisms/TabbedPanel.tsx`
- Modify: `src/pages/CampaignPage.tsx`
- Modify: `src/features/campaign/MatchItem.tsx`, `src/components/molecules/MapCard.tsx` (fundo dos cards dentro do painel)
- Modify: `src/components/CLAUDE.md` (citar `TabbedPanel` na lista de organisms)
- Test: `src/pages/__tests__/CampaignPage.test.tsx`

**Interfaces:**
- Produces: `TabbedPanel({ tabs, children }: { tabs: { id: string; label: string }[]; children: ReactNode })`, default export de `src/components/organisms/TabbedPanel.tsx`. Com 2+ abas desenha a barra (`PageTabNav`) colada no painel; com 1 aba, só o painel (cantos todos arredondados). Exporta também `TabPanelHeading` (título de seção dentro do painel: `h2` em linha com espaço para um selo ao lado) e `TabPanelNote` (linha de descrição em `textMuted`), usados na Task 2.
- `PageTabNav` continua lendo e escrevendo `?tab=` e continua retornando `null` com 1 aba; os botões continuam `<button>` com o nome visível igual ao rótulo (os testes acham por `getByRole("button", { name: "Mapas" })`).

**Tokens novos** (em `colors`, com comentário do papel; nomes podem ser ajustados dentro das regras):
- `surfaceTabPanel: palette.brown700` — painel das abas de pasta e a aba ativa, que se funde a ele
- `surfaceTabInactive: palette.brown900` — aba de pasta inativa
- `surfaceTabInactiveHover: palette.brown850` — aba inativa sob o ponteiro
- `surfaceTabItem: palette.brown900` — card dentro do painel das abas (partida, mapa)
- `surfaceTabItemHover: palette.brown850` — card dentro do painel sob o ponteiro
- `borderTab: palette.neutral1000` — traço das abas de pasta e do painel

**Forma (da opção B):**
- Painel: fundo `surfaceTabPanel`, borda de 3 px `borderTab`, raio 12 px, padding 12 px (16 px a partir de 768 px de largura de coluna, se a página já usar esse corte). Com abas em cima, o canto superior esquerdo é reto (0).
- Abas: em linha, encostadas à esquerda do painel, 6 px entre elas; altura mínima 44 px; padding horizontal 20 px; texto 16 px, 700; raio 12 px só nos cantos de cima; borda de 3 px `borderTab` em cima e dos lados, **sem** borda embaixo.
  - Ativa: fundo `surfaceTabPanel`, texto `textPrimary`; desce 3 px sobre a borda de cima do painel (cobre o traço e se funde ao painel) e fica por cima dele (`z-index`).
  - Inativa: fundo `surfaceTabInactive`, texto `textMuted`, 4 px mais baixa que a ativa (o topo começa mais abaixo), apoiada no traço do painel; hover: fundo `surfaceTabInactiveHover`, texto `textPrimary`.
- O anel de foco global (`actionHighlight`) tem de aparecer inteiro na aba focada.

**CampaignPage:**
- Mestre: `<TabbedPanel tabs={availableTabs}>` envolve só a lista da aba ativa (`MatchesList` ou `MapsGrid` com seus textos de carregando/vazio). `ActionsList`, `deleteError`, `NickConflictMessage` e a `ActionsList` do "Criar Mapa" ficam **depois** do `TabbedPanel`, na mesma ordem e com o mesmo `$gap` de hoje.
- Jogador (1 aba): o mesmo `TabbedPanel`, que fica sem barra, e dentro dele `<TabPanelHeading>Partidas</TabPanelHeading>` antes da lista.
- Lista de partidas vazia: `Nenhuma partida ainda.` dentro do painel (mesmo estilo do `MapsEmptyText`).
- `MatchItem` e `MapCard` passam a usar `surfaceTabItem` / `surfaceTabItemHover` no fundo (eles só aparecem dentro do painel). A borda de 1 px do `MapCard` fica.
- Apague de `PageTabNav` o que deixou de ser usado (`borderDivider` na base, sublinhado verde).

- [ ] **Step 1: testes que falham** em `CampaignPage.test.tsx` (títulos em inglês, na mesma `describe` das abas):
  - `it("shows the 'Partidas' heading inside the panel for a player")`: renderiza como `userFixture`; `expect(await screen.findByRole("heading", { name: "Partidas" })).toBeInTheDocument()`.
  - `it("does not show the 'Partidas' heading for the master")`: como mestre, `findByRole("button", { name: "Mapas" })` e depois `expect(screen.queryByRole("heading", { name: "Partidas" })).not.toBeInTheDocument()`.
  - `it("shows an empty text when the campaign has no matches")`: campanha com `matches: []`; `expect(await screen.findByText("Nenhuma partida ainda.")).toBeInTheDocument()`.
- [ ] **Step 2:** `npx vitest run src/pages/__tests__/CampaignPage.test.tsx` — os três falham.
- [ ] **Step 3:** tokens, `PageTabNav`, `TabbedPanel`, `CampaignPage`, `MatchItem`, `MapCard`, `src/components/CLAUDE.md`.
- [ ] **Step 4:** `npx vitest run src/pages/__tests__/CampaignPage.test.tsx` passa; depois a suíte inteira, `typecheck` e `lint`.
- [ ] **Step 5:** commit `feat(ui): abas de pasta coladas num painel na página da campanha`.

### Task 2: a página da partida

**Files:**
- Modify: `src/pages/MatchPage.tsx`
- Modify: `src/features/match/MatchMapsPanel.tsx`
- Test: `src/pages/__tests__/MatchPage*.test.tsx` (o arquivo onde estão os testes de aba)

**Interfaces:**
- Consumes: `TabbedPanel`, `TabPanelHeading`, `TabPanelNote` (Task 1); `ComingSoonBadge` (`src/components/ions/ComingSoonBadge.tsx`, o selo da coluna de Regras).

**Mudanças:**
- Abas: `availableTabs` = Eventos + Mapas **só para o mestre**; o jogador fica só com Eventos (sem barra), também na partida encerrada. `?tab=maps` para o jogador cai em `events` (a lógica de `activeTab` já faz isso quando a aba não está em `availableTabs`).
- "Eventos", para todos: dentro do `TabbedPanel`, `<TabPanelHeading>Eventos <ComingSoonBadge /></TabPanelHeading>` e `<TabPanelNote>A lista do que aconteceu na partida vai aparecer aqui.</TabPanelNote>`. A `ActionsList` com `BottomActions` fica **depois** do painel, igual a hoje.
- "Mapas" (mestre): o `MatchMapsPanel` vai dentro do `TabbedPanel` quando a aba ativa é `maps`. Como o jogador não chega mais a essa aba, apague o ramo `matchEnded` do `MatchMapsPanel` (o aviso "Os mapas jogados nesta partida estarão disponíveis em breve." e o `MapsPlaceholder`) e a prop `matchEnded`, se ficar sem uso.

- [ ] **Step 1: testes que falham:**
  - `it("does not show the 'Mapas' tab to a player on an ended match")`: jogador, partida com `storyEndAt` preenchido; espera o título da partida e `expect(screen.queryByRole("button", { name: /Mapas/i })).not.toBeInTheDocument()` e `expect(screen.queryByText(/disponíveis em breve/)).not.toBeInTheDocument()`.
  - `it("shows the coming-soon events section")`: qualquer papel; `expect(await screen.findByRole("heading", { name: /Eventos/ })).toBeInTheDocument()`, `expect(screen.getByText("Em breve")).toBeInTheDocument()` e `expect(screen.getByText("A lista do que aconteceu na partida vai aparecer aqui.")).toBeInTheDocument()`.
  - Se um teste existente afirma a aba "Mapas" ou o aviso de "em breve" para o jogador na partida encerrada, ele passa a afirmar o contrário (não apague cobertura).
- [ ] **Step 2:** rode o arquivo de teste — os novos falham.
- [ ] **Step 3:** `MatchPage`, `MatchMapsPanel`.
- [ ] **Step 4:** arquivo de teste passa; suíte inteira, `typecheck`, `lint`.
- [ ] **Step 5:** commit `feat(ui): abas de pasta na partida; jogador sem abas e Eventos em breve`.

### Task 3: cards no padrão do site e vazios iguais (pedido do dono depois do teste)

O dono do produto testou o PR #95: os cards de partida e de mapa ficaram cada um com uma cara, e nenhum segue o padrão de card que o site já tem, o **card de campanha** (`src/components/atoms/CampaignCard.tsx`, listas de campanhas). Ele e o designer aprovaram o painel e a borda marrom-escura das abas; o que muda é o que vai **dentro** do painel. Também pediu vazios iguais aos da campanha nas abas da partida.

**Files:**
- Create: `src/styles/card.ts`
- Modify: `src/components/atoms/CampaignCard.tsx`, `src/features/campaign/MatchItem.tsx`, `src/components/molecules/MapCard.tsx`
- Modify: `src/components/organisms/TabbedPanel.tsx`, `src/pages/CampaignPage.tsx`, `src/pages/MatchPage.tsx`, `src/features/match/MatchMapsPanel.tsx`
- Modify: `src/styles/tokens.ts`, `src/components/CLAUDE.md`
- Test: `src/pages/__tests__/MatchPage.test.tsx` (e os outros que quebrarem por texto)

**Interfaces:**
- Produces: `cardSurface` (`css` do styled-components) em `src/styles/card.ts` — a moldura e o hover do card de campanha, com estes valores exatos, tirados do `CampaignCard` atual:
  - `background-color: colors.surfaceInput; color: colors.textPrimary;`
  - `border: 4px solid colors.borderInput; border-radius: 12px;`
  - `box-shadow: 0 4px 6px colors.shadowSoft; transition: transform 0.2s, box-shadow 0.2s;`
  - `&:hover { transform: translateY(-5px); box-shadow: 0 8px 15px colors.shadowStrong; border-color: colors.brandAccent; }`
  - `&:active { transform: scale(0.98); }`
  - O fundo **não** muda no hover.
- Produces: `TabPanelEmpty` (exportado de `TabbedPanel.tsx`): a linha de vazio/carregando dentro do painel — 16 px, `textMuted`, `display: flex; align-items: center; flex-wrap: wrap; gap: 12px` (cabe um selo ao lado). Substitui o `PanelEmptyText` da `CampaignPage` e o `MapsEmptyText` do `MatchMapsPanel`.
- Remove: `TabPanelNote` (fica sem uso) e os tokens `surfaceTabItem`/`surfaceTabItemHover` (os cards voltam a usar `surfaceInput`).

**Mudanças:**
- `CampaignCard` passa a usar `cardSurface` e mantém só o que é dele (`display`, `text-decoration`, `overflow`, `cursor`, largura, o corte de 500 px que tira as bordas laterais). **O card de campanha não pode mudar nem 1 pixel**, parado nem no hover (o controlador compara prints antes/depois).
- `MatchItem` (`MatchContainer`) e `MapCard` (`Card`) usam `cardSurface` no lugar do fundo, da borda e do hover próprios; mantêm padding, layout interno e `cursor`. A borda de 1 px do `MapCard` e o raio de 8 px saem.
- **Vazios iguais:** a lista de partidas vazia ("Nenhuma partida ainda."), a de mapas vazia ("Nenhum mapa criado ainda.") e "Carregando mapas…", na campanha e na partida, usam `TabPanelEmpty`.
- **Eventos com a mesma regra de Partidas:** o título `TabPanelHeading` "Eventos" só aparece quando não há barra de abas (jogador); para o mestre, a aba já é o título. O conteúdo é a linha de vazio com o selo: `<TabPanelEmpty>Nenhum evento ainda. <ComingSoonBadge /></TabPanelEmpty>`. Sai a frase "A lista do que aconteceu na partida vai aparecer aqui.".
- `src/components/CLAUDE.md`: registre `cardSurface` como **o** card do site (campanha, partida, mapa) e `TabPanelEmpty`.

- [ ] **Step 1: testes que falham** em `MatchPage.test.tsx` (substituem o teste "shows the coming-soon events section"):
  - `it("shows the events empty line with the coming-soon badge")`: mestre; `expect(await screen.findByText("Nenhum evento ainda.")).toBeInTheDocument()`; o selo "Em breve" está dentro do mesmo elemento da linha (`within(...)`).
  - `it("does not repeat the events heading for the master")`: mestre; espera a aba "Eventos" (`button`) e `expect(screen.queryByRole("heading", { name: /Eventos/ })).not.toBeInTheDocument()`.
  - `it("shows the events heading for a player")`: jogador; `expect(await screen.findByRole("heading", { name: /Eventos/ })).toBeInTheDocument()` e a linha "Nenhum evento ainda.".
- [ ] **Step 2:** rode o arquivo — falham.
- [ ] **Step 3:** implemente.
- [ ] **Step 4:** arquivo passa; suíte inteira, `typecheck`, `lint`.
- [ ] **Step 5:** commit `fix(ui): cards de partida e mapa no padrão do card de campanha; vazios iguais nas abas`.
