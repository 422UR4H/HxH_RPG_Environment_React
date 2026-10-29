import { describe, it, expect } from "vitest";
import { camelCaseSegments } from "../camelCaseSegments";

describe("camelCaseSegments", () => {
  it("splits between a lowercase letter and the next uppercase one", () => {
    expect(camelCaseSegments("ThrowingDagger")).toEqual(["Throwing", "Dagger"]);
    expect(camelCaseSegments("WeaponsMaster")).toEqual(["Weapons", "Master"]);
    expect(camelCaseSegments("OneTwoThree")).toEqual(["One", "Two", "Three"]);
  });

  it("leaves labels without internal capitals in one piece", () => {
    expect(camelCaseSegments("Bow")).toEqual(["Bow"]);
    expect(camelCaseSegments("Escolher…")).toEqual(["Escolher…"]);
    expect(camelCaseSegments("Lawful Good")).toEqual(["Lawful Good"]);
    expect(camelCaseSegments("")).toEqual([""]);
  });

  it("does not split runs of capitals or accented lowercase followed by lowercase", () => {
    expect(camelCaseSegments("HP")).toEqual(["HP"]);
    expect(camelCaseSegments("Março")).toEqual(["Março"]);
  });
});
