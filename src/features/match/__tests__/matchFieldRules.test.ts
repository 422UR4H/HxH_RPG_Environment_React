import { describe, it, expect } from "vitest";
import {
  SESSION_IN_PAST,
  SESSION_TOO_FAR,
  sessionDayBounds,
  sessionTimeError,
  storyStartError,
} from "../matchFieldRules";

const now = new Date(2026, 10, 10, 15, 0);

describe("sessionTimeError", () => {
  it("rejects the past, accepts now onward and rejects beyond 12 months", () => {
    expect(sessionTimeError("2026-11-10T14:59", now)).toBe(SESSION_IN_PAST);
    expect(sessionTimeError("2026-11-10T15:00", now)).toBeNull();
    expect(sessionTimeError("2027-11-10T15:00", now)).toBeNull();
    expect(sessionTimeError("2027-11-10T15:01", now)).toBe(SESSION_TOO_FAR);
  });

  it("leaves an empty or invalid value to the required check", () => {
    expect(sessionTimeError("", now)).toBeNull();
  });
});

describe("sessionDayBounds", () => {
  it("goes from today to the same day next year", () => {
    expect(sessionDayBounds(now)).toEqual({ min: "2026-11-10", max: "2027-11-10" });
  });
});

describe("storyStartError", () => {
  const campaign = { storyStartAt: "2025-01-01", storyEndAt: "2025-12-31" };
  it("uses the existing messages for dates outside the campaign", () => {
    expect(storyStartError("2024-12-31", campaign)).toBe(
      "A data de início na história deve ser igual ou posterior ao início da campanha.",
    );
    expect(storyStartError("2026-01-01", campaign)).toBe(
      "A data de início na história deve ser anterior ao fim da campanha.",
    );
    expect(storyStartError("2025-06-01", campaign)).toBeNull();
    expect(storyStartError("2030-01-01", { storyStartAt: "2025-01-01" })).toBeNull();
  });
});
