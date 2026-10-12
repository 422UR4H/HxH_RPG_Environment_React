import type { BgImage, GridShape } from "../../../types/tacticalMap";
import { gridWorldBounds } from "./coords";

// Caixa WORLD da grade com origem zero: inclui rotação/achatamento (e a largura extra do
// hex). As extensões escalam linearmente com cellSize. A origem de edição é somada por
// quem chama (fitGridAndCover), então aqui nunca entra.
function worldBox(grid: GridShape) {
  return gridWorldBounds({ ...grid, originX: 0, originY: 0 });
}

const MIN_CELL = 8;
const MAX_CELL = 256;

export function computeCoverFit(
  naturalWidth: number,
  naturalHeight: number,
  grid: GridShape,
): NonNullable<BgImage> {
  // Use the grid's REAL world bounds at origin 0 (rotation/squash applied; hex spans
  // wider by √3). Untransformed square is identical to cols*cellSize × rows*cellSize,
  // so that behavior is unchanged; rotated/isometric grids get the box of the drawn
  // diamond instead of the "upright" one.
  const b = worldBox(grid);
  const gridW = b.maxX - b.minX;
  const gridH = b.maxY - b.minY;

  const scale = Math.max(gridW / naturalWidth, gridH / naturalHeight);
  const w = naturalWidth * scale;
  const h = naturalHeight * scale;

  return {
    url: "",
    x: b.minX + (gridW - w) / 2,
    y: b.minY + (gridH - h) / 2,
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
  };
}

// Convenience shared by "add image" and "Encaixar Grade": fits the grid to the
// image (fitGridToImage) and positions the bg to cover it (computeCoverFit),
// carrying the grid's edit-time origin into the bg position. Returns both.
export function fitGridAndCover(
  naturalWidth: number,
  naturalHeight: number,
  grid: GridShape,
  url: string,
  r2Url?: string,
): { grid: GridShape; bg: NonNullable<BgImage> } {
  const newGrid = fitGridToImage(naturalWidth, naturalHeight, grid);
  const fit = computeCoverFit(naturalWidth, naturalHeight, newGrid);
  return {
    grid: newGrid,
    bg: {
      ...fit,
      x: fit.x + (newGrid.originX ?? 0),
      y: fit.y + (newGrid.originY ?? 0),
      url,
      r2Url,
    },
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

// Fits the grid to the image. Primarily adjusts cellSize (the slot pixel size),
// keeping the user-defined cols/rows. cellSize is capped at MAX_CELL so the
// image never has to be shrunk to match a giant cell; when the cap is reached
// and the grid still doesn't cover the image, cols/rows are GROWN (never the
// cell beyond the cap) so the grid covers the rest of the image at full
// resolution.
//
// Works for square and hex via the grid's WORLD bounds at origin 0 (rotation and
// skew included, so an isometric grid is fit by its drawn diamond); rotation and
// skew themselves are preserved.
export function fitGridToImage(
  naturalWidth: number,
  naturalHeight: number,
  grid: GridShape,
): GridShape {
  // Unit extents (the grid's bounds at cellSize = 1) for the current cols/rows.
  // Every bound scales linearly with cellSize, so cellSize × unit = real extent.
  const unit = worldBox({ ...grid, cellSize: 1 });
  const unitW = unit.maxX - unit.minX;
  const unitH = unit.maxY - unit.minY;
  const ideal = Math.max(naturalWidth / unitW, naturalHeight / unitH);

  // cellSize alone covers the image with the current cols/rows.
  if (ideal <= MAX_CELL) {
    return { ...grid, cellSize: Math.max(MIN_CELL, Math.round(ideal)) };
  }

  // Capped: keep cellSize at the max and grow cols/rows to cover the image.
  // Rows first (they drive height and, for hex, the odd-row width offset), then
  // cols using the settled row count.
  const cellSize = MAX_CELL;
  let rows = Math.max(1, grid.rows);
  while (rows < 200) {
    const b = worldBox({ ...grid, cellSize, rows });
    if (b.maxY - b.minY >= naturalHeight) break;
    rows++;
  }
  let cols = Math.max(1, grid.cols);
  while (cols < 200) {
    const b = worldBox({ ...grid, cellSize, cols, rows });
    if (b.maxX - b.minX >= naturalWidth) break;
    cols++;
  }
  return { ...grid, cellSize, cols, rows };
}
