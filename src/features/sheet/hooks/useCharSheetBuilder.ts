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
        physicalAttributes: distributeAttributes("physical", charClass),
        mentalAttributes: distributeAttributes("mental", charClass),
        spiritualAttributes: distributeAttributes("spiritual", charClass),
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
