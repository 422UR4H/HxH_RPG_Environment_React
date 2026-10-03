import { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMatchWs } from "../useMatchWs";
import { FakeWS, flushConnect, installFakeWebSocket } from "../../test/fakeWebSocket";

beforeEach(() => {
  installFakeWebSocket();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("useMatchWs fog events", () => {
  it("parses map_full_state fog state", () => {
    const onMapFullState = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", onMapFullState }),
    );
    const ws = flushConnect();
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
      useMatchWs({ matchUuid: "m1", token: "t", onVisibilityUpdated }),
    );
    const ws = flushConnect();
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
      useMatchWs({ matchUuid: "m1", token: "t", onMapFullState }),
    );
    const ws = flushConnect();
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
      useMatchWs({ matchUuid: "m1", token: "t", onMapFullState }),
    );
    const ws = flushConnect();
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
      useMatchWs({ matchUuid: "m1", token: "t", onMapFullState }),
    );
    const ws = flushConnect();
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

// ─── O tabuleiro é do servidor (F13) ────────────────────────────────────────
//
// Desde B14 o servidor carrega o tabuleiro do banco e o manda em `map_full_state` a cada
// conexão; `map_state_sync` não escreve mais nada. O mestre conectando — na primeira vez, ao
// reconectar, numa sala que acabou de nascer (reinício) — não manda tabuleiro nenhum.

const matchFullStatePayload = { roundMode: "", bars: { seq: 0, prices: null, characters: null, order: null } };

describe("useMatchWs: o mestre não escreve o tabuleiro (F13)", () => {
  it("conectar, reconectar e cair numa sala vazia nunca manda map_state_sync", () => {
    renderHook(() => useMatchWs({ matchUuid: "m1", token: "t" }));

    const first = flushConnect();
    act(() => { first.onopen?.(); });
    act(() => {
      first.emit("map_full_state", {
        pieces: [{ pieceId: "p1", slot: { kind: "square", col: 1, row: 1 } }],
        walls: [], visiblePolygons: [], fogMode: "explored",
      });
      first.emit("match_full_state", matchFullStatePayload);
    });
    expect(first.sent("map_state_sync")).toEqual([]);

    // Reconexão numa sala sem tabuleiro (o registro não traz map_full_state).
    act(() => { first.onclose?.({ code: 1006 } as CloseEvent); });
    act(() => { vi.advanceTimersByTime(1000); });
    const second = FakeWS.instances[FakeWS.instances.length - 1];
    expect(second).not.toBe(first);
    act(() => { second.onopen?.(); });
    act(() => { second.emit("match_full_state", matchFullStatePayload); });
    expect(second.sent("map_state_sync")).toEqual([]);
  });
});

// ─── Wall events (server→client) ────────────────────────────────────────────

describe("useMatchWs wall events", () => {
  it("calls onWallStateChanged with the exact wallId, open and locked on wall_state_changed", () => {
    const onWallStateChanged = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", onWallStateChanged }),
    );
    const ws = flushConnect();
    act(() => { ws.onopen?.(); });
    act(() => {
      ws.emit("wall_state_changed", { wallId: "wall-7", open: true, locked: false });
    });
    expect(onWallStateChanged).toHaveBeenCalledWith("wall-7", true, false);
  });

  it("calls onWallHpChanged with the exact wallId, hp, maxHp and destroyed on wall_hp_changed", () => {
    const onWallHpChanged = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", onWallHpChanged }),
    );
    const ws = flushConnect();
    act(() => { ws.onopen?.(); });
    act(() => {
      ws.emit("wall_hp_changed", { wallId: "wall-9", hp: 40, maxHp: 100, destroyed: false });
    });
    expect(onWallHpChanged).toHaveBeenCalledWith("wall-9", 40, 100, false);
  });

  it("calls onWallHpChanged with destroyed=true when a wall's HP reaches 0", () => {
    const onWallHpChanged = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", onWallHpChanged }),
    );
    const ws = flushConnect();
    act(() => { ws.onopen?.(); });
    act(() => {
      ws.emit("wall_hp_changed", { wallId: "wall-10", hp: 0, maxHp: 50, destroyed: true });
    });
    expect(onWallHpChanged).toHaveBeenCalledWith("wall-10", 0, 50, true);
  });

  it("calls onWallRevealed with the wall payload passed through untouched on wall_revealed", () => {
    const onWallRevealed = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", onWallRevealed }),
    );
    const ws = flushConnect();
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

// ─── Piece events (server→client, F3) ───────────────────────────────────────
//
// The server moves a piece by itself when a turn's Move opens (or a Shift/passed-Dash
// escape reaction resolves) — piece_moved/piece_removed reuse the exact wire shape the
// lobby already parses (useLobbyWs.ts).

describe("useMatchWs piece events", () => {
  // Batch 2: onPieceMoved is called positionally (pieceId, slot, characterId?, visible?,
  // z?) — NOT a mapped Piece object — because characterId/visible/z must stay undefined
  // when the server's payload omits them (the caller, useLiveMapSync, decides whether
  // that means "keep the old value" or "use a default"; fromPiecePayload's defaulting is
  // wrong here, see the comment above parsePieceMovedSlot in useMatchWs.ts).
  it("calls onPieceMoved positionally with everything the payload carries", () => {
    const onPieceMoved = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", onPieceMoved }),
    );
    const ws = flushConnect();
    act(() => { ws.onopen?.(); });
    act(() => {
      ws.emit("piece_moved", {
        pieceId: "p1",
        slot: { kind: "square", col: 5, row: 6 },
        characterId: "c1",
        visible: true,
        z: 1,
      });
    });
    expect(onPieceMoved).toHaveBeenCalledWith(
      "p1",
      { kind: "square", col: 5, row: 6 },
      "c1",
      true,
      1,
    );
  });

  // characterId/visible/z stay undefined (not defaulted) when the server omits them —
  // the whole point of the fix: the caller must be able to tell "omitted" from "false"/
  // "zero"/"blank" apart to patch only what changed on an already-known piece.
  it("leaves characterId/visible/z undefined when the server omits them", () => {
    const onPieceMoved = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", onPieceMoved }),
    );
    const ws = flushConnect();
    act(() => { ws.onopen?.(); });
    act(() => {
      ws.emit("piece_moved", { pieceId: "p2", slot: { kind: "square", col: 0, row: 0 } });
    });
    expect(onPieceMoved).toHaveBeenCalledWith(
      "p2",
      { kind: "square", col: 0, row: 0 },
      undefined,
      undefined,
      undefined,
    );
  });

  it("keeps hex slots intact and drops a piece_moved with an invalid/missing slot.kind", () => {
    const onPieceMoved = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", onPieceMoved }),
    );
    const ws = flushConnect();
    act(() => { ws.onopen?.(); });
    act(() => {
      ws.emit("piece_moved", { pieceId: "hex1", slot: { kind: "hex", q: 2, r: -3 } });
      // Same rule useLobbyWs.ts's parser applies: an unrecognized/incomplete slot.kind
      // means the whole message is dropped, never forwarded with a garbage slot.
      ws.emit("piece_moved", { pieceId: "bad1", slot: { kind: "triangle" } });
      ws.emit("piece_moved", { pieceId: "bad2", slot: {} });
      ws.emit("piece_moved", { pieceId: "bad3" });
    });
    expect(onPieceMoved).toHaveBeenCalledTimes(1);
    expect(onPieceMoved).toHaveBeenCalledWith(
      "hex1",
      { kind: "hex", q: 2, r: -3 },
      undefined,
      undefined,
      undefined,
    );
  });

  it("calls onPieceRemoved with the pieceId on piece_removed", () => {
    const onPieceRemoved = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", onPieceRemoved }),
    );
    const ws = flushConnect();
    act(() => { ws.onopen?.(); });
    act(() => { ws.emit("piece_removed", { pieceId: "p1" }); });
    expect(onPieceRemoved).toHaveBeenCalledWith("p1");
  });
});

