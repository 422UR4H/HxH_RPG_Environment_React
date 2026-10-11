# Parede como alvo do compositor de ação — design

Data: 2026-10-10. Escopo: só front (`System_X_System_React`). O contrato WS não muda: `enqueue_action`
já aceita parede em `targetId`, com `attack` ou `interact`, e com `move` junto
(`System_X_System/docs/dev/api/match-combat-ws.md`, `targetId`: "Alvos podem ser personagens **ou
paredes**").

## Problema

1. Tocar numa parede abre um modal (`WallActionSheet`) que **envia na hora**, por fora do compositor:
   sem aproximação, sem escolha de arma, sem ação combinada. Na prática a interação ponta a ponta
   não funciona como jogo: o ataque sai de onde o ator está (verificado no browser: um NPC a 7 casas
   bateu numa janela), e a fila/histórico/declaradas mostram o alvo como `?` (o `nameOf` só conhece
   personagens).
2. Um toque numa parede também dispara o toque de slot vazio na mesma soltura (o `WallsLayer` ouve no
   canvas, o `PiecesLayer` na `window`). O modal escondia isso; no compositor, viraria um destino manual
   por cima da aproximação.

### Sobre "a action não é enviada para o mestre"

Reproduzido pelo mestre (NPC Haualu → Atacar numa janela): `enqueue_action` sai, `action_enqueued` e
`action_queued` chegam, o turno abre e o `wall_hp_changed` vem. O envio funciona; o que quebra é o
jogo em volta (alvo `?`, sem alcance/aproximação). O lado do jogador não pôde ser reproduzido sem
logar como outro usuário; o caminho de envio do jogador é o mesmo `enqueue_action`. Com este design
o jogador passa a enviar pelo mesmo caminho do ataque a personagem, que já funciona ponta a ponta.

## Decisão

A parede vira **alvo** do rascunho, como uma peça. O modal sai.

### Modelo (`actionDraft.ts`)

A metade "que mira em alguém" do rascunho deixa de ser só ataque:

```ts
type ActKind = "attack" | "open" | "close" | "lockpick";
ActionDraft.act?: { targets: string[]; kind?: ActKind; weapon?: string }   // era `attack`
```

- `kind` ausente = ataque. Personagem só aceita `attack`.
- O verbo de parede vale só com **uma** parede como alvo (o toque numa parede troca o alvo; segurar
  continua só para personagens). Juntar um personagem por segurar volta o verbo para `attack`.
- Chave do `localStorage` sobe para `match-draft:v3:` (o formato mudou; a v2 vira legado e é limpa
  por `purgeLegacyMatchStorage`, que já remove qualquer prefixo diferente do atual).

### Alcance genérico

`ReachContext.targetOf(id)` substitui `slotOf(id)`:

```ts
type DraftTarget =
  | { kind: "character"; slot: SlotCoord }
  | { kind: "wall"; wall: WallSegment; reach: SlotCoord[] };
```

- **Peça**: alcance = vizinhos do slot (como hoje, via `approachSlot`).
- **Parede**: alcance = slots que **encostam** no segmento (`wallContactSlots`, amostrando o segmento
  e deslocando um quarto de célula para cada lado — vale para quadrado e hex, com qualquer rotação,
  porque trabalha no espaço local da grade, o mesmo de `WallSegment.p1/p2`).
- `approachReach({ actor, reach, isFree, isPathClear })`: se o ator já está num slot do alcance,
  `in_reach`; senão o slot livre do alcance mais perto do ator. `approachSlot` (peça) delega a ele.
- **Novo para os dois tipos de alvo**: a proposta descarta slots cujo caminho em linha reta o
  servidor recusaria (`move_blocked`: parede com `move` e fechada no meio). Sem isso, o lado de lá da
  própria parede seria proposto como "ao lado".
- `targetSteps` da parede = passos até o slot de alcance mais próximo + 1 (encostado = 1, como a
  peça adjacente). As mensagens "está a N espaços" e o `toggleMove` seguem iguais.

### Verbos de parede (`wallVerbs.ts`)

- Ator (jogador ou NPC do mestre, via `enqueue_action`): porta/janela destrancada → Abrir ou Fechar
  (pelo estado atual); porta trancada → Arrombar fechadura; destrutível (`maxHp > 0`, não terreno,
  não destruída) → Atacar. Destruída → nenhum. Mesma regra que o modal tinha para o jogador.
- Mestre sem ator (`enqueue_master_action`): porta/janela → Abrir/Fechar ignorando tranca. Mesma
  regra do modal para o mestre.
- Uma parede sem verbo **não é tocável**: o hit-test do `WallsLayer` passa a filtrar por
  `isWallTappable`, então o toque cai no slot como se a parede não estivesse ali (e o cursor não
  vira mãozinha).

Verbo padrão ao tocar: se o rascunho já mira com `attack` e a parede aceita ataque, continua ataque
("se for uma action de ataque, o usuário seta o ataque como faria com outro personagem"); senão, o
primeiro verbo da parede (abrir/fechar/arrombar antes de atacar). `resolveDraft` normaliza: um verbo
que a parede deixou de aceitar (alguém abriu a porta) cai no primeiro aceito; uma parede sem verbo
nenhum (destruída) sai dos alvos.

### Tela

- `ActionComposer`: o segundo interruptor mostra o verbo atual (⚔ Atacar / 🚪 Abrir…). Na seção,
  com parede como alvo, um seletor "O que fazer" com os verbos; armas só quando o verbo é Atacar.
  Botão: "Declarar ataque / abertura / fechamento / arrombamento" (e "movimento + …").
- Mapa: a parede-alvo ganha o destaque de alvo na `IntentLayer` (segmento na cor do ataque + linha
  de ataque até o meio dela), como o anel da peça.
- `nameOf` conhece paredes ("Porta", "Janela", "Parede"…): fila, histórico, declaradas e balões
  deixam de mostrar `?`. `describeAction` passa a nomear a passagem ("abrir Porta").
- Mestre **sem** NPC: o toque numa porta/janela abre o card "Ação do Mestre" no painel Agir (não um
  modal), com Abrir/Fechar imediatos via `enqueue_master_action`. Com NPC escolhido, a parede é alvo
  do compositor como para o jogador. O "Abrir" instantâneo do mestre deixou de aparecer junto do
  NPC — para usá-lo, solta-se o NPC (×).

### Toque consumido (zona Pixi)

`tapGesture.ts` ganha `consumeTap(e)` / `isTapConsumed(e)` (um `WeakSet` de eventos). O `WallsLayer`
consome o `pointerup` que acertou parede tocável; o `PiecesLayer` não dispara `onEmptySlotClick` para
um toque consumido. Nenhum `stopPropagation`: os outros ouvintes de `pointerup` (pan, hold, trackers)
continuam recebendo — o bug do pan preso veio justamente de soltura perdida.

## O que não muda / fica de fora

- Contrato e back: nada. **Lacunas do back encontradas** (não corrigidas aqui, para discutir):
  `lockpick` não faz nada no servidor (`ApplyWallInteract`: "TODO"); `open` de jogador numa porta
  trancada não é recusado pelo servidor (só o front esconde o botão); o servidor não exige alcance
  para atacar parede; `IsPathBlocked` compara centros transformados com paredes em coordenadas
  locais (diverge em grade rotacionada — o front espelha o servidor).
- Porta secreta revelada continua sem Abrir (o modal também não oferecia).
- `WallActionSheet` é removido.
