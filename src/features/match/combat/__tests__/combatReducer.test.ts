import { describe, it, expect } from "vitest";
import { combatReducer, initialCombatState } from "../combatReducer";
import type { BarsPayload } from "../combatMessages";

const bars = (seq: number): BarsPayload => ({
  seq,
  prices: { action: 14 },
  characters: [
    { characterId: "c1", actionBalance: -2, moveBalance: 0, actionSpeeds: [], moveSpeeds: [] },
  ],
  order: [],
});

describe("combatReducer — guarda de seq", () => {
  it("aplica um snapshot mais novo", () => {
    let s = combatReducer(initialCombatState, { type: "bars_updated", payload: bars(1) });
    s = combatReducer(s, { type: "bars_updated", payload: bars(3) });
    expect(s.bars?.seq).toBe(3);
  });

  it("descarta um snapshot atrasado", () => {
    let s = combatReducer(initialCombatState, { type: "bars_updated", payload: bars(5) });
    s = combatReducer(s, { type: "bars_updated", payload: bars(2) });
    expect(s.bars?.seq).toBe(5);
  });

  it("não reinicia o contador ao reconectar", () => {
    let s = combatReducer(initialCombatState, { type: "bars_updated", payload: bars(9) });
    s = combatReducer(s, {
      type: "match_full_state",
      payload: { roundMode: "Race", bars: bars(4) },
    });
    expect(s.bars?.seq).toBe(9);
  });
});

describe("combatReducer — fantasma", () => {
  // Final review, Important 2/M3 (R28): pendingSends agora carrega {localId, actorId,
  // clearsDraft} — não só o localId — para o hook saber, no ack, QUEM enviou e se era um
  // envio do composer (limpa rascunho) ou de um menu de parede (não limpa, R29).
  const ghostAction = {
    type: "ACTION_SENT" as const,
    payload: {
      localId: "local-1",
      actorId: "c1",
      clearsDraft: true,
      ghost: {
        actorId: "c1",
        from: [1, 1, 0] as [number, number, number],
        to: [3, 1, 0] as [number, number, number],
      },
    },
  };

  it("nasce no envio e ganha o actionId no ack", () => {
    let s = combatReducer(initialCombatState, ghostAction);
    expect(Object.keys(s.ghosts)).toEqual(["local-1"]);
    s = combatReducer(s, { type: "action_enqueued", payload: { actionId: "a1" } });
    expect(Object.keys(s.ghosts)).toEqual(["a1"]);
  });

  it("morre quando o turno daquela ação abre", () => {
    let s = combatReducer(initialCombatState, ghostAction);
    s = combatReducer(s, { type: "action_enqueued", payload: { actionId: "a1" } });
    s = combatReducer(s, {
      type: "turn_opened",
      payload: { turnId: "t1", actorId: "c1", actionId: "a1", actionType: "" },
    });
    expect(s.ghosts).toEqual({});
    expect(s.openTurn).toEqual({ turnId: "t1", actorId: "c1", actionId: "a1", actionType: "" });
  });

  it("some numa reconexão em que o turno do ator já está aberto", () => {
    let s = combatReducer(initialCombatState, ghostAction);
    s = combatReducer(s, { type: "action_enqueued", payload: { actionId: "a1" } });
    s = combatReducer(s, {
      type: "match_full_state",
      payload: { roundMode: "Race", openTurn: { turnId: "t9", actorId: "c1" } },
    });
    expect(s.ghosts).toEqual({});
  });

  it("é varrido no fim do round", () => {
    let s = combatReducer(initialCombatState, ghostAction);
    s = combatReducer(s, { type: "round_closed", payload: { roundMode: "Race" } });
    expect(s.ghosts).toEqual({});
  });

  it("FIFO: um envio sem movimento seguido de um com movimento", () => {
    let s = combatReducer(initialCombatState, {
      type: "ACTION_SENT",
      payload: { localId: "local-1", actorId: "c1", clearsDraft: true },
    });
    s = combatReducer(s, {
      type: "ACTION_SENT",
      payload: {
        localId: "local-2",
        actorId: "c1",
        clearsDraft: true,
        ghost: {
          actorId: "c1",
          from: [1, 1, 0] as [number, number, number],
          to: [3, 1, 0] as [number, number, number],
        },
      },
    });
    expect(s.pendingSends.map((p) => p.localId)).toEqual(["local-1", "local-2"]);
    expect(Object.keys(s.ghosts)).toEqual(["local-2"]);

    s = combatReducer(s, { type: "action_enqueued", payload: { actionId: "a1" } });
    expect(s.pendingSends.map((p) => p.localId)).toEqual(["local-2"]);
    expect(Object.keys(s.ghosts)).toEqual(["local-2"]);

    s = combatReducer(s, { type: "action_enqueued", payload: { actionId: "a2" } });
    expect(s.pendingSends).toEqual([]);
    expect(Object.keys(s.ghosts)).toEqual(["a2"]);
  });

  it("o fantasma morre quando o envio é recusado", () => {
    let s = combatReducer(initialCombatState, ghostAction);
    expect(s.pendingSends.map((p) => p.localId)).toEqual(["local-1"]);
    s = combatReducer(s, {
      type: "WS_ERROR",
      payload: { code: "invalid_action", message: "x", sentType: "enqueue_action", at: 1 },
    });
    expect(s.ghosts).toEqual({});
    expect(s.pendingSends).toEqual([]);
    expect(s.lastError).toEqual({
      code: "invalid_action",
      message: "x",
      sentType: "enqueue_action",
      at: 1,
    });
  });

  it("erro de outro verbo não mexe no fantasma", () => {
    let s = combatReducer(initialCombatState, ghostAction);
    s = combatReducer(s, {
      type: "WS_ERROR",
      payload: { code: "invalid_action", message: "x", sentType: "open_next_action", at: 1 },
    });
    expect(Object.keys(s.ghosts)).toEqual(["local-1"]);
    expect(s.pendingSends.map((p) => p.localId)).toEqual(["local-1"]);
  });

  // Final review, Important 2(d): um match_full_state é sempre um registro novo (socket
  // novo) — um envio ainda pendente na hora da queda pertencia ao socket antigo e nunca
  // vai ganhar ack nem erro daquele. Sem isto o fantasma provisório (local-*) e a entrada
  // em pendingSends ficavam presos para sempre.
  it("match_full_state limpa pendingSends e descarta todo fantasma provisório (local-*)", () => {
    let s = combatReducer(initialCombatState, ghostAction); // local-1, sem turno aberto
    s = combatReducer(s, {
      type: "ACTION_SENT",
      payload: {
        localId: "local-2",
        actorId: "c2",
        clearsDraft: true,
        ghost: { actorId: "c2", from: [0, 0, 0], to: [1, 0, 0] },
      },
    });
    expect(s.pendingSends).toHaveLength(2);
    expect(Object.keys(s.ghosts)).toEqual(["local-1", "local-2"]);

    s = combatReducer(s, { type: "match_full_state", payload: { roundMode: "Race" } });
    expect(s.pendingSends).toEqual([]);
    expect(s.ghosts).toEqual({});
  });

  it("match_full_state preserva um fantasma já confirmado (actionId, sem prefixo local-)", () => {
    let s = combatReducer(initialCombatState, ghostAction);
    s = combatReducer(s, { type: "action_enqueued", payload: { actionId: "a1" } });
    expect(Object.keys(s.ghosts)).toEqual(["a1"]);

    s = combatReducer(s, { type: "match_full_state", payload: { roundMode: "Race" } });
    expect(Object.keys(s.ghosts)).toEqual(["a1"]);
  });
});

