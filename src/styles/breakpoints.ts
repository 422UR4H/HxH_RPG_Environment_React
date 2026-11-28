/**
 * Os breakpoints da partida. Nome, não número: formatos × telas com número mágico
 * é como a UI diverge sem ninguém perceber.
 *
 * O layout da mesa não se separa por largura e sim por orientação: em pé, até 1279 px, é
 * empilhado como o celular (`SIDE_LAYOUT_QUERY` não casa); deitado ou a partir de 1280 px, tem
 * colunas laterais. `tabletUp` continua dimensionando peças do header (pílula, barra, controles).
 * O celular deitado passa de 768 px de largura, então é reconhecido pela altura
 * (`LANDSCAPE_PHONE_QUERY`), não pela largura.
 */
export const breakpoints = { tabletUp: 768, railUp: 1024, asideUp: 1280, wideUp: 1600 } as const;

/**
 * Teto de uma faixa que termina antes de `asideUp`. É 1279.98, não 1279: com largura fracionária
 * (zoom da página, DPR), 1279.5 px não casaria nem com `max-width: 1279px` nem com
 * `min-width: 1280px`, e o CSS discordaria do hook (que lê `!(min-width: 1280px)`).
 */
const BELOW_ASIDE_UP_MAX = `${breakpoints.asideUp - 0.02}px`;

/**
 * Colunas laterais na mesa (rail em pé, painel/fila em coluna): deitado ou a partir de `asideUp`.
 * Inclui o celular deitado, cujas regras são declaradas por último. Fora disto, empilhado.
 */
export const SIDE_LAYOUT_QUERY = `(orientation: landscape), (min-width: ${breakpoints.asideUp}px)`;

/** A partir daqui, em pé, o empilhado é um tablet: o Histórico vira coluna ao lado do mapa. */
export const TABLET_PORTRAIT_MIN_WIDTH = 600;

/** Tablet em pé: empilhado (em pé, abaixo de `asideUp`) e com pelo menos 600 px. */
export const TABLET_PORTRAIT_QUERY = `(orientation: portrait) and (min-width: ${TABLET_PORTRAIT_MIN_WIDTH}px) and (max-width: ${BELOW_ASIDE_UP_MAX})`;

/**
 * Colunas laterais abaixo de `asideUp` (deitado, até 1279 px): a ficha do mestre toma o lugar da
 * coluna da esquerda. Junto com `LANDSCAPE_PHONE_QUERY` é o CSS de `sheetReplacesColumn`.
 */
export const SIDE_BELOW_ASIDE_UP_QUERY = `(orientation: landscape) and (max-width: ${BELOW_ASIDE_UP_MAX})`;

/** Celular deitado: a altura baixa é o que o separa de um tablet ou computador. */
export const LANDSCAPE_PHONE_QUERY = "(orientation: landscape) and (max-height: 540px)";

/**
 * Altura mínima para o mestre dividir a coluna em duas metades. O celular do dono em tela
 * cheia (web app) tem 427 px; no navegador, 303: 400 dá 27 px de margem.
 */
export const LANDSCAPE_SPLIT_MIN_HEIGHT = 400;

/*
 * Larguras (px) que entram nas regras por espaço. Moram aqui, e não no template, porque as
 * queries precisam delas; o template as reexporta.
 */
/** Coluna da esquerda do mestre: painel e fila. */
export const MASTER_COLUMN_WIDTH = 320;
/** O Histórico em coluna. */
export const ASIDE_WIDTH = 280;
/** O Histórico quando, com ele em 280, o mapa ficaria com menos de `MAP_MIN_WIDTH`. */
export const ASIDE_NARROW_WIDTH = 200;
/** O mapa nunca fica com menos que isto por causa do Histórico: abaixo, ele encolhe para 200. */
export const MAP_MIN_WIDTH = 320;
/** A coluna da navegação em pé. */
export const RAIL_WIDTH = 72;
/** A fila do mestre em coluna própria. */
export const QUEUE_COLUMN_WIDTH = 240;
/** Em pé, a partir daqui (até `asideUp`) a fila do mestre ganha a zona à esquerda do painel. */
export const STACKED_WIDE_MIN_WIDTH = 900;

/**
 * O Histórico encolhe para 200 quando, deitado, descontados a navegação, as colunas à esquerda
 * (`leftWidth`, a soma das que ficam antes do mapa) e os 280 dele, sobram menos de
 * `MAP_MIN_WIDTH` px de mapa. O teto é fracionário (`- 0.02`) como os demais.
 */
export const asideNarrowQuery = (leftWidth: number) =>
  `(orientation: landscape) and (max-width: ${leftWidth + RAIL_WIDTH + ASIDE_WIDTH + MAP_MIN_WIDTH - 0.02}px)`;

/**
 * Celular deitado baixo e largo o bastante para fila e painel lado a lado (como no widescreen):
 * navegação + fila + painel + Histórico estreito + mapa mínimo = 1152.
 */
export const LANDSCAPE_TWO_COLUMN_QUERY = `${LANDSCAPE_PHONE_QUERY} and (max-height: ${LANDSCAPE_SPLIT_MIN_HEIGHT - 0.02}px) and (min-width: ${
  RAIL_WIDTH + QUEUE_COLUMN_WIDTH + MASTER_COLUMN_WIDTH + ASIDE_NARROW_WIDTH + MAP_MIN_WIDTH
}px)`;

/** Em pé, de 900 a 1279.98 px: o mestre ganha a fila à esquerda do painel de baixo. */
export const STACKED_WIDE_QUERY = `(orientation: portrait) and (min-width: ${STACKED_WIDE_MIN_WIDTH}px) and (max-width: ${BELOW_ASIDE_UP_MAX})`;

export const media = {
  phone: `@media (max-width: ${breakpoints.tabletUp - 1}px)`,
  tabletUp: `@media (min-width: ${breakpoints.tabletUp}px)`,
  railUp: `@media (min-width: ${breakpoints.railUp}px)`,
  asideUp: `@media (min-width: ${breakpoints.asideUp}px)`,
  wideUp: `@media (min-width: ${breakpoints.wideUp}px)`,
  landscapePhone: `@media ${LANDSCAPE_PHONE_QUERY}`,
  side: `@media ${SIDE_LAYOUT_QUERY}`,
  tabletPortrait: `@media ${TABLET_PORTRAIT_QUERY}`,
  sideBelowAsideUp: `@media ${SIDE_BELOW_ASIDE_UP_QUERY}`,
  asideNarrow: (leftWidth: number) => `@media ${asideNarrowQuery(leftWidth)}`,
  landscapeTwoColumns: `@media ${LANDSCAPE_TWO_COLUMN_QUERY}`,
  stackedWide: `@media ${STACKED_WIDE_QUERY}`,
  landscapeSplit: `@media ${LANDSCAPE_PHONE_QUERY} and (min-height: ${LANDSCAPE_SPLIT_MIN_HEIGHT}px)`,
} as const;
