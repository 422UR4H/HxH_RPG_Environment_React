import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  daysFromToday,
  daysFromTodayInstant,
  formatInstantDateBR,
  formatInstantDateTimeBR,
  instantToLocalInput,
  localInputToInstant,
  formatDateBR,
  todayLocalISODate,
  toLocalDateTimeInputValue,
} from "./date";

// O Node relê TZ ao ser atribuída; fixa o fuso do Brasil só para este arquivo.
const originalTZ = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "America/Sao_Paulo";
});

afterAll(() => {
  if (originalTZ === undefined) delete process.env.TZ;
  else process.env.TZ = originalTZ;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("date utils", () => {
  it("formats a date-only string without shifting the day", () => {
    expect(formatDateBR("2000-01-01")).toBe("01/01/2000");
  });

  it("uses the local day for the default form date late at night", () => {
    const lateNight = new Date("2026-10-27T23:30:00-03:00");
    expect(todayLocalISODate(lateNight)).toBe("2026-10-27");
  });

  it("uses the fake system clock when no date is given", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-27T23:30:00-03:00"));
    expect(todayLocalISODate()).toBe("2026-10-27");
  });

  it("counts days from the date parts", () => {
    const now = new Date("2026-10-27T23:30:00-03:00");
    expect(daysFromToday("2026-10-27", now)).toBe(0);
    expect(daysFromToday("2026-10-28", now)).toBe(1);
    expect(daysFromToday("2026-11-03", now)).toBe(7);
    expect(daysFromToday("2026-10-26", now)).toBe(-1);
    expect(daysFromToday("2026-10-28T00:00:00Z", now)).toBe(1);
  });

  it("formats a local datetime for datetime-local inputs", () => {
    const lateNight = new Date("2026-10-27T23:30:00-03:00");
    expect(toLocalDateTimeInputValue(lateNight)).toBe("2026-10-27T23:30");
  });
});

describe("real-instant helpers (TZ America/Sao_Paulo)", () => {
  it("converts a local input to a UTC instant", () => {
    expect(localInputToInstant("2026-11-10T15:00")).toBe("2026-11-10T18:00:00.000Z");
  });

  it("returns empty for empty or invalid local input", () => {
    expect(localInputToInstant("")).toBe("");
    expect(localInputToInstant("lixo")).toBe("");
  });

  it("round-trips instant and local input", () => {
    expect(instantToLocalInput("2026-11-10T18:00:00Z")).toBe("2026-11-10T15:00");
    expect(localInputToInstant(instantToLocalInput("2026-11-10T18:00:00Z"))).toBe(
      "2026-11-10T18:00:00.000Z",
    );
  });

  it("formats an instant in the local timezone", () => {
    expect(formatInstantDateTimeBR("2026-11-10T18:00:00Z")).toBe("10/11/2026 às 15:00");
    expect(formatInstantDateBR("2026-11-10T01:00:00Z")).toBe("09/11/2026");
  });

  it("returns empty for missing or invalid instants", () => {
    expect(formatInstantDateTimeBR(null)).toBe("");
    expect(formatInstantDateTimeBR("lixo")).toBe("");
    expect(Number.isNaN(daysFromTodayInstant("lixo"))).toBe(true);
  });

  it("counts days using the local day of the instant", () => {
    const now = new Date("2026-11-10T12:00:00-03:00");
    expect(daysFromTodayInstant("2026-11-11T01:00:00Z", now)).toBe(0);
    expect(daysFromTodayInstant("2026-11-12T12:00:00Z", now)).toBe(2);
  });
});
