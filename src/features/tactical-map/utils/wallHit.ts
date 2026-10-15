import type { GridShape, WallSegment } from "../../../types/tacticalMap";
import { applyTransform } from "./coords";

export function ptSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(ax + t * dx - px, ay + t * dy - py);
}

export function findNearestWall(localPos: [number, number], walls: WallSegment[], threshold: number): WallSegment | null {
  let best: WallSegment | null = null;
  let bestD = threshold;
  for (const w of walls) {
    const d = ptSegDist(localPos[0], localPos[1], w.p1[0], w.p1[1], w.p2[0], w.p2[1]);
    if (d < bestD) { bestD = d; best = w; }
  }
  return best;
}

// Versão em tela de findNearestWall: `world` em WORLD, `hitWorld` em pixels de mundo; as pontas
// das paredes (LOCAL) são transformadas antes da distância, então o acerto não encolhe no eixo achatado.
export function findNearestWallWorld(
  world: { x: number; y: number },
  walls: WallSegment[],
  grid: GridShape,
  hitWorld: number,
): WallSegment | null {
  let best: WallSegment | null = null;
  let bestD = hitWorld;
  for (const w of walls) {
    const a = applyTransform({ x: w.p1[0], y: w.p1[1] }, grid);
    const b = applyTransform({ x: w.p2[0], y: w.p2[1] }, grid);
    const d = ptSegDist(world.x, world.y, a.x, a.y, b.x, b.y);
    if (d < bestD) { bestD = d; best = w; }
  }
  return best;
}
