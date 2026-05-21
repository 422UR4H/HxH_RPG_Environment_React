// src/test/__smoke__/infra.test.tsx
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../render";
import { campaignSummaryFixture } from "../fixtures/campaign";
import CampaignsPage from "../../pages/CampaignsPage";

describe("Infra smoke test", () => {
  it("renderiza CampaignsPage com o título e os dados vindos do MSW", async () => {
    renderWithProviders(<CampaignsPage />, {
      route: "/campaigns",
      path: "/campaigns",
    });

    // Título renderiza sempre — prova que a página montou.
    expect(await screen.findByText(/LISTA DE CAMPANHAS/i)).toBeInTheDocument();

    // O nome da campanha vem do fixture via MSW → service → hook.
    // Se o envelope do handler estiver errado, isto NÃO renderiza.
    expect(
      await screen.findByText(campaignSummaryFixture.name),
    ).toBeInTheDocument();
  });
});
