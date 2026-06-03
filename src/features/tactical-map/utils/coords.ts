import type { GridShape, SlotCoord } from "../../../types/tacticalMap";
import { hexToPixel, pixelToHex } from "./hex";

type XY = { x: number; y: number };

const DEG_TO_RAD = Math.PI / 180;

function applyTransform(p: XY, grid: GridShape): XY {
  const skewed: XY = { x: p.x, y: p.y * grid.skewRatio };
  if (grid.rotation === 0) return skewed;
  const t = grid.rotation * DEG_TO_RAD;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  return {
    x: skewed.x * cos - skewed.y * sin,
    y: skewed.x * sin + skewed.y * cos,
  };
}

function inverseTransform(p: XY, grid: GridShape): XY {
  if (grid.rotation === 0) {
    return { x: p.x, y: p.y / grid.skewRatio };
  }
  const t = grid.rotation * DEG_TO_RAD;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  return {
    x: p.x * cos + p.y * sin,
    y: (-p.x * sin + p.y * cos) / grid.skewRatio,
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
