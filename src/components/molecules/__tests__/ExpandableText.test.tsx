import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExpandableText from "../ExpandableText";

function mockMeasures(scrollHeight: number) {
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(scrollHeight);
  vi.spyOn(window, "getComputedStyle").mockReturnValue({ lineHeight: "20px", getPropertyValue: () => "" } as unknown as CSSStyleDeclaration);
}

describe("ExpandableText", () => {
  afterEach(() => vi.restoreAllMocks());

  it("hides the expand button when the text fits in five lines", () => {
    mockMeasures(100);
    render(<ExpandableText>Texto curto</ExpandableText>);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows a real button that toggles aria-expanded and calls onToggle", async () => {
    mockMeasures(300);
    const onToggle = vi.fn();
    render(<ExpandableText onToggle={onToggle}>Texto longo</ExpandableText>);
    const button = await screen.findByRole("button", { name: "Mostrar descrição completa" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(button.getAttribute("aria-controls")!)).toHaveTextContent("Texto longo");
    await userEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Recolher descrição" })).toHaveAttribute("aria-expanded", "true");
  });

  it.each([["{Enter}"], [" "]])("toggles with the keyboard key %j", async (key) => {
    mockMeasures(300);
    render(<ExpandableText>Texto longo</ExpandableText>);
    const button = await screen.findByRole("button");
    button.focus();
    await userEvent.keyboard(key);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });
});
