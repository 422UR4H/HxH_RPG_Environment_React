import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { masterUserFixture } from "../../test/fixtures/user";
import { mapFixture } from "../../test/fixtures/map";
import CreateMapPage from "../CreateMapPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseUrl = "http://localhost:5000";

function renderPage() {
  return renderWithProviders(<CreateMapPage />, {
    route: "/campaigns/campaign-1/maps/new",
    path: "/campaigns/:campaignId/maps/new",
    user: masterUserFixture,
  });
}

describe("CreateMapPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("exibe campo de nome do mapa na toolbar", () => {
    renderPage();
    expect(screen.getByPlaceholderText(/nome do mapa/i)).toBeInTheDocument();
  });

  it("clicar Salvar sem nome exibe erro em português", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /criar mapa/i }));
    expect(
      await screen.findByText(/O nome do mapa é obrigatório/i),
    ).toBeInTheDocument();
  });

  it("salvar com nome chama POST e navega para /campaigns/:id", async () => {
    server.use(
      http.post(`${baseUrl}/campaigns/:campaignId/maps`, () =>
        HttpResponse.json({ map: mapFixture }, { status: 201 }),
      ),
    );
    renderPage();
    await userEvent.type(
      screen.getByPlaceholderText(/nome do mapa/i),
      "Floresta do Norte",
    );
    await userEvent.click(screen.getByRole("button", { name: /criar mapa/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/campaigns/campaign-1");
    });
  });

  it("erro do servidor exibe mensagem de fallback sem navegar", async () => {
    server.use(
      http.post(`${baseUrl}/campaigns/:campaignId/maps`, () =>
        HttpResponse.json({ detail: "unexpected_error" }, { status: 422 }),
      ),
    );
    renderPage();
    await userEvent.type(
      screen.getByPlaceholderText(/nome do mapa/i),
      "Mapa X",
    );
    await userEvent.click(screen.getByRole("button", { name: /criar mapa/i }));
    expect(
      await screen.findByText(/Não foi possível salvar/i),
    ).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("digitar no nome registra beforeunload handler", async () => {
    const addEventSpy = vi.spyOn(window, "addEventListener");
    renderPage();
    await userEvent.type(
      screen.getByPlaceholderText(/nome do mapa/i),
      "A",
    );
    expect(addEventSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
    addEventSpy.mockRestore();
  });
});
