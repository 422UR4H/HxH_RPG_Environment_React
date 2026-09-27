// src/features/match/combat/__tests__/useLiveMapSync.test.ts
//
// F3 amendment (browser batch 2): handlePieceMoved/handlePieceRemoved are exercised
// directly here (no WS involved — useMatchWs.test.ts covers the wire parsing that feeds
// these positional args). The point under test: a piece_moved that omits
// characterId/visible/z must PATCH an already-known piece (keep what it had), not
// overwrite it with blanks/defaults — mirrors useLobbyWs's own contract
// (LobbyPage.tsx's handleWsPieceMoved), except this version also applies z/characterId/
// visible in place when the wire DOES carry them, since elevation matters in combat.
import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useLiveMapSync } from "../useLiveMapSync";

function setup() {
  return renderHook(() =>
    useLiveMapSync({ map: undefined, campaign: undefined, seedFromRest: false }),
  );
}

describe("useLiveMapSync handlePieceMoved/handlePieceRemoved", () => {
  it("inserts a new piece when the payload carries a characterId", () => {
    const { result } = setup();
    act(() => {
      result.current.handlePieceMoved(
        "p1",
        { kind: "square", col: 1, row: 1 },
        "c1",
        true,
        0,
      );
    });
    expect(result.current.livePieces).toEqual([
      { id: "p1", characterId: "c1", coord: { slot: { kind: "square", col: 1, row: 1 }, z: 0 }, visible: true },
    ]);
  });

  it("drops an unknown piece when the payload has no characterId to attach it to", () => {
    const { result } = setup();
    act(() => {
      result.current.handlePieceMoved("p1", { kind: "square", col: 1, row: 1 });
    });
    expect(result.current.livePieces).toBeNull();
  });

  // The exact case the coordinator asked for: a payload without characterId keeps the
  // old one on an already-known piece (only the slot moves).
  it("payload without characterId keeps the old one on an already-known piece", () => {
    const { result } = setup();
    act(() => {
      result.current.handlePieceMoved("p1", { kind: "square", col: 1, row: 1 }, "c1", true, 2);
    });
    act(() => {
      // Bare slot update — no characterId/visible/z, as a turn-open Move payload would be.
      result.current.handlePieceMoved("p1", { kind: "square", col: 9, row: 9 });
    });
    expect(result.current.livePieces).toEqual([
      { id: "p1", characterId: "c1", coord: { slot: { kind: "square", col: 9, row: 9 }, z: 2 }, visible: true },
    ]);
  });

  it("applies characterId/visible/z in place when the payload DOES carry them (unlike the lobby, elevation matters in combat)", () => {
    const { result } = setup();
    act(() => {
      result.current.handlePieceMoved("p1", { kind: "square", col: 1, row: 1 }, "c1", true, 0);
    });
    act(() => {
      result.current.handlePieceMoved("p1", { kind: "square", col: 2, row: 2 }, "c2", false, 3);
    });
    expect(result.current.livePieces).toEqual([
      { id: "p1", characterId: "c2", coord: { slot: { kind: "square", col: 2, row: 2 }, z: 3 }, visible: false },
    ]);
  });

  it("handlePieceRemoved drops the piece; no-op when livePieces is still null", () => {
    const { result } = setup();
    act(() => { result.current.handlePieceRemoved("ghost"); });
    expect(result.current.livePieces).toBeNull();

    act(() => {
      result.current.handlePieceMoved("p1", { kind: "square", col: 1, row: 1 }, "c1", true, 0);
    });
    act(() => { result.current.handlePieceRemoved("p1"); });
    expect(result.current.livePieces).toEqual([]);
  });
});
