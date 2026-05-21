// src/pages/__tests__/CharacterSheetsPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { sheetSummaryFixture } from "../../test/fixtures/sheet";
import CharacterSheetsPage from "../CharacterSheetsPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseUrl = "http://localhost:5000";

function renderPage(opts: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(<CharacterSheetsPage />, {
    route: "/charactersheets",
    path: "/charactersheets",
    ...opts,
  });
}

describe("CharacterSheetsPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("mostra 'Carregando...' inicialmente", () => {
    server.use(
      http.get(`${baseUrl}/charactersheets`, async () => {
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json({ characterSheets: [sheetSummaryFixture] });
      }),
    );
    renderPage();
    expect(screen.getByText(/Carregando\.\.\./i)).toBeInTheDocument();
  });

  it("mostra erro se a API falha", async () => {
    server.use(
      http.get(`${baseUrl}/charactersheets`, () =>
        HttpResponse.json({ error: "x" }, { status: 500 }),
      ),
    );
    renderPage();
    expect(await screen.findByText(/Falha ao carregar personagens/i, {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it("renderiza card pra cada ficha", async () => {
    renderPage();
    expect(await screen.findByText(sheetSummaryFixture.nickName)).toBeInTheDocument();
  });

  it("redireciona pra /charactersheet/new se lista vem vazia", async () => {
    server.use(
      http.get(`${baseUrl}/charactersheets`, () => HttpResponse.json({ characterSheets: [] })),
    );
    renderPage();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/charactersheet/new", { replace: true });
    });
  });

  it("clicar em 'Criar Nova Ficha' navega pra /charactersheet/new", async () => {
    renderPage();
    const u = userEvent.setup();
    const button = await screen.findByText(/Criar Nova Ficha/i);
    await u.click(button);
    expect(mockNavigate).toHaveBeenCalledWith("/charactersheet/new");
  });

  it("redireciona pra '/' se não há token", () => {
    const { container } = renderPage({ token: null });
    expect(container.querySelector("h1")).toBeNull();
  });
});
