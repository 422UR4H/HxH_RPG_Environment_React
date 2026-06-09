import type { GridShape, SlotCoord } from "../../../types/tacticalMap";
import { hexToPixel, pixelToHex } from "./hex";

type XY = { x: number; y: number };

const DEG_TO_RAD = Math.PI / 180;

// Maps a point from local grid space to world space.
//
// The transform is built around the grid CENTER (pivot = cols*cellSize/2,
// rows*cellSize/2) and applies, in order:
//   1. rotation (degrees)
//   2. vertical squash by skewRatio — in SCREEN space, AFTER rotation
//
// Applying the squash after rotation is what produces a true isometric look:
// rotating a square grid 45° then compressing vertically turns the cells into
// the classic iso diamonds (the squash acts diagonally relative to the grid's
// own axes). Squashing before rotation would only ever compress the local
// vertical axis, which is the bug we're fixing.
export function applyTransform(p: XY, grid: GridShape): XY {
  const pivotX = (grid.cols * grid.cellSize) / 2;
  const pivotY = (grid.rows * grid.cellSize) / 2;
  const dx = p.x - pivotX;
  const dy = p.y - pivotY;
  let rx = dx;
  let ry = dy;
  if (grid.rotation !== 0) {
    const t = grid.rotation * DEG_TO_RAD;
    const cos = Math.cos(t);
    const sin = Math.sin(t);
    rx = dx * cos - dy * sin;
    ry = dx * sin + dy * cos;
  }
  ry *= grid.skewRatio; // screen-space vertical squash, after rotation
  return { x: rx + pivotX, y: ry + pivotY };
}

// Inverse of applyTransform: world → local grid space.
// Undo in reverse order: un-squash (divide y by skewRatio), then un-rotate.
export function inverseTransform(p: XY, grid: GridShape): XY {
  const pivotX = (grid.cols * grid.cellSize) / 2;
  const pivotY = (grid.rows * grid.cellSize) / 2;
  const rx = p.x - pivotX;
  const ry = (p.y - pivotY) / grid.skewRatio;
  if (grid.rotation === 0) {
    return { x: rx + pivotX, y: ry + pivotY };
  }
  const t = grid.rotation * DEG_TO_RAD;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  return {
    x: rx * cos + ry * sin + pivotX,
    y: -rx * sin + ry * cos + pivotY,
  };
}

function slotToBaseline(slot: SlotCoord, grid: GridShape): XY {
  if (slot.kind === "square") {
    const { cellSize } = grid;
    return {
      x: slot.col * cellSize + cellSize / 2,
      y: slot.row * cellSize + cellSize / 2,
    };
  }
  return hexToPixel({ q: slot.q, r: slot.r }, grid.cellSize);
}

function baselineToSlot(b: XY, grid: GridShape): SlotCoord {
  if (grid.kind === "square") {
    return {
      kind: "square",
      col: Math.floor(b.x / grid.cellSize),
      row: Math.floor(b.y / grid.cellSize),
    };
  }
  const { q, r } = pixelToHex(b, grid.cellSize);
  return { kind: "hex", q, r };
}

export function slotToWorld(slot: SlotCoord, grid: GridShape): XY {
  return applyTransform(slotToBaseline(slot, grid), grid);
}

export function worldToSlot(world: XY, grid: GridShape): SlotCoord {
  return baselineToSlot(inverseTransform(world, grid), grid);
}

// Returns world-space corners of the slot cell, matching the visual shape of GridLayer.
// Square: 4 corners (TL, TR, BR, BL). Hex: 6 vertices in the same winding as GridLayer.
export function slotCorners(slot: SlotCoord, grid: GridShape): XY[] {
  if (slot.kind === "square") {
    const { cellSize } = grid;
    const local: XY[] = [
      { x: slot.col * cellSize,       y: slot.row * cellSize       },
      { x: (slot.col + 1) * cellSize, y: slot.row * cellSize       },
      { x: (slot.col + 1) * cellSize, y: (slot.row + 1) * cellSize },
      { x: slot.col * cellSize,       y: (slot.row + 1) * cellSize },
    ];
    return local.map((p) => applyTransform(p, grid));
  }
  const center = hexToPixel({ q: slot.q, r: slot.r }, grid.cellSize);
  return [0, 1, 2, 3, 4, 5].map((i) => {
    const angle = ((60 * i - 30) * Math.PI) / 180;
    return applyTransform(
      { x: center.x + grid.cellSize * Math.cos(angle), y: center.y + grid.cellSize * Math.sin(angle) },
      grid,
    );
  });
}

// Axis-aligned bounds of the grid cells in LOCAL space (before transform).
// Square cells tile from the origin; hex cells are centered on their grid
// points, so a pointy-top hex grid extends half a hex-width left of x=0 and one
// cellSize (the top vertex) above y=0. Every term scales linearly with
// cellSize, which the resize math relies on.
export function gridLocalBounds(grid: GridShape): {
  minX: number; minY: number; maxX: number; maxY: number;
} {
  if (grid.kind === "square") {
    return { minX: 0, minY: 0, maxX: grid.cols * grid.cellSize, maxY: grid.rows * grid.cellSize };
  }
  const hexW = grid.cellSize * Math.sqrt(3);
  const hexH = grid.cellSize * 1.5;
  // Odd rows are shifted right by hexW/2, so the rightmost center gains that
  // offset whenever the grid has at least one odd row.
  const maxCx = (grid.cols - 1) * hexW + (grid.rows >= 2 ? hexW / 2 : 0);
  return {
    minX: -hexW / 2,
    maxX: maxCx + hexW / 2,
    minY: -grid.cellSize,
    maxY: (grid.rows - 1) * hexH + grid.cellSize,
  };
}

// Local-space anchor point for an edit handle, derived from the grid bounds.
// Shared by the handle rendering and the drag math so they always agree.
export function gridHandleLocal(handle: string, grid: GridShape): XY {
  const b = gridLocalBounds(grid);
  const midX = (b.minX + b.maxX) / 2;
  const midY = (b.minY + b.maxY) / 2;
  switch (handle) {
    case "TL": return { x: b.minX, y: b.minY };
    case "TR": return { x: b.maxX, y: b.minY };
    case "BL": return { x: b.minX, y: b.maxY };
    case "BR": return { x: b.maxX, y: b.maxY };
    case "TC": return { x: midX, y: b.minY };
    case "BC": return { x: midX, y: b.maxY };
    default:   return { x: midX, y: midY };
  }
}

// Returns true if slot is within the visible grid bounds.
// Hex uses odd-r offset → col = q + floor(r/2); valid when 0 ≤ col < cols.
export function isSlotInBounds(slot: SlotCoord, grid: GridShape): boolean {
  if (slot.kind === "square") {
    return slot.col >= 0 && slot.col < grid.cols && slot.row >= 0 && slot.row < grid.rows;
  }
  if (slot.r < 0 || slot.r >= grid.rows) return false;
  const col = slot.q + Math.floor(slot.r / 2);
  return col >= 0 && col < grid.cols;
}
