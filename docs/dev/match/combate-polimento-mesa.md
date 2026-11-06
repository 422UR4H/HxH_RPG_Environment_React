# Polimento da mesa de combate

> Spec: `docs/superpowers/specs/2026-10-10-front-combat-table-polish-design.md`.
> Contrato do cancelar: `System_X_System/docs/dev/api/match-combat-ws.md` — `cancel_action`
> e `action_cancelled`. Histórico: `System_X_System/docs/dev/api/match-history.md` — `rounds[].events`
> com `kind: "actionCancelled"`.

Este documento vem **depois** de `combate-fase-8.md`. É uma rodada de acabamento sobre a mesa
(mestre e jogador), sem fase nova. Cada seção diz o que mudou e onde mora a regra. Onde o código
se afastou do spec, vale o código descrito aqui.

## Toque × arraste do mapa: um reconhecedor só

`tactical-map/hooks/tapGesture.ts` — `createTapTracker(tolerance = TAP_TOLERANCE_PX)` (6 px de
tela). Fora do React, em closure, como `createHoldTracker`: `down` / `move` / `up` / `cancel`.
Só o botão primário arma; `move` que passa da tolerância desarma (virou arraste); `up` devolve
`true` só se for o mesmo `pointerId` e nunca saiu da tolerância. Um **segundo ponteiro** enquanto
armado (multitoque, pinça) desarma: `down` com outro `pointerId` zera a origem — nunca é toque.

Por que um só: comparar apenas início × fim deixa passar o arraste que **volta ao ponto de
partida** antes de soltar (era o bug: arrastar o mapa por cima de uma parede abria a caixa dela).
Quem precisa dessa fronteira usa o tracker, nunca compara pontas por conta própria:

- `WallsLayer` — a caixa da parede só abre em toque; o `pointermove` fica na `window` (o ponteiro
  sai do canvas durante o arraste).
- `PiecesLayer` — o clique no slot vazio (`emptySlotTapRef`).
- `useHoldGesture` — não usa o tracker, mas importa `TAP_TOLERANCE_PX` como sua
  `MOVE_TOLERANCE_PX`: a tolerância é uma só.

## Número da barra

`components/ions/ProgressBar.tsx`. O número (`current/max`) é **uma etiqueta só**, fixa à direita,
branca com sombra suave (`text-shadow`) sobre um preenchimento de tom mais escuro do mesmo matiz,
recortado por `clip-path` (o tom escuro fica sempre sob o número): lê sobre o preenchimento
e sobre a trilha, centralizada na vertical com `text-box` (onde há suporte), e não anda enquanto a barra anima o dano (fase 2, PR 5, MESA-03; antes eram duas
camadas recortadas que trocavam de cor na borda do fill). A etiqueta fica em fluxo: é ela que dá a
altura da barra, por isso não tem piso de tamanho (um piso deixaria a barra mais alta que o card).

- O texto fica **fora** do elemento `progress-fill` (que só tem a cor) e aparece com valor 0
  (antes sumia). `ExpBar` também: a dica de XP agora aparece com `currExp` 0.

## Véu (painel e gaveta em tela estreita)

Abaixo de `railUp` o painel é uma folha sobre o mapa; abaixo de `asideUp` a gaveta cobre o mapa.
Dois véus em `MatchStageTemplate`, `colors.scrim`, `z-index: 55` (acima dos avisos do palco, 50;
abaixo da gaveta, 60). Os dois somem por CSS (`media.railUp` / `media.asideUp`) quando viram coluna.

- **Gaveta:** o véu existe sempre que ela está aberta e há `onDismissAside`.
- **Painel:** só com `panelDismissible` — quando o conteúdo **não** pede toque no mapa.
- Tocar no véu fecha sem selecionar nada. O véu dispensa no `click` e engole o `pointerdown`
  (`stopPointerDown`): o pan do mapa escuta `pointerdown` na `window`, e desmontar o véu no
  `pointerdown` deixaria o soltar cair no canvas descoberto.

**Onde mora a regra** — funções puras em `combat/useStageOverlays.ts`, testadas sem montar página:

