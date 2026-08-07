import { describe, it, expect } from "vitest";
import type { WallSegment } from "../../../../types/tacticalMap";
import { ptSegDist, findNearestWall } from "../wallHit";

// ─── Mock helper ───────────────────────────────────────────────────────────
const mockWall = (p1: [number, number], p2: [number, number]): WallSegment => ({
  id: "w1", p1, p2,
  wallType: "wall", material: "stone",
  move: true, sense: "full", direction: "both",
  open: false, locked: false, hp: 100, maxHp: 100, resistance: 5, destroyed: false,
});

// ─── ptSegDist tests ───────────────────────────────────────────────────────

describe("ptSegDist", () => {
  it("case 1: point on segment returns distance 0", () => {
    const result = ptSegDist(5, 0, 0, 0, 10, 0);
    expect(result).toBe(0);
  });

  it("case 2: point perpendicular to segment midpoint returns perpendicular distance", () => {
    const result = ptSegDist(5, 3, 0, 0, 10, 0);
    expect(result).toBe(3);
  });

  it("case 3: point beyond endpoint returns distance to endpoint", () => {
    const result = ptSegDist(20, 0, 0, 0, 10, 0);
    expect(result).toBe(10);
  });

  it("case 4: degenerate segment (p1 == p2) returns euclidean distance without NaN", () => {
    const result = ptSegDist(3, 4, 0, 0, 0, 0);
    expect(result).toBe(5); // 3-4-5 triangle
    expect(Number.isNaN(result)).toBe(false);
  });
});

// ─── findNearestWall tests ──────────────────────────────────────────────────

describe("findNearestWall", () => {
  it("case 5: empty wall list returns null", () => {
    const result = findNearestWall([5, 5], [], 100);
    expect(result).toBeNull();
  });

  it("case 6: two walls, one clearly closer, returns the closer one", () => {
    const wall1 = mockWall([0, 0], [10, 0]); // horizontal, close
    const wall2 = mockWall([0, 20], [10, 20]); // horizontal, far
    wall1.id = "w1";
    wall2.id = "w2";

    const result = findNearestWall([5, 3], [wall1, wall2], 100);
    expect(result).toBe(wall1);
    expect(result?.id).toBe("w1");
  });

  it("case 7: wall beyond threshold returns null (threshold is exclusive: d < bestD)", () => {
    const wall = mockWall([0, 0], [10, 0]);
    wall.id = "w1";

    // Point at distance 5 from wall, threshold 5 (exactly at boundary)
    // Since condition is d < bestD (strict <), d=5 is NOT < 5, so it should return null
    const result = findNearestWall([5, 5], [wall], 5);
    expect(result).toBeNull();
  });

  it("case 8: exact tie between two walls returns first wall (< strict preserves first)", () => {
    // Two walls equidistant from point
    const wall1 = mockWall([0, 0], [0, 10]); // vertical, distance 5 from [5, 5]
    const wall2 = mockWall([10, 0], [10, 10]); // vertical, distance 5 from [5, 5]
    wall1.id = "w1";
    wall2.id = "w2";

    // Point [5, 5] is distance 5 from both walls
    const result = findNearestWall([5, 5], [wall1, wall2], 100);
    expect(result).toBe(wall1); // First wall should win on tie
    expect(result?.id).toBe("w1");
  });
});
