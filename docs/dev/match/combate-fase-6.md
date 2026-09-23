# Fase 6 do combate — desenho no front

> Spec de design: `docs/superpowers/specs/2026-09-22-front-combat-phase-6-design.md`.
> Ledger de implementação (rulings que corrigem o spec): `.superpowers/sdd/2026-09-22-front-combat-phase-6/progress.md`.
> Contrato: `System_X_System/docs/dev/api/match-combat-ws.md`.

## O que esta fase entrega

Um turno inteiro jogável, sem reações, nas duas telas (jogador e mestre) e nos quatro
formatos (celular, tablet em pé, tablet deitado, desktop): o jogador declara uma ação, o
mestre abre o turno, a peça anda de verdade quando o servidor manda, o turno fecha,
barras e HP acompanham ao vivo. O mestre também age por um NPC, com o mesmo composer.

Fora de escopo (spec §13): reações, edição do mestre, histórico por REST, ficha e
inventário dentro da partida, Nen, cancelar ação, adicionar NPC com a sala viva, e o
fantasma de espera (o de um movimento que depende de CD).

## Arquitetura

```
  WebSocket (um por partida, useMatchWs)
        │  parse do envelope + despacho por tipo
        ▼
  combatReducer          (puro, sem React — src/features/match/combat/combatReducer.ts)
        │
        ▼
  useMatchCombat          (liga reducer ↔ useMatchWs, expõe state/status/send — .../useMatchCombat.ts)
        │
        ├── useActionComposerState   (rascunho de ação + mapas peça↔personagem — .../useActionComposerState.ts)
        ├── useLiveMapSync           (paredes/peças/fog ao vivo, REST vs WS — .../useLiveMapSync.ts)
        │
        ▼
  GamePage (rota, escolhe pelo papel)
        │
        ├── GamePlayerPage  → MatchStageTemplate + organismos
        └── GameMasterPage  → MatchStageTemplate + organismos
```

`GamePage.tsx` deixou de ser a página: hoje é só a rota. Ela busca `match`/`user`, decide
`isMaster = match.masterUuid === user.uuid` e monta `GameMasterPage` ou `GamePlayerPage`.
Daí para baixo, nenhum componente recebe `isMaster` — exceto as três exceções declaradas
mais abaixo.

### Arquivos, como ficaram de verdade

| Caminho | O que é |
|---|---|
| `src/styles/breakpoints.ts` | os quatro breakpoints nomeados (`tabletUp`, `railUp`, `asideUp`) |
| `src/components/templates/MatchStageTemplate.tsx` | as cinco zonas (`topbar`, `rail`, `panel`, `stage`, `aside`) |
| `src/features/match/combat/combatMessages.ts` | tipos 1:1 do wire (só tipos) |
| `src/features/match/combat/combatReducer.ts` | o reducer puro + estado inicial |
| `src/features/match/combat/useMatchCombat.ts` | liga reducer ↔ `useMatchWs`, expõe `state`/`status`/`send`, persiste fantasmas |
| `src/features/match/combat/useActionComposerState.ts` | rascunho (`localStorage`) + mapas peça↔personagem, compartilhado entre as duas páginas |
| `src/features/match/combat/useLiveMapSync.ts` | paredes/peças/fog ao vivo; `seedFromRest` é a única diferença entre papéis |
| `src/features/match/combat/actionDraft.ts` | rascunho + fantasmas confirmados em `localStorage`, migração de alvo |
| `src/features/match/combat/mapCanvasStyles.ts` | os três styled-components do canvas do mapa, extraídos por estarem duplicados entre as páginas |
| `src/features/match/combat/defaultMoveCategory.ts` | `defaultMoveCategory(state)` — hoje sempre `"Dash"`, é função de propósito (ver spec §6) |
| `src/features/match/combat/combatErrorMessages.ts` | `code` → texto em PT-BR |
| `src/features/match/combat/ActionComposer.tsx` | a bottom sheet de compor ação |
| `src/features/match/combat/MatchTopBar.tsx` | barra superior burra (cena, regime, status, slot `actions?` opcional) |
| `src/features/match/combat/RailNav.tsx` | rail/rodapé — um componente só, CSS decide a forma |
| `src/features/match/combat/AsideTabs.tsx` | as abas Histórico/Personagens da gaveta |
| `src/features/match/combat/GeneralBar.tsx` | a barra geral, flutuando sobre o mapa |
| `src/features/match/combat/OwnBars.tsx` | as duas barras do próprio personagem/ator |
| `src/features/match/combat/EventStream.tsx` | a aba Histórico |
| `src/features/match/combat/QueuePanel.tsx` | a fila do mestre |
| `src/features/match/combat/CloseTurnRefusedDialog.tsx` | o diálogo de `close_turn_refused` |
| `src/features/match/combat/MatchErrorBanner.tsx` | a superfície de `error` (toast, some em 6s) |
| `src/features/match/WallActionSheet.tsx` | o menu de parede, extraído do `GamePage` antigo |
| `src/features/tactical-map/hooks/useHoldGesture.ts` | o gesto de segurar + o atalho de botão direito |
| `src/features/tactical-map/utils/stacking.ts` | a cascata de empilhamento |
| `src/features/tactical-map/GhostLayer.tsx` | desenha o fantasma no Pixi |
| `src/pages/GamePage.tsx` | a rota — lê o papel, monta a página certa |
| `src/pages/GamePlayerPage.tsx` · `GameMasterPage.tsx` | os dois orquestradores |
| `src/services/characterSheetsService.ts` (+) | `getCombatCatalogue(token, uuid)` |
| `src/hooks/useCombatCatalogue.ts` | React Query em cima dele |

