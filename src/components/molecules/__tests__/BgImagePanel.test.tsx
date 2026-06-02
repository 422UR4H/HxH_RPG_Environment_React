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

const bgFixture: NonNullable<BgImage> = {
  url: "https://img.example.com/map.png",
  x: 10,
  y: 20,
  width: 800,
  height: 600,
  rotation: 0,
  opacity: 0.8,
};

describe("BgImagePanel — with image", () => {
  it("renders calibration controls", () => {
    renderWithProviders(<BgImagePanel {...baseProps} bg={bgFixture} />);
    expect(screen.getByLabelText(/pos x/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pos y/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rotação/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/opacidade/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /trocar imagem/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remover/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /encaixar no grid/i })).toBeInTheDocument();
  });

  it("calls onBgChange when Pos X input changes", async () => {
    const user = userEvent.setup();
    const onBgChange = vi.fn();
    renderWithProviders(<BgImagePanel {...baseProps} bg={bgFixture} onBgChange={onBgChange} />);
    const input = screen.getByLabelText(/pos x/i);
    await user.clear(input);
    await user.type(input, "50");
    expect(onBgChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ x: 50 }),
    );
  });

  it("calls onBgChange(null) when Remover is clicked", async () => {
    const user = userEvent.setup();
    const onBgChange = vi.fn();
    renderWithProviders(<BgImagePanel {...baseProps} bg={bgFixture} onBgChange={onBgChange} />);
    await user.click(screen.getByRole("button", { name: /remover/i }));
    expect(onBgChange).toHaveBeenCalledWith(null);
  });

  it("calls onBgChange when Encaixar no grid is clicked", async () => {
    const user = userEvent.setup();
    const onBgChange = vi.fn();
    renderWithProviders(<BgImagePanel {...baseProps} bg={bgFixture} onBgChange={onBgChange} />);
    await user.click(screen.getByRole("button", { name: /encaixar no grid/i }));
    expect(onBgChange).toHaveBeenCalledWith(
      expect.objectContaining({ url: bgFixture.url }),
    );
  });

  it("lock aspect ratio — changing scale X also changes scale Y proportionally", async () => {
    const user = userEvent.setup();
    const onBgChange = vi.fn();
    renderWithProviders(<BgImagePanel {...baseProps} bg={bgFixture} onBgChange={onBgChange} />);
    const scaleX = screen.getByLabelText(/escala x/i);
    await user.clear(scaleX);
    await user.type(scaleX, "150");
    const calls = onBgChange.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1]![0] as NonNullable<BgImage>;
    const ratio = lastCall.height / lastCall.width;
    const originalRatio = bgFixture.height / bgFixture.width;
    expect(ratio).toBeCloseTo(originalRatio, 1);
  });
});
