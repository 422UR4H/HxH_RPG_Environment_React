// src/pages/__tests__/CreateMatchPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import CreateMatchPage from "../CreateMatchPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseUrl = "http://localhost:5000";

function renderPage() {
  return renderWithProviders(<CreateMatchPage />, {
    route: "/campaigns/campaign-1/matches/new",
    path: "/campaigns/:campaignId/matches/new",
  });
}

describe("CreateMatchPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("renderiza o título 'CRIAR NOVA PARTIDA'", () => {
    renderPage();
    expect(screen.getByText(/CRIAR NOVA PARTIDA/i)).toBeInTheDocument();
  });

  it("renderiza os campos do form", () => {
    renderPage();
    expect(screen.getByLabelText(/Título da Partida/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrição Breve/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrição Completa/i)).toBeInTheDocument();
  });

  it("renderiza a sidebar de regras", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /Regras/i })).toBeInTheDocument();
  });

  it("mostra erro de validação se Título e Descrição Breve estão vazios", async () => {
    renderPage();
    const form = screen.getByRole("button", { name: /Criar Partida/i }).closest("form")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => {
      expect(screen.getByText(/Título e descrição breve são obrigatórios/i)).toBeInTheDocument();
    });
  });

  it("submete dados válidos e navega de volta", async () => {
    server.use(
      http.post(`${baseUrl}/matches`, () =>
        HttpResponse.json({ match: { uuid: "new-match-1" } }, { status: 201 }),
      ),
    );
    renderPage();
    const u = userEvent.setup();
    await u.type(screen.getByLabelText(/Título da Partida/i), "Nova Partida");
    await u.type(screen.getByLabelText(/Descrição Breve/i), "Brief partida");
    await u.click(screen.getByRole("button", { name: /Criar Partida/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  it("mostra erro quando API falha no submit", async () => {
    server.use(
      http.post(`${baseUrl}/matches`, () =>
        HttpResponse.json({ message: "Erro do server" }, { status: 500 }),
      ),
    );
    renderPage();
    const u = userEvent.setup();
    await u.type(screen.getByLabelText(/Título da Partida/i), "X");
    await u.type(screen.getByLabelText(/Descrição Breve/i), "Y");
    await u.click(screen.getByRole("button", { name: /Criar Partida/i }));
    expect(await screen.findByText(/Erro do server|Erro ao criar partida/i, {}, { timeout: 5000 })).toBeInTheDocument();
  });

  // Conditional test 1: visibility checkbox exists (id="isPublic", label "Partida Pública", starts checked=true)
  it("toggle de visibilidade inverte o checkbox", async () => {
    renderPage();
    const u = userEvent.setup();
    const checkbox = screen.getByLabelText(/Partida Pública/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    await u.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  // Conditional test 2: "Cancelar" button exists (type="button", calls navigate(-1))
  it("clicar em 'Cancelar' navega de volta", async () => {
    renderPage();
    const u = userEvent.setup();
    await u.click(screen.getByText(/Cancelar/i));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