`GamePageTemplate.tsx` (o template antigo, pré-Fase-6) ficou órfão depois da Tarefa 12 e
não é mais usado por nenhuma página.

## O reducer

Todo o estado que importa mora em `CombatState` (`combatReducer.ts`): `scene`, `roundMode`,
`bars`, `openTurn`, `queue`, `hp`, `ghosts`, `events`, `pendingCloseTurn`, `lastError`. Uma
ação de reducer por mensagem do wire, mais três locais: `ACTION_SENT`, `WS_ERROR`,
`ERROR_DISMISSED`.

**Guarda de `seq`.** `bars` só é substituído quando `state.bars === null || payload.seq >
state.bars.seq` (`acceptBars`) — vale tanto para `bars_updated` quanto para
`match_full_state.bars`, porque o contador é o mesmo e não reinicia na reconexão.

**Envios pendentes em FIFO e a vida do fantasma (ruling R2, ampliada por R28/R29 na revisão
final).** O spec original previa reindexar "o último fantasma" quando `action_enqueued`
chega. Isso quebra se um envio sem movimento for seguido de um envio com movimento: o ack
do primeiro roubaria o fantasma do segundo. A implementação mantém `pendingSends:
PendingSend[]` — uma fila FIFO de `{ localId, actorId, clearsDraft }` ainda sem confirmação
— e `action_enqueued` sempre reindexa o envio mais **antigo** ainda pendente, nunca o mais
recente. Todo `enqueueAction` empurra uma entrada em `pendingSends`, com ou sem fantasma (o
payload pode não ter `move`). `WS_ERROR` com `sentType === "enqueue_action"` também consome
o envio mais antigo pendente e descarta o fantasma correspondente — é assim que "morre
quando chega `error` para aquele envio" (spec §8) foi implementado, já que o spec original
não detalhava o mecanismo.

`actorId`/`clearsDraft` (R28) existem para `useMatchCombat` saber, no ack, QUEM mandou e SE
deve limpar o rascunho daquele ator — antes disso `onActionEnqueued` só limpava o rascunho
do ator **selecionado no momento do ack**, que podia já não ser quem enviou (o mestre troca
de NPC rápido). O composer manda `clearsDraft: true` por padrão; o menu de parede do
jogador (R29, ver abaixo) manda `clearsDraft: false` para não apagar um rascunho do
composer em voo. `useActionComposerState.clearDraftFor(actorId)` limpa o `localStorage`
desse ator sempre, e o rascunho **em memória** só se for o ator selecionado agora.

