import { describe, it, expect } from "vitest";
import { distributeAttributes, distributeProficiencies } from "../utils/distribute";
import type { CharacterClass } from "../../../types/characterClass";

function makeClass(proficiencies: Record<string, { exp: number; level: number }>): CharacterClass {
  return {
    profile: { name: "Test", alignment: "", description: "", briefDescription: "" },
    distribution: undefined,
    skills: {},
    jointSkills: {},
    proficiencies,
    jointProficiencies: [],
    attributes: {},
    abilities: {},
    indicatedCategories: [],
  };
}

describe("distributeAttributes", () => {
  it("always sets all attribute points to 0", () => {
    const charClass = makeClass({});
    const result = distributeAttributes("physical", charClass);
    Object.values(result).forEach((attr) => {
      expect(attr.points).toBe(0);
    });
  });

  it("returns the class base stats for every attribute in the type", () => {
    const charClass = makeClass({});
    const result = distributeAttributes("physical", charClass);
    // All 8 physical attributes must be present
    expect(Object.keys(result)).toHaveLength(8);
  });
});

describe("distributeProficiencies", () => {
  it("returns only the class fixed proficiencies", () => {
    const charClass = makeClass({ dagger: { exp: 127, level: 1 } });
    const result = distributeProficiencies(charClass);
    expect(Object.keys(result)).toEqual(["dagger"]);
    expect(result.dagger).toEqual({ exp: 127, level: 1 });
  });

  it("does not include distributable (user-selected) weapons from previous state", () => {
    // Classes without fixed profs (e.g. Mercenary) should return empty object
    const charClass = makeClass({});
    const result = distributeProficiencies(charClass);
    expect(result).toEqual({});
  });

  it("is not affected by the charSheet passed to buildFromClass — commonProficiencies is always reset", () => {
    const charClass = makeClass({ dagger: { exp: 127, level: 1 } });

    // Simulate a charSheet that has stale user-selected weapons in commonProficiencies
    const staleCommonProficiencies = {
      dagger: { exp: 127, level: 1 },
      ThrowingDagger: { exp: 127, level: 1 }, // user-selected from old session
      Bow: { exp: 127, level: 1 },             // user-selected from old session
    };

    // buildFromClass logic: distributeProficiencies(charClass) replaces commonProficiencies
    const nextCommonProficiencies = distributeProficiencies(charClass);

    // Stale selections must NOT appear in the rebuilt result
    expect(nextCommonProficiencies).not.toHaveProperty("ThrowingDagger");
    expect(nextCommonProficiencies).not.toHaveProperty("Bow");
    expect(nextCommonProficiencies).toHaveProperty("dagger");

    // The stale object itself is unchanged (pure function)
    expect(staleCommonProficiencies).toHaveProperty("ThrowingDagger");
  });
});
