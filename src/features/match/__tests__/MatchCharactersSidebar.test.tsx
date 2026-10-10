import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MatchCharactersSidebar from "../MatchCharactersSidebar";
import type { Participant } from "../../../types/match";

const participants: Participant[] = [
  {
    uuid: "p1",
    joinedAt: "2026-06-01T00:00:00Z",
    characterSheet: {
      uuid: "c1",
      playerUuid: "user-1",
      masterUuid: "master-1",
      campaignUuid: "campaign-1",
      nickName: "Gon",
      createdAt: "2026-06-01T00:00:00Z",
      updatedAt: "2026-06-01T00:00:00Z",
    },
  },
];

const props = {
  gameStarted: true,
  enrollments: [],
  participants,
  isMaster: true,
  actionLoading: {},
  onAccept: () => {},
  onReject: () => {},
  onSelectCharacterSheet: () => {},
};

describe("MatchCharactersSidebar", () => {
  it("o `footer` aparece depois dos cards", () => {
    render(<MatchCharactersSidebar {...props} footer={<p>rodapé</p>} />);
    const footer = screen.getByText("rodapé");
    const card = screen.getByText("Gon");
    expect(card.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("`fluid` ocupa a largura toda do painel", () => {
    render(<MatchCharactersSidebar {...props} fluid />);
    expect(screen.getByRole("complementary")).toHaveStyle({ width: "100%" });
  });
});
