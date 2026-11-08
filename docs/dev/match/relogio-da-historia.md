# Relógio da história

> Contrato: `System_X_System/docs/dev/api/match-clock.md` (repositório do backend) — mensagens
> `set_clock_start`, `adjust_clock`, `set_clock`, `play_clock`, `pause_clock`, `get_combat_summary`,
> `end_match`, os eventos `clock_changed`, `combat_summary`, `match_ended` e o fechamento 4002.
> Spec: `2026-11-08` (relógio da história). Onde o código se afastou do spec, vale o código descrito aqui.

Este documento vem depois de `combate-polimento-mesa.md`. O relógio é o "agora" da história: uma hora
que o mestre define, que anda quando ele manda (ou quando o tempo real está ligado) e que fecha a
partida. Tudo mora em `src/features/match/clock/`; as páginas só montam as peças.

## Onde o estado mora

O relógio é **do servidor**. O front não tem estado otimista: toda ação do mestre (`send.adjustClock`,
`send.setClock`, `send.playClock`, `send.pauseClock`, `send.setClockStart`, `send.requestCombatSummary`,
`send.endMatch`, expostos por `useMatchCombat` a partir de `useMatchWs`) só envia; a tela muda quando
o `clock_changed` volta. Cada helper devolve `boolean` (`false` = o socket estava fechado e nada saiu),
e os diálogos usam isso para não ficar esperando uma resposta que nunca virá.

No `combatReducer.ts` há três fatias:

- `clock` — `{ value: ClockState | null, receivedAt, lastChange, changeSeq }`. `receivedAt` é o
  `Date.now()` local da chegada (a âncora do tique); `lastChange` é o `change` do último
  `clock_changed`; `changeSeq` é um contador **local** que sobe a cada mudança aceita (é ele que os
  avisos e a pílula usam como "chegou uma nova"; não confundir com o `seq` do servidor).
- `combatSummary` — a resposta do `get_combat_summary` (`hiatuses` vira `[]` se vier ausente).
- `matchEnded` — o payload do `match_ended`.

**Regra do `seq`.** O servidor manda o relógio por duas vias sem garantia de ordem (o
`match_full_state` e o `clock_changed`). `isStaleClock` descarta o que chega com `seq` **menor** que o
guardado; `seq` igual passa. O `match_full_state` com relógio velho mantém `state.clock` como está.
O mesmo vale para as barras (`acceptBars`), por outro contador.

O `scene_changed` zera o regime da rodada para `Free` (o servidor faz o mesmo), além de limpar as
reações abertas.

## Tempo ingênuo: nunca `Date` em texto da história

O tempo da história é uma string **sem fuso**: `"2000-01-01T08:30:00"`. O objeto `Date` do navegador
aplicaria o fuso local e deslocaria a hora; por isso nada que toca string de história o usa.
`storyTime.ts` é o único lugar das contas:

- `parseStory` / `formatStory` — recusa `Z` e deslocamentos (`invalid story time`).
- `addSeconds`, `diffSeconds`, `compareStory` — aritmética de dias do calendário gregoriano proléptico
  (days-from-civil), passando por segundos desde 1970 do mesmo calendário ingênuo.
- `formatDateBR`, `formatTime`, `formatDelta` (`"+2 h 10 min"`, `"−15 min"`, `"+1 dia 2 h"`, `"0 s"`;
  o menos é U+2212) e `pad2`.

Onde a string do servidor vira outra coisa, é por **fatiamento** (`storyAt.slice(0, 10)`,
`slice(11, 19)`), como no `useMatchEndedRedirect`. A única `Date` do fluxo é `gameEndAt`, que é um
instante real (RFC 3339), não hora da história.

Os testes de `__tests__/storyTime.test.ts` cobrem virada de dia/mês/ano, o 29/02 de 2000, voltar além
da meia-noite e a recusa de `Z`. Para provar que nada depende do fuso, rode a suíte do relógio sob
dois fusos, por exemplo `TZ=America/Sao_Paulo npx vitest run src/features/match/clock` e
`TZ=Asia/Tokyo npx vitest run src/features/match/clock` — o resultado tem de ser idêntico.

## `useStoryClock`: o valor vivo

`useStoryClock(state.clock, { escalate })` devolve um `StoryClockView`. Mestre usa `escalate: true`,
jogador `false`.

- **Tique alinhado a `receivedAt`.** Com o relógio correndo (`value.running && storyAt !== null`), cada
  tique agenda o seguinte para o próximo segundo inteiro contado de `receivedAt` (sem deriva em
  partida longa). `now` = `storyAt` + segundos inteiros decorridos desde `receivedAt`; parado, é o
  próprio `storyAt`. Nada disso é guardado no reducer: é derivado a cada render.
