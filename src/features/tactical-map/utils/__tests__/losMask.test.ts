import { describe, it, expect } from "vitest";
import { applyLosMask, type MaskableContainer, type MaskSource } from "../losMask";

const mask = {} as MaskSource;
const otherMask = {} as MaskSource;

function fakeContainer(overrides: Partial<MaskableContainer> = {}) {
  const calls: Array<{ mask: MaskSource; inverse: boolean }> = [];
  const c: MaskableContainer = {
    mask: null,
    setMask(options) {
      calls.push({ mask: options.mask, inverse: options.inverse });
      c.mask = options.mask;
    },
    ...overrides,
  };
  return { c, calls };
}

describe("applyLosMask", () => {
  it("applies the mask once with the requested inverse flag", () => {
    const { c, calls } = fakeContainer();
    applyLosMask(c, mask, true);
    expect(calls).toEqual([{ mask, inverse: true }]);
  });

  it("does not reapply an identical mask on every render", () => {
    const { c, calls } = fakeContainer();
    applyLosMask(c, mask, false);
    applyLosMask(c, mask, false);
    applyLosMask(c, mask, false);
    expect(calls.length).toBe(1);
  });

  it("reapplies when the mask instance changes", () => {
    const { c, calls } = fakeContainer();
    applyLosMask(c, mask, false);
    applyLosMask(c, otherMask, false);
    expect(calls.length).toBe(2);
  });

  it("is a no-op while either ref is still null", () => {
    const { c, calls } = fakeContainer();
    applyLosMask(null, mask, true);
    applyLosMask(c, null, true);
    expect(calls.length).toBe(0);
  });

  it("throws when setMask is unavailable instead of silently rendering wrong", () => {
    // A missing setMask means no mask at all. For the fog that reads as "the whole
    // board is dark"; for the walls, "every wall vanished". Neither logs anything, so
    // the failure has to be loud here.
    const broken = { mask: null } as unknown as MaskableContainer;
    expect(() => applyLosMask(broken, mask, true)).toThrow(/setMask/);
  });
});