// ─── Lobby message types reused on the match socket (F5) ───────────────────
//
// The match socket is the same room.go connection the lobby uses — these broadcasts are
// legitimate here (a reconnecting player still gets room_state etc.), just unhandled by
// this hook. They must not trip the "unhandled message type" DEV warn.

describe("useMatchWs lobby message types", () => {
  it("does not warn on legitimate lobby broadcasts reused by the match socket", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderHook(() => useMatchWs({ matchUuid: "m1", token: "t" }));
    const ws = flushConnect();
    act(() => { ws.onopen?.(); });
    const ignored = [
      "room_state", "player_joined", "master_joined", "player_left",
      "master_left", "player_kicked", "chat_message", "match_started",
    ];
    for (const type of ignored) act(() => { ws.emit(type, {}); });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("still warns on a genuinely unknown type", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderHook(() => useMatchWs({ matchUuid: "m1", token: "t" }));
    const ws = flushConnect();
    act(() => { ws.onopen?.(); });
    act(() => { ws.emit("something_new", {}); });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ─── Outgoing actions (sendAction / sendMasterAction) ───────────────────────

describe("useMatchWs outgoing actions", () => {
  it("sendAction sends enqueue_action with the payload forwarded as-is", () => {
    const { result } = renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t" }),
    );
    const ws = flushConnect();
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

  // Final review, Important 2(a): sendAction/sendEnqueueAction/etc must report whether the
  // send actually left the socket — useMatchCombat gates ACTION_SENT (the ghost's birth)
  // on this, so a Declarar sent while reconnecting doesn't nascer an orphan ghost.
  it("sendAction returns true when the socket is OPEN and false when it is not", () => {
    const { result } = renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t" }),
    );
    const ws = flushConnect();
    // Not open yet (still "connecting" in the fake — readyState defaults to OPEN=1 in
    // this fake, so force it closed to simulate a dropped/reconnecting socket).
    ws.readyState = 0;
    let sent = true;
    act(() => { sent = result.current.sendAction({ targetId: ["w1"] }); });
    expect(sent).toBe(false);
    expect(ws.send).not.toHaveBeenCalled();

    ws.readyState = 1;
    act(() => { sent = result.current.sendAction({ targetId: ["w1"] }); });
    expect(sent).toBe(true);
    expect(ws.send).toHaveBeenCalledTimes(1);
  });

  it("sendMasterAction sends enqueue_master_action with the payload forwarded as-is", () => {
    const { result } = renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t" }),
    );
    const ws = flushConnect();
    act(() => { ws.onopen?.(); });
    const payload = {
      targetIds: ["wall-1", "wall-2"],
      interact: { kind: "reveal" },
    };
    act(() => { result.current.sendMasterAction(payload); });
    const sent = JSON.parse(ws.send.mock.calls[0][0] as string);
    expect(sent.type).toBe("enqueue_master_action");
    expect(sent.payload).toEqual(payload);
  });
});

// ─── Server error (error) ───────────────────────────────────────────────────

describe("useMatchWs error handling", () => {
  it("surfaces a server error with the type of the last send", () => {
    const onWsError = vi.fn();
    const { result } = renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", onWsError }),
    );
    const ws = flushConnect();
    ws.onopen?.();
    act(() => { result.current.sendAction({ targetId: ["w1"] }); });
    ws.emit("error", { code: "invalid_action", message: "actorId is required" });
    expect(onWsError).toHaveBeenCalledWith({
      code: "invalid_action",
      message: "actorId is required",
      sentType: "enqueue_action",
    });
  });

  it("does not throw on an unknown message type", () => {
    renderHook(() => useMatchWs({ matchUuid: "m1", token: "t" }));
    const ws = flushConnect();
    ws.onopen?.();
    expect(() => ws.emit("something_new", {})).not.toThrow();
  });
});

// ─── Combat messages and verbs (Task 5) ───────────────────────────────────

describe("useMatchWs combat", () => {
  it("forwards every combat message it knows", () => {
    const onCombatMessage = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", onCombatMessage }),
    );
    const ws = flushConnect();
    ws.onopen?.();
    ws.emit("bars_updated", { seq: 2, prices: {}, characters: [], order: [] });
    ws.emit("turn_opened", { turnId: "t1", actorId: "c1", actionId: "a1", actionType: "" });
    expect(onCombatMessage).toHaveBeenCalledTimes(2);
    expect(onCombatMessage.mock.calls[1][0]).toEqual({
      type: "turn_opened",
      payload: { turnId: "t1", actorId: "c1", actionId: "a1", actionType: "" },
    });
  });

  it("sends the master verbs with the payloads the contract names", () => {
    const { result } = renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t" }),
    );
    const ws = flushConnect();
    ws.onopen?.();
    act(() => {
      result.current.sendOpenNextAction();
      result.current.sendPullAction("a1");
      result.current.sendCloseTurn(true);
      result.current.sendChangeRoundMode("Race");
    });
    const sent = ws.send.mock.calls.map((c) => JSON.parse(c[0] as string));
    expect(sent.map((m) => m.type)).toEqual([
      "open_next_action", "pull_action", "close_turn", "change_round_mode",
    ]);
    expect(sent[1].payload).toEqual({ actionId: "a1" });
    expect(sent[2].payload).toEqual({ confirm: true });
    expect(sent[3].payload).toEqual({ mode: "Race" });
  });
});

