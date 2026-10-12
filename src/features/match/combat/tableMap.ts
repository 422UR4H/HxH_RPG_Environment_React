// O mapa que a mesa usa: o do REST (nome, fog) com a grade e o fundo do TABULEIRO da
// partida no lugar, quando o `map_full_state` já os trouxe. `bg: null` do tabuleiro é
// "sem fundo" e vale; `undefined` é "ainda não chegou" e cai no do REST.
import type { BgImage, GridShape, TacticalMap } from "../../../types/tacticalMap";

export function tableMap(
  map: TacticalMap | undefined,
  boardGrid: GridShape | undefined,
  boardBg: BgImage | undefined,
): TacticalMap | undefined {
  if (!map) return map;
  if (boardGrid === undefined && boardBg === undefined) return map;
  return {
    ...map,
    grid: boardGrid ?? map.grid,
    bg: boardBg !== undefined ? boardBg : map.bg,
  };
}
