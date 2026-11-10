import { describe, it, expect } from "vitest";
import {
  addSeconds, compareStory, diffSeconds, formatDateBR, formatDelta, formatStory, formatTime, parseStory,
} from "../storyTime";

describe("parseStory / formatStory", () => {
  it("round-trips a naive timestamp", () => {
    const p = parseStory("2000-01-01T08:30:05");
    expect(p).toEqual({ y: 2000, mo: 1, d: 1, h: 8, mi: 30, s: 5 });
    expect(formatStory(p)).toBe("2000-01-01T08:30:05");
  });

  it("rejects Z and offsets", () => {
    expect(() => parseStory("2000-01-01T08:30:00Z")).toThrow();
    expect(() => parseStory("2000-01-01T08:30:00+03:00")).toThrow();
    expect(() => parseStory("2000-01-01T08:30:00-03:00")).toThrow();
    expect(() => parseStory("garbage")).toThrow();
  });
});

describe("addSeconds", () => {
  it("rolls over the day", () => {
    expect(addSeconds("2000-01-01T23:59:59", 1)).toBe("2000-01-02T00:00:00");
  });
  it("rolls over month and year", () => {
    expect(addSeconds("2000-01-31T23:59:59", 1)).toBe("2000-02-01T00:00:00");
    expect(addSeconds("1999-12-31T23:59:59", 1)).toBe("2000-01-01T00:00:00");
  });
  it("handles the leap day of 2000", () => {
    expect(addSeconds("2000-02-28T23:59:59", 1)).toBe("2000-02-29T00:00:00");
    expect(addSeconds("2000-02-29T23:59:59", 1)).toBe("2000-03-01T00:00:00");
    expect(addSeconds("1900-02-28T23:59:59", 1)).toBe("1900-03-01T00:00:00");
  });
  it("goes back across midnight", () => {
    expect(addSeconds("2000-01-01T00:00:00", -1)).toBe("1999-12-31T23:59:59");
    expect(addSeconds("2000-03-01T00:00:10", -3600)).toBe("2000-02-29T23:00:10");
  });
  it("adds multiple days", () => {
    expect(addSeconds("2000-01-01T08:30:00", 2 * 86400)).toBe("2000-01-03T08:30:00");
  });
});

describe("diffSeconds / compareStory", () => {
  it("is a minus b", () => {
    expect(diffSeconds("2000-01-02T00:00:00", "2000-01-01T23:00:00")).toBe(3600);
    expect(diffSeconds("2000-01-01T23:00:00", "2000-01-02T00:00:00")).toBe(-3600);
    expect(diffSeconds("2000-03-01T00:00:00", "2000-02-28T00:00:00")).toBe(2 * 86400);
  });
  it("compares", () => {
    expect(compareStory("2000-01-01T08:00:00", "2000-01-01T09:00:00")).toBe(-1);
    expect(compareStory("2000-01-01T09:00:00", "2000-01-01T08:00:00")).toBe(1);
    expect(compareStory("2000-01-01T09:00:00", "2000-01-01T09:00:00")).toBe(0);
  });
});

describe("formatting", () => {
  it("formats date and time", () => {
    expect(formatDateBR("2000-01-01T08:30:00")).toBe("01/01/2000");
    expect(formatTime("2000-01-01T08:30:00")).toBe("08:30:00");
  });
  it("formats deltas", () => {
    expect(formatDelta(2 * 3600 + 10 * 60)).toBe("+2 h 10 min");
    expect(formatDelta(-15 * 60)).toBe("−15 min");
    expect(formatDelta(86400 + 2 * 3600)).toBe("+1 dia 2 h");
    expect(formatDelta(2 * 86400)).toBe("+2 dias");
    expect(formatDelta(45)).toBe("+45 s");
    expect(formatDelta(0)).toBe("0 s");
  });
});
