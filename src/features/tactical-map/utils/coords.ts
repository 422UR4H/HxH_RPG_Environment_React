import type { GridShape, SlotCoord } from "../../../types/tacticalMap";
import { hexToPixel, pixelToHex } from "./hex";

type XY = { x: number; y: number };

const DEG_TO_RAD = Math.PI / 180;

// Matches the Pixi transform applied by GridLayer:
//   pivot = position = (cols*cellSize/2, rows*cellSize/2)
//   scale = { x:1, y:skewRatio }
//   rotation = degrees
// Scale is applied relative to the pivot, then rotation around the same pivot.
export function applyTransform(p: XY, grid: GridShape): XY {
  const pivotX = (grid.cols * grid.cellSize) / 2;
  const pivotY = (grid.rows * grid.cellSize) / 2;
  const dx = p.x - pivotX;
  const dy = (p.y - pivotY) * grid.skewRatio;
  if (grid.rotation === 0) {
    return { x: dx + pivotX, y: dy + pivotY };
  }
  const t = grid.rotation * DEG_TO_RAD;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  return {
    x: dx * cos - dy * sin + pivotX,
    y: dx * sin + dy * cos + pivotY,
  };
}

// Inverse of applyTransform: world → local grid space.
export function inverseTransform(p: XY, grid: GridShape): XY {
  const pivotX = (grid.cols * grid.cellSize) / 2;
  const pivotY = (grid.rows * grid.cellSize) / 2;
  const dx = p.x - pivotX;
  const dy = p.y - pivotY;
  if (grid.rotation === 0) {
    return { x: dx + pivotX, y: dy / grid.skewRatio + pivotY };
  }
  const t = grid.rotation * DEG_TO_RAD;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  const rx = dx * cos + dy * sin;
  const ry = -dx * sin + dy * cos;
  return { x: rx + pivotX, y: ry / grid.skewRatio + pivotY };
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
