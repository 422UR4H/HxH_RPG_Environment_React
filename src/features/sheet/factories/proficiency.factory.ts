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

export function createEmptyJointProficiencies(): JointProficiency[] {
  return [];
}
