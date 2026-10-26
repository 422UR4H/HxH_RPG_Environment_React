// src/pages/__tests__/CharacterSheetPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { sheetApiFixture } from "../../test/fixtures/sheet";
import { userFixture } from "../../test/fixtures/user";
import CharacterSheetPage from "../CharacterSheetPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseUrl = "http://localhost:5000";

function renderPage(opts: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(<CharacterSheetPage />, {
    route: "/charactersheet/sheet-1",
    path: "/charactersheet/:id",
    ...opts,
  });
}

describe("CharacterSheetPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("não renderiza dados durante o loading", () => {
    server.use(
      http.get(`${baseUrl}/charactersheets/:id`, async () => {
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json({ characterSheet: sheetApiFixture });
      }),
    );
    const { container } = renderPage();
    expect(container.textContent ?? "").not.toContain("TestNick");
  });

  it("renderiza o nickname quando os dados chegam", async () => {
    renderPage({ user: userFixture });
    expect(await screen.findByText(/TestNick/i)).toBeInTheDocument();
  });

  it("renderiza estado vazio se não há token (Navigate dispara redirect)", () => {
    const { container } = renderPage({ token: null });
    expect(container.textContent ?? "").not.toContain("TestNick");
    expect(container.textContent ?? "").not.toContain("Carregando");
  });

  it("renderiza a página em modo isPending (location.state) sem erro", async () => {
    // Quando aberta a partir de uma ficha pendente, a página recebe
    // isPending no location.state. A UI de aceitar/rejeitar mora dentro
    // de CharacterSheetTemplate — interação completa fica para a fase de
    // refactor do template. Aqui apenas travamos que a página monta nesse
    // modo sem quebrar.
    renderPage({
      user: userFixture,
      state: { isPending: true, campaignId: "campaign-1" },
    });
    expect(await screen.findByText(/TestNick/i)).toBeInTheDocument();
  });

  it("500 shows the error title with 'Tentar de novo'", async () => {
    server.use(
      http.get(`${baseUrl}/charactersheets/:id`, () =>
        HttpResponse.json({ detail: "boom" }, { status: 500 }),
      ),
    );
    renderPage({ user: userFixture });
    expect(
      await screen.findByText("Não foi possível carregar a ficha", {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para personagens" })).toBeInTheDocument();
    expect(screen.queryByText(/Request failed/i)).not.toBeInTheDocument();
  });

  it("404 shows 'Ficha não encontrada' with the path to the list, without repeating it", async () => {
    server.use(
      http.get(`${baseUrl}/charactersheets/:id`, () =>
        HttpResponse.json({ detail: "not found" }, { status: 404 }),
      ),
    );
    renderPage({ user: userFixture });
    expect(await screen.findByText("Ficha não encontrada", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para personagens" })).toHaveAttribute(
      "href",
      "/charactersheets",
    );
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument();
  });

  describe("delete from the Manage menu (CON-07)", () => {
    const blockedReason =
      "Ficha em campanha ou com envio pendente não pode ser excluída: o histórico é do grupo.";

    function serveSheet(overrides: Record<string, unknown>) {
      server.use(
        http.get(`${baseUrl}/charactersheets/:id`, () =>
          HttpResponse.json({ characterSheet: { ...sheetApiFixture, ...overrides } }),
        ),
      );
    }

    async function openManageMenu() {
      const u = userEvent.setup();
      await u.click(await screen.findByRole("button", { name: /Gerenciar/i }));
      return { u, deleteButton: screen.getByRole("button", { name: /Excluir/i }) };
    }

    it("lets the owner delete a sheet outside any campaign", async () => {
      renderPage({ user: userFixture });
      const { u, deleteButton } = await openManageMenu();
      expect(deleteButton).not.toHaveAttribute("aria-disabled");
      await u.click(deleteButton);
      expect(await screen.findByText(/Tem certeza que deseja excluir esta ficha/i)).toBeInTheDocument();
    });

    it("shows delete as unavailable, with the reason, for a sheet in a campaign", async () => {
      serveSheet({ campaignUuid: "campaign-1" });
      renderPage({ user: userFixture });
      const { u, deleteButton } = await openManageMenu();
      expect(deleteButton).toHaveAttribute("aria-disabled", "true");
      expect(deleteButton).toHaveAccessibleDescription(blockedReason);
      await u.click(deleteButton);
      expect(screen.queryByText(/Tem certeza que deseja excluir esta ficha/i)).not.toBeInTheDocument();
    });

    it("shows delete as unavailable for a sheet with a pending submission", async () => {
      serveSheet({ submission: { campaignUuid: "campaign-1", createdAt: "2025-01-01T00:00:00Z" } });
      renderPage({ user: userFixture });
      const { deleteButton } = await openManageMenu();
      expect(deleteButton).toHaveAttribute("aria-disabled", "true");
      expect(deleteButton).toHaveAccessibleDescription(blockedReason);
    });
  });
});
