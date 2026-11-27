# Layout da mesa (F1)

Referência de onde cada zona da partida fica, por papel e tamanho de tela. Vem depois de
`combate-polimento-mesa.md`. Código: `src/styles/breakpoints.ts`,
`src/components/templates/MatchStageTemplate(.styles).ts(x)`,
`src/features/match/combat/useMatchLayout.ts` e `useStageOverlays.ts`.

## Tamanhos

| Nome | Regra |
|---|---|
| Celular em pé | largura < 768 e não deitado |
| Celular deitado | `(orientation: landscape) and (max-height: 540px)` — vale sobre os outros |
| Tablet | 768–1279 |
| Computador | 1280–1599 |
| Widescreen | ≥ 1600 |

Breakpoints com nome (`breakpoints`: `tabletUp` 768, `railUp` 1024, `asideUp` 1280, `wideUp` 1600),
nunca número solto. O celular deitado é reconhecido pela **altura** (`LANDSCAPE_PHONE_QUERY`), não
pela largura: os Androids comuns deitados medem 640–740 px (menos de 768), e o iPhone, mais. Por
isso a regra "vale sobre os outros": uma janela de computador baixa (540 px de altura ou menos, ex.:
DevTools acoplado embaixo) também ganha o layout de celular deitado. O tablet gira: em pé cai em `tabletUp`, deitado em `railUp`.

## Larguras (px)

| Zona | Celular em pé | Celular deitado | Tablet | Computador | Widescreen |
|---|---|---|---|---|---|
| Navegação | rodapé 56 | coluna 72 | mestre: coluna 72; jogador: rodapé < 1024, coluna 72 a partir de 1024 | coluna 72 | coluna 72 |
| Painel do mestre | metade da altura, fixo | coluna 280 | coluna 280, metade de cima | coluna 320, metade de cima | coluna 320 |
| Fila do mestre | aba do painel | metade de baixo (280) se dividir; senão aba | metade de baixo (280) | metade de baixo (320) | coluna 240, à esquerda do painel |
| Painel do jogador | como antes | coluna 280 | em pé: embaixo; ≥ 1024: coluna 280 | coluna 340 | coluna 340 |
| Ficha do mestre | folha | caixa 280 | caixa 280 | caixa `clamp(340px, 100% − 300px, 420px)` | idem |
| Ficha do jogador | folha | no painel (280) | no painel (embaixo em pé; ≥ 1024 coluna 280) | no painel, 420 | caixa `clamp(…)` |
| Histórico | gaveta | coluna 200 | coluna 200 | coluna 200 | coluna 200 |

**Dividir no celular deitado (mestre):** só com altura ≥ 364 px (`LANDSCAPE_SPLIT_MIN_HEIGHT` =
44 do header + 2 × 160). Abaixo disso a coluna mostra uma seção por vez, com os 5 itens na navegação.

**Celular em pé, mestre:** mapa e painel com a mesma altura (`panelHalf`); o painel nunca fecha, não
tem X e rola por dentro.

## Quem decide o quê

- **`MatchStageTemplate` (+ `.styles.ts`)** decide ONDE cada zona fica, só com CSS (grid por
  breakpoint). Rodapé e coluna são o mesmo `rail`: quem o deita é o CSS, não um ramo de JS.
  `RAIL_BAR_HEIGHT` (56) vem de `MatchStageTemplate.styles.ts`.
- **`useMatchLayout`** decide O QUE vai em cada zona: `phonePortrait`, `landscape`,
  `landscapeSplit`, `wide`, `asideIsDrawer`. `queueIsSplit(layout)` diz se a fila do mestre é fixa
  (`!phonePortrait && (!landscape || landscapeSplit)`).
- **Páginas** (`GameMasterPage`, `GamePlayerPage`) escolhem os itens da navegação, o conteúdo do
  painel e a seção ativa a partir do layout.
