# Polimento da mesa de combate — front — design

> **Origem:** a lista de ajustes que o dono do produto levantou ao testar a Fase 8 (2026-10-10).
> Diagnóstico e recomendações aprovados no chat no mesmo dia ("suas recomendações estão perfeitas").
> **Um PR, repo `System_X_System_React`, branch `feat/combat-table-polish`**, a partir de
> `feat/combat-phase-8-regency` (PR #71 aberto; rebase em `main` depois do merge).
>
> **Depende do back:** `cancel_action`/`action_cancelled` (repo `System_X_System`, branch
> `feat/combat-cancel-action`; spec `docs/superpowers/specs/2026-10-10-combat-cancel-action-back-design.md`;
> contrato `docs/dev/api/match-combat-ws.md` §4 `cancel_action`, §5 `action_cancelled`).
> Só o item 15 depende dele.
>
> Plano: [`../plans/2026-10-10-front-combat-table-polish.md`](../plans/2026-10-10-front-combat-table-polish.md).

Os números seguem a lista do dono do produto.

## 1. Arrastar o mapa sobre uma parede abre a caixa da parede

**Causa.** `WallsLayer` (modo visualização) escuta só `pointerup` no canvas e faz hit-test na
parede — sem saber se houve arraste. O toque em slot vazio (`PiecesLayer`) já discrimina toque de
arraste, mas com uma cópia própria (`CLICK_THRESHOLD = 6`, comparando só início e fim — um arraste
que volta ao ponto de partida conta como toque). O `createHoldTracker` tem uma terceira cópia da
mesma tolerância (`MOVE_TOLERANCE_PX = 6`).

**Desenho.** Um reconhecedor de toque único, o padrão de apps de mapa (tap recognizer):
`createTapTracker` em `src/features/tactical-map/hooks/tapGesture.ts`, puro e testado. É toque
quando: o ponteiro desceu (botão primário), **nunca** se afastou mais que `TAP_TOLERANCE_PX` (6)
da origem durante o gesto (não só no fim), subiu com o mesmo `pointerId`, e não houve
`pointercancel`. `WallsLayer` e o slot vazio do `PiecesLayer` passam a usá-lo; o hold tracker
importa a mesma constante. Toque na parede abre a caixa; arrastar só move o mapa. O caso "segurar
sem arrastar" não importa (dono do produto).

**Por que não regride:** o comportamento de toque (abrir a caixa, escolher slot) é idêntico
quando não há movimento; só o arraste deixa de disparar. A camada Pixi não tem teste — a
verificação é no browser (§Verificação).

## 2. O nickname acima da ficha (mestre)

Some a linha inteira (`Head` de `MatchSheetPanel`, com o nome e um "×" que só limpava a ficha).
O nome já está na ficha; fechar o painel é o ícone Ficha do rail (e, em tela estreita, o véu do
item 4). `MatchSheetPanel` perde a prop `onClose`.

## 3. HP 0 não aparece na barra

**Causa.** Em `ProgressBar` (ion compartilhado por `HpBar` e `SpBar`) o texto `current/max` mora
**dentro** do preenchimento; com 0% o preenchimento tem largura zero e o fundo tem
`overflow: hidden` — o texto some. Valores baixos (1/32) saem cortados.

**Desenho.** O texto sai do preenchimento e é desenhado duas vezes, sobre a trilha inteira, na
mesma posição: uma camada clara sobre a trilha escura (`colors.textPrimary`) e uma escura
(`colors.textOnLight`) recortada exatamente na área preenchida (`clip-path: inset(0 X% 0 0)`) — a
técnica clássica de texto invertido em barra de progresso. A posição continua acompanhando o fim do
preenchimento, com um mínimo para caber: `left: max(P%, <largura do texto>)` + `translateX(-100%)`.
Com 100% fica igual a hoje; com 0% aparece "0/32" claro sobre a trilha. Ganha
`role="progressbar"` + `aria-valuenow/min/max`.

**As outras barras:** `HpBar` e `SpBar` são as únicas que usam `ProgressBar` — o conserto vale
para as duas. A `ExpBar` tem o mesmo defeito por outro caminho: o balão com o valor só abre com
`currExp > 0` (hover e toque longo) — com XP 0 não mostra nada. Passa a mostrar "0/max".

## 4 e 5. Bottom sheet e gaveta em telas estreitas

**Padrão:** folha/gaveta **modal** do Material Design — um véu (scrim) escurece o que fica atrás;
tocar no véu fecha a folha e o toque não chega ao mapa (nada é selecionado).

- **Painel (bottom sheet, abaixo de `railUp`):** véu sobre o palco quando o painel está aberto
  **e** o conteúdo dele não pede um toque no mapa. Pede toque no mapa (sem véu, como hoje): o
  mestre na aba Agir (com ator, compõe; sem ator, o toque num NPC do mapa é o que escolhe o ator
  — ajuste da revisão da Task 8), o jogador na aba Ação, a escolha de onde cai a fuga, a casa da
  fuga e o Arrumar. Com véu: Ficha e Fila.
- **Gaveta direita (Histórico/Personagens, abaixo de `asideUp`):** véu sobre tudo menos a gaveta;
  tocar fecha a gaveta. Escolher um card em Personagens (que abre a ficha) fecha a gaveta.
- **Um por vez abaixo de `railUp`:** abrir a gaveta fecha o painel e vice-versa.
- O véu fecha no `click` (soltar), não no `pointerdown`: assim o gesto inteiro acontece sobre o
  véu, e o soltar não cai no canvas recém-descoberto. O `pointerdown` dele não propaga (o pan do
  mapa escuta na `window`).

**Onde mora:** o véu é layout — `MatchStageTemplate` (props `panelDismissible`, `onDismissPanel`,
`onDismissAside`); a regra "um por vez" e "o card fecha a gaveta" é estado de página, num hook
`useStageOverlays` usado pelas duas telas (sem duplicar a lógica). Token novo `colors.scrim`
(`rgba(0, 0, 0, 0.32)`, a opacidade do Material).

## 6. Os cards de personagem não acompanham a largura da gaveta

`CharactersSidebar` (organism) tem `width: 300px` fixo; a gaveta tem 320–360px. Ganha a prop
`fluid` (ocupa a largura do contêiner); `MatchCharactersSidebar` a repassa, e só as telas da
partida (`GameMasterPage`, `GamePlayerPage`) a ligam. Campanha, lobby e `MatchPage` continuam com
300px.

## 7. A cor do movimento

**Azul-ciano** no lugar do lilás (`#9d7bff`):
- verde × laranja-vermelho (o ataque, `pieceAttackIntent`) é o par que daltônicos confundem;
  azul × laranja é o mais seguro e o de maior contraste de matiz;
- é a convenção do gênero (Fire Emblem, Advance Wars, Into the Breach, XCOM: azul = movimento,
  vermelho = ataque);
- o verde já é do anel de turno aberto (`pieceActiveTurn`) e some em mapa de grama.

Token renomeado pelo uso: `pieceGhost` → `moveIntent` = `#38bdf8`; `moveIntentBg` acompanha
(`rgba(56, 189, 248, 0.16)`). No mapa, os traços do movimento ganham um contorno escuro por baixo
(token `intentOutline`, `#0b1220`, desenhado antes do traço colorido, 2px mais largo) para não
sumir em fundo nenhum.

## 8. "Pôr na partida" sai do Agir

Vai para o **fim da lista de Personagens** (mestre), pelo slot `footer` que `CharactersSidebar`
já tem (`MatchCharactersSidebar` ganha `footer` e repassa).

## 9. "Suas ações declaradas" saem do Agir/Ação

Vão para o **fim do Histórico**, nas duas telas: o histórico é o que já aconteceu, e as declaradas
são o que vai acontecer. `EventStream` ganha `footer`, renderizado **dentro** do contêiner que
rola (o "fixar no fim" passa a incluí-lo).

## 10. O botão "Detalhes" da fila

Some. Cada card da fila mostra a declaração inteira sempre (o `QueueRowDetails` vira incondicional
quando há `action.action`).

## 11. A fila do mestre na ordem de execução

O servidor já publica a ordem em que o mestre vai abrir (`bars_updated.order`, a mesma conta do
`open_next_action` — "computed by the same code, so they cannot drift apart"), sem identidade de
ação (a ordem é pública, a fila é secreta). A fila do mestre passa a se ordenar por ela, a cada
`bars_updated`, sem mudança no back:

- `orderQueue(queue, order)` (puro, `queueOrder.ts`): para cada entrada da ordem, na ordem, pega a
  ação ainda livre do mesmo ator com as mesmas barras; havendo mais de uma, a de **maior
  velocidade** na barra principal (`action` se cobrada, senão `move`) — é como o escalonador
  desempata, porque a chave cresce com a velocidade — e, empatando, a que chegou antes.
- Ações que não estão na ordem (no regime Corrida, as que não conseguem mais pagar nesta rodada)
  vão ao fim, na ordem de chegada, marcadas **"próxima rodada"**.
- Sem `action.action` (servidor antigo), a velocidade é desconhecida: desempate só pela chegada.

## 12. "Abrir próxima" sem nada a abrir

Achado no diagnóstico: no regime **Corrida**, com a fila vazia (ou nada que possa pagar), esse
botão **encerra a rodada** — o servidor fecha a rodada quando nenhuma ação pode pagar.

| Situação | Botão |
|---|---|
| Corrida e `bars.order` vazio | **"Encerrar rodada"**, habilitado |
| Outro regime e fila vazia | "Abrir próxima", **desabilitado**, com dica "A fila de ações está vazia" |
| O resto | "Abrir próxima", como hoje |

- **Dica:** um componente novo e compartilhado, `Tooltip` (ion): aparece ao parar o mouse em cima
  e no foco do teclado; em toque (sem mouse), tocar no botão desabilitado mostra a mesma mensagem
  por alguns segundos. O botão usa `aria-disabled` (não `disabled`), o padrão acessível para
  controle desabilitado que explica por quê — `disabled` engole os eventos e a dica não abriria.
- **A mensagem do servidor**, se ainda chegar (corrida de tempo): `game_error` com
  `action queue is empty` vira só "A fila de ações está vazia." Um mapa pequeno de mensagens de
  domínio conhecidas, em `combatErrorMessages.ts`; o resto continua como vem.

**O aviso de erro (`MatchErrorBanner`):** hoje o aviso inteiro é um botão invisível (clicar em
qualquer ponto fecha) — selecionar o texto o fazia sumir. Passa a ter um "×" explícito
(`CloseButton`), o corpo não é clicável, e ele continua sumindo sozinho em 6 s.

## 13. Texto selecionável nas barras e no HUD

A tela da partida é superfície de app: `MatchStageTemplate` (o `Shell`) recebe
`user-select: none`, com `input, textarea, select` de volta em `user-select: text` (no iOS,
`none` herdado impede digitar). O reset global já fazia isso para `section`/`aside`/`nav`/`header`
— faltava o `main` (o palco, onde moram a barra geral e os avisos).

## 14. Repelir e a arma

- **Não é regressão:** o toque rápido em Repelir enviava na hora com a arma do rascunho; a caixa
  só abria segurando o botão.
- **Agora:** Repelir **sempre abre a caixa** (a arma muda o resultado), já com a arma do rascunho
  escolhida, ou Desarmado. As outras reações continuam como estão (toque envia; segurar configura).
  *Ruling do controlador:* a recomendação aprovada dizia "sem arma, envia direto"; isso exigiria o
  catálogo de armas de cada alvo antes do toque (hoje só a caixa o busca). Fica "sempre abre" — o
  custo é um toque a mais para quem está desarmado.
- **Fist e Desarmado são a mesma coisa:** o catálogo do servidor sempre traz `Fist`, e a caixa
  somava uma opção "Desarmado" própria. Fica uma só: `Fist`, exibida como "Desarmado" — na caixa
  da reação e no compositor de ataque. Um `weaponLabel(name)` em `combatText.ts` faz a troca; o
  texto corrido ("atacar Luiz com Fist") vira "atacar Luiz desarmado".

## 15. Cancelar uma ação declarada

O "×" de "Suas ações declaradas" só ocultava a linha. Passa a **cancelar de verdade**, pelo verbo
novo do back:

- Linhas "na fila" ganham **Cancelar**. Abre a confirmação (o mesmo molde dos diálogos da
  partida): "Cancelar esta ação? *<descrição>* — ela sai da fila e não acontece." com
  **Manter** e **Cancelar ação**. Confirmar manda `cancel_action { actionId }`.
- `action_cancelled` (mestre e quem pediu) tira a ação de `declared` (e, com ela, o fantasma do
  mapa) e da `queue` do mestre. Sem estado otimista: a linha some quando o servidor confirma.
- Recusa (`game_error`, ex.: a ação abriu nesse meio-tempo) aparece no aviso com o prefixo
  "Não foi possível cancelar a ação". Mensagens: `action not found in queue` → "A ação já não está
  na fila."; `action actor does not match player` → "Essa ação não é sua."
- Quem cancela: cada um o que declarou (o mestre, as dos NPCs) — é a regra do servidor; o front
  só mostra o botão onde ele já lista "suas ações".
- O "ocultar" some (era o "×" enganoso).

## Verificação

- `npm run test`, `tsc -b`, eslint nos arquivos tocados.
- **Browser** (obrigatório: a camada Pixi não tem teste), contra o back do PR de cancelar ação,
  com o mestre `test@` e os jogadores por WS/segunda origem (memória do projeto): arrastar sobre
  parede não abre a caixa / tocar abre; HP 0 na ficha; véu no celular (viewport estreito) fecha a
  folha sem selecionar; gaveta fecha ao abrir ficha; cards na largura; fila ordenada após
  declarações fora de ordem; "Encerrar rodada"/desabilitado com dica; aviso com ×; nomes não
  selecionáveis; caixa do Repelir com um "Desarmado"; cancelar uma ação some no mestre na hora;
  cor do movimento no mapa.

## Fora de escopo

- Mostrar a dica de "Abrir próxima" com o motivo de cada ação que não paga.
- Cancelar reação já anexada; o mestre cancelar ação de jogador.
- Rever a cor de outros elementos do mapa.

---

## 16. Adendo (2026-10-10, mesmo PR): o custo de cancelar, "Custo:" e a cancelada no histórico

Decidido pelo dono do produto depois da primeira rodada. Back: spec
`System_X_System/docs/superpowers/specs/2026-10-10-combat-cancel-action-back-design.md` §8
(PR #86) — cancelar marca o personagem até o fim da rodada (Race) e o que ele fizer de novo rola
a velocidade (ação; movimento quando move) com Desvantagem; a cancelada é gravada e o histórico a
mostra como evento de rodada `kind: "actionCancelled"`.

- **"Cobra:" vira "Custo:"** em todo texto de UI que diz o que uma ação ou reação gasta (fila do
  mestre, caixa da reação), com a barra por extenso: "Custo: barra de ação", "Custo: barras de
  ação e movimento". Não se usa "consome" aqui: "consumir" já é o que a reação faz com a ação
  que estava na fila, e as duas ideias aparecem juntas na caixa da reação.
- **O diálogo de cancelar avisa o custo** quando o regime é Disputado (Race): uma linha a mais —
  "Até o fim da rodada, o que este personagem fizer de novo rola a velocidade com
  Desvantagem." No Livre a linha não aparece (lá não há efeito).
- **O histórico mostra a cancelada** (evento de rodada, na ordem do tempo, no estilo das linhas
  de evento que já existem, como a troca de regime): com `action`, "Fulano cancelou: *descrição*"
  (a mesma descrição de "Suas ações declaradas"); sem `action` (outros jogadores), "Fulano
  cancelou uma ação".
- **Fora:** marcar o custo nos botões de reação (o dono do produto vai desenhar com o designer).
