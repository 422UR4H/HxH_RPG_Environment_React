# Fase 3 — ajustes da segunda auditoria de UI/UX

**Spec:** `docs/audits/2026-10-27-auditoria-ui-ux.md` (os achados: medidas, prints, causa, onde) + `docs/audits/2026-10-27-auditoria-ui-ux-decisoes.md` (a decisão do dono do produto para cada achado — **é a autoridade**; quando o achado e a decisão divergem, vale a decisão).

**Fora deste plano:** COR-08 e NAV-03 (vão para o Claude Design, junto com NAV-02 e CON-01).

Três PRs, cada um numa branch a partir de `main`:

| PR | Branch | Tasks |
|---|---|---|
| A — lobby e editor | `fix/fase3-lobby-editor` | 1–4 |
| B — formulários, listas e login | `fix/fase3-formularios` | 5–10 |
| C — ficha | `fix/fase3-ficha` | 11–13 |

## Global Constraints

1. **Não regredir onde o problema não acontece.** É o pedido que o dono do produto mais repetiu. Cada task diz em quais larguras/casos o problema existe; em todas as outras, a tela tem de ficar visualmente idêntica à de hoje. Prova: print de **antes e depois** nas larguras afetadas **e** em pelo menos duas larguras não afetadas (anexar os caminhos no relatório).
2. **Cores só por token** de `src/styles/tokens.ts` (`colors.*`). Nada de hex/rgba/`white` em componente (o teste `noRawColors` falha). **Nenhuma cor nova na `palette`** — se parecer necessária, pare e reporte (é decisão do designer). Ler `src/styles/CLAUDE.md`.
3. **Zona pixel-tuned** (`src/components/CLAUDE.md`): não normalizar valores de lá. Ler antes de mexer em qualquer componente da ficha ou de cards.
4. **Correção na causa raiz, sem duplicar.** Se a correção pede um refactor pequeno (extrair um componente, promover um estilo), faça junto. Regra promote-don't-duplicate de `src/components/CLAUDE.md`.
5. **Idioma:** identificadores e títulos de teste em inglês; comentários, textos de UI e asserts sobre texto de UI em português.
6. **Commits:** um ou mais por task, mensagem no estilo do repo (`fix(escopo): descrição em português`), terminando com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Sem push, sem PR (o controlador abre).
7. **Gates antes de reportar:** `npm run lint`, `npm run test` e `npm run build` passando. Comportamento novo com lógica (posição de popover, `aria-expanded`, escolha de layout por props) ganha teste em vitest; estilo puro não precisa.
8. **Verificação no navegador é obrigatória** (a camada Pixi não tem teste). Use o kit descrito abaixo. **Nunca** abra lobby ou mesa com `test@`/`test2@` (derruba as abas do dono do produto): lobby e mesa só com as contas da seed (`login-mestre.json`, `login-jogador1.json`). Nas outras telas, o socket fica desligado pelo kit. **Não mate** o Vite da 5173 nem os servidores 5000/8081; não rode `dev-checkout.sh`.
9. **Sem subagentes.** O implementador não despacha agentes.

## Kit de verificação no navegador

Fica em `<workspace>/kit/` (o controlador passa o caminho). Chrome headless pelo DevTools Protocol, Node 24.

- `cdp.mjs` — `launch()`, `newPage({isolated:true})` (contexto com localStorage próprio), `page.send(cdpMethod, params)`, `page.goto(url, waitMs)`, `page.eval(expr)`, `page.shot(file)`, `page.close()`. Porta via `CDP_PORT` (use `9555` para não colidir).
- `cap.mjs` — 27 rotas × 9 larguras com as contas certas e o socket desligado onde precisa: `node cap.mjs <regexDoSlug> <larguras>` grava em `kit/shots/<slug>-<largura>.png`. Leia o topo do arquivo para os ids de campanha/partida/mapa/ficha. Ex.: `node cap.mjs '^lobby-m$' 853,390,1920`.
- `dual.mjs` — mestre e jogador da seed ao mesmo tempo (`node dual.mjs lobby` ou `game`).
- `states2.mjs`, `signstates.mjs` — exemplos de estado forçado (API pendurada, 500, lista vazia, login com erro) interceptando a rede.
- Larguras × alturas usadas: 320×568, 390×844, 768×1024, **853×533 com `deviceScaleFactor: 1.5` (projetor em 150%)**, 1024×768, 1280×800, 1366×768, 1440×900, 1920×1080. Abaixo de 768, `mobile: true`.
- Tire o print de **antes** (com `git stash` não: rode o kit **antes de editar**) e o de **depois**. Copie os pares para `<workspace>/shots/task-N/` com nomes `antes-…png` / `depois-…png`.
- Para medir, use `page.eval` com `getBoundingClientRect`/`getComputedStyle` em vez de olhar o print.
- Os tokens salvos vencem em 29/10/2026 às 12:00 (horário local). Se uma página logada cair no login, avise no relatório (não tente logar com as contas do dono do produto).

