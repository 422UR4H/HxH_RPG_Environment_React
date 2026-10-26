import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { matchApiFixture, matchAsMasterApi } from "../../test/fixtures/match";
import { masterUserFixture, userFixture } from "../../test/fixtures/user";
import { mapApiFixture, mapWithPiecesApi, pieceFixture } from "../../test/fixtures/map";
import LobbyPage from "../LobbyPage";
import { useLobbyWs } from "../../hooks/useLobbyWs";
import type { WsStatus } from "../../hooks/useLobbyWs";

// O hook real por padrão; os testes de status o substituem por um retorno fixo.
vi.mock("../../hooks/useLobbyWs", async () => {
  const actual = await vi.importActual<typeof import("../../hooks/useLobbyWs")>("../../hooks/useLobbyWs");
  return { ...actual, useLobbyWs: vi.fn(actual.useLobbyWs) };
});

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return { ...actual, useNavigate: () => mockNavigate };
});

// O placer real desenha no Pixi (mockado); o stub expõe as peças que a página lhe entrega e a
// geometria do mapa que ele desenharia (grade, fundo, paredes).
vi.mock("../../features/tactical-map/TacticalMapPlacer", () => ({
  default: (props: {
    pieces: Array<{ id: string }>;
    map: { grid: { cellSize: number }; bg: { url: string } | null; walls: Array<{ id: string }> };
  }) => (
    <div
      data-testid="tactical-map-placer"
      data-piece-ids={JSON.stringify(props.pieces.map((p) => p.id))}
      data-cell-size={props.map.grid.cellSize}
      data-bg={props.map.bg?.url ?? "null"}
      data-wall-ids={JSON.stringify(props.map.walls.map((w) => w.id))}
    />
  ),
}));

// A grade do TABULEIRO, diferente da do mapa da campanha (fixture: 64px).
const boardGrid = {
  kind: "square", cols: 8, rows: 8, cellSize: 40, skewRatio: 1, rotation: 0, color: "#000", opacity: 0.5, lineStyle: "solid",
};

const baseUrl = "http://localhost:5000";

