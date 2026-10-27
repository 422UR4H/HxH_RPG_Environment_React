# Datas, layout, toque e selos (PR 6 da fase 2) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** datas certas em qualquer fuso, títulos que não partem palavra, abas laterais que não cobrem conteúdo, alvos de toque de 44 px, botões flutuantes que não escondem o último card e selos com o texto centralizado de verdade.

**Architecture:** formatação de data num módulo só (`utils/date.ts`); o cabeçalho de campanha/partida/lobby decide o arranjo pela largura da coluna (container query); um ion `Badge` único para todos os selos; tokens novos de sombra para os flutuantes.

**Tech Stack:** React 19, TypeScript strict, styled-components 6 (container queries), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-26-front-fase2-auditoria-tcc-design.md`, seção “PR 6”. Ids: DAT-01, RES-01, RES-02, A11Y-03, CON-06 em `docs/audits/2026-10-auditoria-tcc.md`. Maquete dos flutuantes: `docs/audits/2026-10-auditoria-tcc/fase2/float-forte-390.webp`. **Pedido extra do dono do produto (27/10):** os selos (AGUARDANDO, LOBBY ABERTO, NPC, Morto, Aceito, Em breve, o status da partida) estão com o texto desalinhado na vertical — as maiúsculas ficam altas porque a caixa reserva espaço de descendente.

Branch `fix/ux-layout`, empilhado sobre `fix/ux-mesa` (PR 4, que está sobre o PR 7): o CON-06 mexe nos mesmos botões flutuantes que o PR 7 mudou.

## Global Constraints

- **Língua:** identificadores e títulos de teste em inglês; UI e comentários em português.
- Cor só por token; token novo aponta para a palette, com comentário do papel. Sombra nova: grupo `shadow`.
- Zona pixel-tuned e `ProgressBar`: não mexa.
- Antes de cada commit: `npm run typecheck && npm run lint && npm test`. Git: confira `git branch --show-current` = `fix/ux-layout`; só `git add` e `git commit`. Mensagem em português com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Sem servidores, sem `eslint-disable`.
- No notebook (1280 px e acima, abas fechadas), o arranjo atual do cabeçalho fica. Só mudam as telas que hoje quebram.
- Valores da maquete dos flutuantes: sombra `0 6px 18px` em preto a 60% e contorno de 1 px em branco a 14%.

## Decisões deste plano

1. **Selos:** um ion `Badge` (`src/components/ions/Badge.tsx`) com `text-box: trim-both cap alphabetic` e padding simétrico; onde o navegador não suporta `text-box` (Firefox), o padding vertical compensa (1 px a mais embaixo do que em cima, via `@supports not (text-box: trim-both cap alphabetic)`). Todos os selos passam a usá-lo (o `ComingSoonBadge` do PR 7 vira uma composição dele). Variações por props: tom (cor de fundo/texto por token), tamanho (`sm`/`md`), caixa alta ou não.
2. **Título sem partir palavra:** `overflow-wrap: normal`, `hyphens: auto` e o `lang="pt-br"` que o `index.html` já tem; tamanho com `clamp()`. O arranjo título × data vem de `@container` na coluna central.
3. **Abas laterais (RES-02):** a coluna central ganha `padding-inline` igual à largura da aba quando a aba está visível (abaixo de 1149 px), e a aba sobe só o suficiente para não encostar nos botões verdes; área de toque de 44 px com pseudo-elemento invisível.
4. **Respiro no fim da lista (CON-06):** `padding-bottom` = altura da barra de botões + 24 px, numa variável CSS que a barra define.

## Review Focus

1. **Datas perto da meia-noite UTC** (21h–23h59 em São Paulo): a data padrão dos formulários é a do dia local. Testes com `TZ=America/Sao_Paulo` na tarefa 1.
2. **Título longo sem espaço** (“REENCONTRAMOS”) em 390 px: não corta pela aba nem parte no meio. Verificação do coordenador.
3. **Selo com uma letra e com acento** (“É”, “Ç”): centralizado. Verificação do coordenador (zoom).
4. **Aba lateral aberta**: o conteúdo central não fica sob a gaveta nem pula de lugar. Verificação do coordenador.
5. **Lista curta** (um card só): o respiro do fim não cria rolagem desnecessária absurda. Verificação do coordenador.

---

### Task 1: Datas (DAT-01)

**Files:** `src/utils/date.ts` (+ teste), `src/components/atoms/CampaignCard.tsx`, `src/features/campaign/MatchItem.tsx`, `src/pages/CreateCampaignPage.tsx`, `src/pages/CreateMatchPage.tsx`; um `grep -rn "toLocaleDateString\|toISOString()" src` para achar o resto e corrigir onde for data de calendário.

**Interfaces:** `formatDateBR(iso: string): string` (já existe ou passa a existir), `todayLocalISODate(now?: Date): string` (`AAAA-MM-DD` pelo relógio local), `daysFromToday(isoDate: string, now?: Date): number` (pelas partes da data, sem fuso).

- [ ] Testes (rodando com `process.env.TZ = "America/Sao_Paulo"` no arquivo ou via config): `"formats a date-only string without shifting the day"` (`"2000-01-01"` → `"01/01/2000"`); `"uses the local day for the default form date late at night"` (`2026-10-27T23:30:00-03:00` → `"2026-10-27"`); `"counts days from the date parts"` (hoje/amanhã/em N dias). Implemente, troque os usos, rode e commite — `fix(datas): datas de calendário sem deslocar o dia`.

### Task 2: Selo único (pedido extra)

**Files:** Create `src/components/ions/Badge.tsx` (+ teste); modify todos os selos: `MatchHeaderSection` (`StatusPill`), o selo de presença do lobby (`LobbyConnectionSidebarItem`), os selos NPC/Morto/Aceito/Pendente/Recusado (`CharacterSidebarItem`, `EnrollmentSidebarItem`), o “LOBBY ABERTO” (`LobbyPage` ou onde estiver), `ComingSoonBadge`. `grep -rn "border-radius: 20px\|Pill\|Badge\|Tag" src/components src/features src/pages` para achar os outros.

**Interfaces:** `Badge({ tone, size = "md", uppercase = true, children }: { tone: BadgeTone; size?: "sm" | "md"; uppercase?: boolean; children: ReactNode })`, com `BadgeTone` mapeando para os tokens que cada selo já usa (não invente cor).

- [ ] Teste: `"renders the label with the tone colors"` e `"uses the shared trimmed text box"` (o CSS contém `text-box`). Substitua os selos um a um mantendo cor, tamanho de fonte e raio de cada um (a mudança visível é só a centralização). Rode e commite — `fix(ui): selo único com o texto centralizado na altura das maiúsculas`.

### Task 3: Cabeçalho que não parte palavra (RES-01)

**Files:** `src/features/match/MatchHeaderSection.tsx`, `src/pages/CampaignPage.tsx`, `src/pages/LobbyPage.tsx` (e o template/coluna central onde o `container-type` precisar morar).

- [ ] Troque o `@media (max-width: 750px)` do arranjo por `@container` na coluna central (largura de quebra: a que hoje corresponde a 750 px de janela com as colunas laterais — calcule e diga no relatório). Título: `clamp()` (mínimo legível, máximo = o tamanho atual do notebook), decisão 2 de quebra. Empilhado: bloco de data alinhado à esquerda e o selo de status alinhado com ele. Teste de componente onde der (classe/estilo); a prova real é do coordenador no navegador. Rode e commite — `fix(layout): cabeçalho pela largura da coluna, sem partir palavra`.

### Task 4: Abas, toque e flutuantes (RES-02, A11Y-03, CON-06)

**Files:** `src/components/molecules/EdgeDrawer.tsx`, `src/components/templates/DetailPageTemplate.tsx`, `src/components/atoms/LogoutButton.tsx`, `src/components/organisms/PageTabNav.tsx`, `src/components/molecules/FormCheckbox.tsx`, `src/components/molecules/AdaptiveActionButton.tsx`, `src/components/molecules/BottomActions.tsx`, `src/styles/tokens.ts`.

- [ ] RES-02 pela decisão 3; A11Y-03: `min-height: 44px` (ou área invisível) no Sair, nas abas Partidas/Mapas e no checkbox, sem mudar o desenho; CON-06: tokens `shadowFloating` (preto a 60%) e `borderFloating` (branco a 14%) — se a palette não tiver o preto/branco com alpha, use `alpha(palette...)` dentro de `tokens.ts` —, sombra `0 6px 18px` + contorno de 1 px nos botões flutuantes, e o respiro da decisão 4. Testes de componente onde houver comportamento (a variável do respiro). Rode e commite — `fix(layout): abas sem cobrir conteúdo, toque de 44 px e flutuantes com sombra e respiro`.

---

## Verificação final (coordenador)

Matriz da spec: 320, 360, 390, 412, 600, 768, 820, 1024, 1180, 1280, 1440 e 1920 px, com e sem as abas abertas, em campanha, partida e lobby, com o título curto e o longo; selos ampliados (zoom 4×) antes e depois; data padrão do formulário com o relógio do navegador às 23h30 de São Paulo (emulação de fuso/hora no CDP); lista com o último card visível acima dos flutuantes.
