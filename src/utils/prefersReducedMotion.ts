/** `true` quando o usuário pediu menos movimento; componentes que montam/desmontam animando consultam isto. */
export const prefersReducedMotion = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