- `masterPanelDismissible({ railActive, mapPicking })` — `railActive === "fila" && !mapPicking`.
  **Só a Fila do mestre ganha véu.** Agir nunca: sem ator, tocar num NPC é como ele escolhe o ator;
  com ator, é o compositor. Ficha também não: com ela visível (`panelOpen && !arranging &&
  railActive === "ficha"`), tocar numa peça mostra a ficha daquele personagem (`sheetId` +
  anel de inspeção), sem escolher ator nem mexer no compositor; segurar a peça e tocar em slot
  vazio não fazem nada, e a dica do mapa vira "Toque numa peça para ver a ficha.". Arrumar,
  queda e fuga (`mapPicking`) também escolhem casa no mapa.
- `playerPanelDismissible({ railActive, hasActor, picking })` — `(railActive === "ficha" || !hasActor) && !picking`.

O hook `useStageOverlays()` (as duas páginas) guarda `panelOpen`/`asideOpen` num estado só, para
"abre um, fecha o outro" ser atômico: abaixo de `railUp` abrir a gaveta fecha o painel e vice-versa
(`panelIsSheet`); fechar nunca mexe no outro. `closeAsideIfDrawer` fecha a gaveta quando o usuário
escolhe nela algo que abre outra coisa (só abaixo de `asideUp`). Estado inicial: abaixo de `railUp`
o painel abre **fechado** (mapa livre, sem véu); em tela larga painel aberto, e a gaveta só abre
sozinha acima de `asideUp`.

O `Shell` tem `touch-action: pan-x pan-y`: a mesa rola, mas não dá zoom de página (pinça ou toque
duplo) — antes a pinça sobre o véu ampliava a página. O canvas do Pixi mantém o `none` dele.

## Ordem da fila do mestre

`combat/queueOrder.ts` — `orderQueue(queue, order, mode)` devolve `{ action, inOrder, key? }[]`; o `QueuePanel`
só renderiza. A fila do mestre aparece **na ordem em que as ações vão abrir**.

