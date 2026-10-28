import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import TacticalMapPlacer from "../TacticalMapPlacer";
import { mapFixture } from "../../../test/fixtures/map";
import { renderWithProviders } from "../../../test/render";

const baseProps = {
  map: { ...mapFixture, id: "map-1" },
  campaignId: "campaign-1",
  pieces: [],
  onPiecesChange: vi.fn(),
  sendPieceMoved: vi.fn(),
};

describe("TacticalMapPlacer", () => {
  it("shows the Enquadrar button for the master", () => {
    renderWithProviders(<TacticalMapPlacer {...baseProps} />);
    expect(screen.getByRole("button", { name: "Enquadrar" })).toBeInTheDocument();
  });

  it("shows the Enquadrar button for the player", () => {
    renderWithProviders(
      <TacticalMapPlacer {...baseProps} draggablePieceIds={new Set()} playerCharacterIds={[]} />,
    );
    expect(screen.getByRole("button", { name: "Enquadrar" })).toBeInTheDocument();
  });
});
