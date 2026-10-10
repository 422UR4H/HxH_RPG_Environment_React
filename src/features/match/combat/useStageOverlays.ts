import { useCallback, useState } from "react";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { breakpoints } from "../../../styles/breakpoints";

type Setter = (next: boolean | ((open: boolean) => boolean)) => void;

/**
 * Estado de abertura do painel e da gaveta (aside) da mesa — o que as duas páginas faziam
 * cada uma com dois `useState`. A regra nova (spec §4–§5): abaixo de `railUp` o painel é uma
 * folha sobre o mapa e abaixo de `asideUp` a gaveta cobre o mapa, então abrir uma fecha a
 * outra (uma por vez). Fechar nunca mexe na outra.
 */
export function useStageOverlays(): {
  panelOpen: boolean;
  setPanelOpen: Setter;
  asideOpen: boolean;
  setAsideOpen: Setter;
  /** Abaixo de asideUp a gaveta cobre o mapa: escolher algo nela que abre outra coisa a fecha. */
  closeAsideIfDrawer: () => void;
} {
  const panelIsSheet = !useMediaQuery(`(min-width: ${breakpoints.railUp}px)`);
  const asideIsDrawer = !useMediaQuery(`(min-width: ${breakpoints.asideUp}px)`);

  // Um estado só, para o "abre um, fecha o outro" ser atômico e o updater ler o valor atual.
  const [open, setOpen] = useState(() => ({
    panel: true,
    aside: !asideIsDrawer,
  }));

  const setPanelOpen = useCallback<Setter>(
    (next) =>
      setOpen((s) => {
        const panel = typeof next === "function" ? next(s.panel) : next;
        return { panel, aside: panel && panelIsSheet ? false : s.aside };
      }),
    [panelIsSheet],
  );

  const setAsideOpen = useCallback<Setter>(
    (next) =>
      setOpen((s) => {
        const aside = typeof next === "function" ? next(s.aside) : next;
        return { aside, panel: aside && panelIsSheet ? false : s.panel };
      }),
    [panelIsSheet],
  );

  const closeAsideIfDrawer = useCallback(() => {
    if (asideIsDrawer) setOpen((s) => ({ ...s, aside: false }));
  }, [asideIsDrawer]);

  return {
    panelOpen: open.panel,
    setPanelOpen,
    asideOpen: open.aside,
    setAsideOpen,
    closeAsideIfDrawer,
  };
}
