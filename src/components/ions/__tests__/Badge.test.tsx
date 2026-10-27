import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge from "../Badge";
import { colors } from "../../../styles/tokens";

describe("Badge", () => {
  it("renders the label with the tone colors", () => {
    render(<Badge tone="ongoing">Aceito</Badge>);
    const el = screen.getByText("Aceito");
    const style = getComputedStyle(el);
    expect(style.backgroundColor).not.toBe("");
    expect(document.head.innerHTML).toContain(colors.statusOngoing);
  });

  it("uses the shared trimmed text box", () => {
    render(<Badge tone="muted">Morto</Badge>);
    expect(document.head.innerHTML).toContain("text-box");
  });

  it("keeps the label as written when uppercase is off", () => {
    render(
      <Badge tone="comingSoon" uppercase={false}>
        Em breve
      </Badge>,
    );
    expect(getComputedStyle(screen.getByText("Em breve")).textTransform).not.toBe("uppercase");
  });
});
