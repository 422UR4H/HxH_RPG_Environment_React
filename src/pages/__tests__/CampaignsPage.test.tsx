// src/pages/__tests__/CampaignsPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { campaignSummaryFixture } from "../../test/fixtures/campaign";
import CampaignsPage from "../CampaignsPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseUrl = "http://localhost:5000";

function renderPage() {
  return renderWithProviders(<CampaignsPage />, {
    route: "/campaigns",
    path: "/campaigns",
  });
}

describe("CampaignsPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("mostra 'Carregando campanhas...' inicialmente", () => {
    server.use(
      http.get(`${baseUrl}/campaigns`, async () => {
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json({ campaigns: [campaignSummaryFixture] });
      }),
    );
    renderPage();
    expect(screen.getByText(/Carregando campanhas\.\.\./i)).toBeInTheDocument();
  });

  it("mostra erro se a API falha", async () => {
    server.use(
      http.get(`${baseUrl}/campaigns`, () => HttpResponse.json({ error: "x" }, { status: 500 })),
    );
    renderPage();
    expect(await screen.findByText(/Falha ao carregar campanhas/i, {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it("mostra empty state quando lista é vazia", async () => {
    server.use(
      http.get(`${baseUrl}/campaigns`, () => HttpResponse.json({ campaigns: [] })),
    );
    renderPage();
    expect(await screen.findByText(/Você ainda não possui campanhas/i)).toBeInTheDocument();
  });

  it("renderiza um card pra cada campanha", async () => {
    renderPage();
    expect(await screen.findByText(campaignSummaryFixture.name)).toBeInTheDocument();
  });

  it("clicar em 'Criar Nova Campanha' navega pra /campaigns/new", async () => {
    renderPage();
    const u = userEvent.setup();
    const button = await screen.findByText(/Criar Nova Campanha/i);
    await u.click(button);
    expect(mockNavigate).toHaveBeenCalledWith("/campaigns/new");
  });
});
