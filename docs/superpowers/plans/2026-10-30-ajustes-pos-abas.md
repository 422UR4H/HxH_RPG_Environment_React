# Ajustes depois das abas de pasta — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** corrigir os problemas que o dono do produto achou testando (margens dos formulários, rolagem horizontal nas gavetas, balão do "?" que some rápido, seletor que vira de lado ao rolar, espaço no "Agir por" da mesa) e trocar o select nativo de "Adicionar à partida" pelo `PillSelect`.

**Architecture:** correções na causa, nos componentes compartilhados (`CreateFormTemplate`, a coluna lateral dentro da `EdgeDrawer`, `Tooltip`, `PillSelect`), para valer em todo lugar que os usa. Branch `fix/ajustes-30-10`, empilhada sobre `fix/abas-pasta` (PR #95).

**Tech Stack:** React 19, TS strict, styled-components 6, Vitest + MSW.

**Spec:** a lista do dono do produto de 30/10 (colada na conversa), resumida em cada task com os números medidos no navegador pelo controlador.

## Global Constraints

- Código em inglês (identificadores, nomes de arquivo, títulos de teste); UI, comentários e mensagens de guardião em português.
- Cor só por token (`src/styles/CLAUDE.md`); nenhum token novo sem necessidade; nenhuma cor nova na palette.
- Não mexer na zona pixel-tuned (`CharacterSheetHeader.tsx` só pode ganhar o que a task disser — nada aqui —, `MentalsDiagram.tsx`, `PhysicalsDiagram.tsx`, `NenPrinciplesDiagram.tsx`).
- Botões flutuantes (posição, flutuar, encaixar) intactos. O padrão visual existente manda: reaproveite o componente que já existe para o mesmo tipo de elemento.
- Antes de cada commit: `npm run typecheck && npm run lint && npm test` (sem warning, sem `eslint-disable`). Git: confira `git branch --show-current` = `fix/ajustes-30-10`; só `git add` dos arquivos e `git commit`; nada de stash/checkout/reset/rebase/push. Mensagem em português com prefixo convencional (`fix(ui): …`) terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Não suba servidores.

## Review Focus

1. Gaveta de personagens aberta numa tela estreita com lista longa (barra vertical presente): nenhuma rolagem horizontal, e os cards não ficam cortados à direita.
2. Formulário em 390 e 768 px: margem esquerda = margem direita (hoje 30 × 56 px).
3. Seletor aberto perto da borda da tela e a página rolando: a lista não troca de lado.
4. Balão do "?" por toque/clique: fica 6,25 s, e some antes se a pessoa tocar ou clicar em outro lugar.
5. Mesa do mestre, painel Agir: espaço entre a última pílula de personagem e o bloco de baixo.

---

### Task 1: margens dos formulários e rolagem horizontal das gavetas

**Files:** `src/components/templates/CreateFormTemplate.tsx` (e o que ele usar), a coluna lateral que vai dentro da `EdgeDrawer` (`src/components/organisms/CharactersSidebar.tsx`, `RulesSidebar.tsx`/`UpcomingRulesSidebar.tsx`, `src/components/molecules/EdgeDrawer.tsx`), testes se houver como prender o comportamento.

**Medido no navegador (controlador):**
- Criar e editar campanha e partida, em 390 e 768 px: o `<form>` está a 30 px da borda esquerda da tela e a 56 px da direita. O form tem 30 px à esquerda e 44 px à direita dentro do pai, e o pai (`CreateFormTemplate`) ainda fica 12 px mais curto que a coluna à direita (largura 378 em 390). Em 1366 px: 37 × 49 dentro da coluna. Objetivo: as duas margens iguais em todas as larguras, sem mudar a largura útil para menos do que a menor das duas hoje (30 px) nem mexer no layout de desktop além de igualar.
- Campanha em 320–600 px, gaveta PERSONAGENS aberta com lista longa: o rolador da gaveta tem 300 px, a barra vertical come 12 px (`clientWidth` 288) e o `<aside>` dentro tem `width: 300px` fixo (padding 20/20) → 12 px de rolagem horizontal. A coluna lateral tem de ocupar a largura **útil** do rolador (sem a barra), e o rolador não deve rolar na horizontal. Verifique as outras colunas que vão em gaveta (REGRAS na campanha, na partida, no lobby e nos formulários) pelo mesmo motivo.

- [ ] Ache a causa da assimetria (padding/margem/largura que não somam igual dos dois lados) e corrija no template, não página a página.
- [ ] Faça a coluna lateral fluida dentro da gaveta (largura do contêiner, não 300 px fixos) e garanta `overflow-x` escondido no rolador da gaveta como proteção; no desktop a coluna continua com a largura de hoje.
- [ ] Teste onde der para prender (ex.: o rolador da gaveta declara `overflow-x: hidden`; o aside não declara largura fixa); a prova visual é do controlador.
- [ ] Commit `fix(ui): margens iguais nos formulários e gaveta lateral sem rolagem horizontal`.

### Task 2: balão do "?" mais demorado e seletor que não troca de lado

**Files:** `src/components/ions/Tooltip.tsx` (+ teste), `src/components/molecules/PillSelect.tsx` e `src/utils/popoverPlacement.ts` (+ testes).

- **Balão:** hoje, por toque/clique, fica `TOUCH_MS = 2500`. Passe para **6250 ms** (2,5×). Confirme que ele some antes quando a pessoa toca/clica em outro lugar ou aperta Esc; se tocar fora não fecha hoje, faça fechar (`pointerdown` fora do gatilho e do balão). Teste com timers falsos: visível em 6000 ms, some em 6250 ms; some ao `pointerdown` fora.
- **Seletor (`PillSelect`):** o efeito de posição recalcula o lado (`below`/`above`) a cada `scroll`/`resize` (`computeAttachedListPlacement`), então perto da borda, rolando rápido no sentido oposto, a lista troca de lado e no toque fecha logo depois (pisca). Regra nova: **o lado é decidido uma vez, ao abrir**; enquanto aberta, rolar e redimensionar só reposicionam e recalculam a altura **naquele lado** (a lista encolhe até o espaço que sobrar daquele lado; o fechamento quando a pílula sai da tela continua). Exponha isso na função de posição (ex.: parâmetro opcional `side` que fixa o lado) com teste unitário, e um teste do componente que abre perto do rodapé (lista em cima), simula rolagem que daria mais espaço embaixo, e espera que continue em cima.
- [ ] Commit `fix(ui): balão do "?" fica mais tempo e o seletor mantém o lado enquanto aberto`.

### Task 3: mesa do mestre — espaço no "Agir por" e NPC no seletor do site

**Files:** `src/features/match/combat/MasterControls.tsx` (+ estilos, + testes), `src/pages/GameMasterPage.tsx` se precisar.

- **Espaço:** no painel Agir, a lista de pílulas de "Agir por" (`PickerList`) encosta no bloco de baixo (o `footer`, hoje o "Adicionar à partida"). Dê a esse espaço o mesmo valor usado entre os outros blocos do painel (procure o gap já usado no `Picker`/`PanelTitle`); não invente um número.
- **Adicionar à partida:** troque o `<select>` nativo (`NpcSelect`) do `AddNpcPicker` pelo `PillSelect` (`src/components/molecules/PillSelect.tsx`, o seletor da ficha), com o nome acessível "Adicionar à partida" e o texto "Escolha um NPC da campanha" enquanto nada foi escolhido (veja como o `PillSelect` lida com valor vazio; se precisar de placeholder e ele não tiver, adicione um prop `placeholder` ao `PillSelect` sem mudar o visual de quem já usa). Mantenha o botão "Adicionar" e o comportamento (desabilitado sem escolha; ao adicionar, chama `onAdd` e limpa). O estilo da pílula sobre o painel escuro da mesa: reaproveite um estilo de pílula que já exista; se nenhum servir sobre fundo escuro, diga no relatório o que usou e por quê.
- [ ] Testes: o `AddNpcPicker` mostra o seletor com o texto de escolha; escolher um NPC e clicar "Adicionar" chama `onAdd(id)` e volta ao texto de escolha; sem escolha o botão fica desabilitado. Ajuste testes da mesa que procuravam o `<select>`.
- [ ] Commit `fix(ui): espaço no "Agir por" e NPC escolhido no seletor do site`.

### Task 4: x e − vermelhos nos botões

Pedido do dono (30/10): dois SVGs novos, o x e o − em vermelho, e todos os botões com esses ícones passam a usá-los. Os dois desenhos do designer (`x.svg`, `minus.svg`) só aparecem em botões: `CloseButton` (fechar gaveta lateral, fechar o aviso de erro da mesa) e `MinusButton` (tirar ponto nos diagramas da ficha).

**Files:**
- Create: `src/assets/icons/x-red.svg`, `src/assets/icons/minus-red.svg` — copiados **sem alteração** de `/tmp/claude-1000/-home-azzurah-Documentos-HxH-RPG-Environment-Project-System-X-System-Project/6bbef6df-6072-4536-8d66-94586a43395a/scratchpad/redicons/x-red-brilho-rosado.svg` e `/tmp/claude-1000/-home-azzurah-Documentos-HxH-RPG-Environment-Project-System-X-System-Project/6bbef6df-6072-4536-8d66-94586a43395a/scratchpad/redicons/minus-red-brilho-rosado.svg` (o controlador gerou: o mesmo desenho do designer, preenchimento `#078136` → `#db0e2f`, o `red600` da palette, e o brilho em degradê em tons rosados com as mesmas luminâncias).
- Modify: `src/components/ions/CloseButton.tsx`, `src/components/ions/MinusButton.tsx` (só o import da imagem).
- Os SVGs verdes originais ficam no repositório (desenho do designer), mesmo sem uso.

- [ ] Copie os dois arquivos, troque os dois imports, rode typecheck/lint/testes (algum teste pode procurar o caminho da imagem).
- [ ] Não toque nos diagramas da ficha (zona pixel-tuned): a troca é só dentro do ion; o desenho tem o mesmo viewBox e a mesma geometria.
- [ ] Commit `feat(ui): x e − vermelhos nos botões de fechar e de tirar ponto`.
