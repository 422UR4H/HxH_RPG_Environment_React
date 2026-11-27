import { useCallback, useState } from "react";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { breakpoints } from "../../../styles/breakpoints";
import { useMatchLayout } from "./useMatchLayout";

type Setter = (next: boolean | ((open: boolean) => boolean)) => void;

/**
 * Estado de abertura do painel e da coluna/gaveta do Histórico (aside) da mesa. "Abrir um
 * fecha o outro" vale só no celular em pé (`asideIsDrawer`), onde a gaveta cobre o mapa; de
 * 768 px em diante a coluna do Histórico convive com o painel e com tudo. Com `panelFixed`
 * (painel do mestre) o painel está sempre aberto: `setPanelOpen` não muda nada e abrir a
 * gaveta não o fecha. Estado inicial: o painel abre a partir de `railUp` ou no celular
 * deitado; o Histórico, a partir de `asideUp` e nunca no celular deitado.
 */
export function useStageOverlays(options: { panelFixed?: boolean } = {}): {
  panelOpen: boolean;
  setPanelOpen: Setter;
  asideOpen: boolean;
  setAsideOpen: Setter;
  /** Só no celular em pé a gaveta cobre o mapa: escolher algo nela que abre outra coisa a fecha. */
  closeAsideIfDrawer: () => void;
} {
  const panelFixed = options.panelFixed ?? false;
  const { landscape, asideIsDrawer } = useMatchLayout();
  const railUp = useMediaQuery(`(min-width: ${breakpoints.railUp}px)`);
  const asideUp = useMediaQuery(`(min-width: ${breakpoints.asideUp}px)`);

  // Um estado só, para o "abre um, fecha o outro" ser atômico e o updater ler o valor atual.
  const [open, setOpen] = useState(() => ({
    panel: railUp || landscape,
    aside: asideUp && !landscape,
  }));

  const setPanelOpen = useCallback<Setter>(
    (next) => {
      if (panelFixed) return;
      setOpen((s) => {
        const panel = typeof next === "function" ? next(s.panel) : next;
        return { panel, aside: panel && asideIsDrawer ? false : s.aside };
      });
    },
    [panelFixed, asideIsDrawer],
  );

  const setAsideOpen = useCallback<Setter>(
    (next) =>
      setOpen((s) => {
        const aside = typeof next === "function" ? next(s.aside) : next;
        return { aside, panel: aside && asideIsDrawer && !panelFixed ? false : s.panel };
      }),
    [asideIsDrawer, panelFixed],
  );

  const closeAsideIfDrawer = useCallback(() => {
    if (asideIsDrawer) setOpen((s) => ({ ...s, aside: false }));
  }, [asideIsDrawer]);

  return {
    panelOpen: panelFixed || open.panel,
    setPanelOpen,
    asideOpen: open.aside,
    setAsideOpen,
    closeAsideIfDrawer,
  };
}

/** Jogador: a aba Ação com personagem é o compositor; escolher a casa de fuga também pede o mapa. */
export function playerPanelDismissible(input: {
  railActive: "acao" | "ficha";
  hasActor: boolean;
  picking: boolean;
}): boolean {
  return (input.railActive === "ficha" || !input.hasActor) && !input.picking;
}
