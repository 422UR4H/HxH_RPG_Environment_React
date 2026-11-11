// src/pages/__tests__/CreateCampaignPage.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import CreateCampaignPage from "../CreateCampaignPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});


// O setup devolve sempre `matches: false` (max-width = tela larga); aqui responde por largura.
const originalMatchMedia = window.matchMedia;
function setWidth(px: number) {
  window.matchMedia = ((query: string) => {
    const max = /max-width:\s*(\d+)px/.exec(query);
    return {
      matches: max ? px <= Number(max[1]) : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    };
  }) as typeof window.matchMedia;
}
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

  it("redirects to login without a token", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/campaigns/new" element={<CreateCampaignPage />} />
        <Route path="/" element={<div>login</div>} />
      </Routes>,
      { route: "/campaigns/new", token: null },
    );
    expect(await screen.findByText("login")).toBeInTheDocument();
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
    expect(screen.getByRole("heading", { name: /^REGRAS$/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Sistema de Combate/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Progressão de Personagens/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Nen & Habilidades/i })).toBeInTheDocument();
  });

  it("shows required errors under the empty fields, focuses the first and skips the API", async () => {
    let called = false;
    server.use(
      http.post(`${baseUrl}/campaigns`, () => {
        called = true;
        return HttpResponse.json({ campaign: { uuid: "x" } }, { status: 201 });
      }),
    );
    renderPage();
    const u = userEvent.setup();
    const name = screen.getByLabelText("Nome da Campanha");
    await u.click(screen.getByRole("button", { name: /Criar Campanha/i }));
    expect(await screen.findAllByText("Campo obrigatório.")).toHaveLength(2);
    expect(name).toHaveFocus();
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(called).toBe(false);
  });

  it("shows the minimum error for the name on blur and clears it when valid", async () => {
    renderPage();
    const u = userEvent.setup();
    const name = screen.getByLabelText("Nome da Campanha");
    await u.type(name, "abc");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await u.tab();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "O nome deve ter pelo menos 5 caracteres.",
    );
    await u.type(name, "de");
    expect(screen.queryByText("O nome deve ter pelo menos 5 caracteres.")).not.toBeInTheDocument();
  });

  it("shows the limit note at 32 characters for the name and at 255 for the call link", async () => {
    renderPage();
    const u = userEvent.setup();
    await u.type(screen.getByLabelText("Nome da Campanha"), "a".repeat(40));
    expect(screen.getByLabelText("Nome da Campanha")).toHaveValue("a".repeat(32));
    expect(screen.getByRole("status")).toHaveTextContent("Limite de 32 caracteres atingido.");
    const link = screen.getByLabelText(/Link da Chamada/i);
    await u.click(link);
    await u.paste("b".repeat(300));
    expect(link).toHaveValue("b".repeat(255));
    expect(screen.getAllByRole("status").map((n) => n.textContent)).toContain(
      "Limite de 255 caracteres atingido.",
    );
  });

  describe("required and optional fields (FOR-06)", () => {
    it("marks only the optional fields, in the label", () => {
      renderPage();
      expect(screen.getByLabelText("Descrição Completa (opcional)")).toBeInTheDocument();
      expect(screen.getByLabelText("Link da Chamada (opcional)")).toBeInTheDocument();
      expect(screen.getByLabelText("Nome da Campanha")).toBeInTheDocument();
      expect(screen.getByLabelText("Descrição Breve")).toBeInTheDocument();
    });

    it("answers an empty required field with its own message instead of the browser bubble", async () => {
      renderPage();
      const u = userEvent.setup();
      const submit = screen.getByRole("button", { name: /Criar Campanha/i });
      expect(submit.closest("form")).toHaveAttribute("novalidate");
      await u.type(screen.getByLabelText("Nome da Campanha"), "Yorknew");
      await u.click(submit);
      expect(await screen.findByRole("alert")).toHaveTextContent("Campo obrigatório.");
      expect(screen.getByLabelText("Descrição Breve")).toHaveFocus();
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
        HttpResponse.json({ detail: "Server explodiu" }, { status: 500 }),
      ),
    );
    renderPage();
    const u = userEvent.setup();
    await u.type(screen.getByLabelText(/Nome da Campanha/i), "Nova Campanha");
    await u.type(screen.getByLabelText(/Descrição Breve/i), "Brief");
    await u.click(screen.getByRole("button", { name: /Criar Campanha/i }));
    expect(
      await screen.findByText("Erro ao criar campanha. Tente novamente.", {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Server explodiu/i)).not.toBeInTheDocument();
    const banner = screen.getByText("Erro ao criar campanha. Tente novamente.");
    expect(
      banner.compareDocumentPosition(screen.getByRole("button", { name: "Cancelar" })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("traduz o 403 do limite de campanhas", async () => {
    server.use(
      http.post(`${baseUrl}/campaigns`, () =>
        HttpResponse.json(
          { detail: "validation error: user cannot have more than 10 campaigns" },
          { status: 403 },
        ),
      ),
    );
    renderPage();
    const u = userEvent.setup();
    await u.type(screen.getByLabelText(/Nome da Campanha/i), "Nova Campanha");
    await u.type(screen.getByLabelText(/Descrição Breve/i), "Brief");
    await u.click(screen.getByRole("button", { name: /Criar Campanha/i }));
    expect(await screen.findByText("Você atingiu o limite de 10 campanhas.")).toBeInTheDocument();
    expect(screen.queryByText(/validation error/i)).not.toBeInTheDocument();
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

  describe("tela estreita", () => {
    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    it("recolhe as regras e mostra a aba REGRAS", () => {
      setWidth(390);
      renderPage();
      expect(screen.queryByRole("heading", { name: /^REGRAS$/ })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "REGRAS" })).toBeInTheDocument();
    });

    it("clicar na aba abre a gaveta e Esc fecha", async () => {
      setWidth(390);
      const u = userEvent.setup();
      renderPage();
      await u.click(screen.getByRole("button", { name: "REGRAS" }));
      expect(screen.getByRole("heading", { name: /^REGRAS$/ })).toBeInTheDocument();
      await u.keyboard("{Escape}");
      await waitFor(() =>
        expect(screen.queryByRole("heading", { name: /^REGRAS$/, hidden: true })).not.toBeInTheDocument(),
      );
    });

    it("tocar no X fecha a gaveta", async () => {
      setWidth(390);
      const u = userEvent.setup();
      renderPage();
      await u.click(screen.getByRole("button", { name: "REGRAS" }));
      await u.click(screen.getByRole("button", { name: "Fechar" }));
      await waitFor(() =>
        expect(screen.queryByRole("heading", { name: /^REGRAS$/, hidden: true })).not.toBeInTheDocument(),
      );
    });
  });

  it.each([["Nome da Campanha", 32], [/Descrição Breve/i, 255], [/Link da Chamada/i, 255]])("campaign form: %s accepts max emojis and cuts a paste of max+1 at max code points", async (label, max) => {
    renderPage();
    const u = userEvent.setup();
    const field = await screen.findByLabelText(label);
    await u.click(field);
    await u.paste("😀".repeat(max));
    expect(field).toHaveValue("😀".repeat(max));
    expect(screen.getAllByRole("status").map((n) => n.textContent)).toContain(
      `Limite de ${max} caracteres atingido.`,
    );
    await u.clear(field);
    await u.paste("😀".repeat(max + 1));
    const value = (field as HTMLInputElement).value;
    expect(value).toBe("😀".repeat(max));
    expect(value).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
  });
});
