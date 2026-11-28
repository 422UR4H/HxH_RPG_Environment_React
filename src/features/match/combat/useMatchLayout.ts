import useMediaQuery from "../../../hooks/useMediaQuery";
import {
  breakpoints,
  LANDSCAPE_PHONE_QUERY,
  LANDSCAPE_SPLIT_MIN_HEIGHT,
  SIDE_LAYOUT_QUERY,
  TABLET_PORTRAIT_QUERY,
} from "../../../styles/breakpoints";

export interface MatchLayout {
  /**
   * Empilhado, como o celular em pé: mapa em cima, painel embaixo, navegação no rodapé. Vale em
   * pé até 1279 px (celular e tablet); deitado ou a partir de 1280 px há colunas laterais.
   */
  stacked: boolean;
  /** Celular deitado (altura baixa). */
  landscape: boolean;
  landscapeSplit: boolean;
  wide: boolean;
  /** O Histórico é gaveta com véu: empilhado abaixo de 600 px. No tablet em pé é coluna. */
  asideIsDrawer: boolean;
  /**
   * A ficha do mestre toma o lugar da coluna da esquerda (painel e fila somem enquanto ela está
   * aberta): com colunas laterais, abaixo de `asideUp` e no celular deitado.
   */
  sheetReplacesColumn: boolean;
}

/**
 * O template decide ONDE cada zona fica; este hook decide O QUE vai em cada uma. No jsdom todo
 * `matchMedia` responde falso, e isso é o celular em pé (empilhado, gaveta).
 */
export function useMatchLayout(): MatchLayout {
  const side = useMediaQuery(SIDE_LAYOUT_QUERY);
  const tabletPortrait = useMediaQuery(TABLET_PORTRAIT_QUERY);
  const landscape = useMediaQuery(LANDSCAPE_PHONE_QUERY);
  const asideUp = useMediaQuery(`(min-width: ${breakpoints.asideUp}px)`);
  const wideUp = useMediaQuery(`(min-width: ${breakpoints.wideUp}px)`);
  const tallEnough = useMediaQuery(`(min-height: ${LANDSCAPE_SPLIT_MIN_HEIGHT}px)`);

  const stacked = !side;
  return {
    stacked,
    landscape,
    landscapeSplit: landscape && tallEnough,
    wide: !landscape && wideUp,
    asideIsDrawer: stacked && !tabletPortrait,
    sheetReplacesColumn: side && (landscape || !asideUp),
  };
}

/** Só a página do mestre usa: a fila fica fixa (em vez de aba) quando há espaço para ela. */
export function queueIsSplit(layout: MatchLayout): boolean {
  return !layout.stacked && (!layout.landscape || layout.landscapeSplit);
}
