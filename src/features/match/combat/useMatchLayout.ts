import useMediaQuery from "../../../hooks/useMediaQuery";
import { breakpoints, LANDSCAPE_PHONE_QUERY, LANDSCAPE_SPLIT_MIN_HEIGHT } from "../../../styles/breakpoints";

export interface MatchLayout {
  phonePortrait: boolean;
  landscape: boolean;
  landscapeSplit: boolean;
  wide: boolean;
  asideIsDrawer: boolean;
}

/** O template decide ONDE cada zona fica; este hook decide O QUE vai em cada uma. */
export function useMatchLayout(): MatchLayout {
  const landscape = useMediaQuery(LANDSCAPE_PHONE_QUERY);
  const tabletUp = useMediaQuery(`(min-width: ${breakpoints.tabletUp}px)`);
  const wideUp = useMediaQuery(`(min-width: ${breakpoints.wideUp}px)`);
  const tallEnough = useMediaQuery(`(min-height: ${LANDSCAPE_SPLIT_MIN_HEIGHT}px)`);

  const phonePortrait = !landscape && !tabletUp;
  return {
    phonePortrait,
    landscape,
    landscapeSplit: landscape && tallEnough,
    wide: !landscape && wideUp,
    asideIsDrawer: phonePortrait,
  };
}

/** Só a página do mestre usa: a fila fica fixa (em vez de aba) quando há espaço para ela. */
export function queueIsSplit(layout: MatchLayout): boolean {
  return !layout.phonePortrait && (!layout.landscape || layout.landscapeSplit);
}
