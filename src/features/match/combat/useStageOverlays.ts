import { useCallback, useState } from "react";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { breakpoints } from "../../../styles/breakpoints";
import { useMatchLayout, type MatchLayoutOptions } from "./useMatchLayout";

type Setter = (next: boolean | ((open: boolean) => boolean)) => void;

/**
 * Estado de abertura do painel e da coluna/gaveta do Histórico (aside) da mesa. "Abrir um
 * fecha o outro" vale só onde o Histórico é gaveta (`asideIsDrawer`: empilhado abaixo de
 * 600 px), que cobre o mapa; no tablet em pé e com colunas laterais a coluna do Histórico
 * convive com o painel e com tudo. Com `panelFixed` (painel do mestre) o painel está sempre
 * aberto: `setPanelOpen` não muda nada e abrir a gaveta não o fecha. Estado inicial: o painel
 * abre onde é coluna (fora do empilhado); o Histórico, a partir de `asideUp` e nunca no celular
 * deitado. A ficha (`sheetOpen`) segue a mesma regra do painel onde há gaveta: abrir a ficha
 * fecha a gaveta e abrir a gaveta fecha a ficha (fechar nunca mexe no outro); fora dali não se
 * acoplam.
 */
export function useStageOverlays(options: MatchLayoutOptions & { panelFixed?: boolean }): {
  panelOpen: boolean;
  setPanelOpen: Setter;
  asideOpen: boolean;
  setAsideOpen: Setter;
  sheetOpen: boolean;
  setSheetOpen: Setter;
  /** Só onde é gaveta (celular em pé) ela cobre o mapa: escolher algo nela que abre outra coisa a fecha. */
  closeAsideIfDrawer: () => void;
} {
  const panelFixed = options.panelFixed ?? false;
  const { stacked, landscape, asideIsDrawer } = useMatchLayout({
    columnWidth: options.columnWidth,
    queue: options.queue,
  });
  const asideUp = useMediaQuery(`(min-width: ${breakpoints.asideUp}px)`);

  // Um estado só, para o "abre um, fecha o outro" ser atômico e o updater ler o valor atual.
  const [open, setOpen] = useState(() => ({
    panel: !stacked,
    aside: asideUp && !landscape,
    sheet: false,
  }));

  const setPanelOpen = useCallback<Setter>(
    (next) => {
      if (panelFixed) return;
      setOpen((s) => {
        const panel = typeof next === "function" ? next(s.panel) : next;
        return { ...s, panel, aside: panel && asideIsDrawer ? false : s.aside };
      });
    },
    [panelFixed, asideIsDrawer],
  );

  const setAsideOpen = useCallback<Setter>(
    (next) =>
      setOpen((s) => {
        const aside = typeof next === "function" ? next(s.aside) : next;
        return {
          ...s,
          aside,
          panel: aside && asideIsDrawer && !panelFixed ? false : s.panel,
          sheet: aside && asideIsDrawer ? false : s.sheet,
        };
      }),
    [asideIsDrawer, panelFixed],
  );

  const setSheetOpen = useCallback<Setter>(
    (next) =>
      setOpen((s) => {
        const sheet = typeof next === "function" ? next(s.sheet) : next;
        return { ...s, sheet, aside: sheet && asideIsDrawer ? false : s.aside };
      }),
    [asideIsDrawer],
  );

  const closeAsideIfDrawer = useCallback(() => {
    if (asideIsDrawer) setOpen((s) => ({ ...s, aside: false }));
  }, [asideIsDrawer]);

  return {
    panelOpen: panelFixed || open.panel,
    setPanelOpen,
    asideOpen: open.aside,
    setAsideOpen,
    sheetOpen: open.sheet,
    setSheetOpen,
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
