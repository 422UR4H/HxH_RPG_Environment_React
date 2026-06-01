import type { TacticalMap } from "../../types/tacticalMap";

export const DEFAULT_GRID: TacticalMap["grid"] = {
  kind: "square",
  cols: 25,
  rows: 25,
  cellSize: 64,
  skewRatio: 1,
  rotation: 0,
  color: "#ffffff",
  opacity: 0.5,
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
