import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CharactersSidebar from "../CharactersSidebar";
import RulesSidebar from "../RulesSidebar";

describe("sidebars inside a drawer", () => {
  it("caps the characters column at the container width", () => {
    render(<CharactersSidebar items={["a"]} renderItem={(i) => <p key={i}>{i}</p>} />);
    const aside = screen.getByRole("complementary");
    expect(aside).toHaveStyle({ width: "300px", "max-width": "100%" });
  });

  it("caps the rules column at the container width", () => {
    render(<RulesSidebar>regras</RulesSidebar>);
    expect(screen.getByRole("complementary")).toHaveStyle({ width: "400px", "max-width": "100%" });
  });
});
