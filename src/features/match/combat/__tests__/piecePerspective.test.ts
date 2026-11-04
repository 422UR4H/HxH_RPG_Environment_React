import { describe, it, expect } from "vitest";
import { boardThroughPiece, maskSecretDoor } from "../piecePerspective";
import type { Piece, PieceView, WallSegment } from "../../../../types/tacticalMap";

const wall = (over: Partial<WallSegment> = {}): WallSegment => ({
  id: "w1", p1: [0, 0], p2: [1, 0], wallType: "wall", material: "stone",
  move: true, sense: "full", direction: "both", open: false, locked: false,
  hp: 10, maxHp: 10, resistance: 2, destroyed: false,
  ...over,
});

const piece = (id: string): Piece => ({
  id, characterId: `char-${id}`, coord: { slot: { kind: "square", col: 0, row: 0 }, z: 0 }, visible: true,
});

const view = (over: Partial<PieceView> = {}): PieceView => ({
  pieceId: "p1",
  visiblePolygons: [[[0, 0], [10, 0], [10, 10]]],
  wallIds: [],
  pieceIds: [],
  ...over,
});

describe("maskSecretDoor", () => {
  it("masks an unrevealed secret door as a plain wall, keeping the combat fields", () => {
    const door = wall({
      id: "sd", wallType: "secret_door", doorSubtype: "double", windowSubtype: "barred",
      open: true, locked: true, material: "iron", hp: 7, maxHp: 9, resistance: 3, revealed: false,
    });
    const masked = maskSecretDoor(door);
    expect(masked.wallType).toBe("wall");
    expect(masked.doorSubtype).toBeUndefined();
    expect(masked.windowSubtype).toBeUndefined();
    expect(masked.open).toBe(false);
    expect(masked.locked).toBe(false);
    expect(masked).toMatchObject({
      id: "sd", p1: [0, 0], p2: [1, 0], material: "iron", hp: 7, maxHp: 9, resistance: 3,
      move: true, sense: "full", direction: "both", destroyed: false,
    });
  });

  it("returns a revealed secret door untouched", () => {
    const door = wall({ wallType: "secret_door", open: true, revealed: true });
    expect(maskSecretDoor(door)).toBe(door);
  });

  it("returns any other wall untouched", () => {
    const door = wall({ wallType: "door", doorSubtype: "basic", open: true, locked: true });
    expect(maskSecretDoor(door)).toBe(door);
  });
});

describe("boardThroughPiece", () => {
  it("keeps only the walls and pieces the view lists", () => {
    const walls = [wall({ id: "w1" }), wall({ id: "w2" }), wall({ id: "w3" })];
    const pieces = [piece("p1"), piece("p2"), piece("p3")];
    const out = boardThroughPiece(walls, pieces, view({ wallIds: ["w1", "w3"], pieceIds: ["p1", "p2"] }), "explored");
    expect(out.walls.map((w) => w.id)).toEqual(["w1", "w3"]);
    expect(out.pieces.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("masks an unrevealed secret door in sight and leaves a revealed one as it is", () => {
    const hidden = wall({ id: "hidden", wallType: "secret_door", open: true, revealed: false });
    const shown = wall({ id: "shown", wallType: "secret_door", open: true, revealed: true });
    const out = boardThroughPiece([hidden, shown], [], view({ wallIds: ["hidden", "shown"] }), "live");
    expect(out.walls[0]).toMatchObject({ id: "hidden", wallType: "wall", open: false });
    expect(out.walls[1]).toBe(shown);
  });

  it("builds the fog from the view's polygons and the given mode", () => {
    const v = view();
    const out = boardThroughPiece([], [], v, "live");
    expect(out.fog).toEqual({ fogMode: "live", visiblePolygons: v.visiblePolygons });
  });
});
