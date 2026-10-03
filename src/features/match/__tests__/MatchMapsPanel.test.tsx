import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import MatchMapsPanel from "../MatchMapsPanel";
import { mapFixture } from "../../../test/fixtures/map";

type Props = ComponentProps<typeof MatchMapsPanel>;

function renderPanel(overrides: Partial<Props> = {}) {
  const props: Props = {
    activeTab: "maps",
    isMaster: true,
    matchEnded: false,
    matchStarted: false,
    mapsPending: false,
    maps: [mapFixture, { ...mapFixture, id: "map-2", name: "Outro Mapa" }],
    matchMap: null,
    isAttaching: false,
    isDetaching: false,
    boardSources: {},
    onMapClick: vi.fn(),
    onAttach: vi.fn(),
    onDetach: vi.fn(),
    onInherit: vi.fn(),
    ...overrides,
  };
  render(<MatchMapsPanel {...props} />);
  return props;
}

const sources = {
  "map-1": [
    { matchUuid: "d", title: "Partida D", startedAt: "2025-12-10T19:00:00Z" },
    { matchUuid: "a", title: "Partida A", startedAt: "2025-12-01T19:00:00Z" },
  ],
};

describe("MatchMapsPanel — continuar o tabuleiro de outra partida (F15)", () => {
  it("sem partida de origem, a opção não aparece", () => {
    renderPanel();
    expect(screen.queryByText(/Continuar o tabuleiro de/i)).not.toBeInTheDocument();
  });

  it("lista as partidas de origem do mapa com título e data", () => {
    renderPanel({ boardSources: sources });
    // Só o mapa que tem origem ganha a opção.
    expect(screen.getAllByText(/Continuar o tabuleiro de/i)).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Partida D · 10/12/2025" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Partida A · 01/12/2025" })).toBeInTheDocument();
  });

  it("avisa que a herança deve ser feita com o lobby fechado", () => {
    renderPanel({ boardSources: sources });
    expect(screen.getByText(/lobby fechado/i)).toBeInTheDocument();
  });

  it("escolher uma partida pede a herança com o mapa e a partida de origem", async () => {
    const props = renderPanel({ boardSources: sources });
    await userEvent.setup().click(screen.getByRole("button", { name: "Partida A · 01/12/2025" }));
    expect(props.onInherit).toHaveBeenCalledWith("map-1", "a");
  });

  it("também no mapa já anexado: herdar substitui o tabuleiro que ele tinha", () => {
    renderPanel({
      boardSources: sources,
      matchMap: { matchUuid: "self", mapUuid: "map-1", attachedAt: "2026-06-04T00:00:00Z" },
    });
    expect(screen.getByRole("button", { name: "Partida A · 01/12/2025" })).toBeInTheDocument();
  });

  it("avisa que herdar anexa este mapa e substitui o tabuleiro atual", () => {
    renderPanel({ boardSources: sources });
    expect(
      screen.getByText("Anexa este mapa e substitui o tabuleiro atual desta partida."),
    ).toBeInTheDocument();
  });

  it("no mapa já anexado, avisa só que substitui o tabuleiro atual", () => {
    renderPanel({
      boardSources: sources,
      matchMap: { matchUuid: "self", mapUuid: "map-1", attachedAt: "2026-06-04T00:00:00Z" },
    });
    expect(screen.getByText("Substitui o tabuleiro atual desta partida.")).toBeInTheDocument();
  });

  it("enquanto anexa, as opções ficam desabilitadas", () => {
    renderPanel({ boardSources: sources, isAttaching: true });
    expect(screen.getByRole("button", { name: "Partida A · 01/12/2025" })).toBeDisabled();
  });

  it("partida iniciada: a opção não aparece", () => {
    renderPanel({ boardSources: sources, matchStarted: true });
    expect(screen.queryByText(/Continuar o tabuleiro de/i)).not.toBeInTheDocument();
  });

  it("mostra o aviso de sucesso que a página mandar", () => {
    renderPanel({ changeNotice: "O tabuleiro de «Partida A» continua nesta partida." });
    expect(screen.getByRole("status")).toHaveTextContent("O tabuleiro de «Partida A» continua nesta partida.");
  });
});
