import { describe, it, expect } from "vitest";
import {
  normalizeBars,
  normalizeCloseTurnRefused,
  normalizeCombatMessage,
  normalizeMatchFullState,
  normalizeQueuedAction,
  normalizeResolution,
} from "../normalizeWire";

describe("normalizeWire — R33", () => {
  it("normaliza order/characters/prices null (bars_updated cru do Go)", () => {
    const out = normalizeBars({ seq: 1, prices: null, characters: null, order: null });
    expect(out).toEqual({ seq: 1, prices: {}, characters: [], order: [] });
  });

  it("normaliza actionSpeeds/moveSpeeds null de um personagem", () => {
    const out = normalizeBars({
      seq: 2,
      prices: {},
      characters: [
        { characterId: "c1", actionBalance: 1, moveBalance: 0, actionSpeeds: null, moveSpeeds: null },
      ],
      order: null,
    });
    expect(out.characters).toEqual([
      { characterId: "c1", actionBalance: 1, moveBalance: 0, actionSpeeds: [], moveSpeeds: [] },
    ]);
  });

  it("normaliza bars null dentro de um slot de order", () => {
    const out = normalizeBars({
      seq: 3,
      prices: {},
      characters: [],
      order: [{ actorId: "c1", key: 5, bars: null } as unknown as never],
    });
    expect(out.order).toEqual([{ actorId: "c1", key: 5, bars: [] }]);
  });

  it("mantém valores já presentes intactos", () => {
    const out = normalizeBars({
      seq: 9,
      prices: { action: 14 },
      characters: [
        { characterId: "c1", actionBalance: 1, moveBalance: 0, actionSpeeds: [1, 2], moveSpeeds: [3] },
      ],
      order: [{ actorId: "c1", key: 5, bars: ["action"] }],
    });
    expect(out).toEqual({
      seq: 9,
      prices: { action: 14 },
      characters: [
        { characterId: "c1", actionBalance: 1, moveBalance: 0, actionSpeeds: [1, 2], moveSpeeds: [3] },
      ],
      order: [{ actorId: "c1", key: 5, bars: ["action"] }],
    });
  });

  it("normaliza targets e action.diceRolled null de resolution_updated", () => {
    const out = normalizeResolution({
      turnId: "t1",
      isSettled: true,
      targets: null,
      action: {
        skillName: "Push",
        skillValue: 3,
        diceRolled: null,
        total: 10,
        isCritical: false,
        isCriticalFailure: false,
      },
    });
    expect(out.targets).toEqual([]);
    expect(out.action?.diceRolled).toEqual([]);
  });

  it("mantém action ausente como undefined", () => {
    const out = normalizeResolution({ turnId: "t1", isSettled: false, targets: [] });
    expect(out.action).toBeUndefined();
  });

  it("normaliza pendingReactions null de close_turn_refused", () => {
    const out = normalizeCloseTurnRefused({ turnId: "t1", pendingReactions: null });
    expect(out.pendingReactions).toEqual([]);
  });

  it("normaliza bars null de action_queued/queue", () => {
    const out = normalizeQueuedAction({ actionId: "a1", actorId: "c1", bars: null });
    expect(out.bars).toEqual([]);
  });

  it("normaliza match_full_state.bars, .resolution e .queue", () => {
    const out = normalizeMatchFullState({
      roundMode: "Free",
      bars: { seq: 1, prices: null, characters: null, order: null },
      resolution: { turnId: "t1", isSettled: true, targets: null },
      queue: [{ actionId: "a1", actorId: "c1", bars: null }],
    });
    expect(out.bars).toEqual({ seq: 1, prices: {}, characters: [], order: [] });
    expect(out.resolution?.targets).toEqual([]);
    expect(out.queue).toEqual([{ actionId: "a1", actorId: "c1", bars: [] }]);
  });

  it("match_full_state sem resolution/queue mantém undefined", () => {
    const out = normalizeMatchFullState({
      roundMode: "",
      bars: { seq: 0, prices: null, characters: null, order: null },
    });
    expect(out.resolution).toBeUndefined();
    expect(out.queue).toBeUndefined();
  });

  it("normalizeCombatMessage roteia bars_updated pelo normalizador certo", () => {
    const out = normalizeCombatMessage({
      type: "bars_updated",
      payload: { seq: 1, prices: null, characters: null, order: null },
    });
    expect(out).toEqual({
      type: "bars_updated",
      payload: { seq: 1, prices: {}, characters: [], order: [] },
    });
  });

  it("normalizeCombatMessage deixa passar tipos sem slice/map nil-ável", () => {
    const out = normalizeCombatMessage({ type: "turn_closed", payload: { turnId: "t1" } });
    expect(out).toEqual({ type: "turn_closed", payload: { turnId: "t1" } });
  });
});
