import { describe, it, expect } from "vitest";
import { collectGridSnapPoints, snapWallPoint, explodePolyline, isMovementBlocked } from "../walls";
import type { GridShape, WallSegment } from "../../../../types/tacticalMap";

const sq = (cellSize = 64): GridShape => ({
  kind: "square", cols: 4, rows: 4, cellSize,
  skewRatio: 1, rotation: 0, color: "#fff", opacity: 1, lineStyle: "solid",
});

const wallAttrs = {
  wallType: "wall" as const, material: "stone" as const,
  move: true, sense: "full" as const, direction: "both" as const,
  open: false, locked: false, hp: 100, maxHp: 100, resistance: 5, destroyed: false,
};

describe("collectGridSnapPoints — square", () => {
  it("includes all grid vertices", () => {
    const pts = collectGridSnapPoints(sq(64));
    const vertices = pts.filter(([x, y]) => x % 64 === 0 && y % 64 === 0);
    // (cols+1)*(rows+1) = 5*5 = 25
    expect(vertices.length).toBe(25);
  });
  it("includes horizontal edge midpoints", () => {
    const pts = collectGridSnapPoints(sq(64));
    expect(pts.some(([x, y]) => x === 32 && y === 0)).toBe(true);
  });
  it("includes vertical edge midpoints", () => {
    const pts = collectGridSnapPoints(sq(64));
    expect(pts.some(([x, y]) => x === 0 && y === 32)).toBe(true);
  });
});

describe("snapWallPoint", () => {
  it("snaps to nearest vertex within threshold", () => {
    expect(snapWallPoint([66, 2], sq(), 15)).toEqual([64, 0]);
  });
  it("returns null when no candidate within threshold", () => {
    // (32,32) is the center of cell (0,0); nearest snap is 32px away — outside threshold of 10
    expect(snapWallPoint([32, 32], sq(), 10)).toBeNull();
  });
  it("snaps to edge midpoint", () => {
    // (33,1) is near the horizontal midpoint (32,0)
    expect(snapWallPoint([33, 1], sq(), 15)).toEqual([32, 0]);
  });
  it("picks closest of two nearby candidates", () => {
    // (63,0): dist to (64,0)=1; dist to (32,0)=31 → (64,0) wins
    expect(snapWallPoint([63, 0], sq(), 15)).toEqual([64, 0]);
  });
});

describe("explodePolyline", () => {
  it("returns single segment when no intermediate snap on diagonal", () => {
    const segs = explodePolyline([0, 0], [64, 64], wallAttrs, sq());
    expect(segs).toHaveLength(1);
    expect(segs[0].p1).toEqual([0, 0]);
    expect(segs[0].p2).toEqual([64, 64]);
  });
  it("splits horizontal line at vertices + midpoints", () => {
    // (0,0)→(128,0): intermediates at (32,0) t=0.25, (64,0) t=0.5, (96,0) t=0.75
    const segs = explodePolyline([0, 0], [128, 0], wallAttrs, sq());
    expect(segs).toHaveLength(4);
    expect(segs[0].p2).toEqual([32, 0]);
    expect(segs[1].p1).toEqual([32, 0]);
    expect(segs[1].p2).toEqual([64, 0]);
    expect(segs[2].p2).toEqual([96, 0]);
    expect(segs[3].p2).toEqual([128, 0]);
  });
  it("assigns unique ids to every segment", () => {
    const segs = explodePolyline([0, 0], [128, 0], wallAttrs, sq());
    expect(new Set(segs.map((s) => s.id)).size).toBe(segs.length);
  });
  it("returns empty array for zero-length segment", () => {
    expect(explodePolyline([0, 0], [0, 0], wallAttrs, sq())).toHaveLength(0);
  });
  it("inherits all provided attrs", () => {
    const segs = explodePolyline([0, 0], [64, 0], wallAttrs, sq());
    expect(segs[0].wallType).toBe("wall");
    expect(segs[0].material).toBe("stone");
    expect(segs[0].hp).toBe(100);
  });
});

function seg(p1: [number, number], p2: [number, number], overrides: Partial<WallSegment> = {}): WallSegment {
  return {
    id: "w", p1, p2,
    wallType: "wall", material: "stone",
    move: true, open: false, locked: false,
    sense: "full", direction: "both",
    hp: 100, maxHp: 100, resistance: 5, destroyed: false,
    ...overrides,
  };
}

describe("isMovementBlocked", () => {
  it("returns false with no walls", () => {
    expect(isMovementBlocked([0, 0], [100, 0], [])).toBe(false);
  });

  it("returns true when path crosses a blocking wall", () => {
    // vertical wall at x=50; path goes horizontally through it
    const w = seg([50, 0], [50, 100]);
    expect(isMovementBlocked([0, 50], [100, 50], [w])).toBe(true);
  });

  it("returns false for parallel wall", () => {
    const w = seg([0, 20], [100, 20]);
    expect(isMovementBlocked([0, 50], [100, 50], [w])).toBe(false);
  });

  it("returns false for open door", () => {
    const w = seg([50, 0], [50, 100], { wallType: "door", open: true });
    expect(isMovementBlocked([0, 50], [100, 50], [w])).toBe(false);
  });

  it("returns false for wall with move=false", () => {
    const w = seg([50, 0], [50, 100], { move: false });
    expect(isMovementBlocked([0, 50], [100, 50], [w])).toBe(false);
  });

  it("direction=left does not block from the right side", () => {
    // wall vector p1→p2: (50,0)→(50,100) points downward.
    // from=(100,50) is to the RIGHT → NOT blocked by direction=left wall.
    const w = seg([50, 0], [50, 100], { direction: "left" });
    expect(isMovementBlocked([100, 50], [0, 50], [w])).toBe(false);
  });

  it("direction=left blocks from the left side", () => {
    // from=(0,50) is to the LEFT → blocked
    const w = seg([50, 0], [50, 100], { direction: "left" });
    expect(isMovementBlocked([0, 50], [100, 50], [w])).toBe(true);
  });
});