// ─── Server time, npc_added, add_npc, change_scene (Task 1) ─────────────────

describe("useMatchWs — fechamento da Fase 6", () => {
  it("repassa a hora do servidor do envelope junto com a mensagem de combate", () => {
    const onCombatMessage = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", onCombatMessage }),
    );
    const ws = flushConnect();
    ws.onopen?.();
    act(() => {
      ws.emit("turn_closed", { turnId: "t1" }, { timestamp: "2026-09-20T16:44:00Z" });
    });
    expect(onCombatMessage).toHaveBeenCalledWith(
      { type: "turn_closed", payload: { turnId: "t1" } },
      Date.parse("2026-09-20T16:44:00Z"),
    );
  });

  it("sem timestamp no envelope, serverAt é undefined", () => {
    const onCombatMessage = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", onCombatMessage }),
    );
    const ws = flushConnect();
    ws.onopen?.();
    act(() => { ws.emit("turn_closed", { turnId: "t1" }); });
    expect(onCombatMessage).toHaveBeenCalledWith({ type: "turn_closed", payload: { turnId: "t1" } }, undefined);
  });

  it("npc_added chama onNpcAdded com o characterId", () => {
    const onNpcAdded = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", onNpcAdded }),
    );
    const ws = flushConnect();
    ws.onopen?.();
    act(() => { ws.emit("npc_added", { characterId: "npc-1" }); });
    expect(onNpcAdded).toHaveBeenCalledWith("npc-1");
  });

  it("master_action_enqueued chama onMasterActionEnqueued, sem ir para o combate", () => {
    const onMasterActionEnqueued = vi.fn();
    const onCombatMessage = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", onMasterActionEnqueued, onCombatMessage }),
    );
    const ws = flushConnect();
    ws.onopen?.();
    act(() => { ws.emit("master_action_enqueued", { targetIds: ["c1"], move: { position: [3, 4, 0] } }); });
    expect(onMasterActionEnqueued).toHaveBeenCalledTimes(1);
    expect(onCombatMessage).not.toHaveBeenCalled();
  });

  it("sendAddNpc e sendChangeScene mandam o formato do contrato", () => {
    const { result } = renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t" }),
    );
    const ws = flushConnect();
    ws.onopen?.();
    act(() => {
      result.current.sendAddNpc("npc-9");
      result.current.sendChangeScene({ category: "battle", briefInitialDescription: "Arena" });
    });
    expect(ws.sent("add_npc")).toEqual([{ characterSheetUuid: "npc-9" }]);
    expect(ws.sent("change_scene")).toEqual([{ category: "battle", briefInitialDescription: "Arena" }]);
  });
});

