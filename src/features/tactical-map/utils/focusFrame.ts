type XY = { x: number; y: number };

// Quantas células cabem no menor lado do canvas ao enquadrar a própria peça.
export const FOCUS_CELLS = 9;

const MIN_SCALE = 0.25;
const MAX_SCALE = 1.75;

// Escala do enquadramento do mapa inteiro (com folga de 6%), no mesmo intervalo de zoom.
export function wholeMapScale(view: { width: number; height: number }, w: number, h: number): number {
  return Math.min(Math.max(Math.min(view.width / w, view.height / h) * 0.94, MIN_SCALE), MAX_SCALE);
}

// Enquadra pontos do mundo (centros das peças): caixa dos pontos crescida até pelo menos
// FOCUS_CELLS células por eixo, em torno do centro dela; nunca mais afastado que o mapa inteiro.
export function focusFrame(
  focus: XY[],
  cellSize: number,
  view: { width: number; height: number },
  wholeScale: number,
): { center: XY; scale: number } {
  const xs = focus.map((p) => p.x);
  const ys = focus.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const min = FOCUS_CELLS * cellSize;
  const boxW = Math.max(maxX - minX, min);
  const boxH = Math.max(maxY - minY, min);
  const raw = Math.min(view.width / boxW, view.height / boxH);
  return {
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    scale: Math.min(Math.max(Math.max(raw, wholeScale), MIN_SCALE), MAX_SCALE),
  };
}
