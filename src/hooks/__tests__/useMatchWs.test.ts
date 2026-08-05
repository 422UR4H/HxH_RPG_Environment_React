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
  it("parses map_full_state into camelCase fog state", () => {
    const onMapFullState = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", isMaster: false, onMapFullState }),
    );
    const ws = FakeWS.instances[0];
    ws.onopen?.();
    ws.emit("map_full_state", {
      pieces: [],
      walls: [{ id: "w1", wall_type: "wall", max_hp: 100 }],
      visible_polygons: [[{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]],
      fog_mode: "explored",
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
      visible_polygons: [[{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }]],
    });
    expect(onVisibilityUpdated).toHaveBeenCalledWith([[[1, 1], [2, 1], [2, 2]]]);
  });

  // The server's piece shape is flat (piece_id/slot); the renderer reads piece.coord.slot
  // and piece.id. Forwarding the raw payload throws "Cannot read properties of undefined
  // (reading 'slot')" inside PieceSprite, which takes down the whole Pixi tree — the map,
  // the background and the fog all stop rendering.
  it("converts map_full_state pieces into the renderer's Piece shape", () => {
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
            piece_id: "9255b4e4",
            slot: { kind: "square", col: 18, row: 19 },
            character_id: "9fae82da",
            visible: true,
          },
        ],
        walls: [], visible_polygons: [], fog_mode: "explored",
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

  it("keeps hex slots intact through the conversion", () => {
    const onMapFullState = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", isMaster: false, onMapFullState }),
    );
    const ws = FakeWS.instances[0];
    act(() => { ws.onopen?.(); });
    act(() => {
      ws.emit("map_full_state", {
        pieces: [{ piece_id: "p", slot: { kind: "hex", q: 2, r: -3 }, character_id: "c" }],
        walls: [], visible_polygons: [], fog_mode: "live",
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
          { piece_id: "high", slot: { kind: "square", col: 1, row: 1 }, character_id: "c", z: 3 },
          { piece_id: "ground", slot: { kind: "square", col: 2, row: 2 }, character_id: "c" },
        ],
        walls: [], visible_polygons: [], fog_mode: "explored",
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
        piece_id: "piece-1",
        slot: { kind: "square", col: 3, row: 4 },
        character_id: "sheet-1",
        visible: true,
        z: 0,
      },
    ]);
    expect(last.grid).toMatchObject({ cell_size: 64, cols: 20, rows: 20 });
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
        pieces: [], walls: [], visible_polygons: [], fog_mode: "explored",
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
