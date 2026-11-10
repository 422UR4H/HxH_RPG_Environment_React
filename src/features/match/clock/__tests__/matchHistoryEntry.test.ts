import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  backStepsToMatchPage,
  consumeEndedNotice,
  flagEndedNotice,
  rememberMatchPageEntry,
} from "../matchHistoryEntry";

// O React Router guarda a posição da entrada em `history.state.idx`.
function setIdx(idx: unknown) {
  window.history.replaceState(idx === undefined ? null : { idx }, "");
}

describe("matchHistoryEntry", () => {
  beforeEach(() => {
    sessionStorage.clear();
    setIdx(undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the steps back to the remembered match page entry", () => {
    setIdx(1);
    rememberMatchPageEntry("m1");
    setIdx(3);
    expect(backStepsToMatchPage("m1")).toBe(-2);
  });

  it("returns null without a remembered entry", () => {
    setIdx(3);
    expect(backStepsToMatchPage("m1")).toBeNull();
  });

  it("returns null when the remembered entry is not behind the current one", () => {
    setIdx(3);
    rememberMatchPageEntry("m1");
    expect(backStepsToMatchPage("m1")).toBeNull();
    setIdx(2);
    expect(backStepsToMatchPage("m1")).toBeNull();
  });

  it("keeps entries per match", () => {
    setIdx(1);
    rememberMatchPageEntry("m1");
    setIdx(3);
    expect(backStepsToMatchPage("m2")).toBeNull();
  });

  it("the latest visit refreshes the remembered entry", () => {
    setIdx(1);
    rememberMatchPageEntry("m1");
    setIdx(4);
    rememberMatchPageEntry("m1");
    setIdx(6);
    expect(backStepsToMatchPage("m1")).toBe(-2);
  });

  it("ignores a history state without a numeric idx", () => {
    window.history.replaceState({ idx: "1" }, "");
    rememberMatchPageEntry("m1");
    setIdx(3);
    expect(backStepsToMatchPage("m1")).toBeNull();
    setIdx(1);
    rememberMatchPageEntry("m1");
    setIdx(undefined);
    expect(backStepsToMatchPage("m1")).toBeNull();
  });

  it("the ended notice is read once", () => {
    expect(consumeEndedNotice("m1")).toBe(false);
    flagEndedNotice("m1");
    expect(consumeEndedNotice("m2")).toBe(false);
    expect(consumeEndedNotice("m1")).toBe(true);
    expect(consumeEndedNotice("m1")).toBe(false);
  });

  it("storage failures are a no-op", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    setIdx(1);
    expect(() => rememberMatchPageEntry("m1")).not.toThrow();
    expect(() => flagEndedNotice("m1")).not.toThrow();
    setIdx(3);
    expect(backStepsToMatchPage("m1")).toBeNull();
    expect(consumeEndedNotice("m1")).toBe(false);
  });
});
