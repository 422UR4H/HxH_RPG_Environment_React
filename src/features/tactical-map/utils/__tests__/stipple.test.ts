import { describe, it, expect } from "vitest";
import { drawStippledSegment, type StippleTarget } from "../stipple";

type Call =
  | { op: "moveTo"; x: number; y: number }
  | { op: "lineTo"; x: number; y: number }
  | { op: "stroke" }
  | { op: "setStrokeStyle"; style: { color: number; width: number; alpha: number } };

function recorder() {
  const calls: Call[] = [];
  const g: StippleTarget = {
    setStrokeStyle: (style) => calls.push({ op: "setStrokeStyle", style }),
    moveTo: (x, y) => calls.push({ op: "moveTo", x, y }),
    lineTo: (x, y) => calls.push({ op: "lineTo", x, y }),
    stroke: () => calls.push({ op: "stroke" }),
  };
  return { g, calls };
}

const dashPairs = (calls: Call[]) => {
  const pairs: Array<{ moveTo: Extract<Call, { op: "moveTo" }>; lineTo: Extract<Call, { op: "lineTo" }> }> = [];
  for (let i = 0; i < calls.length; i++) {
    if (calls[i].op === "moveTo") {
      pairs.push({
        moveTo: calls[i] as Extract<Call, { op: "moveTo" }>,
        lineTo: calls[i + 1] as Extract<Call, { op: "lineTo" }>,
      });
    }
  }
  return pairs;
};

describe("drawStippledSegment", () => {
  it("alternates dash and gap along a horizontal segment", () => {
    const { g, calls } = recorder();
    drawStippledSegment(g, { x: 0, y: 0 }, { x: 24, y: 0 }, {
      color: 0xffffff, width: 2, alpha: 1, dashLen: 8, gapLen: 4,
    });

    const pairs = dashPairs(calls);
    expect(pairs.length).toBe(2);
    expect(pairs[0].moveTo).toEqual({ op: "moveTo", x: 0, y: 0 });
    expect(pairs[0].lineTo).toEqual({ op: "lineTo", x: 8, y: 0 });
    expect(pairs[1].moveTo).toEqual({ op: "moveTo", x: 12, y: 0 });
    expect(pairs[1].lineTo).toEqual({ op: "lineTo", x: 20, y: 0 });
  });

  it("alternates dash and gap for the destroyed-wall style (extreme dash:gap ratio)", () => {
    const { g, calls } = recorder();
    drawStippledSegment(g, { x: 0, y: 0 }, { x: 16, y: 0 }, {
      color: 0xffffff, width: 2, alpha: 1, dashLen: 1, gapLen: 7,
    });

    const pairs = dashPairs(calls);
    expect(pairs.length).toBe(2);
    expect(pairs[0].moveTo).toEqual({ op: "moveTo", x: 0, y: 0 });
    expect(pairs[0].lineTo).toEqual({ op: "lineTo", x: 1, y: 0 });
    expect(pairs[1].moveTo).toEqual({ op: "moveTo", x: 8, y: 0 });
    expect(pairs[1].lineTo).toEqual({ op: "lineTo", x: 9, y: 0 });
  });

  it("draws a single dash ending at the segment end when the segment is shorter than one dash", () => {
    const { g, calls } = recorder();
    drawStippledSegment(g, { x: 0, y: 0 }, { x: 5, y: 0 }, {
      color: 0xffffff, width: 2, alpha: 1, dashLen: 8, gapLen: 4,
    });

    const pairs = dashPairs(calls);
    expect(pairs.length).toBe(1);
    expect(pairs[0].moveTo).toEqual({ op: "moveTo", x: 0, y: 0 });
    expect(pairs[0].lineTo).toEqual({ op: "lineTo", x: 5, y: 0 });
  });

  it("draws nothing for a near-zero-length segment", () => {
    const { g, calls } = recorder();
    drawStippledSegment(g, { x: 10, y: 10 }, { x: 10.05, y: 10 }, {
      color: 0xffffff, width: 2, alpha: 1, dashLen: 8, gapLen: 4,
    });

    expect(calls.length).toBe(0);
  });

  it("keeps the first dash length exactly dashLen on a diagonal segment", () => {
    const { g, calls } = recorder();
    drawStippledSegment(g, { x: 0, y: 0 }, { x: 30, y: 40 }, {
      color: 0xffffff, width: 2, alpha: 1, dashLen: 8, gapLen: 4,
    });

    const pairs = dashPairs(calls);
    const first = pairs[0];
    const len = Math.hypot(first.lineTo.x - first.moveTo.x, first.lineTo.y - first.moveTo.y);
    expect(len).toBeCloseTo(8);
  });

  it("passes alpha through to setStrokeStyle for every dash", () => {
    const { g, calls } = recorder();
    drawStippledSegment(g, { x: 0, y: 0 }, { x: 24, y: 0 }, {
      color: 0xff00ff, width: 3, alpha: 0.4, dashLen: 8, gapLen: 4,
    });

    const styles = calls.filter((c): c is Extract<Call, { op: "setStrokeStyle" }> => c.op === "setStrokeStyle");
    expect(styles.length).toBeGreaterThan(0);
    for (const s of styles) {
      expect(s.style.alpha).toBe(0.4);
      expect(s.style.color).toBe(0xff00ff);
      expect(s.style.width).toBe(3);
    }
  });
});
