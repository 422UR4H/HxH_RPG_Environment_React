import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AsideTabs from "../AsideTabs";
import { colors } from "../../../../styles/tokens";

describe("AsideTabs", () => {
  it("paints the tab strip with surfaceTabStrip", () => {
    render(<AsideTabs defaultTab="historico" historico={<div />} personagens={<div />} />);
    const css = Array.from(document.querySelectorAll("style")).map((s) => s.textContent).join("\n");
    expect(css).toContain(`background:${colors.surfaceTabStrip};`);
  });
});
