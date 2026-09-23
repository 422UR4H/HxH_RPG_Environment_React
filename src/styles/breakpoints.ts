/**
 * Os quatro breakpoints da partida. Nome, não número: quatro formatos × duas telas com
 * número mágico é como a UI diverge sem ninguém perceber.
 *
 * O tablet gira: em pé cai em `tabletUp`, deitado em `railUp`.
 */
export const breakpoints = { tabletUp: 768, railUp: 1024, asideUp: 1280 } as const;

export const media = {
  phone: `@media (max-width: ${breakpoints.tabletUp - 1}px)`,
  tabletUp: `@media (min-width: ${breakpoints.tabletUp}px)`,
  railUp: `@media (min-width: ${breakpoints.railUp}px)`,
  asideUp: `@media (min-width: ${breakpoints.asideUp}px)`,
} as const;
