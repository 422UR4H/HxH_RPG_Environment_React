// src/pages/__tests__/CreateMapPage.test.tsx
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

  it("exibe campo de nome e descrição", () => {
    renderPage();
    expect(screen.getByPlaceholderText(/Ex.: Floresta do Norte/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Descrição opcional/i)).toBeInTheDocument();
  });

  it("submit sem nome exibe mensagem de erro em português sem chamar API", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Criar Mapa/i }));
    expect(
      await screen.findByText(/O nome do mapa é obrigatório/i),
    ).toBeInTheDocument();
  });

  it("submit válido chama POST e navega para /campaigns/:id", async () => {
    server.use(
      http.post(`${baseUrl}/campaigns/:campaignId/maps`, () =>
        HttpResponse.json({ map: mapFixture }, { status: 201 }),
      ),
    );
    renderPage();
    const user = userEvent.setup();
    await user.type(
      screen.getByPlaceholderText(/Ex.: Floresta do Norte/i),
      "Floresta do Norte",
    );
    await user.click(screen.getByRole("button", { name: /Criar Mapa/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/campaigns/campaign-1");
    });
  });

  it("erro 422 do servidor exibe mensagem em português", async () => {
    server.use(
      http.post(`${baseUrl}/campaigns/:campaignId/maps`, () =>
        HttpResponse.json(
          { detail: "name is required" },
          { status: 422 },
        ),
      ),
    );
    renderPage();
    const user = userEvent.setup();
    await user.type(
      screen.getByPlaceholderText(/Ex.: Floresta do Norte/i),
      "Mapa X",
    );
    await user.click(screen.getByRole("button", { name: /Criar Mapa/i }));
    expect(
      await screen.findByText(/O nome do mapa é obrigatório/i),
    ).toBeInTheDocument();
  });

  it("erro genérico do servidor exibe mensagem de fallback", async () => {
    server.use(
      http.post(`${baseUrl}/campaigns/:campaignId/maps`, () =>
        HttpResponse.json({ detail: "unexpected_error" }, { status: 422 }),
      ),
    );
    renderPage();
    const user = userEvent.setup();
    await user.type(
      screen.getByPlaceholderText(/Ex.: Floresta do Norte/i),
      "Mapa X",
    );
    await user.click(screen.getByRole("button", { name: /Criar Mapa/i }));
    expect(
      await screen.findByText(/Erro ao criar mapa\. Tente novamente/i),
    ).toBeInTheDocument();
  });

  it("botão Cancelar navega para /campaigns/:id", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Cancelar/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/campaigns/campaign-1");
  });
});
