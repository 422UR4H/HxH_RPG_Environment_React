import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ExpandableText from "../ExpandableText";

function mockMeasures(scrollHeight: number) {
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(scrollHeight);
  vi.spyOn(window, "getComputedStyle").mockReturnValue({ lineHeight: "20px" } as CSSStyleDeclaration);
}

describe("ExpandableText", () => {
  afterEach(() => vi.restoreAllMocks());

  it("hides the expand button when the text fits in five lines", () => {
    mockMeasures(100);
    render(<ExpandableText>Texto curto</ExpandableText>);
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("shows the expand button and toggles it when the text is long", async () => {
    mockMeasures(300);
    const onToggle = vi.fn();
    render(<ExpandableText onToggle={onToggle}>Texto longo</ExpandableText>);
    const button = await screen.findByAltText("Expandir/Retrair");
    button.click();
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
