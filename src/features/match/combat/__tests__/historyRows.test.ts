import { describe, it, expect } from "vitest";
import { historyRows } from "../historyRows";
import type { HistoryRow } from "../historyRows";
import type { TableEvent } from "../combatReducer";
import type { HistoryMasterAction, HistoryRound, HistoryTurn, MatchHistory } from "../../../../types/matchHistory";

const turn = (uuid: string, finishedAt: string): HistoryTurn => ({
  uuid, createdAt: finishedAt, finishedAt,
  action: { uuid: `a-${uuid}`, actorId: "c1", reactionKind: "" },
  masterActions: [],
});
const SCENE_AT = "2026-01-01T00:00:00Z";
const history = (...turns: HistoryTurn[]): MatchHistory => ({
  scenes: [{
    uuid: "s1", category: "battle", briefDesc: "", createdAt: SCENE_AT,
    rounds: [{ uuid: "r1", mode: "Race", createdAt: SCENE_AT, turns, events: [] }],
  }],
});
const T = (iso: string) => Date.parse(iso);
const live = (rows: HistoryRow[]) => rows.filter((r) => r.source === "live");
const keys = (rows: HistoryRow[]) => rows.map((r) => r.key);

const pieceMove = (uuid: string, at: string): HistoryMasterAction => ({
  uuid, kind: "movePiece", happenedAt: at,
  content: { characterId: "c1", pieceId: "p1", from: [4, 4, 0], to: [6, 4, 0] },
});

