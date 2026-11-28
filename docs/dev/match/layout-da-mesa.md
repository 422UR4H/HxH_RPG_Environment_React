# Layout da mesa (F1)

Referência de onde cada zona da partida fica, por papel e tamanho de tela. Vem depois de
`combate-polimento-mesa.md`. Código: `src/styles/breakpoints.ts`,
`src/components/templates/MatchStageTemplate(.styles).ts(x)`,
`src/features/match/combat/useMatchLayout.ts` e `useStageOverlays.ts`.

## Tamanhos

A mesa não se separa pela largura, e sim pela **orientação**: em pé, todo aparelho até 1279 px usa
o layout **empilhado** do celular (mapa em cima, painel embaixo, navegação deitada no rodapé), para
mestre e jogador. Colunas laterais (navegação em pé à esquerda, painel e fila em coluna) só existem
**deitado** e em telas de **1280 px ou mais** (decisão do dono, 2026-11-27: o tablet dele, um Galaxy
Tab S9, mede 753 px CSS em pé).

| Nome | Regra (`breakpoints.ts`) |
|---|---|
| Empilhado | não `SIDE_LAYOUT_QUERY`: em pé e < 1280 |
| Celular em pé | empilhado, < 600 (`TABLET_PORTRAIT_MIN_WIDTH`) |
| Tablet em pé | empilhado, ≥ 600 (`TABLET_PORTRAIT_QUERY`, `media.tabletPortrait`) |
| Colunas laterais | `SIDE_LAYOUT_QUERY` = `(orientation: landscape), (min-width: 1280px)` (`media.side`) |
| Celular deitado | `(orientation: landscape) and (max-height: 540px)` — também é `side`; vale sobre os outros |
| Computador | `side`, 1280–1599 (`asideUp`) |
| Widescreen | `side`, ≥ 1600 (`wideUp`) |

O CSS é mobile-first: a base é o celular em pé; `media.tabletPortrait` e `media.side` sobrescrevem,
e as regras do celular deitado vêm por último. No jsdom todo `matchMedia` responde falso, e isso é o
celular em pé. Breakpoints com nome (`tabletUp` 768, `railUp` 1024, `asideUp` 1280, `wideUp` 1600),
nunca número solto; `tabletUp` e `media.phone` continuam dimensionando peças do header (pílula,
barra, controles do mestre), não o layout. O celular deitado é reconhecido pela **altura**
(`LANDSCAPE_PHONE_QUERY`), não pela largura: os Androids comuns deitados medem 640–740 px, e o
iPhone, mais. Por isso "vale sobre os outros": uma janela de computador baixa (540 px de altura ou
menos, ex.: DevTools acoplado embaixo) também ganha o layout de celular deitado. Uma janela deitada
mais alta que isso, mesmo estreita (ex.: 900 × 700), usa as regras de `side`.

## Larguras (px)

As colunas têm as medidas do computador em todo tamanho com colunas laterais: não encolhem no
tablet deitado nem no celular deitado. Os números moram em `MatchStageTemplate.styles.ts`
(`MASTER_COLUMN_WIDTH` 320, `PLAYER_COLUMN_WIDTH` 340, `ASIDE_WIDTH` 280, `ASIDE_NARROW_WIDTH` 200,
`SHEET_COLUMN_WIDTH` 340); a página passa a largura da coluna da esquerda ao template pela prop
`columnWidth`.

| Zona | Celular em pé | Tablet em pé | Celular deitado | Deitado < 1280 (tablet, janela) | Computador | Widescreen |
|---|---|---|---|---|---|---|
| Navegação | rodapé 56 | rodapé 56 | coluna 72 | coluna 72 | coluna 72 | coluna 72 |
| Painel do mestre | metade da altura, fixo | idem | coluna 320 | coluna 320, metade de cima | coluna 320, metade de cima | coluna 320 |
| Fila do mestre | aba do painel | aba do painel | metade de baixo (320) se dividir; senão aba | metade de baixo (320) | metade de baixo (320) | coluna 240, à esquerda do painel |
| Painel do jogador | embaixo | embaixo | coluna 340 | coluna 340 | coluna 340 | coluna 340 |
| Ficha do mestre | folha | folha | no lugar da coluna, 340 | no lugar da coluna, 340 | caixa `clamp(340px, 100% − 300px, 420px)` | idem |
| Ficha do jogador | folha | folha | no painel (340) | no painel (340) | no painel, 420 | caixa `clamp(…)` |
| Histórico | gaveta `min(86%, 280px)` | coluna 200 na faixa do mapa | coluna 200 | coluna 280 | coluna 280 | coluna 280 |

