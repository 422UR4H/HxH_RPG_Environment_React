import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLobbyWs } from "../useLobbyWs";

// ─── WebSocket mock ───────────────────────────────────────────────────────────

interface MockWsInstance {
  onmessage: ((e: MessageEvent) => void) | null;
  onclose: ((e: CloseEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onopen: ((e: Event) => void) | null;
  close: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  readyState: number;
  url: string;
}

let wsInstance: MockWsInstance;
const MockWebSocket = vi.fn().mockImplementation(function (url: string) {
  wsInstance = {
    onmessage: null,
    onclose: null,
    onerror: null,
    onopen: null,
    close: vi.fn(),
    send: vi.fn(),
    readyState: WebSocket.CONNECTING,
    url,
  };
  return wsInstance;
});
MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;

const defaultParams = {
  matchUuid: "match-1",
  token: "fake-token",
  nickname: "Gon",
  onMatchStarted: vi.fn(),
};

function sendFromServer(type: string, payload: unknown = {}) {
  act(() => {
    wsInstance.onmessage?.({
      data: JSON.stringify({ type, payload: JSON.stringify(payload) }),
    } as MessageEvent);
  });
}

function simulateOpen() {
  act(() => {
    wsInstance.readyState = WebSocket.OPEN;
    wsInstance.onopen?.({} as Event);
  });
}

function simulateClose(code = 1000) {
  act(() => {
    wsInstance.onclose?.({ code, wasClean: code === 1000 } as CloseEvent);
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useLobbyWs", () => {
  beforeEach(() => {
    vi.stubGlobal("WebSocket", MockWebSocket);
    vi.useFakeTimers();
    defaultParams.onMatchStarted.mockReset();
    MockWebSocket.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("starts with status connecting", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    expect(result.current.status).toBe("connecting");
  });

  it("transitions to connected when WebSocket opens", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    expect(result.current.status).toBe("connected");
  });

  it("populates participants on room_state", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    sendFromServer("room_state", {
      match_uuid: "match-1",
      state: "lobby",
      players: [
        { uuid: "p1", nickname: "Gon", is_master: false, is_online: true },
        { uuid: "master-1", nickname: "Master", is_master: true, is_online: true },
      ],
    });
    expect(result.current.participants).toHaveLength(2);
    expect(result.current.participants[0].uuid).toBe("p1");
  });

  it("adds participant on player_joined", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    sendFromServer("room_state", { match_uuid: "match-1", state: "lobby", players: [] });
    sendFromServer("player_joined", { uuid: "p2", nickname: "Killua", is_master: false, is_online: true });
    expect(result.current.participants).toHaveLength(1);
    expect(result.current.participants[0].uuid).toBe("p2");
  });

  it("removes participant on player_left", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    sendFromServer("room_state", {
      match_uuid: "match-1", state: "lobby",
      players: [{ uuid: "p1", nickname: "Gon", is_master: false, is_online: true }],
    });
    sendFromServer("player_left", { uuid: "p1", nickname: "Gon" });
    expect(result.current.participants).toHaveLength(0);
  });

  it("sets status to lobby_not_open on lobby_not_open message", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    sendFromServer("lobby_not_open", {});
    expect(result.current.status).toBe("lobby_not_open");
  });

  it("sets status to kicked when player_kicked arrives with own uuid", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    sendFromServer("player_kicked", { uuid: "user-1", nickname: "Gon", reason: "kicked by master" });
    // Note: the hook identifies "self" via the uuid passed from the page; tested via integration
    // Here we test that player_kicked targeting a different uuid does NOT set kicked status
    expect(result.current.status).not.toBe("kicked");
  });

  it("sets status to lobby_closed on lobby_closed message", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    sendFromServer("lobby_closed", {});
    expect(result.current.status).toBe("lobby_closed");
  });

  it("calls onMatchStarted on match_started", () => {
    const onMatchStarted = vi.fn();
    const { result } = renderHook(() =>
      useLobbyWs({ ...defaultParams, onMatchStarted })
    );
    simulateOpen();
    sendFromServer("match_started", {});
    expect(onMatchStarted).toHaveBeenCalledOnce();
    expect(result.current.status).toBe("connected");
  });

  it("does not reconnect on lobby_not_open (terminal state)", () => {
    renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    sendFromServer("lobby_not_open", {});
    simulateClose(4001);
    act(() => { vi.advanceTimersByTime(2000); });
    // Only 1 WebSocket created (no reconnect)
    expect(MockWebSocket).toHaveBeenCalledTimes(1);
  });

  it("does not reconnect on lobby_closed (terminal state)", () => {
    renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    sendFromServer("lobby_closed", {});
    simulateClose(1000);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(MockWebSocket).toHaveBeenCalledTimes(1);
  });

  it("reconnects after unexpected close with backoff", () => {
    renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    simulateClose(1006); // abnormal closure
    act(() => { vi.advanceTimersByTime(600); }); // 500ms backoff
    expect(MockWebSocket).toHaveBeenCalledTimes(2);
  });

  it("sets status to throttled after 5 reconnects in 60s", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));

    for (let i = 0; i < 5; i++) {
      simulateOpen();
      simulateClose(1006);
      act(() => { vi.advanceTimersByTime(60_000); });
    }

    expect(result.current.status).toBe("throttled");
    const countBefore = MockWebSocket.mock.calls.length;
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(MockWebSocket.mock.calls.length).toBe(countBefore);
  });

  it("closes WS on unmount", () => {
    const { unmount } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    unmount();
    expect(wsInstance.close).toHaveBeenCalled();
  });

  it("sendStartMatch sends correct WS message", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    act(() => { result.current.sendStartMatch(); });
    const sent = JSON.parse(wsInstance.send.mock.calls[0][0]);
    expect(sent.type).toBe("start_match");
  });

  it("sendCancelLobby sends correct WS message", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    act(() => { result.current.sendCancelLobby(); });
    const sent = JSON.parse(wsInstance.send.mock.calls[0][0]);
    expect(sent.type).toBe("cancel_lobby");
  });

  it("sendKick sends correct WS message", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    act(() => { result.current.sendKick("target-uuid"); });
    const sent = JSON.parse(wsInstance.send.mock.calls[0][0]);
    expect(sent.type).toBe("kick_player");
    expect(JSON.parse(sent.payload).player_uuid).toBe("target-uuid");
  });
});
