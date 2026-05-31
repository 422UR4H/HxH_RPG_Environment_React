import type { GridShape, SlotCoord } from "../../../types/tacticalMap";
import { hexToPixel, pixelToHex } from "./hex";

export function slotToWorld(slot: SlotCoord, grid: GridShape): { x: number; y: number } {
  if (slot.kind === "square") {
    const { cellSize } = grid;
    return {
      x: slot.col * cellSize + cellSize / 2,
      y: slot.row * cellSize + cellSize / 2,
    };
  }
  return hexToPixel({ q: slot.q, r: slot.r }, grid.cellSize);
}

export function worldToSlot(world: { x: number; y: number }, grid: GridShape): SlotCoord {
  if (grid.kind === "square") {
    return {
      kind: "square",
      col: Math.floor(world.x / grid.cellSize),
      row: Math.floor(world.y / grid.cellSize),
    };
  }
  const { q, r } = pixelToHex(world, grid.cellSize);
  return { kind: "hex", q, r };
}