- **`useStageOverlays({ panelFixed })`** guarda `panelOpen`/`asideOpen`. "Abrir um fecha o outro"
  vale só no celular em pé (`asideIsDrawer`); de 768 em diante o Histórico convive com tudo. Com
  `panelFixed` (mestre) o painel está sempre aberto. Inicial: painel aberto a partir de `railUp` ou
  no celular deitado; Histórico aberto só a partir de `asideUp` e nunca no celular deitado.
  O hook também guarda `sheetOpen`/`setSheetOpen` com a mesma regra: no celular em pé abrir a ficha
  fecha a gaveta do Histórico e abrir a gaveta fecha a ficha (fechar nunca mexe na outra); de 768 em
  diante não se acoplam. As duas páginas usam o hook em vez de estado próprio.

## Pilha de camadas (z-index)

Barra geral e botão de enquadrar do mapa 30 · pílula do relógio 40 · avisos do palco 50 · painel
do relógio 52 · véu da ficha 53 · ficha (folha ou caixa) 54 · navegação e véus do painel/gaveta 55 ·
gaveta do Histórico 60. A folha desce por TRÁS da navegação (o rodapé fica por cima; o conteúdo da
folha tem `padding-bottom` de 56). Detalhe do comentário em `MatchStageTemplate.styles.ts`.

## Ficha

- **Folha (celular em pé, mestre e jogador):** 8 px das laterais, topo a 20% da altura abaixo do
  header, cantos de 22 px em cima. X vermelho de 36 px (`CloseButton` + `iconButtonFx(1.15)`),
  `top: -10px; right: -5px`.
- **Caixa (demais tamanhos):** altura do palco, colada à esquerda do mapa, **por cima do mapa sem
  deslocá-lo**, sem cantos arredondados, `border-right` e sombra à direita. Sem X.
- **Fechar:** tocar de novo em "Ficha", tocar no mapa (fecha e NÃO seleciona nada; é o
  `SheetScrim`, transparente) ou, na folha, o X.
- **De quem é:** jogador = sempre o próprio personagem. Mestre = o último personagem tocado no mapa,
  escolhido no "Agir por" ou aberto pelo card de Personagens.
- **Espera (mestre sem personagem):** tocar em "Ficha" não abre nada; o item fica marcado e a dica
  `${verb} numa peça para ver a ficha.` substitui as dicas do mapa (`MapHint`). A peça tocada abre a
  ficha (e só isso). Tocar no mapa fora de uma peça, numa parede ou de novo em "Ficha" desiste.
- No celular em pé, escolher outra seção da navegação fecha a folha (ela cobriria o painel); abrir o
  Histórico fecha a folha e, no mestre, também desiste da espera. Entrar na escolha da casa (queda
  ou fuga) também desiste da espera. Se o último personagem tocado saiu da partida, "Ficha" age como
  sem nenhum (espera uma peça).
- Onde a ficha é folha ou caixa, "Ficha" abre/fecha a ficha e não troca o painel (no celular em pé,
  abrir a folha fecha o painel de Ação do jogador).

## Navegação do mestre

Sem fila fixa: `Fila · Ficha · Agir · Personagens · Partida` (inicial: Fila). Com fila fixa:
`Agir · Ficha · Partida` (inicial: Agir). Tocar no item ativo não fecha nada.

## Histórico em coluna

Coluna de 200 px, aberta junto com tudo, em todo tamanho menos o celular em pé (lá, a gaveta com
véu). Abre/fecha pelo botão "Histórico" do header. No tablet em pé do jogador o painel de baixo
passa por baixo da coluna, em toda a largura: o Histórico nunca cobre painel nem folha.

## Header e controles do mestre

A partir de 768, e sempre no celular deitado (mesmo abaixo de 768 px, como 667×375): conexão,
depois "Round" + seletor Livre/Disputado. No celular deitado o Round nunca vai para o topo da Fila. Abrir próxima/Encerrar rodada e
Fechar turno ficam no topo da Fila (no celular em pé, o título "Round" + seletor vêm antes). "Nova
cena" e "Encerrar partida" ficam na aba Partida. Código: `HeaderRound`, `TurnControls`,
`QueueHeader`, `MatchTabPanel`.

## Fica para a F2

Rodapé novo com o recorte do botão "Enviar ação" e o painel de ação novo. Nada disso existe na F1.