Revisão final (Important 2): `enqueueAction` só nasce fantasma/entra em `pendingSends`
quando `sendRaw` (agora booleano) confirma que o envio saiu de verdade pelo socket — sem
isso, Declarar com o socket caído ou reconectando deixava um fantasma órfão que nunca
ganharia ack nem erro. E `match_full_state` — um registro é sempre um socket novo — zera
`pendingSends` inteiro e descarta todo fantasma ainda provisório (`local-*`): um envio em
voo na hora da queda pertencia ao socket anterior e nunca vai ganhar ack por este.

O fantasma morre também quando chega `turn_opened` com aquele `actionId`, e é varrido por
`round_closed` (varredura conservadora). `scene_changed` também varre os fantasmas, mas
**não** mexe em `queue`/`openTurn` desde a revisão final (ruling R30 — nem o spec §5 nem o
contrato pedem isso, e é inalcançável na Fase 6). Na reconexão, `match_full_state.openTurn`
não carrega `actionId` (o campo só chegou até `turn_opened` — ver §15 do spec), então a
varredura ali é por ator: fantasma cujo ator é o `openTurn.actorId` é descartado.

**Persistência do fantasma (ruling R3, ampliada por M2 na revisão final).** O spec pedia
que o fantasma sobrevivesse ao refresh na mesma chave de `localStorage` do rascunho. A
implementação usa uma chave separada, `match-ghosts:{matchUuid}:{userUuid}`
(`actionDraft.ts`), porque o rascunho é por ator (o mestre tem um por NPC) e o fantasma é
por partida **e usuário** — sem o usuário na chave, duas abas logadas como papéis
diferentes na mesma partida (comum em teste manual) viam o fantasma uma da outra. Só
fantasmas **confirmados** (chave sem prefixo `local-`, ou seja, já com `actionId` de
verdade) são persistidos — um fantasma ainda em voo não teria como ser recasado depois de
um refresh. `useMatchCombat` (que agora recebe `userUuid`, vindo de `useUser()` nas duas
páginas) hidrata os fantasmas confirmados no mount e os regrava a cada mudança.

**Histórico por `turnId`.** `turn_closed` e `resolution_updated` não têm ordem garantida
entre si (o contrato diz isso explicitamente). O histórico resolve por chave: quem chegar
primeiro cria a linha do turno (indexada por `turnId`), quem chegar depois a enriquece. Só
a resolução **liquidada** (`isSettled`) vira linha — a de turno aberto é o cálculo
provisório que o mestre já vê no próprio painel.

## As três decisões de UX

### O gesto de segurar

**Decisão.** Um gesto só, `pointerdown` → timer de 450 ms (`HOLD_MS`) → dispara, sobre
Pointer Events (idêntico para mouse, toque e caneta). No desktop, botão direito
(`contextmenu`) dispara o mesmo caminho na hora, como atalho, e o menu nativo do navegador
é suprimido sobre o canvas.

**Por quê.** *Hover* não existe no toque — o gesto precisa ser o mesmo nos dois, porque a
Fase 7 vai reusar exatamente este mecanismo nos botões de reação. *Só botão direito* falha
pela mesma razão (não existe no celular). O long-press cai onde a lógica de
clique-vs-arraste já existia: `PiecesLayer` já discrimina os dois com um limiar de 4-6 px
no par `pointerdown`/`pointerup` (`createHoldTracker`, `useHoldGesture.ts`); o timer entra
no mesmo par, sem nascer uma segunda máquina de estado sobre a zona pixel-tuned do mapa.