---

## PR A — lobby e editor (`fix/fase3-lobby-editor`)

### Task 1: EDI-03 — o painel da ferramenta do editor de mapa não pode virar fresta

**Achado:** EDI-03. **Decisão:** a coluna inteira rola como bloco só quando falta altura; em tela alta, idêntica à de hoje.

**Problema medido:** na coluna do editor (abas, Decorações, Desfazer/Refazer, painel da ferramenta, nome, descrição, Salvar), só o painel da ferramenta encolhe: 28 px de altura em 853×533, 4 px em 320×568, 155 px em 390×844, 292 px em 1366×768.

**Causa:** `src/features/tactical-map/MapEditorToolbar.tsx` (~linhas 312–392): `Toolbar` com altura da tela e `overflow: hidden`; `PanelArea` com `flex: 1; min-height: 0; overflow-y: auto`; `MetaSection` com altura fixa. No celular, `src/components/templates/MapEditorTemplate.tsx` dá à barra 3/5 da altura (`Sidebar` com `flex: 3`, `overflow: hidden`).

**Fazer:**
- A rolagem sai do `PanelArea` e vai para a coluna (`Toolbar`): o painel tem a altura do próprio conteúdo, e `MetaSection` vem depois dele. Use a scrollbar `earth` que o editor já usa (`scopedScrollbar(scrollbarPalettes.earth)`).
- Em tela alta, se hoje o `MetaSection` fica encostado embaixo com o painel ocupando o meio, preserve isso (ex.: o painel cresce com `flex: 1 0 auto` em vez de `flex: 1; min-height: 0`), de modo que 1366×768 e 1920×1080 fiquem idênticos.
- No celular, a parte de baixo (a barra) rola do mesmo jeito; o canvas de cima não muda.

**Pronto quando:** em 853×533 (dpr 1,5), 320×568 e 390×844, com cada ferramenta aberta (Grade, Fundo, Peças, Paredes), todos os controles do painel são alcançáveis rolando a coluna, e o painel nunca mede menos que o próprio conteúdo. 1366×768 e 1920×1080: print igual ao de antes (rotas `mapa-novo` e `mapa-editar`).

### Task 2: LOB-01 — o painel de NPCs não espreme o tabuleiro e ganha fundo

**Achado:** LOB-01. **Decisão:** o painel desce para baixo do tabuleiro quando a coluna central é estreita; fundo `colors.surfaceSidebar` (o mesmo das colunas Personagens/Regras — a decisão explica por quê).

**Problema medido:** `RosterSidebar` com `width: 220px` fixo ao lado do tabuleiro, no lobby do mestre: tabuleiro com ~245 px em 853, ~160 em 768, ~65 em 390. Sem fundo, o aviso "Todos os personagens estão no campo." (12 px, `textPlaceholder`) fica sobre o mapa-múndi com ~1,3:1 de contraste.

**Onde:** `src/features/tactical-map/TacticalMapPlacer.tsx` (~281–300, `PlacerRoot`, `RosterSidebar`); `src/components/molecules/NpcRosterPanel.tsx` (~148–153, `EmptyHint`).

