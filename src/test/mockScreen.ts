import { act } from "@testing-library/react";

/** Uma tela simulada: a orientação sai das medidas (deitado = mais larga que alta), como no browser. */
export type TestScreen = { width: number; height: number };

const FEATURE = /^\(\s*([a-z-]+)\s*:\s*([^)]+?)\s*\)$/;

/** Uma condição `(feature: valor)`. Feature desconhecida (pointer, reduced-motion…) não casa. */
function matchesFeature(condition: string, s: TestScreen): boolean {
  const m = FEATURE.exec(condition.trim());
  if (!m) return false;
  const [, feature, value] = m;
  const px = Number.parseFloat(value);
  switch (feature) {
    case "orientation":
      return value === (s.width > s.height ? "landscape" : "portrait");
    case "min-width":
      return s.width >= px;
    case "max-width":
      return s.width <= px;
    case "min-height":
      return s.height >= px;
    case "max-height":
      return s.height <= px;
    default:
      return false;
  }
}

/**
 * Avalia uma media query contra a tela simulada: lista separada por vírgula (OU) de condições
 * ligadas por `and` (E). Basta para as queries da mesa (`breakpoints.ts`).
 */
export function matchesMediaQuery(query: string, s: TestScreen): boolean {
  return query.split(",").some((part) => part.split(/\s+and\s+/).every((c) => matchesFeature(c, s)));
}

/**
 * Troca o `matchMedia` do jsdom por um que responde pela tela simulada. `resize` troca a tela e
 * dispara os ouvintes `change` que o `useMediaQuery` registrou, sem remontar (o estado sobrevive).
 * Quem chama restaura `window.matchMedia` no `afterEach`.
 */
export function mockScreen(initial: TestScreen) {
  let current = initial;
  const listeners = new Map<string, Set<(e: { matches: boolean }) => void>>();
  window.matchMedia = ((query: string) => ({
    get matches() {
      return matchesMediaQuery(query, current);
    },
    media: query,
    addEventListener: (_: string, l: (e: { matches: boolean }) => void) => {
      if (!listeners.has(query)) listeners.set(query, new Set());
      listeners.get(query)!.add(l);
    },
    removeEventListener: (_: string, l: (e: { matches: boolean }) => void) => {
      listeners.get(query)?.delete(l);
    },
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return {
    resize(next: TestScreen) {
      current = next;
      act(() => {
        listeners.forEach((set, query) => set.forEach((l) => l({ matches: matchesMediaQuery(query, next) })));
      });
    },
  };
}
