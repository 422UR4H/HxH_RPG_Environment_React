import { describe, it, expect } from "vitest";
import { createEmptySpiritualAttributes } from "../factories/attribute.factory";
import { createEmptySpiritualSkills } from "../factories/skill.factory";
import { distributeAttributes } from "../utils/distribute";
import type { CharacterClass } from "../../../types/characterClass";

describe("spiritual factories", () => {
  it("creates exactly the Flame and Conscience attributes", () => {
    expect(Object.keys(createEmptySpiritualAttributes())).toEqual(["flame", "conscience"]);
  });

  it("creates exactly the six spiritual skills", () => {
    expect(Object.keys(createEmptySpiritualSkills()).sort()).toEqual(
      ["aop", "coa", "focus", "mop", "selfKnowledge", "willPower"].sort(),
    );
  });

  it("distributes spiritual attributes over flame and conscience", () => {
    const charClass = {
      profile: { name: "T", alignment: "", description: "", briefDescription: "" },
      distribution: undefined,
      skills: {},
      jointSkills: {},
      proficiencies: {},
      jointProficiencies: [],
      attributes: {},
      abilities: {},
      indicatedCategories: [],
    } as CharacterClass;
    expect(Object.keys(distributeAttributes("spiritual", charClass))).toEqual(["flame", "conscience"]);
  });
});
