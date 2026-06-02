import { describe, it, expect, vi } from "vitest";
import { screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/render";
import PiecePropertyPanel from "../PiecePropertyPanel";
import { npcFixture } from "../../../test/fixtures/campaign";
import { pieceFixture } from "../../../test/fixtures/map";

const baseProps = {
  piece: pieceFixture,
  npc: npcFixture,
  onZChange: vi.fn(),
  onRemove: vi.fn(),
};

describe("PiecePropertyPanel", () => {
  it("exibe o nome do NPC", () => {
    renderWithProviders(<PiecePropertyPanel {...baseProps} />);
    expect(screen.getByText("Soldado Zoldyck")).toBeInTheDocument();
  });

  it("Z slider está dentro do collapsible (fechado por padrão)", () => {
    renderWithProviders(<PiecePropertyPanel {...baseProps} />);
    const details = screen.getByTestId("mais-configs");
    expect(details).not.toHaveAttribute("open");
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("slider chama onZChange ao mudar valor", async () => {
    const user = userEvent.setup();
    const onZChange = vi.fn();
    renderWithProviders(
      <PiecePropertyPanel {...baseProps} onZChange={onZChange} />,
    );
    const details = screen.getByTestId("mais-configs");
    await user.click(within(details).getByRole("button", { name: /mais configurações/i }));
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "0.5" } });
    expect(onZChange).toHaveBeenCalledWith(0.5);
  });

  it("botão Remover chama onRemove", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderWithProviders(<PiecePropertyPanel {...baseProps} onRemove={onRemove} />);
    await user.click(screen.getByRole("button", { name: /remover do mapa/i }));
    expect(onRemove).toHaveBeenCalled();
  });
});
