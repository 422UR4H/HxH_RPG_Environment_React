import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { campaignAsMasterApi } from "../../test/fixtures/campaign";
import { masterUserFixture } from "../../test/fixtures/user";
import EditCampaignPage from "../EditCampaignPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseUrl = "http://localhost:5000";

function serveCampaign(withStartedMatch: boolean) {
  const campaign = campaignAsMasterApi(masterUserFixture.user.uuid);
  server.use(
    http.get(`${baseUrl}/campaigns/:id`, () =>
      HttpResponse.json({
        campaign: {
          ...campaign,
          matches: withStartedMatch
            ? [{ uuid: "m-1", title: "Iniciada", gameStartAt: "2025-01-01T10:05:00Z" }]
            : [],
        },
      }),
    ),
  );
}

function renderPage() {
  return renderWithProviders(<EditCampaignPage />, {
    route: "/campaigns/campaign-1/edit",
    path: "/campaigns/:id/edit",
    user: masterUserFixture,
  });
}

describe("EditCampaignPage — required fields (FOR-06)", () => {
  beforeEach(() => mockNavigate.mockReset());

  it("asks for the name while no match has started", async () => {
    serveCampaign(false);
    renderPage();
    const u = userEvent.setup();
    await u.clear(await screen.findByLabelText("Nome da Campanha"));
    await u.click(screen.getByRole("button", { name: /Salvar/i }));
    expect(
      await screen.findByText("Preencha o campo obrigatório: Nome da Campanha."),
    ).toBeInTheDocument();
  });

  it("leaves the locked name out of the check once a match has started", async () => {
    serveCampaign(true);
    renderPage();
    const u = userEvent.setup();
    expect(await screen.findByLabelText("Nome da Campanha")).toBeDisabled();
    await u.clear(screen.getByLabelText("Descrição Breve"));
    await u.click(screen.getByRole("button", { name: /Salvar/i }));
    expect(
      await screen.findByText("Preencha o campo obrigatório: Descrição Breve."),
    ).toBeInTheDocument();
  });
});