**Correção feita durante a implementação (ruling R20, substitui a R5 original).** O
desenho inicial fazia o atalho de botão direito compartilhar o mesmo tracker do
long-press: `fireNow(id)` disparava na hora e deixava o rastreador marcado como "já
disparado", para o `pointerup` seguinte ver `end() === "hold"` e não duplicar em
`onPieceSelect`. Isso assumia que `contextmenu` sempre chega **antes** do `pointerup`
correspondente — verdade no Linux/macOS, falso no Windows (lá `contextmenu` chega
**depois**). Na ordem invertida, o `pointerup` resolvia como clique normal antes do
`contextmenu` disparar o hold, e um único botão direito virava clique + hold ao mesmo
tempo. A correção (`createRightPressTracker`) desacopla completamente as duas
possibilidades: um `pointerdown` com botão não-primário grava o `pieceId` pendente;
`release()` (o `pointerup` correspondente) nunca produz clique, sempre; só `contextmenu()`
resolve o gesto, consumindo e limpando o id pendente — não importa qual dos dois eventos o
navegador entrega primeiro.

**Mecânica.** Cancela no movimento > 6 px (é pan ou arraste), no `pointerup` antes do
prazo, no `pointercancel`, no `blur` da janela (revisão final, M7 — alt-tab ou um diálogo
nativo no meio do gesto não entrega pointerup/pointercancel, e sem isto o anel de
progresso e o `localDrag` ficavam presos) e é limpo a cada novo `pointerdown` (para não
vazar um botão direito sem `contextmenu` correspondente para um clique não relacionado
depois). A partir de 120 ms um anel de progresso (`pixiGraphics`, arco desenhado em
`PiecesLayer`) dá feedback visual — sem ele o gesto parece travamento. `onPieceLongPress`
só é consumido quando o chamador o passa (`R19`): a lobby e o editor de mapa não passam
esse prop, então um clique um pouco lento lá continua sendo um clique normal, não é
engolido pela contabilidade de hold.

**Correção da revisão final (Important 1).** `GamePlayerPage`/`GameMasterPage` nunca
passavam `draggablePieceIds` a `PiecesLayer`, que trata `undefined` como "toda peça é
arrastável" (a semântica certa para o editor de mapa, não para o jogo — o servidor é quem
decide onde a peça para, I1). Um dedo escorregando 5px no toque já passava o limiar de 4px
de arraste ali e cancelava o hold. As duas páginas agora passam `draggablePieceIds={new
Set()}` (constante de módulo, para a identidade nunca invalidar os memos do
`PiecesLayer`). Isso expôs um bug latente: com `draggable: false`, um press que anda mais
que a tolerância de 6px do hold tracker cancela o hold e `end()` retorna `"none"` — mas
`handleUp`/`handleWindowUp` só suprimiam `onPieceSelect` em `"hold"`, então um pan
começando sobre uma peça (ex.: parte de uma seleção múltipla) virava clique e
`replaceTarget` apagava o resto da seleção. `shouldSelectOnRelease` (nova função pura em
`useHoldGesture.ts`) só libera `onPieceSelect` em `"click"` quando `onPieceLongPress` foi
passado (jogo); a lobby (sem esse prop, R19) mantém o comportamento de sempre selecionar.

### Empilhamento em cascata

**Decisão.** Quando N peças dividem um slot, são desenhadas em cascata: cada ocupante
extra desloca `0.18 × inradius` (`STACK_STEP`) em x e y, no máximo 3 visíveis, e a de cima
leva um selo `×N` quando `N > 1`. A ordem é estável por `id`, e a peça selecionada (ou do
próprio jogador) é desenhada por último, no topo (`stackOffsets`,
`src/features/tactical-map/utils/stacking.ts`).

**Por quê.** Não exige asset nem textura nova, funciona igual em grade quadrada e hexagonal
(o deslocamento é fração do inradius, que `slotInradius` já calcula para os dois), continua
legível com zoom baixo, e é derivação pura da lista de peças — nenhum estado novo.
`PieceSprite` já desenhava offset e sombra por `z`; a cascata reusa exatamente esse
mecanismo, com `stackOffsetToPx` convertendo fração → pixels tanto para o sprite quanto
para o anel de hold (para o anel não flutuar longe de uma peça empilhada). É desenho de
protótipo, como o spec §7.2 já assumia — declarado para evoluir depois.

### O mestre clica numa peça que não controla, sem ator selecionado

