import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { charLength, containsEmoji } from "./fieldLimits";

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

describe("containsEmoji: paridade com o back", () => {
  it("has the same fingerprint as the Go table", () => {
    // Se a tabela mudar, a mudança vale para os dois repositórios: recalcule a quantidade e o
    // SHA-256 e atualize este teste e o equivalente em Go (emoji_test.go) no mesmo par de PRs.
    const hits: string[] = [];
    for (let cp = 0; cp <= 0x10ffff; cp++) {
      if (cp >= 0xd800 && cp <= 0xdfff) continue;
      if (containsEmoji(String.fromCodePoint(cp))) hits.push(cp.toString(16).toUpperCase());
    }
    expect(hits.length).toBe(3416);
    expect(createHash("sha256").update(hits.join(",")).digest("hex")).toBe(
      "63362d08506626d36ea1fb3cfe4fcc66b63dfba9c9d38bab50f5bb198980e780",
    );
  });

  // Lista escrita aqui de propósito (não importa a de produção).
  const RANGES: Array<[number, number]> = [
    [0xa9, 0xa9], [0xae, 0xae], [0x203c, 0x203c], [0x2049, 0x2049], [0x2122, 0x2122],
    [0x2139, 0x2139], [0x2194, 0x2199], [0x21a9, 0x21aa], [0x231a, 0x231b], [0x2328, 0x2328],
    [0x23cf, 0x23cf], [0x23e9, 0x23f3], [0x23f8, 0x23fa], [0x24c2, 0x24c2], [0x25aa, 0x25ab],
    [0x25b6, 0x25b6], [0x25c0, 0x25c0], [0x25fb, 0x25fe], [0x2600, 0x27bf], [0x2934, 0x2935],
    [0x2b05, 0x2b07], [0x2b1b, 0x2b1c], [0x2b50, 0x2b50], [0x2b55, 0x2b55], [0x3030, 0x3030],
    [0x303d, 0x303d], [0x3297, 0x3297], [0x3299, 0x3299], [0xfe0f, 0xfe0f], [0x20e3, 0x20e3],
    [0x1f000, 0x1faff], [0xe0020, 0xe007f],
  ];
  const inAnyRange = (cp: number) => RANGES.some(([a, b]) => cp >= a && cp <= b);
  const isSurrogate = (cp: number) => cp >= 0xd800 && cp <= 0xdfff;

  it.each(RANGES)("range %i-%i: edges inside are emoji, neighbours outside are not", (a, b) => {
    expect(containsEmoji(String.fromCodePoint(a))).toBe(true);
    expect(containsEmoji(String.fromCodePoint(b))).toBe(true);
    for (const n of [a - 1, b + 1]) {
      if (isSurrogate(n) || inAnyRange(n)) continue;
      expect(containsEmoji(String.fromCodePoint(n))).toBe(false);
    }
  });

  it("detects emoji in the middle and at the end", () => {
    expect(containsEmoji("Go😀n")).toBe(true);
    expect(containsEmoji("Gon 😀")).toBe(true);
  });

  it("accepts long text in many scripts", () => {
    const text = "Ação José Ção ゴンフリークス Леорио Курапика مرحبا بالعالم क्‍ष ".repeat(30).slice(0, 1000);
    expect(text.length).toBe(1000);
    expect(containsEmoji(text)).toBe(false);
  });

  it("counts 32 emojis as 32 code points", () => {
    expect(charLength("😀".repeat(32))).toBe(32);
  });
});