describe("combatReducer — histórico", () => {
  it("junta turn_closed e a resolução liquidada na MESMA linha, em qualquer ordem", () => {
    let s = combatReducer(initialCombatState, {
      type: "resolution_updated",
      payload: { turnId: "t1", isSettled: true, targets: [] },
    });
    s = combatReducer(s, { type: "turn_closed", payload: { turnId: "t1" } });
    const closed = s.events.filter((e) => e.kind === "turn_closed");
    expect(closed).toHaveLength(1);
    expect(closed[0].resolution).toBeDefined();
  });

  it("ignora uma resolução de turno aberto no histórico", () => {
    const s = combatReducer(initialCombatState, {
      type: "resolution_updated",
      payload: { turnId: "t1", isSettled: false, targets: [] },
    });
    expect(s.events).toHaveLength(0);
  });
});

describe("combatReducer — scene_changed (R30)", () => {
  // R30: o spec §5 e o contrato só pedem que scene_changed troque a cena e varra os
  // fantasmas; queue/openTurn nunca fizeram parte disso (nem é alcançável na Fase 6 — o
  // servidor não muda de cena com turno aberto), mas o reducer original zerava os dois.
  it("troca a cena e varre fantasmas, mas preserva queue e openTurn", () => {
    // a2 fica na fila (não é o que abriu turno) — turn_opened(a1) só tira a1 da fila.
    let s = combatReducer(initialCombatState, {
      type: "action_queued",
      payload: { actionId: "a1", actorId: "c1", bars: ["action"] },
    });
    s = combatReducer(s, {
      type: "action_queued",
      payload: { actionId: "a2", actorId: "c2", bars: ["action"] },
    });
    s = combatReducer(s, {
      type: "turn_opened",
      payload: { turnId: "t1", actorId: "c1", actionId: "a1", actionType: "" },
    });
    s = combatReducer(s, {
      type: "ACTION_SENT",
      payload: {
        localId: "local-9",
        actorId: "c2",
        clearsDraft: true,
        ghost: { actorId: "c2", from: [0, 0, 0], to: [1, 0, 0] },
      },
    });

    s = combatReducer(s, {
      type: "scene_changed",
      payload: { sceneId: "s2", category: "battle", briefInitialDescription: "" },
    });

    expect(s.scene).toEqual({ sceneId: "s2", category: "battle", briefInitialDescription: "" });
    expect(s.ghosts).toEqual({});
    expect(s.queue).toEqual([{ actionId: "a2", actorId: "c2", bars: ["action"] }]);
    expect(s.openTurn).toEqual({ turnId: "t1", actorId: "c1", actionId: "a1", actionType: "" });
  });
});

describe("combatReducer — HP e fila", () => {
  it("guarda o HP aplicado", () => {
    const s = combatReducer(initialCombatState, {
      type: "character_hp_changed",
      payload: { characterId: "c2", hp: 84, maxHp: 100, damage: 16 },
    });
    expect(s.hp["c2"]).toEqual({ hp: 84, maxHp: 100 });
  });

  it("empilha a fila e a substitui inteira no snapshot", () => {
    let s = combatReducer(initialCombatState, {
      type: "action_queued",
      payload: { actionId: "a1", actorId: "c1", bars: ["action"] },
    });
    expect(s.queue).toHaveLength(1);
    s = combatReducer(s, {
      type: "match_full_state",
      payload: { roundMode: "Race", queue: [] },
    });
    expect(s.queue).toHaveLength(0);
  });
});
