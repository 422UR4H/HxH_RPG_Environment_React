# Parede como alvo do compositor

> Spec: `docs/superpowers/specs/2026-10-10-front-wall-as-target-design.md`.
> Contrato (sem mudança): `System_X_System/docs/dev/api/match-combat-ws.md` — `enqueue_action`
> aceita parede em `targetId`, com `attack` ou `interact`, e com `move` junto.

Este documento vem depois de `combate-polimento-mesa.md`. Supera o desvio **R23** da Fase 6
(`combate-fase-6.md`): o menu de parede (`WallActionSheet`) saiu, e a parede é alvo do compositor
como uma peça.

## O rascunho: `act` no lugar de `attack`

`actionDraft.ts`. A metade do rascunho que mira em alguém virou `act: { targets, kind?, weapon? }`.
`kind` ausente = ataque; `open` / `close` / `lockpick` só valem com **uma** parede como alvo.

- `chooseTarget` (personagem) e `toggleTarget` (segurar) são sempre ataque.
- `chooseWallTarget(draft, wall)`: troca o alvo pela parede. Verbo: se a ação já era ataque e a
  parede aceita ataque, continua ataque; senão, o primeiro verbo da parede.
- `setActKind`: o seletor "O que fazer". `toggleAct` é o antigo `toggleAttack`.
- `resolveDraft` normaliza contra o tabuleiro de agora: parede sem verbo (destruída) sai dos alvos;
  verbo que a parede deixou de aceitar (a porta foi aberta) cai no primeiro aceito; personagem entre
  os alvos força ataque. `resolved.act.kind` é sempre presente; `resolved.act.verbs` só existe com
  parede como alvo único (é o que liga o seletor na tela).
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
  alcançar em linha reta (`move_blocked`). Vale para peça também. Espelha o servidor: centros com
  transform (`slotToWorld`) contra as paredes com `move` e fechadas.
- `stepsToReach`: parede encostada = 1 passo, como peça adjacente.

## Verbos (`wallVerbs.ts`)

- `actorWallVerbs` (compositor, jogador ou NPC): passagem destrancada → Abrir/Fechar; porta trancada
  → Arrombar fechadura; destrutível (`maxHp > 0`, não terreno, não destruída) → Atacar.
- `masterWallVerbs` (mestre sem NPC): porta/janela → Abrir/Fechar, ignorando tranca.
- Também tem os rótulos (`WALL_TYPE_LABELS`, `ACT_LABELS`, `ACT_NOUNS` do "Declarar …").

## Tela

- `ActionComposer`: o 2º interruptor mostra o verbo (⚔ Atacar, 🚪 Abrir…). Com parede, o seletor
  "O que fazer"; armas e a dica "Ataque à distância?" só no ataque.
- `useGameTable.nameOf` nomeia paredes pelo tipo: fila, histórico, declaradas e balões dizem
  "Janela" em vez de `?`. `describeAction` e o balão nomeiam a passagem ("Abrir Janela").
- `IntentPreview.targetWalls`: a parede-alvo desenhada na cor do ataque, com a linha até o meio
  dela (some quando encostado, como a da peça adjacente).
- Mestre **sem** NPC: porta/janela tocada abre `WallMasterPanel` ("Ação do Mestre") no Agir —
  `enqueue_master_action` na hora. Com NPC, a parede vai ao compositor. O card lê a parede ao vivo
  (`masterWallId`), então o botão alterna Abrir/Fechar sozinho.

## Toque: parede × slot vazio (zona Pixi)

`tapGesture.ts` — `consumeTap(e)` / `isTapConsumed(e)`, um `WeakSet` de eventos. O `WallsLayer`
(ouvinte no canvas) consome o `pointerup` que acertou parede tocável; o `PiecesLayer` (ouvinte na
`window`, que vem depois na subida) não dispara `onEmptySlotClick` para um toque consumido. Sem
`stopPropagation` — os outros ouvintes de `pointerup` precisam da soltura.

`isWallTappable` (Viewer → Stage → ViewportInner → WallsLayer) filtra o hit-test: parede sem verbo
para quem toca não ganha cursor de clique nem `onWallClick`, e o toque cai no slot embaixo. As
páginas passam `onWallClick` só quando o toque é delas (jogador com ator e fora da escolha da casa
da fuga; mestre só no modo de jogo).

## Limites conhecidos (do servidor, não corrigidos aqui)

- `lockpick` não faz nada (`ApplyWallInteract`: TODO de rolagem).
- `open` de um personagem numa porta trancada não é recusado — só o front esconde o verbo.
- O servidor não exige alcance para atacar ou interagir com parede: a aproximação é proposta do
  front, e desligar Mover ainda manda a ação de longe.
- `IsPathBlocked` do servidor compara centros **transformados** com paredes em coordenadas
  **locais**; numa grade rotacionada/achatada os dois espaços divergem. O front espelha o servidor.
