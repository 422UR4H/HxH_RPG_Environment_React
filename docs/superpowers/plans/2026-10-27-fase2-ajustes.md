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
- [ ] **“?” maior e com contorno nítido:** crie `questionmark-sm.svg`, cópia do `questionmark.svg` do designer com a espessura do traço do anel (`stroke-width` da classe `cls-2`) e do contorno do glifo (`cls-1`) multiplicada por 6 (de 3 para 18 unidades: ~1 px num ícone de 20 px), mesmas cores e gradientes. O `BlockableButton` usa essa versão, com `width/height: 1.3em` e `min-width/min-height: 18px`, alinhado ao centro do texto. Confira nos três lugares que usam o padrão (menu Gerenciar, Expulsar do lobby, compositor da mesa) que o botão não muda de altura.
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

---

## Verificação final (coordenador)

Auditoria de truncamento (texto cortado por overflow e texto além da borda da tela) nas 18 telas × 6 larguras, antes e depois; protótipo do cabeçalho re-medido no código real; cabeçalho da ficha em 9 larguras nos modos de criação e edição + prints dos modos card/view comparados pixel a pixel; nitidez da seta medida de novo; tooltip da EXP em 1920, 1280, 940, 768 e 390 px; formulário com o check e o calendário.
