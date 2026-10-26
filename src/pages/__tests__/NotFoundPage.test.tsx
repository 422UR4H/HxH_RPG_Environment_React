import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/render";
import NotFoundPage from "../NotFoundPage";

describe("NotFoundPage", () => {
  it("mostra o título e a mensagem da rota inexistente", () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByText("Página não encontrada")).toBeInTheDocument();
    expect(
      screen.getByText("O endereço pode estar errado, ou a página saiu do ar."),
    ).toBeInTheDocument();
  });

  it("com token, 'Ir para o início' aponta para /home", () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByRole("link", { name: "Ir para o início" })).toHaveAttribute("href", "/home");
  });

  it("sem token, 'Ir para o início' aponta para /", () => {
    renderWithProviders(<NotFoundPage />, { token: null });
    expect(screen.getByRole("link", { name: "Ir para o início" })).toHaveAttribute("href", "/");
  });
});
