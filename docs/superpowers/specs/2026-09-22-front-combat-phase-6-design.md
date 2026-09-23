# Fase 6 do combate no front — Spec de Design

> **Status:** escrito em 2026-09-22. Uma sessão, um PR, repo `System_X_System_React`.
>
> **Fontes, nesta ordem de autoridade:**
> 1. `System_X_System/docs/superpowers/specs/2026-09-20-front-combat-phases.md` — documento
>    mestre, §6 é o escopo desta fase. ⚠️ A versão que este spec segue é a da branch
>    **`docs/front-combat-phase-6-gaps` (PR #77, mergeado em `main` em 2026-09-22)**, que
>    fecha as nove lacunas levantadas pela sessão de planejamento.
> 2. `System_X_System/docs/dev/api/match-combat-ws.md` — o contrato, em `main`, já com B1–B4.
> 3. `System_X_System/docs/dev/match/flows/03-fluxo-de-acao.md` — os diagramas do fluxo.
>
> **Implementa-se contra o contrato, nunca contra o Go.** Divergência entre os dois é bug do
> contrato: conserta-se o documento.

## 1. Objetivo

Um turno inteiro jogável, sem reações, nas duas telas e nos quatro formatos: o jogador declara,
o mestre abre, a peça anda, o turno fecha, as barras e o HP andam. O mestre também age por um
NPC.

O que esta fase **não** entrega: reações, edição do mestre, histórico por REST, ficha,
inventário, Nen, cancelar ação, adicionar NPC com a sala viva, e o fantasma de espera (o de um
movimento que depende de CD). Ver §13.

## 2. Invariantes herdadas — não negociáveis

Estas cinco vêm do documento mestre e do contrato. Toda decisão abaixo respeita todas elas.

| # | Invariante | Onde ela morde |
|---|---|---|
| I1 | **O front nunca calcula onde a peça para.** Desenha o pedido, depois desenha a posição que chegou | §8 (fantasma), §7.2 (empilhamento) |
| I2 | **Nenhum componente abaixo da rota pergunta "sou mestre?"** — o servidor já projetou o payload | §3.4 (duas páginas) |
| I3 | **`bars_updated.seq`**: guarde o maior, descarte menor. Não há evento de autocorreção, e o contador **não reinicia** na reconexão | §3.1 (reducer) |
| I4 | **O mesmo `turnId` chega diferente para cada pessoa.** Nada de cache global por `turnId` | §3.1 |
| I5 | **Não "conserte" o rótulo rebaixado** (`closedDodge` chegando como `dodge`) | Fase 7; aqui só não introduzir normalização |

## 3. Arquitetura

### 3.1 Uma conexão, um reducer puro

```
  WebSocket (um por partida)
        │  parse do envelope
        ▼
  useMatchWs ──── dispatch(action) ────► combatReducer  (PURO, sem React)
        │                                      │
        │  sendX(...)  ◄── verbos              ▼
        │                                 CombatState
        ▼                                      │
  useMatchCombat  ─── seletores ────────────────┘
        │
        ▼
  GamePlayerPage / GameMasterPage  →  organismos burros
```

**Por que um reducer puro e não `useState` espalhado:** as regras que mais fácil se
implementa errado nesta fase — a guarda de `seq` (I3), a ordem não garantida entre
`turn_closed` e `resolution_updated`, a vida do fantasma — são regras de estado, e a camada
Pixi **não tem teste nenhum** (`src/test/setup.ts` mocka `@pixi/react`). Tudo o que for regra
mora fora do Pixi, num arquivo que o vitest cobre inteiro.

**Por que estender `useMatchWs` e não criar um segundo hook:** é um socket só por partida. Um
segundo hook abriria uma segunda conexão, e o servidor manda `match_full_state` por conexão.

Forma do estado:

```ts
type CombatState = {
  scene?: { sceneId: string; category: "battle" | "roleplay"; briefInitialDescription: string };
  roundMode: "Free" | "Race" | "";
  bars: BarsPayload | null;          // o payload de bars_updated inteiro, com seq
  openTurn: { turnId: string; actorId: string; actionId: string } | null;
  queue: QueuedAction[];             // só chega ao mestre
  hp: Record<string, { hp: number; maxHp: number }>;   // characterId →
  ghosts: Record<string, Ghost>;     // actionId → intenção declarada (§8)
  events: TableEvent[];              // o histórico da Fase 6 (§10)
  pendingCloseTurn: CloseTurnRefusedPayload | null;
  lastError: { code: string; message: string; sentType?: string; at: number } | null;
};
```

Uma ação de reducer por mensagem do wire, mais três locais: `ACTION_SENT` (cria o fantasma
provisório), `GHOST_CONFIRMED` (o `action_enqueued` traz o `actionId`), `ERROR_DISMISSED`.

**A guarda de `seq`, escrita uma vez:** `bars` só é substituído quando
`state.bars === null || payload.seq > state.bars.seq`. Vale igual para `bars_updated` e para
`match_full_state.bars` — o contador é o mesmo, e estampar um número novo na reconexão é
exatamente o que o contrato proíbe.

### 3.2 Zonas e breakpoints

`MatchStageTemplate` (`src/components/templates/`) recebe cinco slots — `topbar`, `rail`,
`panel`, `stage`, `aside` — e decide só **onde** cada um aparece.

`src/styles/breakpoints.ts`, novo:

```ts
export const breakpoints = { tabletUp: 768, railUp: 1024, asideUp: 1280 } as const;
export const media = {
  phone:    `@media (max-width: ${breakpoints.tabletUp - 1}px)`,
  tabletUp: `@media (min-width: ${breakpoints.tabletUp}px)`,
  railUp:   `@media (min-width: ${breakpoints.railUp}px)`,
  asideUp:  `@media (min-width: ${breakpoints.asideUp}px)`,
} as const;
```

| Largura | `rail` | `panel` | `aside` | `stage` |
|---|---|---|---|---|
| `phone` (<768) | rodapé deitado | bottom sheet | gaveta | ocupa o resto |
| `tabletUp` (≥768) | rodapé deitado | bottom sheet maior | gaveta | idem |
| `railUp` (≥1024) | em pé, à esquerda | coluna ao lado do rail | gaveta | idem |
| `asideUp` (≥1280) | em pé | coluna | fixa à direita | idem |

**O rail e o rodapé são um componente só** (§5.4 do mestre). Isso é CSS, não JavaScript: o
mesmo `RailNav` é renderizado sempre, e o template troca `flex-direction`, posição e tamanho
por media query. Nenhum `useMediaQuery` decide qual componente montar — se houvesse dois
ramos, eles divergiriam.

**O `stage` nunca colapsa.** No grid do template ele é a única linha/coluna `1fr`; as outras
zonas são `auto`. A medição de canvas continua pelo `useResizeObserver` que o `GamePage` já usa.

**Os números mágicos antigos** (480, 500, 609, 749, 940, 1149…) **ficam onde estão.** Migrar
tudo é refactor de outra fase; o que este PR garante é que nenhum código novo escreve um número
de breakpoint na mão.

### 3.3 Arquivos

| Caminho | O que é |
|---|---|
| `src/styles/breakpoints.ts` | os quatro breakpoints nomeados |
| `src/components/templates/MatchStageTemplate.tsx` | as cinco zonas |
| `src/features/match/combat/combatMessages.ts` | tipos 1:1 do wire (só tipos) |
| `src/features/match/combat/combatReducer.ts` | o reducer puro + estado inicial |
| `src/features/match/combat/useMatchCombat.ts` | liga reducer ↔ `useMatchWs`, expõe seletores e verbos |
| `src/features/match/combat/actionDraft.ts` | rascunho + `localStorage` + migração de alvo |
| `src/features/match/combat/combatErrorMessages.ts` | `code` → texto em PT-BR |
| `src/features/match/combat/ActionComposer.tsx` | a bottom sheet de compor ação |
| `src/features/match/combat/GeneralBar.tsx` | a barra geral, flutuando sobre o mapa |
| `src/features/match/combat/OwnBars.tsx` | as duas barras do próprio personagem |
| `src/features/match/combat/EventStream.tsx` | a aba Histórico da Fase 6 |
| `src/features/match/combat/QueuePanel.tsx` | a fila do mestre |
| `src/features/match/combat/CloseTurnRefusedDialog.tsx` | o diálogo que o servidor computou |
| `src/features/match/combat/MatchErrorBanner.tsx` | a superfície de `error` |
| `src/features/match/WallActionSheet.tsx` | o menu de parede, extraído do `GamePage` atual |
| `src/features/tactical-map/hooks/useHoldGesture.ts` | o gesto de segurar (§7.1) |
| `src/pages/GamePlayerPage.tsx` · `GameMasterPage.tsx` | os dois orquestradores |
| `src/services/characterSheetsService.ts` (+) | `getCombatCatalogue(uuid)` |
| `src/hooks/useCombatCatalogue.ts` | React Query em cima dele |

`GamePage.tsx` deixa de ser a página e vira a **rota**: lê o papel uma vez e monta a página
certa.

### 3.4 As duas páginas

```tsx
// GamePage.tsx — a rota
const isMaster = match != null && user != null && match.masterUuid === user.uuid;
if (!match || !user) return <LoadingGuard />;            // padrão de src/pages/CLAUDE.md
return isMaster ? <GameMasterPage … /> : <GamePlayerPage … />;
```

Daí para baixo **nenhum componente recebe `isMaster`** (I2). Os organismos são burros: recebem
o que já chegou projetado e desenham. Uma exceção declarada: `TacticalMapStage` já tem
`fogDisabled={isMaster}`, que é da fatia do mapa e não desta — fica como está.

**A rota não muda de caminho.** O mestre escreve `/partidas/:id` como abreviação; o caminho real
é `/campaigns/:campaignId/matches/:matchId/game` e renomeá-lo quebraria os links existentes,
sem entregar nada desta fase.

## 4. A primeira tarefa — `error`

Hoje, em `useMatchWs.ts`, o `ws.onmessage` tem `catch { /* ignore malformed messages */ }` e
**nenhum ramo** para `type === "error"`. Toda recusa do servidor desaparece. É a primeira
tarefa porque sem ela o resto da fase é depurado às cegas.

O desenho:

1. **Nada fica mudo.** O `catch` passa a logar em `import.meta.env.DEV`; um `type` sem ramo
   também (uma linha `console.warn`, não um erro de usuário).
2. **`error` vira estado**, não um log: `dispatch({ type: "ERROR", payload })` →
   `state.lastError` → `MatchErrorBanner` (toast no topo do `stage`, dispensável, some sozinho
   em 6s).
3. **O texto sai de um mapa `code` → PT-BR** (`combatErrorMessages.ts`), com o `message` do
   servidor como fallback. Mapeia-se o **código** (§7 do contrato: `invalid_message`,
   `unknown_type`, `invalid_payload`, `forbidden`, `match_not_started`, `invalid_action`,
   `move_blocked`, `game_error`), nunca a prosa — `game_error` mostra a mensagem do servidor
   como veio, porque ela é o texto do erro de domínio.
4. **`error` nunca é broadcast**: é sempre sobre o que *eu* acabei de mandar. O hook guarda o
   `type` do último envio e o banner prefixa com ele ("Não foi possível abrir o próximo
   turno: …").
5. **O `combat_strength` morre aqui** (§4.4 do mestre). O ataque a parede passa a mandar
   `attack: {}` — sem `hit`, porque o servidor deriva `Accuracy` (B4), e sem `damage`, que é
   descartado. Sem arma, a proficiência lida é a de `Fist`.

## 5. Contrato → estado → tela

Servidor → cliente (só o que esta fase consome):

| Mensagem | Quem recebe | Efeito no estado | Onde aparece |
|---|---|---|---|
| `match_full_state` | quem conecta/reconecta | substitui cena, regime, barras (regra de `seq`), turno aberto, fila (mestre) | tudo |
| `bars_updated` | mesa | `bars`, se `seq` for maior | `GeneralBar` + `OwnBars` |
| `action_enqueued` | quem enviou | confirma o fantasma com o `actionId` | fantasma |
| `action_queued` | **só mestre** | empilha em `queue` | `QueuePanel` |
| `turn_opened` | mesa | `openTurn`; apaga o fantasma de `actionId` | topbar + histórico + mapa |
| `turn_closed` | mesa | fecha `openTurn`; evento de turno fechado | histórico |
| `resolution_updated` | mestre (aberto) · todos (fechado, projetado) | enriquece o evento do turno | histórico |
| `character_hp_changed` | mestre + dono | `hp[characterId]` | barra de HP |
| `round_closed` | mesa | evento; **varre os fantasmas** | histórico |
| `round_mode_changed` | mesa | `roundMode` | topbar |
| `scene_changed` | mesa | `scene`; varre os fantasmas | topbar |
| `close_turn_refused` | só mestre | `pendingCloseTurn` | diálogo |
| `piece_moved` / `piece_removed` | fog-gated | já tratado pela fatia do mapa | mapa |
| `error` | só quem enviou | `lastError` | banner |

Cliente → servidor:

| Verbo | Quem | Disparado por |
|---|---|---|
| `enqueue_action` | jogador (pelo próprio) **e mestre (por NPC)** | botão "Declarar" da `ActionComposer` |
| `enqueue_master_action` | mestre | só o menu de parede (revelar/interagir), como já é hoje |
| `open_next_action` · `pull_action` · `close_turn` · `change_round_mode` | mestre | `QueuePanel` e topbar |

⚠️ **O mestre age por NPC com `enqueue_action`, não com `enqueue_master_action`.** O back
aceita desde o PR #73, e `enqueue_master_action` continua com `move`/`attack` não mapeados
(no-op silencioso) — mandar ação de NPC por ali seria mandar para o vazio.

**A ordem entre `turn_closed` e `resolution_updated` não é promessa** (o contrato diz isso
explicitamente). O histórico resolve por chave: a linha do turno é criada por quem chegar
primeiro, indexada por `turnId`, e enriquecida por quem chegar depois.

## 6. Compor uma ação

**Ator.** Jogador: o participante cujo `characterSheet.playerUuid` é o do usuário (se houver
mais de um, um seletor no topo do painel; o primeiro vem marcado). Mestre: clicar numa peça de
NPC a seleciona como ator, com moldura de seleção; um **X explícito** limpa — nunca o clique de
novo, que é alvejar a si mesmo.

**Alvos.** Clicar numa peça, parede ou campo marca o alvo. **Segurar marca mais de um** (§7.1).
Alvejar a si mesmo é legítimo para os dois papéis.

**Arma.** `GET /charactersheets/{uuid}/combat-catalogue` devolve `weapons[]` com `name`,
`dice`, `flatDamage`, `defenseBonus`, `proficiencyLevel`, mais `Fist` sempre presente, em ordem
estável. A sheet lista isso; `Fist` é o default. **Não há campo de perícia** — o `hit` é
derivado (`Accuracy` + proficiência da arma) e o dano soma `Push`.

**Movimento.** Destino: clicar num slot vazio do mapa (reusa o `onEmptySlotClick` que o
`PiecesLayer` já expõe para o placer). Categoria: **Dash** e **Shift**, com Dash pré-marcado —
e o default é **uma função**, não uma constante:

```ts
// hoje sempre Dash; o doc de jogo diz que no turno livre o normal é Shift,
// e este default pode passar a seguir o regime. Não decida isso agora.
export const defaultMoveCategory = (_s: CombatState): MoveCategory => "Dash";
```

**O payload, montado:**

```jsonc
{
  "actorId": "<sheetUUID do ator>",
  "targetId": ["<uuid de peça ou de parede>", "..."],
  "attack": { "weapon": "Sword" },              // ausente se não há ataque; sem hit, sem damage
  "move": { "category": "Dash", "from": [col, row, z], "position": [col, row, z] }
}
```

`from` sai da posição atual da peça do ator — mandá-lo liga a checagem de parede no servidor.
`reactToId` **não** é enviado: quem não manda não vira reação.

⚠️ **Grade hexagonal.** `move.from`/`move.position` são triplas `[col, row, z]`; o resto do
protocolo de mapa usa `SlotCoord` etiquetado (`{kind:"hex", q, r}`). Num mapa hex a Fase 6
manda `[q, r, z]` e conta com o servidor preservando o `Kind` da peça (o contrato garante que
`Z` e `Kind` são preservados). **Isso é uma pergunta de contrato**, registrada em §15 e a
declarar no PR: a checagem de parede pode ler geometria errada num mapa hex.

**Rascunho persistente.** Chave `match-draft:{matchUuid}:{actorSheetUuid}` em `localStorage`,
com `{ targets, weapon, move }`. Fechar a sheet preserva; **trocar de alvo migra** (arma e
movimento ficam, a lista de alvos é a que muda); enfileirar com sucesso limpa. Toda leitura e
escrita dentro de `try/catch` — `localStorage` lança em aba privada.

## 7. As três decisões que o documento mestre deixou para esta sessão

### 7.1 O gesto de segurar: long-press por timer, com botão direito de atalho no desktop

**Decisão.** Um gesto só, `pointerdown` → timer de **450 ms** → dispara, implementado sobre
Pointer Events e portanto idêntico para mouse, toque e caneta. No desktop, **botão direito
(`contextmenu`) dispara o mesmo caminho na hora**, como atalho — e o menu nativo do navegador é
suprimido sobre o canvas.

**Por quê, e por que não as outras duas:**

- *Hover* está fora: não existe no toque, e o gesto tem que ser o mesmo nos dois, porque a Fase
  7 reusa exatamente este mecanismo nos botões de reação ("clicar envia, segurar configura").
- *Só botão direito* está fora pela mesma razão — não há botão direito no celular.
- O long-press **cai onde a lógica já existe**: `PiecesLayer` já discrimina clique de arraste
  com limiar de 4–6 px no par `pointerdown`/`pointerup`. O timer entra nesse mesmo par, e não
  nasce uma segunda máquina de estado sobre a zona pixel-tuned do mapa.

**Mecânica** (`useHoldGesture`, chamado imperativamente pelo `PiecesLayer`):

- cancela no movimento > 6 px (é pan ou arraste), no `pointerup` antes do prazo, no
  `pointercancel` e no `blur`;
- ao disparar, **suprime o clique** do `pointerup` seguinte — senão segurar também alvejaria
  uma vez a mais;
- feedback: a partir de 120 ms, um anel de progresso desenhado na peça (`pixiGraphics`, arco
  que fecha até 450 ms). Sem ele o gesto é invisível e parece travamento;
- `HOLD_MS` é uma constante só, num lugar só.

**Custo assumido:** a camada Pixi não tem teste. O `useHoldGesture` é testado isolado (vitest,
timers falsos); o casamento com o `PiecesLayer` é **verificação no browser**, obrigatória
(§12).

### 7.2 Empilhamento: cascata com contador

**Decisão.** Quando N peças dividem um slot: as peças são desenhadas em cascata, deslocadas
`0.18 × inradius` em x e y por ocupante extra, no máximo **3 visíveis**, e a de cima leva um
selo `×N` quando `N > 1`. A ordem é estável (por `id` da peça), e a peça **selecionada ou do
próprio jogador é desenhada por último**, no topo — quem precisa mirar precisa ver.

**Por quê:** não exige asset novo nem textura nova, funciona igual em quadrado e hexágono (o
deslocamento é uma fração do inradius, que `slotInradius` já calcula), continua legível com
zoom baixo, e é derivação pura da lista de peças — nenhum estado novo. `PieceSprite` já desenha
offset e sombra por `z`; a cascata é o mesmo mecanismo, com outro insumo.

É desenho de protótipo, como o mestre pediu: **declarar no PR** e evoluir em cima.

### 7.3 O mestre clica numa peça que ele não controla, sem ator selecionado

**Decisão.** A peça vira **inspecionada**: recebe a moldura de foco e a aba Personagens rola
até aquele personagem (nome, HP). Nada é enviado ao servidor, e ela **não** vira ator.

**Por quê:** virar ator produziria `action actor does not match player` na primeira tentativa de
declarar — o servidor só deixa o mestre agir por NPC. E não fazer nada desperdiça o gesto mais
natural que existe numa mesa ("quem é esse, como ele está"), que a Fase 6 já tem como responder,
porque o HP do mestre já chega por `character_hp_changed`.

## 8. O fantasma da intenção declarada

O único fantasma com caso alcançável nesta fase (§10.2 do mestre): existe **entre o envio da
ação e a abertura dela**, e **só o dono vê** — o mestre não conhece o destino, porque nem
`action_queued` nem `resolution_updated` carregam posição.

- **Desenho:** cópia translúcida da peça no slot pretendido + seta ligando as duas. O mesmo
  desenho que a Fase 7 vai reusar para o fantasma de espera.
- **Chave:** o `actionId` que `action_enqueued` devolve (B1/§4.3). Entre o envio e o ack o
  fantasma existe com chave provisória e é reindexado no ack.
- **Morre** quando: chega `turn_opened` com aquele `actionId` (é por isso que B1 existe);
  chega `error` para aquele envio; chega `round_closed` ou `scene_changed` (varredura
  conservadora, para não deixar fantasma preso depois de uma ausência).
- **Na reconexão**, `match_full_state.openTurn` traz `turnId` e `actorId` — **não** traz
  `actionId` (B1 alcançou só o `turn_opened`). Então a varredura da reconexão é por ator:
  fantasma cujo ator é o `openTurn.actorId` é descartado. É conservador de propósito — perder
  um fantasma legítimo é desenhar de menos; manter um velho é desenhar mentira. Ver §15.
- **Sobrevive ao refresh**: persistido junto com o rascunho, na mesma chave de `localStorage`.
- **Não inventa meio caminho** (I1): o fantasma mostra o pedido, nunca uma posição calculada.

## 9. HP ao vivo

`character_hp_changed` (`{characterId, hp, maxHp, damage}`) chega **só ao mestre e ao dono**.
O carregamento inicial vem do REST (`GET /matches/{uuid}/participants`, `private.health`, que já
vem `null` para quem não tem direito). O componente de lista renderiza o que tem, sem perguntar
o papel (I2).

⚠️ **Dano zero não emite mensagem.** Um ataque esquivado fecha o turno sem `character_hp_changed`
— não trate a ausência como erro, e não sincronize barra por ausência.

## 10. A aba Histórico, na versão da Fase 6

É a lista dos eventos que o servidor já emite: turno aberto (quem age), turno fechado (com o
resultado, quando a resolução liquidada chegar), round fechado, troca de regime, troca de cena,
HP que mudou (o que me couber). É a aba **padrão** do `aside`, e o nome é **Histórico** — a
fila, que é o que ainda não aconteceu, é do mestre e fica na zona `panel`, à esquerda.

Na Fase 8 a fonte vira `GET /matches/{uuid}/history`, aninhado por cena; o componente é o mesmo.

## 11. Conexão e reconexão

`match_full_state` chega em **todo** `register` — conexão e cada uma das até 5 reconexões
automáticas do hook. Ele substitui cena, regime, barras, turno aberto e (para o mestre)
resolução e fila. A regra de `seq` (I3) vale aqui também: o `seq` que vem é o contador corrente,
não um novo.

`scene` e `openTurn` ausentes significam "não há" — o contrato omite a chave, não manda `null`.

## 12. Testes e verificação

**Cobre-se com vitest:**

- `combatReducer` — a maior parte do esforço de teste da fase: guarda de `seq` (inclusive
  snapshot atrasado depois de reconectar), `match_full_state` substituindo tudo, ordem
  invertida entre `turn_closed` e `resolution_updated`, vida do fantasma, HP, eventos.
- `actionDraft` — persistir, migrar alvo, `localStorage` que lança.
- `useMatchWs` — despacho por tipo, `error`, mensagem desconhecida não derruba nada (socket
  falso, como no `useMatchWs.test.ts` que já existe).
- `useHoldGesture` — timers falsos: dispara, cancela por movimento, cancela por soltar,
  suprime o clique seguinte.
- Páginas — integração com MSW para o REST + socket falso.

**Não se cobre com teste, e por isso exige browser:** tudo o que é Pixi — seleção de peça,
long-press sobre a peça, fantasma, cascata de empilhamento, clique em slot vazio.

**A verificação manual da fase** (é ela que fecha o "pronto quando" do §6 do mestre):

1. Duas máquinas/dois navegadores, um mestre e um jogador, um round inteiro: declarar → abrir →
   a peça andar → fechar → barras e HP andarem.
2. O mestre age por um NPC — **posto na partida pelo REST antes de a sala nascer**.
3. Os quatro formatos, com o tablet **girando** (em pé cai em `tabletUp`, deitado em `railUp`).

## 13. Fora de escopo

Reações; edição do mestre (`edit_action`); histórico por REST; a ficha dentro da partida;
inventário; Nen; **cancelar ação** (não existe no contrato); **`add_npc` com a sala viva** (o
verbo existe no contrato, mas a fase não depende dele — o NPC entra pelo REST antes de a sala
nascer); o **fantasma de espera**; migrar os breakpoints antigos do resto do app.

## 14. Riscos

| Risco | Mitigação |
|---|---|
| A camada Pixi não tem teste — long-press, fantasma e cascata podem quebrar em silêncio | toda a regra mora no reducer/hook testado; o que sobra no Pixi é desenho, e a verificação no browser é obrigatória antes do PR |
| O gesto de segurar brigar com o pan do viewport | cancelamento por movimento > 6 px, que é o limiar que o `PiecesLayer` já usa |
| `localStorage` lançar (aba privada) e derrubar a página | toda leitura/escrita em `try/catch`, estado inicial válido sem ela |
| Vite órfão segurando a 5173 e a sessão testar a branch errada | conferir o PID antes de assumir que o server caiu |
| `.env` ausente numa worktree → `VITE_WS_URL` indefinido e o WS nunca conecta | copiar o `.env` ao criar worktree |
| Mapa hexagonal + `move.position` | §15, item 1 — declarar no PR |

## 15. Perguntas de contrato levantadas aqui (não bloqueiam a fase)

1. **`move.from`/`move.position` não têm forma hexagonal.** São triplas `[col,row,z]`, enquanto
   o resto do protocolo de mapa usa `SlotCoord` etiquetado. A Fase 6 manda `[q,r,z]` em mapa
   hex; a checagem de parede do servidor pode ler isso como geometria quadrada.
2. **Ataque a parede sem arma.** O front passa a mandar `attack: {}`; pelo contrato a
   proficiência lida vira a de `Fist`. Confirmar que é o desfecho pretendido para bater em
   porta.
3. **`match_full_state.openTurn` não carrega `actionId`.** B1 pôs o campo em `turn_opened`, e
   o snapshot de conexão ficou de fora — quem reconecta não consegue casar o fantasma com o
   turno que abriu enquanto estava fora. O contorno está em §8 (varredura por ator) e é
   conservador; o conserto de verdade é um campo a mais no snapshot.

Ambas vão para a descrição do PR, para voltarem ao dono do contrato.
