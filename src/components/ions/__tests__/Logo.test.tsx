import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../test/render";
import LogoButton from "../../atoms/LogoButton";
import SignPagesTemplate from "../../templates/SignPagesTemplate";

describe("Logo", () => {
  it("mostra a logo do System X System no header e nas telas de entrada", () => {
    renderWithProviders(
      <>
        <LogoButton />
        <SignPagesTemplate>
          <div />
        </SignPagesTemplate>
      </>,
    );
    const logos = screen.getAllByAltText("System X System");
    expect(logos).toHaveLength(2);
    for (const logo of logos) expect(logo.getAttribute("src")).toMatch(/sxs-logo\.svg/);
  });
});
