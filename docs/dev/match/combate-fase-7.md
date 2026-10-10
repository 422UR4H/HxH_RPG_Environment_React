# Fase 7 do combate no front — Reações

> Spec: `docs/superpowers/specs/2026-10-05-front-combat-phase-7-reactions-design.md`.
> Plano: `docs/superpowers/plans/2026-10-05-front-combat-phase-7-reactions.md`.
> Contrato: `System_X_System/docs/dev/api/match-combat-ws.md` e `match-history.md` (PR #83 do back).

Este documento vem **depois** de `combate-fase-6.md` e `combate-fechamento-fase-6.md`. Onde
discordam, vale este.

## O que o usuário vê

| Peça | O que o usuário vê |
|---|---|
| Painel "Você é alvo" | Para cada personagem seu que é alvo da ação aberta, os cinco botões (Não fazer nada, Esquivar, Escapar, Escape defensivo, Repelir) e, depois do envio, o andamento: "Enviando a reação…", "Reação enviada — aguardando o mestre", "O mestre deu a palavra — narre sua reação". O mestre vê o mesmo painel como "Reagir pelo NPC". |
| Botões no mapa | Os mesmos cinco botões **abaixo** da peça, só enquanto o alvo ainda pode reagir (`available`). Em largura de celular (`media.phone`, < `tabletUp`) não são desenhados no mapa: ficam só no painel, que no celular fica logo abaixo do mapa. |
| Dica "você é alvo" | Enquanto um alvo seu pode reagir e a seção de reação não está na tela (outra aba, ou o painel fechado), o mapa mostra "Você é alvo — reaja no painel." (mestre: "Um NPC seu é alvo — reaja no painel."); o toque nela abre a aba (Ação / Fila) e o painel. As dicas da escolha da casa, de onde cai e do Arrumar vencem. |
| Clicar / segurar | Clicar envia. Segurar (450 ms) ou botão direito abre o diálogo de configuração (tipo, Evasão, arma do Repelir, custo). |
| Escolha da casa | Escapar e Escape defensivo (e Escapar com Evasão) armam a escolha: dica "Toque na casa para onde X escapa." e "× Cancelar". O toque na casa envia. |
| Mestre: Dar a palavra | Cada reação esperando no card "em andamento" tem "Dar a palavra" (`open_reaction`), com a nota de que a ordem de abertura muda o resultado. Depois do clique o botão daquela linha trava até a reação sair de `pendingReactions` (ou o turno mudar): um segundo clique não manda outro `open_reaction`. Cada alvo com reação aberta mostra "aberta em 1º/2º/3º". |
| Fantasma da fuga | A reação de fuga **aberta** aparece no mapa como fantasma (origem → destino), para toda a mesa que recebeu a posição. |
| Balões | Acima da peça: a mecânica ao abrir (ação e reações, cinza) e o resultado ao fechar (verde/vermelho). Um balão por personagem. |
| "Entrar na partida" | Botão no `BottomActions` da `MatchPage` com a partida em andamento, para o mestre e para quem tem personagem nela. |
| F14 | "Escolher onde cai" agora é alcançável pela UI: o escape que falha nasce de um `open_reaction` que o mestre dá pelo card. |

## O estado das reações no reducer

`CombatState` ganhou quatro campos: `openReactions` (as reações abertas do turno, na ordem em
que o mestre abriu, já cortadas para quem recebe), `ownReactions` (as minhas, com
`status: sending | attached | opened`), `closedTurn` e `lastSettled`.

- `REACTION_SENT` (local) cria a entrada `sending`; o `reaction_attached` promove a mais antiga
  `sending` daquele ator a `attached`, com `reactionId`. Sem nenhuma `sending` (o mestre
  recebendo a reação de um jogador) não cria entrada. Erro de `attach_reaction` tira a `sending`
  e o botão volta.
- `reaction_opened` acrescenta a reação a `openReactions` (sem duplicar pelo `uuid`) e marca
  `opened` a minha.
- `closedTurn` existe porque o `turn_closed` zera `openTurn` **antes** de o
  `resolution_updated` liquidado chegar; o balão de resultado do atacante precisa de quem agiu
  e do que declarou. `lastSettled` alimenta os balões de resultado e some no próximo
  `turn_opened` (ou na troca de cena).
- `turn_opened`, `turn_closed`, `round_closed` e `scene_changed` zeram `openReactions` e
  `ownReactions`.
- `match_full_state` reconstrói tudo do servidor (`openTurn.reactions`, `ownReactions`); as
  entradas locais `sending` são descartadas.

## A âncora: Pixi e `MapPieceOverlay`

Botões e balões são **HTML** sobre o canvas (D1), não Pixi. O que o Pixi ganhou foi só um
emissor: `ViewportInner` recebe `onViewportTransform` e, no `app.ticker`, emite `{x, y, scale}`
quando algum dos três muda (pega o pan dos handlers próprios, o zoom e o enquadramento).

- **A transformação vive num store externo** (`viewportStore.ts`, `useSyncExternalStore`),
  criado em `useGameTable` e assinado **só** pela `PieceAnchoredLayer`. Em `useState` da página,
  cada quadro de pan/zoom re-renderizaria a página inteira (a do mestre é a mais pesada).
  Mesmo enquadramento não notifica ninguém.
- `pieceScreenAnchor` / `pieceScreenRadius` (`utils/screenAnchor.ts`) convertem casa em pixel de
  palco. Peça empilhada ancora no centro da casa. Peça fora do fog não existe em `boardPieces`,
  então não tem âncora.
- `MapPieceOverlay` posiciona cada item; o contêiner tem `pointer-events: none`, e só os
  botões (os itens de baixo) têm `auto`. **O item de botões corta o `pointerdown`**: o pan do
  mapa escuta o `window` e trata qualquer toque dentro da caixa do canvas como toque no mapa,
  inclusive num botão ali. O balão é só leitura: não recebe ponteiro, e o toque sobre ele vai
  ao mapa (casa, peça, pan).
- **Balões: um por personagem.** O ator que se alveja tem resultado de ator e de alvo; as duas
  frases vão no mesmo balão, cada uma no seu tom. Balões de peças vizinhas que se sobrepõem são
  **empilhados** para cima (`stackAbove`, em `overlayLayout.ts`, pura e testada), com medição
  em `useLayoutEffect`. Os botões de baixo não empilham.
- **"Ficou a salvo".** Alvo com `attackStopped` (um aparo anterior na corrente já tinha parado o
  golpe) é rotulado "ficou a salvo" (`avoidedVerb`) no balão, no card ("… (o golpe já tinha
  parado)") e no histórico — nunca "esquivou", mesmo com reação `nothing`.
- `anchoredItems.tsx` é o lugar único onde as duas páginas montam os itens (botões e balões);
  `ReactionDialogHost` é o do diálogo.

**Só o browser prova o emissor Pixi e a posição real das âncoras** (ver abaixo).

## O gesto

Os botões reusam o `createHoldTracker` (`useHoldGesture.ts`, Fase 6): pointerdown → `start`,
pointerup → `end()`: `"click"` envia, `"hold"` configura; `onContextMenu` configura sem esperar
o timer. Teclado: Enter/Espaço enviam, Shift+Enter configura. Um `click` sem ponteiro nem
tecla antes (`detail === 0`: leitor de tela, `element.click()`) também envia; o click do mouse
(`detail ≥ 1`) é ignorado, porque o pointerup já enviou. Com mouse, `pointerleave` cancela o
segurar (o mouse não captura o ponteiro: arrastar para fora esconde os moves do tracker); no
toque o leave só chega junto do up, então não é tratado. Não há segundo mecanismo.

## A escolha da casa

`useReactionControls` guarda `pick: { actorId, kind } | null`. Com `pick`, o toque num slot
vazio envia a reação com `move.position` e limpa o `pick`. A categoria do movimento é fixa por
tipo (`escape`/`escapeGuard` → Dash, `closedEscape` → Shift); não há seletor. Cai quando o turno
muda, no `match_full_state` ou com Esc/Cancelar. No jogador, o `handleSlotTap` consulta o `pick`
antes do compositor; no mestre, `BoardMode` ganhou `"reactionPick"`, exclusivo com `arrange` e
`fallPick`. Durante a escolha, nas duas telas, os anéis de alvo e a intenção do compositor ficam
escondidos e o toque na peça não marca alvo.

**O diálogo de configuração fecha** quando o turno muda, no `match_full_state` ou quando o alvo
deixa de estar `available` (mesma regra do `pick`).

## Consumo e reconciliação

`reaction_attached.consumedActionIds` tira a ação da lista de declaradas e da fila **sem** aviso
de perda (D7). Depois de recarregar, a reconciliação do `match_full_state` trata como consumida
toda declarada cujo id está em `ownReactions[].consumedActionIds`, e `resolveLostCandidates`
conta como "rodou" o id que aparece em `consumedActionIds` de uma reação do histórico.

## Decisões D1–D9 (do spec)

| # | Decisão |
|---|---|
| D1 | Botões e balões numa camada HTML ancorada à peça, não dentro do Pixi. |
| D2 | Os botões aparecem também no painel (lugar fixo do status; cobre alvo sem peça visível e celular). |
| D3 | A escolha da casa é um modo (`pick`) com dica e Cancelar, como o `fallPick`. |
| D4 | O diálogo, ao enviar uma fuga, arma a escolha da casa em vez de ter seletor próprio. |
| D5 | Fantasma de espera só para a reação **aberta**, não para a anexada (`ownReactions` não traz o destino). |
| D6 | Balões de resultado: verde = o personagem se saiu bem; vermelho = não; ficam até o próximo turno. |
| D7 | `consumedActionIds` tira a ação da lista sem aviso. |
| D8 | O mestre vê os mesmos balões da mesa. |
| D9 | "Entrar na partida" no `BottomActions`, para mestre e participante, só em andamento. |

Decisões de execução: o texto "Se você tinha uma ação na fila nessa barra, ela é consumida e
a reação rola com Desvantagem." aparece para todo tipo que cobra barra, inclusive
`closedEscape` (o consumo é condicional; sem ação na fila não há custo nem Desvantagem); defendido com 0 de dano é
"defendeu" (verde); "acertou N de M" conta alvo defendido como acertado; movimento puro não tem
balão de resultado; cores: neutro = `surfaceInput`, sucesso = `brandAccent`, fracasso =
`dangerDark`; no mapa só os botões em `available` (o status pós-envio colidia com os balões e o
painel já o mostra); os rótulos do diálogo usam fonte e cor dos tokens.

## Como verificar no browser

- **Duas origens, dois logins.** O `localStorage` é por origem. Use `http://localhost:5173` para
  uma conta e `http://127.0.0.1:5173` para a outra — o `ALLOWED_ORIGINS` do back aceita as duas.
  Suba o segundo Vite com `npx vite --host 127.0.0.1 --port 5173 --strictPort` (com o
  primeiro já rodando em `localhost`; antes, confira que a 5173 não está presa por um Vite
  órfão).
- **Terceiro jogador:** um script WS (conta `test3@`) que manda `attach_reaction` basta quando
  não há uma terceira origem.
- **Aba de fundo não renderiza o canvas Pixi** (o ticker para), e a extensão do Chrome só tira
  captura da aba ativa. Traga a aba para a frente antes de olhar o mapa.
- Celular: iframe de 390×844; os botões somem do mapa e ficam no painel.

## O que não tem teste / limitações conhecidas

- **O emissor Pixi** (`onViewportTransform` no ticker) e a posição real das âncoras **só o
  browser prova**: `src/test/setup.ts` mocka `@pixi/react`. Foi visto no browser (botões e balão
  acompanham o reenquadrar), não por teste.
- **O re-empilhamento dos balões re-mede a cada mudança de enquadramento**: a
  `PieceAnchoredLayer` refaz a lista de âncoras a cada quadro de pan/zoom, e o `useLayoutEffect`
  do `MapPieceOverlay` roda com ela (um `getBoundingClientRect` por balão visível). Com os poucos
  balões de um turno é barato; o estado só muda (e re-renderiza) quando a pilha muda.
- **O reset global `* { font-family: 'Lato' }`** (pré-existente) sem a fonte Lato carregada cai
  na serifada padrão e afeta **outros diálogos**; foi corrigido só no diálogo de reação.
- **Com esquivas a ordem de abertura não muda o cálculo.** Só um Repelir que para o ataque o
  muda. O browser mostrou a UI da ordem ("aberta em Nº", sobrevive ao recarregar) e a
  reconexão, **não** um desfecho que depende da ordem.
- Peça empilhada ancora no centro da casa (sem o deslocamento da pilha).
- Fora do escopo: cancelar ou trocar uma reação anexada (o servidor recusa o segundo attach),
  narração/chat. (A edição do mestre, que era a Fase 8, existe agora: ver `combate-fase-8.md`.)
