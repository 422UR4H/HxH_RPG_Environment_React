// O mapa que a mesa e o lobby desenham: o TABULEIRO da partida, nunca o mapa da campanha.
// Do REST vem só o que não é geometria (nome, ids); grade e fundo vêm do `map_full_state`,
// e peças e paredes cada tela põe por cima, também do servidor. Até o tabuleiro chegar não há
// o que desenhar: `undefined` — quem chama distingue "sem mapa anexado" (`map` undefined) de
// "tabuleiro ainda não chegou" (`map` presente, `boardGrid` undefined). Com a grade presente,
// `bg` `null` ou ausente é "sem fundo" — o fundo da campanha nunca entra.
import type { BgImage, GridShape, TacticalMap } from "../../../types/tacticalMap";

export function tableMap(
  map: TacticalMap | undefined,
  boardGrid: GridShape | undefined,
  boardBg: BgImage | undefined,
): TacticalMap | undefined {
  if (!map || !boardGrid) return undefined;
  return {
    ...map,
    grid: boardGrid,
    bg: boardBg ?? null,
    pieces: [],
    walls: [],
  };
}
