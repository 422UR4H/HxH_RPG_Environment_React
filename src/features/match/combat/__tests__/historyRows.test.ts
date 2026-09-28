import { describe, it, expect } from "vitest";
import { historyRows } from "../historyRows";
import type { TableEvent } from "../combatReducer";
import type { HistoryTurn, MatchHistory } from "../../../../types/matchHistory";

const turn = (uuid: string, finishedAt: string): HistoryTurn => ({
  uuid, createdAt: finishedAt, finishedAt,
  action: { uuid: `a-${uuid}`, actorId: "c1", reactionKind: "" },
});
const history = (...turns: HistoryTurn[]): MatchHistory => ({
  scenes: [{ uuid: "s1", category: "battle", briefDesc: "", createdAt: "", rounds: [{ uuid: "r1", mode: "Race", createdAt: "", turns }] }],
});
const T = (iso: string) => Date.parse(iso);

describe("historyRows", () => {
  it("turnos do REST viram linhas, em ordem de hora", () => {
    const rows = historyRows(history(turn("t2", "2026-01-01T00:02:00Z"), turn("t1", "2026-01-01T00:01:00Z")), [], 0, undefined);
    expect(rows.map((r) => r.key)).toEqual(["rest:t1", "rest:t2"]);
  });

  it("evento derivado de turno sai quando um fetch começou DEPOIS de ele chegar", () => {
    const ev: TableEvent = { kind: "turn_closed", turnId: "t1", at: T("2026-01-01T00:01:00Z"), receivedAt: 100 };
    const rows = historyRows(history(turn("t1", "2026-01-01T00:01:00Z")), [ev], 200, undefined);
    expect(rows.filter((r) => r.source === "live")).toHaveLength(0);
  });

  it("fetch que começou no MESMO milissegundo em que o evento chegou o derruba", () => {
    // O refetch do turn_closed roda no mesmo stack síncrono que carimbou o receivedAt.
    const closed: TableEvent = { kind: "turn_closed", turnId: "t1", at: T("2026-01-01T00:01:00Z"), receivedAt: 200 };
    const hp: TableEvent = { kind: "hp_changed", characterId: "c2", hp: 5, maxHp: 10, damage: 5, at: 1, receivedAt: 200 };
    const rows = historyRows(history(turn("t1", "2026-01-01T00:01:00Z")), [hp, closed], 200, undefined);
    expect(rows.map((r) => r.key)).toEqual(["rest:t1"]);
  });

  it("fetch que começou ANTES do evento não o derruba", () => {
    const ev: TableEvent = { kind: "turn_closed", turnId: "t9", at: T("2026-01-01T00:05:00Z"), receivedAt: 300 };
    const rows = historyRows(history(), [ev], 200, undefined);
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe("live");
  });

  it("hp_changed e resolução liquidada seguem a mesma regra", () => {
    const hp: TableEvent = { kind: "hp_changed", characterId: "c2", hp: 5, maxHp: 10, damage: 5, at: 1, receivedAt: 100 };
    expect(historyRows(history(), [hp], 200, undefined)).toHaveLength(0);
    expect(historyRows(history(), [hp], 50, undefined)).toHaveLength(1);
  });

  it("cena, regime e round fechado ficam ao vivo mesmo com fetch posterior (até B15)", () => {
    const evs: TableEvent[] = [
      { kind: "round_closed", roundMode: "Race", at: 1, receivedAt: 100 },
      { kind: "round_mode_changed", mode: "Free", at: 2, receivedAt: 100 },
      { kind: "scene_changed", scene: { sceneId: "s2", category: "battle", briefInitialDescription: "" }, at: 3, receivedAt: 100 },
    ];
    expect(historyRows(history(), evs, 999, undefined)).toHaveLength(3);
  });

  it("turn_opened fica só enquanto aquele turno está aberto", () => {
    const ev: TableEvent = { kind: "turn_opened", turnId: "t3", actorId: "c1", at: 1, receivedAt: 1 };
    expect(historyRows(history(), [ev], 999, "t3")).toHaveLength(1);
    expect(historyRows(history(), [ev], 999, undefined)).toHaveLength(0);
  });

  it("intercala REST e ao vivo pela hora do servidor; empate: REST antes", () => {
    const ev: TableEvent = { kind: "round_mode_changed", mode: "Free", at: T("2026-01-01T00:01:00Z"), receivedAt: 1 };
    const rows = historyRows(history(turn("t1", "2026-01-01T00:01:00Z"), turn("t2", "2026-01-01T00:03:00Z")), [ev], 0, undefined);
    expect(rows.map((r) => r.key)).toEqual(["rest:t1", `live:round_mode_changed:${ev.at}:0`, "rest:t2"]);
  });

  it("turno do REST sem finishedAt usa createdAt", () => {
    const t = { ...turn("t1", "2026-01-01T00:01:00Z"), finishedAt: undefined };
    expect(historyRows(history(t), [], 0, undefined)[0].at).toBe(T("2026-01-01T00:01:00Z"));
  });
});
