import { describe, expect, it } from "vitest";
import { computeAttachedListPlacement, computePopoverPlacement } from "./popoverPlacement";

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

describe("computeAttachedListPlacement", () => {
  const viewportHeight = 768;

  it("opens below, flush with the field, when it fits", () => {
    expect(
      computeAttachedListPlacement({
        field: { top: 100, bottom: 156 },
        listHeight: 300,
        viewportHeight,
      }),
    ).toEqual({ side: "below", top: 156, height: 300 });
  });

  it("opens above when below does not fit and above has more room", () => {
    expect(
      computeAttachedListPlacement({
        field: { top: 600, bottom: 656 },
        listHeight: 300,
        viewportHeight,
      }),
    ).toEqual({ side: "above", bottom: 768 - 600, height: 300 });
  });

  it("caps the height at the room minus 8 px and scrolls inside", () => {
    const below = computeAttachedListPlacement({
      field: { top: 100, bottom: 156 },
      listHeight: 900,
      viewportHeight,
    });
    expect(below).toEqual({ side: "below", top: 156, height: 768 - 156 - 8 });

    const above = computeAttachedListPlacement({
      field: { top: 620, bottom: 676 },
      listHeight: 900,
      viewportHeight,
    });
    expect(above).toEqual({ side: "above", bottom: 768 - 620, height: 612 });
  });

  it("stays below when both sides are equally tight", () => {
    const r = computeAttachedListPlacement({
      field: { top: 380, bottom: 388 },
      listHeight: 900,
      viewportHeight,
    });
    expect(r.side).toBe("below");
  });
});
