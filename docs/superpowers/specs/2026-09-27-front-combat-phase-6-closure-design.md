# Fechamento da Fase 6 no front — Spec de Design

> **Status:** escrito em 2026-09-27. Uma sessão, um PR, repo `System_X_System_React`.
>
> **Fontes, nesta ordem de autoridade:**
> 1. `System_X_System/docs/superpowers/specs/2026-09-20-front-combat-phases.md` — o documento
>    mestre. O escopo desta sessão é o **§6A.6** (F1–F8, F10–F16; o F9 saiu). A versão que este
>    spec segue é a do **PR #80** (mergeado) **mais o PR #81** (branch
>    `docs/master-actions-persisted`, commit `5f824fc`): master actions persistidas e no
>    histórico (B14), `attack` fora da master action (B9), e o desenho do dono do produto para
>    F3 (ficha no painel alargado) e F7 (cálculo no card da ação, na fila).
> 2. `System_X_System/docs/dev/api/match-combat-ws.md` e `match-history.md` — os contratos.
> 3. `docs/dev/match/combate-fase-6.md` (este repo) — como a Fase 6 ficou de verdade.
>
> **Implementa-se contra o contrato, nunca contra o Go.** Divergência entre os dois é bug do
> contrato: conserta-se o documento.
>
> **A Fase 7 (reações) NÃO é desta sessão.**

## 0. O workflow de cada fase (cópia do §0.1 do documento mestre)

> **Sessões que planejam uma fase: copiem esta seção para o design spec de vocês.** Ela é como
> este projeto trabalha, e quem implementa a partir do plano precisa dela tanto quanto quem
> planejou.

1. **Uma sessão por fase por repo.** Back e front rodam em paralelo quando não tocam arquivo em
   comum — são repos diferentes, então normalmente não tocam.
2. A sessão **lê este documento e o contrato** (`docs/dev/api/match-combat-ws.md`), escreve o
   **design spec** e o **plano**, e **para** para o dono do produto revisar.
3. **Lacuna ou contradição neste documento: liste e pare.** Ela volta para o autor deste
   documento, que corrige o texto. Não se contorna, e não se decide regra de jogo por conta.
4. Aprovado o spec, a sessão **compacta** e implementa **lendo o próprio plano do disco**. Se
   ela não conseguir implementar a partir do plano, o plano estava incompleto — é melhor
   descobrir nessa hora.
5. Implementação por **subagent-driven-development**, uma tarefa por subagente.
6. **Verificação no browser, com três contas** (`test@`, `test2@`, `test3@mail.com`, senha
   `12345678`): um mestre e dois jogadores, jogando o caminho que o usuário faz. A Fase 6 passou
   nos testes e falhou na mesa — o NPC do teste tinha sido inscrito por fora, e o caminho real
   nunca foi exercitado.
7. PR aberto dizendo o que foi verificado e **o que não foi**.

**Effort.** Planejamento em **high** (o documento mestre já fez a descoberta). Implementadores
em **sonnet / medium**, pelo tipo de agente `implementer` (`.claude/agents/implementer.md`, chave
de frontmatter `effort`, conferida no schema de agente do Claude Code 2.1.283 — valores
`low|medium|high|xhigh|max`). Duas tarefas sobem de nível, e o plano diz quais: a da árvore do
histórico (T11, regra de sobreposição REST × WS) e a do arrastar/pôr/tirar do mestre (T17, zona
Pixi sem teste). Nelas o despacho é `opus`.

## 1. Objetivo

A Fase 6 entregou o loop mínimo; o front consome uma fração do que o back produz. Este
fechamento faz o front mostrar o que já chega — e o que o PR de back paralelo passa a mandar —
sem inventar regra: a fila inteira do mestre (F1), o NPC que age de verdade (F2), a ficha dentro
da partida (F3), o histórico que não se perde (F4), os cards da campanha (F5), as barras de cada
personagem (F6), o cálculo do turno aberto (F7), a troca de cena (F8), a lista de declaradas que
segue o servidor (F10), a aba da direita que fica onde o usuário a deixou (F11), o tabuleiro
como coisa do servidor (F12, F13, F16), o escape que falhou (F14) e a partida que continua outra
(F15).

## 2. Invariantes herdadas — não negociáveis

| # | Invariante | Onde morde aqui |
|---|---|---|
| I1 | **O front nunca calcula onde a peça para.** Desenha o pedido, depois a posição que chegou | F1 (fantasma do mestre), F12 (arrastar não move nada até o servidor mandar), F14 |
| I2 | **Nenhum componente abaixo da rota pergunta "sou mestre?"** | F3, F5, F6, F7 — a página escolhe o que montar; o componente renderiza o que chegou |
| I3 | **`bars_updated.seq`**: guarde o maior, descarte menor | F6 lê só `state.bars`, já guardado |
| I4 | **O mesmo `turnId` chega diferente para cada pessoa** | F4: o cache do histórico é por `token` (usuário), nunca compartilhado |
| I5 | **Não "conserte" o rótulo rebaixado** | F4/F7 mostram `reaction.kind` como veio |
| I6 | **O servidor é a fonte** (§0.2 do mestre) | F4 (histórico do REST), F10 (declaradas), F13 (tabuleiro) |
| I7 | **Nunca reenviar sozinho** — reenviar re-rola | F10 |
| I8 | **O jogador não vê velocidade nenhuma que não venha de `bars_updated`** | F6 |

