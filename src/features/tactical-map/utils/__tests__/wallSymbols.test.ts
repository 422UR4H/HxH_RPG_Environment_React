import { describe, it, expect } from "vitest";
import { doorArcWorld, windowTicksWorld } from "../wallSymbols";
import { applyTransform, inverseTransform } from "../coords";
import type { GridShape } from "../../../../types/tacticalMap";

const grid = (over: Partial<GridShape> = {}): GridShape => ({
  kind: "square",
  cols: 10,
  rows: 10,
  cellSize: 40,
  skewRatio: 1,
  rotation: 0,
  color: "#000",
  opacity: 1,
  lineStyle: "solid",
  ...over,
});

const iso = grid({ rotation: 45, skewRatio: 0.5 });
const P1: [number, number] = [80, 120];
const P2: [number, number] = [160, 120]; // 80 de comprimento LOCAL

describe("doorArcWorld", () => {
  it("grade plana: pontos a distância r de a1, da parede até +90°", () => {
    const g = grid();
    const vpScale = 1;
    const arc = doorArcWorld(P1, P2, g, vpScale);
    const a1 = applyTransform({ x: P1[0], y: P1[1] }, g);
    const r = 20; // min(0.85*80, 20/1)
    expect(arc.length).toBeGreaterThan(8);
    for (const p of arc) expect(Math.hypot(p.x - a1.x, p.y - a1.y)).toBeCloseTo(r, 6);
    expect(arc[0].x).toBeCloseTo(a1.x + r, 6);
    expect(arc[0].y).toBeCloseTo(a1.y, 6);
    const last = arc[arc.length - 1];
    expect(last.x).toBeCloseTo(a1.x, 6);
    expect(last.y).toBeCloseTo(a1.y + r, 6);
  });

  it("grade isométrica: pontos voltam ao chão à mesma distância LOCAL de p1; em WORLD não é círculo", () => {
    const arc = doorArcWorld(P1, P2, iso, 1);
    const a1 = applyTransform({ x: P1[0], y: P1[1] }, iso);
    const locals = arc.map((p) => inverseTransform(p, iso));
    const d0 = Math.hypot(locals[0].x - P1[0], locals[0].y - P1[1]);
    expect(d0).toBeGreaterThan(0);
    for (const l of locals) expect(Math.hypot(l.x - P1[0], l.y - P1[1])).toBeCloseTo(d0, 6);
    const dists = arc.map((p) => Math.hypot(p.x - a1.x, p.y - a1.y));
    expect(Math.max(...dists) - Math.min(...dists)).toBeGreaterThan(1);
  });

  it("parede degenerada devolve nada", () => {
    expect(doorArcWorld(P1, P1, iso, 1)).toEqual([]);
  });
});

describe("windowTicksWorld", () => {
  it("grade isométrica: tracinhos perpendiculares à parede em LOCAL, cruzando em 1/3 e 2/3", () => {
    const p1: [number, number] = [80, 120];
    const p2: [number, number] = [140, 180];
    const ticks = windowTicksWorld(p1, p2, iso, 1);
    expect(ticks).toHaveLength(2);
    const wx = p2[0] - p1[0], wy = p2[1] - p1[1];
    ticks.forEach((tick, i) => {
      expect(tick).toHaveLength(2);
      const [a, b] = tick.map((p) => inverseTransform(p, iso));
      const dot = (b.x - a.x) * wx + (b.y - a.y) * wy;
      expect(dot).toBeCloseTo(0, 6);
      const t = (i + 1) / 3;
      expect((a.x + b.x) / 2).toBeCloseTo(p1[0] + t * wx, 6);
      expect((a.y + b.y) / 2).toBeCloseTo(p1[1] + t * wy, 6);
    });
  });

  it("parede degenerada devolve nada", () => {
    expect(windowTicksWorld(P1, P1, iso, 1)).toEqual([]);
  });
});
