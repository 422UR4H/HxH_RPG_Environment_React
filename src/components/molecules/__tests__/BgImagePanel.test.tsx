import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/render";
import BgImagePanel from "../BgImagePanel";
import { DEFAULT_GRID } from "../../../features/tactical-map/defaultMap";
import type { BgImage } from "../../../types/tacticalMap";

const noop = vi.fn();

const baseProps = {
  bg: null as BgImage,
  grid: DEFAULT_GRID,
  mapId: "map-123",
  onBgChange: noop,
  onGridChange: noop,
};

describe("BgImagePanel — no image", () => {
  it("renders dropzone and URL input", () => {
    renderWithProviders(<BgImagePanel {...baseProps} />);
    expect(screen.getByText(/clique ou solte/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/url da imagem/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /adicionar/i })).toBeInTheDocument();
  });

  it("shows the IMAGE_PICKER_TIP message", () => {
    renderWithProviders(<BgImagePanel {...baseProps} />);
    expect(screen.getByText(/adicione por arquivo ou url/i)).toBeInTheDocument();
  });

  it("URL input and Adicionar button are interactive", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BgImagePanel {...baseProps} />);
    const input = screen.getByPlaceholderText(/url da imagem/i);
    await user.type(input, "https://img.example.com/map.png");
    expect(input).toHaveValue("https://img.example.com/map.png");
    // Button should now be enabled (URL is non-empty)
    expect(screen.getByRole("button", { name: /adicionar/i })).not.toBeDisabled();
  });
});
