import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  daysFromToday,
  formatDateBR,
  todayLocalISODate,
  toLocalDateTimeInputValue,
} from "./date";

// O Node relê TZ ao ser atribuída; fixa o fuso do Brasil só para este arquivo.
beforeAll(() => {
  process.env.TZ = "America/Sao_Paulo";
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
