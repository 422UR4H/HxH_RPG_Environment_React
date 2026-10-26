// src/pages/__tests__/CampaignsPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { campaignSummaryFixture, campaignSummaryApiFixture } from "../../test/fixtures/campaign";
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

  it("mostra 'Carregando campanhas…' inicialmente", () => {
    server.use(
      http.get(`${baseUrl}/campaigns`, async () => {
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json({ campaigns: [campaignSummaryApiFixture] });
      }),
    );
    renderPage();
    expect(screen.getByText(/Carregando campanhas…/i)).toBeInTheDocument();
  });

  it("mostra erro se a API falha", async () => {
    server.use(
      http.get(`${baseUrl}/campaigns`, () => HttpResponse.json({ error: "x" }, { status: 500 })),
    );
    renderPage();
    expect(await screen.findByText(/Não foi possível carregar as campanhas/i, {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it("Tentar de novo refaz a busca", async () => {
    let calls = 0;
    server.use(
      http.get(`${baseUrl}/campaigns`, () => {
        calls += 1;
        // useCampaigns tem retry: 1, então a 1ª busca gasta 2 chamadas antes do erro aparecer.
        if (calls <= 2) return HttpResponse.json({ error: "x" }, { status: 500 });
        return HttpResponse.json({ campaigns: [campaignSummaryApiFixture] });
      }),
    );
    renderPage();
    const u = userEvent.setup();
    await u.click(
      await screen.findByRole("button", { name: "Tentar de novo" }, { timeout: 5000 }),
    );
    expect(await screen.findByText(campaignSummaryFixture.name)).toBeInTheDocument();
    expect(calls).toBe(3);
  });

  it("sem token redireciona para o login", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/" element={<div>login</div>} />
      </Routes>,
      { route: "/campaigns", token: null },
    );
    expect(await screen.findByText("login")).toBeInTheDocument();
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
