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

  it("nas telas de entrada, a logo fica fora do cartão branco", () => {
    const { container } = renderWithProviders(
      <SignPagesTemplate>
        <div>conteúdo</div>
      </SignPagesTemplate>,
    );
    const logo = screen.getByAltText("System X System");
    const card = container.querySelector(".form-div");
    expect(card).not.toBeNull();
    expect(card).not.toContainElement(logo);
    expect(card).toHaveTextContent("conteúdo");
    expect(logo.parentElement).toBe(card?.parentElement);
  });
});