**Fazer:**
- Container query no contêiner do placer (ele já mede a coluna central, não a janela): abaixo de um limiar (ponto de partida: 640 px de largura do contêiner — ajuste medindo, e registre o valor e o porquê), o painel vira faixa de largura total **embaixo** do tabuleiro. Acima, continua os 220 px à direita.
- O painel ganha fundo `colors.surfaceSidebar`, com cantos/padding coerentes com o tabuleiro ao lado. Confirme que o aviso e a busca ficam legíveis (contraste ≥ 4,5:1 do texto de 12 px contra o novo fundo; se `textPlaceholder` não alcançar, use o token de texto secundário que alcance, sem cor nova).
- O mesmo painel aparece na mesa (`GameMasterPage`) sobre fundo escuro e lá já está bom: **a mesa não pode mudar**. Se o painel é compartilhado, o fundo/disposição novos valem só onde o placer do lobby os pede (prop ou contêiner), ou prove por print que a mesa fica idêntica.

**Pronto quando:** lobby do mestre (`lobby-m`) em 853 (dpr 1,5), 768, 390, 320: tabuleiro com a largura total da coluna, painel embaixo. Em 1366, 1440, 1920: painel à direita, com fundo. Mesa do mestre (`mesa-m`) em 1366 e 390: igual a antes.

### Task 3: LOB-02 + LOB-03 — ações do lobby: sem vão, tabuleiro enquadrado, botões com hierarquia

**Achados:** LOB-02, LOB-03. **Decisões:** sem a reserva de 137 px no lobby; tabuleiro abre enquadrado e com o botão "Enquadrar" da mesa; "Cancelar Lobby" passa a secundário (menos peso que "Iniciar Partida"); botões continuam em cima; empilhados, mesma largura.

**Problema medido:**
- `src/pages/LobbyPage.tsx` (~292–312) põe os botões do mestre e o "Aguardando o mestre…" dentro de `ActionsList` (`src/components/atoms/ActionsList.tsx`), que reserva `padding-bottom: bottomBarReserve` (137 px) para os flutuantes da campanha/partida. No lobby nada flutua: sobra um vão de ~150 px antes do tabuleiro, que empurra o tabuleiro para baixo da dobra no projetor.
- O tabuleiro do lobby abre no canto de cima, sem enquadrar o mapa (peças da fileira de baixo cortadas ao meio), e o lobby não tem o "Enquadrar" que a mesa tem.
- `MasterActions` (~393–398): "Iniciar Partida" verde cheio e "Cancelar Lobby" vermelho cheio, mesmo peso. Ao quebrar, ficam com larguras diferentes (190 e 203 px em 768) e alinhados à esquerda.

**Fazer:**
- Contêiner das ações do lobby sem a reserva. Prefira a causa: a reserva é responsabilidade de quem tem flutuante — veja se `ActionsList` deve receber a reserva por prop (ou se o lobby deve usar outro contêiner) e não deixe duas versões do mesmo componente.
- Enquadrar ao abrir: reutilize o mesmo enquadramento do editor (EDI-01) e da mesa — procure em `src/features/tactical-map/` (`TacticalMapEditor.tsx`, `stage/mapCornerStyles.ts`, `GameMasterPage.tsx`/`GamePlayerPage.tsx`, que têm "Enquadrar"). Mesmo botão, mesma posição e estilo de canto da mesa. Vale para mestre **e** jogador no lobby.
- "Cancelar Lobby" com estilo secundário que o projeto já usa para ação destrutiva secundária (procure o estilo dos botões de cancelar/excluir em formulários e no menu Gerenciar; registre qual escolheu). Contraste ≥ 4,5:1 sobre o fundo do mapa — se um botão só de contorno não alcança sobre o mapa, ele precisa de fundo. O diálogo de confirmação continua.
- Quando os dois quebram linha, ficam com a mesma largura (`flex: 1 1 100%` abaixo do ponto de quebra, como a barra de botões dos formulários da fase 2 — procure o padrão existente e reuse).

**Pronto quando:** `lobby-m` e `lobby-j` em 1920, 1366, 853 (dpr 1,5), 390: vão entre ações e tabuleiro igual ao espaçamento normal entre seções da página; tabuleiro abre mostrando o mapa inteiro; "Enquadrar" funciona (clique depois de arrastar o mapa volta ao enquadramento — prove com print). Campanha e partida (que usam `ActionsList` com flutuantes) iguais a antes em 390 e 1366.

