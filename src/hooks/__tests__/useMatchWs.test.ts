import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMatchWs } from "../useMatchWs";
import type { MatchBoardSync } from "../useMatchWs";
import type { GridShape, Piece } from "../../types/tacticalMap";

class FakeWS {
  static instances: FakeWS[] = [];
  // The hook gates sends on `ws.readyState === WebSocket.OPEN`; without this the
  // comparison is `1 === undefined` and every send is silently dropped.
  static OPEN = 1;
  onopen?: () => void;
  onmessage?: (e: MessageEvent) => void;
  onclose?: (e: CloseEvent) => void;
  onerror?: () => void;
  readyState = 1;
  url: string;
  constructor(url: string) {
    this.url = url;
    FakeWS.instances.push(this);
  }
  send = vi.fn();
  close = vi.fn();
  emit(type: string, payload: unknown) {
    this.onmessage?.({ data: JSON.stringify({ type, payload }) } as MessageEvent);
  }
}

beforeEach(() => {
  FakeWS.instances = [];
  vi.stubGlobal("WebSocket", FakeWS as unknown as typeof WebSocket);
  vi.stubEnv("VITE_WS_URL", "ws://test");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("useMatchWs fog events", () => {
  it("parses map_full_state fog state", () => {
    const onMapFullState = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", isMaster: false, onMapFullState }),
    );
    const ws = FakeWS.instances[0];
    ws.onopen?.();
    ws.emit("map_full_state", {
      pieces: [],
      walls: [{ id: "w1", wallType: "wall", maxHp: 100 }],
      visiblePolygons: [[{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]],
      fogMode: "explored",
    });
    expect(onMapFullState).toHaveBeenCalledTimes(1);
    const arg = onMapFullState.mock.calls[0][0];
    expect(arg.fogMode).toBe("explored");
    expect(arg.walls[0].wallType).toBe("wall");
    expect(arg.visiblePolygons[0]).toEqual([[0, 0], [10, 0], [10, 10]]);
  });

  it("parses visibility_updated", () => {
    const onVisibilityUpdated = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", isMaster: false, onVisibilityUpdated }),
    );
    const ws = FakeWS.instances[0];
    ws.onopen?.();
    ws.emit("visibility_updated", {
      visiblePolygons: [[{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }]],
    });
    expect(onVisibilityUpdated).toHaveBeenCalledWith([[[1, 1], [2, 1], [2, 2]]]);
  });

  // The server's piece shape is flat (pieceId/slot as siblings); the renderer reads
  // piece.coord.slot and piece.id. Forwarding the raw payload throws "Cannot read
  // properties of undefined (reading 'slot')" inside PieceSprite, which takes down the
  // whole Pixi tree — the map, the background and the fog all stop rendering.
  it("maps map_full_state pieces into the renderer's Piece shape", () => {
    const onMapFullState = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", isMaster: false, onMapFullState }),
    );
    const ws = FakeWS.instances[0];
    act(() => { ws.onopen?.(); });
    act(() => {
      ws.emit("map_full_state", {
        pieces: [
          {
            pieceId: "9255b4e4",
            slot: { kind: "square", col: 18, row: 19 },
            characterId: "9fae82da",
            visible: true,
          },
        ],
        walls: [], visiblePolygons: [], fogMode: "explored",
      });
    });

    const arg = onMapFullState.mock.calls[0][0];
    const piece = arg.pieces[0];
    expect(piece.id).toBe("9255b4e4");
    expect(piece.characterId).toBe("9fae82da");
    expect(piece.visible).toBe(true);
    // The exact access that used to crash the renderer.
    expect(piece.coord.slot).toEqual({ kind: "square", col: 18, row: 19 });
    expect(piece.coord.z).toBe(0);
    // A piece without an id makes React fall back to duplicate keys.
    expect(piece.id).toBeTruthy();
  });

  it("keeps hex slots intact through the mapping", () => {
    const onMapFullState = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", isMaster: false, onMapFullState }),
    );
    const ws = FakeWS.instances[0];
    act(() => { ws.onopen?.(); });
    act(() => {
      ws.emit("map_full_state", {
        pieces: [{ pieceId: "p", slot: { kind: "hex", q: 2, r: -3 }, characterId: "c" }],
        walls: [], visiblePolygons: [], fogMode: "live",
      });
    });
    expect(onMapFullState.mock.calls[0][0].pieces[0].coord.slot).toEqual({
      kind: "hex", q: 2, r: -3,
    });
  });

  it("carries piece elevation in from the wire", () => {
    const onMapFullState = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", isMaster: false, onMapFullState }),
    );
    const ws = FakeWS.instances[0];
    act(() => { ws.onopen?.(); });
    act(() => {
      ws.emit("map_full_state", {
        pieces: [
          { pieceId: "high", slot: { kind: "square", col: 1, row: 1 }, characterId: "c", z: 3 },
          { pieceId: "ground", slot: { kind: "square", col: 2, row: 2 }, characterId: "c" },
        ],
        walls: [], visiblePolygons: [], fogMode: "explored",
      });
    });

    const pieces = onMapFullState.mock.calls[0][0].pieces;
    // The server used to send no elevation at all and the page patched it back in from
    // the REST map. That map no longer carries pieces for a player, so a dropped z here
    // means every piece silently sits on the ground.
    expect(pieces[0].coord.z).toBe(3);
    // Omitted by the server when it is 0 — absence means ground, not "unknown".
    expect(pieces[1].coord.z).toBe(0);
  });
});

