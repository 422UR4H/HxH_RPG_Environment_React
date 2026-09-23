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
  it("cria o fantasma no envio, re-chaveia no ack e chama onActionEnqueued com {actorId, clearsDraft} (R2, R8, R28)", () => {
    const onActionEnqueued = vi.fn();
    const { result } = renderHook(() =>
      useMatchCombat({
        matchUuid: "m1", userUuid: "u1", token: "t", isMaster: false, onActionEnqueued,
      }),
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

    // R28: o composer sempre manda clearsDraft=true por padrão (enqueueAction sem
    // `options`) — a página usa isto pra saber SE deve limpar o rascunho e de QUEM.
    expect(onActionEnqueued).toHaveBeenCalledWith("action-9", { actorId: "c1", clearsDraft: true });
    expect(Object.keys(result.current.state.ghosts)).toEqual(["action-9"]);

    // Persistido sob partida+usuário (M2), sobrevivendo a um "refresh" (R3).
    expect(loadGhosts("m1", "u1")).toEqual({
      "action-9": { actorId: "c1", from: [0, 0, 0], to: [1, 1, 0] },
    });
  });

  it("hidrata os fantasmas confirmados de uma sessão anterior ao montar, por partida+usuário (R3, M2)", () => {
    localStorage.setItem(
      "match-ghosts:m1:u1",
      JSON.stringify({ "action-1": { actorId: "c1", from: [0, 0, 0], to: [2, 2, 0] } }),
    );
    const { result } = renderHook(() =>
      useMatchCombat({ matchUuid: "m1", userUuid: "u1", token: "t", isMaster: false }),
    );
    expect(result.current.state.ghosts).toEqual({
      "action-1": { actorId: "c1", from: [0, 0, 0], to: [2, 2, 0] },
    });
  });

  // M2: a mesma partida vista por dois papéis no mesmo browser (ex.: duas abas logadas
  // como usuários diferentes numa sessão de teste) não pode compartilhar fantasmas — a
  // chave antiga (`match-ghosts:{matchUuid}`) misturava os dois.
  it("não vê o fantasma de outro usuário na mesma partida (M2)", () => {
    localStorage.setItem(
      "match-ghosts:m1:master-1",
      JSON.stringify({ "action-1": { actorId: "npc1", from: [0, 0, 0], to: [2, 2, 0] } }),
    );
    const { result } = renderHook(() =>
      useMatchCombat({ matchUuid: "m1", userUuid: "u1", token: "t", isMaster: false }),
    );
    expect(result.current.state.ghosts).toEqual({});
  });

  // Final review, Important 2(a)/(c): sendEnqueueAction agora reporta se o socket estava
  // OPEN de verdade. Sem isto, Declarar com o socket caído nascia um fantasma órfão que
  // nunca ganharia ack nem erro (o comentário antigo do reducer assumia o contrário).
  it("não nasce fantasma nem entra em pendingSends quando o socket não está OPEN", () => {
    const { result } = renderHook(() =>
      useMatchCombat({ matchUuid: "m1", userUuid: "u1", token: "t", isMaster: false }),
    );
    const ws = FakeWS.instances[0];
    ws.readyState = 0; // reconectando — nunca chegou a abrir
    act(() => {
      result.current.send.enqueueAction({
        actorId: "c1",
        move: { category: "Dash", from: [0, 0, 0], position: [1, 1, 0] },
      });
    });
    expect(result.current.state.ghosts).toEqual({});
    expect(result.current.state.pendingSends).toEqual([]);
    expect(ws.send).not.toHaveBeenCalled();
  });

  // R29 + M3: o menu de parede do jogador passa por enqueueAction com clearsDraft: false
  // (não deve apagar o rascunho do composer em voo) — a metadata precisa refletir isso no
  // ack.
  it("enqueueAction com options.clearsDraft=false reporta clearsDraft=false no ack", () => {
    const onActionEnqueued = vi.fn();
    const { result } = renderHook(() =>
      useMatchCombat({
        matchUuid: "m1", userUuid: "u1", token: "t", isMaster: false, onActionEnqueued,
      }),
    );
    const ws = FakeWS.instances[0];
    act(() => { ws.onopen?.(); });
    act(() => {
      result.current.send.enqueueAction(
        { actorId: "c1", targetId: ["wall-1"], interact: { kind: "open" } },
        { clearsDraft: false },
      );
    });
    expect(result.current.state.pendingSends).toEqual([
      { localId: expect.stringMatching(/^local-/) as string, actorId: "c1", clearsDraft: false },
    ]);
    act(() => { ws.emit("action_enqueued", { actionId: "action-7" }); });
    expect(onActionEnqueued).toHaveBeenCalledWith("action-7", { actorId: "c1", clearsDraft: false });
  });
});
