import type { CharacterSheet } from "../../../types/characterSheet.ts";
import { createEmptyStatusBar } from "./statusBar.factory.ts";
import { createEmptyProfile } from "./profile.factory.ts";
import { createEmptyCharacterExp } from "./characterExp.factory.ts";
import { createEmptyTalent } from "./talent.factory.ts";
import { createEmptyAbilities } from "./ability.factory.ts";
import {
  createEmptyPhysicalAttributes,
  createEmptyMentalAttributes,
  createEmptySpiritualAttributes,
} from "./attribute.factory.ts";
import {
  createEmptyPhysicalSkills,
  createEmptySpiritualSkills,
} from "./skill.factory.ts";
import { createEmptyPrinciples } from "./principle.factory.ts";
import { createEmptyCategories } from "./category.factory.ts";
import {
  createEmptyCommonProficiencies,
  createEmptyJointProficiencies,
} from "./proficiency.factory.ts";

export function createEmptyCharacterSheet(): CharacterSheet {
  return {
    uuid: "",
    characterClass: "",
    categoryName: "",
    profile: createEmptyProfile(),
    status: {
      health: createEmptyStatusBar(),
      stamina: createEmptyStatusBar(),
    },
    characterExp: createEmptyCharacterExp(),
    talent: createEmptyTalent(),
    abilities: createEmptyAbilities(),
    physicalAttributes: createEmptyPhysicalAttributes(),
    mentalAttributes: createEmptyMentalAttributes(),
    spiritualAttributes: createEmptySpiritualAttributes(),
    physicalSkills: createEmptyPhysicalSkills(),
    // No sheet UI surfaces mental skills yet (see the type's own comment in
    // src/types/characterSheet.ts) — kept as an empty stub so the field is
    // never silently dropped, not distributed from the class like the other
    // skill groups.
    mentalSkills: {},
    spiritualSkills: createEmptySpiritualSkills(),
    principles: createEmptyPrinciples(),
    categories: createEmptyCategories(),
    commonProficiencies: createEmptyCommonProficiencies(),
    jointProficiencies: createEmptyJointProficiencies(),
  };
}
