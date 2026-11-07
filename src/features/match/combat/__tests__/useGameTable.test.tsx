// O fio que faz a mesa desenhar só com a grade e o fundo do TABULEIRO da partida: o `map` que
// `useGameTable` devolve às páginas só existe depois do `map_full_state`; até lá a mesa espera
// (`boardPending`) em vez de desenhar o mapa da campanha.
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
  if (!game.map) return <div data-testid="probe" data-pending={String(game.boardPending)}>loading</div>;
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
  it("espera o tabuleiro — nunca o mapa da campanha — e depois desenha a grade e o fundo dele", async () => {
    renderWithProviders(<Probe />);
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    // O mapa REST (64px, rest.png) carregou, mas o tabuleiro não chegou: nada para desenhar.
    await vi.waitFor(() => expect(screen.getByTestId("probe")).toHaveAttribute("data-pending", "true"));
    expect(screen.getByTestId("probe")).not.toHaveAttribute("data-cell-size");

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

  it("sem mapa anexado não fica esperando tabuleiro nenhum", async () => {
    server.use(http.get(`${baseUrl}/matches/:id/map`, () => new HttpResponse(null, { status: 204 })));
    renderWithProviders(<Probe />);
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    await vi.waitFor(() => expect(screen.getByTestId("probe")).toHaveAttribute("data-pending", "false"));
  });
});

describe("useGameTable — stacked moves", () => {
  const grid = { kind: "square", cols: 8, rows: 8, cellSize: 40, skewRatio: 1, rotation: 0, color: "#000", opacity: 0.5, lineStyle: "solid" };
  let game: ReturnType<typeof useGameTable> | undefined;
  function GameProbe() {
    game = useGameTable({ token: "fake-jwt-token", matchId: "match-1", declaredSource: "ownQueue", actorId: "c1" });
    return null;
  }
  const move = (col: number) => ({
    actorId: "c1", move: { category: "Dash" as const, position: [col, 0, 0] as [number, number, number] },
  });

  it("a stacked ghost starts at its predecessor's destination, and a move back to the piece is not dismissed as arrived", async () => {
    renderWithProviders(<GameProbe />);
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    act(() =>
      ws.emit("map_full_state", {
        pieces: [{ pieceId: "p1", characterId: "c1", slot: { kind: "square", col: 0, row: 0 } }],
        walls: [], visiblePolygons: [], fogMode: "live", grid, bg: null,
      }),
    );
    act(() => { game!.combat.send.enqueueAction(move(3)); });
    act(() => ws.emit("action_enqueued", { actionId: "a1" }));
    // A próxima composição parte do fim da cadeia.
    expect(game!.composer.preview).toBeUndefined();
    act(() => game!.composer.onSlotTap({ kind: "square", col: 5, row: 0 }));
    expect(game!.composer.preview?.from).toEqual({ kind: "square", col: 3, row: 0 });

    act(() => { game!.combat.send.enqueueAction(move(0)); }); // volta para onde a peça está
    act(() => ws.emit("action_enqueued", { actionId: "a2" }));
    expect(game!.combat.state.declared.map((d) => d.id)).toEqual(["a1", "a2"]);
    expect(game!.ghosts).toEqual([
      { from: [0, 0, 0], to: [3, 0, 0] },
      { from: [3, 0, 0], to: [0, 0, 0] },
    ]);
  });
});
