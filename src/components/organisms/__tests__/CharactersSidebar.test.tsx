import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CharactersSidebar from "../CharactersSidebar";
import { colors } from "../../../styles/tokens";

// O repo não usa jest-styled-components: o CSS emitido é lido do <style> e comparado como texto
// (minificado, sem espaços depois de ":" e ",").
const emittedCss = () => Array.from(document.querySelectorAll("style")).map((s) => s.textContent).join("\n");

const gutterShadow = `box-shadow:inset 8px 0 0 ${colors.surfaceSidebarGutter},inset -8px 0 0 ${colors.surfaceSidebarGutter};`;

describe("CharactersSidebar", () => {
  it("is a 280 px column with 20 px top/bottom and 8 px side padding", () => {
    render(<CharactersSidebar items={["a"]} renderItem={(i) => <p key={i}>{i}</p>} />);
    const css = emittedCss();
    expect(css).toContain("width:280px;");
    expect(css).toContain("padding:20px 8px;");
  });

  it("paints the two 8 px side gutters with an inset box-shadow in surfaceSidebarGutter", () => {
    render(<CharactersSidebar items={["a"]} renderItem={(i) => <p key={i}>{i}</p>} />);
    expect(emittedCss()).toContain(gutterShadow);
  });

  it("keeps the same padding and gutters when fluid, but takes the full width", () => {
    render(<CharactersSidebar items={["a"]} renderItem={(i) => <p key={i}>{i}</p>} fluid />);
    const css = emittedCss();
    expect(css).toContain("width:100%;");
    expect(css).toContain("padding:20px 8px;");
    expect(css).toContain(gutterShadow);
  });
});
