import { useCallback, useState } from "react";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { breakpoints } from "../../../styles/breakpoints";
import type { AsideMode } from "../../../components/templates/MatchStageTemplate.types";
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
 *
 * Só onde `asideNarrow` (celular deitado, Histórico de 200) o Histórico tem quatro modos: fechado,
 * encaixado (200), ampliado (280 por cima do mapa, aberto direto do fechado) e ampliado sobre o
 * encaixado (a coluna segue com 200). Ao sair da tela estreita os ampliados são lidos como
 * encaixado, sem efeito, para nunca sobrar um véu invisível.
 */
export function useStageOverlays(options: MatchLayoutOptions & { panelFixed?: boolean }): {
  panelOpen: boolean;
  setPanelOpen: Setter;
  asideOpen: boolean;
  setAsideOpen: Setter;
  asideMode: AsideMode;
  /** O botão de largura: encaixado vira ampliado sobre o encaixado; qualquer ampliado vira encaixado (200). */
  toggleAsideWidth: () => void;
  /** O toque fora do Histórico ampliado: ampliado fecha; ampliado sobre o encaixado volta a encaixado. */
  dismissExpandedAside: () => void;
  sheetOpen: boolean;
  setSheetOpen: Setter;
  /** Só onde é gaveta (celular em pé) ela cobre o mapa: escolher algo nela que abre outra coisa a fecha. */
  closeAsideIfDrawer: () => void;
} {
  const panelFixed = options.panelFixed ?? false;
  const { stacked, landscape, asideIsDrawer, asideNarrow } = useMatchLayout({
    columnWidth: options.columnWidth,
    queue: options.queue,
  });
  const asideUp = useMediaQuery(`(min-width: ${breakpoints.asideUp}px)`);

  // Um estado só, para o "abre um, fecha o outro" ser atômico e o updater ler o valor atual.
  const [open, setOpen] = useState(() => ({
    panel: !stacked,
    aside: (asideUp && !landscape ? "docked" : "closed") as AsideMode,
    sheet: false,
  }));

  const asideMode = normalizeAside(open.aside, asideNarrow);

  const setPanelOpen = useCallback<Setter>(
    (next) => {
      if (panelFixed) return;
      setOpen((s) => {
        const panel = typeof next === "function" ? next(s.panel) : next;
        return { ...s, panel, aside: panel && asideIsDrawer ? "closed" : s.aside };
      });
    },
    [panelFixed, asideIsDrawer],
  );

  const setAsideOpen = useCallback<Setter>(
    (next) =>
      setOpen((s) => {
        const current = normalizeAside(s.aside, asideNarrow);
        const wanted = typeof next === "function" ? next(current !== "closed") : next;
        // Já à mostra, abrir não muda o modo; fechado, abre ampliado só onde o Histórico é estreito.
        const aside: AsideMode = !wanted ? "closed" : current !== "closed" ? current : asideNarrow ? "expanded" : "docked";
        return {
          ...s,
          aside,
          panel: wanted && asideIsDrawer && !panelFixed ? false : s.panel,
          sheet: wanted && asideIsDrawer ? false : s.sheet,
        };
      }),
    [asideIsDrawer, panelFixed, asideNarrow],
  );

  const toggleAsideWidth = useCallback(() => {
    if (!asideNarrow) return;
    setOpen((s) => {
      const current = normalizeAside(s.aside, true);
      if (current === "closed") return s;
      return { ...s, aside: current === "docked" ? "expandedOverDocked" : "docked" };
    });
  }, [asideNarrow]);

  const dismissExpandedAside = useCallback(() => {
    setOpen((s) => {
      const current = normalizeAside(s.aside, asideNarrow);
      if (current === "expanded") return { ...s, aside: "closed" };
      if (current === "expandedOverDocked") return { ...s, aside: "docked" };
      return s;
    });
  }, [asideNarrow]);

  const setSheetOpen = useCallback<Setter>(
    (next) =>
      setOpen((s) => {
        const sheet = typeof next === "function" ? next(s.sheet) : next;
        return { ...s, sheet, aside: sheet && asideIsDrawer ? "closed" : s.aside };
      }),
    [asideIsDrawer],
  );

  const closeAsideIfDrawer = useCallback(() => {
    if (asideIsDrawer) setOpen((s) => ({ ...s, aside: "closed" }));
  }, [asideIsDrawer]);

  return {
    panelOpen: panelFixed || open.panel,
    setPanelOpen,
    asideOpen: asideMode !== "closed",
    setAsideOpen,
    asideMode,
    toggleAsideWidth,
    dismissExpandedAside,
    sheetOpen: open.sheet,
    setSheetOpen,
    closeAsideIfDrawer,
  };
}

/** Fora da tela estreita não há modo ampliado: vale encaixado (normaliza na leitura, sem efeito). */
function normalizeAside(mode: AsideMode, narrow: boolean): AsideMode {
  return !narrow && (mode === "expanded" || mode === "expandedOverDocked") ? "docked" : mode;
}

/** Jogador: a aba Ação com personagem é o compositor; escolher a casa de fuga também pede o mapa. */
export function playerPanelDismissible(input: {
  railActive: "acao" | "ficha";
  hasActor: boolean;
  picking: boolean;
}): boolean {
  return (input.railActive === "ficha" || !input.hasActor) && !input.picking;
}
