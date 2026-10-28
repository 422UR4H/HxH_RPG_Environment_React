# Ajustes depois do teste do dono do produto (fase 2) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** corrigir o que o dono do produto achou ao testar os PRs da fase 2 em 27/10: nada truncado nem sobreposto em nenhuma largura, cabeçalho de campanha/partida/lobby limpo, ícones nítidos e controles de formulário na identidade do site.

**Architecture:** cada problema é corrigido na peça compartilhada que o causa (o `Tooltip`, o `pageHeader`, o `FormRow`, o reset), não tela a tela. Os valores abaixo saíram de protótipos medidos no navegador (CSS injetado nas páginas reais) pelo coordenador.

**Tech Stack:** React 19, TypeScript strict, styled-components 6 (container queries), Vitest.

**Base:** branch `fix/ux-ajustes` = `fix/ux-layout` (#88, que contém #86 e #84) + merge de `fix/ux-cards` (#87).

## O que o dono do produto relatou (literal, resumido)

1. O tooltip da EXP das proficiências, em tela cheia, fica maior que o card e a parte de cima é truncada; acompanha a tela, não a ficha. Qualquer outro problema desse tipo também deve ser corrigido: **informação não pode ser truncada em nenhum tamanho de tela.**
2. O “?” (ação indisponível) está muito pequeno e com a borda pixelada.
3. Na edição/criação de ficha, a EXP sobe em cima do select de classe; o select é grande demais em tela pequena e empurra o apelido para cima; margens de cima e de baixo precisam de ajuste. Sugestão dele: esconder a EXP e mostrá-la em tooltip, como nas perícias.
4. A seta Voltar fica embaçada em tela pequena; resolver no projeto inteiro o que estiver pixelado.
5. O check da “Campanha Pública” (e outros checks) está azul: deveria ser verde.
6. O ícone de calendário está preto sobre fundo escuro: deveria ser branco.
7. Selos e cabeçalho: o selo AGENDADA alinhado à esquerda dentro do bloco da data fica estranho; o título ainda vira coluna em tela pequena; a data “Iniciada em” sai da tela em tela pequena.

## Global Constraints

- **Língua:** identificadores e títulos de teste em inglês; texto de interface e comentários em português.
- Cor só por token (`src/styles/CLAUDE.md`); sem cor fora da palette.
- **Zona pixel-tuned:** só a tarefa 3 mexe em `CharacterSheetHeader.tsx`, e só nos modos `create` e `edit` (o `select`, a margem do apelido e a etiqueta da EXP). Os modos `card` e `view` não podem mudar um pixel — o coordenador compara prints antes e depois.
- Antes de cada commit: `npm run typecheck && npm run lint && npm test`. Git: `git branch --show-current` = `fix/ux-ajustes` antes de commitar; só `git add` e `git commit`. Mensagem em português com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Sem `eslint-disable`.
- **Servidores:** um Vite já roda em `http://localhost:5173` servindo este checkout (back em 5000). Não suba, não mate, não reinicie. Para conferir uma mudança no navegador, use o helper `cdp.mjs` do scratchpad do coordenador (caminho no dispatch). Se a página vier em branco com “does not provide an export named”, é cache velho do Vite: avise o coordenador.

## Review Focus

1. Tooltip perto do topo e do rodapé da tela: vira para o outro lado em vez de cortar.
2. Título com uma palavra mais larga que a coluna em 320 px: a fonte encolhe até caber; só em último caso a palavra quebra.
3. Modo `card` do cabeçalho da ficha: idêntico ao de antes.
4. Formulário em 320 px: nenhum campo nem botão além da borda.
5. Densidades 1,5×, 2,625× e 2,75×: a seta Voltar e os ícones redondos com tamanho e posição em px inteiros.

---

### Task 1: Tooltip que nunca corta, e a EXP das perícias e proficiências nele (item 1)

**Files:** `src/components/ions/Tooltip.tsx`, `src/components/ions/ExpBar.tsx` (+ testes existentes deles)

- [ ] `Tooltip` ganha `placement?: "top" | "bottom"` (padrão `"bottom"`, o comportamento de hoje). Depois de medir a bolha (o `useLayoutEffect` que já clampa na horizontal), clampar também na vertical: com `top`, a bolha fica acima do filho (`rect.top - h - 6`); se não couber (menos de 8 px do topo da janela), vai para baixo; com `bottom`, se passar do rodapé (`innerHeight - 8`), vai para cima. Teste: `"flips to the other side when there is no room"`.
- [ ] `ExpBar` deixa de ter tooltip próprio (o `Tooltip` styled com `5cqi`, absoluto dentro do card, é o que fica gigante e é cortado pelo `overflow: hidden` do card). Passa a embrulhar a barra no `Tooltip` compartilhado com `stretch`, `placement="top"` e `label={`${currExp}/${maxExp}`}`. Saem o estado, o long-press e os timers próprios (o `Tooltip` já trata hover, foco, toque e segurar). A barra precisa ser focável para o teclado (`tabIndex={0}` no elemento `role="progressbar"`). A prop `tooltipAlign` some (o `Tooltip` já se mantém dentro da tela); atualize os chamadores.
- [ ] Testes do `ExpBar` atualizados para o tooltip compartilhado (hover mostra `"7/30"`; a bolha está no `body`, fora do card).
- [ ] Commit — `fix(ui): tooltip da EXP no tooltip compartilhado, que vira de lado em vez de cortar`.

### Task 2: Cabeçalho de campanha, partida e lobby (item 7)

**Files:** `src/styles/pageHeader.ts`, `src/styles/__tests__/pageHeader.test.tsx`, `src/features/match/MatchHeaderSection.tsx`, `src/pages/CampaignPage.tsx`, `src/pages/LobbyPage.tsx`

Valores aprovados no protótipo (zero palavras partidas e zero transbordos nas 4 telas × 6 larguras):

- [ ] **Empilhado por padrão; lado a lado só com a coluna de 900 px ou mais.** `headerRow`: `display: flex; flex-direction: column; align-items: flex-start; gap: 10px;` e `@container (min-width: 900px) { flex-direction: row; justify-content: space-between; gap: 32px; }`. Sai o `flex-wrap` (é ele que deixava o título virar coluna ao lado da data).
- [ ] **Título:** `font-size: clamp(20px, 6cqi, 42px); line-height: 1.1; max-width: 100%; min-width: 0; overflow-wrap: break-word;` (com a fonte que encolhe, a quebra só acontece para uma palavra maior que a coluna inteira); no modo lado a lado, `flex: 1 1 auto`.
- [ ] **Bloco da data/selo:** empilhado: `align-items: flex-start; text-align: left; max-width: 100%;`; lado a lado (`@container (min-width: 900px)`): `flex: 0 0 auto; align-items: flex-end; text-align: right;` — o desenho original, selo à direita acima da data.
- [ ] **A data nunca sai da tela:** o valor da data (`08/06/2026 às 11:01`) com `white-space: nowrap` para não partir no meio; o rótulo (“Iniciada em:”) quebra antes dele se faltar espaço.
- [ ] Os três cabeçalhos usam esses estilos sem regra própria de alinhamento que os contradiga (tire o `align-items: flex-start` fixo do bloco da partida e os `text-align` fixos). Teste do `pageHeader` atualizado (o CSS contém o `@container (min-width: 900px)` e o `clamp(20px, 6cqi, 42px)`).
- [ ] Commit — `fix(layout): cabeçalho empilhado até a coluna caber o título ao lado da data, selo à direita no lado a lado`.

### Task 3: Cabeçalho da ficha em criação e edição (item 3)

**Files:** `src/components/molecules/CharacterSheetHeader.tsx` (zona; só os modos `create`/`edit`), `src/components/atoms/CharacterExpBar.tsx`

- [ ] **EXP por tooltip nos modos `create` e `edit`:** `CharacterExpBar` ganha `labelsInTooltip?: boolean`. Com ela, as etiquetas à direita (`Lv` e `atual / máx`) não aparecem; a barra fica embrulhada no `Tooltip` compartilhado (`stretch`, `placement="top"`), com o rótulo `Lv N · atual / máx` (ou só `atual / máx` sem nível), e focável. O cabeçalho passa `labelsInTooltip` quando `mode === "create" || mode === "edit"`. Nos outros modos, nada muda.
- [ ] **Select de classe compacto:** nos estilos do `CharacterClassSelect`, troque os valores fixos por valores que acompanham o card, com o teto de hoje: `padding: min(1.4cqi, 8px) min(8cqi, 46px) min(1.4cqi, 8px) min(2.8cqi, 16px)`, `border-width: min(0.6cqi, 4px)`, `border-radius: min(5cqi, 28px)`, `background-position: right min(2cqi, 12px) center`. O `font-size` continua `min(3.8cqi, 28px)`.
- [ ] **Margem do apelido:** `NicknameInputContainer` `margin-bottom: min(1.4cqi, 8px)` (era 8 px fixos).
- [ ] O coordenador mede depois: em 320, 360, 390, 412, 480, 600, 768, 1024 e 1440 px, nada se sobrepõe no cabeçalho de criação e edição, e os modos `card`/`view` ficam idênticos. Se, com o select compacto, ainda houver sobreposição em alguma largura, reporte com o valor medido.
- [ ] Commit — `fix(ficha): EXP em tooltip na criação e edição, select de classe proporcional ao card`.

### Task 4: Ícones nítidos e o “?” (itens 2 e 4)

**Files:** `src/components/ions/BackButton.tsx`, `src/components/atoms/LogoButton.tsx`, `src/components/ions/Logo.tsx`, o componente do ícone Expandir/Retrair (`grep -rn "Expandir" src`), os ícones `+` dos botões de criar (`grep -rn "plus.svg\|PlusIcon" src`), `src/components/molecules/BlockableButton.tsx`, `src/assets/icons/questionmark-sm.svg` (novo)

Medido pelo coordenador: a seta ficou 62% mais nítida em 1,5×, 53% em 2,625× e 36% em 2,75× com posição e tamanho arredondados para múltiplos de 4 px CSS; não muda em 1×, 2× e 3×.

- [ ] **Arredondar posição e tamanho** com a função CSS `round()`: na seta, `left`/`top: round(min(12px, 1.8vw), 4px)` e `width: round(min(136px, 20.3vw), 4px)`; na logo do cabeçalho e na do login, `width: round(<valor atual>, 4px)`; nos ícones pequenos (Expandir/Retrair, `+`), `width`/`height` `round(<valor atual>, 1px)`. Comentário curto do porquê (pixel inteiro em densidades fracionárias). Não mexa nas imagens dos cards (zona pixel-tuned).
- [ ] **“?” bem maior e com contorno nítido** (o dono achou o de 1,15em minúsculo: o anel ocupa só 69% do `viewBox` 356×359 e fica com ~12 px). Crie `src/assets/icons/questionmark-sm.svg`, cópia do `questionmark.svg` do designer com três mudanças, nada mais: `viewBox="38 58 268 256"` (recorta no anel: elipse `cx 171.71 cy 185.95 rx 122.29 ry 116.73` + meio traço), `stroke-width` do anel (`cls-2`) 18 e do contorno do glifo (`cls-1`) 9 — o coordenador renderizou as variantes e essa é a que deixa o anel nítido sem amarelar o “?”. O `HelpMark` do `BlockableButton` passa a `height: 1.5em; width: auto; min-height: 20px;` (com texto de 16 px, o anel vai de ~12 para 24 px), mantendo `flex-shrink: 0` e `margin-left: 0.4em`, alinhado ao centro do texto. Confira nos três lugares que usam o padrão (menu Gerenciar, Expulsar do lobby, compositor da mesa) que o botão não muda de altura nem o “?” encosta no texto ou na borda.
- [ ] **Texto do `Tooltip` legível:** na `Bubble` de `src/components/ions/Tooltip.tsx`, `font-size: 15px` (era 12), `padding: 6px 10px`, `max-width: min(300px, calc(100vw - 16px))`; o resto igual.
- [ ] Commit — `fix(ui): ícones em pixel inteiro e “?” maior, com traço legível`.

### Task 5: Formulários (itens 5, 6 e o transbordo achado na auditoria)

**Files:** `src/styles/ResetStyle.ts`, `src/components/molecules/FormRow.tsx`, `src/components/templates/CreateFormTemplate.tsx` (botões)

- [ ] **Check verde:** no reset, `input[type="checkbox"], input[type="radio"], input[type="range"] { accent-color: ${colors.brandAccent}; }`.
- [ ] **Calendário branco e seletor escuro:** no reset, `input[type="date"], input[type="datetime-local"], input[type="time"] { color-scheme: dark; }` (o ícone nativo fica branco e o calendário que abre fica escuro, como o site).
- [ ] **Campos que saem da tela em 320–390 px:** `FormRow` com `grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr))`; a barra de botões do formulário (`ButtonsContainer`) com `flex-wrap: wrap` e, abaixo de 480 px, botões com `flex: 1 1 100%`.
- [ ] Commit — `fix(forms): check verde, calendário claro e formulário sem transbordo no celular`.

### Task 6: Balão da EXP — só o da proficiência muda (substitui a Task 1 no ExpBar)

O dono do produto rejeitou a Task 1: os balões de atributos e perícias estavam perfeitos e mudaram; o da proficiência continuou ruim. O coordenador já devolveu `ExpBar.tsx`, `ExpBar.test.tsx` e `AttributeSkillGroup.tsx` ao original (commit `4223e3f`, idênticos a `144375f`).

**Causa medida** (`expbubble.mjs`, ficha em 320–1920 px): o balão tem `font-size: 5cqi`. Nas perícias e atributos o contêiner é a coluna (~400 px) e o texto do card também é `5cqi`, então o balão tem o tamanho do texto e nunca corta. Nas proficiências o contêiner é a seção larga (880 px em ≥ 1024), mas o texto do card para em `min(22px, 5cqi)`: o balão chega a 42 px com texto de 22 px e o `overflow: hidden` do card esconde 29 px do topo dele. Em 320/390 os dois coincidem e não corta.

**Files:** `src/components/ions/BarBubble.tsx` (novo), `src/components/ions/ExpBar.tsx`, `src/features/sheet/ProficiencyCard.tsx`, `src/components/atoms/CharacterExpBar.tsx`, `src/components/atoms/__tests__/CharacterExpBar.test.tsx`, `src/components/ions/Tooltip.tsx`, `src/components/ions/__tests__/Tooltip.test.tsx`

- [ ] **Promover o balão do `ExpBar` para `ions/BarBubble.tsx`**, sem mudar o comportamento: o mesmo estado, hover, pressão longa de 400 ms com cancelamento no `touchend`/`touchmove`, a mesma `div` envolvente (`position: relative; width: 100%; cursor: pointer;` com o `::before` `inset: -10px 0 0 0`) e a mesma bolha (`position: absolute; bottom: calc(100% + 4px)`; `align` `"center"` = `left: 50%; transform: translateX(-50%)`, `"right"` = `right: 1cqi`; `surfaceBar`, `textPrimary`, `font-weight: 600`, `border-radius: 4px`, `nowrap`, `pointer-events: none`, `z-index: 10`). Props: `label: string; align?: "center" | "right"; children: ReactNode`. Duas mudanças só: `font-size: var(--bar-bubble-font-size, 5cqi)` e `padding: 0.36em 0.6em` (o mesmo `1.8cqi 3cqi` quando a fonte é `5cqi` — perícias e atributos ficam idênticos). Exporte `export const BAR_BUBBLE_FONT_SIZE = "--bar-bubble-font-size";` com comentário: o card que tem texto de outro tamanho define essa variável com o tamanho do próprio texto.
- [ ] **`ExpBar` usa o `BarBubble`** em volta do `BarTrack`, com `label={`${currExp}/${maxExp}`}` e `align={tooltipAlign}`. O DOM fica o mesmo (a `div` envolvente é o primeiro filho do contêiner), e os testes atuais do `ExpBar` passam **sem nenhuma edição**.
- [ ] **Proficiência:** em `ProficiencyCard.tsx`, `const textSize = "min(22px, 5cqi)";` usado no `ProficiencyName`, no `ProficiencyLevel` e no `ProficiencyItem` como `${BAR_BUBBLE_FONT_SIZE}: ${textSize};`. Comentário: o balão acompanha o texto do card (sem isso, em tela larga ele dobra de tamanho e o card corta o topo).
- [ ] Commit — `fix(ficha): balão da EXP da proficiência no tamanho do texto do card`.
- [ ] **Cabeçalho da ficha em criação/edição com o mesmo balão das perícias** (pedido do dono do produto na Task 3: “como nas perícias”). Em `CharacterExpBar`, com `labelsInTooltip`, a barra fica dentro de `<BarBubble label={label} align="right">` no lugar do `Tooltip` compartilhado; o `BarBorder` mantém `role="progressbar"`, `aria-valuenow/min/max` e `aria-label="Experiência"`, sem `tabIndex` (como o `ExpBar`). Renderize a barra uma vez só (hoje o JSX dela está duplicado entre os dois ramos). O tamanho do balão é o das etiquetas que ele substitui: extraia as três regras de `font-size` do `sharedLabelStyles` (`3cqi`; `@container (max-width: 609px)` `4cqi`; `@container (min-width: 220px) and (max-width: 609px)` `max(4cqi, 10px)`, com o comentário do piso) para um helper `labelFontSize(property: string)` usado com `"font-size"` no `sharedLabelStyles` e com `BAR_BUBBLE_FONT_SIZE` no `Container`. O CSS gerado para as etiquetas não pode mudar (modos `card`/`view`, zona pixel-tuned — o coordenador compara prints).
- [ ] **`Tooltip` volta ao original:** sem consumidores de `placement`, restaure `src/components/ions/Tooltip.tsx` e `src/components/ions/__tests__/Tooltip.test.tsx` com `git show 144375f:<caminho> > <caminho>`.
- [ ] Testes do `CharacterExpBar`: as etiquetas continuam visíveis por padrão; com `labelsInTooltip` elas somem e o `mouseEnter` na `div` envolvente da barra (o `parentElement` do `progressbar`) mostra `"Lv 2 · 10 / 30"`; sem nível, `"10 / 30"`; `mouseLeave` esconde.
- [ ] Commit — `fix(ficha): EXP da criação e edição no mesmo balão das perícias`.

## Segunda rodada do dono do produto (27/10, tarde)

Pedidos: selo fixo no canto superior direito na maioria das telas (embaixo só no celular) e título com piso; sombra dos flutuantes ainda fraca; “Iniciada em” com `title` nativo e cursor de ajuda, que não funciona no toque; número das barras de HP/SP nos cards serrilhado, mal lido e descentralizado (proposta dele: degradê para um tom escuro perto do brand sob o número); nenhuma coluna lateral pode ter rolagem horizontal; “?” e o texto do tooltip maiores (Task 4).

### Task 7: “Iniciada em” no Tooltip compartilhado

**Files:** `src/features/match/MatchHeaderSection.tsx` (+ o teste da página da partida, se ele procura o `title`)

- [ ] O valor da data de início fica dentro do `Tooltip` de `src/components/ions/Tooltip.tsx` com `label={`Agendada para: ${formatDateTimeBR(match.gameScheduledAt)}`}` (o mesmo texto de hoje). O alvo precisa ser focável (`tabIndex={0}`), para teclado e toque. Saem o atributo `title`, o `cursor: help` e o `DateValueWithTooltip`; fica o sublinhado pontilhado (`text-decoration: underline dotted`), que avisa que há mais informação.
- [ ] Teste (título em inglês): passar o mouse na data mostra `Agendada para: …` num `role="tooltip"`; o elemento não tem mais `title`.
- [ ] Commit — `fix(partida): data de início com o balão do site, que funciona no toque`.

### Task 8: Cabeçalho com o selo no canto superior direito

**Files:** `src/styles/pageHeader.ts`, `src/styles/__tests__/pageHeader.test.tsx`, `src/features/match/MatchHeaderSection.tsx`, `src/pages/CampaignPage.tsx`, `src/pages/LobbyPage.tsx`

Protótipo do coordenador (`proto-S4.css`, medido nas 4 telas × 8 larguras de 320 a 1920: zero palavra partida, zero transbordo). Medidas pela coluna central (`HeaderBox` é o contêiner):

- [ ] **Ordem no DOM:** selo (se houver), título, data (se houver), filhos diretos da linha. Sai o bloco que embrulhava selo e data (`headerAside`, `DateSection`, o embrulho da data na campanha). O selo vem antes do título porque, na faixa média, ele flutua.
- [ ] **`headerRow`, coluna ≥ 560 px:** `display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "title badge" "title date"; column-gap: 32px; row-gap: 0; align-items: start;`. **340–559 px** (`@container (max-width: 559px)`): `display: flow-root`. **< 340 px** (`@container (max-width: 339px)`): `display: flex; flex-direction: column; align-items: flex-start; gap: 10px;`.
- [ ] **`headerTitle`:** `grid-area: title; font-size: clamp(26px, 5.5cqi, 42px); line-height: 1.1; font-weight: 900; min-width: 0; overflow-wrap: normal;` (ao lado do selo flutuante, `break-word` partia a palavra em vez de descê-la para a linha de baixo); < 340 px: `font-size: 22px; overflow-wrap: break-word;`.
- [ ] **`headerBadge` (novo):** `grid-area: badge; justify-self: end; margin-bottom: 8px;`; 340–559: `float: right; margin: 4px 0 4px 16px;`; < 340: `float: none; margin: 0; order: 1;`.
- [ ] **`headerDate` (novo):** `grid-area: date; justify-self: end; text-align: right;`; 340–559: `clear: both; padding-top: 10px;`; < 340: `order: 2; padding-top: 0; justify-self: start; text-align: left;`. `headerDateValue` (`nowrap`) continua.
- [ ] As três telas usam esses blocos (`styled(Badge)` com `${headerBadge}`; o rótulo da data com `${headerDate}`), sem regra própria de alinhamento que os contradiga. Teste do `pageHeader` atualizado (o CSS contém `@container (max-width: 559px)`, `float: right` e `clamp(26px, 5.5cqi, 42px)`).
- [ ] Commit — `fix(layout): selo no canto superior direito e título com piso de 26 px`.

### Task 9: Barras de HP e SP — degradê sob o número, sem contorno, centralizado

**Files:** `src/components/ions/ProgressBar.tsx`, `src/components/atoms/HpBar.tsx`, `src/components/atoms/SpBar.tsx`, `src/styles/tokens.ts`, `src/components/ions/__tests__/ProgressBar.test.tsx`, `src/features/sheet/__tests__/ProgressBar.test.tsx`

Protótipo do coordenador (`protobars.mjs`, `barink.mjs`): o branco sobre o verde do SP tem contraste 2,4; sobre `green700`, 6,1; sobre `red800`, 6,4. Mesma família de cor de cada barra, sem cor nova na palette.

- [ ] **Tokens semânticos:** `vitalHpDeep: palette.red800` e `vitalSpDeep: palette.green700`, ao lado de `vitalHp`/`vitalSp`, com comentário: o tom escuro sob o número da barra.
- [ ] **`ProgressBar` ganha `deepColor?: string`** (sem ela, o preenchimento é a cor lisa de hoje). `HpBar` passa `colors.vitalHpDeep` e `SpBar`, `colors.vitalSpDeep`.
- [ ] **Preenchimento da largura da barra, recortado no valor:** `BarFill` com `inset: 0; width: 100%; clip-path: inset(0 ${100 - pct}% 0 0); transition: clip-path 0.3s ease; font-size: 3.8cqi;` (a mesma fonte da etiqueta, para o `em` do degradê medir o número) e, com `deepColor`, `background: linear-gradient(to right, ${color} calc(100% - 8em), ${deepColor} calc(100% - 4em));`. Assim o tom escuro fica sempre sob o número, à direita, e só aparece onde há preenchimento.
- [ ] **Etiqueta:** sai o contorno de 1 px em quatro direções (serrilhado no card); fica `text-shadow: 0 0 2px ${colors.shadowText}`. Centralização: fora de `@supports`, o `padding-top: 1px` de hoje; dentro de `@supports (text-box: trim-both cap alphabetic)`, `text-box: trim-both cap alphabetic; padding-top: calc((1lh + 1px - 1cap) / 2); padding-bottom: calc((1lh + 1px - 1cap) / 2);` (a altura continua `1lh + 1px` — o card não muda de tamanho — e os algarismos ficam no meio: medido 1,7/1,7 px no card de 10 px, era 2,7/0,7).
- [ ] Testes: o `progress-fill` recorta no valor (`clip-path: inset(0 50% 0 0)` a 50%); com `deepColor`, o fundo é um `linear-gradient`; sem, a cor lisa.
- [ ] Commit — `fix(ui): número das barras sobre o tom escuro da própria cor, sem contorno e centralizado`.

### Task 10: Nenhuma coluna lateral rola na horizontal

**Files:** `src/components/organisms/CharactersSidebar.tsx`, `src/components/organisms/RulesSidebar.tsx`, `src/components/templates/DetailPageTemplate.tsx`, `src/components/templates/MatchStageTemplate.tsx`, `src/components/templates/CreateFormTemplate.tsx`, `src/components/templates/MapEditorTemplate.tsx`, `src/features/match/combat/AsideTabs.tsx`

Com `overflow-y: auto`, o navegador torna o eixo x rolável também: basta um item 1 px mais largo que a coluna (por exemplo, quando a barra vertical aparece e come a largura) para surgir a barra horizontal.

- [ ] Em cada contêiner rolável de coluna lateral desses arquivos (os que têm `overflow-y: auto`), `overflow-x: hidden;` ao lado, com um comentário: coluna lateral nunca rola na horizontal; o conteúdo é que cabe.
- [ ] Nas listas de itens dessas colunas (`CharactersList` e equivalentes), `& > * { min-width: 0; max-width: 100%; }`, para o item encolher em vez de passar da borda.
- [ ] Commit — `fix(layout): colunas laterais sem rolagem horizontal`.

### Task 11: Sombra dos flutuantes que aparece no fundo escuro

**Files:** `src/styles/bottomBar.ts` (`floatingElevation`), `src/styles/tokens.ts`, os quatro chamadores (`AdaptiveActionButton`, `BottomActions`, `ManageButton`, `SheetBottomActions`)

Protótipo do coordenador (`protoshadow.mjs`, variante C): no fundo escuro, sombra preta quase não aparece; o que separa é o aro claro e o brilho de cima, com uma sombra mais larga.

- [ ] `floatingElevation(shadow, outline, highlight)` devolve `0 3px 6px ${shadow}, 0 16px 40px ${shadow}, 0 0 0 1px ${outline}, inset 0 1px 0 ${highlight}`.
- [ ] Tokens: `shadowFloating: alpha(palette.neutral1000, 0.85)`, `borderFloating: alpha(palette.neutral0, 0.3)` e o novo `highlightFloating: alpha(palette.neutral0, 0.18)` (brilho de 1 px no topo dos flutuantes). Os quatro chamadores passam o terceiro argumento.
- [ ] Commit — `fix(ui): flutuantes com aro claro e sombra larga, visíveis no fundo escuro`.

## Terceira rodada do dono do produto (27/10, noite)

### Task 12: Número das barras nos cards — Roboto e centralizado em pixel inteiro

**Files:** `src/components/ions/ProgressBar.tsx` (+ o teste dele)

Medido pelo coordenador (`barink2.mjs`, campanha com muitos personagens): em densidade 1× todos os números ficam 1 px acima do centro — a barra tem 10,25 px (a tela pinta 10 ou 11) e o texto encaixa no pixel por conta própria. Com cap, margem e altura em pixel inteiro, 0 desvio nas 40 barras × 4 larguras em 1×; nas outras densidades, ≤ 1 px físico, como hoje. Prototipado em `proto-bars-c.css` (variante escolhida: algarismo do tamanho de hoje, igual ao Lv/EXP do card).

- [ ] Na `Label`, dentro do `@supports (text-box: trim-both cap alphabetic)` que já existe, um `@container (max-width: 315px)` (onde `3.8cqi` < 12 px: os cards e a ficha no celular) com: `--fs: 3.8cqi; --cap: max(4px, round(calc(var(--fs) * 0.745), 1px)); --pad: max(1px, round(calc((var(--fs) + 1px - var(--cap)) / 2), 1px)); font-family: ${fonts.sans}; font-weight: 700; font-variant-numeric: tabular-nums; font-size: calc(var(--cap) / 0.711); padding-top: var(--pad); padding-bottom: var(--pad);` (o `text-box` já vem do bloco de fora). Comentário: em card o número usa a Roboto do Lv e da EXP; altura do algarismo (cap), margem e barra em pixel inteiro, para a sobra ser par e o número ficar no meio (0,745 = altura do algarismo de hoje; 0,711 = cap da Roboto).
- [ ] Fora do contêiner pequeno (ficha grande) e sem `text-box` (Firefox), nada muda.
- [ ] Teste: o CSS gerado da etiqueta contém `@container (max-width: 315px)`, `font-variant-numeric: tabular-nums` e `round(`.
- [ ] Commit — `fix(ui): número da barra no card em Roboto e centralizado em pixel inteiro`.

### Task 13: Data à esquerda quando desce para baixo do título

**Files:** `src/styles/pageHeader.ts` (+ teste)

- [ ] No `headerDate`, na faixa `@container (max-width: 559px)`, `text-align: left; justify-self: start;` (só o selo fica no canto; a data, embaixo do título, encosta à esquerda, como o título). Vale para toda data dessa posição ("Agendada para", "Iniciada em", "Data Atual").
- [ ] Commit — `fix(layout): data embaixo do título encostada à esquerda`.

### Task 14: Seletor de data com a cara do site

**Files:** `src/components/molecules/DateField.tsx` (novo, + `.styles.ts` se passar de ~150 linhas), as 4 páginas (`CreateCampaignPage`, `EditCampaignPage`, `CreateMatchPage`, `EditMatchPage`, 7 campos), os testes delas, `package.json`

O seletor nativo (cinza e azul) não aceita estilo. Componente próprio com `react-day-picker` v9 (calendário acessível, teclado, locale pt-BR).

- [ ] `DateField({ id, value, onChange, withTime?, required?, disabled?, min?, max?, "aria-describedby"? })`: `value`/`onChange` no MESMO formato do input nativo de hoje (`"YYYY-MM-DD"`, ou `"YYYY-MM-DDTHH:mm"` com `withTime`), para as páginas não mudarem a lógica nem a validação.
- [ ] Campo: um botão com a aparência exata do `FormInput` de hoje (mesmos tokens, altura, borda, raio), mostrando `dd/mm/aaaa` (e ` às hh:mm`) ou o placeholder `dd/mm/aaaa`, com o ícone de calendário à direita; `aria-haspopup="dialog"`, `aria-expanded`. O `<label htmlFor>` da página aponta para ele.
- [ ] Popover abaixo do campo (acima, se não couber na janela; sem sair pela lateral), `role="dialog"`, `aria-label="Escolher data"`: `DayPicker` `mode="single"`, `locale={ptBR}`, `captionLayout="dropdown"` com mês e ano em `select` (anos de 1900 a 2100: a data da história pode ser antiga), e, com `withTime`, dois `select` (hora 00–23, minuto 00–59) embaixo. Esc e clique fora fecham e o foco volta ao campo. Largura `min(320px, calc(100vw - 32px))`; alvos de toque ≥ 40 px.
- [ ] Visual só com tokens que já existem: fundo `surfaceModal`, borda `borderInput`, raio 8 px, sombra `shadowFloating`; mês/ano `textPrimary`; dias da semana `textMuted`; dia no hover `surfaceInputHover`; dia escolhido `brandAccent` com `textPrimary`; hoje com contorno `actionHighlight`; dias de fora do mês `textFaint`; os `select` com o mesmo estilo dos `select` do site; foco pelo anel do reset.
- [ ] As 4 páginas trocam os 7 `<input type="date|datetime-local">` pelo `DateField`. Testes das páginas atualizados para escolher a data pelo componente; teste do `DateField` (títulos em inglês): mostra o valor formatado; escolher um dia chama `onChange` com `"YYYY-MM-DD"`; com `withTime`, escolher a hora mantém o dia; Esc fecha e devolve o foco.
- [ ] Commit — `feat(forms): seletor de data com a identidade do site`.

---

## Verificação final (coordenador)

Auditoria de truncamento (texto cortado por overflow e texto além da borda da tela) nas 18 telas × 6 larguras, antes e depois; protótipo do cabeçalho re-medido no código real; cabeçalho da ficha em 9 larguras nos modos de criação e edição + prints dos modos card/view comparados pixel a pixel; nitidez da seta medida de novo; tooltip da EXP em 1920, 1280, 940, 768 e 390 px; formulário com o check e o calendário.
