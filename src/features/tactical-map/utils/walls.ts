import type { GridShape, WallSegment } from "../../../types/tacticalMap";
import { hexToPixel } from "./hex";

export function collectGridSnapPoints(grid: GridShape): [number, number][] {
  const pts: [number, number][] = [];
  if (grid.kind === "square") {
    const { cols, rows, cellSize } = grid;
    // Vertices
    for (let r = 0; r <= rows; r++)
      for (let c = 0; c <= cols; c++)
        pts.push([c * cellSize, r * cellSize]);
    // Horizontal edge midpoints
    for (let r = 0; r <= rows; r++)
      for (let c = 0; c < cols; c++)
        pts.push([(c + 0.5) * cellSize, r * cellSize]);
    // Vertical edge midpoints
    for (let r = 0; r < rows; r++)
      for (let c = 0; c <= cols; c++)
        pts.push([c * cellSize, (r + 0.5) * cellSize]);
  } else {
    const { cols, rows, cellSize } = grid;
    for (let r = 0; r < rows; r++) {
      for (let q = 0; q < cols; q++) {
        const center = hexToPixel({ q, r }, cellSize);
        pts.push([center.x, center.y]);
        for (let i = 0; i < 6; i++) {
          const angle = ((60 * i - 30) * Math.PI) / 180;
          pts.push([center.x + cellSize * Math.cos(angle), center.y + cellSize * Math.sin(angle)]);
        }
      }
    }
  }
  return pts;
}

// localPos in local (pre-transform) grid space. Returns best snap or localPos.
export function snapWallPoint(
  localPos: [number, number],
  grid: GridShape,
  thresholdLocal = 15,
): [number, number] {
  const candidates = collectGridSnapPoints(grid);
  let bestSq = thresholdLocal * thresholdLocal;
  let best: [number, number] = localPos;
  for (const c of candidates) {
    const dx = c[0] - localPos[0], dy = c[1] - localPos[1];
    const dSq = dx * dx + dy * dy;
    if (dSq < bestSq) { bestSq = dSq; best = c; }
  }
  return best;
}

type WallAttrs = Omit<WallSegment, "id" | "p1" | "p2">;

// Splits segment p1→p2 at every grid snap point that lies on it.
// Returns [] for zero-length segment.
export function explodePolyline(
  p1: [number, number],
  p2: [number, number],
  attrs: WallAttrs,
  grid: GridShape,
  eps = 0.01,
): WallSegment[] {
  const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq < eps * eps) return [];

  const candidates = collectGridSnapPoints(grid);
  const intermediates: { t: number; p: [number, number] }[] = [];
  for (const c of candidates) {
    const cx = c[0] - p1[0], cy = c[1] - p1[1];
    const t = (cx * dx + cy * dy) / lenSq;
    if (t <= eps || t >= 1 - eps) continue;
    const dist = Math.abs(cx * dy - cy * dx) / Math.sqrt(lenSq);
    if (dist < eps) intermediates.push({ t, p: c });
  }
  intermediates.sort((a, b) => a.t - b.t);

  const verts: [number, number][] = [p1, ...intermediates.map((x) => x.p), p2];
  return verts.slice(0, -1).map((start, i) => ({
    ...attrs,
    id: crypto.randomUUID(),
    p1: start,
    p2: verts[i + 1],
  }));
}
