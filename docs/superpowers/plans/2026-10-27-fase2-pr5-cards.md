# Cards e barras: zona pixel-tuned (PR 5 da fase 2) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o número das barras de HP e SP fica legível sempre, no mesmo lugar, e os números pequenos dos cards ganham um piso de tamanho, sem quebrar o equilíbrio feito à mão dos cards.

**Architecture:** o `ProgressBar` perde as duas camadas recortadas e ganha uma etiqueta só, fixa à direita, branca com contorno. Nos cards, os tamanhos em `cqi` ganham um piso com `max()`, só onde ficam abaixo dele. O portão de verificação (prints antes e depois em 17 configurações e medição de sobreposição) fica com o coordenador.

**Tech Stack:** React 19, TypeScript strict, styled-components 6 (container queries, unidades `cqi`), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-26-front-fase2-auditoria-tcc-design.md`, seções “PR 5” e “Zona pixel-tuned”. Ids: MESA-03, COR-05, A11Y-02 (cards) em `docs/audits/2026-10-auditoria-tcc.md`. Maquete aprovada: `docs/audits/2026-10-auditoria-tcc/fase2/bars.webp`, **linha D**. Também entra a pendência do PR 2: foco visível no apelido e no select de classe do `CharacterSheetHeader`.

## Global Constraints

- **Língua:** identificadores e títulos de teste em inglês; UI e comentários em português.
- **Zona pixel-tuned:** este PR é o único autorizado a mexer nela, e só nisto: o tamanho dos números dos cards (piso), o rótulo do `ProgressBar` e a cor de foco dos dois campos do cabeçalho. **Nenhum outro número muda** (posições, paddings, larguras, alturas, raios). Os diagramas (`MentalsDiagram`, `PhysicalsDiagram`, `NenPrinciplesDiagram`) não são tocados.
- Cor só por token; contorno com token existente (`colors.textOnLight`, `colors.shadowText`) ou um token novo de contorno no grupo `shadow`, apontando para cor da palette.
- Antes de cada commit: `npm run typecheck && npm run lint && npm test`. Git: confira `git branch --show-current` = `fix/ux-cards`; só `git add` e `git commit`. Mensagem em português com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Sem servidores, sem `eslint-disable`.
- **Piso legível:** `11px`. Aplica-se com `max(<valor atual>, 11px)` (ou `clamp(11px, <valor atual>, <teto atual>)` onde já houver `min()`), mantendo o valor atual onde ele já é maior.

## Desvio na execução (registrado pelo coordenador, 27/10)

O portão de prints reprovou o piso de 11 px duas vezes: (1) com o piso na classe e no Lv, a classe
encostava no Lv nos cards estreitos (199 sobreposições novas); (2) com o piso no número da barra, a
barra ficava mais alta que o card e o “90/90” saía cortado. Ficou: **Lv e EXP com piso de 10 px só em
card de 220 px ou mais; número da barra e classe sem piso; o card do lobby (cerca de 180 px) igual ao
de antes.** Abaixo do piso continuam: o número de HP/SP em todas as larguras (9,7 px num card de 256
px, legível pelo contraste novo), Lv e EXP abaixo de 220 px e a classe. Pendente do designer: o card
estreito do lobby só ganha números maiores redesenhando o card.

## Decisões deste plano

1. **Contorno nítido**, não sombra difusa: `text-shadow` em quatro direções de 1 px (ou `paint-order: stroke fill` com `-webkit-text-stroke` fino) na cor `textOnLight`. A sombra difusa da EXP (`1px 1px 4px shadowText`) fica como está na EXP; a barra usa o contorno nítido, que é o que a linha D mostra.
2. **Piso de 11 px** (Global Constraints): é o menor tamanho que ainda lê num projetor a 1–2 m; 12 px empurraria demais os cards estreitos.
3. **Fonte do número da barra:** `fonts.display` (hoje a Roboto), saindo do `"Oswald"` literal — a parte do TIP-02 que ficou para cá. O guardião `noRawFonts` perde a isenção do `ProgressBar`.

## Review Focus

1. **Barra em 0%** e **barra em 100%**: o número fica no mesmo lugar e legível nos dois extremos. Teste na tarefa 1.
2. **Card estreito** (barra lateral da partida em 768 px): o piso não faz o número da EXP encostar no “Lv”. Verificação do coordenador (medição de caixas).
3. **Zoom de 150%**: nada sai do card. Verificação do coordenador.
4. **`max` atual 32/32 com quatro dígitos** (ex.: 1000/1000): cabe na barra. Teste visual do coordenador.
5. **Foco no apelido e na classe** em modo de edição: visível sem mudar tamanho. Verificação no navegador.

---

### Task 1: Número da barra fixo, branco com contorno (MESA-03, COR-05, TIP-02 do rótulo)

**Files:**
- Modify: `src/components/ions/ProgressBar.tsx`, `src/styles/__tests__/noRawFonts.test.ts` (tirar a isenção do `ProgressBar`)
- Test: o teste do `ProgressBar` (crie `src/components/ions/__tests__/ProgressBar.test.tsx` se não houver; é um ion com lógica própria)

**Interfaces:**
- A API do `ProgressBar` não muda (`current`, `max`, `min`, `color`, `backgroundColor`).

- [ ] **Step 1: Testes.** `"renders a single label with current/max"` (uma ocorrência de `"7/20"`, não duas); `"keeps the label at the right regardless of the fill"` (o elemento do rótulo não recebe `left`/`width` que dependa da porcentagem — afira pelo estilo calculado ou pela ausência das camadas de recorte); `"keeps progressbar semantics"` (`role="progressbar"` e os `aria-value*`).
- [ ] **Step 2: Rode e veja falhar.**
- [ ] **Step 3: Implemente.** Saem `TrackClip`, `FillClip` e o segundo `Label`. Uma etiqueta só, à direita (`text-align: right` / `justify-content: flex-end`, com o mesmo `padding-right` de hoje), branca (`textPrimary`) com o contorno da decisão 1, fonte `fonts.display`, **o mesmo `font-size` em `cqi` e o mesmo peso de hoje**. A altura da barra tem de continuar a mesma (hoje ela vem da etiqueta em fluxo — mantenha a etiqueta em fluxo). Apague o bloco comentado antigo do `Label`.
- [ ] **Step 4: Rode e commite** — `fix(ui): número da barra fixo à direita, branco com contorno`.

### Task 2: Piso legível nos números dos cards e foco no cabeçalho (A11Y-02, pendência do PR 2)

**Files:**
- Modify: `src/components/molecules/CharacterSheetHeader.tsx` (zona: só `font-size` dos números de classe, Lv, EXP e o foco dos dois campos), `src/components/atoms/CharacterExpBar.tsx`, `src/components/ions/ProgressBar.tsx` (o rótulo), `src/components/ions/ExpBar.tsx` se o número dele ficar abaixo do piso nos cards

**Interfaces:** nenhuma nova.

- [ ] **Step 1: Liste** no relatório cada `font-size` de texto dentro do card (`CharacterSheetHeader` em `headerMode` de card, `CharacterExpBar`, `HpBar`/`SpBar` → `ProgressBar`), com o valor atual e o tamanho resultante em px num card de 256 px de largura e num de 180 px (a conta é `cqi × largura / 100`).
- [ ] **Step 2: Aplique o piso** de 11 px só nos que ficam abaixo dele, pela regra dos Global Constraints. Não mude nenhum outro valor.
- [ ] **Step 3: Foco.** `NicknameInput` e `CharacterClassSelect` (hoje `outline: none` sem foco visível): no `:focus-visible`, só cor — por exemplo a borda inferior/contorno em `colors.actionHighlight` se já houver borda, ou `box-shadow: 0 0 0 2px ${colors.actionHighlight}` — sem mudar dimensão nenhuma.
- [ ] **Step 4: Rode e commite** — `fix(ui): piso legível nos números dos cards e foco no apelido e na classe`.

---

## Portão de verificação (coordenador, antes do PR)

- Prints antes (já tirados da `main`) e depois, com `zone-shots.mjs`: cards da campanha, partida, lobby, mesa (aba Personagens) e o cabeçalho e os diagramas da ficha, em 320 a 1920 px e zoom de 80 a 150%.
- Script que mede as caixas dos textos de cada card: nenhuma sobreposição entre textos e nenhum texto fora do card.
- Diagramas: idênticos pixel a pixel.
- Se algo encostar ou ficar estranho: parar e mostrar ao dono do produto antes de abrir o PR.
