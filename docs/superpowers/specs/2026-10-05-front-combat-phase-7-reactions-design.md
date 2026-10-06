# Fase 7 do combate no front — Reações — design

> **Escopo:** o §7 do documento mestre
> (`System_X_System/docs/superpowers/specs/2026-09-20-front-combat-phases.md`), na versão de
> `main` depois do **PR #83** do back (pacote de back da Fase 7). Mais um pedido avulso do dono do
> produto: um botão na página da partida em andamento que leva ao jogo (§4.10). **Um PR, repo
> `System_X_System_React`.**
>
> Contrato: `System_X_System/docs/dev/api/match-combat-ws.md` (`attach_reaction`,
> `reaction_attached`, `open_reaction`, `reaction_opened`, `match_full_state`,
> `resolution_updated.targets`) e `match-history.md` (`reactions[].consumedActionIds`).
> Plano: [`../plans/2026-10-05-front-combat-phase-7-reactions.md`](../plans/2026-10-05-front-combat-phase-7-reactions.md).
>
> **Branch:** `feat/combat-phase-7-reactions`, a partir de `main` em `52a9fd8` (depois dos PRs
> #69 do front e #83 do back).

## 0. O workflow (cópia do §0.1 do documento mestre)

1. **Uma sessão por fase por repo.** Back e front rodam em paralelo quando não tocam arquivo em
   comum — são repos diferentes, então normalmente não tocam.
2. A sessão **lê o documento mestre e o contrato**, escreve o **design spec** e o **plano**, e
   **para** para o dono do produto revisar.
3. **Lacuna ou contradição: liste e pare.** Ela volta para o autor do documento, que corrige o
   texto. Não se contorna, e não se decide regra de jogo por conta.
4. Aprovado o spec, a sessão **compacta** e implementa **lendo o próprio plano do disco**.
5. Implementação por **subagent-driven-development**, uma tarefa por subagente.
6. **Verificação no browser, com três contas** (`test@`, `test2@`, `test3@mail.com`): um mestre
   e dois jogadores, jogando o caminho que o usuário faz.
7. PR aberto dizendo o que foi verificado e **o que não foi**.

> **Neste ciclo, o passo 2 foi dispensado pelo dono do produto** (2026-10-05: "prossiga com
> autonomia … vá direto para a implementação depois dos planos; qualquer coisa eu altero
> depois"). As decisões de forma que ele normalmente revisaria estão em §9; ele as revisa no PR.

## 1. O que você precisa saber antes

- **O servidor é a fonte** (§0.2 do mestre). Nada que descreve a partida vive só no cliente:
  depois de recarregar, as reações voltam de `match_full_state` (`openTurn.reactions`,
  `ownReactions`), não do `localStorage`.
- **Uma reação é anexada pelo alvo** (`attach_reaction`) e **aberta pelo mestre**
  (`open_reaction`). Anexar entra no cálculo; abrir dá a palavra. **A ordem de abertura muda o
  desfecho** — e chega ao front pela ordem de `targets[]` (a cadeia).
- **Quem é alvo:** `turn_opened.action.targetId` (B2). O jogador reage pelos personagens dele; o
  mestre, pelos NPCs alvo (item 4 do back).
- **Cinco botões** (decisão 9): Não fazer nada, Esquivar, Escapar, Escape defensivo, Repelir. As
  fechadas saem da configuração (segurar) com um toque em **Evasão**: Esquivar + Evasão =
  `closedDodge`; Escapar + Evasão = `closedEscape`. A categoria do movimento é **fixa por tipo**:
  `escape`/`escapeGuard` → `Dash`, `closedEscape` → `Shift`. Não há seletor.
- **Clicar envia; segurar configura** (§7). Clicar em Escapar (ou Escape defensivo) **arma a
  escolha da casa** no mapa e o toque na casa envia, sem diálogo (decisão 6). Clicar em Repelir
  envia com a arma do rascunho daquele personagem; sem rascunho, desarmado.
- **O gesto de segurar já existe** (`createHoldTracker`, `useHoldGesture.ts`, Fase 6): timer de
  450 ms + atalho de botão direito. Os botões de reação o **reusam** — não há segundo mecanismo.
- **O front não escreve nome de perícia** (item 10): o payload mínimo de cada tipo está no
  contrato (`dodge: {}`, `repel: {}`/`{weapon}`, `move: {category, position}`).
- **A zona Pixi é pixel-tuned e não tem teste** (`src/test/setup.ts` mocka `@pixi/react`). O que
  este PR põe lá (um emissor de transformação da viewport) só se prova no browser.

## 2. As peças, em uma frase cada

| Peça | O quê |
|---|---|
| Wire | tipos de `reaction_attached`, `reaction_opened.reaction`, `openTurn.reactions`, `ownReactions`, `consumedActionIds`; `sendAttachReaction`/`sendOpenReaction` no socket |
| Reducer | estado das reações do turno aberto (as abertas, as minhas), o último resultado liquidado, e o consumo tirando ação da lista de declaradas e da fila |
| Modelo da reação | funções puras: tipo a partir de (botão, Evasão); payload; quem pode reagir agora; o estado de cada alvo meu |
| Âncora no mapa | o Pixi reporta a transformação da viewport; uma camada HTML posiciona coisas ao lado de uma peça |
| Botões de reação | os cinco botões com o gesto de segurar; o diálogo de configuração |
| Escolha da casa | o modo "escolher para onde escapa", nas duas páginas |
| Mestre | "Dar a palavra" no card em andamento, com a ordem de abertura visível |
| Fantasma de espera | a fuga aberta entra nos `ghosts` que o `IntentLayer` já desenha |
| Balões | mecânica ao abrir (ação e reações), resultado ao fechar |
| Botão "Entrar na partida" | na página da partida em andamento |

## 3. A forma geral

**Nenhum mecanismo paralelo.** O fantasma do escape é uma entrada a mais em `useGameTable.ghosts`;
o gesto de segurar é o `createHoldTracker`; a escolha da casa é o `onEmptySlotClick` que o
compositor e o `fallPick` já usam; o detalhe da reação reusa os textos de `combatText.ts`.

**Duas camadas no palco**, como hoje: o canvas Pixi (intocado, salvo o emissor da viewport) e,
por cima, uma camada HTML (`MapPieceOverlay`) que posiciona botões e balões no ponto da tela onde
uma peça está. HTML porque botão com foco, teclado, leitor de tela e styled-components são o
padrão do resto do front — e a zona Pixi não deve ser normalizada.

**As duas páginas usam o mesmo hook** (`useReactionControls`) para o que é comum: quem pode
reagir, o estado de cada alvo, o diálogo, a escolha da casa e o envio. A página só diz quais
personagens são "dela" (jogador: os seus; mestre: os NPCs) e onde desenhar.

## 4. O desenho, peça a peça

### 4.1 Wire

`combatMessages.ts`:

```ts
export type ReactionKind = "nothing" | "dodge" | "closedDodge" | "escape" | "escapeGuard" | "closedEscape" | "repel";

/** `attach_reaction` (c→s). Payload mínimo do contrato — o servidor deriva as perícias. */
export type AttachReactionPayload = {
  actorId: string;
  reactToId: string;
  reactionKind: ReactionKind;
  dodge?: Record<string, never>;
  move?: { category: MoveCategory; position: [number, number, number] };
  repel?: { weapon?: string };
};

/** `reaction_attached` (s→c): a quem reagiu e ao mestre. `consumedActionIds` sempre lista. */
export type ReactionAttachedPayload = { turnId: string; reactionId: string; actorId: string; consumedActionIds: string[] };

/** `reaction_opened` (s→c): a reação cortada para quem recebe (Full/Opened, `move` pelo fog). */
export type ReactionOpenedPayload = { turnId: string; reactionId: string; reaction?: HistoryAction };

/** `match_full_state.ownReactions[]`. `reactionKind` é o verdadeiro. */
export type OwnReactionPayload = { reactionId: string; actorId: string; reactionKind: ReactionKind; opened: boolean; consumedActionIds: string[] };
```

`MatchFullStatePayload.openTurn` ganha `reactions?: HistoryAction[]`; `MatchFullStatePayload`
ganha `ownReactions?: OwnReactionPayload[]`. `HistoryAction` (`types/matchHistory.ts`) ganha
`consumedActionIds?: string[]`. `CombatServerMessage` ganha os dois tipos novos.

`useMatchWs.ts`: `COMBAT_TYPES` ganha `reaction_attached` e `reaction_opened`;
`sendAttachReaction(payload)` → `"attach_reaction"`; `sendOpenReaction(reactionId)` →
`"open_reaction"`. `combatErrorMessages.ts`: `bySentType.attach_reaction = "Não foi possível
reagir"`, `open_reaction = "Não foi possível dar a palavra"`.

Nada a normalizar em `normalizeWire.ts`: o contrato garante `consumedActionIds` como lista, e
`reactions`/`ownReactions` são `omitempty` (ausente = vazio).

### 4.2 Reducer

`CombatState` ganha:

```ts
/** As reações ABERTAS do turno aberto, na ordem em que o mestre as abriu (já cortadas para mim). */
openReactions: HistoryAction[];
/** As MINHAS reações do turno aberto (jogador: meus personagens; mestre: meus NPCs). */
ownReactions: OwnReaction[];
/** O turno que acabou de fechar: o `turn_closed` zera `openTurn` antes de o liquidado chegar. */
closedTurn: { turnId: string; actorId: string; action?: HistoryAction } | null;
/** O último turno liquidado — para os balões de resultado. Some no próximo turn_opened. */
lastSettled: { turnId: string; actorId?: string; action?: HistoryAction; resolution: ResolutionPayload } | null;
```

```ts
export type OwnReaction = {
  /** Ausente enquanto `sending` (o id vem no reaction_attached). */
  reactionId?: string;
  actorId: string;
  turnId: string;
  kind: ReactionKind;
  status: "sending" | "attached" | "opened";
  consumedActionIds: string[];
};
```

| Mensagem / ação | Efeito |
|---|---|
| `REACTION_SENT` (local, depois que o envio saiu) | acrescenta `{actorId, turnId, kind, status: "sending", consumedActionIds: []}` |
| `reaction_attached` | a mais antiga `sending` daquele `actorId` vira `attached` com `reactionId` e `consumedActionIds` (sem nenhuma `sending` — o mestre recebendo a reação de um jogador — **não** cria entrada); tira de `declared` e de `queue` toda ação cujo id está em `consumedActionIds` (consumida, **sem** aviso de perda) |
| `reaction_opened` | acrescenta `payload.reaction` a `openReactions` (se ainda não está, pelo `uuid`); marca `opened` na minha de mesmo `reactionId` |
| `WS_ERROR` com `sentType === "attach_reaction"` | tira a `sending` mais antiga (o botão volta); guarda o erro |
| `turn_opened` | zera `openReactions`, `ownReactions` e `lastSettled` (turno novo) |
| `turn_closed` do turno aberto | zera `openReactions` e `ownReactions` |
| `turn_closed` (do turno aberto, antes de zerar o `openTurn`) | grava `closedTurn = {turnId, actorId, action}` |
| `resolution_updated` liquidado | `lastSettled = {turnId, actorId, action, resolution}`, lendo ator e ação de `closedTurn` quando o `turnId` bate (a ordem garantida é `turn_closed` → `resolution_updated` liquidado, e o `turn_closed` já zerou o `openTurn`) |
| `round_closed`, `scene_changed` | zeram `openReactions`, `ownReactions`; `scene_changed` zera também `lastSettled` |
| `match_full_state` | `openReactions = openTurn?.reactions ?? []`; `ownReactions` = `ownReactions` do payload (status `opened`/`attached`), descartando as locais; `lastSettled = null`; a reconciliação B12 trata como **consumida** (sai calada) toda declarada cujo id está em algum `ownReactions[].consumedActionIds` |

`resolveLostCandidates`: um id que aparece no `consumedActionIds` de uma reação do histórico
conta como **rodou** (sai calado), como uma ação que está no histórico.

> **Por que `closedTurn`:** o balão de resultado do atacante precisa saber quem agiu e o que
> declarou, e o `turn_closed` chega **antes** do `resolution_updated` liquidado (ordem garantida
> pelo contrato) e zera o `openTurn`.

### 4.3 Modelo da reação (`reactionModel.ts`, puro e testado)

```ts
export type ReactionButton = "nothing" | "dodge" | "escape" | "escapeGuard" | "repel";
export const REACTION_BUTTONS: ReactionButton[] = ["nothing", "dodge", "escape", "escapeGuard", "repel"];
export const REACTION_BUTTON_LABELS: Record<ReactionButton, string> = {
  nothing: "Não fazer nada", dodge: "Esquivar", escape: "Escapar", escapeGuard: "Escape defensivo", repel: "Repelir",
};
/** Evasão só muda Esquivar e Escapar (decisão 9). */
export function supportsEvasion(b: ReactionButton): boolean;           // dodge | escape
export function reactionKindOf(b: ReactionButton, evasion: boolean): ReactionKind;
export function needsDestination(kind: ReactionKind): boolean;          // escape | escapeGuard | closedEscape
export function moveCategoryOf(kind: ReactionKind): MoveCategory | undefined; // Dash | Shift (matriz §11.4)
export function buildReactionPayload(input: {
  actorId: string; reactToId: string; kind: ReactionKind;
  position?: [number, number, number]; weapon?: string;
}): AttachReactionPayload;
/** Os meus personagens que são alvo da ação aberta e ainda podem reagir. */
export function reactableTargets(openTurn: CombatState["openTurn"], mine: ReadonlySet<string>): string[];
/** O estado de um alvo meu: "available" | "sending" | "attached" | "opened". */
export function reactionStatusOf(actorId: string, own: OwnReaction[], turnId: string | undefined): ReactionStatus;
```

`buildReactionPayload` lança se a fuga vier sem `position` (bug de chamador). Parede em
`targetId` nunca vira botão: `reactableTargets` filtra pelo conjunto `mine`, que só tem fichas.

### 4.4 A âncora no mapa

- **Pixi (zona pixel-tuned, só um emissor):** `ViewportInner` ganha a prop opcional
  `onViewportTransform?: (t: ViewportTransform) => void`, com
  `ViewportTransform = { x: number; y: number; scale: number }`. Um callback no
  `app.ticker` compara `vp.x`, `vp.y`, `vp.scale.x` com o último emitido e emite quando muda —
  pega o pan feito pelos handlers de ponteiro próprios (que não disparam `moved`), o zoom e o
  enquadramento. `TacticalMapStage`, `stageProps.ts` e `TacticalMapViewer` só repassam a prop.
- **Conta (pura, testada):** `pieceScreenAnchor(slot, grid, t) = slotToWorld(slot, grid) * t.scale + (t.x, t.y)`
  e `pieceScreenRadius(grid, t) = slotInradius(grid) * t.scale` (em `utils/screenAnchor.ts`). Peça
  empilhada ancora no centro da casa (protótipo; §10.3 do mestre deixa o visual a critério).
- **Camada HTML:** `MapPieceOverlay` (`features/match/combat/MapPieceOverlay.tsx`) recebe
  `anchors: Array<{ key: string; x: number; y: number; radius: number; placement: "above" | "below"; children }>`
  e posiciona cada um absolutamente sobre o `CanvasWrapper`, com `pointer-events: none` no
  contêiner e `auto` nos filhos (o mapa continua recebendo o resto dos gestos). Âncora fora da
  caixa visível não é desenhada.
- **Só peça visível:** a âncora sai de `game.boardPieces`, que o servidor já recortou pelo fog.

### 4.5 Botões de reação e configuração

**`ReactionButtons`** (`features/match/combat/ReactionButtons.tsx`): para UM alvo meu.

- `status === "available"`: os cinco botões. Cada um com o `createHoldTracker` (pointerdown →
  `start`; pointermove → `move`; pointerup → `end()`: `"click"` → `onQuick(button)`, `"hold"` →
  `onConfigure(button)`), e `onContextMenu` → `preventDefault` + `onConfigure(button)` (o atalho de
  botão direito da Fase 6, sem esperar o timer). Teclado: Enter/Espaço = clique; Shift+Enter =
  configurar. `aria-label` "Esquivar — segure para configurar".
- `sending`: "Enviando a reação…".
- `attached`: "Reação enviada — aguardando o mestre".
- `opened`: "O mestre deu a palavra — narre sua reação".
- Mostra o nome do personagem quando `showName` (painel, e no mapa quando o dono tem mais de um
  alvo).

**`ReactionConfigDialog`** (mesmo padrão visual de `dialogStyles.ts`): abre com o botão segurado
pré-escolhido. Campos: os cinco tipos (radio); **Evasão** (toggle, habilitado só em Esquivar e
Escapar); **Arma** (só em Repelir: as armas do catálogo daquele personagem, `useCombatCatalogue`,
com o rascunho como padrão e "Desarmado"); o **custo** em texto (as barras que o tipo cobra, da
tabela do contrato, e "consome a ação que você tinha na fila, com Desvantagem" quando cobra).
Botões: **Enviar** (tipo sem destino: envia; tipo com destino: arma a escolha da casa e fecha) e
Cancelar.

### 4.6 A escolha da casa da fuga

`useReactionControls` guarda `pick: { actorId: string; kind: ReactionKind } | null`. Com `pick`:

- o toque num slot vazio (`onEmptySlotClick`) **envia** a reação com
  `move.position = slotToTriple(slot, z da peça do reator)` e limpa o `pick`;
- o mapa mostra a dica "Toque na casa para onde X escapa." e um botão "× Cancelar" (o mesmo
  `MapCornerStackButton` do `fallPick`); Esc cancela;
- `match_full_state`, `turn_closed` e `turn_opened` de outro turno derrubam o `pick` (o turno que
  ele mirava acabou);
- **jogador:** o `handleSlotTap` da página consulta o `pick` antes do compositor;
- **mestre:** `BoardMode` ganha `"reactionPick"`, exclusivo com `arrange` e `fallPick`
  (`exitBoardMode` limpa o `pick`).

O preview do slot tocado não é necessário: o toque envia.

### 4.7 O mestre: dar a palavra

`ResolutionDetails` ganha `onOpenReaction?: (reactionId: string) => void`:

- **Reações esperando** (`pendingReactions`): cada linha ganha o botão **Dar a palavra** →
  `open_reaction`. Acima da lista, a nota "A ordem em que você abre muda o resultado."
- **Ordem visível:** cada alvo com `reaction` (aberta) mostra "aberta em Nº" — N é a posição
  dele entre os alvos com reação em `targets[]`, que vem na ordem da cadeia (contrato). Sobrevive
  à reconexão porque a ordem vem do servidor.

`QueuePanel` repassa `onOpenReaction` ao `ResolutionDetails` do card em andamento.
`CloseTurnRefusedDialog` fica como está (já lista as pendentes e confirma).

### 4.8 O fantasma de espera

Em `useGameTable.ghosts`, uma terceira fonte: cada reação de `state.openReactions` com
`move.position` vira `{ from: casa atual da peça do reator, to: move.position }`. Some quando o
turno fecha (o reducer zera `openReactions`) — e a peça vai para onde o `piece_moved` mandar.
Quem não recebeu `position` (fog) não desenha. É o mesmo desenho do fantasma de intenção.

### 4.9 Balões

**`ActionBalloon`** (`features/match/combat/ActionBalloon.tsx`), ancorado **acima** da peça,
estilo balão de mangá (a ponta aponta para a peça):

| Quando | Onde | Cor | Texto |
|---|---|---|---|
| turno aberto | ator | cinza | a mecânica da ação: "Ataca A, B · Espada", "Dash → C4", "Abre a porta" |
| reação aberta | reator | cinza | "Fuga fechada → C5", "Repelir · Espada", "Esquiva", "Nada" |
| depois do liquidado | cada alvo | verde se `avoided`, vermelho se acertado | "esquivou" / "fugiu" / "aparou" / "defendeu · −3" / "−7" (dano projetado aplicado) |
| depois do liquidado | ator | verde se acertou alguém, vermelho se ninguém | "acertou 2 de 3" |

Os textos saem de funções puras testadas (`balloonText.ts`), reusando `REACTION_KIND_LABELS`,
`avoidedVerb`, `formatSlot`, `humanWeapon`. Os de resultado ficam até o próximo `turn_opened`
(ou troca de cena). O mestre vê os mesmos balões — o resultado que ele vê é o liquidado, igual
à mesa.

Os botões de reação ancoram **abaixo** da peça, para não brigar com o balão.

### 4.10 Botão "Entrar na partida" (pedido do dono do produto)

Hoje, com a partida em andamento, a página da partida não tem caminho para `/game`: é preciso
digitar a URL. Em `MatchPage`, no mesmo `BottomActions` dos outros estados, quando
`status === "ongoing"` e o usuário é o mestre ou tem personagem entre os participantes:
`primaryButton = { label: "Entrar na partida", onClick: navigate(`/campaigns/${campaignId}/matches/${matchId}/game`) }`.
É o lugar onde "Abrir Lobby" e "Entrar no Lobby" já aparecem nos estados anteriores — o usuário
procura ali o próximo passo. Partida encerrada (`ended`) não mostra o botão.

## 5. Reinício, recarga, queda (§0.2 do mestre)

| No meio de… | Recarregar / reconectar | Reiniciar o servidor |
|---|---|---|
| Escolhendo a casa da fuga | o `pick` cai (era só local, e o turno pode ter mudado) | idem |
| Reação enviada, sem resposta | `ownReactions` diz se ela chegou: se sim, "aguardando o mestre"; se não, o botão volta (a `sending` local é descartada no `match_full_state`) | o turno se perdeu: `openTurn` ausente, nenhum botão |
| Reação anexada, não aberta | `ownReactions` com `opened: false` → "aguardando o mestre"; o mestre a vê em `resolution.pendingReactions` | perdida com o turno; nenhum botão, nenhum fantasma |
| Reação aberta | `openTurn.reactions` devolve fantasma e balão, na ordem; `ownReactions` com `opened: true` | idem |
| Ação consumida pela reação | sai da lista de declaradas **sem** aviso (`ownReactions[].consumedActionIds`, ou o histórico) | a fila inteira se perdeu: aviso de perda, como hoje |
| Balão de resultado | some (efêmero; o histórico tem o resultado) | idem |

Nenhum caso deixa o cliente mostrando uma reação que o servidor não tem: o estado das reações é
sempre o do último `match_full_state` mais o que chegou depois.

## 6. Contratos consumidos (nenhum muda)

`attach_reaction`, `reaction_attached`, `open_reaction`, `reaction_opened`,
`match_full_state.openTurn.reactions`, `match_full_state.ownReactions`,
`resolution_updated.targets` (ordem da cadeia), `GET /history` (`reactions[].consumedActionIds`).

## 7. Testes e verificação

- **Unidade (vitest):** `reactionModel` (tipo por botão+Evasão, categoria fixa, payload mínimo de
  cada um dos 7 tipos, `reactableTargets`, `reactionStatusOf`); reducer (todas as linhas de §4.2,
  incluindo consumo e reconciliação); `resolveLostCandidates` com consumo; `screenAnchor`;
  `balloonText`.
- **Componentes (testing-library):** `ReactionButtons` (clique envia; segurar 450 ms configura —
  timers falsos; botão direito configura; estados); `ReactionConfigDialog` (Evasão só em
  Esquivar/Escapar; arma só em Repelir; Enviar de fuga arma a escolha); `ResolutionDetails` (Dar
  a palavra; "aberta em Nº"); `MatchPage` (o botão aparece só em andamento, para mestre e
  participante).
- **`npm run build`, `npm run lint`, `npm run test`** verdes.
- **Browser, três contas** (§0.1 passo 6): o mestre ataca em área (NPC) os personagens dos dois
  jogadores e um NPC; os três reagem diferente (esquiva, fuga com casa, repelir pelo NPC); o
  mestre abre em uma ordem, olha o cálculo, e abre em ordem inversa numa segunda rodada
  equivalente; os balões e o fantasma aparecem; recarregar no meio devolve tudo; o botão "Entrar
  na partida" leva ao jogo. Desktop e celular (390 px). A camada Pixi e a âncora **só** se provam
  aqui.

**Pronto quando** (§7 do mestre): três alvos reagem diferente ao mesmo ataque em área, e abrir as
reactions em ordem inversa produz resultado diferente na tela.

## 8. Effort e modelos

Planejamento em high. Implementadores com `model: sonnet`; o emissor da viewport e a fiação das
duas páginas (estado compartilhado, modos exclusivos do mestre) com **opus** — são as tarefas
onde o erro é sutil e o teste não alcança.

## 9. Decisões desta sessão

O dono do produto delegou (2026-10-05) e revisa no PR. As que mais pesam:

| # | Decisão | Por quê |
|---|---|---|
| D1 | Botões e balões numa **camada HTML ancorada** à peça, não dentro do Pixi | acessibilidade, foco, teclado, estilos do resto do front; a zona Pixi não se normaliza. Custo: um emissor de transformação no Pixi |
| D2 | Os botões aparecem **também no painel** (seção "Você é alvo"), além de ao lado da peça | cobre o alvo sem peça visível, o celular com a peça fora da tela, e dá um lugar fixo para o status ("aguardando o mestre") |
| D3 | A escolha da casa da fuga é um **modo** (`pick`) com dica e Cancelar, igual ao `fallPick` | decisão 6 do mestre ("o toque na casa envia, sem diálogo") com o mecanismo de toque que já existe |
| D4 | O diálogo de configuração, ao Enviar uma fuga, **arma a escolha da casa** em vez de ter um seletor de casa próprio | um mecanismo de escolha de casa só |
| D5 | Fantasma de espera **só para a reação aberta** (de `reaction_opened`), não para a anexada | é o que §10.2 define ("entre a abertura e o fechamento", "a mesa"); a anexada não tem fonte que sobreviva ao recarregar (`ownReactions` não traz o destino) |
| D6 | Balões de resultado: **verde = o personagem se saiu bem** (alvo evitou; atacante acertou alguém), **vermelho = não**; ficam até o próximo turno | o fluxo de desenho (`fluxos.excalidraw`, "Action Bubble") define cinza/verde/vermelho sem dizer de que ponto de vista; o do dono do balão é o que se lê sem legenda |
| D7 | `consumedActionIds` tira a ação da lista **sem aviso** | contrato: consumida não é perdida |
| D8 | O mestre vê os mesmos balões que a mesa | o cálculo detalhado dele está no card; o balão é o que a mesa vê |
| D9 | "Entrar na partida" no `BottomActions` da `MatchPage`, para mestre e participante, só em andamento | é onde "Abrir Lobby"/"Entrar no Lobby" ficam; mesmo padrão de UI |

## 10. Fora de escopo

Edição do mestre (Fase 8). Cancelar ou trocar uma reação anexada (o servidor recusa o segundo
attach). Narração/chat. A soma do movimento à esquiva, colisão, resolução da finta (§11 do
mestre). A revelação do histórico ao fim da partida (spec do back §4.6.1 — futuro).