// ─── Connection lifecycle ──────────────────────────────────────────────────

describe("useMatchWs connection lifecycle", () => {
  it("opens a single socket under StrictMode's mount → unmount → mount", () => {
    renderHook(() => useMatchWs({ matchUuid: "m1", token: "t" }), {
      wrapper: StrictMode,
    });
    flushConnect();
    expect(FakeWS.instances).toHaveLength(1);
  });

  it("recycles a socket that opened but never received anything", () => {
    const { result } = renderHook(() => useMatchWs({ matchUuid: "m1", token: "t" }));
    const ws = flushConnect();
    act(() => { ws.onopen?.(); });
    act(() => { vi.advanceTimersByTime(4999); });
    expect(ws.close).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(ws.close).toHaveBeenCalledWith(4000, expect.any(String));

    act(() => { ws.onclose?.({ code: 4000 } as CloseEvent); });
    expect(result.current.status).toBe("connecting");
    act(() => { vi.advanceTimersByTime(1000); });
    expect(FakeWS.instances).toHaveLength(2);
  });

  it("keeps a live socket once any message arrives", () => {
    renderHook(() => useMatchWs({ matchUuid: "m1", token: "t" }));
    const ws = flushConnect();
    act(() => { ws.onopen?.(); });
    act(() => { ws.emit("room_state", {}); });
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(ws.close).not.toHaveBeenCalled();
  });

  it("waits for the master while the room is not open, without giving up", () => {
    const { result } = renderHook(() => useMatchWs({ matchUuid: "m1", token: "t" }));
    for (let i = 0; i < 8; i++) {
      const ws = i === 0 ? flushConnect() : FakeWS.instances[i];
      act(() => { ws.onopen?.(); });
      act(() => { ws.emit("lobby_not_open", {}); });
      // The browser may report the TCP drop (1006) instead of the server's 4001.
      act(() => { ws.onclose?.({ code: i % 2 ? 4001 : 1006 } as CloseEvent); });
      expect(result.current.status).toBe("waiting");
      act(() => { vi.advanceTimersByTime(5000); });
    }
    expect(FakeWS.instances).toHaveLength(9);

    const ws = FakeWS.instances[8];
    act(() => { ws.onopen?.(); });
    expect(result.current.status).toBe("waiting");
    act(() => { ws.emit("room_state", {}); });
    expect(result.current.status).toBe("connected");
  });

  it("reconnect() opens a fresh socket after giving up", () => {
    const { result } = renderHook(() => useMatchWs({ matchUuid: "m1", token: "t" }));
    const ws = flushConnect();
    act(() => { ws.onopen?.(); });
    act(() => { ws.onclose?.({ code: 1000 } as CloseEvent); });
    expect(result.current.status).toBe("disconnected");

    act(() => { result.current.reconnect(); });
    flushConnect(1);
    expect(FakeWS.instances).toHaveLength(2);
    expect(result.current.status).toBe("connecting");
  });
});
