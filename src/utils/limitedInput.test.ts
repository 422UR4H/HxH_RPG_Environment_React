import { describe, expect, it } from "vitest";
import { limitInsertion } from "./limitedInput";

describe("limitInsertion", () => {
  it("leaves text that fits untouched", () => {
    expect(limitInsertion("abc", "abXc", 5).value).toBe("abXc");
  });

  it("ignores typing at the end of a full field", () => {
    expect(limitInsertion("abcd", "abcdX", 4).value).toBe("abcd");
  });

  it("ignores a paste in the middle of a full field and keeps the caret there", () => {
    const r = limitInsertion("abcdef", "abcXYZdef", 6);
    expect(r).toEqual({ value: "abcdef", caret: 3 });
  });

  it("inserts only what fits, keeping the rest of the text and putting the caret after it", () => {
    // 2 de folga, cola 3 emojis no meio.
    const r = limitInsertion("ab😀😀cd", "ab😀😀😀😀😀cd", 8);
    expect(r.value).toBe("ab😀😀😀😀cd");
    expect(r.caret).toBe("ab😀😀😀😀".length);
  });

  it("never splits a surrogate pair", () => {
    const r = limitInsertion("a", "a😀😀", 2);
    expect(r.value).toBe("a😀");
    expect(r.value).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
  });

  it("always allows deleting", () => {
    expect(limitInsertion("abcd", "abd", 4).value).toBe("abd");
    expect(limitInsertion("abcd", "", 4).value).toBe("");
  });

  it("when replacing a selection with longer text, clamps only the insertion", () => {
    // "ab[cd]ef" (max 6) -> "ab" + "WXYZ" + "ef" (8): só 2 do novo trecho cabem.
    const r = limitInsertion("abcdef", "abWXYZef", 6);
    expect(r).toEqual({ value: "abWXef", caret: 4 });
  });

  it("anchors the insertion on the selection, not on repeated letters", () => {
    // "a|b" + cola "ba" (max 3): o nativo dá "abb"; o palpite por prefixo comum daria "aba".
    const r = limitInsertion("ab", "abab", 3, { selStart: 1, caretEnd: 3 });
    expect(r).toEqual({ value: "abb", caret: 2 });
  });

  it("with a selection replaced by text that starts like it, uses the room the native limit would", () => {
    // "ab[cd]ef" (max 6), cola "cdXYZ" no lugar de "cd": cabem 2 dos 5.
    const r = limitInsertion("abcdef", "abcdXYZef", 6, { selStart: 2, caretEnd: 7 });
    expect(r.value).toBe("abcdef");
  });
});
