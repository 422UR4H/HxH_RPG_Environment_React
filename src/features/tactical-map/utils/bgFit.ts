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

// Fits the grid to the image by adjusting ONLY cellSize (the slot pixel size),
// keeping the user-defined cols/rows untouched. cellSize is chosen so the grid
// rectangle covers the image: the larger per-axis pitch wins, so the grid is at
// least as large as the image in both dimensions (one axis matches exactly).
// Clamped to the editor's cellSize bounds [8, 256].
export function fitCellSizeToImage(
  naturalWidth: number,
  naturalHeight: number,
  grid: GridShape,
): GridShape {
  const clamp = (v: number) => Math.max(8, Math.min(256, Math.round(v)));
  if (grid.kind === "square") {
    const cellSize = clamp(Math.max(naturalWidth / grid.cols, naturalHeight / grid.rows));
    return { ...grid, cellSize };
  }
  // hex (point-top): horizontal pitch = cellSize*sqrt(3), vertical pitch = cellSize*1.5
  const cellSize = clamp(
    Math.max(naturalWidth / (grid.cols * Math.sqrt(3)), naturalHeight / (grid.rows * 1.5)),
  );
  return { ...grid, cellSize };
}
