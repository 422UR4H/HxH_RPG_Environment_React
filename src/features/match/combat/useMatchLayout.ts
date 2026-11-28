import useMediaQuery from "../../../hooks/useMediaQuery";
import {
  asideNarrowQuery,
  breakpoints,
  LANDSCAPE_PHONE_QUERY,
  LANDSCAPE_TWO_COLUMN_QUERY,
  QUEUE_COLUMN_WIDTH,
  STACKED_WIDE_QUERY,
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
  /**
   * Celular deitado baixo e largo (mestre): fila e painel em colunas lado a lado, como no
   * widescreen, em vez de divididos em cima e embaixo.
   */
  twoColumns: boolean;
  /** Em pé, de 900 a 1279 px (mestre): a fila fica à esquerda do painel de baixo. */
  stackedWide: boolean;
  /** O Histórico em coluna tem 200 em vez de 280: sobraria menos de `MAP_MIN_WIDTH` de mapa. */
  asideNarrow: boolean;
}

export interface MatchLayoutOptions {
  /** Largura da coluna da esquerda do papel (painel e fila do mestre; painel do jogador). */
  columnWidth: number;
  /** O papel tem fila fixa em zona própria (o mestre). */
  queue: boolean;
}

/**
 * O template decide ONDE cada zona fica; este hook decide O QUE vai em cada uma. No jsdom todo
 * `matchMedia` responde falso, e isso é o celular em pé (empilhado, gaveta).
 */
export function useMatchLayout({ columnWidth, queue }: MatchLayoutOptions): MatchLayout {
  const side = useMediaQuery(SIDE_LAYOUT_QUERY);
  const tabletPortrait = useMediaQuery(TABLET_PORTRAIT_QUERY);
  const landscape = useMediaQuery(LANDSCAPE_PHONE_QUERY);
  const asideUp = useMediaQuery(`(min-width: ${breakpoints.asideUp}px)`);
  const wideUp = useMediaQuery(`(min-width: ${breakpoints.wideUp}px)`);
  const tallEnough = useMediaQuery(`(min-height: ${LANDSCAPE_SPLIT_MIN_HEIGHT}px)`);

  const twoColumnsScreen = useMediaQuery(LANDSCAPE_TWO_COLUMN_QUERY);
  const stackedWideScreen = useMediaQuery(STACKED_WIDE_QUERY);
  const twoColumns = queue && twoColumnsScreen;
  // Em duas colunas a fila também fica à esquerda do mapa.
  const asideNarrow = useMediaQuery(asideNarrowQuery(twoColumns ? QUEUE_COLUMN_WIDTH + columnWidth : columnWidth));

  const stacked = !side;
  return {
    stacked,
    landscape,
    landscapeSplit: landscape && tallEnough,
    wide: !landscape && wideUp,
    asideIsDrawer: stacked && !tabletPortrait,
    sheetReplacesColumn: side && (landscape || !asideUp),
    twoColumns,
    stackedWide: queue && stackedWideScreen,
    asideNarrow,
  };
}

/** Só a página do mestre usa: a fila fica fixa (em vez de aba) quando há espaço para ela. */
export function queueIsSplit(layout: MatchLayout): boolean {
  return (!layout.stacked && (!layout.landscape || layout.landscapeSplit || layout.twoColumns)) || layout.stackedWide;
}