**Dividir no celular deitado (mestre):** só com altura ≥ 364 px (`LANDSCAPE_SPLIT_MIN_HEIGHT` =
44 do header + 2 × 160). Abaixo disso a coluna mostra uma seção por vez, com os 5 itens na navegação.

**Empilhado, mestre:** mapa e painel com a mesma altura (`panelHalf`); o painel nunca fecha, não
tem X e rola por dentro.

## Quem decide o quê

- **`MatchStageTemplate` (+ `.styles.ts`)** decide ONDE cada zona fica, só com CSS (grid por
  media query). Rodapé e coluna são o mesmo `rail`: quem o deita é o CSS, não um ramo de JS.
  `RAIL_BAR_HEIGHT` (56) vem de `MatchStageTemplate.styles.ts`.
- **`useMatchLayout`** decide O QUE vai em cada zona: `stacked` (empilhado: `!side`), `landscape`
  (celular deitado), `landscapeSplit`, `wide`, `asideIsDrawer` (`stacked && !tabletPortrait`),
  `sheetReplacesColumn` (a ficha do mestre toma o lugar da coluna: `side && (landscape || !asideUp)`).
  `queueIsSplit(layout)` diz se a fila do mestre é fixa (`!stacked && (!landscape || landscapeSplit)`).
- **Páginas** (`GameMasterPage`, `GamePlayerPage`) escolhem os itens da navegação, o conteúdo do
  painel e a seção ativa a partir do layout.
- **`useStageOverlays({ panelFixed })`** guarda `panelOpen`/`asideOpen`. "Abrir um fecha o outro"
  vale só onde o Histórico é gaveta (`asideIsDrawer`, celular em pé); no tablet em pé e com colunas
  laterais o Histórico convive com tudo. Com `panelFixed` (mestre) o painel está sempre aberto.
  Inicial: painel aberto onde é coluna (`!stacked`); Histórico aberto só a partir de `asideUp` e
  nunca no celular deitado. O hook também guarda `sheetOpen`/`setSheetOpen` com a mesma regra: onde
  há gaveta, abrir a ficha fecha a gaveta e abrir a gaveta fecha a ficha (fechar nunca mexe na
  outra); fora dali não se acoplam. As duas páginas usam o hook em vez de estado próprio.

## Pilha de camadas (z-index)

Barra geral e botão de enquadrar do mapa 30 · pílula do relógio 40 · avisos do palco 50 · painel
do relógio 52 · véu da ficha 53 · ficha (folha ou caixa) 54 · navegação e véus do painel/gaveta 55 ·
gaveta do Histórico 60. A folha desce por TRÁS da navegação (o rodapé fica por cima; o conteúdo da
folha tem `padding-bottom` de 56). Detalhe do comentário em `MatchStageTemplate.styles.ts`.

## Ficha

- **Folha (empilhado: celular e tablet em pé, mestre e jogador):** 8 px das laterais, topo a 20% da altura abaixo do
  header, cantos de 22 px em cima. X vermelho de 36 px (`CloseButton` + `iconButtonFx(1.15)`),
  `top: -10px; right: -5px`.
- **No lugar da coluna (mestre, deitado abaixo de 1280 px e no celular deitado):** aberta, a ficha ocupa
  a coluna da esquerda e o painel e a fila somem enquanto ela está aberta. 340 px, a altura toda,
  encaixada: sem sombra, sem canto arredondado, `border-right`. Sem X. O mapa ao lado é o mesmo
  palco de sempre (o Histórico de 280 continua à direita, nada sobreposto). A regra é do CSS
  (`sheet` + `sheetOpen` presentes), não do papel: o jogador só passa a ficha ao template no
  empilhado e no widescreen, então na prática só o mestre cai nela.
- **Caixa (a partir de 1280 px, fora do celular deitado):** altura do palco, colada à esquerda do
  mapa, **por cima do mapa sem deslocá-lo**, sem cantos arredondados, `border-right` e sombra à
  direita. Sem X.
- **Fechar:** tocar de novo em "Ficha", tocar no mapa (fecha e NÃO seleciona nada; é o
  `SheetScrim`, transparente) ou, na folha, o X.
