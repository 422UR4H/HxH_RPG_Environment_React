import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import styled from "styled-components";
import { bottomBarVars, bottomBarReserve, floatingElevation } from "../bottomBar";
import { ActionsList } from "../../components/atoms/ActionsList";

const Host = styled.div`
  ${bottomBarVars}
`;

const allCss = () =>
  Array.from(document.querySelectorAll("style"))
    .map((s) => s.textContent)
    .join("\n");

// jsdom não calcula layout nem var(): o que se garante aqui é o contrato do CSS emitido.
describe("bottomBar", () => {
  it("defines the bar height variable and its 70px variant on small screens", () => {
    render(<Host />);
    const css = allCss();
    expect(css).toContain("--bottom-bar-height:91px");
    expect(css).toMatch(/max-width:\s*440px[^}]*--bottom-bar-height:\s*70px/);
  });

  it("makes the list reserve the bar height plus 24px", () => {
    render(<ActionsList />);
    expect(bottomBarReserve).toContain("+ 24px");
    expect(allCss().replace(/\s/g, "")).toContain(`padding-bottom:${bottomBarReserve.replace(/\s/g, "")}`);
  });

  it("builds the floating elevation as a deep shadow plus a 1px ring", () => {
    expect(floatingElevation("S", "O", "H")).toBe(
      "0 3px 6px S, 0 16px 40px S, 0 0 0 1px O, inset 0 1px 0 H",
    );
  });
});