**Decisão.** A peça vira **inspecionada**: recebe moldura de foco e a aba Personagens rola
até aquele personagem. Nada é enviado ao servidor, e ela não vira ator (`GameMasterPage.
handlePieceSelect`: sem `actorId`, clique num NPC controlável vira ator; clique numa peça
de jogador vira `inspectedId`, força a aba Personagens e abre a gaveta).

**Por quê.** Virar ator produziria `action actor does not match player` na primeira
tentativa de declarar — o servidor só deixa o mestre agir por NPC. E não fazer nada
desperdiçaria o gesto mais natural numa mesa ("quem é esse, como ele está"), que a Fase 6
já consegue responder porque o HP do mestre chega por `character_hp_changed`.

## Exceções declaradas ao invariante I2

I2 diz que nenhum componente abaixo da rota pergunta "sou mestre?". Três exceções
sobrevivem, todas conscientes:

1. **`TacticalMapStage.fogDisabled={isMaster}`** — já existia antes desta fase, é da fatia
   do mapa, não desta; ficou como estava.
2. **`WallActionSheet`** (ruling R23) — continua recebendo `isMaster` porque o menu de
   parede tem verbos diferentes por papel (`enqueue_action` vs `enqueue_master_action`). O
   plano original extraía o componente sem mudar sua API. Consequência colateral: paredes
   **não** viraram alvo do `ActionComposer` nesta fase (o spec §6 previa "parede marca
   alvo" como alvo do composer) — o menu de parede continua sendo o único caminho para
   interagir/atacar parede.
3. **`MatchCharactersSidebar`** (ruling R25) — organismo pré-existente compartilhado com o
   lobby (`MatchPage`), onde `isMaster` já controlava se a linha era clicável. Mudar a API
   dele está fora do escopo desta fase; aceito como terceira exceção declarada. Custo
   conhecido: as linhas de personagem nunca são clicáveis para o jogador (o organismo
   precisaria de um `isOwn` que não existe).

## O fantasma da intenção declarada

Cópia translúcida da peça no slot pretendido + seta ligando origem e destino
(`GhostLayer.tsx`, montado em `ViewportInner` depois de `PiecesLayer` para desenhar por
cima das peças reais). Chave: o `actionId` de `action_enqueued`; antes do ack vive sob
`local-N` (ver seção do reducer acima). `eventMode="none"` — nunca intercepta ponteiro.
Respeita I1: desenha só o pedido (`from`/`to`), nunca uma posição calculada.

**Desvio do spec (ruling R22).** Com `move.from` opcional (a `ActionComposer` só o envia
quando o ator tem peça no tabuleiro — `actorSlot`), `useMatchCombat.enqueueAction` só
constrói um fantasma quando `payload.move?.from` existe: sem origem conhecida não há como
desenhar a seta. Na prática isso só afeta atores sem peça no mapa, um caso de borda; toda
página sempre passa `actorSlot` quando o ator tem peça.

## O que não tem cobertura de teste

A camada Pixi inteira: `src/test/setup.ts` mocka `@pixi/react` (tudo vira `<div>`) e
`ResizeObserver` com dimensão zero. Isso inclui `PiecesLayer`, `PieceSprite`, `GhostLayer`,
`WallsLayer`, `MapHandlesLayer` — seleção de peça, long-press sobre a peça de verdade, o
fantasma desenhado, a cascata de empilhamento e o clique em slot vazio só são verificáveis
no browser, nunca pelo vitest.

O que **é** coberto: `combatReducer` (guarda de `seq`, `match_full_state` substituindo
tudo, ordem invertida `turn_closed`/`resolution_updated`, vida do fantasma, HP, eventos),
`actionDraft` (persistir, migrar alvo, `localStorage` que lança), `useMatchWs` (despacho
por tipo, `error`, mensagem desconhecida não derruba nada), `useHoldGesture` (timers
falsos: dispara, cancela por movimento, cancela por soltar, suprime o clique seguinte), e
as páginas via integração com MSW + socket falso + um stub do `TacticalMapViewer` que
renderiza um botão por peça (`select-actor-${characterId}`) para simular cliques no mapa
sem depender do Pixi real.

## O que ficou fora (spec §13) e desvios deliberados do spec

**Fora de escopo, como o spec já previa:** reações; edição do mestre (`edit_action`);
histórico por REST; ficha e inventário dentro da partida; Nen; cancelar ação (não existe no
contrato); `add_npc` com a sala viva (o NPC entra pelo REST antes de a sala nascer);
o fantasma de espera; migrar os breakpoints antigos do resto do app.

**Desvios decididos durante a implementação, registrados no ledger:**

- **R23 — paredes não são alvo do composer.** O spec §6 dizia "clicar numa peça, parede ou
  campo marca o alvo". A implementação manteve o menu de parede separado
  (`WallActionSheet`) em vez de fazer clique em parede alimentar o `ActionComposer`. Ver a
  exceção I2 #2 acima. **Emenda da revisão final (R29):** o menu do jogador era sempre
  recusado pelo servidor — `send.wallAction`/`ws.sendAction` mandava `enqueue_action` sem
  `actorId`, e o contrato exige o campo (erro `invalid_action`, "actorId is required");
  pior, o `WS_ERROR` daquele `enqueue_action` derrubava o fantasma de uma declaração do
  composer em voo (mesmo mecanismo do R2, sem distinguir quem mandou). O menu do jogador
  agora passa por `send.enqueueAction` com `actorId` = a sheet do próprio jogador,
  `targetId: [wallId]`, `interact`/`attack` como antes, e `clearsDraft: false` (R28) — o
  envio entra no mesmo FIFO de `pendingSends` do composer, então ack/erro não colidem mais
  com um envio alheio. `wallAction` saiu do `send` de `useMatchCombat` (nada mais usava). O
  menu do mestre (`enqueue_master_action`, sem `actorId` no contrato) não muda.
- **R22 — sem `move.from` conhecido, não há fantasma.** Ver seção "O fantasma" acima.
- **R24 — `panelOpen`/`asideOpen` em vez do comportamento implícito do spec.**
  `MatchStageTemplate` ganhou os dois props (default `true`); abaixo de `railUp` um painel
  fechado some por CSS, abaixo de `asideUp` uma gaveta fechada some por CSS — sem isso a
  bottom sheet/gaveta do celular cobriria o mapa permanentemente. Acima desses breakpoints
  eles sempre aparecem, independente do estado. O rail alterna o painel; um controle na
  topbar alterna a gaveta. Decisão pura de CSS — nenhum `useMediaQuery` decide o quê
  montar. **Emenda da revisão final (Important 4):** abaixo de `railUp`, `RailZone` e
  `PanelZone` eram ambos `position: fixed; bottom: 0` empilhados no mesmo canto — como as
  páginas nascem com `panelOpen=true`, o painel aberto cobria o rail (o único controle pra
  fechá-lo) e não havia como fechar (`ActionComposer` não tem botão de fechar próprio).
  `MatchStageTemplate` ganhou uma constante `RAIL_BAR_HEIGHT` (56px): abaixo de `railUp` o
  painel passa a `bottom: RAIL_BAR_HEIGHT` (acima do rail, não empilhado nele) e o
  `StageZone` reserva a mesma faixa (`padding-bottom`) para o mapa não ficar embaixo do
  rail fixo. Em/acima de `railUp` os dois voltam ao normal (o rail entra na grade como
  coluna estática) — ainda decisão só de CSS.

## Verificação no browser

A verificação manual descrita no spec §12 e no brief da Tarefa 14 (seleção, long-press,
botão direito, fantasma, cascata, fechamento de turno em duas telas, ação por NPC, recusa
do servidor, reconexão, os quatro formatos) **não foi executada por este agente** — depende
de login interativo e de uma mesa com mapa + NPC já montados, que exigem um humano na
frente do browser. A suíte automatizada (vitest, incluindo os testes de integração das
páginas com MSW + socket falso) cobre tudo que não é puramente Pixi; os itens acima ficam
como pendência de validação manual explícita (ruling R26 do ledger).