## 3. Dependências e ordem

O documento mestre separa o que começa já do que espera o back (§6A.6):

| Item | Espera | Onde fica no plano |
|---|---|---|
| F11, F5, F2, F8, F3, F7, F4 (parte 1), F6 (parte 1) | nada (F2 funciona inteiro só depois de B11) | Parte A — tarefas T1–T12 |
| F1 + F6 (parte 2) + fantasma do mestre | B1 | Parte B — T13 |
| F10 | B12 | T14 |
| F4 (parte 2) — linhas de cena, regime e round, master actions, e o `move` no histórico | B15, B14 (+ o conserto do `match-history.md`) | T15 |
| F13, F16 | B14 | T16 |
| F12 | B14 + o `move` de B9 | T17 |
| F14 | B13 | T18 |
| F15 | B16 | T19 |

**Parte B só começa depois do merge do PR de back.** Cada tarefa da Parte B começa lendo a
seção do contrato que o back escreveu (o plano diz qual) — o formato de fio dessas mensagens
ainda não existe no disco. Se a seção não existir ou divergir do que o plano assume, a tarefa
**para** e volta ao dono do produto (§0 item 3). O plano dá o desenho, os arquivos e os testes
dessas tarefas; os nomes de campo exatos vêm do contrato.

## 4. Arquitetura — o que muda

**Vocabulário da tela** (o do `MatchStageTemplate`): **rail** é a barra de botões — em pé à
esquerda a partir de `railUp`, deitada no rodapé abaixo disso (Ação, Ficha; no mestre Fila,
Agir, Ficha). **Painel** é o que o botão ativo abre — coluna ao lado do rail no desktop,
bottom sheet no celular e no tablet em pé. **Aside** é a coluna/gaveta da direita (abas
Histórico e Personagens). **Stage** é o mapa.

A arquitetura da Fase 6 continua: um socket por partida (`useMatchWs`), um reducer puro
(`combatReducer`), `useMatchCombat` ligando os dois, `useGameTable` com o que as duas páginas
dividem, e as páginas como orquestradoras.

```
  WebSocket ─► useMatchWs ─► normalizeCombatMessage ─► combatReducer ─► CombatState
      │              │ onNpcAdded / onTurnClosed / onFullState  (efeitos de cache)
      │              ▼
      │        queryClient.invalidateQueries(participants | history | sheet)
      ▼
  REST (React Query): participants · history (F4) · characterSheet (F3)
      │
      ▼
  historyRows(REST, eventos ao vivo)  ─►  EventStream   (F4)
```

**Duas regras novas de fronteira:**

1. **O WS avisa, o REST busca.** Mensagens que dizem "algo mudou no dado de referência" viram
   invalidação de query, não estado no reducer: `turn_closed` → histórico; `npc_added` →
   participantes; `match_full_state` (toda conexão/reconexão) → participantes, histórico e a
   ficha aberta. O reducer não guarda cópia de nada disso.
2. **Hora do servidor.** Toda mensagem de servidor traz `timestamp` no envelope (contrato §1).
   `useMatchWs` passa a repassá-lo, e o reducer carimba os eventos da mesa com ela
   (`at` = hora do servidor, `receivedAt` = hora local). É o que permite intercalar o que veio
   do REST (`finishedAt`, hora do servidor) com o que veio ao vivo sem misturar relógios.

## 5. Os itens

### F11 — Selecionar uma peça não troca a aba da direita

Hoje `GameMasterPage.handlePieceTap`, sem ator e numa peça que o mestre não controla, faz
`setAsideTab("personagens")` e `setAsideOpen(true)`. Os dois saem. A peça continua
**inspecionada** (anel cinza, `inspectedPieceId`), e o card dela rola para a vista **se** a aba
Personagens já estiver à mostra. O `AsideTabs` volta a ser não-controlado — o modo controlado
existia só para esse forçar (R6/§7.3 da Fase 6), e sem ele é prop sem chamador (YAGNI).

### F5 — Os cards usam o dado público

`MatchCharactersSidebar` **sempre** renderiza `CharacterSidebarItem`. Um adaptador puro,
`toSidebarCharacter` (`src/features/match/sidebarCharacter.ts`), recebe os dois formatos que
chegam — `CharacterSheetWithVisibility` (participantes: base + `private` opcional) e
`CharacterPrivateSummary` (o plano, do `npcMap` da campanha) — e devolve o `character` do card:
a base sempre, o `private` mesclado quando existe. `BasicParticipantItem` e `LeftBadge` locais
saem (o card já tem `hasLeft`). Cor de NPC, de morto, avatar e capa passam a funcionar para
todos, porque vêm da base.

