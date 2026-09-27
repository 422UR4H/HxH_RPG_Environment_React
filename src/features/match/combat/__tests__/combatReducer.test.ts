import { describe, it, expect } from "vitest";
import { combatReducer, initialCombatState, pendingMoves } from "../combatReducer";
import type { CombatAction, CombatState, DeclaredAction } from "../combatReducer";
import type { BarsPayload } from "../combatMessages";

const bars = (seq: number): BarsPayload => ({
  seq,
  prices: { action: 14 },
  characters: [
    { characterId: "c1", actionBalance: -2, moveBalance: 0, actionSpeeds: [], moveSpeeds: [] },
  ],
  order: [],
});

const run = (actions: CombatAction[], from: CombatState = initialCombatState) =>
  actions.reduce(combatReducer, from);

const sent = (id: string, extra: Partial<DeclaredAction> = {}): CombatAction => ({
  type: "ACTION_SENT",
  payload: { id, actorId: "c1", status: "sending", fromComposer: true, at: 0, ...extra },
});
const moveTo = { move: { category: "Dash" as const, from: [1, 1, 0] as [number, number, number], to: [3, 1, 0] as [number, number, number] } };
const acked = (actionId: string): CombatAction => ({ type: "action_enqueued", payload: { actionId } });
const opened = (turnId: string, actionId: string, actorId = "c1"): CombatAction => ({
  type: "turn_opened",
  payload: { turnId, actorId, actionId, actionType: "" },
});
const closed = (turnId: string): CombatAction => ({ type: "turn_closed", payload: { turnId } });

describe("combatReducer — guarda de seq", () => {
  it("aplica um snapshot mais novo", () => {
    const s = run([{ type: "bars_updated", payload: bars(1) }, { type: "bars_updated", payload: bars(3) }]);
    expect(s.bars?.seq).toBe(3);
  });

  it("descarta um snapshot atrasado", () => {
    const s = run([{ type: "bars_updated", payload: bars(5) }, { type: "bars_updated", payload: bars(2) }]);
    expect(s.bars?.seq).toBe(5);
  });

  it("não reinicia o contador ao reconectar", () => {
    const s = run([
      { type: "bars_updated", payload: bars(9) },
      { type: "match_full_state", payload: { roundMode: "Race", bars: bars(4) } },
    ]);
    expect(s.bars?.seq).toBe(9);
  });
});

describe("combatReducer — ações declaradas", () => {
  it("nasce no envio, ganha o actionId no ack e abre com o turno", () => {
    let s = run([sent("local-1", moveTo)]);
    expect(s.declared.map((d) => [d.id, d.status])).toEqual([["local-1", "sending"]]);
    s = run([acked("a1")], s);
    expect(s.declared.map((d) => [d.id, d.status])).toEqual([["a1", "queued"]]);
    s = run([opened("t1", "a1")], s);
    expect(s.declared.map((d) => [d.id, d.status, d.turnId])).toEqual([["a1", "open", "t1"]]);
    s = run([closed("t1")], s);
    expect(s.declared).toEqual([]);
  });

  it("acks chegam na ordem dos envios", () => {
    const s = run([sent("local-1"), sent("local-2", moveTo), acked("a1"), acked("a2")]);
    expect(s.declared.map((d) => d.id)).toEqual(["a1", "a2"]);
    expect(s.declared[1].move).toEqual(moveTo.move);
  });

  it("um envio recusado some — e só ele", () => {
    const s = run([
      sent("local-1", moveTo),
      acked("a1"),
      sent("local-2"),
      { type: "WS_ERROR", payload: { code: "move_blocked", message: "", sentType: "enqueue_action", at: 1 } },
    ]);
    expect(s.declared.map((d) => d.id)).toEqual(["a1"]);
    expect(s.lastError?.code).toBe("move_blocked");
  });

  it("erro de outro verbo não mexe nas ações declaradas", () => {
    const s = run([
      sent("local-1"),
      { type: "WS_ERROR", payload: { code: "game_error", message: "x", sentType: "open_next_action", at: 1 } },
    ]);
    expect(s.declared).toHaveLength(1);
  });

  it("sobrevive ao fim do round e à troca de cena — a fila do servidor também sobrevive", () => {
    const s = run([
      sent("local-1", moveTo),
      acked("a1"),
      { type: "round_closed", payload: { roundMode: "Race" } },
      { type: "scene_changed", payload: { sceneId: "s2", category: "battle", briefInitialDescription: "" } },
    ]);
    expect(s.declared.map((d) => d.id)).toEqual(["a1"]);
    expect(pendingMoves(s.declared)).toHaveLength(1);
  });

  it("reconexão: descarta envios sem ack e turnos meus que fecharam fora", () => {
    const s = run([
      sent("local-1"), acked("a1"), opened("t1", "a1"), // aberto — vai fechar enquanto estou fora
      sent("local-2"), acked("a2"),                        // ainda na fila
      sent("local-3"),                                     // sem ack, socket morreu
      { type: "match_full_state", payload: { roundMode: "Race", openTurn: { turnId: "t9", actorId: "c2" } } },
    ]);
    expect(s.declared.map((d) => [d.id, d.status])).toEqual([["a2", "queued"]]);
  });

  it("reconexão com o meu turno ainda aberto mantém a ação em curso", () => {
    const s = run([
      sent("local-1"), acked("a1"), opened("t1", "a1"),
      { type: "match_full_state", payload: { roundMode: "Race", openTurn: { turnId: "t1", actorId: "c1" } } },
    ]);
    expect(s.declared.map((d) => [d.id, d.status])).toEqual([["a1", "open"]]);
  });

  it("dispensar tira da lista", () => {
    const s = run([sent("local-1"), acked("a1"), { type: "DECLARED_DISMISSED", payload: { ids: ["a1"] } }]);
    expect(s.declared).toEqual([]);
  });

  it("fantasma é só o movimento que ainda não aconteceu", () => {
    const s = run([sent("local-1", moveTo), acked("a1"), sent("local-2"), acked("a2"), opened("t1", "a1")]);
    expect(pendingMoves(s.declared)).toHaveLength(0); // a1 abriu: a peça já anda por piece_moved
    const s2 = run([sent("local-1", moveTo)]);
    expect(pendingMoves(s2.declared).map((d) => d.id)).toEqual(["local-1"]);
  });
});

