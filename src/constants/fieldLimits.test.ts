import { describe, expect, it } from "vitest";
import { charLength, clampChars, containsEmoji } from "./fieldLimits";

describe("containsEmoji", () => {
  it.each(["Gon😀", "❤", "✅ ok", "🇧🇷", "👍🏽", "1️⃣", "Killua™", "a©b", "⭐", "👨‍👩‍👧"])(
    "detects emoji in %s",
    (s) => expect(containsEmoji(s)).toBe(true),
  );
  it.each(["", "Gon Freecss", "Killua_99", "José Ção", "ゴン", "Леорио", "a.b-c@d.com", "क्‍ष"])(
    "accepts %j",
    (s) => expect(containsEmoji(s)).toBe(false),
  );
});

describe("charLength", () => {
  it.each([["😀", 1], ["Gon😀", 4], ["🇧🇷", 2], ["👨‍👩‍👧", 5]] as const)(
    "counts %s as %i",
    (s, n) => expect(charLength(s)).toBe(n),
  );
});

describe("clampChars", () => {
  it("cuts by code points, not UTF-16 units", () => {
    expect(clampChars("ab😀c", 3)).toBe("ab😀");
  });
  it("keeps short text", () => {
    expect(clampChars("ab", 3)).toBe("ab");
  });
});
