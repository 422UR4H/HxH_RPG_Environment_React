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
 * Colunas laterais na mesa (rail em pé, painel/fila em coluna): deitado ou a partir de `asideUp`.
 * Inclui o celular deitado, cujas regras são declaradas por último. Fora disto, empilhado.
 */
export const SIDE_LAYOUT_QUERY = `(orientation: landscape), (min-width: ${breakpoints.asideUp}px)`;

/** A partir daqui, em pé, o empilhado é um tablet: o Histórico vira coluna ao lado do mapa. */
export const TABLET_PORTRAIT_MIN_WIDTH = 600;

/** Tablet em pé: empilhado (em pé, abaixo de `asideUp`) e com pelo menos 600 px. */
export const TABLET_PORTRAIT_QUERY = `(orientation: portrait) and (min-width: ${TABLET_PORTRAIT_MIN_WIDTH}px) and (max-width: ${breakpoints.asideUp - 1}px)`;

/** Celular deitado: a altura baixa é o que o separa de um tablet ou computador. */
export const LANDSCAPE_PHONE_QUERY = "(orientation: landscape) and (max-height: 540px)";

/** Altura mínima para o mestre dividir a coluna em duas metades: 44 do header + 2 × 160. */
export const LANDSCAPE_SPLIT_MIN_HEIGHT = 364;

export const media = {
  phone: `@media (max-width: ${breakpoints.tabletUp - 1}px)`,
  tabletUp: `@media (min-width: ${breakpoints.tabletUp}px)`,
  railUp: `@media (min-width: ${breakpoints.railUp}px)`,
  asideUp: `@media (min-width: ${breakpoints.asideUp}px)`,
  wideUp: `@media (min-width: ${breakpoints.wideUp}px)`,
  landscapePhone: `@media ${LANDSCAPE_PHONE_QUERY}`,
  side: `@media ${SIDE_LAYOUT_QUERY}`,
  tabletPortrait: `@media ${TABLET_PORTRAIT_QUERY}`,
  landscapeSplit: `@media ${LANDSCAPE_PHONE_QUERY} and (min-height: ${LANDSCAPE_SPLIT_MIN_HEIGHT}px)`,
} as const;
