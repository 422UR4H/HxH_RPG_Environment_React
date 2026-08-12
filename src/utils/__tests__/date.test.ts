import { describe, it, expect } from "vitest";
import { formatDateBR, formatDateTimeBR, toDateInputValue } from "../date";

describe("formatDateBR", () => {
  it("case 1: formats a full ISO datetime with timezone as dd/mm/aaaa", () => {
    expect(formatDateBR("2026-08-09T14:30:00Z")).toBe("09/08/2026");
  });

  it("case 2: formats a date-only ISO string as dd/mm/aaaa", () => {
    expect(formatDateBR("2026-08-09")).toBe("09/08/2026");
  });

  it("case 3: does not shift the day across timezones (late UTC time stays on the same calendar day)", () => {
    expect(formatDateBR("2026-08-09T23:00:00Z")).toBe("09/08/2026");
  });

  it("case 4: returns empty string for an empty string", () => {
    expect(formatDateBR("")).toBe("");
  });

  it("case 5: returns empty string for undefined", () => {
    expect(formatDateBR(undefined)).toBe("");
  });

  it("case 6: returns empty string for null", () => {
    expect(formatDateBR(null)).toBe("");
  });

  it("case 7: returns empty string for a malformed string without throwing", () => {
    expect(() => formatDateBR("not-a-date")).not.toThrow();
    expect(formatDateBR("not-a-date")).toBe("");
  });
});

describe("formatDateTimeBR", () => {
  it("case 1: formats a full ISO datetime with timezone as dd/mm/aaaa às HH:mm", () => {
    expect(formatDateTimeBR("2026-08-09T14:30:00Z")).toBe("09/08/2026 às 14:30");
  });

  it("case 2: formats a date-only ISO string without a time suffix", () => {
    expect(formatDateTimeBR("2026-08-09")).toBe("09/08/2026");
  });

  it("case 3: does not shift the day across timezones (late UTC time stays on the same calendar day)", () => {
    expect(formatDateTimeBR("2026-08-09T23:00:00Z")).toBe("09/08/2026 às 23:00");
  });

  it("case 4: returns empty string for an empty string", () => {
    expect(formatDateTimeBR("")).toBe("");
  });

  it("case 5: returns empty string for undefined", () => {
    expect(formatDateTimeBR(undefined)).toBe("");
  });

  it("case 6: returns empty string for null", () => {
    expect(formatDateTimeBR(null)).toBe("");
  });

  it("case 7: returns empty string for a malformed string without throwing", () => {
    expect(() => formatDateTimeBR("not-a-date")).not.toThrow();
    expect(formatDateTimeBR("not-a-date")).toBe("");
  });
});

describe("toDateInputValue", () => {
  it("case 1: extracts the date part from a full ISO datetime with timezone as aaaa-mm-dd", () => {
    expect(toDateInputValue("2026-08-09T14:30:00Z")).toBe("2026-08-09");
  });

  it("case 2: passes through a date-only ISO string unchanged", () => {
    expect(toDateInputValue("2026-08-09")).toBe("2026-08-09");
  });

  it("case 3: does not shift the day across timezones (late UTC time stays on the same calendar day)", () => {
    expect(toDateInputValue("2026-08-09T23:00:00Z")).toBe("2026-08-09");
  });

  it("case 4: returns empty string for an empty string", () => {
    expect(toDateInputValue("")).toBe("");
  });

  it("case 5: returns empty string for undefined", () => {
    expect(toDateInputValue(undefined)).toBe("");
  });

  it("case 6: returns empty string for null", () => {
    expect(toDateInputValue(null)).toBe("");
  });

  it("case 7: returns empty string for a malformed string without throwing", () => {
    expect(() => toDateInputValue("not-a-date")).not.toThrow();
    expect(toDateInputValue("not-a-date")).toBe("");
  });
});
