# Parede como alvo do compositor

> Spec: `docs/superpowers/specs/2026-10-10-front-wall-as-target-design.md`.
> Contrato: `System_X_System/docs/dev/api/match-combat-ws.md` — `enqueue_action` aceita parede em
> `targetId`, com `attack` ou `interact`, e com `move` junto. A segunda rodada (back
> `feat/wall-lock-reach`) acrescentou: `interact` exige encostar na parede (`out_of_reach`), o
> personagem não abre passagem trancada, `lock`/`unlock` do mestre, e `move_blocked` medido no
> espaço local da grade.

Este documento vem depois de `combate-polimento-mesa.md`. Supera o desvio **R23** da Fase 6
(`combate-fase-6.md`): o menu de parede (`WallActionSheet`) saiu, e a parede é alvo do compositor
como uma peça.

## O rascunho: `act` no lugar de `attack`

`actionDraft.ts`. A metade do rascunho que mira em alguém virou `act: { targets, kind?, weapon? }`.
`kind` ausente = ataque; `open` / `close` / `lockpick` só valem com **uma** parede como alvo.
Vários alvos — personagens e paredes misturados, um golpe em área — são sempre ataque.

- `chooseTarget` (personagem) e `toggleTarget` (segurar) são sempre ataque.
- `toggleWallTarget` (segurar numa parede): sozinha, é como o toque; junto de outros alvos, entra
  como ataque — uma parede que não se ataca (indestrutível) não entra; segurar de novo a tira.
- `chooseWallTarget(draft, wall)`: troca o alvo pela parede. Verbo: se a ação já era ataque e a
  parede aceita ataque, continua ataque; senão, o primeiro verbo da parede.
- `setActKind`: o seletor "O que fazer". `toggleAct` é o antigo `toggleAttack`.
- `resolveDraft` normaliza contra o tabuleiro de agora: parede sem verbo (destruída) sai dos alvos;
  com vários alvos, a parede que não se ataca sai;
  verbo que a parede deixou de aceitar (a porta foi aberta) cai no primeiro aceito; personagem entre
  os alvos força ataque. `resolved.act.kind` é sempre presente; `resolved.act.verbs` só existe com
  parede como alvo único (é o que liga o seletor na tela).
- **Alcance da interação**: com um verbo de parede, `resolved.outOfReach` diz se a casa onde a ação
  deixa o ator (o destino, ou onde ele está) não encosta na parede — `draftVerdict` dá
  `out_of_reach` e Declarar trava, com a dica. É o que o servidor recusa. O ataque não exige.
- `buildEnqueuePayload`: ataque → `attack: { weapon? }`; verbo de parede → `interact: { kind }`.
- `draftFromDeclared` devolve também a declarada de parede perdida (F10).
- Chave do `localStorage`: `match-draft:v3:`. A v2 é limpa por `purgeLegacyMatchStorage`.

## Alcance genérico

`ReachContext.targetOf(id)` devolve `{ kind: "character", slot }` ou
`{ kind: "wall", wall, reach }`. `reach` é `wallContactSlots(wall, grid)`
(`tactical-map/utils/wallReach.ts`): os slots que encostam no segmento, amostrado no espaço local
da grade com um quarto de célula para cada lado — quadrado ou hex, qualquer rotação.

- `approachReach` (`reach.ts`): já num slot do alcance → `in_reach`; senão o livre mais perto.
  `approachSlot` (peça) delega a ele com os vizinhos do slot.
- `isPathClear` (`ReachContext`, opcional): a proposta descarta o slot que o servidor recusaria
  alcançar em linha reta (`move_blocked`). Vale para peça também. Espelha o servidor: centros no
  espaço **local** da grade (`slotToLocal`, o das paredes) contra as paredes com `move` e fechadas.
- `stepsToReach`: parede encostada = 1 passo, como peça adjacente.

## Verbos (`wallVerbs.ts`)

- `actorWallVerbs` (compositor, jogador ou NPC): passagem destrancada → Abrir/Fechar; trancada
  → Arrombar fechadura (janela trancada, nada); toda parede em pé que não é terreno → Atacar — a
  indestrutível também (num golpe em área ela só não recebe dano). Porta secreta **revelada** é
  uma porta; escondida, é uma parede. Destruída: nada.
