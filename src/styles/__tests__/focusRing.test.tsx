import { describe, expect, it } from "vitest";
import { readResetCss } from "../../test/readResetCss";
import { colors } from "../tokens";

// Extrai a regra inteira (seletor + bloco) do anel: a que contém o :where( com :focus-visible.
const ringRule = (css: string) => {
  const start = css.indexOf(":where(:not(input,textarea,select):focus-visible");
  const end = css.indexOf("}", start);
  return start < 0 ? "" : css.slice(start, end + 1);
};

describe("global focus ring", () => {
  it("defines --focus-ring on :root", () => {
    expect(readResetCss()).toContain(`:root{--focus-ring:${colors.actionHighlight};}`);
  });

  it("global ring with zero specificity", () => {
    const rule = ringRule(readResetCss());
    expect(rule).not.toBe("");
    // Acha o ")" que fecha o :where e confere que não sobra :focus-visible depois dele.
    let depth = 0;
    let closeIndex = -1;
    for (let i = ":where".length; i < rule.length; i++) {
      if (rule[i] === "(") depth++;
      if (rule[i] === ")" && --depth === 0) {
        closeIndex = i;
        break;
      }
    }
    const inside = rule.slice(0, closeIndex + 1);
    const after = rule.slice(closeIndex + 1);
    expect(inside).toContain(":focus-visible");
    expect(after).not.toContain(":focus-visible");
    expect(after).toBe("{outline:2pxsolidvar(--focus-ring);outline-offset:3px;}");
  });

  it("text fields stay out of the ring", () => {
    const css = readResetCss();
    const selector = ringRule(css);
    expect(selector).toContain(":not(input,textarea,select)");
    expect(selector).toContain('[type="checkbox"]');
    expect(selector).toContain('[type="radio"]');
    expect(selector).toContain('[type="range"]');
  });

  it("includes input color", () => {
    expect(ringRule(readResetCss())).toContain('[type="color"]');
  });
});
