import { describe, it, expect } from "vitest";
import { actorWallVerbs, masterWallVerbs } from "../wallVerbs";
import type { WallSegment } from "../../../../types/tacticalMap";

const wall = (over: Partial<WallSegment> = {}): WallSegment => ({
  id: "w", p1: [0, 0], p2: [40, 0], wallType: "door", material: "wood", move: true, sense: "full",
  direction: "both", open: false, locked: false, hp: 10, maxHp: 10, resistance: 0, destroyed: false,
  ...over,
} as WallSegment);

describe("actorWallVerbs", () => {
  it("a closed door opens first, then can be attacked", () => {
    expect(actorWallVerbs(wall())).toEqual(["open", "attack"]);
  });
  it("an open window closes", () => {
    expect(actorWallVerbs(wall({ wallType: "window", open: true }))).toEqual(["close", "attack"]);
  });
  it("a locked door is lockpicked, a locked window has nothing but the attack", () => {
    expect(actorWallVerbs(wall({ locked: true }))).toEqual(["lockpick", "attack"]);
    expect(actorWallVerbs(wall({ wallType: "window", locked: true }))).toEqual(["attack"]);
  });
  it("a plain wall is only attacked — the indestructible too (it just takes no damage)", () => {
    expect(actorWallVerbs(wall({ wallType: "wall" }))).toEqual(["attack"]);
    expect(actorWallVerbs(wall({ wallType: "wall", maxHp: 0 }))).toEqual(["attack"]);
  });
  it("a revealed secret door is a door; a hidden one is a wall", () => {
    expect(actorWallVerbs(wall({ wallType: "secret_door", revealed: true }))).toEqual(["open", "attack"]);
    expect(actorWallVerbs(wall({ wallType: "secret_door", revealed: true, locked: true }))).toEqual(["lockpick", "attack"]);
    expect(actorWallVerbs(wall({ wallType: "secret_door" }))).toEqual(["attack"]);
  });
  it("terrain and destroyed walls have no verb", () => {
    expect(actorWallVerbs(wall({ wallType: "terrain" }))).toEqual([]);
    expect(actorWallVerbs(wall({ destroyed: true }))).toEqual([]);
  });
});

describe("masterWallVerbs", () => {
  it("opens or closes a passage, locked or not, locks or unlocks it, and destroys it", () => {
    expect(masterWallVerbs(wall({ locked: true }))).toEqual(["open", "unlock", "destroy"]);
    expect(masterWallVerbs(wall({ wallType: "window", open: true }))).toEqual(["close", "lock", "destroy"]);
  });
  it("reveals a secret door until it is revealed", () => {
    expect(masterWallVerbs(wall({ wallType: "secret_door" }))).toEqual(["open", "lock", "reveal", "destroy"]);
    expect(masterWallVerbs(wall({ wallType: "secret_door", revealed: true, open: true }))).toEqual(["close", "lock", "destroy"]);
  });
  it("destroys any wall still standing — the indestructible and terrain too; nothing on rubble", () => {
    expect(masterWallVerbs(wall({ wallType: "wall", maxHp: 0 }))).toEqual(["destroy"]);
    expect(masterWallVerbs(wall({ wallType: "terrain" }))).toEqual(["destroy"]);
    expect(masterWallVerbs(wall({ destroyed: true }))).toEqual([]);
  });
});