- `masterWallVerbs` (a mão do mestre): passagem → Abrir/Fechar ignorando a tranca, e
  Trancar/Destrancar; porta secreta escondida → Revelar; **toda** parede em pé → Destruir (a
  indestrutível e o terreno também: um terremoto não é ataque). Destruída: nada. Rótulos em
  `MASTER_WALL_LABELS`; `wallLifeText` ("Vida 7/10", "Indestrutível", "Destruída").
- Também tem os rótulos (`WALL_TYPE_LABELS`, `ACT_LABELS`, `ACT_NOUNS` do "Declarar …").

## Tela

- `ActionComposer`: o 2º interruptor mostra o verbo (⚔ Atacar, 🚪 Abrir…). Com parede, o seletor
  "O que fazer"; armas e a dica "Ataque à distância?" só no ataque.
- `useGameTable.nameOf` nomeia paredes pelo tipo e material (`wallName`): fila, histórico,
  declaradas, balões e o card do mestre dizem "Janela de madeira", "Parede de pedra" em vez de `?`
  (o terreno não tem material). `describeAction` e o balão nomeiam a passagem ("Abrir Janela").
- `IntentPreview.targetWalls`: a parede-alvo desenhada na cor do ataque, com a linha até o meio
  dela (some quando encostado, como a da peça adjacente).
- `WallMasterPanel` ("Ação do Mestre", no Agir) — **só sem NPC**: com NPC o mestre age só pelo
  NPC (decisão do dono do produto: misturar os dois confunde). Sem NPC, **toda** parede é tocável —
  o mestre lê a vida até da destruída. Tocar troca a seleção; segurar (ou clique direito) junta
  (`masterWallIds`). Uma parede: vida (com barra), estado, resistência e os verbos dela. Várias: a
  vida de cada uma e "Destruir N" (as de pé). As selecionadas ficam destacadas no mapa
  (`masterWallPreview`, a mesma linha da parede-alvo). **Destruir pede confirmação** (diálogo
  "Destruir N paredes?" — não tem volta, e um clique errado derrubaria a parede). A destruída
  mantém a barra, vazia: "Destruída · vida 0/40".
- `ResolutionDetails` mostra o bloco **Paredes** (`resolution.walls`): quanto cada uma vai perder e
  como fica — o golpe cai no **fechamento** do turno —, indestrutível sem dano, e a interação que
  falhou ("trancada — não abriu"). O feed e o histórico (`EventStream`) põem o desfecho das paredes
  na linha do turno ("Porta −1", "Janela destruída").

## Toque: parede × slot vazio (zona Pixi)

`tapGesture.ts` — `consumeTap(e)` / `isTapConsumed(e)`, um `WeakSet` de eventos. O `WallsLayer`
(ouvinte no canvas) consome o `pointerup` que acertou parede tocável; o `PiecesLayer` (ouvinte na
`window`, que vem depois na subida) não dispara `onEmptySlotClick` para um toque consumido. Sem
`stopPropagation` — os outros ouvintes de `pointerup` precisam da soltura.

**Segurar** numa parede (ou clique direito) é o mesmo gesto da peça: `WallsLayer` usa o
`createHoldTracker` e o `contextmenu`, e chama `onWallLongPress` (mesmo encanamento de
`onWallClick`). A soltura de um segurar é consumida — não vira toque de parede nem destino.

`isWallTappable` (Viewer → Stage → ViewportInner → WallsLayer) filtra o hit-test: parede sem verbo
para quem toca não ganha cursor de clique nem `onWallClick`, e o toque cai no slot embaixo. As
páginas passam `onWallClick` só quando o toque é delas (jogador com ator e fora da escolha da casa
da fuga; mestre só no modo de jogo).

## Escolher uma casa no mapa (fuga, onde cai)

- **Casa da fuga: o toque envia**, sem confirmar (decisão do dono do produto: a reação tem de ser
  rápida para a narração não parar, e um toque errado faz parte do jogo). O botão da fuga fica
  aceso enquanto se escolhe (`ReactionButtons.armed`) e a dica no mapa diz o que fazer.
- **Onde cai** a fuga que falhou (mestre): `MapPickConfirm` — o toque **escolhe** a casa (o azul do
  compositor, com o caminho) e o **Confirmar** da barra envia; tocar outra troca. Sem modal e sem
  coluna/linha. Escolhida, ela fica marcada como fantasma (`intentGhosts` do mestre) e o card diz
  "Você já escolheu onde cai — marcado no mapa".

