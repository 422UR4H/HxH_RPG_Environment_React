import { describe, expect, it } from "vitest";
import { chapterMountOrder } from "../progressiveChapters";

describe("chapterMountOrder", () => {
  it("starts at the requested chapter and alternates below and above", () => {
    expect(chapterMountOrder(10, 3)).toEqual([3, 4, 2, 5, 1, 6, 0, 7, 8, 9]);
  });

  it("goes straight down from the first chapter and straight up from the last", () => {
    expect(chapterMountOrder(4, 0)).toEqual([0, 1, 2, 3]);
    expect(chapterMountOrder(4, 3)).toEqual([3, 2, 1, 0]);
  });

  it("falls back to the first chapter for an unknown start and handles no chapters", () => {
    expect(chapterMountOrder(3, -1)).toEqual([0, 1, 2]);
    expect(chapterMountOrder(0, 0)).toEqual([]);
  });
});
