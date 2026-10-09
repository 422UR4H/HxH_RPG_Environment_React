import type { ViewportTransform } from "../../tactical-map/utils/screenAnchor";

/**
 * O enquadramento do mapa fora do estado do React. O Pixi o emite a cada quadro de pan/zoom;
 * como `useState` da página, cada quadro re-renderizaria a página inteira. Aqui só quem
 * assina (a camada que ancora coisas nas peças, via `useSyncExternalStore`) re-renderiza.
 */
export type ViewportStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => ViewportTransform | null;
  /** Estável e solto do objeto: vai direto como `onViewportTransform` do mapa. */
  set: (t: ViewportTransform) => void;
};

export function createViewportStore(): ViewportStore {
  let current: ViewportTransform | null = null;
  const listeners = new Set<() => void>();
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getSnapshot: () => current,
    set: (t) => {
      // O mesmo enquadramento não é mudança: o snapshot fica o mesmo objeto e ninguém acorda.
      if (current && current.x === t.x && current.y === t.y && current.scale === t.scale) return;
      current = { x: t.x, y: t.y, scale: t.scale };
      listeners.forEach((l) => l());
    },
  };
}
