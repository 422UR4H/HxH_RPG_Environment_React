import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMatchCombat } from "../useMatchCombat";
import { loadGhosts } from "../actionDraft";

// Same fake socket used by useMatchWs.test.ts — the hook gates sends on
// `ws.readyState === WebSocket.OPEN`.
class FakeWS {
  static instances: FakeWS[] = [];
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
  localStorage.clear();
  vi.stubGlobal("WebSocket", FakeWS as unknown as typeof WebSocket);
  vi.stubEnv("VITE_WS_URL", "ws://test");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("useMatchCombat", () => {
  it("cria o fantasma no envio, re-chaveia no ack e chama onActionEnqueued (R2, R8)", () => {
    const onActionEnqueued = vi.fn();
    const { result } = renderHook(() =>
      useMatchCombat({ matchUuid: "m1", token: "t", isMaster: false, onActionEnqueued }),
    );
    const ws = FakeWS.instances[0];
    act(() => { ws.onopen?.(); });

    act(() => {
      result.current.send.enqueueAction({
        actorId: "c1",
        move: { category: "Dash", from: [0, 0, 0], position: [1, 1, 0] },
      });
    });

    // Antes do ack: exatamente um fantasma provisório (chave local-*).
    const localKeys = Object.keys(result.current.state.ghosts);
    expect(localKeys).toHaveLength(1);
    expect(localKeys[0]).toMatch(/^local-/);
    expect(result.current.state.ghosts[localKeys[0]]).toEqual({
      actorId: "c1", from: [0, 0, 0], to: [1, 1, 0],
    });

    act(() => { ws.emit("action_enqueued", { actionId: "action-9" }); });

    expect(onActionEnqueued).toHaveBeenCalledWith("action-9");
    expect(Object.keys(result.current.state.ghosts)).toEqual(["action-9"]);

    // Persistido sob a partida, sobrevivendo a um "refresh" (R3).
    expect(loadGhosts("m1")).toEqual({
      "action-9": { actorId: "c1", from: [0, 0, 0], to: [1, 1, 0] },
    });
  });

  it("hidrata os fantasmas confirmados de uma sessão anterior ao montar (R3)", () => {
    localStorage.setItem(
      "match-ghosts:m1",
      JSON.stringify({ "action-1": { actorId: "c1", from: [0, 0, 0], to: [2, 2, 0] } }),
    );
    const { result } = renderHook(() =>
      useMatchCombat({ matchUuid: "m1", token: "t", isMaster: false }),
    );
    expect(result.current.state.ghosts).toEqual({
      "action-1": { actorId: "c1", from: [0, 0, 0], to: [2, 2, 0] },
    });
  });
});