- **Base do tempo real.** `realElapsedSeconds` conta desde `baseline.startedAt`. A base zera ao pausar e
  reinicia num `clock_changed` de `play`; um estado cheio ou `clock_changed` que chega com o relógio
  **já correndo** (reconexão) mantém a fase, para o alerta de 5 min não recomeçar.
- **Fases de atenção** (só com `escalate`, e só enquanto corre): `idle` → `running`; a cada 10 s
  `pulse`, a cada 60 s `strongPulse`; de 300 s (`ALERT_AT`) em diante `alert` fixo, com os pulsos por
  cima. `pulseKey` sobe a cada 10 s (é a `key` que reinicia a animação do anel); `alertKey` sobe a
  cada múltiplo de 5 min e é a chave do aviso "Tempo real ligado há N min".
- **`roundFlashKey`** = `changeSeq` quando o último `clock_changed` foi de `round` (0 caso contrário).
  A pílula pisca de leve, para todos; o que já estava no estado ao montar é velho e não pisca.
- **Movimento reduzido.** As animações da pílula (respiro do ponto ao vivo, anel de pulso, flash do
  round) têm `@media (prefers-reduced-motion: reduce)`; a informação não depende delas.

## Pílula e posição na tela

`ClockPill` fica no topo do palco, centrada. Para o jogador (`interactive={false}`) é só leitura
(`role="status"`, `aria-live="off"`, `title` com data e hora); para o mestre é o **botão** que abre o
painel (`aria-expanded`), com `data-phase` e o contador "▶ N min" depois do primeiro minuto. Sem hora
definida mostra "Hora a definir". A data aparece junto da hora.

Geometria e empilhamento ficam em `clockLayout.ts`, sem componente, para a barra geral e os avisos
descerem sem importar a pílula. `CLOCK_PILL_OFFSET` (= topo 8 + altura 40 = 48 px) é quanto o que
flutuava no topo do palco desce; quem fica embaixo soma o próprio respiro.

| Camada | z-index | Onde |
| --- | --- | --- |
| Mapa e barra geral | 30 | |
| Pílula do relógio | 40 | `CLOCK_PILL_Z_INDEX` |
| `StageNotices` (avisos) | 50 | `MatchStageTemplate` |
| Painel do relógio | 52 | `CLOCK_PANEL_Z_INDEX` — aberto, não pode ficar sob um aviso |
| Véus (painel/gaveta em tela estreita) | 55 | `SCRIM_Z_INDEX` |
| Gaveta | 60 | `ASIDE_DRAWER_Z_INDEX` |
| Confirmação de salto longo | — | portal no `document.body` |

O painel é `position: absolute` **sem `transform`** (centraliza por margem automática); a confirmação
do salto longo vai por portal ao `body` para não ficar presa no empilhamento do painel, embaixo dos
véus. Ela vem marcada com `data-clock-confirm`: com ela aberta, Esc fecha só a confirmação e um toque
nela não conta como "fora" para o painel.

## O painel do mestre (três níveis)

`ClockPanel`, ancorado embaixo da pílula (`anchorRef`: tocar na pílula alterna; Esc e toque fora
fecham; o foco entra ao abrir e volta à pílula ao fechar, salvo se o mestre já pôs o foco noutro lugar).
Sem hora definida o corpo é só "Hora a definir".

1. **Nível 1** — a hora grande (clicar abre a edição), a data, o limite (`Não volta antes de HH:MM:SS —
   motivo`, com data se for em outro dia), o botão "Tempo real" / "Pausar" (com "ligado há …") e os
   rápidos **+1 h** e **+1 min**. Esses dois **mudam o relógio na hora** (`onAdjust`), sem "Aplicar".
2. **Nível 2** — "⋯ Mais" (um `Collapse`): +1 s, −1 h, −1 min, −1 s.
3. **Nível 3** — a edição direta (`ClockEditor`), aberta ao clicar na hora ou em "Passar dias" (que
   abre já com +1 dia). **É o único lugar com "Aplicar".**

Regras do dono, todas no código:

- **Voltar é escondido.** Os rewinds só existem no nível 2; o painel não os oferece de cara.
- **Limite.** Um passo para trás que cruzaria `limitAt` (`crossesLimit`) fica `aria-disabled` (segue
  focável) e o `Tooltip` mostra o motivo. Os textos vêm de `LIMIT_REASON_COPY` (`start` "início da
  partida", `turn` "último turno", `scene` "troca de cena", `roundMode` "troca de regime", `round`
  "último round"). No editor, abaixo do mínimo trava o botão e mostra a mesma frase.
- **Base congelada (R10).** Ao abrir a edição guarda-se `{ base, initial }`. Com o tempo real correndo
  a prévia (`→ HH:MM · +x`), o "sem mudança" e o aviso de salto longo não andam enquanto o mestre digita;
  o painel avisa "O tempo real continua correndo; Aplicar fixa a hora digitada.". Idem no
  `EndMatchDialog`.
