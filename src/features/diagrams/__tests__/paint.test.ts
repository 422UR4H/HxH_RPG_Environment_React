import { describe, expect, it } from "vitest";
import { MENTAL_GEOMETRY, PHYSICAL_GEOMETRY } from "../geometry";
import { parsePaintSpec, resolvePaint } from "../paint";

const STRENGTH = "RES,AGI,Str,AGI-Str,Str-RES";

describe("diagram paint", () => {
  it("parses all and undefined as all", () => {
    expect(parsePaintSpec(undefined, PHYSICAL_GEOMETRY)).toBe("all");
    expect(parsePaintSpec("all", PHYSICAL_GEOMETRY)).toBe("all");
  });

  it("parses nodes and segments", () => {
    expect(parsePaintSpec(STRENGTH, PHYSICAL_GEOMETRY)).toEqual({
      nodes: ["RES", "AGI", "Str"],
      segments: [
        ["AGI", "Str"],
        ["Str", "RES"],
      ],
    });
  });

  it("rejects unknown node or non-adjacent segment", () => {
    expect(parsePaintSpec("XYZ", PHYSICAL_GEOMETRY)).toBeNull();
    expect(parsePaintSpec("RES-FLX", PHYSICAL_GEOMETRY)).toBeNull();
  });

  it("segment painting is order-insensitive", () => {
    const spec = parsePaintSpec(STRENGTH, PHYSICAL_GEOMETRY)!;
    const paint = resolvePaint(PHYSICAL_GEOMETRY, spec);
    expect(paint.isSegmentPainted("Str", "AGI")).toBe(true);
    expect(paint.isSegmentPainted("AGI", "Str")).toBe(true);
    expect(paint.isSegmentPainted("RES", "Con")).toBe(false);
    expect(paint.isNodePainted("RES")).toBe(true);
    expect(paint.isNodePainted("Con")).toBe(false);
  });

  it("computes bleeds for Força", () => {
    const spec = parsePaintSpec(STRENGTH, PHYSICAL_GEOMETRY)!;
    const { bleeds } = resolvePaint(PHYSICAL_GEOMETRY, spec);
    expect(bleeds).toHaveLength(2);
    const fromRes = bleeds.find((b) => b.from.x === 639.26)!;
    expect(fromRes.to.x).toBeCloseTo(708.5976, 3);
    expect(fromRes.to.y).toBeCloseTo(175.4928, 3);
    const fromAgi = bleeds.find((b) => b.from.x === 234.2)!;
    expect(fromAgi.to.x).toBeCloseTo(297.2912, 3);
    expect(fromAgi.to.y).toBeCloseTo(580.488, 3);
  });

  it("no bleeds when all", () => {
    const paint = resolvePaint(PHYSICAL_GEOMETRY, "all");
    expect(paint.all).toBe(true);
    expect(paint.bleeds).toEqual([]);
    expect(paint.isNodePainted("RES")).toBe(true);
    expect(paint.isSegmentPainted("RES", "Con")).toBe(true);
  });

  it("mental geometry has four nodes and no edge beads", () => {
    expect(MENTAL_GEOMETRY.nodes.map((n) => n.id)).toEqual(["RSL", "ADP", "JUD", "CRE"]);
    expect(MENTAL_GEOMETRY.segments).toHaveLength(4);
    expect(MENTAL_GEOMETRY.viewBox).toBe(PHYSICAL_GEOMETRY.viewBox);
  });
});
