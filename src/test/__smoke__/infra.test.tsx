// src/test/__smoke__/infra.test.tsx
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../render";
import CampaignsPage from "../../pages/CampaignsPage";

describe("Infra smoke test", () => {
  it("renderiza CampaignsPage e busca o título via MSW", async () => {
    renderWithProviders(<CampaignsPage />, {
      route: "/campaigns",
      path: "/campaigns",
    });

    expect(await screen.findByText(/LISTA DE CAMPANHAS/i)).toBeInTheDocument();
  });
});
