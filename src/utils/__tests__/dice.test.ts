import { describe, expect, it } from "vitest";
import { formatDamage } from "../dice";

describe("formatDamage", () => {
  it.each([
    [[12, 12], 3, "2 D12 +3"],
    [[4, 12], 1, "D12 + D4 +1"],
    [[6], 0, "D6"],
    [[6, 12, 12], 3, "2 D12 + D6 +3"],
    [[4, 4, 8], 0, "D8 + 2 D4"],
    [[6], -2, "D6 -2"],
  ])("formats %j + %i as %s", (dice, flat, expected) => {
    expect(formatDamage(dice, flat)).toBe(expected);
  });
});
