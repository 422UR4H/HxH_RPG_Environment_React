import type { BgImage, GridShape } from "../../../types/tacticalMap";
import { gridLocalBounds } from "./coords";

const MIN_CELL = 8;
const MAX_CELL = 256;

export function computeCoverFit(
  naturalWidth: number,
  naturalHeight: number,
  grid: GridShape,
): NonNullable<BgImage> {
  // Use the grid's REAL local bounds (square tiles from origin; hex spans wider
  // by √3 and taller by the half-hex margins). For square this is identical to
  // cols*cellSize × rows*cellSize, so square behavior is unchanged; for hex it
  // makes the image actually cover the whole grid.
  const b = gridLocalBounds(grid);
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
// Works for square and hex via gridLocalBounds (the real extent); rotation and
// skew (isometric) are preserved and don't affect the fit, since the bg is fit
// to the grid's untransformed bounds (as it always has been).
export function fitGridToImage(
  naturalWidth: number,
  naturalHeight: number,
  grid: GridShape,
): GridShape {
  // Unit extents (the grid's bounds at cellSize = 1) for the current cols/rows.
  // Every bound scales linearly with cellSize, so cellSize × unit = real extent.
  const unit = gridLocalBounds({ ...grid, cellSize: 1 });
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
    const b = gridLocalBounds({ ...grid, cellSize, rows });
    if (b.maxY - b.minY >= naturalHeight) break;
    rows++;
  }
  let cols = Math.max(1, grid.cols);
  while (cols < 200) {
    const b = gridLocalBounds({ ...grid, cellSize, cols, rows });
    if (b.maxX - b.minX >= naturalWidth) break;
    cols++;
  }
  return { ...grid, cellSize, cols, rows };
}
