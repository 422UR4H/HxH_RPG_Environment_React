import type {
  Proficiency,
  JointProficiency,
} from "../../../types/characterSheet";

export function createEmptyProficiency(): Proficiency {
  return {
    level: 0,
  };
}

export function createEmptyJointProficiency(): JointProficiency {
  return {
    level: 0,
    name: "",
  };
}

export function createEmptyCommonProficiencies(): Record<string, Proficiency> {
  return {};
}

// CharacterSheet.jointProficiencies is a Record<string, JointProficiency> —
// it mirrors the backend's map[string]JointProficiencyResponse shape (keyed
// by proficiency name). This is a different concept from
// CharacterClass.jointProficiencies (an array of slot definitions used by
// the distribution step below) which stays an array on purpose.
export function createEmptyJointProficiencies(): Record<string, JointProficiency> {
  return {};
}
