// O tabuleiro do mestre pelos olhos de uma peça (`piece_view`): só as paredes e peças que ela
// enxerga, com o fog do campo de visão dela. Puro: a página escolhe a peça e a visão válida.
import type { FogState, Piece, PieceView, WallSegment } from "../../../types/tacticalMap";

/**
 * Porta secreta não revelada vira parede comum. Espelha a tabela "Máscara de porta secreta
 * não revelada" do contrato (`System_X_System/docs/dev/api/maps.md`): troca só os campos que
 * identificam a porta e preserva os de combate. Qualquer outra parede volta como veio.
 */
export function maskSecretDoor(w: WallSegment): WallSegment {
  if (w.wallType !== "secret_door" || w.revealed) return w;
  const { doorSubtype: _doorSubtype, windowSubtype: _windowSubtype, ...rest } = w;
  return { ...rest, wallType: "wall", open: false, locked: false };
}

export function boardThroughPiece(
  walls: WallSegment[],
  pieces: Piece[],
  view: PieceView,
  fogMode: FogState["fogMode"],
): { walls: WallSegment[]; pieces: Piece[]; fog: FogState } {
  const wallIds = new Set(view.wallIds);
  const pieceIds = new Set(view.pieceIds);
  return {
    walls: walls.filter((w) => wallIds.has(w.id)).map(maskSecretDoor),
    pieces: pieces.filter((p) => pieceIds.has(p.id)),
    fog: { fogMode, visiblePolygons: view.visiblePolygons },
  };
}
