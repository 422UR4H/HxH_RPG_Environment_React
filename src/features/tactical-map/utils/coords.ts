import type { GridShape, SlotCoord, VisibilityPolygon } from "../../../types/tacticalMap";
import { hexToPixel, pixelToHex } from "./hex";

type XY = { x: number; y: number };

const DEG_TO_RAD = Math.PI / 180;

// Maps a point from local grid space to world space.
//
// The transform is built around the grid CENTER (pivot = gridPivot: the center
// of gridLocalBounds — cols*cellSize/2, rows*cellSize/2 for square; for hex the
// bounds are offset, so it is NOT that) and applies, in order:
//   1. rotation (degrees)
//   2. vertical squash by skewRatio — in SCREEN space, AFTER rotation
//
// Applying the squash after rotation is what produces a true isometric look:
// rotating a square grid 45° then compressing vertically turns the cells into
// the classic iso diamonds (the squash acts diagonally relative to the grid's
// own axes). Squashing before rotation would only ever compress the local
// vertical axis, which is the bug we're fixing.
export function applyTransform(p: XY, grid: GridShape): XY {
  const { x: pivotX, y: pivotY } = gridPivot(grid);
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
  const { x: pivotX, y: pivotY } = gridPivot(grid);
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

/** Centro do slot no espaço LOCAL da grade (antes do transform) — o mesmo de `WallSegment.p1/p2`. */
export const slotToLocal = slotToBaseline;
/** O slot que contém um ponto do espaço LOCAL da grade. */
export const localToSlot = baselineToSlot;

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

// Pivô do transform: o centro REAL da grade no espaço LOCAL (centro de
// gridLocalBounds). No quadrado é (cols·cellSize/2, rows·cellSize/2); no hex os
// limites são deslocados, então o pivô antigo ficava fora do centro.
export function gridPivot(grid: GridShape): XY {
  const b = gridLocalBounds(grid);
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

// Posição WORLD da esfera de rotação: no raio centro→TC (já transformado), a
// `offset` px além do TC. Compartilhada por MapHandlesLayer e pelos testes do arrasto.
export function gridRotateHandleWorld(grid: GridShape, offset: number): XY {
  const TC = applyTransform(gridHandleLocal("TC", grid), grid);
  const center = applyTransform(gridHandleLocal("center", grid), grid);
  const dx = TC.x - center.x;
  const dy = TC.y - center.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: TC.x + (dx / len) * offset, y: TC.y + (dy / len) * offset };
}

// Mudar cols/rows/cellSize move o pivô e, numa grade girada/achatada, translada
// todas as células. Compensa a origem para que o canto local (0,0) fique onde estava.
export function keepGridAnchored(prev: GridShape, next: GridShape): GridShape {
  const a = applyTransform({ x: 0, y: 0 }, prev);
  const b = applyTransform({ x: 0, y: 0 }, next);
  return {
    ...next,
    originX: (next.originX ?? 0) - (b.x - a.x),
    originY: (next.originY ?? 0) - (b.y - a.y),
  };
}

// Contorno da grade em WORLD: os 4 cantos de gridLocalBounds (TL, TR, BR, BL) por
// applyTransform. A caixa de gridWorldBounds envolve este contorno.
export function gridWorldCorners(grid: GridShape): XY[] {
  const b = gridLocalBounds(grid);
  return [
    { x: b.minX, y: b.minY }, { x: b.maxX, y: b.minY },
    { x: b.maxX, y: b.maxY }, { x: b.minX, y: b.maxY },
  ].map((p) => applyTransform(p, grid));
}

// Axis-aligned bounds, in WORLD space, of the grid's real extent: the 4 corners
// of gridLocalBounds run through applyTransform. Covers hex (wider than
// cols*cellSize) and rotated/squashed grids. Shared by the camera fit and the fog.
export function gridWorldBounds(grid: GridShape): {
  minX: number; minY: number; maxX: number; maxY: number;
} {
  const corners = gridWorldCorners(grid);
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

// Visibility polygons arrive from the server in LOCAL grid space (same as wall
// p1/p2). The transform is affine, so transforming each vertex is exact.
export function polygonsToWorld(polys: VisibilityPolygon[], grid: GridShape): VisibilityPolygon[] {
  return polys.map((poly) =>
    poly.map((v): [number, number] => {
      const w = applyTransform({ x: v[0], y: v[1] }, grid);
      return [w.x, w.y];
    }),
  );
}

// Radius of the largest circle that fits inside one grid cell, in LOCAL
// (pre-transform) space. A square cell inscribes a circle of cellSize/2; a
// pointy-top hex cell inscribes one of cellSize·√3/2 (its flat-to-flat
// half-width — note cellSize is the hex CIRCUMradius, center-to-vertex, so the
// cell is far larger than cellSize). Tokens scale off this so a piece fills the
// same fraction of its slot regardless of grid kind.
export function slotInradius(grid: GridShape): number {
  return grid.kind === "square" ? grid.cellSize / 2 : (grid.cellSize * Math.sqrt(3)) / 2;
}

// Raio do maior círculo que cabe na casa (0,0) COMO ELA APARECE NA TELA: a menor distância
// do centro transformado até cada aresta transformada. Numa grade rotacionada/achatada
// (isométrica) a casa vira um losango mais baixo e o raio LOCAL (`slotInradius`) a deixaria
// vazar sobre as vizinhas. Sem transform é igual a `slotInradius`. Medida em WORLD — é o
// raio de desenho/toque da ficha; `slotInradius` fica para quem mede em LOCAL.
export function slotScreenInradius(grid: GridShape): number {
  const slot: SlotCoord =
    grid.kind === "square" ? { kind: "square", col: 0, row: 0 } : { kind: "hex", q: 0, r: 0 };
  const c = slotToWorld(slot, grid);
  const corners = slotCorners(slot, grid);
  let min = Infinity;
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const len = Math.hypot(ex, ey);
    if (len === 0) continue;
    const d = Math.abs(ex * (c.y - a.y) - ey * (c.x - a.x)) / len;
    if (d < min) min = d;
  }
  return Number.isFinite(min) ? min : slotInradius(grid);
}

// Converts a stack-cascade offset (§7.2 — dx/dy as a FRACTION of the inradius,
// from `stackOffsets`) to px, scaled to this grid's cell size. `PieceSprite`
// (its container position) and `PiecesLayer`'s hold-progress ring both call
// this — one conversion, so the ring drawn over a stacked piece can never
// drift from the token itself.
export function stackOffsetToPx(
  offset: { dx: number; dy: number } | undefined,
  grid: GridShape,
): XY {
  const inradius = slotScreenInradius(grid);
  return { x: (offset?.dx ?? 0) * inradius, y: (offset?.dy ?? 0) * inradius };
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
  const pivot = gridPivot(startGrid);
  const cx = pivot.x + (startGrid.originX ?? 0);
  const cy = pivot.y + (startGrid.originY ?? 0);

  if (handle === "rotate") {
    // O desenho da esfera fica no raio centro→TC já achatado; desfaz o achatamento
    // (÷ skewRatio) para medir o ângulo no espaço da rotação e evitar o "pulo".
    const angle = Math.atan2((worldY - cy) / startGrid.skewRatio, worldX - cx) * (180 / Math.PI) + 90;
    // Normaliza para (-180, 180] (faixa do painel) e arredonda a 0.1°.
    let rotation = Math.round(angle * 10) / 10;
    rotation = ((((rotation + 180) % 360) + 360) % 360) - 180;
    if (rotation === -180) rotation = 180;
    return { ...startGrid, rotation: Math.round(rotation * 10) / 10 };
  }

  if (shiftKey && (handle === "TC" || handle === "BC")) {
    // A alça fica sob o cursor em y: world.y = originY + pivôY + ry·s, onde ry é o
    // y da alça girada (antes do achatamento) em relação ao pivô.
    const { x: pivotX, y: pivotY } = gridPivot(startGrid);
    const h = gridHandleLocal(handle, startGrid);
    const t = startGrid.rotation * (Math.PI / 180);
    const ry = (h.x - pivotX) * Math.sin(t) + (h.y - pivotY) * Math.cos(t);
    if (Math.abs(ry) < 1e-9) return null;
    const ratio = Math.max(0.3, Math.min(1.0, (worldY - (startGrid.originY ?? 0) - pivotY) / ry));
    return { ...startGrid, skewRatio: Math.round(ratio * 100) / 100 };
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

// Conversão offset (odd-r) → axial. A grade hex é armazenada e percorrida em
// coordenadas de offset (col, row), mas toda a matemática de hex.ts é axial (q, r).
// Esta é a única ponte entre os dois; isSlotInBounds faz o caminho inverso.
export function offsetToAxial(col: number, row: number): { q: number; r: number } {
  return { q: col - Math.floor(row / 2), r: row };
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

// Igualdade estrutural de slot. Substitui a comparação por JSON.stringify que existia
// espalhada pelo código: aquela dependia da ordem de inserção das chaves, então dois
// slots iguais escritos em ordens diferentes comparavam como distintos.
export function isSameSlot(a: SlotCoord, b: SlotCoord): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind === "square"
    ? a.col === (b as typeof a).col && a.row === (b as typeof a).row
    : a.q === (b as typeof a).q && a.r === (b as typeof a).r;
}

/**
 * Tripla do wire de combate (`move.from`/`move.position`): `[col, row, z]` no quadrado e
 * `[q, r, z]` no hex — o contrato ainda não tem forma hexagonal própria, e o servidor
 * preserva o `kind` da peça ao aplicar o movimento.
 */
export type SlotTriple = [number, number, number];

export function slotToTriple(slot: SlotCoord, z: number): SlotTriple {
  return slot.kind === "square" ? [slot.col, slot.row, z] : [slot.q, slot.r, z];
}

export function tripleToSlot(t: SlotTriple, kind: GridShape["kind"]): SlotCoord {
  return kind === "square" ? { kind: "square", col: t[0], row: t[1] } : { kind: "hex", q: t[0], r: t[1] };
}
