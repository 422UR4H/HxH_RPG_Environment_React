import TacticalMapEditor from "../features/tactical-map/TacticalMapEditor";
import type { TacticalMap } from "../types/tacticalMap";

const demoMap: TacticalMap = {
  id: "demo-map",
  campaignId: "demo-campaign",
  name: "Demo — Walking Skeleton",
  description: "Smoke test: grade 10×10 + 2 peças + bg fictícia",
  grid: {
    kind: "square",
    cols: 10,
    rows: 10,
    cellSize: 50,
    skewRatio: 1,
    rotation: 0,
    color: "#888888",
    opacity: 1,
    lineStyle: "solid",
  },
  bg: {
    url: "https://placehold.co/500x500/0b1a3a/ffffff?text=BG",
    x: 0,
    y: 0,
    width: 500,
    height: 500,
    rotation: 0,
    opacity: 0.6,
  },
  pieces: [
    {
      id: "piece-1",
      characterId: "char-1",
      coord: { slot: { kind: "square", col: 2, row: 2 }, z: 0 },
      visible: true,
    },
    {
      id: "piece-2",
      characterId: "char-2",
      coord: { slot: { kind: "square", col: 6, row: 5 }, z: 2 },
      visible: true,
    },
  ],
  walls: [],
  decorations: [],
  items: [],
  createdAt: "2026-05-31T00:00:00Z",
  updatedAt: "2026-05-31T00:00:00Z",
};

export default function TacticalMapDemoPage() {
  return (
    <div style={{ width: "100vw", height: "100vh", margin: 0, overflow: "hidden" }}>
      <TacticalMapEditor map={demoMap} width={window.innerWidth} height={window.innerHeight} />
    </div>
  );
}
