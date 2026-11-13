import { describe, expect, it } from "vitest";
import { chipRowBreaks } from "../chipRows";

const rowSizes = (n: number) => {
  const b = [0, ...[...chipRowBreaks(n)].sort((a, c) => a - c), n];
  return b.slice(1).map((v, i) => v - b[i]);
};

describe("chipRowBreaks", () => {
  it("keeps the equal grid for multiples of 3", () => {
    expect(chipRowBreaks(3).size).toBe(0);
    expect(chipRowBreaks(6).size).toBe(0);
  });

  it.each([
    [7, [4, 3]],
    [10, [4, 3, 3]],
    [11, [4, 4, 3]],
    [13, [4, 3, 3, 3]],
  ])("splits %i chapters in order into %j", (n, sizes) => {
    expect(rowSizes(n)).toEqual(sizes);
  });
});
