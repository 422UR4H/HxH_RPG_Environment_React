// O fio que faz a mesa desenhar com a grade e o fundo do TABULEIRO da partida: o `map` que
// `useGameTable` devolve às páginas troca grid/bg do REST pelos do `map_full_state`.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { act, screen } from "@testing-library/react";
import { server } from "../../../../test/server";
import { renderWithProviders } from "../../../../test/render";
import { matchApiFixture } from "../../../../test/fixtures/match";
import { mapApiFixture } from "../../../../test/fixtures/map";
import { installFakeWebSocket, waitForSocket } from "../../../../test/fakeWebSocket";
import { useGameTable } from "../useGameTable";

const baseUrl = "http://localhost:5000";

function Probe() {
  const game = useGameTable({
    token: "fake-jwt-token", matchId: "match-1", declaredSource: "queue", actorId: undefined,
  });
  if (!game.map) return <div data-testid="probe">loading</div>;
  return (
    <div data-testid="probe" data-cell-size={game.map.grid.cellSize} data-bg={game.map.bg?.url ?? "null"} />
  );
}

beforeEach(() => {
  installFakeWebSocket();
  server.use(
    http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json({ match: matchApiFixture })),
    http.get(`${baseUrl}/matches/:id/map`, () =>
      HttpResponse.json({ matchMap: { matchUuid: "match-1", mapUuid: "map-1", attachedAt: "2026-06-04T00:00:00Z" } }),
    ),
    http.get(`${baseUrl}/maps/:id`, () =>
      HttpResponse.json({
        map: { ...mapApiFixture, bg: { url: "rest.png", x: 0, y: 0, width: 1, height: 1, rotation: 0, opacity: 1 } },
      }),
    ),
    http.get(`${baseUrl}/matches/:id/participants`, () => HttpResponse.json({ participants: [] })),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("useGameTable — mapa da mesa", () => {
  it("é o do REST até o map_full_state e passa a ter grade e fundo do tabuleiro depois", async () => {
    renderWithProviders(<Probe />);
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    await vi.waitFor(() => expect(screen.getByTestId("probe")).toHaveAttribute("data-cell-size", "64"));
    expect(screen.getByTestId("probe")).toHaveAttribute("data-bg", "rest.png");

    act(() =>
      ws.emit("map_full_state", {
        pieces: [], walls: [], visiblePolygons: [], fogMode: "explored",
        grid: { kind: "square", cols: 8, rows: 8, cellSize: 40, skewRatio: 1, rotation: 0, color: "#000", opacity: 0.5, lineStyle: "solid" },
        bg: null,
      }),
    );
    expect(screen.getByTestId("probe")).toHaveAttribute("data-cell-size", "40");
    expect(screen.getByTestId("probe")).toHaveAttribute("data-bg", "null");
  });
});