describe("combatReducer — turno aberto e fila", () => {
  it("turn_opened tira a ação da fila do mestre e marca o turno", () => {
    const s = run([
      { type: "action_queued", payload: { actionId: "a1", actorId: "c1", bars: ["action"] } },
      { type: "action_queued", payload: { actionId: "a2", actorId: "c2", bars: ["move"] } },
      opened("t1", "a1"),
    ]);
    expect(s.queue.map((q) => q.actionId)).toEqual(["a2"]);
    expect(s.openTurn).toEqual({ turnId: "t1", actorId: "c1", actionId: "a1", actionType: "" });
  });

  it("turn_closed só limpa o turno que fechou", () => {
    const s = run([opened("t1", "a1"), closed("t0")]);
    expect(s.openTurn?.turnId).toBe("t1");
    expect(run([closed("t1")], s).openTurn).toBeNull();
  });

  it("a fila é substituída inteira no snapshot", () => {
    const s = run([
      { type: "action_queued", payload: { actionId: "a1", actorId: "c1", bars: ["action"] } },
      { type: "match_full_state", payload: { roundMode: "Race" } },
    ]);
    expect(s.queue).toEqual([]);
  });

  it("troca de cena preserva fila e turno aberto", () => {
    const s = run([
      { type: "action_queued", payload: { actionId: "a2", actorId: "c2", bars: ["action"] } },
      opened("t1", "a1"),
      { type: "scene_changed", payload: { sceneId: "s2", category: "battle", briefInitialDescription: "Arena" } },
    ]);
    expect(s.scene?.briefInitialDescription).toBe("Arena");
    expect(s.queue).toHaveLength(1);
    expect(s.openTurn?.turnId).toBe("t1");
  });
});

describe("combatReducer — histórico", () => {
  it("o turno aberto de uma ação minha leva o que eu declarei", () => {
    const s = run([sent("local-1", { ...moveTo, attack: { targets: ["c2"] } }), acked("a1"), opened("t1", "a1")]);
    const ev = s.events.find((e) => e.kind === "turn_opened");
    expect(ev?.kind === "turn_opened" && ev.mine?.attack?.targets).toEqual(["c2"]);
  });

  it("junta turn_closed e a resolução liquidada na MESMA linha, em qualquer ordem, com o ator", () => {
    const s = run([
      opened("t1", "a1", "c7"),
      { type: "resolution_updated", payload: { turnId: "t1", isSettled: true, targets: [] } },
      closed("t1"),
    ]);
    const rows = s.events.filter((e) => e.kind === "turn_closed");
    expect(rows).toHaveLength(1);
    expect(rows[0].kind === "turn_closed" && rows[0].resolution).toBeDefined();
    expect(rows[0].kind === "turn_closed" && rows[0].actorId).toBe("c7");
  });

  it("ignora uma resolução de turno aberto", () => {
    const s = run([{ type: "resolution_updated", payload: { turnId: "t1", isSettled: false, targets: [] } }]);
    expect(s.events).toHaveLength(0);
  });

  it("guarda o HP aplicado", () => {
    const s = run([{ type: "character_hp_changed", payload: { characterId: "c2", hp: 84, maxHp: 100, damage: 16 } }]);
    expect(s.hp["c2"]).toEqual({ hp: 84, maxHp: 100 });
    expect(s.events[0]).toMatchObject({ kind: "hp_changed", hp: 84, maxHp: 100, damage: 16 });
  });
});
