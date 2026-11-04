import { describe, it, expect } from "vitest";
import { focusFrame, FOCUS_CELLS } from "../focusFrame";

const view = { width: 576, height: 1000 };

describe("focusFrame", () => {
  it("centers on a single piece", () => {
    const { center } = focusFrame([{ x: 300, y: 500 }], 64, view, 0.3);
    expect(center).toEqual({ x: 300, y: 500 });
  });

  it("fits about 9 cells across the shorter side", () => {
    expect(FOCUS_CELLS).toBe(9);
    const { scale } = focusFrame([{ x: 300, y: 500 }], 64, view, 0.3);
    expect(scale).toBe(1);
  });

  it("never zooms out past the whole-map fit", () => {
    const { scale } = focusFrame([{ x: 300, y: 500 }], 64, view, 1.2);
    expect(scale).toBe(1.2);
  });

  it("frames the bounding box of several pieces", () => {
    const { center, scale } = focusFrame(
      [{ x: 0, y: 0 }, { x: 20 * 64, y: 0 }],
      64,
      view,
      0.25,
    );
    expect(center).toEqual({ x: 10 * 64, y: 0 });
    expect(scale).toBeCloseTo(576 / (20 * 64), 5);
  });

  it("clamps to 1.75", () => {
    const { scale } = focusFrame([{ x: 0, y: 0 }], 64, { width: 2000, height: 2000 }, 0.3);
    expect(scale).toBe(1.75);
  });
});
