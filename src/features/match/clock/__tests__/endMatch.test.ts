import { describe, it, expect } from "vitest";
import { endMatchBlockReason, isMatchOver, matchPagePath } from "../endMatch";

const ready = { sceneCategory: "roleplay" as const, openTurn: false, storyAt: "2000-01-01T08:30:00" };

describe("endMatchBlockReason", () => {
  it("allows ending a roleplay scene with no open turn and a set clock", () => {
    expect(endMatchBlockReason(ready)).toBeNull();
  });

  it("battle scene asks to change scene first", () => {
    expect(endMatchBlockReason({ ...ready, sceneCategory: "battle" })).toBe(
      "Encerre o combate antes (troque de cena).",
    );
  });

  it("open turn asks to close it first", () => {
    expect(endMatchBlockReason({ ...ready, openTurn: true })).toBe("Feche o turno aberto antes.");
  });

  it("unset clock asks to set the time first", () => {
    expect(endMatchBlockReason({ ...ready, storyAt: null })).toBe("Defina a hora da partida antes.");
    expect(endMatchBlockReason({ ...ready, storyAt: undefined })).toBe("Defina a hora da partida antes.");
  });

  it("battle wins over the other reasons", () => {
    expect(endMatchBlockReason({ sceneCategory: "battle", openTurn: true, storyAt: null })).toBe(
      "Encerre o combate antes (troque de cena).",
    );
  });
});

describe("matchPagePath", () => {
  it("points at the match page of the campaign", () => {
    expect(matchPagePath("c1", "m1")).toBe("/campaigns/c1/matches/m1");
  });
});

describe("isMatchOver", () => {
  const live = { matchEnded: null, status: "connected" as const, lastError: null };
  const ended = { matchId: "m1", storyAt: "2000-01-03T18:00:00", gameEndAt: "2026-11-08T22:14:05Z" };

  it("is false while the table is live", () => {
    expect(isMatchOver(live)).toBe(false);
    expect(isMatchOver({ ...live, lastError: { code: "clock_not_set", message: "", at: 1 } })).toBe(false);
  });

  it("is true on match_ended, on close 4002 and on a match_already_ended refusal", () => {
    expect(isMatchOver({ ...live, matchEnded: ended })).toBe(true);
    expect(isMatchOver({ ...live, status: "ended" })).toBe(true);
    expect(isMatchOver({ ...live, lastError: { code: "match_already_ended", message: "", at: 1 } })).toBe(true);
  });
});
