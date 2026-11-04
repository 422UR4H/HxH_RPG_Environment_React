import type { GridShape } from "../../../types/tacticalMap";

type XY = { x: number; y: number };

// Quantas células cabem no menor lado do canvas ao enquadrar a própria peça.
export const FOCUS_CELLS = 9;

const MIN_SCALE = 0.25;
const MAX_SCALE = 1.75;

// Escala do enquadramento do mapa inteiro (com folga de 6%), no mesmo intervalo de zoom.
export function wholeMapScale(view: { width: number; height: number }, w: number, h: number): number {
  return Math.min(Math.max(Math.min(view.width / w, view.height / h) * 0.94, MIN_SCALE), MAX_SCALE);
}

// Passo entre centros de células vizinhas, por eixo, no espaço LOCAL da grade (o mesmo de
// gridLocalBounds). Quadrado: cellSize nos dois eixos. Hex pointy-top: cellSize é o raio
// (centro→vértice), então colunas andam √3·cellSize e linhas 1.5·cellSize.
export function cellPitch(grid: GridShape): XY {
  if (grid.kind === "square") return { x: grid.cellSize, y: grid.cellSize };
  return { x: grid.cellSize * Math.sqrt(3), y: grid.cellSize * 1.5 };
}

// Enquadra pontos do mundo (centros das peças): caixa dos pontos com folga de uma célula de
// cada lado (para a peça da borda não ficar meio fora da tela), crescida até pelo menos
// FOCUS_CELLS células por eixo, em torno do centro dela. Nunca mais afastado que o mapa
// inteiro: quando o enquadramento do mapa inteiro vence (mapa pequeno), centra no mapa.
export function focusFrame(
  focus: XY[],
  pitch: XY,
  view: { width: number; height: number },
  whole: { scale: number; center: XY },
): { center: XY; scale: number } {
  const xs = focus.map((p) => p.x);
  const ys = focus.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const boxW = Math.max(maxX - minX + 2 * pitch.x, FOCUS_CELLS * pitch.x);
  const boxH = Math.max(maxY - minY + 2 * pitch.y, FOCUS_CELLS * pitch.y);
  const raw = Math.min(view.width / boxW, view.height / boxH);
  const wholeWins = raw <= whole.scale;
  return {
    center: wholeWins ? whole.center : { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    scale: Math.min(Math.max(Math.max(raw, whole.scale), MIN_SCALE), MAX_SCALE),
  };
}