- **De quem é:** jogador = sempre o próprio personagem. Mestre = o último personagem tocado no mapa,
  escolhido no "Agir por" ou aberto pelo card de Personagens.
- **Espera (mestre sem personagem):** tocar em "Ficha" não abre nada; o item fica marcado e a dica
  `${verb} numa peça para ver a ficha.` substitui as dicas do mapa (`MapHint`). A peça tocada abre a
  ficha (e só isso). Tocar no mapa fora de uma peça, numa parede ou de novo em "Ficha" desiste.
- No empilhado, escolher outra seção da navegação fecha a folha (ela cobriria o painel); onde a
  ficha toma o lugar da coluna (`sheetReplacesColumn`), escolher uma seção também fecha a ficha
  e mostra a seção. Abrir a gaveta do Histórico (celular em pé) fecha a folha e, no mestre, também desiste da espera. Entrar na escolha da casa (queda
  ou fuga) também desiste da espera. Se o último personagem tocado saiu da partida, "Ficha" age como
  sem nenhum (espera uma peça).
- Onde a ficha é folha ou caixa, "Ficha" abre/fecha a ficha e não troca o painel (no empilhado,
  abrir a folha fecha o painel de Ação do jogador).

## Navegação do mestre

Sem fila fixa: `Fila · Ficha · Agir · Personagens · Partida` (inicial: Fila). Com fila fixa:
`Agir · Ficha · Partida` (inicial: Agir). Tocar no item ativo não fecha nada.

## Histórico em coluna

Com colunas laterais, coluna de 280 px, aberta junto com tudo; no celular deitado (mestre e
jogador), onde 280 não cabe, 200. No celular em pé é a gaveta com véu, `min(86%, 280px)`. Abre/fecha
pelo botão "Histórico" do header.

**Tablet em pé (empilhado, ≥ 600 px):** coluna encaixada de 200 px à direita, **só na faixa do
mapa**: o painel de baixo e a navegação passam por baixo dela, na largura toda. Sem sombra, sem
véu; fica aberta até tocar de novo no botão e não fecha a ficha nem é fechada por ela. A folha da
ficha, que abre por cima, passa na frente da coluna (a coluna sai da pilha da gaveta: `z-index:
auto`).

**Coluna encaixada × por cima:** a coluna encaixada (o Histórico em coluna, a ficha no lugar da
coluna) não tem sombra. Sombra é só de quem abre por cima: a gaveta do celular em pé, a folha e a
caixa da ficha a partir de 1280 px. A coluna do Histórico também não tem véu, então tocar fora não a
fecha; a ficha mantém a regra dela (tocar no mapa fecha, em qualquer tamanho).

## Header e controles do mestre

A partir de 768, e sempre no celular deitado (mesmo abaixo de 768 px, como 667×375): conexão,
depois "Round" + seletor Livre/Disputado. No celular deitado o Round nunca vai para o topo da Fila. Abrir próxima/Encerrar rodada e
Fechar turno ficam no topo da Fila (no celular em pé, o título "Round" + seletor vêm antes). "Nova
cena" e "Encerrar partida" ficam na aba Partida. Código: `HeaderRound`, `TurnControls`,
`QueueHeader`, `MatchTabPanel`.

## O mapa não se mexe

Abrir ou fechar uma coluna lateral (o Histórico à direita, a ficha ou a coluna à esquerda) não mexe
no mapa: cada ponto do tabuleiro fica no mesmo lugar da tela (pedido do dono, 2026-11-27). Quando o
canvas muda **só de largura** (ou só de posição), o `ViewportInner` não reenquadra; mede a caixa do
canvas na tela e soma a `vp.x`/`vp.y` o quanto a borda andou (`resizeShift`, em
`src/features/tactical-map/stage/resizeAnchor.ts`). Quando a **altura** muda (o painel de baixo do
celular, girar o aparelho), continua como antes: reenquadra, se ninguém arrastou nem deu zoom desde o
último enquadramento. O botão Enquadrar e a abertura da mesa enquadram sempre. Vale onde há
enquadramento automático (`fitRequest`: mesa, editor e posicionador de mapa). A camada Pixi não tem
teste; só a função `resizeShift` tem.

## Fica para a F2

Rodapé novo com o recorte do botão "Enviar ação" e o painel de ação novo. Nada disso existe na F1.