describe("historyRows", () => {
  it("turnos do REST viram linhas, em ordem de hora", () => {
    const rows = historyRows(history(turn("t2", "2026-01-01T00:02:00Z"), turn("t1", "2026-01-01T00:01:00Z")), [], 0, undefined);
    expect(keys(rows)).toEqual(["rest:scene:s1", "rest:t1", "rest:t2"]);
  });

  it("evento derivado de turno sai quando um fetch começou DEPOIS de ele chegar", () => {
    const ev: TableEvent = { kind: "turn_closed", turnId: "t1", at: T("2026-01-01T00:01:00Z"), receivedAt: 100 };
    const rows = historyRows(history(turn("t1", "2026-01-01T00:01:00Z")), [ev], 200, undefined);
    expect(live(rows)).toHaveLength(0);
  });

  it("fetch que começou no MESMO milissegundo em que o evento chegou o derruba", () => {
    // O refetch do turn_closed roda no mesmo stack síncrono que carimbou o receivedAt.
    const closed: TableEvent = { kind: "turn_closed", turnId: "t1", at: T("2026-01-01T00:01:00Z"), receivedAt: 200 };
    const hp: TableEvent = { kind: "hp_changed", characterId: "c2", hp: 5, maxHp: 10, damage: 5, at: 1, receivedAt: 200 };
    const rows = historyRows(history(turn("t1", "2026-01-01T00:01:00Z")), [hp, closed], 200, undefined);
    expect(keys(rows)).toEqual(["rest:scene:s1", "rest:t1"]);
  });

  it("fetch que começou ANTES do evento não o derruba", () => {
    const ev: TableEvent = { kind: "turn_closed", turnId: "t9", at: T("2026-01-01T00:05:00Z"), receivedAt: 300 };
    const rows = live(historyRows(history(), [ev], 200, undefined));
    expect(rows).toHaveLength(1);
  });

  it("hp_changed e resolução liquidada seguem a mesma regra", () => {
    const hp: TableEvent = { kind: "hp_changed", characterId: "c2", hp: 5, maxHp: 10, damage: 5, at: 1, receivedAt: 100 };
    expect(live(historyRows(history(), [hp], 200, undefined))).toHaveLength(0);
    expect(live(historyRows(history(), [hp], 50, undefined))).toHaveLength(1);
  });

  it("cena, regime e round fechado ao vivo saem com fetch posterior e ficam com fetch anterior (B15)", () => {
    const evs: TableEvent[] = [
      { kind: "round_closed", roundMode: "Race", at: 1, receivedAt: 100 },
      { kind: "round_mode_changed", mode: "Free", at: 2, receivedAt: 100 },
      { kind: "scene_changed", scene: { sceneId: "s2", category: "battle", briefInitialDescription: "" }, at: 3, receivedAt: 100 },
    ];
    expect(live(historyRows(history(), evs, 100, undefined))).toHaveLength(0);
    expect(live(historyRows(history(), evs, 99, undefined))).toHaveLength(3);
  });

  it("turn_opened fica só enquanto aquele turno está aberto", () => {
    const ev: TableEvent = { kind: "turn_opened", turnId: "t3", actorId: "c1", at: 1, receivedAt: 1 };
    expect(live(historyRows(history(), [ev], 999, "t3"))).toHaveLength(1);
    expect(live(historyRows(history(), [ev], 999, undefined))).toHaveLength(0);
  });

  it("intercala REST e ao vivo pela hora do servidor; empate: REST antes", () => {
    const ev: TableEvent = { kind: "round_mode_changed", mode: "Free", at: T("2026-01-01T00:01:00Z"), receivedAt: 1 };
    const rows = historyRows(history(turn("t1", "2026-01-01T00:01:00Z"), turn("t2", "2026-01-01T00:03:00Z")), [ev], 0, undefined);
    expect(keys(rows)).toEqual(["rest:scene:s1", "rest:t1", `live:round_mode_changed:${ev.at}:0`, "rest:t2"]);
  });

  it("turno do REST sem finishedAt usa createdAt", () => {
    const t = { ...turn("t1", "2026-01-01T00:01:00Z"), finishedAt: undefined };
    const row = historyRows(history(t), [], 0, undefined).find((r) => r.key === "rest:t1");
    expect(row?.at).toBe(T("2026-01-01T00:01:00Z"));
  });

  it("cena, troca de regime e round fechado vêm do REST, na hora do contrato — uma cena sem turno aparece", () => {
    const closedRound: HistoryRound = {
      uuid: "r1", mode: "Race", createdAt: "2026-01-01T00:00:00Z", finishedAt: "2026-01-01T00:05:00Z", turns: [],
      events: [{ uuid: "e1", kind: "roundModeChanged", createdAt: "2026-01-01T00:01:00Z", payload: { from: "Free", to: "Race" } }],
    };
    const nextRound: HistoryRound = { uuid: "r2", mode: "Race", createdAt: "2026-01-01T00:05:00Z", finishedAt: "2026-01-01T00:09:00Z", turns: [], events: [] };
    const h: MatchHistory = {
      scenes: [
        { uuid: "s1", category: "roleplay", briefDesc: "Taverna", createdAt: "2026-01-01T00:00:00Z", finishedAt: "2026-01-01T00:09:00Z", rounds: [closedRound, nextRound] },
        {
          uuid: "s2", category: "battle", briefDesc: "Arena", createdAt: "2026-01-01T00:09:00Z",
          rounds: [{ uuid: "r3", mode: "Free", createdAt: "2026-01-01T00:09:00Z", turns: [], events: [] }],
        },
      ],
    };
    const rows = historyRows(h, [], 0, undefined);
    expect(rows.map((r) => [r.key, r.at])).toEqual([
      ["rest:scene:s1", T("2026-01-01T00:00:00Z")],
      ["rest:event:e1", T("2026-01-01T00:01:00Z")],
      ["rest:round_closed:r1", T("2026-01-01T00:05:00Z")],
      // r2 fechou com a troca de cena: ao vivo isso é só o scene_changed, não um round_closed.
      ["rest:scene:s2", T("2026-01-01T00:09:00Z")],
    ]);
    expect(rows[1]).toMatchObject({ kind: "round_mode_changed", mode: "Race" });
  });

  it("master action fora de turno vira linha própria, na ordem do tempo; a de dentro vai com o turno", () => {
    const inside = { ...pieceMove("ma1", "2026-01-01T00:01:10Z"), turnId: "t1" };
    const t1 = { ...turn("t1", "2026-01-01T00:01:30Z"), masterActions: [inside] };
    const h = history(t1, turn("t2", "2026-01-01T00:03:00Z"));
    h.scenes[0].rounds[0].events = [
      { uuid: "ma2", kind: "masterAction", createdAt: "2026-01-01T00:02:10Z", masterAction: pieceMove("ma2", "2026-01-01T00:02:10Z") },
    ];
    const rows = historyRows(h, [], 0, undefined);
    expect(keys(rows)).toEqual(["rest:scene:s1", "rest:t1", "rest:event:ma2", "rest:t2"]);
    expect(rows[2]).toMatchObject({ kind: "master_action", masterAction: { uuid: "ma2" } });
    expect(rows[1]).toMatchObject({ kind: "turn", turn: { masterActions: [inside] } });
  });
});
