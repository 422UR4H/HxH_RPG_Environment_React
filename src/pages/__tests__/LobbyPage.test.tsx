import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { matchFixture } from "../../test/fixtures/match";
import { masterUserFixture, userFixture } from "../../test/fixtures/user";
import LobbyPage from "../LobbyPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

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
    onmessage: null, onclose: null, onerror: null, onopen: null,
    close: vi.fn(), send: vi.fn(), readyState: 1,
  };
  return wsInstance;
});
MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;

function simulateWsOpen() {
  wsInstance.onopen?.({} as Event);
}
function sendFromServer(type: string, payload: unknown = {}) {
  wsInstance.onmessage?.({
    data: JSON.stringify({ type, payload: JSON.stringify(payload) }),
  } as MessageEvent);
}

// ─── MSW handlers ─────────────────────────────────────────────────────────────
const acceptedEnrollment = {
  uuid: "enrollment-1",
  status: "accepted",
  created_at: "2025-01-01T00:00:00Z",
  character_sheet: {
    uuid: "sheet-1",
    nick_name: "Gon",
    player_uuid: "user-1",
  },
  player: { uuid: "user-1", nick: "Gon" },
};

function setupHandlers(masterUuid = "master-1") {
  server.use(
    http.get(`${baseUrl}/matches/:id`, () =>
      HttpResponse.json({ match: { ...matchFixture, master_uuid: masterUuid } })
    ),
    http.get(`${baseUrl}/matches/:id/enrollments`, () =>
      HttpResponse.json({ enrollments: [acceptedEnrollment] })
    )
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
  beforeEach(() => {
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
        return HttpResponse.json({ match: matchFixture });
      }),
      http.get(`${baseUrl}/matches/:id/enrollments`, () =>
        HttpResponse.json({ enrollments: [] })
      )
    );
    renderPage();
    expect(screen.getByText(/Carregando/i)).toBeInTheDocument();
  });

  it("mestre vê botão Iniciar Partida e Cancelar Lobby", async () => {
    setupHandlers("master-1");
    renderPage({ user: masterUserFixture });
    simulateWsOpen();
    sendFromServer("room_state", { match_uuid: "match-1", state: "lobby", players: [] });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Iniciar Partida/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cancelar Lobby/i })).toBeInTheDocument();
    });
  });

  it("jogador não vê botões de ação", async () => {
    setupHandlers("master-1");
    renderPage({ user: userFixture });
    simulateWsOpen();
    sendFromServer("room_state", { match_uuid: "match-1", state: "lobby", players: [] });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Iniciar Partida/i })).not.toBeInTheDocument();
      expect(screen.getByText(/Aguardando o mestre/i)).toBeInTheDocument();
    });
  });

  it("exibe mensagem lobby_not_open", async () => {
    setupHandlers();
    renderPage({ user: userFixture });
    simulateWsOpen();
    sendFromServer("lobby_not_open", {});

    await waitFor(() => {
      expect(screen.getByText(/lobby ainda não foi aberto/i)).toBeInTheDocument();
    });
  });

  it("exibe mensagem kicked", async () => {
    setupHandlers();
    renderPage({ user: userFixture });
    simulateWsOpen();
    sendFromServer("player_kicked", { uuid: "user-1", nickname: "Gon", reason: "kicked" });

    await waitFor(() => {
      expect(screen.getByText(/removido do lobby/i)).toBeInTheDocument();
    });
  });

  it("navega para /game ao receber match_started", async () => {
    setupHandlers("master-1");
    renderPage({ user: masterUserFixture });
    simulateWsOpen();
    sendFromServer("room_state", { match_uuid: "match-1", state: "lobby", players: [] });
    sendFromServer("match_started", {});

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        "/campaigns/campaign-1/matches/match-1/game"
      );
    });
  });

  it("mestre confirma cancelamento antes de enviar cancel_lobby", async () => {
    setupHandlers("master-1");
    renderPage({ user: masterUserFixture });
    simulateWsOpen();
    sendFromServer("room_state", { match_uuid: "match-1", state: "lobby", players: [] });

    const cancelBtn = await screen.findByRole("button", { name: /Cancelar Lobby/i });
    await userEvent.click(cancelBtn);

    // ConfirmDialog should appear
    await waitFor(() => {
      expect(screen.getByText(/Tem certeza/i)).toBeInTheDocument();
    });
  });
});
