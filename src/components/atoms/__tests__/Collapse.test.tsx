import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Collapse from "../Collapse";

describe("Collapse", () => {
  it("shows the content and keeps it reachable when open", () => {
    render(
      <Collapse id="c" open>
        <button>Dentro</button>
      </Collapse>
    );
    const panel = document.getElementById("c")!;
    expect(panel.getAttribute("aria-hidden")).toBe("false");
    expect(panel.hasAttribute("inert")).toBe(false);
    expect(screen.getByRole("button", { name: "Dentro" })).toBeTruthy();
  });

  it("keeps the content mounted but inert and hidden from assistive tech when closed", () => {
    render(
      <Collapse id="c" open={false}>
        <button>Dentro</button>
      </Collapse>
    );
    const panel = document.getElementById("c")!;
    expect(panel.getAttribute("aria-hidden")).toBe("true");
    expect(panel.hasAttribute("inert")).toBe(true);
    expect(panel.textContent).toBe("Dentro");
    expect(screen.queryByRole("button", { name: "Dentro" })).toBeNull();
  });

  it("toggles state when open changes", () => {
    const { rerender } = render(<Collapse id="c" open={false}>x</Collapse>);
    rerender(<Collapse id="c" open>x</Collapse>);
    expect(document.getElementById("c")!.hasAttribute("inert")).toBe(false);
  });
});
