// src/pages/__tests__/CreateMatchPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { campaignApiFixture } from "../../test/fixtures/campaign";
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

  it("renderiza o título 'CRIAR NOVA PARTIDA'", async () => {
    renderPage();
    expect(await screen.findByText(/CRIAR NOVA PARTIDA/i)).toBeInTheDocument();
  });

  it("não renderiza dados durante o loading da campanha", () => {
    server.use(
      http.get(`${baseUrl}/campaigns/:id`, async () => {
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json({ campaign: campaignApiFixture });
      }),
    );
    const { container } = renderPage();
    expect(container.textContent ?? "").not.toContain("CRIAR NOVA PARTIDA");
  });

  it("campaign loading failure shows the error with 'Tentar de novo'", async () => {
    server.use(
      http.get(`${baseUrl}/campaigns/:id`, () =>
        HttpResponse.json({ error: "x" }, { status: 500 }),
      ),
    );
    renderPage();
    expect(
      await screen.findByText("Não foi possível carregar a campanha", {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });

  it("renderiza os campos do form", async () => {
    renderPage();
    expect(await screen.findByLabelText(/Título da Partida/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrição Breve/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrição Completa/i)).toBeInTheDocument();
  });

  it("renderiza a sidebar de regras", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: /Regras/i })).toBeInTheDocument();
  });

  it("uses the same rule cards as the match page, marked as coming soon", async () => {
    renderPage();
    const rules = await screen.findByRole("complementary", { name: /Regras/i });
    expect(within(rules).getByText("Em breve")).toBeInTheDocument();
    expect(within(rules).getByRole("heading", { name: "Configurações Gerais" })).toBeInTheDocument();
    expect(within(rules).getByRole("heading", { name: "Nen & Habilidades" })).toBeInTheDocument();
  });

  it("shows required errors under the empty fields, focuses the first and skips the API", async () => {
    let called = false;
    server.use(
      http.post(`${baseUrl}/matches`, () => {
        called = true;
        return HttpResponse.json({ match: { uuid: "x" } }, { status: 201 });
      }),
    );
    renderPage();
    const u = userEvent.setup();
    const title = await screen.findByLabelText(/Título da Partida/i);
    expect(screen.queryByText("Campo obrigatório.")).not.toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: /Criar Partida/i }));
    expect(await screen.findAllByText("Campo obrigatório.")).toHaveLength(2);
    expect(title).toHaveFocus();
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveAccessibleDescription("Campo obrigatório.");
    expect(called).toBe(false);
  });

  it("shows the minimum error on blur and clears it once the title is valid", async () => {
    renderPage();
    const u = userEvent.setup();
    const title = await screen.findByLabelText(/Título da Partida/i);
    await u.type(title, "abc");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await u.tab();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "O título deve ter pelo menos 5 caracteres.",
    );
    await u.type(title, "de");
    expect(screen.queryByText("O título deve ter pelo menos 5 caracteres.")).not.toBeInTheDocument();
  });

  it("caps the title at 32 characters and shows the limit note, which goes away below it", async () => {
    renderPage();
    const u = userEvent.setup();
    const title = await screen.findByLabelText(/Título da Partida/i);
    await u.type(title, "a".repeat(32));
    expect(screen.getByRole("status")).toHaveTextContent("Limite de 32 caracteres atingido.");
    await u.type(title, "{backspace}");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("flags a session in the past as soon as it is picked", async () => {
    // Relógio fixo: o padrão da sessão é hoje + 7 dias; escolher o dia 15 de hoje + 1h cai no passado.
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 5, 15, 12, 0) });
    try {
      renderPage();
      const u = userEvent.setup();
      await u.click(await screen.findByLabelText("Data e Hora da Sessão"));
      const dialog = screen.getByRole("dialog", { name: "Escolher data" });
      // Padrão: 22/06/2026 12:00. Voltando a hora para 11:00 no dia de hoje (15/06) fica no passado.
      await u.click(within(dialog).getByRole("button", { name: /\b15 de junho/i }));
      await u.selectOptions(within(dialog).getByLabelText("Hora"), "11");
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Escolha um horário a partir de agora.",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("answers an emptied session date with 'Campo obrigatório.' right away", async () => {
    renderPage();
    const u = userEvent.setup();
    await u.click(await screen.findByLabelText("Data e Hora da Sessão"));
    await u.click(screen.getByRole("button", { name: "Limpar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Campo obrigatório.");
  });

  it("marks only the full description as optional (FOR-06)", async () => {
    renderPage();
    expect(await screen.findByLabelText("Descrição Completa (opcional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Título da Partida")).toBeInTheDocument();
    expect(screen.getByLabelText("Data e Hora da Sessão")).toBeInTheDocument();
  });

  it("keeps the story start inside the campaign: days before it cannot be picked", async () => {
    renderPage();
    const u = userEvent.setup();
    await u.type(await screen.findByLabelText(/Título da Partida/i), "Nova Partida");
    const storyStart = screen.getByLabelText("Data de Início na História");
    await waitFor(() => expect(storyStart).toHaveTextContent("01/01/2025"));
    await u.click(storyStart);
    const dialog = screen.getByRole("dialog", { name: "Escolher data" });
    // O min do campo desabilita o dia antes do início da campanha (a regra da página segue de reserva).
    await u.click(within(dialog).getByRole("button", { name: "Mês anterior" }));
    expect(
      within(dialog).getByRole("button", { name: /31 de dezembro de 2024/i }),
    ).toBeDisabled();
  });

  it("submete dados válidos e navega de volta", async () => {
    server.use(
      http.post(`${baseUrl}/matches`, () =>
        HttpResponse.json({ match: { uuid: "new-match-1" } }, { status: 201 }),
      ),
    );
    renderPage();
    const u = userEvent.setup();
    await u.type(await screen.findByLabelText(/Título da Partida/i), "Nova Partida");
    await u.type(screen.getByLabelText(/Descrição Breve/i), "Brief partida");
    await u.click(screen.getByRole("button", { name: /Criar Partida/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  it("shows the server error just above the buttons, not at the top of the page", async () => {
    server.use(
      http.post(`${baseUrl}/matches`, () =>
        HttpResponse.json(
          { detail: "validation error: game scheduled at cannot be in the past" },
          { status: 422 },
        ),
      ),
    );
    renderPage();
    const u = userEvent.setup();
    await u.type(await screen.findByLabelText(/Título da Partida/i), "Nova Partida");
    await u.type(screen.getByLabelText(/Descrição Breve/i), "Brief partida");
    await u.click(screen.getByRole("button", { name: /Criar Partida/i }));
    const banner = await screen.findByText(
      "A data e hora da sessão não pode estar no passado.",
      {},
      { timeout: 5000 },
    );
    const cancel = screen.getByRole("button", { name: "Cancelar" });
    expect(banner.compareDocumentPosition(cancel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const description = screen.getByLabelText(/Descrição Completa/i);
    expect(description.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // Conditional test 1: visibility checkbox exists (id="isPublic", label "Partida Pública", starts checked=true)
  it("toggle de visibilidade inverte o checkbox", async () => {
    renderPage();
    const u = userEvent.setup();
    const checkbox = (await screen.findByLabelText(/Partida Pública/i)) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    await u.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  // Conditional test 2: "Cancelar" button exists (type="button", calls navigate(-1))
  it("clicar em 'Cancelar' navega de volta", async () => {
    renderPage();
    const u = userEvent.setup();
    await u.click(await screen.findByText(/Cancelar/i));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it.each([[/Título da Partida/i, 32], [/Descrição Breve/i, 255]])("match form: %s accepts max emojis and cuts a paste of max+1 at max code points", async (label, max) => {
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

  it("typing in the middle of a full title leaves the text intact and the caret in place", async () => {
    renderPage();
    const u = userEvent.setup();
    const title = (await screen.findByLabelText(/Título da Partida/i)) as HTMLInputElement;
    await u.click(title);
    await u.paste("a".repeat(31) + "z");
    title.setSelectionRange(5, 5);
    await u.keyboard("X");
    expect(title).toHaveValue("a".repeat(31) + "z");
    await waitFor(() => expect(title.selectionStart).toBe(5));
  });
});
