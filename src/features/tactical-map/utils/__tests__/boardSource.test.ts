import { describe, it, expect } from "vitest";
import { visibleBoardPieces } from "../boardSource";

const ws = ["own-piece"];
const rest = ["own-piece", "enemy-across-the-map", "enemy-behind-a-wall"];

describe("visibleBoardPieces", () => {
  it("shows a player nothing until the WebSocket has spoken", () => {
    // The REST map carries every piece on the board: it masks secret doors and drops
    // invisible pieces, but never applies line of sight. Falling back to it would tell
    // the player where every character is standing.
    expect(visibleBoardPieces(null, rest, false)).toEqual([]);
  });

  it("uses the WebSocket set for a player once it arrives", () => {
    expect(visibleBoardPieces(ws, rest, false)).toEqual(ws);
  });

  it("lets the master fall back to the REST board", () => {
    // The master is entitled to the whole map, so the unfiltered payload is correct
    // for them — and it is what fills the screen before the first WS push.
    expect(visibleBoardPieces(null, rest, true)).toEqual(rest);
  });

  it("still prefers the WebSocket set for the master", () => {
    expect(visibleBoardPieces(ws, rest, true)).toEqual(ws);
  });

  it("survives a missing REST map", () => {
    expect(visibleBoardPieces(null, undefined, true)).toEqual([]);
    expect(visibleBoardPieces(null, undefined, false)).toEqual([]);
  });

  it("treats an empty WebSocket set as authoritative, not as absent", () => {
    // A player who genuinely sees nothing must get an empty board, not the REST one.
    // This is why the check is `fromWebSocket === null`, not falsy.
    expect(visibleBoardPieces([], rest, false)).toEqual([]);
    expect(visibleBoardPieces([], rest, true)).toEqual([]);
  });
});
