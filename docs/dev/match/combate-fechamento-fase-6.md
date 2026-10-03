# Fechamento da Fase 6 do combate — o que mudou no front

> Spec: `docs/superpowers/specs/2026-09-27-front-combat-phase-6-closure-design.md`.
> Plano: `docs/superpowers/plans/2026-09-27-front-combat-phase-6-closure.md`.
> Ledger (linhas `Ruling:`): `.superpowers/sdd/2026-09-27-front-combat-phase-6-closure/progress.md`.
> Contrato: `System_X_System/docs/dev/api/match-combat-ws.md`, `match-history.md`, `match-maps.md`
> (PR #82 do back).

Este documento vem **depois** de `combate-fase-6.md`. Onde os dois discordam, vale este; as
seções que ficaram velhas lá apontam para cá.

## O que cada item entregou

| Item | O que o usuário vê |
|---|---|
| F1 | A fila do mestre tem "Detalhes" por linha: alvos, arma, movimento e destino, perícias, as duas velocidades com os dados, a chave da ordem geral e o que a ação cobra. |
| F2 | O mestre age por qualquer NPC da partida; um NPC que está no mapa e não é participante entra por "Pôr na partida" (`add_npc`). `npc_already_in_match` não é erro para o usuário. |
| F3 | Tocar num card de Personagens abre a ficha **no painel**, que alarga só para ela. Não navega. |
| F4 | O Histórico vem do REST (`GET /matches/{id}/history`): turnos, cenas, regime, fim de round e master actions, com o ao vivo por cima até o REST cobrir. |
| F5 | Os cards de Personagens usam o dado público da ficha (avatar, capa, etiqueta de NPC). |
| F6 | A faixa de barras por personagem, no topo do mapa: saldo, velocidades que agiram, média e preço (no Disputado). Igual para mestre e jogador. |
| F7 | O card "em andamento" da Fila mostra o cálculo do turno aberto e, com I1, a declaração da ação. |
| F8 | "Nova cena" (categoria + descrição), bloqueada com turno aberto. |
| F10 | A lista de declaradas segue o servidor: o que ele não tem sai **com aviso** e o rascunho volta. |
| F11 | Selecionar uma peça não troca a aba da direita. |
| F12 | O mestre arrasta, põe e tira peças no modo Arrumar, sempre com confirmação. |
| F13 | O tabuleiro (peças, paredes, fog) é do servidor, para os dois papéis. |
| F14 | O mestre escolhe onde cai a peça cujo escape falhou. |
| F15 | Uma partida pode começar do tabuleiro final de outra. |
| F16 | Iniciar a partida não grava mais no mapa da campanha. |

As decisões de desenho da sessão estão na tabela do spec §10. As que vieram depois estão no
ledger. As que mais pesam no código são as seções abaixo.

## O WS avisa, o REST busca

Mensagens que dizem "o dado de referência mudou" viram **invalidação de query**, não estado
no reducer. O reducer não guarda cópia de histórico, participante nem ficha.

| Mensagem | O que rebusca |
|---|---|
| `turn_closed`, `scene_changed`, `round_mode_changed`, `round_closed` | histórico (`HISTORY_TYPES` em `useMatchCombat`) |
| `master_action_enqueued` | histórico |
| `piece_moved`, `piece_removed`, `wall_state_changed`, `wall_revealed` **sem turno aberto** | histórico (`onBoardChange` em `useGameTable`) |
| `npc_added` | participantes |
| `match_full_state` (toda conexão e reconexão) | participantes, histórico e a ficha aberta; zera o HP ao vivo |

**Por que o tabuleiro entre turnos rebusca.** Peça e parede mexidas entre turnos são master
actions já gravadas, e o jogador não recebe `master_action_enqueued` de peça (nem ninguém
recebe o de parede). O tabuleiro é o único aviso. Com turno aberto nada é gravado até o
fechamento, e o `turn_closed` já rebusca.

**Por que não vira uma enxurrada de GETs.** `invalidateQueries` cancela o fetch que já estava
em voo (`cancelRefetch`), e só uma requisição por chave fica de pé. Três mensagens no mesmo
tick viram um GET só.

## O Histórico: REST por baixo, ao vivo por cima

`historyRows` (`src/features/match/combat/historyRows.ts`) junta as linhas do REST com os
eventos ao vivo. Uma linha ao vivo de um tipo que o REST cobre sai quando
**`fetchStartedAt >= receivedAt`**: o fetch começou depois de a mensagem chegar.

É exato porque:

- o servidor grava **antes** de emitir, então um fetch que começou depois da mensagem já
  enxerga o que ela anunciou;
- o refetch roda no mesmo stack síncrono que carimbou o `receivedAt` (dispatch →
  `invalidateQueries` → `queryFn`), quase sempre no mesmo milissegundo. Por isso é `>=` e
  não `>` (Ruling 5: com `>` o turno fechado saía duplicado);
- um fetch que já estava em voo é cancelado pela invalidação, e os dados dele nunca aparecem.

Os dois relógios não se misturam. A ordenação usa a hora do **servidor** (o `timestamp` do
envelope, no `at`); o corte usa a hora **local** dos dois lados (`fetchStartedAt` e
`receivedAt`).

As linhas do REST são de cena, turno, troca de regime, fim de round e master action. As ao
vivo são as que o REST ainda não cobre (o turno aberto, o HP que chegou antes do
`turn_closed` e o que chegou depois do último fetch). Se o GET falha depois da nova tentativa,
a aba avisa "Não foi possível carregar o histórico." por cima das linhas ao vivo.

## Reconciliação das declaradas (F10)

Uma declarada é conhecida pelo servidor se e só se está na fila ou é a ação do `openTurn`
(regra B12 do contrato). A fila é `ownQueue` para o jogador e `queue` para o mestre, que
declara pelos NPCs (Ruling 13). A página escolhe qual via `declaredSource`.

Uma declarada que sumiu da fila pode ter sido **perdida** (o servidor reiniciou) ou **fechada
enquanto eu estava fora**. As duas parecem iguais no `match_full_state`. Por isso ela vira
*candidata*, e só é dada como perdida depois de um fetch do histórico que começou depois
daquele `match_full_state`. Se a ação (ou a reação) estiver no histórico, a candidata some em
silêncio; se não estiver, sai com aviso e o rascunho volta, mas só se o rascunho daquele ator
estiver vazio (Ruling 12, I7).

**Duas limitações conhecidas:**

1. As candidatas vivem só em memória. Recarregar a página durante a janela de decisão perde o
   aviso e o rascunho que voltaria.
2. Se o fetch do histórico depois da reconexão falha, as candidatas ficam sem decisão até um
   fetch seguinte dar certo.

## Os três modos do tabuleiro do mestre

`BoardMode` em `GameMasterPage`: `play` (o normal), `arrange` (Arrumar, F12) e `fallPick`
(escolher onde cai, F14).

- **Exclusivos.** Entrar em um sai do outro. Sair de um é sair de todos (`exitBoardMode`
  limpa as confirmações pendentes, a peça escolhida, o chip armado e a fuga escolhida).
  Entrar em qualquer um solta o ator e a inspeção.
- **Arrumar ocupa o painel** no lugar da Fila. Por isso não há como escolher onde cai
  enquanto se arruma: o botão "Escolher onde cai" mora no card em andamento da Fila.
- **Saídas.** Esc sai do modo, menos quando é de outra coisa (outro diálogo aberto, ou um
  campo de texto com foco). Escolher uma aba do rail sai do Arrumar. Tocar num card de
  Personagens sai de qualquer modo, porque abre a ficha.
- **Reconexão.** Todo `match_full_state` derruba o pedido ainda não confirmado (a confirmação
  do Arrumar, o chip armado, o slot de queda): o tabuleiro que ele mirava pode já não ser o
  do servidor. O **modo** continua. O `fallPick` sobrevive enquanto a reação de escape ainda
  está no cálculo do snapshot; se ela sumir (o turno fechou), o modo cai sozinho.
- **Soltura sobre os controles.** O placer do Pixi trata como "pôr" qualquer `pointerup`
  dentro da caixa do canvas, inclusive um toque no Enquadrar, na barra geral ou num aviso,
  que flutuam por cima dele. Com o chip armado, um ouvinte de captura anota se a soltura caiu
  no mapa mesmo, e uma que não caiu é descartada. Isso tudo sem mexer na zona Pixi.

### F12 — Arrumar

Arrastar, pôr e tirar abrem um diálogo de confirmação ("Mover X para…?", "Pôr X em…?",
"Tirar X do mapa?"). Só o Confirmar envia o `enqueue_master_action`. Até lá a peça volta ao
lugar. Pôr o personagem de um jogador que não participa é recusado pelo servidor
(`not_participant`, "Esse personagem não está na partida.").

### I1 — a declaração no card em andamento

`turn_opened.action` e `match_full_state.openTurn.action` (B2, nível Full para o mestre)
chegam ao card com o mesmo bloco de detalhes das linhas da fila. Depois de uma reconexão a
linha da fila não volta (`openQueued` fica nulo), então o card perde as barras, e com elas a
chave da ordem e o "Cobra".

### F14 — onde cai

**Não é alcançável pela UI até a Fase 7.** O escape que falha nasce de um `open_reaction`, e
o `open_reaction` ainda não tem UI. No browser ele foi enviado pelo socket da página.

## O tabuleiro é do servidor (F13, F16)

- As duas páginas da partida desenham só as peças do `map_full_state`. Do REST vêm o fundo e
  a grade do mapa, mais nada. As peças do mapa da campanha não são as da partida.
- O mestre no lobby também lê o `map_full_state` do servidor, e o lobby parou de mandar
  `map_state_sync` (Ruling 15).
- Iniciar a partida não grava mais no mapa da campanha.

## Continuar o tabuleiro de outra partida (F15)

- **Não há endpoint de listagem.** A aba Mapas pede o `GET /matches/{id}/map` de cada partida
  já iniciada da campanha (um GET por partida, `useInheritableBoards`) e as oferece agrupadas
  pelo mapa anexado. Daqui não dá para saber se a partida deixou mesmo um tabuleiro. Quando
  não deixou, o 422 do anexar avisa.
- Herdar **substitui** o tabuleiro atual (e troca o mapa), e a tela diz isso antes.
- Se o lobby não está aberto, quem tenta entrar volta com o aviso "lobby fechado".
- **422s.** No caminho de herança, o back usa um 422 para cinco motivos, e só o `detail` diz
  qual (`INHERIT_REFUSALS` em `MatchPage`). Um `detail` desconhecido diz que não dá, sem
  sugerir tentar de novo. No anexar/desanexar sem herança o único 422 é "partida iniciada", e
  o status basta (Ruling 17).

## Detalhes que confundem

- **BF3 — a resolução pode chegar antes ou depois do `turn_opened`.** O reducer aceita uma
  resolução não liquidada sem turno aberto e, no `turn_opened`, só a guarda se o `turnId` bate
  (Ruling 8).
- **"Esquivou", "fugiu", "aparou".** `avoided` vale por qualquer meio. O verbo vem de
  `reaction.kind`: sem reação ou `dodge` → esquivou, `escape*` → fugiu, `repel` → aparou
  (Ruling 7, `avoidedVerb`).
- **NPC criado duas vezes.** Se a criação do NPC dá certo e o upload da imagem falha,
  "Criar" de novo não cria outra ficha: refaz só o upload na ficha que já existe, e a mensagem
  diz que as outras mudanças ficam para a edição (Ruling 10).

## O que não tem teste

A camada Pixi não tem teste nenhum: arrastar, pôr e tirar peça, os fantasmas, o toque no slot
de queda e os gestos no celular. Ali o browser é a única evidência.

**O que o browser verificou** (headless, contra o back do PR #82; detalhes em
`browser-findings.md` no ledger):

- F1, F2, F3, F4 (incluindo master actions, regime e cena depois de recarregar), F5, F6, F7
  (ao vivo e depois de recarregar, nas duas ordens do BF3), F8, F11, F12 (pôr, tirar,
  arrastar), F13, F14, F15, F16;
- a página não rola na horizontal em 390, 768, 1024 e 1440 px.

**O que não verificou:** F10 com o servidor reiniciando enquanto uma ação está na fila. Os
servidores eram da sessão do back. Fica para a validação manual.
