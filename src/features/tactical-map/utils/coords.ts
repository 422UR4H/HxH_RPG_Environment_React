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
  return { x: rx + pivotX + (grid.originX ?? 0), y: ry + pivotY + (grid.originY ?? 0) };
}

// Inverse of applyTransform: world → local grid space.
// Undo in reverse order: remove origin, un-squash (÷ skewRatio), then un-rotate.
export function inverseTransform(p: XY, grid: GridShape): XY {
  const pivotX = (grid.cols * grid.cellSize) / 2;
  const pivotY = (grid.rows * grid.cellSize) / 2;
  const rx = p.x - (grid.originX ?? 0) - pivotX;
  const ry = (p.y - (grid.originY ?? 0) - pivotY) / grid.skewRatio;
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
    case "ML": return { x: b.minX, y: midY };
    case "MR": return { x: b.maxX, y: midY };
    default:   return { x: midX, y: midY };
  }
}

const OPPOSITE_HANDLE: Record<string, string> = {
  TL: "BR", TR: "BL", BL: "TR", BR: "TL",
  TC: "BC", BC: "TC", ML: "MR", MR: "ML",
};

// Computes the new grid from dragging an edit handle to a world point.
// Pure geometry, shared by MapHandlesLayer. Handles:
//  - "rotate": angle from grid center (incl. origin) to cursor.
//  - shift + TC/BC: perspective (skewRatio).
//  - any resize handle: scales cellSize while pinning the OPPOSITE anchor in
//    world space (so the grid grows toward the dragged handle, not always to the
//    bottom-right). The pin is achieved by solving originX/originY. cellSize is
//    set from the cursor's projection onto the anchor→handle diagonal, which is
//    rotation/skew/grid-kind agnostic.
export function gridFromHandleDrag(
  handle: string,
  startGrid: GridShape,
  worldX: number,
  worldY: number,
  shiftKey: boolean,
): GridShape | null {
  const MIN_CELL = 8;
  const MAX_CELL = 256;
  const cx = (startGrid.cols * startGrid.cellSize) / 2 + (startGrid.originX ?? 0);
  const cy = (startGrid.rows * startGrid.cellSize) / 2 + (startGrid.originY ?? 0);

  if (handle === "rotate") {
    const angle = Math.atan2(worldY - cy, worldX - cx) * (180 / Math.PI) + 90;
    return { ...startGrid, rotation: angle };
  }

  if (shiftKey && (handle === "TC" || handle === "BC")) {
    const b = gridLocalBounds(startGrid);
    const gh = b.maxY - b.minY;
    const local = inverseTransform({ x: worldX, y: worldY }, startGrid);
    const newH = handle === "TC" ? b.maxY - local.y : local.y - b.minY;
    const ratio = Math.max(0.3, Math.min(1.0, newH / gh));
    return { ...startGrid, skewRatio: ratio };
  }

  const anchorId = OPPOSITE_HANDLE[handle];
  if (!anchorId) return null;
  const anchorWorld = applyTransform(gridHandleLocal(anchorId, startGrid), startGrid);
  const handleStart = applyTransform(gridHandleLocal(handle, startGrid), startGrid);
  const dx0 = handleStart.x - anchorWorld.x;
  const dy0 = handleStart.y - anchorWorld.y;
  const len0sq = dx0 * dx0 + dy0 * dy0;
  if (len0sq < 1e-9) return null;
  const scale = ((worldX - anchorWorld.x) * dx0 + (worldY - anchorWorld.y) * dy0) / len0sq;
  const newCellSize = Math.max(MIN_CELL, Math.min(MAX_CELL, startGrid.cellSize * scale));

  // Solve the origin so the opposite anchor stays exactly where it started.
  const at0: GridShape = { ...startGrid, cellSize: newCellSize, originX: 0, originY: 0 };
  const anchorAt0 = applyTransform(gridHandleLocal(anchorId, at0), at0);
  return {
    ...startGrid,
    cellSize: newCellSize,
    originX: anchorWorld.x - anchorAt0.x,
    originY: anchorWorld.y - anchorAt0.y,
  };
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
