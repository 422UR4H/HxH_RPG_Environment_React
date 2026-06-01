import type { TacticalMap } from "../../types/tacticalMap";

export const DEFAULT_GRID: TacticalMap["grid"] = {
  kind: "square",
  cols: 10,
  rows: 10,
  cellSize: 40,
  skewRatio: 1,
  rotation: 0,
  color: "#4a90a4",
  opacity: 0.6,
  lineStyle: "solid",
};

export const DEFAULT_MAP_FIELDS: Omit<
  TacticalMap,
  "id" | "campaignId" | "createdAt" | "updatedAt"
> = {
  name: "",
  description: "",
  grid: DEFAULT_GRID,
  bg: null,
  pieces: [],
  walls: [],
  decorations: [],
  items: [],
};
