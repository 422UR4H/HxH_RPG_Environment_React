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

## Barra com texto em duas camadas

`components/ions/ProgressBar.tsx`. O número (`current/max`) é desenhado **duas vezes**, na mesma
posição: a camada clara (`TrackClip`, `clip-path: inset(0 0 0 X%)`) aparece só na parte **não**
preenchida; a escura (`FillClip`, `inset(0 (100-X)% 0 0)`) só sobre o preenchimento. Juntas, o
texto troca de cor exatamente na borda do fill, qualquer que seja a porcentagem.

- A cópia escura é `aria-hidden`: o leitor de tela anuncia o texto uma vez.
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

- `masterPanelDismissible({ railActive, mapPicking })` — `railActive !== "agir" && !mapPicking`.
  **A aba Agir do mestre nunca ganha véu**: sem ator, tocar num NPC é como ele escolhe o ator;
  com ator, é o compositor. Arrumar, queda e fuga (`mapPicking`) também escolhem casa no mapa.
- `playerPanelDismissible({ railActive, hasActor, picking })` — `(railActive === "ficha" || !hasActor) && !picking`.

O hook `useStageOverlays()` (as duas páginas) guarda `panelOpen`/`asideOpen` num estado só, para
"abre um, fecha o outro" ser atômico: abaixo de `railUp` abrir a gaveta fecha o painel e vice-versa
(`panelIsSheet`); fechar nunca mexe no outro. `closeAsideIfDrawer` fecha a gaveta quando o usuário
escolhe nela algo que abre outra coisa (só abaixo de `asideUp`). Estado inicial: painel aberto,
gaveta aberta só em tela larga.

## Ordem da fila do mestre

`combat/queueOrder.ts` — `orderQueue(queue, order, mode)` devolve `{ action, inOrder, key? }[]`; o `QueuePanel`
só renderiza. A fila do mestre aparece **na ordem em que as ações vão abrir**.

- **De onde vem:** `bars_updated.order` (maior chave primeiro). Ele é público e **não carrega id de
  ação**, então casa por **ator + conjunto de barras** (`sameBars`, ignora ordem): cada entrada
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
  "Encerrar rodada". O `QueuePanel` recebe `order` (opcional) e `mode`.
- Entrada da ordem sem ação correspondente é pulada (só acontece de passagem, quando
  `bars_updated` chega antes de `action_queued`).

## "Abrir próxima" / "Encerrar rodada" e o `Tooltip`

`MasterControls` recebe `queueLength` e `orderLength` (`bars.order.length`).

- `endsRound = mode === "Race" && orderLength === 0` — na Corrida o servidor encerra a rodada
  quando abrir a próxima não acha quem pague; o botão vira **"Encerrar rodada"** e **nunca**
  desabilita.
- `empty = !endsRound && queueLength === 0` — o botão fica `aria-disabled` (não `disabled`), sem
  `onClick`, com `opacity: 0.4`. Continua **focável**, e o `Tooltip` "A fila de ações está vazia"
  explica o porquê.

`components/ions/Tooltip.tsx` (`label`, `enabled`, filho único):

- Hover de mouse e foco mostram; **toque** mostra por 2,5 s (`TOUCH_MS`, não há "sair" no toque).
  Esc dispensa sem tirar foco/hover.
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
  deixava o mapa seguindo o mouse.
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