- **De onde vem:** `bars_updated.order` (maior chave primeiro). Só o mestre o recebe (ver "Barras
  ao vivo, por destinatário"); ele **não carrega id de ação**, então casa por **ator + conjunto de barras** (`sameBars`, ignora ordem): cada entrada
  consome uma ação da fila.
- **Desempate** entre ações do mesmo ator e das mesmas barras: o servidor pega a de maior chave,
  que cresce com a velocidade, então **maior velocidade primeiro, depois chegada** (`>` estrito).
  `speedOf`: `action.speed.rollCheck.result` se cobra a barra `action`, `action.move.finalSpeed` se
  cobra `move`; sem o número, `-Infinity` (cai na chegada). Ação que cobra **as duas barras**
  (investida) vale pela **menor** das duas velocidades: o servidor (`keyOf`) a agenda pela menor
  das duas chaves.
- **`key`:** cada item devolve a chave da entrada que casou com ELA (o card mostra "Ordem geral:
  chave N" com ela, não com a primeira entrada do mesmo ator e barras). A ação em andamento já
  saiu da ordem e não tem chave.
- Ação sem entrada na ordem não cabe nesta rodada: vai ao fim com `inOrder: false`.
- "Sem informação" (chegada, tudo `inOrder`) é: `order` `undefined` (nenhum `bars_updated` ainda)
  **ou** fora do Race com ordem vazia (no Free não há portão: a ordem só vem vazia com a fila
  vazia). No **Race, ordem vazia com fila cheia** quer dizer que nenhuma ação consegue pagar:
  todas ficam `inOrder: false` ("próxima rodada") — o mesmo estado em que o botão do mestre vira
  "Encerrar rodada". O `QueuePanel` recebe `order` (opcional) e `mode`. As ações `!inOrder` ficam
  juntas no fim, sob **um** separador `Próximo round` (`data-testid="next-round-separator"`), não
  mais uma etiqueta por linha; a "Ordem geral: chave N" do card sai por `fmt`.
- Entrada da ordem sem ação correspondente é pulada (só acontece de passagem, quando
  `bars_updated` chega antes de `action_queued`).

## Barras ao vivo, por destinatário

> Spec: `System_X_System/docs/superpowers/specs/2026-11-04-live-bars-design.pt-br.md`. Contrato:
> [`bars_updated`](../../../../System_X_System/docs/dev/api/match-combat-ws.md#bars_updated).
> Código: `combat/GeneralBar.tsx`, `CharacterBarsStrip.tsx`, `barsMath.ts`, `OwnBars.tsx`,
> `normalizeWire.ts`. Isto corrige o que as fases 6 e o fechamento diziam da barra geral e da faixa
> ("igual para mestre e jogador", saldo congelado no round).

**O que chega.** `bars_updated` (e `match_full_state.bars`) é **por destinatário**:

- O **mestre** recebe tudo: velocidades abertas, **pendentes** (na fila, abrem neste round) e
  **adiadas** (não cabem; abrem no próximo), `provisionalPrices` (preço das barras ainda não
  congeladas, só Disputado) e `order` (já pontuada contra o preço provisório). Ele vê cada envio na
  hora, dele e dos jogadores.
- O **jogador** recebe só o que o mestre já abriu: `order: []`, sem pendentes, sem adiadas, sem
  preço provisório. A ação que ele mesmo enviou não aparece nas barras até ser aberta. E ele só
  recebe `bars_updated` quando **a visão dele mudou** (um envio de outro jogador não gera nada).
- `actionBalance`/`moveBalance` são o **saldo ao vivo** (carry + média das velocidades − n × preço),
  não mais o carry congelado do round. Para o mestre as velocidades são as que agiram **mais a
  próxima pendente** (D7): o saldo é o que sobra depois que a próxima ação pagar. O que atravessou do round anterior é
  `actionCarry`/`moveCarry`. Para o jogador o saldo só conta as velocidades já públicas e pode
  pular quando uma abre: é esperado.
- Os campos só do mestre chegam ausentes ao jogador; `normalizeBars` os transforma em `{}`/`[]`
  (ver a tabela em `combate-fase-6.md`). `carry` ausente (servidor antigo) cai para o saldo.

**`barsMath.ts`** (fora do componente, por Fast Refresh): `fmt` (uma casa; o sinal vem do valor já
arredondado, `−` U+2212, nunca "−0"), `mean`, `priceOf(bars, bar)` (o congelado vence o provisório;
devolve `{ price, provisional }`), `barsRows(bars, roundMode)` — as linhas da faixa, vazias fora do
Disputado — e, para a faixa (D7 de `2026-11-06-stacked-moves-design.md`):

- `barFields(c, bar)` — os campos de uma barra sem o prefixo `action`/`move`.
- `barTotal(c, bar)` — o total da **próxima** ação: `carry + mean(agiram ++ pendentes[:1])`. A
  primeira pendente é a próxima (o mestre recebe as pendentes já na ordem projetada); as demais não
  contam. O jogador não recebe pendentes: para ele é `carry + mean(agiram)`. Sem velocidade o total
  é o carry (média vazia = 0, como no servidor); sem velocidade e sem carry, `undefined`.
- `barScale(rows, bars, bar)` — a largura cheia, comum à faixa toda: o maior `max(total, preço)`.
- `barTicks(price, scale)` — os múltiplos do preço estritamente dentro da escala.

O saldo que chega (`actionBalance`/`moveBalance`) já pagou a próxima ação no servidor (D7
"Servidor"), então o que ela gasta é `total − saldo`.

**`GeneralBar`.**
- "Fila" (os chips da ordem) só com `showOrder`, ligado só pela `GameMasterPage`; o jogador nunca vê
  "Fila" nem "Fila vazia". A chave de cada chip sai por `fmt` (antes era o número cru, ex.
  `-5.333333333333332`).
- O preço mostrado vem de `priceOf`; o provisório leva a marca `(provisório)`.
- O botão "Barras" e a faixa **somem no Livre** (lá não há preço nem média).

**`CharacterBarsStrip`.**
- Escondida no Livre (`barsRows` vazio; o componente também devolve `null`). Linhas **ordenadas
  pelo nome exibido** (localeCompare pt-BR), estáveis entre atualizações.
- A linha existe quando o personagem tem alguma velocidade (aberta, pendente ou adiada) ou alguma
  barra tem preço (congelado, ou provisório para o mestre).
- **Uma grade só** (`display: grid`; a linha é `display: contents`). Cada linha desenha **todas** as
  células — nome e, por barra, caixa / agiram / pendentes / adiadas —, vazias quando não há o que
  mostrar: a barra de movimento nunca anda porque a de ação ganhou uma velocidade. Um valor mais
  largo alarga a coluna em todas as linhas (a grade faz isso). Sem `column-gap`: a célula não vazia
  leva 8 px à esquerda, e uma coluna vazia em todas as linhas fica com largura zero.
- Números em `tabular-nums`; cada velocidade com `min-width: 3ch`, o total com `5ch` (cabe uma casa).
- Por barra (⚔ ação, ➜ movimento), a caixa tem ícone, trilho e número. O trilho enche até o
  **total** (`barTotal`) contra a escala comum (`barScale`), na cor da barra (`vitalActionBar` = o
  vermelho do ataque, `vitalMoveBar` = o azul do movimento) sobre o mesmo matiz a 18 %
  (`vital*BarTrack`); um traço de 1 px (`overlayDark`) em cada múltiplo do preço. Nenhum verde.
- **Hover e foco** (a caixa é focável, `tabIndex=0`) escurecem `[0, gasto]` com `overlayMedium` e
  trocam o número por **"saldo X"** em negrito, texto primário. Saldo negativo escurece o
  preenchimento inteiro ("saldo −3"). O texto fora de vista fica no mesmo lugar, invisível
  (`visibility: hidden`), para a troca não mudar a largura da coluna.
- O `Tooltip` do projeto diz `"Ação: saldo 6 de 9"` (preço congelado ou provisório); não há mais
  `title` nativo.
- Sem preço: a célula fica, trilho vazio, sem traços, o número é o total (se há velocidade), sem
  troca no hover e sem foco. Sem preço **e** sem velocidade: célula vazia, nem o ícone.
- Velocidades que agiram no tom mais forte, **pendentes** mais fracas, e as **adiadas** depois de
  `Próximo round` (não entram no total). O `x̄` saiu: o total ao lado da barra o substitui.

**`OwnBars`** mostra `actionBalance`/`moveBalance`, agora o saldo ao vivo.

## "Abrir próxima" / "Encerrar rodada" e o `Tooltip`

`MasterControls` recebe `queueLength` e `orderLength` (`bars.order.length`).

- `endsRound = mode === "Race" && orderLength === 0` — na Corrida o servidor encerra a rodada
  quando abrir a próxima não acha quem pague; o botão vira **"Encerrar rodada"** e **nunca**
  desabilita.
- `empty = !endsRound && queueLength === 0` — o botão fica `aria-disabled` (não `disabled`), sem
  `onClick`, com `opacity: 0.4`. Continua **focável**, e o `Tooltip` "A fila de ações está vazia"
  explica o porquê.

`components/ions/Tooltip.tsx` (`label`, `enabled`, filho único):

- Hover de mouse e foco mostram; **toque** mostra por 6,25 s (`TOUCH_MS`; não há "sair" no toque, mas tocar
  fora do gatilho e da bolha fecha na hora). Esc dispensa sem tirar foco/hover.
- A bolha é **`position: fixed`**, medida a partir do filho ao abrir, com `z-index: 1000` e
  `pointer-events: none`. Motivo: a Regência da topbar rola na horizontal (`overflow`) e cortaria
  uma bolha absoluta. Um `useLayoutEffect` mede a bolha e a prende a 8 px das bordas da tela
  (celular de 390 px).
- A **descrição acessível está sempre no DOM** enquanto `enabled`: um `sr-only` com o `id` que vai
  em `aria-describedby` do filho, desde o foco. A bolha visual é `aria-hidden` (senão o texto seria
  lido duas vezes). `enabled={false}` não renderiza nada e tira o `aria-describedby`.

O `MatchErrorBanner` ganhou um `×` (`CloseButton`, `aria-label="Fechar aviso"`): só ele fecha; o
aviso inteiro deixou de ser clicável. `combatErrorMessages` traduz as mensagens de domínio que o
contrato documenta (`byGameMessage`: fila vazia, ação já não está na fila, ação não é sua) e tem
`cancel_action` na tabela dos envios.

## Repelir e Desarmado

- **Repelir rápido sempre abre a caixa** (`useReactionControls.quick`): a arma muda o resultado.
  Os outros botões enviam no toque. `matchId` e a leitura direta do rascunho saíram do hook; a
  caixa já vem preenchida com a arma do rascunho do personagem.
- **`Fist` é o Desarmado** (o catálogo sempre o traz). `ReactionConfigDialog` não tem mais opção
  vazia à parte: usa os `weapons` do catálogo (só `["Fist"]` se ele ainda vier vazio); arma padrão
  fora do catálogo cai em `Fist`; o `onSend` de repel sempre leva `weapon`.
- **Rótulos em `combatText.ts`:** `weaponLabel(name)` — "Desarmado" para `Fist`, senão
  `humanWeapon` — para listas e `<option>`; `withWeapon(name)` — `" desarmado"` ou `" com Sword"` —
  para o texto corrido ("atacou X com …"). `describeDeclared` e o `EventStream` usam `withWeapon`.

## Cor do movimento

`colors.moveIntent` (`#38bdf8`, azul-ciano) substitui o roxo `pieceGhost` em tudo que é "mover":
fantasma de intenção declarada, destino, seta e o tint "Mover" do composer (`moveIntentBg`).
Por quê: é complementar ao laranja do ataque (`pieceAttackIntent`), seguro para daltonismo contra
laranja-avermelhado, e o verde já significa "turno aberto" (`pieceActiveTurn`) e some em mapa de
grama. `colors.intentOutline` (`#0b1220`) é o contorno.

No `IntentLayer`, `strokeTwice(g, draw, style)` faz **duas passadas** sobre o mesmo caminho:
primeiro o contorno escuro (`width + 2`, alpha 0,55), depois a cor. Só traços passam por ele;
preenchimentos não levam contorno.

## Cancelar uma ação declarada

- **UI:** só a linha "na fila" de `DeclaredActions` tem **Cancelar** (a que já abriu é o turno; a
  "enviando…" ainda não tem id do servidor). Substituiu o `×` de ocultar (e `dismissDeclared` deixou
  de ser usado nas páginas). `DeclaredActions` agora vai como `footer` do `EventStream`, no fim do
  Histórico, e sobe junto com ele.
- **Confirmação:** `CancelDeclaredDialog` (mestre, com `showActor`, e jogador). A página guarda
  `cancelling`; `cancelPending` só vale enquanto a linha continua `queued` — se a ação abriu com o
  diálogo aberto, ele fecha sozinho. Sem conexão (`canConfirm` falso) o diálogo fica aberto em vez
  de perder o pedido. Confirmar chama `combat.send.cancelAction(id)` → `cancel_action { actionId }`.
- **Sem estado otimista:** a linha só some quando volta `action_cancelled { actionId }`
  (`combatReducer`), que tira o id de `queue` **e** de `declared` (o fantasma do mapa deriva de
  `declared`, então sai junto). Id desconhecido não muda o estado. Recusa do servidor (abriu no
  meio-tempo) chega como `game_error` e o banner fala.
- `action_cancelled` só chega ao mestre e a quem pediu — a fila é secreta. A autorização é por
  ação (cada um cancela o que declarou).
- **Movimentos empilhados vão junto** (2026-11-06, D5): cancelar um movimento cancela os
  empilhados nele. As páginas passam `stacked` = `stackedAfter(id, game.chainMoves)` ao
  `CancelDeclaredDialog`, que lista cada um (`describeAction`) sob "Os movimentos empilhados nela
  também serão cancelados:" e troca o botão para "Cancelar os N movimentos" (N conta o pedido).
  O servidor manda um `action_cancelled` por ação, então cada linha some pelo caminho de sempre.
  Ver [Movimentos empilhados](#movimentos-empilhados) abaixo.

- **Custo (§16):** o texto de custo é "Custo:" (antes "Cobra:"), montado por `costLabel(bars)` em
  `combatText.ts` e usado por `QueuePanel` e `ReactionConfigDialog`. O diálogo de cancelar só
  mostra a linha da Desvantagem ("Até o fim da rodada, o que este personagem fizer de novo rola a
  velocidade com Desvantagem") em **Race** — as páginas passam `showSwapCost={state.roundMode === "Race"}`.
- **No histórico:** o evento `actionCancelled` vira uma linha "ação cancelada" (`historyRows.ts`),
  descrita pelo mesmo `describeAction` das demais. Com `action` (só mestre e o dono recebem o
  conteúdo) a linha diz o quê; sem `action` (quem não pode ver a fila) diz só que o personagem
  cancelou uma ação.
- **Cancelada não é perdida:** `resolveLostCandidates` trata o `uuid` de cada `actionCancelled` como
  achado no histórico (mesmo conjunto de "rodou"): saída calada, sem rascunho restaurado e sem
  `LostDeclaredNotice`.

## Movimentos empilhados

> Spec: `System_X_System/docs/superpowers/specs/2026-11-06-stacked-moves-design.md` (D3–D6).
> Contrato: `match-combat-ws.md` § *Movimentos empilhados*, `pull_action`, `cancel_action`,
> `attach_reaction`.

Os movimentos de um personagem formam uma **cadeia na ordem de declaração**: cada um se empilha no
último movimento ainda pendente dele (puro ou combinado) e parte do destino desse. Ação sem
movimento não entra na cadeia nem a quebra. O servidor não abre um empilhado antes do anterior.

- **De onde a cadeia sai:** `moveChain.ts`, puro (o mapa é Pixi e não tem teste). O
  `action_enqueued` só traz o id, então `pendingChainMoves(declared, queue)` monta a lista dos
  movimentos pendentes em ordem de chegada — a fila do mestre primeiro (ordem de inserção), depois
  o que só existe em `declared` (o jogador; o envio ainda sem `action_queued`). Um NPC que o mestre
  declarou entra uma vez só. `predecessorOf` usa o `move.stackedOn` da fila do mestre quando ele
  aponta para um pendente; senão (ausente, ou velho — o anterior abriu, foi consumido, ou a reação
  o re-apontou) a regra do servidor: o último pendente do mesmo personagem antes dele. Assim um
  `stackedOn` velho vale "não empilhado" quando não há outro antes, como o contrato pede.
  `useGameTable` expõe a lista como `chainMoves`.
- **Composição:** `useActionComposerState({ moveOrigin })` recebe `chainTailOf(actor)?.to`. Com
  movimento no rascunho, a seta, a distância ao alvo, a aproximação e o `isPathClear` partem dali
  (`ReachContext.actorSlot`). **Sem** movimento a ação não se empilha e pode abrir antes da cadeia:
  a seta, a distância ("ataque à distância") e o alcance da parede saem da peça (`standingSlot`),
  que é de onde o servidor checa. O "ligue Mover" de um verbo de parede só aparece com
  `resolved.outOfReach`.
- **Fantasma:** `ghostOrigin` — o destino do anterior enquanto ele está pendente, senão a peça (onde
  ela está agora), senão o `from` registrado. Mesmo desenho de sempre.
- **"Chegou":** só a cabeça da cadeia é dispensada quando a peça está no destino (`arrivedMoves`).
  Um empilhado com a peça no destino dele é um vai-e-volta, não um pedido cumprido.
- **Antecipar:** o `pull_action` de um empilhado é recusado (`action is stacked on a pending
  move`); o banner diz "Este movimento está empilhado em outro que ainda não abriu — abra aquele
  primeiro." (`combatErrorMessages.byGameMessage`).
- **Reação (D6):** a fuga gasta a cabeça da cadeia; para outra casa, os empilhados nela caem.
  `useReactionControls` marca `dialog.losesStacked`/`pick.losesStacked` (`stackedLostByEscape`), e
  a configuração da fuga (`ReactionConfigDialog`) e a instrução da fuga armada (`ReactionButtons`
  `armedNote`, no painel e ao lado da peça) mostram `STACKED_ESCAPE_WARNING`. A casa só é escolhida
  no toque, que já envia — por isso o aviso é condicional ("…se esta fuga não for para onde o
  primeiro movimento ia").
- **Ajustar na fila:** `queuedRolls` só oferece "Velocidade de ação" para a ação que cobra a barra de
  ação (`bars` com `"action"`); o movimento puro não rola velocidade de ação (D1) e o servidor
  recusa a edição.

## Outros ajustes da rodada

- Aba **Personagens** (`MatchCharactersSidebar`): `fluid` (cards na largura do painel) e `footer`;
  o mestre põe o "Adicionar à partida" (`AddNpcPicker`; era "Pôr na partida") ali, não mais no painel de ação.
- A fila do mestre perdeu o botão "Detalhes"; o `MatchSheetPanel` perdeu o cabeçalho com `×` (`onClose`) que só ele usava.
- A `Shell` inteira da partida (`MatchStageTemplate`) é `user-select: none`, para o toque longo
  não selecionar texto; `input`, `textarea` e `select` voltam a `user-select: text`. O `Tooltip`
  e outros ions pontuais também a marcam.
- **Histórico:** o pin-ao-fim do `EventStream` depende de `rows` **e** de `pinKey` (as páginas
  passam as ações declaradas — `id:status` juntos), porque declarar só faz crescer o rodapé.
  O aviso de falha do GET fica fora do que rola, acima do scroller.

## Segunda rodada (spec §17)

- **Pan do mapa** (`ViewportInner`): só começa se o alvo do `pointerdown` é o próprio canvas
  (`e.target === canvas`); card, aba Histórico ou camada HTML por cima não iniciam pan. Termina
  num `pointermove` sem o botão principal (`(e.buttons & 1) === 0`), porque um `pointerup` perdido
  deixava o mapa seguindo o mouse. O pan é armado no quadro seguinte ao `pointerdown`; se o
  dedo/botão já subiu até lá (`pointerHeldRef`), não arma — no toque não há hover para
  desligá-lo, e o toque seguinte fazia o mapa pular.
- **Cursor da parede** (`WallsLayer`): com mouse, sem botão e sobre parede clicável, `pointer`.
  Vai no elemento PAI do canvas, pois o Pixi reescreve `canvas.style.cursor` a cada movimento
  (`inherit` fora de objeto interativo, `pointer` na peça); no pai ele herda e não briga. Usa o
  mesmo teste de acerto do toque (`hitWallAt`).
- **Arma padrão:** `defaultWeaponOf(names)` (`actionDraft.ts`) é a primeira arma do catálogo que
  não seja `Fist`; entra na resolução do rascunho (`resolveDraft`, 4º arg opcional, alimentado
  por `useGameTable`). No `ReactionConfigDialog`: arma do rascunho (se no catálogo) > padrão > `Fist`.
- **"Barras"** saiu da linha que rola de lado da `GeneralBar` (novo wrapper `Scroll`).
- **"Adicionar à partida"** (antes "Pôr na partida"), com o botão "Adicionar" abaixo do seletor,
  alinhado aos cards.

## Limites conhecidos

- Uma ação cancelada enquanto um turno estava aberto só entra no histórico (`actionCancelled`)
  quando esse turno fecha. Se a desconexão e a reconexão caírem nessa janela, ela ainda pode
  aparecer como "perdida" (o restante dos casos já é calado).
- A bolha do `Tooltip` não acompanha o botão se a topbar rolar com ela aberta (a posição é medida
  só ao abrir).
- Girar um tablet de largo para estreito pode deixar painel e gaveta abertos ao mesmo tempo: a
  regra "uma por vez" roda ao abrir, não ao mudar de breakpoint.