## Seletores (`choiceStyles.ts`)

Escolher entre poucas opções é tocar num botão — nunca a bolinha de rádio nem a caixinha nativa.
`choiceStyles.ts` reúne os seletores da mesa (antes só do compositor): `Toggles`/`Toggle` (botões
grandes, 2 por linha; `aria-pressed` num interruptor, `aria-checked` numa opção de `radiogroup`),
`Segmented`/`Segment` e os cards de arma (`WeaponList`/`Weapon`). Usados no compositor, no diálogo
de **Nova cena** (Batalha / Roleplay) e no de **reação** (tipo, Evasão como interruptor à parte,
arma do Repelir em cards). `ActionComposer.styles` os reexporta.

## O viés que o sistema aplica sozinho

Uma reação que cobra barra e **consome** a ação da fila (ou de quem cancelou antes na rodada)
rola as velocidades com Desvantagem do motor (`systemBias: -1`). O painel do mestre mostra:
na reação esperando, "desvantagem do sistema — trocou a ação da fila"; na aberta, a explicação e
a etiqueta **desvantagem do sistema** na linha do Movimento (a esquiva, o aparo e a defesa não
pioram). O editor da rolagem avisa que o viés do mestre **soma** com o do sistema: Vantagem deixa
neutro (o primeiro lance, não o melhor — o viés só decide o sinal), Normal mantém; vantagem
líquida é o Modificador. "Ajuste" virou **Modificador**.

**Fugir para a mesma casa do movimento da fila não é troca** (servidor, `sameMoveAsQueued`):
consome o movimento, mas sem Desvantagem. Versão simples — vai ser enriquecida.

**Arco da porta** (`utils/wallSymbols.ts`): a porta é uma polilinha projetada no plano do chão
(coordenadas LOCAL → WORLD), não mais um `arc` do Pixi — acompanha a inclinação da grade.
A regra do `moveTo` inicial abaixo continua valendo.

**Desenho da porta destruída** (`WallsLayer.drawWallTypeSymbol`): o Pixi recomeça o caminho no
último ponto do traço anterior e o primeiro `lineTo` (antes, o `arc`) liga esse ponto ao arco. Na porta destruída o último ponto
era a quina do "×" (que cresce no zoom out) e saía uma diagonal torta; o arco agora começa com
`moveTo` no lugar dele. Na destruída, o símbolo de porta/janela fica apagado e o cadeado some.

## Histórico ao vivo das ações do mestre

As notícias de tabuleiro (`wall_state_changed`, `piece_moved`…) saem **antes** de o servidor gravar
a ação do mestre; rebuscar o histórico nelas voltava sem a ação. O histórico rebusca no
`master_action_recorded`, que sai depois da gravação e só para quem pode ler o registro (o mestre e
quem viu). `useGameTable` não rebusca mais na notícia de tabuleiro.

## Reações esperando e a rodada

- `orderPending` (`resolutionText.ts`): as reações esperando pela chave (velocidade, como a fila de
  ações), sem velocidade depois, com "chave N · chegou em Nº". A ordem de abrir continua do mestre.
- Dano: Push/Grab; desmarcar o atual manda `damageSkill: "None"` ("nenhuma — só a arma").
- "Encerrar rodada" trava com `bars.roundTurns === 0` (nenhum turno nesta rodada); o servidor
  recusa igual.

## Limites conhecidos

- `lockpick` não rola nada: a corrente de testes de perícia não é executada no servidor. O mestre lê
  a tentativa ("tentativa sem teste — o mestre decide") e destranca pela mão dele.
- O jogador **vê** que a porta está trancada (o verbo vira "Arrombar fechadura" sem ele tentar).
  O servidor já está pronto para o "tentar abrir" (a abertura de porta trancada não é recusada no
  envio, só não abre), mas falta esconder `locked` dos jogadores e avisar quem tentou.
- O alcance é checado no envio, não de novo na abertura do turno (como o `move_blocked`).
- Grade **hex**: o servidor usa um hexágono com metade do tamanho do front (`size = cellSize/2` ×
  `cellSize`). Alcance e `move_blocked` em mapa hex divergem até isso ser unificado. O transform do
  Go também difere do front (pivô, ordem, origem) — afeta o fog em mapa girado/isométrico.
