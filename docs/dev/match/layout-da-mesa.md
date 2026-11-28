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
| Colunas abaixo de 1280 | `SIDE_BELOW_ASIDE_UP_QUERY` (`media.sideBelowAsideUp`): onde, com o celular deitado, a ficha do mestre toma o lugar da coluna |
| Celular deitado | `(orientation: landscape) and (max-height: 540px)` — também é `side`; vale sobre os outros |
| Duas colunas (mestre) | `LANDSCAPE_TWO_COLUMN_QUERY` (`media.landscapeTwoColumns`): celular deitado sem altura para dividir (< 400) e com ≥ 1152 de largura |
| Empilhado largo (mestre) | `STACKED_WIDE_QUERY` (`media.stackedWide`): em pé, 900–1279.98 |
| Computador | `side`, 1280–1599 (`asideUp`) |
| Widescreen | `side`, ≥ 1600 (`wideUp`) |

O CSS é mobile-first: a base é o celular em pé; `media.tabletPortrait` e `media.side` sobrescrevem,
e as regras do celular deitado vêm por último. No jsdom todo `matchMedia` responde falso, e isso é o
celular em pé. Todo teto de faixa que termina antes de 1280 é `1279.98px` (derivado de
`breakpoints.asideUp`), não `1279px`: com largura fracionária (zoom da página), 1279.5 px não casaria
com nenhuma das duas regras e o CSS discordaria do hook. O teste "the template's CSS queries agree
with the hook" (`useMatchLayout.test.ts`) passa uma lista de telas pelas queries exportadas e pelo
hook e exige que concordem. Breakpoints com nome (`tabletUp` 768, `railUp` 1024, `asideUp` 1280, `wideUp` 1600),
nunca número solto; `tabletUp` e `media.phone` continuam dimensionando peças do header (pílula,
barra, controles do mestre), não o layout. O celular deitado é reconhecido pela **altura**
(`LANDSCAPE_PHONE_QUERY`), não pela largura: os Androids comuns deitados medem 640–740 px, e o
iPhone, mais. Por isso "vale sobre os outros": uma janela de computador baixa (540 px de altura ou
menos, ex.: DevTools acoplado embaixo) também ganha o layout de celular deitado. Uma janela deitada
mais alta que isso, mesmo estreita (ex.: 900 × 700), usa as regras de `side`.

## Larguras (px)

As colunas têm as medidas do computador em todo tamanho com colunas laterais: não encolhem no
tablet deitado nem no celular deitado. Os números moram em `breakpoints.ts` (`MASTER_COLUMN_WIDTH`
320, `ASIDE_WIDTH` 280, `ASIDE_NARROW_WIDTH` 200, `RAIL_WIDTH` 72, `QUEUE_COLUMN_WIDTH` 240,
`MAP_MIN_WIDTH` 320) e em `MatchStageTemplate.styles.ts` (`PLAYER_COLUMN_WIDTH` 340,
`SHEET_COLUMN_WIDTH` 340); a página passa a largura da coluna da esquerda ao template pela prop
`columnWidth` e ao `useMatchLayout({ columnWidth, queue })`.

**A largura do Histórico sai do espaço do mapa** (dono, 2026-11-28): 280, a menos que, descontados a
navegação (72), as colunas à esquerda e os 280, sobrem menos de `MAP_MIN_WIDTH` (320) de mapa; aí
200. A query é `asideNarrowQuery(colunasÀEsquerda)` (só deitado): mestre abaixo de 992, jogador
abaixo de 1012, mestre em duas colunas abaixo de 1232. Exemplos: o celular do dono deitado (907)
fica com 200; 1024×768, o Tab S9 em pé, o monitor em pé e o computador ficam com 280.

| Zona | Celular em pé | Tablet em pé | Celular deitado | Deitado < 1280 (tablet, janela) | Computador | Widescreen |
|---|---|---|---|---|---|---|
| Navegação | rodapé 56 | rodapé 56 | coluna 72 | coluna 72 | coluna 72 | coluna 72 |
| Painel do mestre | metade da altura, fixo | idem | coluna 320 | coluna 320, metade de cima | coluna 320, metade de cima | coluna 320 |
| Fila do mestre | aba do painel | aba do painel; a partir de 900, coluna 320 à esquerda do painel de baixo | metade de baixo (320) se dividir; senão coluna 240 em duas colunas se couber; senão aba | metade de baixo (320) | metade de baixo (320) | coluna 240, à esquerda do painel |
| Painel do jogador | embaixo | embaixo | coluna 340 | coluna 340 | coluna 340 | coluna 340 |
| Ficha do mestre | folha | folha | no lugar da coluna, 340 | no lugar da coluna, 340 | caixa `clamp(340px, 100% − 300px, 420px)` | idem |
| Ficha do jogador | folha | folha | no painel (340) | no painel (340) | no painel, 420 | caixa `clamp(…)` |
| Histórico | gaveta `min(86%, 280px)` | coluna 280 na faixa do mapa | 280 ou 200 (pelo mapa) | 280 ou 200 (pelo mapa) | coluna 280 | coluna 280 |

**Dividir no celular deitado (mestre):** só com altura ≥ 400 px (`LANDSCAPE_SPLIT_MIN_HEIGHT`). O
celular do dono tem 427 de altura em tela cheia e no web app (manifest `display: "fullscreen"`) e
303 no navegador: em tela cheia divide, com 27 px de margem. Sem altura, se a largura dá para a fila
e o painel lado a lado (≥ 1152), são **duas colunas** como no widescreen (fila 240, painel em coluna
`auto`: a ficha de 340 alarga a própria coluna em vez de cobrir o mapa, e a fila continua à mostra
com ela aberta). Sem nenhum dos dois, uma seção por vez, com os 5 itens na navegação.