// ─── Board sync (master seeds the game server) ──────────────────────────────
//
// The game server has no DB access: it derives every player's line of sight from the
// pieces the master syncs to it. A sync that omits the pieces leaves players fully
// fogged, and a sync fired before the REST map loaded wipes the board it already had.

const grid: GridShape = {
  kind: "square", cols: 20, rows: 20, cellSize: 64, skewRatio: 1,
} as GridShape;

const piece: Piece = {
  id: "piece-1",
  characterId: "sheet-1",
  coord: { slot: { kind: "square", col: 3, row: 4 }, z: 0 },
  visible: true,
} as Piece;

const board: MatchBoardSync = {
  pieces: [piece],
  walls: [{ id: "w1", wallType: "wall", maxHp: 100 } as never],
  grid,
};

function syncPayloads(ws: FakeWS) {
  return ws.send.mock.calls
    .map(([raw]) => JSON.parse(raw as string))
    .filter((m) => m.type === "map_state_sync")
    .map((m) => m.payload);
}

describe("useMatchWs board sync", () => {
  it("sends the master's pieces so the server has line-of-sight origins", () => {
    const { rerender } = renderHook(
      (props: { board: MatchBoardSync | null }) =>
        useMatchWs({ matchUuid: "m1", token: "t", isMaster: true, board: props.board }),
      { initialProps: { board } },
    );
    const ws = FakeWS.instances[0];
    act(() => { ws.onopen?.(); });
    rerender({ board });

    const syncs = syncPayloads(ws);
    expect(syncs.length).toBeGreaterThan(0);
    const last = syncs[syncs.length - 1];
    expect(last.pieces).toEqual([
      {
        pieceId: "piece-1",
        slot: { kind: "square", col: 3, row: 4 },
        characterId: "sheet-1",
        visible: true,
        z: 0,
      },
    ]);
    expect(last.grid).toMatchObject({ cellSize: 64, cols: 20, rows: 20 });
    expect(last.walls).toHaveLength(1);
  });

  it("does not sync before the map has loaded, then syncs once it arrives", () => {
    const { rerender } = renderHook(
      (props: { board: MatchBoardSync | null }) =>
        useMatchWs({ matchUuid: "m1", token: "t", isMaster: true, board: props.board }),
      { initialProps: { board: null as MatchBoardSync | null } },
    );
    const ws = FakeWS.instances[0];
    act(() => { ws.onopen?.(); });
    rerender({ board: null });

    expect(syncPayloads(ws)).toHaveLength(0);

    rerender({ board });
    const syncs = syncPayloads(ws);
    expect(syncs).toHaveLength(1);
    expect(syncs[0].pieces).toHaveLength(1);
  });

  it("never syncs as a player", () => {
    const { rerender } = renderHook(
      (props: { board: MatchBoardSync | null }) =>
        useMatchWs({ matchUuid: "m1", token: "t", isMaster: false, board: props.board }),
      { initialProps: { board } },
    );
    const ws = FakeWS.instances[0];
    act(() => { ws.onopen?.(); });
    rerender({ board });

    expect(syncPayloads(ws)).toHaveLength(0);
  });

  // Guards the infinite-loop regression: the board must be derived from the REST map,
  // so a server push that changes live state must not trigger another sync.
  it("does not re-sync when the server pushes map_full_state", () => {
    const { rerender } = renderHook(
      (props: { board: MatchBoardSync | null }) =>
        useMatchWs({ matchUuid: "m1", token: "t", isMaster: true, board: props.board }),
      { initialProps: { board } },
    );
    const ws = FakeWS.instances[0];
    act(() => { ws.onopen?.(); });
    rerender({ board });
    const before = syncPayloads(ws).length;

    act(() => {
      ws.emit("map_full_state", {
        pieces: [], walls: [], visiblePolygons: [], fogMode: "explored",
      });
    });
    rerender({ board });

    expect(syncPayloads(ws)).toHaveLength(before);
  });

  it("sends piece elevation so the server can hand it back", () => {
    const elevated: MatchBoardSync = {
      ...board,
      pieces: [{ ...piece, coord: { ...piece.coord, z: 2 } }],
    };
    const { rerender } = renderHook(
      (props: { board: MatchBoardSync | null }) =>
        useMatchWs({ matchUuid: "m1", token: "t", isMaster: true, board: props.board }),
      { initialProps: { board: elevated } },
    );
    const ws = FakeWS.instances[0];
    act(() => { ws.onopen?.(); });
    rerender({ board: elevated });

    const syncs = syncPayloads(ws);
    expect(syncs[syncs.length - 1].pieces[0].z).toBe(2);
  });
});

