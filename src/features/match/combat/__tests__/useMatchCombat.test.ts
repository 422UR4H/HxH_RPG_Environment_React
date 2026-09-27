import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMatchCombat } from "../useMatchCombat";
import { loadDeclared, saveDeclared } from "../declaredStorage";
import { flushConnect, installFakeWebSocket } from "../../../../test/fakeWebSocket";

beforeEach(() => {
  localStorage.clear();
  installFakeWebSocket();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const move = { category: "Dash" as const, from: [0, 0, 0] as [number, number, number], position: [1, 1, 0] as [number, number, number] };

function mount(extra: Partial<Parameters<typeof useMatchCombat>[0]> = {}) {
  const hook = renderHook(() =>
    useMatchCombat({ matchUuid: "m1", userUuid: "u1", token: "t", isMaster: false, ...extra }),
  );
  const ws = flushConnect();
  act(() => { ws.onopen?.(); });
  return { ...hook, ws };
}

describe("useMatchCombat", () => {
  it("registra o que foi declarado, confirma no ack e avisa a página para limpar o rascunho", () => {
    const onComposerSendAccepted = vi.fn();
    const { result, ws } = mount({ onComposerSendAccepted });

    act(() => {
      result.current.send.enqueueAction({ actorId: "c1", targetId: ["c2"], attack: { weapon: "Sword" }, move });
    });
    expect(result.current.state.declared).toMatchObject([
      {
        status: "sending",
        actorId: "c1",
        move: { category: "Dash", from: [0, 0, 0], to: [1, 1, 0] },
        attack: { targets: ["c2"], weapon: "Sword" },
      },
    ]);
    expect(onComposerSendAccepted).not.toHaveBeenCalled();

    act(() => { ws.emit("action_enqueued", { actionId: "a9" }); });
    expect(result.current.state.declared).toMatchObject([{ id: "a9", status: "queued" }]);
    expect(onComposerSendAccepted).toHaveBeenCalledWith("c1");
  });

  it("o menu de parede não limpa o rascunho no ack", () => {
    const onComposerSendAccepted = vi.fn();
    const { result, ws } = mount({ onComposerSendAccepted });
    act(() => {
      result.current.send.enqueueAction(
        { actorId: "c1", targetId: ["w1"], interact: { kind: "open" } },
        { fromComposer: false },
      );
    });
    expect(result.current.state.declared[0].interact).toEqual({ kind: "open", targets: ["w1"] });
    act(() => { ws.emit("action_enqueued", { actionId: "a1" }); });
    expect(onComposerSendAccepted).not.toHaveBeenCalled();
  });

  it("nada é registrado quando o socket não está aberto", () => {
    const { result, ws } = mount();
    ws.readyState = 3; // CLOSED
    let ok = true;
    act(() => { ok = result.current.send.enqueueAction({ actorId: "c1", move }); });
    expect(ok).toBe(false);
    expect(result.current.state.declared).toEqual([]);
  });

  it("dois acks no mesmo lote reportam, cada um, o ator do envio certo", () => {
    const onComposerSendAccepted = vi.fn();
    const { result, ws } = mount({ onComposerSendAccepted, isMaster: true });
    act(() => {
      result.current.send.enqueueAction({ actorId: "npcA", move });
      result.current.send.enqueueAction({ actorId: "npcB", move });
    });
    act(() => {
      ws.emit("action_enqueued", { actionId: "a1" });
      ws.emit("action_enqueued", { actionId: "a2" });
    });
    expect(onComposerSendAccepted.mock.calls).toEqual([["npcA"], ["npcB"]]);
    expect(result.current.state.declared.map((d) => [d.id, d.actorId])).toEqual([["a1", "npcA"], ["a2", "npcB"]]);
  });

  it("uma recusa seguida de um ack no mesmo lote: o ack é do SEGUNDO envio", () => {
    const onComposerSendAccepted = vi.fn();
    const { result, ws } = mount({ onComposerSendAccepted, isMaster: true });
    act(() => {
      result.current.send.enqueueAction({ actorId: "npcA", move });
      result.current.send.enqueueAction({ actorId: "npcB", move });
    });
    act(() => {
      ws.emit("error", { code: "move_blocked", message: "movement blocked by a wall" });
      ws.emit("action_enqueued", { actionId: "a2" });
    });
    expect(onComposerSendAccepted.mock.calls).toEqual([["npcB"]]);
    expect(result.current.state.declared.map((d) => [d.id, d.actorId])).toEqual([["a2", "npcB"]]);
    expect(result.current.state.lastError?.code).toBe("move_blocked");
  });

  it("persiste as ações confirmadas por partida + usuário e as reidrata ao montar", () => {
    const { result, ws, unmount } = mount();
    act(() => { result.current.send.enqueueAction({ actorId: "c1", move }); });
    expect(loadDeclared("m1", "u1")).toEqual([]); // sem ack ainda: nada no disco
    act(() => { ws.emit("action_enqueued", { actionId: "a1" }); });
    expect(loadDeclared("m1", "u1").map((d) => d.id)).toEqual(["a1"]);
    unmount();

    const again = renderHook(() =>
      useMatchCombat({ matchUuid: "m1", userUuid: "u1", token: "t", isMaster: false }),
    );
    expect(again.result.current.state.declared.map((d) => d.id)).toEqual(["a1"]);
    const other = renderHook(() =>
      useMatchCombat({ matchUuid: "m1", userUuid: "u2", token: "t", isMaster: false }),
    );
    expect(other.result.current.state.declared).toEqual([]);
  });

  it("um localStorage que lança não derruba nada", () => {
    saveDeclared("m1", "u1", [{ id: "a1", actorId: "c1", status: "queued", fromComposer: true, at: 0 }]);
    const spy = vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() =>
      useMatchCombat({ matchUuid: "m1", userUuid: "u1", token: "t", isMaster: false }),
    );
    expect(result.current.state.declared).toEqual([]);
    spy.mockRestore();
  });
});
