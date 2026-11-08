import { describe, it, expect, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSceneChangeFlow } from "../useSceneChangeFlow";
import type { SceneChangeFlowInput } from "../useSceneChangeFlow";
import type { CombatSummary } from "../../clock/clockMessages";
import type { WsError } from "../combatErrorMessages";

const SUMMARY: CombatSummary = {
  sceneId: "s1",
  countedRounds: 2,
  countedSeconds: 2,
  activeRoundCounts: false,
  minimumStoryAt: "2000-01-01T08:30:02",
  hiatuses: [],
};
const err = (sentType: string, code = "x"): WsError => ({ code, message: "m", sentType, at: Date.now() });

function setup(initial: Partial<SceneChangeFlowInput> = {}) {
  const requestCombatSummary = vi.fn(() => true);
  const changeScene = vi.fn(() => true);
  const base: SceneChangeFlowInput = {
    scene: { sceneId: "s1", category: "battle", briefInitialDescription: "" },
    combatSummary: null,
    lastError: null,
    requestCombatSummary,
    changeScene,
    ...initial,
  };
  const hook = renderHook((p: SceneChangeFlowInput) => useSceneChangeFlow(p), { initialProps: base });
  return { ...hook, base, requestCombatSummary, changeScene };
}

describe("useSceneChangeFlow", () => {
  it("requests the combat summary when opened in a battle scene", () => {
    const { result, requestCombatSummary } = setup();
    act(() => result.current.openDialog());
    expect(result.current.open).toBe(true);
    expect(requestCombatSummary).toHaveBeenCalledTimes(1);
  });

  it("does not request the summary in a roleplay scene", () => {
    const { result, requestCombatSummary } = setup({
      scene: { sceneId: "s1", category: "roleplay", briefInitialDescription: "" },
    });
    act(() => result.current.openDialog());
    expect(requestCombatSummary).not.toHaveBeenCalled();
    expect(result.current.currentCategory).toBe("roleplay");
  });

  it("ignores a summary that was already there before opening", () => {
    const { result, rerender, base } = setup({ combatSummary: SUMMARY });
    act(() => result.current.openDialog());
    expect(result.current.summary).toBeNull();
    const fresh = { ...SUMMARY, countedRounds: 3 };
    rerender({ ...base, combatSummary: fresh });
    expect(result.current.summary).toBe(fresh);
  });

  it("flags the summary as failed on a get_combat_summary error after opening", () => {
    const { result, rerender, base } = setup();
    act(() => result.current.openDialog());
    rerender({ ...base, lastError: err("get_combat_summary", "not_battle_scene") });
    expect(result.current.summaryFailed).toBe(true);
    rerender({ ...base, lastError: err("change_scene") });
    expect(result.current.summaryFailed).toBe(true);
  });

  it("passes only change_scene errors raised after opening", () => {
    const old = err("change_scene");
    const { result, rerender, base } = setup({ lastError: old });
    act(() => result.current.openDialog());
    expect(result.current.error).toBeNull();
    const fresh = err("change_scene", "clock_below_limit");
    rerender({ ...base, lastError: fresh });
    expect(result.current.error).toBe(fresh);
  });

  it("stays open after confirming and closes when the scene changes", () => {
    const { result, rerender, base, changeScene } = setup();
    act(() => result.current.openDialog());
    act(() => result.current.confirm({ category: "roleplay", briefInitialDescription: "" }));
    expect(changeScene).toHaveBeenCalledWith({ category: "roleplay", briefInitialDescription: "" });
    expect(result.current.open).toBe(true);
    rerender({ ...base, scene: { sceneId: "s2", category: "roleplay", briefInitialDescription: "" } });
    expect(result.current.open).toBe(false);
  });
});
