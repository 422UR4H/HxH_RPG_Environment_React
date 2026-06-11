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

// ─── Overlap resolution ───────────────────────────────────────────────────────
//
// When new segments are drawn on top of existing collinear segments:
//   • Same material+type overlap  → keep existing (idempotent, no duplicate)
//   • Different material overlap  → new segment replaces old (split old at boundaries)
//   • Partial overlap             → only the covered portion is replaced/ignored;
//                                   non-overlapping parts of the old segment survive

export type OverlapResult = {
  toAdd: WallSegment[];
  toRemove: Set<string>;
};

export function resolveOverlaps(
  newSegments: WallSegment[],
  existingWalls: WallSegment[],
  eps = 2.0,
): OverlapResult {
  const toRemove = new Set<string>();
  const toAdd: WallSegment[] = [];
  // Working snapshot updated each iteration so later segments see earlier ones
  let working = [...existingWalls];

  for (const sNew of newSegments) {
    const dx = sNew.p2[0] - sNew.p1[0], dy = sNew.p2[1] - sNew.p1[1];
    const L = Math.hypot(dx, dy);
    if (L < eps) continue;
    const ux = dx / L, uy = dy / L;

    // Project a point onto sNew's 1-D axis (distance from p1 along direction)
    const proj = (p: [number, number]) =>
      (p[0] - sNew.p1[0]) * ux + (p[1] - sNew.p1[1]) * uy;
    // World position at parameter t along sNew's line
    const atT = (t: number): [number, number] =>
      [sNew.p1[0] + t * ux, sNew.p1[1] + t * uy];
    // Perpendicular distance from p to sNew's infinite line
    const lineDist = (p: [number, number]) =>
      Math.abs((p[0] - sNew.p1[0]) * uy - (p[1] - sNew.p1[1]) * ux);

    // Collect all existing segments collinear + overlapping with sNew
    type Overlap = { wall: WallSegment; ovMin: number; ovMax: number; forward: boolean };
    const overlaps: Overlap[] = [];

    for (const sOld of working) {
      if (toRemove.has(sOld.id)) continue;
      const d2x = sOld.p2[0] - sOld.p1[0], d2y = sOld.p2[1] - sOld.p1[1];
      const L2 = Math.hypot(d2x, d2y);
      if (L2 < eps) continue;
      // Parallel check: |cross(unit_new, unit_old)| < tolerance
      if (Math.abs(ux * (d2y / L2) - uy * (d2x / L2)) > 0.1) continue;
      // Collinearity check: p1 of old on sNew's line
      if (lineDist(sOld.p1) > eps) continue;

      const t1 = proj(sOld.p1), t2 = proj(sOld.p2);
      const wMin = Math.min(t1, t2), wMax = Math.max(t1, t2);
      const ovMin = Math.max(0, wMin), ovMax = Math.min(L, wMax);
      if (ovMax - ovMin < eps) continue;

      overlaps.push({ wall: sOld, ovMin, ovMax, forward: t1 <= t2 });
    }

    if (overlaps.length === 0) {
      toAdd.push(sNew);
      working.push(sNew);
      continue;
    }

    // Build the coverage map: intervals of sNew [0,L] covered by same-material segments
    // (those intervals will be skipped in the new segment; different-material intervals replace)
    const sameCoverage: Array<[number, number]> = [];
    const newPieces: WallSegment[] = []; // remnants of split old segments

    for (const { wall: sOld, ovMin, ovMax, forward } of overlaps) {
      const isSame = sOld.material === sNew.material && sOld.wallType === sNew.wallType;
      toRemove.add(sOld.id);

      const t1 = proj(sOld.p1), t2 = proj(sOld.p2);
      const wMin = Math.min(t1, t2), wMax = Math.max(t1, t2);

      // Left remnant of sOld (before sNew starts)
      if (ovMin - wMin > eps) {
        const leftStart = forward ? sOld.p1 : sOld.p2;
        newPieces.push({ ...sOld, id: crypto.randomUUID(), p1: leftStart, p2: atT(ovMin) });
      }
      // Right remnant of sOld (after sNew ends)
      if (wMax - ovMax > eps) {
        const rightEnd = forward ? sOld.p2 : sOld.p1;
        newPieces.push({ ...sOld, id: crypto.randomUUID(), p1: atT(ovMax), p2: rightEnd });
      }

      if (isSame) {
        // Same material: keep existing — re-add the overlapping piece unchanged
        newPieces.push({ ...sOld, id: crypto.randomUUID(), p1: atT(ovMin), p2: atT(ovMax) });
        sameCoverage.push([ovMin, ovMax]);
      }
      // Different material: new segment replaces — handled below when adding sNew's intervals
    }

    // Add the portions of sNew NOT covered by same-material segments
    sameCoverage.sort((a, b) => a[0] - b[0]);
    let cursor = 0;
    for (const [covMin, covMax] of sameCoverage) {
      if (covMin - cursor > eps) {
        const id = cursor === 0 && covMin >= L ? sNew.id : crypto.randomUUID();
        toAdd.push({ ...sNew, id, p1: atT(cursor), p2: atT(covMin) });
      }
      cursor = Math.max(cursor, covMax);
    }
    if (L - cursor > eps) {
      toAdd.push({ ...sNew, id: sameCoverage.length === 0 ? sNew.id : crypto.randomUUID(),
        p1: atT(cursor), p2: atT(L) });
    }

    toAdd.push(...newPieces);
    // Update working set for next iteration
    working = working.filter(w => !toRemove.has(w.id));
    working.push(...newPieces);
    // Also push the new sNew pieces (those we just added to toAdd)
    // Recompute from toAdd to avoid double-tracking; simpler: snapshot from working
    for (const seg of toAdd) {
      if (!working.some(w => w.id === seg.id)) working.push(seg);
    }
  }

  return { toAdd, toRemove };
}
