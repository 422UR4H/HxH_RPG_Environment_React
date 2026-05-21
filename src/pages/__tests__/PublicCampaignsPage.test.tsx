// src/pages/__tests__/PublicCampaignsPage.test.tsx
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { campaignSummaryFixture } from "../../test/fixtures/campaign";
import PublicCampaignsPage from "../PublicCampaignsPage";

const baseUrl = "http://localhost:5000";

function renderPage(opts: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(<PublicCampaignsPage />, {
    route: "/campaigns/public",
    path: "/campaigns/public",
    ...opts,
  });
}

describe("PublicCampaignsPage", () => {
  it("mostra 'Carregando campanhas...' inicialmente", () => {
    server.use(
      http.get(`${baseUrl}/public/campaigns`, async () => {
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json({ campaigns: [campaignSummaryFixture] });
      }),
    );
    renderPage();
    expect(screen.getByText(/Carregando campanhas\.\.\./i)).toBeInTheDocument();
  });

  it("mostra erro se a API falha", async () => {
    server.use(
      http.get(`${baseUrl}/public/campaigns`, () =>
        HttpResponse.json({ error: "x" }, { status: 500 }),
      ),
    );
    renderPage();
    expect(await screen.findByText(/Falha ao carregar campanhas/i, {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it("mostra 'Nenhuma campanha pública disponível' quando lista é vazia", async () => {
    server.use(
      http.get(`${baseUrl}/public/campaigns`, () => HttpResponse.json({ campaigns: [] })),
    );
    renderPage();
    expect(await screen.findByText(/Nenhuma campanha pública/i)).toBeInTheDocument();
  });

  it("renderiza cards das campanhas públicas", async () => {
    renderPage();
    expect(await screen.findByText(campaignSummaryFixture.name)).toBeInTheDocument();
  });

  it("redireciona pra '/' se não há token", () => {
    const { container } = renderPage({ token: null });
    expect(container.querySelector("h1")).toBeNull();
  });
});
