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

const wallLens = (p1: [number, number], p2: [number, number], g: GridShape) => {
  const a1 = applyTransform({ x: p1[0], y: p1[1] }, g);
  const a2 = applyTransform({ x: p2[0], y: p2[1] }, g);
  return {
    a1,
    lenLocal: Math.hypot(p2[0] - p1[0], p2[1] - p1[1]),
    lenWorld: Math.hypot(a2.x - a1.x, a2.y - a1.y),
  };
};

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

describe("doorArcWorld — raio, ângulo e ramos do min", () => {
  it("isométrica: primeiro ponto na direção da parede, último perpendicular, raio pela fórmula", () => {
    const p2: [number, number] = [150, 170];
    const vp = 1;
    const arc = doorArcWorld(P1, p2, iso, vp);
    const { lenLocal, lenWorld } = wallLens(P1, p2, iso);
    const wx = p2[0] - P1[0], wy = p2[1] - P1[1];
    const first = inverseTransform(arc[0], iso);
    const last = inverseTransform(arc[arc.length - 1], iso);
    const f = { x: first.x - P1[0], y: first.y - P1[1] };
    const l = { x: last.x - P1[0], y: last.y - P1[1] };
    expect(f.x * wy - f.y * wx).toBeCloseTo(0, 6);
    expect(f.x * wx + f.y * wy).toBeGreaterThan(0);
    expect(l.x * wx + l.y * wy).toBeCloseTo(0, 6);
    const d0 = Math.hypot(f.x, f.y);
    expect(Math.hypot(l.x, l.y)).toBeCloseTo(d0, 6);
    expect(d0).toBeCloseTo(Math.min(0.85, 20 / vp / lenWorld) * lenLocal, 6);
  });

  it("isométrica com vpScale 2: mesmo tamanho de tela ao longo da parede", () => {
    const p2: [number, number] = [150, 170];
    const vp = 2;
    const arc = doorArcWorld(P1, p2, iso, vp);
    const { a1, lenWorld } = wallLens(P1, p2, iso);
    expect(Math.hypot(arc[0].x - a1.x, arc[0].y - a1.y)).toBeCloseTo(Math.min(0.85 * lenWorld, 20 / vp), 6);
  });

  it("grade plana, parede diagonal: começa no ângulo da parede", () => {
    const g = grid();
    const p2: [number, number] = [P1[0] + 60, P1[1] + 60];
    const arc = doorArcWorld(P1, p2, g, 1);
    const a1 = applyTransform({ x: P1[0], y: P1[1] }, g);
    const ang = Math.atan2(arc[0].y - a1.y, arc[0].x - a1.x);
    expect(ang).toBeCloseTo(Math.atan2(60, 60), 6);
    const end = Math.atan2(arc[arc.length - 1].y - a1.y, arc[arc.length - 1].x - a1.x);
    expect(end).toBeCloseTo(Math.atan2(60, 60) + Math.PI / 2, 6);
  });

  it("grade plana, parede curta: vence o ramo de 0,85", () => {
    const g = grid();
    const p2: [number, number] = [P1[0] + 10, P1[1]];
    const arc = doorArcWorld(P1, p2, g, 1);
    const a1 = applyTransform({ x: P1[0], y: P1[1] }, g);
    expect(Math.hypot(arc[0].x - a1.x, arc[0].y - a1.y)).toBeCloseTo(8.5, 6);
  });

  it("isométrica, parede no eixo achatado: t chega a 0,85", () => {
    const p2: [number, number] = [P1[0] + 21.2132, P1[1] + 21.2132];
    const { lenLocal, lenWorld } = wallLens(P1, p2, iso);
    expect(20 / lenWorld).toBeGreaterThan(0.85);
    const first = inverseTransform(doorArcWorld(P1, p2, iso, 1)[0], iso);
    expect(Math.hypot(first.x - P1[0], first.y - P1[1])).toBeCloseTo(0.85 * lenLocal, 6);
  });
});

describe("windowTicksWorld — comprimento", () => {
  it("isométrica com vpScale 2: meio comprimento LOCAL = (5/vp)*lenLocal/lenWorld", () => {
    const p2: [number, number] = [140, 180];
    const vp = 2;
    const { lenLocal, lenWorld } = wallLens(P1, p2, iso);
    const [a, b] = windowTicksWorld(P1, p2, iso, vp)[0].map((p) => inverseTransform(p, iso));
    expect(Math.hypot(b.x - a.x, b.y - a.y) / 2).toBeCloseTo((5 / vp) * lenLocal / lenWorld, 6);
  });
});
