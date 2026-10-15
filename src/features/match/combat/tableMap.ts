// O mapa que a mesa e o lobby desenham: o TABULEIRO da partida, nunca o mapa da campanha.
// Grade e fundo vêm do `map_full_state`, e peças e paredes cada tela põe por cima, também do
// servidor. O tabuleiro que chegou SEMPRE desenha — mesmo que o REST do mapa tenha falhado ou
// ainda esteja carregando: do REST só vem o que não é geometria (nome, ids), e sem ele esses
// campos ficam neutros. Sem grade não há o que desenhar: `undefined` — quem chama distingue
// "sem mapa anexado" (sem `mapUuid`) de "tabuleiro ainda não chegou". Com a grade presente,
// `bg` `null` ou ausente é "sem fundo" — o fundo da campanha nunca entra.
import type { BgImage, GridShape, TacticalMap } from "../../../types/tacticalMap";

export function tableMap(
  map: TacticalMap | undefined,
  boardGrid: GridShape | undefined,
  boardBg: BgImage | undefined,
  /** O mapa anexado (`useMatchMap`): dá o `id` quando o REST do mapa não veio. */
  mapUuid?: string,
): TacticalMap | undefined {
  if (!boardGrid) return undefined;
  const base: TacticalMap = map ?? {
    id: mapUuid ?? "",
    campaignId: "",
    name: "",
    grid: boardGrid,
    bg: null,
    pieces: [],
    walls: [],
    decorations: [],
    items: [],
    createdAt: "",
    updatedAt: "",
  };
  return {
    ...base,
    grid: boardGrid,
    bg: boardBg ?? null,
    pieces: [],
    walls: [],
  };
}
