import type { BgImage, GridShape } from "../../../types/tacticalMap";

export function computeCoverFit(
  naturalWidth: number,
  naturalHeight: number,
  grid: GridShape,
): NonNullable<BgImage> {
  const gridW = grid.cols * grid.cellSize;
  const gridH = grid.rows * grid.cellSize;

  const scaleX = gridW / naturalWidth;
  const scaleY = gridH / naturalHeight;
  const scale = Math.max(scaleX, scaleY);

  const w = naturalWidth * scale;
  const h = naturalHeight * scale;

  return {
    url: "",
    x: (gridW - w) / 2,
    y: (gridH - h) / 2,
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
  };
}

export function deriveGridFromImage(
  naturalWidth: number,
  naturalHeight: number,
  grid: GridShape,
): GridShape {
  const cellSize = naturalWidth / grid.cols;
  const rows = Math.floor(naturalHeight / cellSize);
  return { ...grid, cellSize, rows };
}

export function fitGridToImage(
  naturalWidth: number,
  naturalHeight: number,
  grid: GridShape,
): GridShape {
  if (grid.kind === "square") {
    const cols = Math.max(1, Math.min(200, Math.round(naturalWidth / grid.cellSize)));
    const rows = Math.max(1, Math.min(200, Math.round(naturalHeight / grid.cellSize)));
    return { ...grid, cols, rows };
  }
  // hex (point-top): hexW = cellSize * sqrt(3), hexH = cellSize * 1.5
  const hexW = grid.cellSize * Math.sqrt(3);
  const hexH = grid.cellSize * 1.5;
  const cols = Math.max(1, Math.min(200, Math.round(naturalWidth / hexW)));
  const rows = Math.max(1, Math.min(200, Math.round(naturalHeight / hexH)));
  return { ...grid, cols, rows };
}
