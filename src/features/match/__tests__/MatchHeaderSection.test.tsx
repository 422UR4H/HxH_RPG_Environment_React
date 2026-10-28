import { describe, it, expect } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../../../test/render";
import MatchHeaderSection from "../MatchHeaderSection";
import type { Match } from "../../../types/match";
import { formatDateTimeBR } from "../../../utils/date";

const match: Match = {
  uuid: "m1",
  campaignUuid: "c1",
  masterUuid: "u1",
  title: "Partida",
  briefInitialDescription: "Breve",
  description: "Descrição",
  isPublic: true,
  gameScheduledAt: "2026-10-01T18:00:00Z",
  gameStartAt: "2026-10-02T19:30:00Z",
  storyStartAt: "2026-01-01T00:00:00Z",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

describe("MatchHeaderSection", () => {
  it("shows the scheduled date in the shared tooltip on the started-at value, without a title attribute", () => {
    renderWithProviders(
      <MatchHeaderSection
        match={match}
        status="ongoing"
        lobbyNotOpen={false}
        onDescriptionToggle={() => {}}
      />,
    );
    const value = screen.getByText(formatDateTimeBR(match.gameStartAt!));
    expect(value).not.toHaveAttribute("title");
    expect(value).toHaveAttribute("tabindex", "0");
    fireEvent.pointerEnter(value, { pointerType: "mouse" });
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent(
      `Agendada para: ${formatDateTimeBR(match.gameScheduledAt)}`,
    );
  });

  it("shows the lobby-not-open notice as a status when lobbyNotOpen is set", () => {
    renderWithProviders(
      <MatchHeaderSection
        match={match}
        status="scheduled"
        lobbyNotOpen
        onDescriptionToggle={() => {}}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "O mestre ainda não abriu o lobby. Tente de novo daqui a pouco.",
    );
  });
});
