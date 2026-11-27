/**
 * Os cinco breakpoints da partida. Nome, não número: formatos × telas com número mágico
 * é como a UI diverge sem ninguém perceber.
 *
 * O tablet gira: em pé cai em `tabletUp`, deitado em `railUp`. O celular deitado passa de
 * 768 px de largura, então é reconhecido pela altura (`LANDSCAPE_PHONE_QUERY`), não pela largura.
 */
export const breakpoints = { tabletUp: 768, railUp: 1024, asideUp: 1280, wideUp: 1600 } as const;

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
  landscapeSplit: `@media ${LANDSCAPE_PHONE_QUERY} and (min-height: ${LANDSCAPE_SPLIT_MIN_HEIGHT}px)`,
} as const;
