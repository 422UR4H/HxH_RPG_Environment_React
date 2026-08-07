import { describe, it, expect } from "vitest";
import {
  drawFog,
  drawLosMask,
  FOG_ALPHA,
  FOG_PADDING,
  type FogDrawTarget,
} from "../fogDraw";
import type { GridShape, VisibilityPolygon } from "../../../../types/tacticalMap";
import realPayload from "./fixtures/realFogPayload.json";

type Payload = {
  visible_polygons: Array<Array<{ x: number; y: number }>>;
  grid: { cols: number; rows: number; cell_size: number; skew_ratio: number };
};
const payload = realPayload as unknown as Payload;

const grid: GridShape = {
  kind: "square",
  cols: payload.grid.cols,
  rows: payload.grid.rows,
  cellSize: payload.grid.cell_size,
  skewRatio: payload.grid.skew_ratio,
  rotation: 0,
} as GridShape;

const polys: VisibilityPolygon[] = payload.visible_polygons.map((p) =>
  p.map((pt) => [pt.x, pt.y] as [number, number]),
);

type Call =
  | { op: "clear" }
  | { op: "moveTo" | "lineTo"; x: number; y: number }
  | { op: "closePath" }
  | { op: "fill"; style: { color: number; alpha?: number } }
  | { op: "stroke"; style: { color: number; alpha?: number; width: number } };

function recorder() {
  const calls: Call[] = [];
  const g: FogDrawTarget = {
    clear: () => calls.push({ op: "clear" }),
    moveTo: (x, y) => calls.push({ op: "moveTo", x, y }),
    lineTo: (x, y) => calls.push({ op: "lineTo", x, y }),
    closePath: () => calls.push({ op: "closePath" }),
    // The whole style object is kept, not just its fields: asserting on its exact
    // keys is what catches someone reintroducing a blend mode.
    fill: (s) => calls.push({ op: "fill", style: s }),
    stroke: (s) => calls.push({ op: "stroke", style: s }),
  };
  return { g, calls };
}

const points = (calls: Call[]) =>
  calls.filter((c): c is Extract<Call, { x: number }> => c.op === "moveTo" || c.op === "lineTo");

const fillsOf = (calls: Call[]) =>
  calls.filter((c): c is Extract<Call, { op: "fill" }> => c.op === "fill");

const strokesOf = (calls: Call[]) =>
  calls.filter((c): c is Extract<Call, { op: "stroke" }> => c.op === "stroke");

