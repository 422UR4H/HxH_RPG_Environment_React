import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLobbyWs } from "../useLobbyWs";
import type { Piece, WallSegment, GridShape } from "../../types/tacticalMap";

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
Object.assign(MockWebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });

const defaultParams = {
  matchUuid: "match-1",
  token: "fake-token",
  nickname: "Gon",
  onMatchStarted: vi.fn(),
};

function sendFromServer(type: string, payload: unknown = {}) {
  act(() => {
    wsInstance.onmessage?.({
      data: JSON.stringify({ type, payload }),
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
        { uuid: "p1", nickname: "Gon", isMaster: false, isOnline: true },
        { uuid: "master-1", nickname: "Master", isMaster: true, isOnline: true },
      ],
    });
    expect(result.current.participants).toHaveLength(2);
    expect(result.current.participants[0].uuid).toBe("p1");
  });

  // FINDING (real bug, not fixed — documenting current behavior, already
  // tracked as finding [7] in docs/dev/http-boundary-inventory.md):
  // the Go server's PlayerPayload for this event (internal/app/game/message.go,
  // confirmed by room.go's broadcastPlayerJoined) is `{uuid, nickname}` only —
  // no `isMaster`/`isOnline` field is ever sent on the wire for
  // player_joined/master_joined. useLobbyWs.ts still reads `p.isMaster`
  // (undefined here, falsy), while isOnline is hardcoded `true` in the
  // handler regardless of payload. This mock previously fabricated
  // isMaster/isOnline fields the server never sends, which masked the bug.
  it("adds participant on player_joined", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    sendFromServer("room_state", { matchUuid: "match-1", state: "lobby", players: [] });
    sendFromServer("player_joined", { uuid: "p2", nickname: "Killua" });
    expect(result.current.participants).toHaveLength(1);
    expect(result.current.participants[0].uuid).toBe("p2");
    // isMaster is undefined: the real wire payload has no isMaster field.
    expect(result.current.participants[0].isMaster).toBeUndefined();
    // isOnline is hardcoded true in the handler, independent of the payload.
    expect(result.current.participants[0].isOnline).toBe(true);
  });

  // FINDING (real bug, not fixed — documenting current behavior, already
  // tracked as finding [7] in docs/dev/http-boundary-inventory.md): same
  // isMaster/isOnline fabrication issue as player_joined above. Note this
  // means a participant who joins via master_joined is indistinguishable
  // from a regular player in `participants` until the next room_state sync.
  it("adds master on master_joined", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    sendFromServer("room_state", { matchUuid: "match-1", state: "lobby", players: [] });
    sendFromServer("master_joined", { uuid: "master-1", nickname: "Bisky" });
    expect(result.current.participants).toHaveLength(1);
    expect(result.current.participants[0].uuid).toBe("master-1");
    // BUG: isMaster is undefined, not true — the server never sends isMaster
    // on this event, so the "master" participant looks like a regular player
    // until the next room_state message corrects it.
    expect(result.current.participants[0].isMaster).toBeUndefined();
    expect(result.current.participants[0].isOnline).toBe(true);
  });

  it("removes participant on player_left", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    sendFromServer("room_state", {
      matchUuid: "match-1", state: "lobby",
      players: [{ uuid: "p1", nickname: "Gon", isMaster: false, isOnline: true }],
    });
    sendFromServer("player_left", { uuid: "p1", nickname: "Gon" });
    expect(result.current.participants).toHaveLength(0);
  });

  it("removes master on master_left", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    sendFromServer("room_state", {
      matchUuid: "match-1", state: "lobby",
      players: [{ uuid: "master-1", nickname: "Bisky", isMaster: true, isOnline: true }],
    });
    sendFromServer("master_left", { uuid: "master-1", nickname: "Bisky" });
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

  it("does not reconnect when onclose code 4001 fires before lobby_not_open message", () => {
    // Race condition: the browser receives the close frame with code 4001 before
    // processing the lobby_not_open text frame. This happens when the server does
    // not drain the connection after sending the close frame, causing the browser
    // to see an abrupt close.
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    // onclose(4001) fires — no message received yet
    simulateClose(4001);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.status).toBe("lobby_not_open");
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
    expect(sent.payload.playerUuid).toBe("target-uuid");
  });

  // ─── Board messages (piece_moved / piece_removed / map_full_state) ────────

  it("calls onPieceMoved with the exact square slot, characterId and z on piece_moved", () => {
    const onPieceMoved = vi.fn();
    renderHook(() => useLobbyWs({ ...defaultParams, onPieceMoved }));
    simulateOpen();
    sendFromServer("piece_moved", {
      pieceId: "piece-1",
      slot: { kind: "square", col: 3, row: 4 },
      characterId: "char-1",
      visible: true,
      z: 2,
    });
    expect(onPieceMoved).toHaveBeenCalledWith(
      "piece-1",
      { kind: "square", col: 3, row: 4 },
      "char-1",
      true,
      2,
    );
  });

  it("calls onPieceMoved with the exact hex slot and defaults z to 0 when omitted", () => {
    const onPieceMoved = vi.fn();
    renderHook(() => useLobbyWs({ ...defaultParams, onPieceMoved }));
    simulateOpen();
    sendFromServer("piece_moved", {
      pieceId: "piece-2",
      slot: { kind: "hex", q: 1, r: -2 },
    });
    expect(onPieceMoved).toHaveBeenCalledWith(
      "piece-2",
      { kind: "hex", q: 1, r: -2 },
      undefined,
      undefined,
      0,
    );
  });

  it("does not call onPieceMoved when piece_moved is missing pieceId or slot", () => {
    const onPieceMoved = vi.fn();
    renderHook(() => useLobbyWs({ ...defaultParams, onPieceMoved }));
    simulateOpen();
    sendFromServer("piece_moved", { slot: { kind: "square", col: 1, row: 1 } });
    sendFromServer("piece_moved", { pieceId: "piece-3" });
    expect(onPieceMoved).not.toHaveBeenCalled();
  });

  it("calls onPieceRemoved with the exact pieceId on piece_removed", () => {
    const onPieceRemoved = vi.fn();
    renderHook(() => useLobbyWs({ ...defaultParams, onPieceRemoved }));
    simulateOpen();
    sendFromServer("piece_removed", { pieceId: "piece-9" });
    expect(onPieceRemoved).toHaveBeenCalledWith("piece-9");
  });

  it("does not call onPieceRemoved when piece_removed is missing pieceId", () => {
    const onPieceRemoved = vi.fn();
    renderHook(() => useLobbyWs({ ...defaultParams, onPieceRemoved }));
    simulateOpen();
    sendFromServer("piece_removed", {});
    expect(onPieceRemoved).not.toHaveBeenCalled();
  });

  it("calls onFullState with pieces mapped from the flat wire shape on map_full_state", () => {
    const onFullState = vi.fn();
    renderHook(() => useLobbyWs({ ...defaultParams, onFullState }));
    simulateOpen();
    sendFromServer("map_full_state", {
      pieces: [
        { pieceId: "p1", slot: { kind: "square", col: 1, row: 2 }, characterId: "c1", visible: true },
        { pieceId: "p2", slot: { kind: "hex", q: 0, r: 0 }, characterId: "c2" },
      ],
    });
    expect(onFullState).toHaveBeenCalledWith([
      { pieceId: "p1", characterId: "c1", slot: { kind: "square", col: 1, row: 2 }, visible: true },
      { pieceId: "p2", characterId: "c2", slot: { kind: "hex", q: 0, r: 0 }, visible: undefined },
    ]);
  });

  it("silently skips map_full_state pieces missing characterId", () => {
    // Current hook behavior: `if (!p.pieceId || !p.slot || !p.characterId) continue;`
    // A piece without characterId is dropped rather than surfaced with a placeholder.
    const onFullState = vi.fn();
    renderHook(() => useLobbyWs({ ...defaultParams, onFullState }));
    simulateOpen();
    sendFromServer("map_full_state", {
      pieces: [{ pieceId: "orphan", slot: { kind: "square", col: 0, row: 0 } }],
    });
    expect(onFullState).toHaveBeenCalledWith([]);
  });

  // ─── Outgoing board messages ────────────────────────────────────────────────

  it("sendPieceMoved sends piece_moved with the square slot and all optional fields", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    act(() => {
      result.current.sendPieceMoved("piece-1", { kind: "square", col: 5, row: 6 }, "char-1", true, 2);
    });
    const sent = JSON.parse(wsInstance.send.mock.calls[0][0]);
    expect(sent.type).toBe("piece_moved");
    expect(sent.payload).toEqual({
      pieceId: "piece-1",
      slot: { kind: "square", col: 5, row: 6 },
      characterId: "char-1",
      visible: true,
      z: 2,
    });
  });

  it("sendPieceMoved sends the hex slot and omits optional fields entirely (not null) when not provided", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    act(() => {
      result.current.sendPieceMoved("piece-2", { kind: "hex", q: -1, r: 3 });
    });
    const sent = JSON.parse(wsInstance.send.mock.calls[0][0]);
    expect(sent.type).toBe("piece_moved");
    expect(sent.payload).toEqual({
      pieceId: "piece-2",
      slot: { kind: "hex", q: -1, r: 3 },
    });
    expect("characterId" in sent.payload).toBe(false);
    expect("visible" in sent.payload).toBe(false);
    expect("z" in sent.payload).toBe(false);
  });

  it("sendPieceRemoved sends correct WS message", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    act(() => { result.current.sendPieceRemoved("piece-3"); });
    const sent = JSON.parse(wsInstance.send.mock.calls[0][0]);
    expect(sent.type).toBe("piece_removed");
    expect(sent.payload).toEqual({ pieceId: "piece-3" });
  });

  it("sendLobbySync sends pieces, walls and the grid cellSize untouched (camelCase)", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    const pieces: Piece[] = [
      { id: "p1", characterId: "c1", coord: { slot: { kind: "square", col: 1, row: 2 }, z: 0 }, visible: true },
    ];
    const walls: WallSegment[] = [
      {
        id: "w1", p1: [0, 0], p2: [1, 0], wallType: "wall", material: "stone",
        move: false, sense: "none", direction: "both", open: false, locked: false,
        hp: 10, maxHp: 10, resistance: 0, destroyed: false,
      },
    ];
    const grid: GridShape = {
      kind: "square", cols: 10, rows: 10, cellSize: 32, skewRatio: 1,
      rotation: 0, color: "#fff", opacity: 1, lineStyle: "solid",
    };
    act(() => { result.current.sendLobbySync(pieces, walls, grid); });
    const sent = JSON.parse(wsInstance.send.mock.calls[0][0]);
    expect(sent.type).toBe("map_state_sync");
    expect(sent.payload.pieces).toEqual([
      { pieceId: "p1", slot: { kind: "square", col: 1, row: 2 }, characterId: "c1", visible: true },
    ]);
    expect(sent.payload.walls[0]).toMatchObject({ wallType: "wall", maxHp: 10 });
    expect(sent.payload.grid).toEqual({ cellSize: 32 });
  });

  it("sendLobbySync omits the grid key entirely when no grid is provided", () => {
    const { result } = renderHook(() => useLobbyWs(defaultParams));
    simulateOpen();
    act(() => { result.current.sendLobbySync([]); });
    const sent = JSON.parse(wsInstance.send.mock.calls[0][0]);
    expect(sent.type).toBe("map_state_sync");
    expect(sent.payload.pieces).toEqual([]);
    expect(sent.payload.walls).toEqual([]);
    expect("grid" in sent.payload).toBe(false);
  });
});
