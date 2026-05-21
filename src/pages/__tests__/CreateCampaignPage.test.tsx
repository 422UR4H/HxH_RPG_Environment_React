// src/pages/__tests__/CreateCampaignPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import CreateCampaignPage from "../CreateCampaignPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseUrl = "http://localhost:5000";

function renderPage() {
  return renderWithProviders(<CreateCampaignPage />, {
    route: "/campaigns/new",
    path: "/campaigns/new",
  });
}

describe("CreateCampaignPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("renderiza o título 'CRIAR NOVA CAMPANHA'", () => {
    renderPage();
    expect(screen.getByText(/CRIAR NOVA CAMPANHA/i)).toBeInTheDocument();
  });

  it("renderiza todos os campos do form", () => {
    renderPage();
    expect(screen.getByLabelText(/Nome da Campanha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrição Breve/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrição Completa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Link da Chamada/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Data de Início da História/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Campanha Pública/i)).toBeInTheDocument();
  });

  it("renderiza a sidebar de regras", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /Regras da Campanha/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Sistema de Combate/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Progressão de Personagens/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Nen & Habilidades/i })).toBeInTheDocument();
  });

  it("mostra erro de validação se Nome e Descrição Breve estão vazios", async () => {
    renderPage();
    // The submit button wraps a <label> with text "Criar Campanha".
    // Dispatch submit on the form itself to bypass native HTML5 required validation.
    const submitButton = screen.getByRole("button", { name: /Criar Campanha/i });
    const form = submitButton.closest("form")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => {
      expect(screen.getByText(/Nome e descrição breve são obrigatórios/i)).toBeInTheDocument();
    });
  });

  it("submete o form com dados válidos e navega de volta", async () => {
    server.use(
      http.post(`${baseUrl}/campaigns`, () =>
        HttpResponse.json({ campaign: { uuid: "new-campaign-1", name: "Nova Campanha" } }, { status: 201 }),
      ),
    );
    renderPage();
    const u = userEvent.setup();
    await u.type(screen.getByLabelText(/Nome da Campanha/i), "Nova Campanha");
    await u.type(screen.getByLabelText(/Descrição Breve/i), "Brief teste");
    await u.click(screen.getByRole("button", { name: /Criar Campanha/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  it("mostra erro quando API retorna falha no submit", async () => {
    server.use(
      http.post(`${baseUrl}/campaigns`, () =>
        HttpResponse.json({ message: "Server explodiu" }, { status: 500 }),
      ),
    );
    renderPage();
    const u = userEvent.setup();
    await u.type(screen.getByLabelText(/Nome da Campanha/i), "Nova");
    await u.type(screen.getByLabelText(/Descrição Breve/i), "Brief");
    await u.click(screen.getByRole("button", { name: /Criar Campanha/i }));
    expect(await screen.findByText(/Server explodiu|Erro ao criar campanha/i, {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it("toggle de 'Campanha Pública' inverte o checkbox", async () => {
    renderPage();
    const u = userEvent.setup();
    const checkbox = screen.getByLabelText(/Campanha Pública/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    await u.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it("clicar em 'Cancelar' navega de volta", async () => {
    renderPage();
    const u = userEvent.setup();
    await u.click(screen.getByText(/Cancelar/i));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
