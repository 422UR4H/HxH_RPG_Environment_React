import type { StatusBar } from "../../../types/characterSheet";

export function createEmptyStatusBar(): StatusBar {
  return {
    min: 0,
    current: 0,
    max: 0,
  };
}