**Empilhado largo (mestre, em pé de 900 a 1279 px, como um monitor em pé):** a fila mora à esquerda
do painel de baixo (coluna 320), sem cobrir o mapa; Fila e Personagens saem da navegação, como com
a fila fixa.

**Empilhado, mestre:** mapa e painel com a mesma altura (`panelHalf`); o painel nunca fecha, não
tem X e rola por dentro.

## Quem decide o quê

- **`MatchStageTemplate` (+ `.styles.ts`)** decide ONDE cada zona fica, só com CSS (grid por
  media query). Rodapé e coluna são o mesmo `rail`: quem o deita é o CSS, não um ramo de JS.
  `RAIL_BAR_HEIGHT` (56) vem de `MatchStageTemplate.styles.ts`.
- **`useMatchLayout({ columnWidth, queue })`** decide O QUE vai em cada zona: `stacked` (empilhado:
  `!side`), `landscape` (celular deitado), `landscapeSplit`, `twoColumns`, `stackedWide`, `wide`,
  `asideNarrow` (o Histórico de 200), `asideIsDrawer` (`stacked && !tabletPortrait`),
  `sheetReplacesColumn` (a ficha do mestre toma o lugar da coluna: `side && (landscape || !asideUp)`).
  `queueIsSplit(layout)` diz se a fila do mestre é fixa
  (`(!stacked && (!landscape || landscapeSplit || twoColumns)) || stackedWide`).
- **Páginas** (`GameMasterPage`, `GamePlayerPage`) escolhem os itens da navegação, o conteúdo do
  painel e a seção ativa a partir do layout.
- **`useStageOverlays({ columnWidth, queue, panelFixed })`** guarda `panelOpen` e o modo do
  Histórico (`asideMode`, ver "Histórico em coluna"; `asideOpen` = modo ≠ `closed`). "Abrir um fecha o outro"
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

- **Folha (empilhado: celular e tablet em pé, mestre e jogador):** 16 px das laterais (dono,
  2026-11-28: com 8, a barra de rolagem dela encostava na do Histórico), o trilho da barra começa
  22 px abaixo do topo (`scrollbarTrackInset`, para não entrar no canto arredondado), topo a 20% da altura abaixo do
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

Com colunas laterais, coluna de 280 px, ou 200 onde o mapa ficaria com menos de 320 (ver
"Larguras"). No celular em pé é a gaveta com véu, `min(86%, 280px)`. Abre/fecha pelo botão
"Histórico" do header.

**Onde é 200: alternância 200 / 280 / escondido** (dono, 2026-11-28). `AsideMode` =
`closed | docked | expanded | expandedOverDocked` (`MatchStageTemplate.types.ts`):
- botão "Histórico" com ele fechado → `expanded`: 280 **por cima** do mapa, com sombra, sem coluna
  embaixo (a célula da grade fica com 0, o mapa não muda de tamanho); tocar fora → fecha;
- botão de largura (‹ "Ampliar o Histórico" / › "Reduzir o Histórico", pendurado inteiro sobre a borda
  do mapa, na altura das abas, sem cobrir nenhuma) em `docked` → `expandedOverDocked`: a célula
  continua com 200 e a superfície de 280 vaza 80 px sobre o mapa; tocar fora → volta a 200;
- "Reduzir" em qualquer modo ampliado → `docked` (fixa em 200); "Histórico" com ele à mostra → fecha;
- o toque fora cai num véu transparente (`aside-expand-scrim`) que mata o `pointerdown`: não
  seleciona peça nem começa pan; ele cobre também a navegação (o primeiro toque só reduz);
- saindo da tela estreita (girou, redimensionou), os modos ampliados valem `docked` na leitura.
O CSS dos modos ampliados usa `&&`: o styled-components escreve as declarações soltas antes dos
blocos `@media`, e sem a especificidade dobrada a largura 0 e o z-index perdiam para a regra da
coluna. Na aba Personagens a 200 o seletor diz "Escolha um NPC" (`AddNpcPicker compact`), o
título "PERSONAGENS" encolhe por container query (`min(32px, 12.13cqi)`, 32 a 280) e o selo "Fora do
mapa" sobe para a linha do "NPC" (`@container (max-width: 239px)` no card).

**Tablet em pé (empilhado, ≥ 600 px):** coluna encaixada de 280 px à direita (era 200; com a regra do
mapa sobra 473 no Tab S9), **só na faixa do
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
canvas muda **só de largura** (ou só de posição) **com a janela do mesmo tamanho**, o `ViewportInner`
não reenquadra; mede a caixa do canvas na tela e soma a `vp.x`/`vp.y` o quanto a borda andou
(`resizeShift`, em `src/features/tactical-map/stage/resizeAnchor.ts`; a caixa guarda também
`window.innerWidth`). Continua como antes, reenquadrando se ninguém arrastou nem deu zoom desde o
último enquadramento, quando muda a **altura** do canvas (o painel de baixo do celular, girar o
aparelho) ou a **largura da janela** (encolher a janela, encaixá-la em meia tela, DevTools acoplado
ao lado): aí não foi uma coluna, e o mapa parado podia ficar fora da tela. O botão Enquadrar e a abertura da mesa enquadram sempre. Vale onde há
enquadramento automático (`fitRequest`: mesa, editor e posicionador de mapa). A camada Pixi não tem
teste; só a função `resizeShift` tem.

## Fica para a F2

Rodapé novo com o recorte do botão "Enviar ação" e o painel de ação novo. Nada disso existe na F1.
