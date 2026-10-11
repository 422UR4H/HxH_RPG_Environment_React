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

- `actorWallVerbs` (compositor, jogador ou NPC): passagem destrancada → Abrir/Fechar; porta trancada
  → Arrombar fechadura; destrutível (`maxHp > 0`, não terreno, não destruída) → Atacar.
- `masterWallVerbs` (a mão do mestre): porta/janela → Abrir/Fechar ignorando a tranca, e
  Trancar/Destrancar; porta secreta → Abrir/Fechar e Revelar enquanto escondida. Parede comum e
  terreno, nada — o mestre ataca por um NPC. Rótulos em `MASTER_WALL_LABELS`.
- Também tem os rótulos (`WALL_TYPE_LABELS`, `ACT_LABELS`, `ACT_NOUNS` do "Declarar …").

## Tela

- `ActionComposer`: o 2º interruptor mostra o verbo (⚔ Atacar, 🚪 Abrir…). Com parede, o seletor
  "O que fazer"; armas e a dica "Ataque à distância?" só no ataque.
- `useGameTable.nameOf` nomeia paredes pelo tipo: fila, histórico, declaradas e balões dizem
  "Janela" em vez de `?`. `describeAction` e o balão nomeiam a passagem ("Abrir Janela").
- `IntentPreview.targetWalls`: a parede-alvo desenhada na cor do ataque, com a linha até o meio
  dela (some quando encostado, como a da peça adjacente).
- `WallMasterPanel` ("Ação do Mestre", no Agir) — `enqueue_master_action` na hora, com o estado
  da parede ("Fechada, trancada."). Sem NPC, é o que o toque abre. **Com NPC**, a parede tocada vai
  ao compositor e o card aparece embaixo dele enquanto ela é o alvo único (ou quando o NPC não tem
  o que fazer com ela) — o atalho do mestre sem soltar o NPC. O card lê a parede ao vivo
  (`masterWallId`). Tocável no mestre = verbo do NPC **ou** da mão do mestre.

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

## Limites conhecidos

- `lockpick` não rola nada: a corrente de testes de perícia não é executada no servidor. O mestre lê
  a tentativa e destranca pela mão dele.
- O jogador **vê** que a porta está trancada (o verbo vira "Arrombar fechadura" sem ele tentar).
  O servidor já está pronto para o "tentar abrir" (a abertura de porta trancada não é recusada no
  envio, só não abre), mas falta esconder `locked` dos jogadores e avisar quem tentou.
- O alcance é checado no envio, não de novo na abertura do turno (como o `move_blocked`).
- Grade **hex**: o servidor usa um hexágono com metade do tamanho do front (`size = cellSize/2` ×
  `cellSize`). Alcance e `move_blocked` em mapa hex divergem até isso ser unificado. O transform do
  Go também difere do front (pivô, ordem, origem) — afeta o fog em mapa girado/isométrico.
- Porta secreta revelada: o jogador ainda não tem Abrir/Fechar nela (só o mestre).
