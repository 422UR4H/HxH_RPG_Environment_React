import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import CampaignCard from "../CampaignCard";
import type { CampaignSummary } from "../../../types/campaigns";

const campaign = { name: "Camp", storyStartAt: "2000-01-01", briefInitialDescription: "" } as CampaignSummary;

describe("CampaignCard next game", () => {
  it("never shows NaN for an invalid date", () => {
    render(
      <MemoryRouter>
        <CampaignCard campaign={campaign} to="/x" nextGameScheduledAt="not-a-date" />
      </MemoryRouter>,
    );
    expect(document.body.textContent).not.toContain("NaN");
    expect(screen.getByText(/Partida agendada/)).toBeTruthy();
  });
});