// ─── Wall events (server→client) ────────────────────────────────────────────

describe("useMatchWs wall events", () => {
  it("calls onWallStateChanged with the exact wallId, open and locked on wall_state_changed", () => {
    const onWallStateChanged = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", isMaster: false, onWallStateChanged }),
    );
    const ws = FakeWS.instances[0];
    act(() => { ws.onopen?.(); });
    act(() => {
      ws.emit("wall_state_changed", { wallId: "wall-7", open: true, locked: false });
    });
    expect(onWallStateChanged).toHaveBeenCalledWith("wall-7", true, false);
  });

  it("calls onWallHpChanged with the exact wallId, hp, maxHp and destroyed on wall_hp_changed", () => {
    const onWallHpChanged = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", isMaster: false, onWallHpChanged }),
    );
    const ws = FakeWS.instances[0];
    act(() => { ws.onopen?.(); });
    act(() => {
      ws.emit("wall_hp_changed", { wallId: "wall-9", hp: 40, maxHp: 100, destroyed: false });
    });
    expect(onWallHpChanged).toHaveBeenCalledWith("wall-9", 40, 100, false);
  });

  it("calls onWallHpChanged with destroyed=true when a wall's HP reaches 0", () => {
    const onWallHpChanged = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", isMaster: false, onWallHpChanged }),
    );
    const ws = FakeWS.instances[0];
    act(() => { ws.onopen?.(); });
    act(() => {
      ws.emit("wall_hp_changed", { wallId: "wall-10", hp: 0, maxHp: 50, destroyed: true });
    });
    expect(onWallHpChanged).toHaveBeenCalledWith("wall-10", 0, 50, true);
  });

  it("calls onWallRevealed with the wall payload passed through untouched on wall_revealed", () => {
    const onWallRevealed = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", isMaster: false, onWallRevealed }),
    );
    const ws = FakeWS.instances[0];
    act(() => { ws.onopen?.(); });
    act(() => {
      ws.emit("wall_revealed", {
        wall: {
          id: "wall-secret",
          p1: [0, 0], p2: [1, 0],
          wallType: "secret_door",
          material: "stone",
          move: false, sense: "none", direction: "both",
          open: false, locked: false,
          hp: 5, maxHp: 5, resistance: 0,
          destroyed: false, revealed: true,
        },
      });
    });
    expect(onWallRevealed).toHaveBeenCalledTimes(1);
    const wall = onWallRevealed.mock.calls[0][0];
    expect(wall.id).toBe("wall-secret");
    expect(wall.wallType).toBe("secret_door");
    expect(wall.maxHp).toBe(5);
    expect(wall.revealed).toBe(true);
  });
});

// ─── Outgoing actions (sendAction / sendMasterAction) ───────────────────────

describe("useMatchWs outgoing actions", () => {
  it("sendAction sends enqueue_action with the payload forwarded as-is", () => {
    const { result } = renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", isMaster: false }),
    );
    const ws = FakeWS.instances[0];
    act(() => { ws.onopen?.(); });
    const payload = {
      targetId: ["char-1"],
      move: {
        from: [0, 0, 0] as [number, number, number],
        position: [1, 1, 0] as [number, number, number],
        category: "walk",
      },
    };
    act(() => { result.current.sendAction(payload); });
    const sent = JSON.parse(ws.send.mock.calls[0][0] as string);
    expect(sent.type).toBe("enqueue_action");
    expect(sent.payload).toEqual(payload);
  });

  it("sendMasterAction sends enqueue_master_action with the payload forwarded as-is", () => {
    const { result } = renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", isMaster: true }),
    );
    const ws = FakeWS.instances[0];
    act(() => { ws.onopen?.(); });
    const payload = {
      targetIds: ["char-1", "char-2"],
      attack: { hit: { skillName: "punch" }, damage: { skillName: "punch" } },
    };
    act(() => { result.current.sendMasterAction(payload); });
    const sent = JSON.parse(ws.send.mock.calls[0][0] as string);
    expect(sent.type).toBe("enqueue_master_action");
    expect(sent.payload).toEqual(payload);
  });
});