// ─── WebSocket mock ───────────────────────────────────────────────────────────
interface MockWsInstance {
  onmessage: ((e: MessageEvent) => void) | null;
  onclose: ((e: CloseEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onopen: ((e: Event) => void) | null;
  close: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  readyState: number;
}
let wsInstance: MockWsInstance;
const MockWebSocket = vi.fn().mockImplementation(function () {
  wsInstance = {
    onmessage: null,
    onclose: null,
    onerror: null,
    onopen: null,
    close: vi.fn(),
    send: vi.fn(),
    readyState: 1,
  };
  return wsInstance;
});
Object.assign(MockWebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });

async function waitForWsConnect() {
  await waitFor(() => expect(MockWebSocket).toHaveBeenCalled());
}
function simulateWsOpen() {
  wsInstance.onopen?.({} as Event);
}
function sendFromServer(type: string, payload: unknown = {}) {
  wsInstance.onmessage?.({
    data: JSON.stringify({ type, payload }),
  } as MessageEvent);
}

// ─── MSW handlers ─────────────────────────────────────────────────────────────
const acceptedEnrollment = {
  uuid: "enrollment-1",
  status: "accepted",
  createdAt: "2025-01-01T00:00:00Z",
  characterSheet: {
    uuid: "sheet-1",
    nickName: "Gon",
    playerUuid: "user-1",
  },
  player: { uuid: "user-1", nick: "Gon" },
};

function setupHandlers(masterUuid = "master-1") {
  server.use(
    http.get(`${baseUrl}/matches/:id`, () =>
      HttpResponse.json({
        match: matchAsMasterApi(masterUuid),
      }),
    ),
    http.get(`${baseUrl}/matches/:id/enrollments`, () =>
      HttpResponse.json({ enrollments: [acceptedEnrollment] }),
    ),
  );
}

function renderPage(opts: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(<LobbyPage />, {
    route: "/campaigns/campaign-1/matches/match-1/lobby",
    path: "/campaigns/:campaignId/matches/:matchId/lobby",
    ...opts,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("LobbyPage", () => {
  beforeEach(async () => {
    const actual = await vi.importActual<typeof import("../../hooks/useLobbyWs")>("../../hooks/useLobbyWs");
    vi.mocked(useLobbyWs).mockImplementation(actual.useLobbyWs);
    vi.stubGlobal("WebSocket", MockWebSocket);
    mockNavigate.mockReset();
    MockWebSocket.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mostra loading enquanto dados carregam", () => {
    server.use(
      http.get(`${baseUrl}/matches/:id`, async () => {
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json({ match: matchApiFixture });
      }),
      http.get(`${baseUrl}/matches/:id/enrollments`, () =>
        HttpResponse.json({ enrollments: [] }),
      ),
    );
    renderPage();
    expect(screen.getByText(/Carregando/i)).toBeInTheDocument();
  });

  it("500 on the match shows the lobby error with 'Tentar de novo'", async () => {
    server.use(
      http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json({ error: "x" }, { status: 500 })),
      http.get(`${baseUrl}/matches/:id/enrollments`, () =>
        HttpResponse.json({ enrollments: [] }),
      ),
    );
    renderPage();
    expect(
      await screen.findByText("Não foi possível carregar o lobby", {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });

  it("mestre vê botão Iniciar Partida e Cancelar Lobby", async () => {
    setupHandlers("master-1");
    renderPage({ user: masterUserFixture });
    await waitForWsConnect();
    simulateWsOpen();
    sendFromServer("room_state", {
      matchUuid: "match-1",
      state: "lobby",
      players: [],
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Iniciar Partida/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Cancelar Lobby/i }),
      ).toBeInTheDocument();
    });
  });

  it("jogador não vê botões de ação", async () => {
    setupHandlers("master-1");
    renderPage({ user: userFixture });
    await waitForWsConnect();
    simulateWsOpen();
    sendFromServer("room_state", {
      matchUuid: "match-1",
      state: "lobby",
      players: [],
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /Iniciar Partida/i }),
      ).not.toBeInTheDocument();
      expect(screen.getByText(/Aguardando o mestre/i)).toBeInTheDocument();
    });
  });

  it("redireciona para a partida quando lobby_not_open (não mestre)", async () => {
    setupHandlers();
    renderPage({ user: userFixture });
    await waitForWsConnect();
    simulateWsOpen();
    sendFromServer("lobby_not_open", {});

    await waitFor(() => {
      expect(screen.queryByText(/LOBBY ABERTO/i)).not.toBeInTheDocument();
    });
  });

  it("exibe mensagem kicked", async () => {
    setupHandlers();
    renderPage({ user: userFixture });
    await waitForWsConnect();
    simulateWsOpen();
    sendFromServer("player_kicked", {
      uuid: "user-1",
      nickname: "Gon",
      reason: "kicked",
    });

    await waitFor(() => {
      expect(screen.getByText(/removido do lobby/i)).toBeInTheDocument();
    });
  });

  it("navega para /game ao receber match_started", async () => {
    setupHandlers("master-1");
    renderPage({ user: masterUserFixture });
    await waitForWsConnect();
    simulateWsOpen();
    sendFromServer("room_state", {
      matchUuid: "match-1",
      state: "lobby",
      players: [],
    });
    sendFromServer("match_started", {});

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        "/campaigns/campaign-1/matches/match-1/game",
      );
    });
  });

  it("usuário sem enrollment aceito não vê o lobby e WS não conecta", async () => {
    server.use(
      http.get(`${baseUrl}/matches/:id`, () =>
        HttpResponse.json({
          match: matchAsMasterApi("master-1"),
        }),
      ),
      http.get(`${baseUrl}/matches/:id/enrollments`, () =>
        HttpResponse.json({ enrollments: [] }),
      ),
    );
    renderPage({ user: userFixture });

    await waitFor(() => {
      expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/LOBBY ABERTO/i)).not.toBeInTheDocument();
    expect(MockWebSocket).not.toHaveBeenCalled();
  });

  it("mestre confirma cancelamento antes de enviar cancel_lobby", async () => {
    setupHandlers("master-1");
    renderPage({ user: masterUserFixture });
    await waitForWsConnect();
    simulateWsOpen();
    sendFromServer("room_state", {
      matchUuid: "match-1",
      state: "lobby",
      players: [],
    });

    const cancelBtn = await screen.findByRole("button", {
      name: /Cancelar Lobby/i,
    });
    await userEvent.click(cancelBtn);

    // ConfirmDialog should appear
    await waitFor(() => {
      expect(screen.getByText(/Tem certeza/i)).toBeInTheDocument();
    });
  });

  it("shows the same four rule cards as the match, marked as coming soon", async () => {
    setupHandlers("master-1");
    renderPage({ user: masterUserFixture });
    const rules = await screen.findByRole("complementary", { name: /Regras/i });
    expect(within(rules).getByText("Em breve")).toBeInTheDocument();
    expect(within(rules).getByRole("heading", { name: "Progressão de Personagens" })).toBeInTheDocument();
    expect(within(rules).getByRole("heading", { name: "Nen & Habilidades" })).toBeInTheDocument();
    expect(
      within(rules).getByText("Mais opções de configuração serão adicionadas em breve."),
    ).toBeInTheDocument();
  });

  describe("LobbyPage — connection states", () => {
    const reconnect = vi.fn();
    function forceStatus(status: WsStatus) {
      vi.mocked(useLobbyWs).mockImplementation(() => ({
        status,
        participants: [],
        sendStartMatch: vi.fn(),
        sendKick: vi.fn(),
        sendCancelLobby: vi.fn(),
        sendPieceMoved: vi.fn(),
        sendPieceRemoved: vi.fn(),
        reconnect,
      }));
    }
    beforeEach(() => reconnect.mockReset());

    it("waking shows the server-waking message", async () => {
      setupHandlers("master-1");
      forceStatus("waking");
      renderPage({ user: masterUserFixture });
      expect(
        await screen.findByText("Acordando o servidor da mesa… pode levar até um minuto."),
      ).toBeInTheDocument();
    });

    it("unreachable shows the message and 'Tentar de novo', which calls reconnect", async () => {
      setupHandlers("master-1");
      forceStatus("unreachable");
      renderPage({ user: masterUserFixture });
      expect(
        await screen.findByText("Não foi possível conectar ao servidor da mesa."),
      ).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
      expect(reconnect).toHaveBeenCalledTimes(1);
    });

    it("connecting shows 'Conectando ao lobby…' without 'Tentar de novo'", async () => {
      setupHandlers("master-1");
      forceStatus("connecting");
      renderPage({ user: masterUserFixture });
      expect(await screen.findByText("Conectando ao lobby…")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument();
    });

    it.each<WsStatus>(["connecting", "waking", "unreachable"])(
      "%s: Iniciar Partida e Cancelar Lobby ficam desativados",
      async (status) => {
        setupHandlers("master-1");
        forceStatus(status);
        renderPage({ user: masterUserFixture });
        expect(await screen.findByRole("button", { name: /Iniciar Partida/i })).toBeDisabled();
        expect(screen.getByRole("button", { name: /Cancelar Lobby/i })).toBeDisabled();
      },
    );

    it("connected: the master's buttons are enabled", async () => {
      setupHandlers("master-1");
      forceStatus("connected");
      renderPage({ user: masterUserFixture });
      expect(await screen.findByRole("button", { name: /Iniciar Partida/i })).toBeEnabled();
      expect(screen.getByRole("button", { name: /Cancelar Lobby/i })).toBeEnabled();
    });

    it.each<WsStatus>(["connecting", "waking", "unreachable", "connected"])(
      "%s: 'Muitas tentativas' não aparece",
      async (status) => {
        setupHandlers("master-1");
        forceStatus(status);
        renderPage({ user: masterUserFixture });
        await screen.findByRole("button", { name: /Iniciar Partida/i });
        expect(screen.queryByText(/Muitas tentativas/i)).not.toBeInTheDocument();
      },
    );
  });

  describe("LobbyPage — mapa", () => {
    // B14: o tabuleiro do lobby é do servidor (carregado de `match_boards` ou de um retrato do
    // mapa anexado) e chega em `map_full_state` — para o mestre também. Grade, fundo e paredes
    // vêm dele; do mapa da campanha (REST) não vem geometria nenhuma.
    describe("o tabuleiro é do servidor, também para o mestre", () => {
      const restPiece = { ...pieceFixture, id: "rest-piece", characterId: "sheet-1" };
      function withAttachedMap() {
        setupHandlers("master-1");
        server.use(
          http.get(`${baseUrl}/matches/:id/map`, () =>
            HttpResponse.json({
              matchMap: { matchUuid: "match-1", mapUuid: "map-1", attachedAt: "2026-01-01T00:00:00Z" },
            }),
          ),
          http.get(`${baseUrl}/maps/:id`, () => HttpResponse.json({ map: mapWithPiecesApi([restPiece]) })),
        );
      }
      const placedIds = () =>
        JSON.parse(screen.getByTestId("tactical-map-placer").getAttribute("data-piece-ids") ?? "[]");
      const sentTypes = () =>
        wsInstance.send.mock.calls.map(([raw]) => (JSON.parse(raw as string) as { type: string }).type);

      it("desenha as peças do map_full_state, não as do mapa da campanha", async () => {
        withAttachedMap();
        renderPage({ user: masterUserFixture });
        await waitForWsConnect();
        simulateWsOpen();
        sendFromServer("room_state", { matchUuid: "match-1", state: "lobby", players: [] });
        sendFromServer("map_full_state", {
          pieces: [{ pieceId: "server-piece", slot: { kind: "square", col: 4, row: 4 }, characterId: "sheet-1" }],
          walls: [], visiblePolygons: [], fogMode: "explored", grid: boardGrid, bg: null,
        });
        await screen.findByTestId("tactical-map-placer");
        await waitFor(() => expect(placedIds()).toEqual(["server-piece"]));
      });

      it("espera o tabuleiro em vez de desenhar o mapa da campanha", async () => {
        withAttachedMap();
        renderPage({ user: masterUserFixture });
        await waitForWsConnect();
        simulateWsOpen();
        sendFromServer("room_state", { matchUuid: "match-1", state: "lobby", players: [] });
        await screen.findByText(/Carregando o tabuleiro/i);
        expect(screen.queryByTestId("tactical-map-placer")).not.toBeInTheDocument();
      });

      it("board_unavailable: avisa a falha no lugar do mapa; o map_full_state seguinte desenha", async () => {
        withAttachedMap();
        renderPage({ user: masterUserFixture });
        await waitForWsConnect();
        simulateWsOpen();
        sendFromServer("room_state", { matchUuid: "match-1", state: "lobby", players: [] });
        sendFromServer("error", { code: "board_unavailable", message: "the match board could not be loaded; reconnect to try again" });
        await screen.findByText("Não foi possível carregar o tabuleiro da partida. Atualize a página para tentar de novo.");
        expect(screen.queryByText("Carregando o tabuleiro…")).not.toBeInTheDocument();

        sendFromServer("map_full_state", { pieces: [], walls: [], visiblePolygons: [], fogMode: "explored", grid: boardGrid, bg: null });
        await screen.findByTestId("tactical-map-placer");
        expect(screen.queryByText(/Não foi possível carregar o tabuleiro/)).not.toBeInTheDocument();
      });

      it("socket drop: the server is waking, the table waits", async () => {
        withAttachedMap();
        renderPage({ user: masterUserFixture });
        await waitForWsConnect();
        simulateWsOpen();
        sendFromServer("room_state", { matchUuid: "match-1", state: "lobby", players: [] });
        wsInstance.onclose?.({ code: 1006 } as CloseEvent);
        await screen.findAllByText("Acordando o servidor da mesa… pode levar até um minuto.");
      });

      it("o tabuleiro chegou e o REST do mapa falhou: desenha mesmo assim", async () => {
        withAttachedMap();
        server.use(http.get(`${baseUrl}/maps/:id`, () => new HttpResponse(null, { status: 500 })));
        renderPage({ user: masterUserFixture });
        await waitForWsConnect();
        simulateWsOpen();
        sendFromServer("room_state", { matchUuid: "match-1", state: "lobby", players: [] });
        sendFromServer("map_full_state", { pieces: [], walls: [], visiblePolygons: [], fogMode: "explored", grid: boardGrid, bg: null });
        await screen.findByTestId("tactical-map-placer");
      });

      it("desenha a grade, o fundo e as paredes do tabuleiro", async () => {
        withAttachedMap();
        renderPage({ user: masterUserFixture });
        await waitForWsConnect();
        simulateWsOpen();
        sendFromServer("room_state", { matchUuid: "match-1", state: "lobby", players: [] });
        sendFromServer("map_full_state", {
          pieces: [],
          walls: [{ id: "board-wall", p1: [0, 0], p2: [40, 0], wallType: "wall", material: "stone", sense: "full", hp: 10, maxHp: 10 }],
          fogMode: "explored",
          grid: boardGrid,
          bg: { url: "board.png", x: 0, y: 0, width: 320, height: 320, rotation: 0, opacity: 1 },
        });
        const placer = await screen.findByTestId("tactical-map-placer");
        expect(placer).toHaveAttribute("data-cell-size", "40");
        expect(placer).toHaveAttribute("data-bg", "board.png");
        expect(placer).toHaveAttribute("data-wall-ids", JSON.stringify(["board-wall"]));
      });

      it("tabuleiro vazio no servidor: não desenha as peças do REST nem manda map_state_sync", async () => {
        withAttachedMap();
        renderPage({ user: masterUserFixture });
        await waitForWsConnect();
        simulateWsOpen();
        sendFromServer("room_state", { matchUuid: "match-1", state: "lobby", players: [] });
        sendFromServer("map_full_state", { pieces: [], walls: [], fogMode: "explored", grid: boardGrid, bg: null });
        await screen.findByTestId("tactical-map-placer");
        await screen.findByRole("button", { name: /Iniciar Partida/i });

        expect(placedIds()).toEqual([]);
        expect(sentTypes()).not.toContain("map_state_sync");
      });
    });

    it("não renderiza mapa quando não há mapa anexado", async () => {
      setupHandlers("master-1");
      server.use(
        http.get(`${baseUrl}/matches/:id/map`, () =>
          new HttpResponse(null, { status: 204 }),
        ),
      );
      renderPage({ user: masterUserFixture });
      await waitForWsConnect();
      simulateWsOpen();
      sendFromServer("room_state", {
        matchUuid: "match-1",
        state: "lobby",
        players: [],
      });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Iniciar Partida/i }),
        ).toBeInTheDocument();
      });
      expect(
        screen.queryByTestId("tactical-map-placer"),
      ).not.toBeInTheDocument();
    });

    it("renderiza TacticalMapPlacer quando há mapa anexado", async () => {
      setupHandlers("master-1");
      server.use(
        http.get(`${baseUrl}/matches/:id/map`, () =>
          HttpResponse.json({
            matchMap: {
              matchUuid: "match-1",
              mapUuid: "map-1",
              attachedAt: "2026-01-01T00:00:00Z",
            },
          }),
        ),
        http.get(`${baseUrl}/maps/:id`, () =>
          HttpResponse.json({ map: mapApiFixture }),
        ),
      );
      renderPage({ user: masterUserFixture });
      await waitForWsConnect();
      simulateWsOpen();
      sendFromServer("room_state", {
        matchUuid: "match-1",
        state: "lobby",
        players: [],
      });
      sendFromServer("map_full_state", { pieces: [], walls: [], fogMode: "explored", grid: boardGrid, bg: null });

      await waitFor(() => {
        expect(screen.getByTestId("tactical-map-placer")).toBeInTheDocument();
      });
    });

    // F16: o tabuleiro da partida vive em `match_boards` (B14) — o `start_match` grava o dele.
    // Iniciar não escreve as peças do lobby no mapa da CAMPANHA (antes elas sobrescreviam o
    // desenho original do mapa).
    it("iniciar a partida não grava no mapa da campanha", async () => {
      let mapWrites = 0;
      const pieceWithChar = { ...pieceFixture, characterId: "sheet-1" };
      const mapWithChar = mapWithPiecesApi([pieceWithChar]);

      setupHandlers("master-1");
      server.use(
        http.get(`${baseUrl}/matches/:id/map`, () =>
          HttpResponse.json({
            matchMap: {
              matchUuid: "match-1",
              mapUuid: "map-1",
              attachedAt: "2026-01-01T00:00:00Z",
            },
          }),
        ),
        http.get(`${baseUrl}/maps/:id`, () =>
          HttpResponse.json({ map: mapWithChar }),
        ),
        http.put(`${baseUrl}/maps/:id`, () => {
          mapWrites++;
          return new HttpResponse(null, { status: 204 });
        }),
        http.patch(`${baseUrl}/maps/:id`, () => {
          mapWrites++;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      renderPage({ user: masterUserFixture });
      await waitForWsConnect();
      simulateWsOpen();
      sendFromServer("room_state", {
        matchUuid: "match-1",
        state: "lobby",
        players: [],
      });

      const startBtn = await screen.findByRole("button", {
        name: /Iniciar Partida/i,
      });
      await userEvent.click(startBtn);

      await waitFor(() => {
        expect(wsInstance.send).toHaveBeenCalledWith(
          expect.stringContaining("start_match"),
        );
      });
      expect(mapWrites).toBe(0);
    });
  });
});
