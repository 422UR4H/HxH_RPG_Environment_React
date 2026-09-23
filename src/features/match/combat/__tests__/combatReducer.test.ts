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
  const ghostAction = {
    type: "ACTION_SENT" as const,
    payload: {
      localId: "local-1",
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
      payload: { localId: "local-1" },
    });
    s = combatReducer(s, {
      type: "ACTION_SENT",
      payload: {
        localId: "local-2",
        ghost: {
          actorId: "c1",
          from: [1, 1, 0] as [number, number, number],
          to: [3, 1, 0] as [number, number, number],
        },
      },
    });
    expect(s.pendingSends).toEqual(["local-1", "local-2"]);
    expect(Object.keys(s.ghosts)).toEqual(["local-2"]);

    s = combatReducer(s, { type: "action_enqueued", payload: { actionId: "a1" } });
    expect(s.pendingSends).toEqual(["local-2"]);
    expect(Object.keys(s.ghosts)).toEqual(["local-2"]);

    s = combatReducer(s, { type: "action_enqueued", payload: { actionId: "a2" } });
    expect(s.pendingSends).toEqual([]);
    expect(Object.keys(s.ghosts)).toEqual(["a2"]);
  });

  it("o fantasma morre quando o envio é recusado", () => {
    let s = combatReducer(initialCombatState, ghostAction);
    expect(s.pendingSends).toEqual(["local-1"]);
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
    expect(s.pendingSends).toEqual(["local-1"]);
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