### Task 4: MESA-07 + EST-07 — avisos que parecem avisos

**Achados:** MESA-07, EST-07. **Decisões:** MESA-07 como sugerido; EST-07: o aviso continua (é a única forma de o jogador saber), com desenho de aviso e o texto **"O mestre ainda não abriu o lobby. Tente de novo daqui a pouco."**

**MESA-07:** `src/features/match/combat/mapCanvasStyles.ts` (~10–26): `MapLoadingMessage` sem `text-align`/padding; `MapErrorMessage` tem. Mova `text-align: center` e `padding: 0 24px` para a base (`MapLoadingMessage`), e o erro herda. Verifique lobby e mesa do jogador enquanto o tabuleiro não chegou, em 320 e 390.

**EST-07:** `src/features/match/MatchHeaderSection.tsx` (~92–95) mostra o aviso com a mesma caixa marrom da descrição. Use o desenho do aviso do login (`SignNotice`, em `src/components/molecules/` ou `templates/` — procure): ícone + borda à esquerda, adaptado ao fundo escuro com o dourado `colors.actionHighlight` (já existe). Se der para reaproveitar o `SignNotice` com uma variante de tema em vez de copiar o estilo, faça (promote-don't-duplicate). Contraste do texto ≥ 4,5:1 contra o fundo real. Para ver o aviso: navegue para a página da partida com `state: { lobbyNotOpen: true }` (o `LobbyPage` faz isso ao devolver o jogador) — num script, abra a rota `/lobby` de uma partida com lobby fechado como `test2` **com o socket desligado** e simule a resposta, ou renderize o estado direto num teste. Atualize testes que assertam o texto antigo.

**Pronto quando:** prints em 390 e 1366 do aviso EST-07; prints MESA-07 em 320/390 (lobby e mesa do jogador da seed, com o tabuleiro ainda carregando — `dual.mjs` ou um script que segure a requisição do mapa).

---

## PR B — formulários, listas e login (`fix/fase3-formularios`)

### Task 5: FOR-07 — calendário preso à janela e no marrom do mundo

**Achado:** FOR-07. **Decisões:** preso dentro da janela só quando não couber de nenhum lado; fundo do popover em `colors.surfaceSidebar` (marrom mais escuro, não o dos campos); seletores de mês/ano/hora continuam com cara de campo (marrom dos campos), **não** verdes.

**Problema medido:** popover de 431 px de altura (com hora e minuto). Em 853×533 não cabe nem acima nem abaixo; abre para baixo até 782 px. É `position: fixed`, então rolar não ajuda.

**Onde:** `src/components/molecules/DateField.tsx` (cálculo de `placement`, ~68–95) e `DateField.styles.ts`.

**Fazer:**
- Posição: mantém a regra atual (embaixo; em cima se só em cima couber). Se nenhum lado couber: `top = max(8, innerHeight - alturaDoPopover - 8)` (cobre o campo). E `max-height: calc(100dvh - 16px)` com rolagem interna como garantia. Extraia o cálculo para uma função pura e teste os três casos (cabe embaixo, só em cima, nenhum).
- Cor: fundo do popover → `colors.surfaceSidebar`. Confira o contraste de todo texto do calendário (dias, dias da semana, rótulos de hora, "Limpar") contra o novo fundo, e o dia selecionado (verde) e o anel dourado. Seletores de mês/ano/hora: o marrom de campo que já usam (`surfaceInput` + `borderInput`), conferindo que se distinguem do novo fundo.

**Pronto quando:** `partida-nova`/`partida-editar`/`campanha-nova` com o calendário aberto em 853×533 (dpr 1,5): tudo alcançável, "Limpar" e hora visíveis. 390×844 e 1366×768: mesma posição de hoje (só a cor do fundo muda).

### Task 6: HIER-01 — no celular, o título volta a ser o maior texto

**Achado:** HIER-01. **Decisão:** os tamanhos só mudam abaixo da largura em que a inversão acontece. **Acima, valores idênticos aos de hoje** — nada de `clamp` contínuo que encolha nas larguras boas.

**Problema medido:** título da página encolhe com a tela (40 px no desktop, 22 px em 320), mas rótulos dos formulários ficam em 26 px e campos em 24 px; o subtítulo em itálico da campanha/partida fica em 26 px. Em 320 o rótulo "Nome da Campanha" passa o título; os exemplos dos campos cortam ("Digite o nome da s", "Digite o título da pa").

**Onde:** `src/components/molecules/FormField.tsx` (rótulo); `src/components/ions/FormInput.tsx`, `FormTextArea.tsx`; subtítulo em `src/pages/CampaignPage.tsx` (~217) e `src/features/match/MatchHeaderSection.tsx`; título em `src/styles/pageHeader.ts`.

**Fazer:**
- Meça primeiro: em quais larguras de coluna (container) rótulo > título e subtítulo > título. Isso define o limiar (registre).
- Abaixo do limiar, rótulo, texto do campo e subtítulo descem para uma escala que mantenha título > subtítulo/rótulo > campo. Texto de campo nunca abaixo de **16 px** (evita o zoom do iOS ao focar).
- Exemplos que ainda cortarem: encurtar ("Nome da campanha", "Título da partida").

**Pronto quando:** `campanha-nova`, `partida-nova`, `campanha`, `partida` em 320, 390 e 768: título é o maior texto; nenhum exemplo cortado. Em 1024, 1366, 1920: valores computados de `font-size` idênticos aos de antes (anexar a medição).

### Task 7: RES-03 — card de partida no celular: data como sobretítulo

**Achado:** RES-03. **Decisão:** quando a data não cabe à direita, ela vai **para cima** do título, pequena e discreta (sobretítulo); o título continua o maior texto. "Fim:" segue o fluxo do card nessa versão. Na largura em que a data cabe à direita, nada muda.

**Problema medido:** `src/features/campaign/MatchItem.tsx`: data (`MatchDate`, `position: absolute` em cima à direita) e título com `padding-right: 100px`. Em 320 e 390 o título vira uma palavra por linha. `MatchEndDate` também é absoluta embaixo à direita.

**Fazer:**
- Container query no card (`container-type: inline-size` no `MatchContainer`). Abaixo de ~360 px de card (meça e ajuste — critério: o título mais longo dos dados de teste não pode quebrar por causa da data), a data entra no fluxo **antes** do título, com o mesmo token de cor de hoje, fonte menor que o título e espaço curto até ele; o título perde o `padding-right`. "Fim:" entra no fluxo depois da descrição final.
- A ordem no DOM deve ser a de leitura em cada versão (ou use `order` de flex sem quebrar o leitor de tela — prefira que a data esteja antes do título no DOM e seja posicionada à direita no layout largo).

**Pronto quando:** `campanha` (aba Partidas) em 320, 390: data acima do título, títulos sem uma palavra por linha. 768, 1366, 1920: print igual ao de antes.

### Task 8: CON-09 — o botão encaixado tem a mesma cara do flutuante

**Achado:** CON-09. **Decisão:** o comportamento **não muda**: flutua enquanto há página por baixo e encaixa no fim da página. Muda só o desenho no modo encaixado: mesma forma de pílula, mesma altura e mesma fonte do modo flutuante. Onde já está certo, nada muda.

**Problema medido:** encaixado (página curta), o par Gerenciar + ação principal vira bloco de 70 px (390), 91 px (768) ou 90 px (1440) de altura, com o texto do Gerenciar em 12 px no celular. Flutuando, é pílula de 44–72 px. A campanha em 390 mostra pílulas; a partida em 390 mostra blocos; a partida em 320 mostra pílulas.

**Onde:** `src/components/molecules/AdaptiveActionButton.tsx`, `BottomActions.tsx`, `ManageButton.tsx`.

**Fazer:**
- Ache o que muda entre os modos (provavelmente estilos condicionais ao modo encaixado/fluxo) e faça o encaixado usar as mesmas dimensões/tipografia do flutuante. Se o modo encaixado tiver estilos próprios que só existem para isso, remova-os (um desenho só).
- A sombra forte aprovada no CON-06 é do flutuante; no encaixado, siga o que hoje já acontece com a sombra (não invente).

**Pronto quando:** `partida`, `partida-agendada`, `campanha`, `j-partida` em 320, 390, 768, 1440: o par tem a mesma altura e fonte nos dois modos (anexar medição de altura e `font-size` em cada). Rolar uma página longa continua flutuando e encaixando no fim (print no meio da rolagem e no fim).

### Task 9: lote de polimento — TIP-03, EST-06, FOR-08, COR-09

**Achados e decisões** (todos "como sugerido", com as notas da decisão):

- **TIP-03:** `line-height: 1.35` nos textos corridos que quebram linha: ajuda do `FormField` (`src/components/molecules/FormField.tsx`), `headerDate` (`src/styles/pageHeader.ts`), a nota do `src/components/organisms/UpcomingRulesSidebar.tsx`. **Não mexer** no reset global (`src/styles/ResetStyle.ts:37`).
- **EST-06:** `src/components/molecules/EmptyState.tsx`: `text-align: center`, `padding: 0 24px`, fonte `clamp(20px, 6vw, 28px)`. Todas as listas vazias que usam o componente herdam. Verifique em 390 e 1366 (lista de campanhas vazia: `states2.mjs` tem o mock) — no desktop, a frase em uma linha deve ficar igual a hoje (28 px).
- **FOR-08:** `src/components/templates/SignPagesTemplate.tsx` (~46–51), link "Primeira vez? Crie sua conta!": `text-align: center` e, só nas larguras em que não cabe numa linha, fonte menor para caber numa linha até 320 px. Acima disso, mesmo tamanho de hoje. Login e cadastro.
- **COR-09:** `src/components/templates/ListPageTemplate.tsx`: aplicar `scopedScrollbar(scrollbarPalettes.earth)` (`src/styles/scrollbar.ts`) quando o fundo é o do mapa. A lista de personagens (fundo de espaço) continua com a barra global.

**Pronto quando:** prints antes/depois de cada um nas larguras citadas; TIP-03 em `partida` 390 (data em duas linhas) e `partida-nova` 390.

### Task 10: IDENT-01 — campos do login e do cadastro com o traço do projeto (opção A)

**Achado:** IDENT-01. **Decisão:** opção A.

**Fazer** em `src/components/molecules/SignField.tsx` (`Input`, `Label`):
- Borda de **3 px** no mesmo token quase-preto do contorno do botão "Entrar" (descubra qual token o botão usa e use o mesmo); raio dos cantos igual ao do botão.
- Rótulo (o que fica na borda) em negrito e no tom escuro (token de texto escuro sobre fundo claro que já existe; contraste ≥ 4,5:1 sobre o branco do cartão).
- Foco: a borda vira o azul da marca (`brandAccent` ou o que o foco usa hoje), mais o anel atual. Erro: vermelho, como hoje. Os estados de erro/foco continuam com prioridade sobre a borda nova.
- O rótulo na borda, o espaçamento igual entre campos e botão, e os erros por campo continuam.
- Tokens `borderInputOnLight`/`textHint`: se ficarem sem uso, remova-os de `tokens.ts`; se outros componentes usam, não mude o valor deles — use o token do botão no `SignField`.

**Pronto quando:** login e cadastro em 320, 390, 1366: vazio, foco (Tab), erro de campo, senha errada (`signstates.mjs`).

---

## PR C — ficha (`fix/fase3-ficha`)

### Task 11: FOR-09 — perfil da ficha: rótulo na borda e barra de abrir/fechar no rodapé

**Achado:** FOR-09, ampliado pela decisão. Ler a decisão inteira em `2026-10-27-auditoria-ui-ux-decisoes.md` (seção Ficha).

**Onde:** `src/features/sheet/CharacterProfile.tsx` (barra `ProfileHeader` + `ExpandButton`), `src/features/sheet/ProfileInputs.tsx` (modo criar), `src/features/sheet/ProfileDetails.tsx` (modos ver e editar; no editar, a descrição breve é `textarea`), `src/components/ions/ExpandButton.tsx`, e o rótulo na borda de `src/components/molecules/SignField.tsx`. Ver também como a página de editar ficha escolhe o `profileMode` (o print do achado é da edição).

**Fazer:**
1. **Rótulo na borda** em todo campo editável do perfil: nome completo, descrição breve, aniversário (mês e dia), idade, alinhamento — nos modos criar e editar. Rótulos: "Nome completo", "Descrição breve", "Aniversário", "Idade", "Alinhamento". O rótulo fica ligado ao campo (`<label htmlFor>`/`fieldset`+`legend`, como o `SignField` faz). O placeholder pode ficar. O `SignField` é para fundo claro; o perfil é escuro (`surfaceNeutral`/`borderStrong`). Extraia a técnica do rótulo na borda para um componente/estilo compartilhado com variante de tema, em vez de copiar o CSS (o `SignField` passa a usá-lo também, sem mudar nada visualmente no login — prove com print). Tamanhos de fonte dos campos do perfil continuam os de hoje (a ficha usa `cqi`; ler `src/features/sheet/CLAUDE.md` e a zona pixel-tuned).
2. **Modo ver:** sem campos, os rótulos de texto continuam como estão.
3. **Barra no rodapé:** fechado, o perfil é só a barra com a seta para baixo (como hoje). Aberto, o conteúdo aparece **acima** da barra e a barra vira a borda de baixo do perfil, com a seta para cima. A rotação da seta continua exatamente a de hoje (baixo = fechado, cima = aberto). A animação de abrir deve fazer sentido com a barra embaixo (o conteúdo desce junto com a barra).
4. **Acessibilidade:** a barra vira `<button type="button">` com `aria-expanded` e `aria-controls` apontando para o conteúdo, rótulo acessível "Mostrar perfil"/"Ocultar perfil". O `ExpandButton` dentro dela passa a ser só a imagem decorativa (`alt=""`), sem `onClick` próprio (hoje ele tem um `onClick` opcional que a barra não usa — confira os outros usos do `ExpandButton` antes de mudar a API). Foco visível no padrão do projeto.
5. Teste em vitest: alternar a barra muda `aria-expanded` e mostra/esconde o conteúdo; no estado aberto a barra vem depois do conteúdo no DOM.

**Pronto quando:** `ficha`, `ficha-editar`, `ficha-nova` em 390, 768, 1366, 1920, perfil fechado e aberto; login em 390 e 1366 igual a antes.

### Task 12: FICHA-01 — flutuantes da ficha presos à coluna da ficha

**Achado:** FICHA-01. **Decisão:** os flutuantes da ficha se prendem às bordas da coluna da ficha, não da janela.

**Problema medido:** em 1366 os dois flutuantes ("Gerenciar" e "Procurar Campanhas") ficam metade dentro, metade fora da coluna; em 1920, a mais de 200 px da ficha, sobre o fundo. Na campanha e na partida, os flutuantes ficam dentro da coluna central — veja como lá é feito (`BottomActions`) e use o mesmo mecanismo se possível.

**Onde:** `src/features/sheet/SheetBottomActions.tsx`; `src/features/sheet/CharacterSheetTemplate.tsx`.

**Pronto quando:** `ficha` em 1366, 1440, 1920: botões dentro da largura da coluna da ficha, alinhados às bordas dela. 320, 390, 768: iguais a antes.

### Task 13: FICHA-02 — "ATRIBUTOS" junto dos diagramas

**Achado:** FICHA-02. **Decisão:** título e diagramas encostados no topo da coluna, com espaçamento fixo entre eles; a sobra de altura fica embaixo. Precisa aguentar diagramas a mais no futuro (o diagrama espiritual de Conscience, com os princípios Nen).

**Problema medido:** `src/features/sheet/CharacterSheetTemplate.tsx` (~367–380): `AttributesSection` com `justify-content: space-between`, esticada até a altura da coluna de perícias. Em 1920, 178 px entre "ATRIBUTOS" e o primeiro diagrama.

**Fazer:** mudar só a distribuição da coluna (`AttributesSection`): `justify-content: flex-start` e um `gap` fixo entre título e diagramas, coerente com o espaçamento da coluna de perícias ao lado (meça e registre o valor). Não mexer nos diagramas (zona pixel-tuned). Remover o `space-around` comentado que ficou de dúvida.

**Pronto quando:** `ficha`, `ficha-editar`, `ficha-nova` em 768, 1366, 1920: título a uma distância do primeiro diagrama igual à dos títulos de perícias ao conteúdo deles. Abaixo de 768 (onde a coluna não estica), igual a antes.