O card fica clicável para o mestre (todos) e para o **dono** (`isOwn`, que o card já aceita e
que a página passa: `playerUuid === user.uuid`). Isso tira a exceção R25 da Fase 6 ("as linhas
nunca são clicáveis para o jogador") sem pergunta de papel no organismo: a página decide.

### F2 — O mestre age por qualquer NPC da partida

- **Rebuscar participantes** quando chegar `npc_added` (nova mensagem tratada por `useMatchWs`,
  via `onNpcAdded`, que invalida a query de participantes) **e** como rede de segurança quando
  aparecer no tabuleiro uma peça cujo `characterId` não é participante — uma vez por
  `characterId`, para não virar laço se o servidor ainda não inscreveu.
- **Pôr um NPC da campanha na partida** (`add_npc`): no painel **Agir**, abaixo do
  `NpcPicker`, um seletor "Pôr na partida" com os NPCs da campanha (`campaign.characterSheets`
  sem `playerUuid`) que ainda não são participantes. Enviar manda `add_npc`
  (`characterSheetUuid`). `npc_already_in_match` **não** é mostrado como erro: pelo contrato
  significa "o NPC está na partida" — invalida os participantes e pronto. Os outros erros
  (`not_found`, `invalid_npc`, `forbidden`, `invalid_payload`) aparecem no banner, com o
  prefixo de `add_npc`.
- A mensagem "Este personagem não está inscrito na partida — é um NPC do mapa, e não age" e o
  `everyone` com participantes sintéticos `map-npc:*` **saem**: com B11 não têm caso, e antes de
  B11 a rede de segurança acima cobre a janela. Enquanto o participante não chega, a peça de um
  NPC não inscrito se comporta como peça de terceiro (inspecionar).
- Um NPC inscrito por `add_npc` **sem peça** aparece no `NpcPicker` e pode declarar ataque sem
  movimento; ele chega ao mapa por F12 ("pôr peça").

### F8 — Trocar de cena

Botão **Nova cena** na topbar do mestre (dentro de `RegencyControls`; no celular, no painel da
fila, como o seletor de regime já faz). Abre `SceneChangeDialog`: categoria (**Batalha** →
`"battle"`, **Interpretação** → `"roleplay"`, minúsculo, validado no servidor) e descrição
inicial (texto, opcional). Confirmar manda `change_scene`; a mesa recebe `scene_changed`, que o
reducer já trata. Com turno aberto o botão fica desabilitado com a dica "Feche o turno antes
de trocar de cena" (o servidor recusaria com `cannot close round: current turn is still
open`); a recusa, se vier, aparece no banner com o prefixo de `change_scene`.

### F3 — A ficha abre dentro da partida

- **O quarto `SheetMode`.** `SheetMode` ganha `embedded?: boolean`, e
  `src/features/sheet/types/sheetMode.ts` exporta `MATCH_SHEET_MODE` (todos os sub-modos
  `"view"`, `embedded: true`). Com `embedded`, `CharacterSheetTemplate` não monta o
  `BackButton` (ele navegaria para fora da partida) nem as ações de rodapé. Nenhum sub-modo novo:
  a ficha é a mesma de fora, só leitura. O `CharacterSheetHeader` (zona pixel-tuned) não é
  tocado.
- **Onde (desenho do dono do produto):** no **painel**, no lugar de Ação/Fila — é mais um item
  do rail, junto de Ação (e, quando existirem, Inventário e Nen). Abaixo de `railUp` é a mesma
  bottom sheet em que a ação abre. Componente `MatchSheetPanel`
  (`src/features/match/combat/MatchSheetPanel.tsx`): busca a ficha (`useCharacterSheet`),
  sobrepõe o HP ao vivo (`state.hp[uuid]` → `status.health.current/max`) e renderiza o template
  com `MATCH_SHEET_MODE`, com um cabeçalho fino (nome + ×).
- **O painel alarga para a ficha.** Hoje ele tem largura fixa (340 px a partir de `railUp`, em
  `MatchStageTemplate`) e a ficha não cabe. O template ganha `panelWide?: boolean`; com ele, a
  coluna passa a `clamp(340px, 46vw, 640px)`. A página liga `panelWide` só quando o item ativo
  do rail é **Ficha**. Na bottom sheet (abaixo de `railUp`) a largura já é a da tela; a altura
  continua a da ação. A largura final se ajusta na verificação no browser.
- **Jogador:** o rail ganha o item **Ficha**, que abre a do ator atual. Tocar no próprio card
  também abre (e ativa o item Ficha).
- **Mestre:** o rail ganha **Ficha**; tocar em qualquer card da aba Personagens abre aquela
  ficha no painel e ativa o item — o rail troca de item (é ali que a ficha mora), a aba da
  direita não. Sem ficha escolhida, o painel diz "Toque num personagem para ver a ficha".
- **Nenhum `navigate`** nas duas páginas.
- **Resiliência:** a query da ficha é invalidada a cada `match_full_state` (o HP pode ter
  mudado enquanto a conexão estava caída; `character_hp_changed` perdido não volta), e o mapa
  `state.hp` é zerado no `match_full_state` — o REST recém-buscado vira a base de novo.

### F7 — O cálculo do turno aberto, no card da ação (só leitura)

- **Estado:** o reducer passa a guardar `openResolution: ResolutionPayload | null` — a última
  resolução **não liquidada** do turno aberto (`resolution_updated` com `isSettled: false` e
  `turnId` do turno aberto, e `match_full_state.resolution`). Limpa em `turn_closed` do mesmo
  turno, em `round_closed` e em `match_full_state` sem `resolution`. Só o mestre a recebe; o
  jogador nunca terá o campo preenchido — a página do jogador nem monta o painel.
- **Tipos:** `ResolutionPayload` ganha os campos que o contrato já manda e a Fase 6 não lia:
  `dodgeTotal`, `defenseTotal`, `defenseApplied`, `reaction?` (`kind`, `total`, `reactionId`,
  `rung?`, `margin`, `difference`, `stopsAttack`), `payouts?` e `errors?`. `normalizeResolution`
  não muda (`reaction`, `payouts`, `errors` e `pendingReactions` são `omitempty`: ausentes,
  nunca `null`).
- **A ação aberta continua na Fila.** Hoje `turn_opened` tira a ação da fila (`state.queue`) e
  ela some da tela do mestre. O reducer passa a guardar a linha que saiu, `openQueued:
  QueuedAction | null` (limpa com `openResolution`), e a Fila mostra no topo o card da ação
  **em andamento** — marcado como aberto —, com o cálculo anexado a ele. Depois de uma
  reconexão no meio do turno, a linha da fila não volta (o `match_full_state` só traz
  `openTurn`); o card em andamento mostra o ator do `openTurn` e o cálculo, e com B1/B2 passa a
  mostrar a declaração também.
- **Tela:** `ResolutionDetails` (`src/features/match/combat/ResolutionDetails.tsx`), renderizado
  **dentro do card em andamento** da `QueuePanel` — acerto (perícia,
  dados, total, crítico/falha crítica, margem quando houver); por alvo: nome, esquiva, defesa,
  tipo de reação e escada do repelir (`rung` em rótulo PT), dano bruto → aplicado a defesa →
  projetado, payouts em texto curto; as reações anexadas não abertas; os `errors` do motor como
  aviso discreto ("o cálculo deste alvo está incompleto"), com `detail` só em `title`.
- **Sem item novo no rail.** O cálculo mora no card da ação, na Fila — desenho do dono do
  produto, que ainda vai refiná-lo. Nenhum botão — dar a palavra é da Fase 7, editar da Fase 8
  (documento mestre, F7).

### F4 — O histórico vem do servidor

**Parte 1 (começa já).**

- `matchService.getHistory(token, matchId)` → `GET /matches/{uuid}/history`. Tipos em
  `src/types/matchHistory.ts`, 1:1 com `match-history.md`. Hook `useMatchHistory(token,
  matchId)`: `queryKey: ["matchHistory", token, matchId]` (I4 — por usuário), e o `queryFn`
  carimba **a hora local em que o fetch começou** (`fetchStartedAt`) junto com os dados.
- **Invalidação:** a cada `turn_closed` e a cada `match_full_state`.
- **A árvore vira linhas** numa função pura, `historyRows(history, liveEvents, fetchStartedAt)`
  (`src/features/match/combat/historyRows.ts`):
  - cada turno do REST vira uma linha "turno fechado" com o que ele diz: ator, alvos por nome,
    arma, se houve movimento, e o desfecho por alvo (`avoided` / `projectedDamage` da
    resolução projetada); hora = `finishedAt`;
  - cada evento ao vivo vira linha, com hora = `at` (hora do servidor);
  - **sobreposição:** um evento ao vivo **derivado de turno** (`turn_closed`,
    `resolution_updated` liquidada, `character_hp_changed`) sai quando existe um fetch do REST
    **iniciado no instante em que ele chegou ou depois** (`fetchStartedAt >= receivedAt`; `>=` porque
    o refetch que a mensagem dispara roda no mesmo stack síncrono do carimbo — quase sempre no mesmo
    milissegundo, e depois dele na ordem do programa —, e um fetch já em voo é cancelado pela
    invalidação, `cancelRefetch`, então os dados dele nunca aparecem). É exato: o servidor
    persiste o turno antes de emitir qualquer mensagem do fechamento (contrato:
    `character_hp_changed` "sai depois da persistência", e `turn_closed` é do mesmo ponto), então
    um fetch que começa depois da mensagem sempre contém o turno. Um fetch que começou antes não
    derruba nada — a linha ao vivo fica até o próximo;
  - o **turno aberto** (`turn_opened` do turno que continua aberto) fica ao vivo até fechar;
  - **troca de cena, troca de regime e round fechado** ficam ao vivo e **não** são derrubados:
    o REST de hoje não os guarda (documento mestre, F4/B15). **Na entrega final isso já está
    resolvido:** B15 os persiste, a Parte 2 abaixo os lê do REST, e o PR deste fechamento só sai
    depois do merge do back. O "só ao vivo" é o estado intermediário da Parte A;
  - ordenação por hora do servidor; empate: REST antes do ao vivo.
- O reducer continua juntando eventos da mesa (`state.events`), agora com `at`/`receivedAt`, e
  para de ser a fonte da aba: `EventStream` recebe as linhas prontas.
- A linha de HP (`♥ Gon: 84/100 (−16)`) continua só para quem recebe `character_hp_changed`
  (mestre e dono) e some quando o turno correspondente chega do REST; o turno do REST já diz
  o dano (projetado liquidado).

**Parte 2 (espera B15 e B14).** As três linhas que hoje só vivem ao vivo passam a vir do REST,
na posição que o contrato disser; os eventos ao vivo de cena/regime/round passam a ser derrubados
pela mesma regra de fetch posterior, e `scene_changed`, `round_mode_changed`, `round_closed` e
`master_action_enqueued` passam a invalidar o histórico também. As **master actions** persistidas
(B14, PR #81) entram no histórico: dentro do turno quando têm turno, como evento fora de turno
quando não têm — cada leitor recebe já projetado (o que o fog escondeu dele não vem). E o `move` do histórico, cujo formato o PR de back documenta
junto, passa a ser descrito com destino ("moveu para (3, 4)") — na parte 1 a linha diz só
"moveu", porque o formato não está no disco.

### F6 — As barras de cada personagem, no topo do canvas

**Parte 1 (começa já).** `GeneralBar` ganha, abaixo da linha atual (vez + ordem + preço), uma
faixa `CharacterBarsStrip` com um bloco por personagem de `bars.characters`:

- nome; **Race**: duas barras (ação ⚔, movimento 👣) de escala `±preço` do round, centradas no
  zero — crédito enche para a direita, débito para a esquerda, em cor de alerta —, o saldo em
  número (uma casa decimal, é fracionário), as velocidades que agiram (`16 · 14`) e a média
  (`x̄ 15`), só quando houver velocidade; **Free**: sem barras nem média (sem preço, sem escala) —
  só as velocidades que agiram. Barra sem preço (ausente de `prices`) não é desenhada;
- a ordem projetada continua como hoje, com a chave (`key`) de cada slot visível no chip;
- **abaixo de `tabletUp`** a faixa nasce recolhida (só a linha da ordem) e expande num toque
  ("Barras ▾"); a partir de `tabletUp` nasce aberta. Estado de UI local, sem persistência.

A média é aritmética simples das velocidades que agiram (`barra-de-acao.md`: "a velocidade do
round é a média de todas as ações que ele fez") — é exibição de um número que o `bars_updated` já
entrega; a ordem continua vindo do servidor.

**Só `bars_updated`, para todo mundo (I8).** O mestre e o jogador veem exatamente a mesma
faixa. As velocidades das ações **na fila** são do mestre e entram na **Parte 2**, no card da
fila (F1), não na faixa.

**Parte 2 (espera B1):** ver F1.

### F1 — A fila do mestre mostra a ação inteira (espera B1)

- `QueuedAction` ganha a action inteira no formato do histórico REST (`HistoryAction`, o mesmo
  tipo de F4 — o documento mestre manda reusar), com os campos que B1 acrescentar (velocidades
  derivadas, `hit`, `systemBias`). Os nomes exatos vêm do contrato de `action_queued` que o PR de
  back reescreve; a tarefa começa lendo-o.
- **Card:** recolhido como hoje (nome + barras cobradas + "Abrir agora"); um toque expande:
  atacante, alvos por nome, arma, movimento (categoria e destino), perícias, `actionSpeed`
  (perícia, dados, total), `moveSpeed` (Accelerate/Brake, dados, total), a chave na ordem
  geral (casada por `actorId` + barras com `bars.order`) e as barras que cobra. **É a Parte 2 de
  F6.**
- **Fantasma do mestre:** cada ação da fila com movimento entra em `intentGhosts`, com o
  **mesmo** desenho do fantasma do dono (`IntentLayer`, seta da posição atual da peça até o
  destino) — `useGameTable` junta as duas fontes, sem duplicar a mesma `actionId` (a ação que o
  próprio mestre declarou por NPC já está em `declared`). Some quando a ação sai da fila
  (`turn_opened` ou `pull_action`).
- A descrição local `describeQueued` (que só servia às ações do próprio mestre) sai: a fila
  passa a se descrever sozinha.

### F10 — A lista de declaradas segue o servidor (espera B12)

- `match_full_state` passa a mandar ao dono a lista das ações **dele** ainda na fila (B12) — IDs
  e o que ele declarou, sem velocidade. Na chegada, o reducer reconcilia `declared`:
  - `queued` que o servidor tem → fica;
  - `queued` que o servidor **não** tem → sai, e vira `lostDeclared` (para o aviso);
  - `open` do turno aberto → fica; `sending` → sai (já é assim).
- **Aviso:** um banner persistente (não some em 6 s) "O servidor perdeu N ação(ões) que você
  tinha declarado. O rascunho voltou para o compositor — confira e declare de novo." com ×.
- **Rascunho de volta:** `draftFromDeclared(d)` (puro, em `actionDraft.ts`) reconstrói o
  `ActionDraft` a partir de `move`/`attack` da declarada; a página grava por `saveDraft` no
  ator dela, **só se** o rascunho atual daquele ator estiver vazio (não atropela o que o jogador
  já começou). Várias perdidas do mesmo ator: volta a mais recente.
- **Nunca reenviar sozinho (I7).** Não existe caminho de código que envie a partir de
  `lostDeclared`.
- `declaredStorage` continua (é o que faz o fantasma sobreviver ao refresh); a diferença é que
  a verdade do conteúdo vem do servidor a cada conexão.

### F12 — O mestre arrasta, põe e tira peças (espera B14 + `move` de B9)

- **Modo "Arrumar"** no canto do mapa do mestre (botão ao lado de **Enquadrar**). Fora dele, o
  mapa do mestre é o da Fase 6 (tocar escolhe ator/alvo, segurar marca alvos, nada arrasta).
  Dentro dele, **toda** peça é arrastável (`draggablePieceIds` = todas), tocar e segurar não
  compõem ação, e o painel mostra "Arrumar o tabuleiro": a lista de participantes **sem peça**
  (para pôr) e, com uma peça selecionada, **Tirar do mapa**.
- **Por que um modo e não o arraste sempre ligado:** no toque, um dedo que escorrega 5 px já
  passa o limiar de arraste do `PiecesLayer` e cancela o segurar (achado da revisão final da
  Fase 6, Important 1). Arraste e segurar na mesma peça, no mesmo modo, brigam. Separar os
  modos resolve sem mexer na zona pixel-tuned do mapa; e a confirmação obrigatória já faz do
  arrumar um gesto deliberado.
- **Confirmação antes de enviar** (documento mestre, F12): soltar a peça não envia nada — a peça
  volta para onde estava e o destino aparece como fantasma de pré-visualização (o `intentPreview`
  já existente), com o diálogo "Mover Gon para (3, 4)? Confirmar / Cancelar". Só confirmar manda
  a master action. Pôr: escolher o personagem na lista, tocar num slot vazio (o
  `placingNpcId`/`onNpcPlaced` que o placer do lobby já usa), confirmar. Tirar: selecionar a
  peça, **Tirar do mapa**, confirmar.
- **Nada muda na tela antes do servidor (I1):** a peça só se move quando chegar o
  `piece_moved` do servidor; `master_action_enqueued` é a confirmação (ele vai para a mesa
  inteira: o jogador ignora). Os verbos e o formato vêm do contrato de `enqueue_master_action`
  reescrito por B9/B14 — a tarefa começa por ele.
- Saída do modo: o mesmo botão, ou `Esc`. Um arrasto pendente de confirmação é cancelado ao
  sair do modo e em toda reconexão.

### F13 — O front para de escrever o tabuleiro no servidor (espera B14)

Sai o `map_state_sync` (`sendBoardSync`/`maybeSyncBoard` em `useMatchWs`, o `board` em
`useGameTable`) e o `seedFromRest` do mestre em `useLiveMapSync`: as duas páginas desenham só o
que vem em `map_full_state` e nas mensagens de peça/parede. O que o watchdog e o "marcador de
registro concluído" existiam para decidir (quando mandar o sync) sai junto; o watchdog de socket
mudo continua (é outra coisa).

### F16 — Iniciar a partida não grava mais no mapa da campanha (espera B14)

Sai o `mapsService.updateMap(... { pieces: lobbyPieces })` de `LobbyPage.tsx`. O back já recusa
trocar o mapa anexado depois do `start_match` (`ErrMatchAlreadyStarted`, PR #81): `MatchMapsPanel`
esconde a troca numa partida iniciada e, se a recusa vier mesmo assim, mostra o `detail` (padrão
`getApiErrorDetail`).

### F14 — O mestre escolhe onde cai o escape que falhou (espera B13)

O `ResolutionDetails` (F7, no card da ação em andamento) destaca o alvo cujo escape falhou ("posição final a critério do
mestre"): **Escolher onde cai** põe o mapa do mestre em modo de escolha de slot (um toque num
slot vazio escolhe; `Esc` ou × cancela), mostra o slot escolhido como fantasma de
pré-visualização, e manda o verbo que o contrato de B13 definir como parte da resolução do
turno. **Não** é o arrastar de F12 (documento mestre) — outro gesto, outro verbo, e só existe
dentro do painel de resolução. Sem escolha, a peça fica onde estava no fechamento (o servidor
decide).

### F15 — Começar uma partida de onde outra terminou (espera B16)

Na tela em que o mestre anexa o mapa (`MatchMapsPanel`), a opção "Continuar o tabuleiro de…"
lista as partidas da mesma campanha com o mesmo mapa (endpoint de B16) e manda a herança pelo
verbo que o contrato definir.

## 6. Resiliência a reinício (§0.2 do documento mestre)

**O que acontece se o servidor reiniciar, o cliente recarregar ou a conexão cair e voltar, no
meio de cada coisa que esta fase entrega:**

| Estado | Fonte | Recarregar | Reconectar | Servidor reinicia |
|---|---|---|---|---|
| Histórico (turnos) | REST | refaz o fetch | `match_full_state` invalida → refetch | o REST vem do banco — nada muda |
| Histórico (cena/regime/round) | REST (B15) | refaz o fetch | `match_full_state` invalida → refetch | o REST vem do banco — nada muda |
| HP ao vivo | `character_hp_changed` sobre REST | REST | `state.hp` zerado + participantes/ficha rebuscados (o HP perdido na queda volta pelo REST) | idem |
| Ficha aberta | REST + HP ao vivo | aba não persiste (é UI) | ficha rebuscada | idem |
| Cálculo do turno aberto (card em andamento) | `match_full_state.resolution` + `openTurn` | volta (sem a linha da fila até B1/B2) | idem | o servidor perde a fila e o turno; `match_full_state` sem `openTurn` → o card sai |
| Barras (F6) | `bars_updated` com `seq` | volta por `match_full_state.bars` | idem | voltam zeradas — o servidor é a fonte, o cliente mostra o que vier |
| Fila do mestre (F1) | `match_full_state.queue` | volta | volta | vazia, igual no servidor |
| Declaradas do jogador | `localStorage` + reconciliação (F10) | reconciliadas na conexão | idem | as perdidas saem **com aviso** e o rascunho volta — **nunca** reenvio |
| Arrastar pendente (F12) | local | perdido (nada foi enviado) | cancelado | cancelado |
| Rascunho do composer | `localStorage` (conveniência) | fica | fica | fica |
| Tabuleiro (F13) | `map_full_state` | volta | volta | volta do banco depois de B3/B14 |

A verificação (§8) recarrega e reinicia no meio desses fluxos.

## 7. Arquivos

| Arquivo | Muda |
|---|---|
| `src/hooks/useMatchWs.ts` | repassa `timestamp`; trata `npc_added`; `sendAddNpc`, `sendChangeScene`; (T16) sai o board sync |
| `src/features/match/combat/combatMessages.ts` | tipos: resolução completa, `ChangeScenePayload`, `AddNpcPayload`, `NpcAddedPayload`; (Parte B) fila inteira, declaradas do dono |
| `src/features/match/combat/combatReducer.ts` | `at`/`receivedAt` nos eventos; `openResolution`; zera `hp` no `match_full_state`; (T14) reconciliação |
| `src/features/match/combat/useMatchCombat.ts` | invalidações de query; novos verbos |
| `src/features/match/combat/combatErrorMessages.ts` | prefixos `change_scene`, `add_npc`; códigos `not_found`, `invalid_npc` |
| `src/features/match/combat/historyRows.ts` *(novo)* | árvore REST + eventos ao vivo → linhas |
| `src/features/match/combat/EventStream.tsx` | renderiza linhas prontas |
| `src/features/match/combat/ResolutionDetails.tsx` *(novo)* | F7, dentro do card em andamento da `QueuePanel` |
| `src/features/match/combat/QueuePanel.tsx` | card da ação em andamento no topo (F7) |
| `src/components/templates/MatchStageTemplate.tsx` | `panelWide` (F3) |
| `src/features/match/combat/CharacterBarsStrip.tsx` *(novo)* | F6 |
| `src/features/match/combat/GeneralBar.tsx` | monta a faixa; chave nos chips |
| `src/features/match/combat/SceneChangeDialog.tsx` *(novo)* | F8 |
| `src/features/match/combat/MasterControls.tsx` | **Nova cena**; `AddNpcPicker` |
| `src/features/match/combat/MatchSheetPanel.tsx` *(novo)* | F3 |
| `src/features/match/combat/AsideTabs.tsx` | volta a não-controlado |
| `src/features/match/sidebarCharacter.ts` *(novo)* | adaptador F5 |
| `src/features/match/MatchCharactersSidebar.tsx` | sempre o card; `isOwn` |
| `src/features/sheet/types/sheetMode.ts`, `CharacterSheetTemplate.tsx` | `embedded`, `MATCH_SHEET_MODE` |
| `src/types/matchHistory.ts` *(novo)*, `src/services/matchService.ts`, `src/hooks/useMatchHistory.ts` *(novo)* | F4 |
| `src/pages/GameMasterPage.tsx`, `GamePlayerPage.tsx` | orquestração de tudo acima |
| (Parte B) `QueuePanel.tsx`, `useGameTable.ts`, `actionDraft.ts`, `LobbyPage.tsx`, `MatchMapsPanel.tsx`, `useLiveMapSync.ts` | F1, F10, F12–F16 |

## 8. Testes e verificação

**Automatizado (vitest):** reducer (`openResolution`, `at`/`receivedAt`, `hp` zerado, e na
Parte B a reconciliação); `historyRows` (a regra de sobreposição é o coração de F4 — casos:
fetch anterior não derruba, fetch posterior derruba, eventos de cena/regime ficam, ordenação
por hora do servidor, empate); `toSidebarCharacter`; `draftFromDeclared`; `useMatchWs`
(`timestamp`, `npc_added`); páginas por MSW + socket falso (o stub do `TacticalMapViewer` já
existente): aba não troca ao inspecionar; card sempre renderizado; `add_npc` e refetch; ficha no
painel sem `navigate`; painel de resolução; nova cena; histórico vindo do REST e rebuscado no
`turn_closed`.

**Browser (a única evidência da camada Pixi), com três contas, contra o back real:**

1. Partida **criada do zero**; o mestre anexa o mapa e **põe um NPC no mapa pelo lobby** (o
   caminho real — nada inscrito por fora). Abre a sala.
2. O NPC aparece no **Agir** do mestre e age (depende de B11 no back; antes do merge, registrar
   que a verificação espera o back).
3. Um round com os dois jogadores e o NPC: declarar, abrir, a peça andar, fechar. A faixa de
   barras mostra saldo, velocidades e média, e a ordem mostrada bate com as velocidades
   mostradas. (O dono do produto dispensou reproduzir o exemplo canônico 20/23/11 — os dados
   caem no servidor; o que se exige é mostrar que funciona.)
4. O jogador **não vê velocidade nenhuma** da própria ação antes de ela abrir.
5. Ficha dentro da partida nas duas telas; HP da ficha andando com o dano.
6. Histórico: fechar turnos, **recarregar a página** nas três telas no meio de um turno —
   turnos voltam, turno aberto, barras, fila e resolução voltam.
7. Nova cena; regime; inspecionar peça sem a aba pular.
8. **Reiniciar o servidor** no meio de uma fila: nenhum cliente fica mostrando ação que o
   servidor não tem (F10, depois de B12), o jogador vê o aviso e o rascunho de volta.
9. Parte B conforme cada item: arrastar/pôr/tirar com confirmação (F12), tabuleiro vindo do
   servidor (F13), lobby sem gravar no mapa (F16), escape que falhou (F14), herdar tabuleiro
   (F15).
10. Desktop, celular, tablet em pé e deitado.

## 9. Fora de escopo

Reações (Fase 7): botões, `attach_reaction`, `open_reaction`, "dar a palavra" no painel de
resolução. Edição do mestre (Fase 8). Chat. Cancelar ação (não existe no contrato). O balão de
mecânica e o alvo saber que é alvo (consomem B2 — Fase 7). O editor de mapa da partida (futuro,
documento mestre §6A.5).

## 10. Decisões desta sessão

| Decisão | Por quê |
|---|---|
| Arrastar do mestre vive num **modo Arrumar**, não sempre ligado (F12) | arraste e segurar brigam na mesma peça no toque; o modo separa sem tocar na zona pixel-tuned |
| O cálculo do turno aberto aparece **no card da ação**, na Fila — sem item novo no rail (F7) | desenho do dono do produto, que ainda vai refiná-lo |
| A ficha abre **no painel**, que alarga só para ela (F3) | desenho do dono do produto: Ficha é item do rail, junto de Ação, Inventário e Nen |
| Inspecionar peça (mestre, sem ator) só marca o anel; não abre ficha nem troca aba (F11) | F11 pede que a navegação fique onde o usuário deixou; a ficha abre pelo card |
| Sobreposição REST × WS pela **hora de início do fetch** (F4) | exata porque o servidor persiste antes de emitir; não depende de relógio do cliente vs servidor |
| Eventos da mesa carimbados com a **hora do servidor** (envelope `timestamp`) | intercala REST e WS sem misturar relógios |
| `match_full_state` zera o HP ao vivo e rebusca participantes, ficha e histórico | `character_hp_changed` perdido numa queda não volta; o REST volta a ser a base (§0.2) |
| `npc_already_in_match` do `add_npc` não é erro para o usuário (F2) | pelo contrato significa "o NPC está na partida" |
| Rascunho de uma declarada perdida só volta se o do ator estiver vazio (F10) | não atropelar o que o jogador já começou |
| A faixa de barras é igual para mestre e jogador; a velocidade da fila fica no card (F6/F1) | I8; e o documento mestre põe a parte 2 de F6 no card |
