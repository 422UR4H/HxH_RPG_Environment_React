import { useCallback } from "react";
import type { CharacterClass } from "../../../types/characterClass";
import {
  distributeAbilities,
  distributeAttributes,
  distributeJointProficiencies,
  distributeProficiencies,
  distributeSkills,
} from "../utils/distribute";
import type { CharacterSheet } from "../../../types/characterSheet";

export function useCharSheetBuilder() {
  const buildFromClass = useCallback(
    (charClass: CharacterClass, sheet?: CharacterSheet) => {
      return {
        ...sheet,
        abilities: distributeAbilities(charClass),
        physicalAttributes: distributeAttributes(
          "physical",
          charClass,
          sheet?.physicalAttributes
        ),
        mentalAttributes: distributeAttributes(
          "mental",
          charClass,
          sheet?.mentalAttributes
        ),
        spiritualAttributes: distributeAttributes(
          "spiritual",
          charClass,
          sheet?.spiritualAttributes
        ),
        physicalSkills: distributeSkills("physical", charClass),
        spiritualSkills: distributeSkills("spiritual", charClass),
        commonProficiencies: distributeProficiencies(charClass),
        jointProficiencies: distributeJointProficiencies(charClass),
      };
    },
    []
  );
  return { buildFromClass };
}
