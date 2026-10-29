import { describe, expect, it } from "vitest";
import { computePopoverPlacement } from "./popoverPlacement";

const popover = { width: 320, height: 431 };

describe("computePopoverPlacement", () => {
  it("opens below the field when it fits below", () => {
    const r = computePopoverPlacement({
      field: { top: 100, bottom: 156, left: 40 },
      popover,
      viewport: { width: 1366, height: 768 },
    });
    expect(r).toEqual({ top: 162, left: 40 });
  });

  it("opens above when only above fits", () => {
    const r = computePopoverPlacement({
      field: { top: 560, bottom: 616, left: 40 },
      popover,
      viewport: { width: 1366, height: 768 },
    });
    expect(r.top).toBe(560 - 6 - 431);
  });

  it("clamps inside the viewport when neither side fits", () => {
    const r = computePopoverPlacement({
      field: { top: 289, bottom: 345, left: 40 },
      popover,
      viewport: { width: 853, height: 533 },
    });
    expect(r.top).toBe(533 - 431 - 8);
    expect(r.top + popover.height).toBeLessThanOrEqual(533 - 8);
  });

  it("never goes above the top when taller than the viewport", () => {
    const r = computePopoverPlacement({
      field: { top: 100, bottom: 156, left: 40 },
      popover: { width: 320, height: 600 },
      viewport: { width: 853, height: 533 },
    });
    expect(r.top).toBe(8);
  });

  it("clamps the left edge 8px from the right border", () => {
    const r = computePopoverPlacement({
      field: { top: 100, bottom: 156, left: 700 },
      popover,
      viewport: { width: 853, height: 768 },
    });
    expect(r.left).toBe(853 - 8 - 320);
  });
});
