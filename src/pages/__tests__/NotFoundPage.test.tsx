import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/render";
import NotFoundPage from "../NotFoundPage";

describe("NotFoundPage", () => {
  it("shows the title and message for a nonexistent route", () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByText("Página não encontrada")).toBeInTheDocument();
    expect(
      screen.getByText("O endereço pode estar errado, ou a página saiu do ar."),
    ).toBeInTheDocument();
  });

  it("with a token, 'Ir para o início' points to /home", () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByRole("link", { name: "Ir para o início" })).toHaveAttribute("href", "/home");
  });

  it("without a token, 'Ir para o início' points to /", () => {
    renderWithProviders(<NotFoundPage />, { token: null });
    expect(screen.getByRole("link", { name: "Ir para o início" })).toHaveAttribute("href", "/");
  });
});
