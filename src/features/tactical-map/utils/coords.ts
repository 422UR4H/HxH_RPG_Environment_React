import type { GridShape, SlotCoord } from "../../../types/tacticalMap";

export function slotToWorld(slot: SlotCoord, grid: GridShape): { x: number; y: number } {
  if (slot.kind === "square") {
    const { cellSize } = grid;
    return {
      x: slot.col * cellSize + cellSize / 2,
      y: slot.row * cellSize + cellSize / 2,
    };
  }
  // hex: implemented in Task 5
  throw new Error(`slotToWorld: kind "${slot.kind}" not implemented yet`);
}

export function worldToSlot(world: { x: number; y: number }, grid: GridShape): SlotCoord {
  if (grid.kind === "square") {
    return {
      kind: "square",
      col: Math.floor(world.x / grid.cellSize),
      row: Math.floor(world.y / grid.cellSize),
    };
  }
  // hex: implemented in Task 5
  throw new Error(`worldToSlot: grid.kind "${grid.kind}" not implemented yet`);
}
