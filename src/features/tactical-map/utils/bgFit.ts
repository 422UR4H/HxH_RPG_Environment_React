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