describe("drawLosMask", () => {
  it("draws one subpath per polygon and fills exactly once, fully opaque", () => {
    const { g, calls } = recorder();
    drawLosMask(g, polys);

    expect(calls.filter((c) => c.op === "closePath").length).toBe(polys.length);
    expect(calls.filter((c) => c.op === "moveTo").length).toBe(polys.length);

    const fills = fillsOf(calls);
    expect(fills.length).toBe(1);
    expect(fills[0].style.alpha).toBe(1);
  });

  it("emits every polygon vertex, untransformed", () => {
    const { g, calls } = recorder();
    drawLosMask(g, polys);

    const total = polys.reduce((n, p) => n + p.length, 0);
    expect(points(calls).length).toBe(total);
    // First vertex must be passed through verbatim: polygons already arrive in world
    // space, so applying the grid transform to them would be a bug.
    expect(points(calls)[0].x).toBe(polys[0][0][0]);
    expect(points(calls)[0].y).toBe(polys[0][0][1]);
  });

  it("keeps the whole polygon inside the board", () => {
    // Regression guard: before BoundaryLOSWalls the sweep produced a 7505x9734
    // polygon on a 3360x3360 board, which lit up the entire screen.
    const { g, calls } = recorder();
    drawLosMask(g, polys);

    const w = grid.cols * grid.cellSize;
    const h = grid.rows * grid.cellSize;
    for (const p of points(calls)) {
      expect(p.x).toBeGreaterThanOrEqual(-1);
      expect(p.x).toBeLessThanOrEqual(w + 1);
      expect(p.y).toBeGreaterThanOrEqual(-1);
      expect(p.y).toBeLessThanOrEqual(h + 1);
    }
  });

  it("encloses a real area — the player can actually see something", () => {
    const { g, calls } = recorder();
    drawLosMask(g, polys);
    const pts = points(calls);

    let area = 0; // shoelace over the first polygon
    const n = polys[0].length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      area += pts[j].x * pts[i].y - pts[i].x * pts[j].y;
    }
    expect(Math.abs(area) / 2).toBeGreaterThan(0);
  });

  it("draws nothing at all when there is no line of sight", () => {
    const { g, calls } = recorder();
    drawLosMask(g, []);
    expect(calls.filter((c) => c.op === "fill").length).toBe(0);
  });

  it("skips degenerate polygons with fewer than three vertices", () => {
    const { g, calls } = recorder();
    drawLosMask(g, [[[0, 0], [10, 10]]]);
    expect(calls.filter((c) => c.op === "fill").length).toBe(0);
    expect(calls.filter((c) => c.op === "closePath").length).toBe(0);
  });

  it("does not grow the mask unless a dilation is asked for", () => {
    // The fog's own mask must stay exact. Growing it would clear a sliver of floor
    // beyond a blocking wall and leak what stands behind it.
    const { g, calls } = recorder();
    drawLosMask(g, polys);
    expect(strokesOf(calls).length).toBe(0);
  });

  it("grows the mask by stroking it, so a wall on the boundary lands inside", () => {
    // A vision-blocking wall lies exactly ON the polygon edge, so an exact mask cuts
    // its stroke down the middle. A centred stroke of width 2*d grows the covered
    // region by d on the outside, which is what pulls the whole wall into the lit pass.
    const { g, calls } = recorder();
    drawLosMask(g, polys, 3);

    const strokes = strokesOf(calls);
    expect(strokes.length).toBe(1);
    expect(strokes[0].style.width).toBe(6);
    // Opaque, like the fill: the stencil only records coverage, but a translucent
    // style would still have to be tessellated, and it reads as if it meant something.
    expect(strokes[0].style.alpha).toBe(1);
  });

  it("never strokes a mask it did not fill", () => {
    const { g, calls } = recorder();
    drawLosMask(g, [], 3);
    expect(strokesOf(calls).length).toBe(0);
    expect(fillsOf(calls).length).toBe(0);
  });
});

describe("drawFog", () => {
  const w = grid.cols * grid.cellSize;
  const h = grid.rows * grid.cellSize;

  it("paints one single region at one single alpha", () => {
    const { g, calls } = recorder();
    drawFog(g, w, h);

    const fills = fillsOf(calls);
    expect(fills.length).toBe(1);
    expect(fills[0].style.alpha).toBe(FOG_ALPHA);
    // Exactly these keys: a blendMode slipping into the fill is the phase 10-D bug.
    expect(Object.keys(fills[0].style).sort()).toEqual(["alpha", "color"]);
    // One rectangle: there is no per-cell painting any more.
    expect(calls.filter((c) => c.op === "closePath").length).toBe(1);
  });

  it("pads the fog well beyond the board so panning never exposes a bare edge", () => {
    const { g, calls } = recorder();
    drawFog(g, w, h);

    const pts = points(calls);
    const minX = pts.reduce((m, p) => Math.min(m, p.x), Infinity);
    const maxX = pts.reduce((m, p) => Math.max(m, p.x), -Infinity);
    const minY = pts.reduce((m, p) => Math.min(m, p.y), Infinity);
    const maxY = pts.reduce((m, p) => Math.max(m, p.y), -Infinity);
    expect(minX).toBeLessThanOrEqual(-FOG_PADDING);
    expect(maxX).toBeGreaterThanOrEqual(w + FOG_PADDING);
    expect(minY).toBeLessThanOrEqual(-FOG_PADDING);
    expect(maxY).toBeGreaterThanOrEqual(h + FOG_PADDING);
  });

  it("clears before drawing so repeated frames do not accumulate geometry", () => {
    const { g, calls } = recorder();
    drawFog(g, w, h);
    expect(calls[0].op).toBe("clear");
  });
});