- **Corrida.** No regime `Race` o "Tempo real" fica bloqueado (`aria-disabled`) com a dica "No turno
  disputado, cada round vale 1 segundo.".
- **Salto longo.** No `ClockEditor.submit`, se `diffSeconds(value, base) > LONG_SKIP_SECONDS`
  (172 800 s, 2 dias para frente) abre o `LongSkipConfirm` ("Avançar +N? Os personagens perdem os dias
  de treino desse período.") e só então chama `onSubmit(value, true)`; senão `onSubmit(value, false)`.
  `confirmLongSkip` vai no `set_clock` / `end_match`.
- **Editor.** Sem calendário: a data anda de dia em dia (− / +) e a hora é digitada ou empurrada por
  setas (±1) e PageUp/PageDown (±10) com vai-um (`carryDays`); dois dígitos pulam para o campo
  seguinte; segundos só com "+ segundos"/quando pedidos. `allowUnchanged` deixa enviar o valor igual à
  base (usado ao encerrar combate e partida; no painel "sem mudança" trava o Aplicar).

## Avisos e histórico

`ClockNotice` (modo `change`) é o aviso de palco para toda mudança de tempo do mestre, 6 s
(`SHOW_MS`), `role="status"`, dentro de `StageNotices` (mestre e jogador). Só uma chave nova
(`changeSeq`) aceita aviso; o que já estava no estado ao montar é velho.

- **Coalescência** (`coalesce`): `adjust` e `set` em sequência dentro da janela viram **um** aviso
  (`kind: "adjust"`, `from` do primeiro, `to` do último, `deltaSeconds` somado — ou, se algum `set`
  vier sem delta, `diffSeconds(next.to, prev.from)`); qualquer outra combinação substitui. Cada
  mudança reinicia os 6 s.
- **Silenciosas** (`noticeText` → `null`): `round`, `limit`, `end`, `scene` sem troca de hora, `adjust`/
  `set` com delta 0. Uma silenciosa não troca o aviso visível nem reinicia o relógio.
- O modo `text`/`noticeKey` mostra texto livre (o alerta "Tempo real ligado há N min", do mestre).

| `kind` | Texto |
| --- | --- |
| `adjust` / `set` | "O mestre avançou o tempo +tamanho — agora DD/MM/AAAA HH:MM:SS" (ou "voltou o tempo"); o verbo dá a direção, o tamanho vai sem sinal |
| `play` | "O mestre ligou o tempo real" |
| `pause` (`manual`) | "O mestre pausou o tempo real (+elapsed)" — `elapsedSeconds` vem do servidor, não de `to − from` |
| `pause` (outro `reason`) | "O tempo real pausou (troca de regime \| troca de cena \| o mestre saiu \| fim da partida \| reinício do servidor)" |
| `start` | "A partida começa às HH:MM:SS de DD/MM/AAAA" |
| `scene` | "Nova cena — agora …" (neutro: também ocorre quando uma cena de roleplay fecha um round de corrida contado) |

As linhas de **histórico** usam o mesmo `noticeText`. Em `useMatchCombat`, o `clock_changed` só pede
rebusca do histórico (`onHistoryChanged`) para `start`, `adjust`, `set` e `pause`
(`HISTORY_CLOCK_KINDS`); o WS notifica, o REST busca.

## Hora inicial (`StartTimeDialog`)

Bloqueante para o mestre: sem Cancelar, sem Esc, sem fechar por clique fora, `Tab` preso dentro. O
critério é **derivado do estado**, nunca de flag local: `startTimePending = state.clock.value?.storyAt
=== null` em `GameMasterPage`. Quando o servidor manda um `storyAt` (estado cheio ou `clock_changed`),
ele some; se recarregar sem hora, volta. Pergunta "Que horas são no início da partida?", mostra só a
data fixa da história, hora/minuto (segundos atrás de "+ segundos") e envia `HH:MM:SS` por
`setClockStart`. Fica em "Começando…" até chegar erro (`set_clock_start`) ou o diálogo desmontar; um
duplo clique cujo 2º envio volte `clock_already_set` é tratado como aviso (`staleClockStartError`) e não
como erro do diálogo. A hora também pode ser dada na criação/edição da partida: `CreateMatchPage` e
`EditMatchPage` têm "Hora na história" (`TimeOfDayField`, `HH:MM`, opcional; vazio = o mestre informa
ao começar; na edição só vai no payload se mudou, para não reescrever segundos salvos).

## Fechar um combate (`SceneChangeDialog`)

`useSceneChangeFlow` guarda um `Snapshot` do que já havia ao abrir (resumo e erro velhos não valem para
esta abertura). Se a cena atual é `battle`, abrir envia `get_combat_summary`; o diálogo vira "Encerrar
combate e trocar de cena" e fica aberto depois de enviar: fecha só quando `scene.sceneId` muda
(`scene_changed`), e uma recusa aparece dentro. Recusa do resumo (`not_battle_scene`) ou socket
fechado cai no layout de roleplay (com mensagem, no segundo caso).

- **Resumo** (`CombatSummaryBlock`): "N rounds disputados = X s, já no relógio", "+1 s ao encerrar" se
  `activeRoundCounts`, e os **hiatos** (intervalos sem disputa que só o mestre sabe quanto duraram)
  com `HIATUS_MESSAGE`; sem hiatos, "Nenhum hiato: o combate foi contínuo.".
- **Hora exata do fim:** `ClockEditor` com `base = minimum = summary.minimumStoryAt`,
  `allowUnchanged` (pode aceitar o mínimo) e motivo "os rounds do combate já estão no relógio". O
  botão principal é o do editor, que conhece o mínimo e o salto longo; `send` junta `storyAt` e
  `confirmLongSkip` ao `change_scene`.
- **Categoria padrão:** `defaultCategory` = `roleplay` quando a cena que fecha é de combate (o normal é
  a seguinte não ser outra batalha), senão `battle`. Reabrir reseta campos e categoria.
- **Efeito no regime:** o `scene_changed` volta `roundMode` para `Free`.

## Encerrar a partida

Passo a passo, só mestre:

1. **Botão** (`EndMatchButton`, com `blockedReason` de `endMatchBlockReason`): travado em cena de
   `battle` ("Encerre o combate antes (troque de cena)."), com turno aberto ("Feche o turno aberto
   antes.") ou sem hora ("Defina a hora da partida antes."). O servidor recusa o mesmo; o botão só
   explica antes.
2. **Confirmação** (`ConfirmDialog` danger): "Não dá para desfazer…". "Continuar" congela
   `{ base: now, minimum: limitAt }`.
3. **Diálogo** `EndMatchDialog`: resumo final opcional (`FinalDescriptionField`) e a hora exata do fim
   (`ClockEditor`, `allowUnchanged`, mínimo = limite do relógio). Enviado (`end_match` com `storyAt`,
   `briefFinalDescription?`, `confirmLongSkip`), o diálogo **fica de pé** esperando; recusa aparece
   dentro (`shownError`, só se não estiver `pending`).
4. **Fim.** `isMatchOver` é verdadeiro quando chega `match_ended` (`state.matchEnded`), ou o WS fecha
   com **4002** (`status === "ended"`; vale também para quem reconecta numa partida já encerrada), ou
   qualquer comando volta `match_already_ended`. `useMatchWs` e `useLobbyWs` tratam 4002 como terminal:
   status `ended`, sem reconectar.
5. **`useMatchEndedRedirect`** (mestre e jogador): `setQueryData` em `["matchDetails", token, matchId]`
   gravando `gameEndAt` (do `match_ended`, ou "agora" se só o 4002/erro indicou) e, com `storyAt`,
   `storyEndAt`/`storyEndTime` por fatiamento; `invalidateQueries({ refetchType: "none" })`; e
   `navigate(matchPagePath(...), { replace: true, state: { endedByMaster: true } })`.

Por que o cache é gravado antes: a página da partida renderiza do cache e mostraria "EM ANDAMENTO" por
1–2 s até a rebusca. Por que `refetchType: "none"`: rebuscar já, com a `/game` montada, faria a mesa ver
`gameEndAt` e trocar a navegação por um `<Navigate>` sem o aviso; a página da partida rebusca ao montar.

**Por que "Voltar" nunca volta para a `/game`:** o `replace` tira a mesa do histórico, e as guardas
cobrem quem chega por outro caminho — `GamePage` e `LobbyPage` fazem
`if (match.gameEndAt) return <Navigate to={matchPagePath(...)} replace state={{ endedByMaster: true }} />`
(offline na hora do fim, URL digitada, lobby de partida encerrada). Na `MatchPage`, `endedByMaster`
mostra o aviso só para quem não é o mestre e com `status === "ended"`.

## Limites conhecidos

- **Mínimo ao encerrar com round de corrida contado em cena de roleplay.** Se há um round `Race`
  contado ativo numa cena de roleplay, o servidor soma +1 s ao mínimo do fim, mas o front não tem como
  saber (o `combat_summary` só existe em cena de combate). O editor do `EndMatchDialog` usa o limite
  do relógio; se o mestre escolher a hora do mínimo, o servidor recusa (`clock_below_limit`) e o
  diálogo mostra a frase explicativa. É a rede de segurança, não um defeito do botão.
- **Histórico na página da partida encerrada.** A exibição do histórico (linhas de relógio, resumo
  final) na página da partida encerrada fica para a próxima sessão; hoje a página só recebe `gameEndAt`
  e o fim na história pelo cache e pela rebusca.
