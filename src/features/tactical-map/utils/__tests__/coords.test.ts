import { describe, it, expect } from "vitest";
import {
  slotToWorld,
  worldToSlot,
  gridLocalBounds,
  gridHandleLocal,
  applyTransform,
  inverseTransform,
  gridFromHandleDrag,
  slotInradius,
  slotScreenInradius,
  stackOffsetToPx,
  isSameSlot,
  offsetToAxial,
  slotToTriple,
  tripleToSlot,
  polygonsToWorld,
  gridWorldBounds,
  gridWorldCorners,
  gridPivot,
  gridRotateHandleWorld,
  keepGridAnchored,
  skewHandlePair,
} from "../coords";
import type { GridShape } from "../../../../types/tacticalMap";
import { hexToPixel } from "../hex";

const squareGrid = (cellSize = 40): GridShape => ({
  kind: "square",
  cols: 10,
  rows: 10,
  cellSize,
  skewRatio: 1,
  rotation: 0,
  color: "#000",
  opacity: 1,
  lineStyle: "solid",
});

describe("coords — square (no skew, no rotation)", () => {
  it("slotToWorld returns the center of the slot", () => {
    const g = squareGrid(40);
    expect(slotToWorld({ kind: "square", col: 0, row: 0 }, g)).toEqual({ x: 20, y: 20 });
    expect(slotToWorld({ kind: "square", col: 1, row: 0 }, g)).toEqual({ x: 60, y: 20 });
    expect(slotToWorld({ kind: "square", col: 0, row: 2 }, g)).toEqual({ x: 20, y: 100 });
  });

  it("worldToSlot snaps a world point to its slot", () => {
    const g = squareGrid(40);
    expect(worldToSlot({ x: 20, y: 20 }, g)).toEqual({ kind: "square", col: 0, row: 0 });
    expect(worldToSlot({ x: 39.9, y: 0.1 }, g)).toEqual({ kind: "square", col: 0, row: 0 });
    expect(worldToSlot({ x: 40, y: 40 }, g)).toEqual({ kind: "square", col: 1, row: 1 });
    expect(worldToSlot({ x: 199, y: 79 }, g)).toEqual({ kind: "square", col: 4, row: 1 });
  });

  it("slotToWorld and worldToSlot are inverses on slot centers", () => {
    const g = squareGrid(50);
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 5; row++) {
        const world = slotToWorld({ kind: "square", col, row }, g);
        expect(worldToSlot(world, g)).toEqual({ kind: "square", col, row });
      }
    }
  });
});

const hexGrid = (cellSize = 10): GridShape => ({
  kind: "hex",
  cols: 10,
  rows: 10,
  cellSize,
  skewRatio: 1,
  rotation: 0,
  color: "#000",
  opacity: 1,
  lineStyle: "solid",
});

describe("coords — hex (no skew, no rotation)", () => {
  it("slotToWorld(hex 0,0) is the origin", () => {
    const g = hexGrid(10);
    expect(slotToWorld({ kind: "hex", q: 0, r: 0 }, g)).toEqual({ x: 0, y: 0 });
  });

  it("slotToWorld(hex q,r) matches hexToPixel with grid.cellSize as size", () => {
    const g = hexGrid(12);
    const samples = [
      { q: 1, r: 0 }, { q: 0, r: 1 }, { q: 2, r: -1 }, { q: -1, r: 2 },
    ];
    for (const s of samples) {
      expect(slotToWorld({ kind: "hex", ...s }, g)).toEqual(hexToPixel(s, 12));
    }
  });

  it("worldToSlot inverts slotToWorld on hex centers", () => {
    const g = hexGrid(15);
    for (let q = -3; q <= 3; q++) {
      for (let r = -3; r <= 3; r++) {
        const world = slotToWorld({ kind: "hex", q, r }, g);
        expect(worldToSlot(world, g)).toEqual({ kind: "hex", q, r });
      }
    }
  });
});

describe("gridLocalBounds + gridHandleLocal", () => {
  it("square: bounds tile from the origin", () => {
    const g = squareGrid(40); // 10×10
    expect(gridLocalBounds(g)).toEqual({ minX: 0, minY: 0, maxX: 400, maxY: 400 });
    expect(gridHandleLocal("BR", g)).toEqual({ x: 400, y: 400 });
    expect(gridHandleLocal("TC", g)).toEqual({ x: 200, y: 0 });
    expect(gridHandleLocal("center", g)).toEqual({ x: 200, y: 200 });
  });

  it("hex: bounds use hex pitch, not square geometry", () => {
    // cols=3, rows=3, cellSize=10. hexW=10√3≈17.3205, hexH=15.
    // maxCx = 2*hexW + hexW/2 (odd row exists) = 43.3013; minX=-hexW/2=-8.6603.
    // maxX = 43.3013 + hexW/2 = 51.9615. minY=-10; maxY=2*15+10=40.
    const g: GridShape = { ...hexGrid(10), cols: 3, rows: 3 };
    const b = gridLocalBounds(g);
    expect(b.minX).toBeCloseTo(-8.6603, 3);
    expect(b.maxX).toBeCloseTo(51.9615, 3);
    expect(b.minY).toBeCloseTo(-10, 6);
    expect(b.maxY).toBeCloseTo(40, 6);
    // every bound scales linearly with cellSize (the resize math depends on it)
    const g2: GridShape = { ...g, cellSize: 20 };
    const b2 = gridLocalBounds(g2);
    expect(b2.maxX).toBeCloseTo(b.maxX * 2, 6);
    expect(b2.maxY).toBeCloseTo(b.maxY * 2, 6);
  });
});

describe("grid origin (offset)", () => {
  it("applyTransform shifts the whole grid by origin; inverse undoes it", () => {
    const g: GridShape = { ...squareGrid(40), originX: 100, originY: -50 };
    // local (0,0): without origin maps to world (0,0); with origin → (100,-50).
    expect(applyTransform({ x: 0, y: 0 }, g)).toEqual({ x: 100, y: -50 });
    const round = inverseTransform(applyTransform({ x: 120, y: 80 }, g), g);
    expect(round.x).toBeCloseTo(120, 6);
    expect(round.y).toBeCloseTo(80, 6);
  });
});

describe("gridFromHandleDrag — resize anchors the opposite corner", () => {
  const g = squareGrid(40); // 10×10, cellSize 40 → BR at (400,400), TL at (0,0)

  it("dragging BR keeps TL fixed (origin stays 0), grows toward BR", () => {
    // Drag BR out to (600,600): scale = 1.5 → cellSize 60.
    const out = gridFromHandleDrag("BR", g, 600, 600, false)!;
    expect(out.cellSize).toBeCloseTo(60, 6);
    expect(out.originX ?? 0).toBeCloseTo(0, 6);
    expect(out.originY ?? 0).toBeCloseTo(0, 6);
    // TL still at world (0,0); BR now at (600,600).
    expect(applyTransform(gridHandleLocal("TL", out), out)).toEqual({ x: 0, y: 0 });
    const br = applyTransform(gridHandleLocal("BR", out), out);
    expect(br.x).toBeCloseTo(600, 6);
    expect(br.y).toBeCloseTo(600, 6);
  });

  it("dragging TL keeps BR fixed and grows toward the cursor (up-left)", () => {
    // Drag TL out to (-200,-200): anchor BR=(400,400). diagonal D0=(-400,-400);
    // cursor-anchor=(-600,-600); scale = (−600·−400 ×2)/(400²×2)=1.5 → cellSize 60.
    const out = gridFromHandleDrag("TL", g, -200, -200, false)!;
    expect(out.cellSize).toBeCloseTo(60, 6);
    // BR must stay pinned at (400,400).
    const br = applyTransform(gridHandleLocal("BR", out), out);
    expect(br.x).toBeCloseTo(400, 6);
    expect(br.y).toBeCloseTo(400, 6);
    // TL moved up-left of origin: 400 - 600 = -200.
    const tl = applyTransform(gridHandleLocal("TL", out), out);
    expect(tl.x).toBeCloseTo(-200, 6);
    expect(tl.y).toBeCloseTo(-200, 6);
  });

  it("rotate handle sets rotation from the grid center", () => {
    const out = gridFromHandleDrag("rotate", g, 200, 0, false)!;
    expect(typeof out.rotation).toBe("number");
  });

  describe("rotate numa grade achatada e com origem", () => {
    const g: GridShape = { ...squareGrid(40), rotation: 45, skewRatio: 0.5, originX: 15, originY: -20 };
    const tc = applyTransform(gridHandleLocal("TC", g), g);
    const cx = (g.cols * g.cellSize) / 2 + 15;
    const cy = (g.rows * g.cellSize) / 2 - 20;

    it("cursor sobre a esfera (TC) mantém a rotação atual, sem pulo", () => {
      const out = gridFromHandleDrag("rotate", g, tc.x, tc.y, false)!;
      expect(out.rotation).toBeCloseTo(45, 6);
    });

    it("cursor mais longe no mesmo raio centro→TC mantém a rotação", () => {
      const out = gridFromHandleDrag("rotate", g, cx + (tc.x - cx) * 2.5, cy + (tc.y - cy) * 2.5, false)!;
      expect(out.rotation).toBeCloseTo(45, 6);
    });
  });
});

describe("gridFromHandleDrag — perspectiva (Shift + TC/BC)", () => {
  const iso: GridShape = { ...squareGrid(40), rotation: 45, skewRatio: 0.5, originX: 15, originY: -20 };

  it("cursor exatamente sobre a alça TC não faz a perspectiva pular", () => {
    const p = applyTransform(gridHandleLocal("TC", iso), iso);
    const out = gridFromHandleDrag("TC", iso, p.x, p.y, true)!;
    expect(out.skewRatio).toBeCloseTo(0.5, 6);
  });

  it("cursor exatamente sobre a alça BC não faz a perspectiva pular", () => {
    const p = applyTransform(gridHandleLocal("BC", iso), iso);
    const out = gridFromHandleDrag("BC", iso, p.x, p.y, true)!;
    expect(out.skewRatio).toBeCloseTo(0.5, 6);
  });

  it("a alça TC segue o cursor em y numa grade top-down", () => {
    const g = squareGrid(40); // pivô y = 200, ry da TC = -200
    const at = (y: number) => gridFromHandleDrag("TC", g, 0, y, true)!;
    const r1 = at(100);
    expect(r1.skewRatio).toBeCloseTo(0.5, 6);
    expect(applyTransform(gridHandleLocal("TC", r1), r1).y).toBeCloseTo(100, 6);
    const r2 = at(50);
    expect(r2.skewRatio).toBeCloseTo(0.75, 6);
    expect(applyTransform(gridHandleLocal("TC", r2), r2).y).toBeCloseTo(50, 6);
    expect(at(-100).skewRatio).toBe(1);
    expect(at(190).skewRatio).toBe(0.3);
  });

  it("Shift+TC em 90° não achata: cai no redimensionamento normal (ML/MR é o par)", () => {
    // rotação 90: ry da TC ≈ 0 (e da ML = -200) → o par que achata é ML/MR.
    // TC com Shift redimensiona: devolve grade com skewRatio intacto e cellSize novo.
    // Em 90° a TC está em (400,200) e a âncora BC em (0,200): o cursor em (200,0) projeta na
    // metade da diagonal → cellSize 40 → 20.
    const g: GridShape = { ...squareGrid(40), rotation: 90 };
    const out = gridFromHandleDrag("TC", g, 200, 0, true)!;
    expect(out.skewRatio).toBe(1);
    expect(out.cellSize).toBeCloseTo(20, 6);
  });
});

describe("skewHandlePair / Shift + ML/MR", () => {
  it("rotação 0: par TC/BC (comportamento atual)", () => {
    expect(skewHandlePair(squareGrid(40))).toBe("TC/BC");
  });

  it("rotação 90: par ML/MR; 45° empata e fica com TC/BC", () => {
    expect(skewHandlePair({ ...squareGrid(40), rotation: 90 })).toBe("ML/MR");
    expect(skewHandlePair({ ...squareGrid(40), rotation: -90 })).toBe("ML/MR");
    expect(skewHandlePair({ ...squareGrid(40), rotation: 45 })).toBe("TC/BC");
  });

  // O par depende só do ângulo, não da proporção da grade: |cos θ| >= |sin θ| → TC/BC.
  it("só o ângulo decide: 30×10 em 20° é TC/BC, hex 10×10 em 45° é TC/BC", () => {
    const wide: GridShape = { ...squareGrid(40), cols: 30, rows: 10, rotation: 20 };
    expect(skewHandlePair(wide)).toBe("TC/BC");
    const hex: GridShape = { ...squareGrid(40), kind: "hex", rotation: 45 };
    expect(skewHandlePair(hex)).toBe("TC/BC");
    for (const r of [45, -45, 135, -135]) {
      expect(skewHandlePair({ ...wide, rotation: r })).toBe("TC/BC");
    }
  });

  it("qualquer grade em 90° usa ML/MR", () => {
    for (const g of [
      { ...squareGrid(40), cols: 30, rows: 10 },
      { ...squareGrid(40), cols: 5, rows: 40 },
      { ...squareGrid(40), kind: "hex" as const },
    ]) {
      expect(skewHandlePair({ ...g, rotation: 90 })).toBe("ML/MR");
      expect(skewHandlePair({ ...g, rotation: -90 })).toBe("ML/MR");
    }
    expect(skewHandlePair({ ...squareGrid(40), cols: 30, rows: 10, rotation: 50 })).toBe("ML/MR");
  });

  it("90° com skew 0,5: Shift+ML com cursor sobre a alça mantém o achatamento", () => {
    // pivô (200,200); ML local (0,200) → offset (-200,0); ry = -200·sin90 = -200.
    const g: GridShape = { ...squareGrid(40), rotation: 90, skewRatio: 0.5 };
    const p = applyTransform(gridHandleLocal("ML", g), g);
    const out = gridFromHandleDrag("ML", g, p.x, p.y, true)!;
    expect(out.skewRatio).toBeCloseTo(0.5, 6);
  });

  it("90°: a alça ML segue o cursor em y", () => {
    // sem achatar: y = 200 + ry·s = 200 - 200·s. Cursor y=100 → s=0,5; y=50 → s=0,75.
    const g: GridShape = { ...squareGrid(40), rotation: 90 };
    const r1 = gridFromHandleDrag("ML", g, 0, 100, true)!;
    expect(r1.skewRatio).toBeCloseTo(0.5, 6);
    expect(applyTransform(gridHandleLocal("ML", r1), r1).y).toBeCloseTo(100, 6);
    const r2 = gridFromHandleDrag("ML", g, 0, 50, true)!;
    expect(r2.skewRatio).toBeCloseTo(0.75, 6);
    // MR: ry = +200 → cursor y=300 → s=0,5.
    expect(gridFromHandleDrag("MR", g, 0, 300, true)!.skewRatio).toBeCloseTo(0.5, 6);
  });

  it("rotação 0: Shift+ML redimensiona normalmente (não achata)", () => {
    const g = squareGrid(40);
    const out = gridFromHandleDrag("ML", g, -200, 200, true)!;
    expect(out.skewRatio).toBe(1);
    expect(out.cellSize).not.toBe(40);
  });
});

describe("coords — skew + rotation", () => {
  it("default skew=1, rotation=0 leaves results unchanged", () => {
    // já coberto nos testes anteriores; aqui só re-afirmamos um caso
    const g = squareGrid(40);
    expect(slotToWorld({ kind: "square", col: 1, row: 1 }, g)).toEqual({ x: 60, y: 60 });
  });

  it("skewRatio < 1 squashes y relative to grid center (pivot)", () => {
    // Grid 10x10 cellSize=40 → pivot=(200,200).
    // Slot (1,1) baseline=(60,60). dy=(60-200)*0.5=-70 → world.y=-70+200=130.
    const g: GridShape = { ...squareGrid(40), skewRatio: 0.5 };
    expect(slotToWorld({ kind: "square", col: 1, row: 1 }, g)).toEqual({ x: 60, y: 130 });
  });

  it("rotation rotates around the grid center (pivot), not the origin", () => {
    // Grid 10x10 cellSize=40 → pivot=(200,200).
    // Slot (0,0) baseline=(20,20). dx=-180, dy=-180. rot90°→(180,-180). world=(380,20).
    const g: GridShape = { ...squareGrid(40), rotation: 90 };
    const p = slotToWorld({ kind: "square", col: 0, row: 0 }, g);
    expect(p.x).toBeCloseTo(380, 6);
    expect(p.y).toBeCloseTo(20, 6);
  });

  it("skew is applied in SCREEN space, after rotation (isometric, not vertical-only)", () => {
    // Grid 10x10 cellSize=40 → pivot=(200,200). Slot (0,0) baseline=(20,20).
    // dx=-180, dy=-180. rotate 90° → (rx,ry)=(180,-180). THEN squash y*0.5 → -90.
    // world = (180+200, -90+200) = (380, 110).
    // (Local-space skew — the old buggy order — would give (290, 20) instead.)
    const g: GridShape = { ...squareGrid(40), rotation: 90, skewRatio: 0.5 };
    const p = slotToWorld({ kind: "square", col: 0, row: 0 }, g);
    expect(p.x).toBeCloseTo(380, 6);
    expect(p.y).toBeCloseTo(110, 6);
  });

  it("worldToSlot reverses skew + rotation for square", () => {
    const g: GridShape = { ...squareGrid(40), skewRatio: 0.5, rotation: 30 };
    const slot = { kind: "square" as const, col: 2, row: 3 };
    const world = slotToWorld(slot, g);
    expect(worldToSlot(world, g)).toEqual(slot);
  });

  it("worldToSlot reverses skew + rotation for hex", () => {
    const g: GridShape = { ...hexGrid(20), skewRatio: 0.7, rotation: -45 };
    const slot = { kind: "hex" as const, q: 2, r: -1 };
    const world = slotToWorld(slot, g);
    expect(worldToSlot(world, g)).toEqual(slot);
  });
});

describe("slotInradius — token sizing keeps the same fill across grid kinds", () => {
  it("square inradius is half the cellSize (token keeps its 0.45·cellSize)", () => {
    expect(slotInradius(squareGrid(40))).toBe(20);
    // token = inradius * 0.9 = 18 = 0.45·cellSize, exactly today's value.
    expect(slotInradius(squareGrid(40)) * 0.9).toBeCloseTo(40 * 0.45);
  });

  it("hex inradius is cellSize·√3/2 (the flat-to-flat half-width)", () => {
    const cs = 40;
    expect(slotInradius(hexGrid(cs))).toBeCloseTo((cs * Math.sqrt(3)) / 2);
    // a hex token is ~1.73× a square token at the same cellSize.
    expect((slotInradius(hexGrid(cs)) * 0.9) / (cs * 0.45)).toBeCloseTo(Math.sqrt(3));
  });
});

describe("offsetToAxial — round-trips through isSlotInBounds's inverse formula", () => {
  it("col = q + floor(r/2) recovers the original col, for even/odd/negative rows and negative cols", () => {
    const rows = [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 10, 11];
    const cols = [-5, -1, 0, 1, 4, 7];
    for (const row of rows) {
      for (const col of cols) {
        const { q, r } = offsetToAxial(col, row);
        expect(r).toBe(row);
        const roundTripCol = q + Math.floor(r / 2);
        expect(roundTripCol).toBe(col);
      }
    }
  });

  it("reproduces GridLayer's previous inline offset formula", () => {
    const size = 40, hexW = size * Math.sqrt(3), hexH = size * 1.5;
    for (const r of [0, 1, 2, 3]) {
      for (const c of [0, 1, 5]) {
        const p = hexToPixel(offsetToAxial(c, r), size);
        expect(p.x).toBeCloseTo(c * hexW + (r % 2 === 1 ? hexW / 2 : 0));
        expect(p.y).toBeCloseTo(r * hexH);
      }
    }
  });
});

describe("isSameSlot", () => {
  it("compara slots quadrados por valor", () => {
    expect(isSameSlot({ kind: "square", col: 2, row: 3 }, { kind: "square", col: 2, row: 3 })).toBe(true);
    expect(isSameSlot({ kind: "square", col: 2, row: 3 }, { kind: "square", col: 3, row: 2 })).toBe(false);
  });

  it("independe da ordem das chaves — o que JSON.stringify não garantia", () => {
    const a = { kind: "square", col: 1, row: 4 } as const;
    const b = { row: 4, col: 1, kind: "square" } as const;
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b)); // a armadilha antiga
    expect(isSameSlot(a, b)).toBe(true);
  });

  it("compara slots hex por valor", () => {
    expect(isSameSlot({ kind: "hex", q: 1, r: -2 }, { kind: "hex", q: 1, r: -2 })).toBe(true);
    expect(isSameSlot({ kind: "hex", q: 1, r: -2 }, { kind: "hex", q: -2, r: 1 })).toBe(false);
  });

  it("slots de tipos diferentes nunca são iguais", () => {
    expect(isSameSlot({ kind: "square", col: 0, row: 0 }, { kind: "hex", q: 0, r: 0 })).toBe(false);
  });
});

describe("slot ↔ wire triple", () => {
  it("round-trips square and hex slots", () => {
    expect(slotToTriple({ kind: "square", col: 3, row: 4 }, 0)).toEqual([3, 4, 0]);
    expect(tripleToSlot([3, 4, 0], "square")).toEqual({ kind: "square", col: 3, row: 4 });
    expect(slotToTriple({ kind: "hex", q: 2, r: -1 }, 5)).toEqual([2, -1, 5]);
    expect(tripleToSlot([2, -1, 5], "hex")).toEqual({ kind: "hex", q: 2, r: -1 });
  });
});

describe("polygonsToWorld", () => {
  const rotated: GridShape = { ...squareGrid(40), rotation: 90, skewRatio: 0.5, originX: 30, originY: -10 };

  it("aplica applyTransform em cada vértice", () => {
    const out = polygonsToWorld([[[0, 0], [100, 20], [50, 80]]], rotated);
    const expected = [[0, 0], [100, 20], [50, 80]].map(([x, y]) => applyTransform({ x, y }, rotated));
    expect(out[0].map(([x, y]) => ({ x, y }))).toEqual(expected);
  });

  it("é identidade com rotation 0, skew 1 e sem origem", () => {
    const poly: Array<[number, number]> = [[1, 2], [3, 4], [5, 9]];
    expect(polygonsToWorld([poly], squareGrid(40))).toEqual([poly]);
  });
});

describe("gridWorldBounds", () => {
  it("quadrado sem transform é cols*cellSize x rows*cellSize", () => {
    const g = squareGrid(40);
    expect(gridWorldBounds(g)).toEqual({ minX: 0, minY: 0, maxX: g.cols * 40, maxY: g.rows * 40 });
  });

  it("cobre os 4 cantos transformados numa grade girada", () => {
    const g: GridShape = { ...squareGrid(40), rotation: 90 };
    const b = gridWorldBounds(g);
    const l = gridLocalBounds(g);
    for (const c of [[l.minX, l.minY], [l.maxX, l.minY], [l.maxX, l.maxY], [l.minX, l.maxY]]) {
      const w = applyTransform({ x: c[0], y: c[1] }, g);
      expect(w.x).toBeGreaterThanOrEqual(b.minX - 1e-9);
      expect(w.x).toBeLessThanOrEqual(b.maxX + 1e-9);
      expect(w.y).toBeGreaterThanOrEqual(b.minY - 1e-9);
      expect(w.y).toBeLessThanOrEqual(b.maxY + 1e-9);
    }
  });

  it("hex passa da caixa cols*cellSize (a borda direita não fica sem fog)", () => {
    const g: GridShape = { ...squareGrid(55), kind: "hex" };
    expect(gridWorldBounds(g).maxX).toBeGreaterThan(g.cols * g.cellSize);
  });
});

describe("gridWorldCorners", () => {
  const transform = { rotation: 30, skewRatio: 0.6, originX: 15, originY: -20 };

  // Ponto em polígono convexo: todos os produtos vetoriais com o mesmo sinal.
  const insideConvex = (p: { x: number; y: number }, poly: { x: number; y: number }[]) => {
    let pos = false;
    let neg = false;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
      if (cross > 1e-9) pos = true;
      if (cross < -1e-9) neg = true;
    }
    return !(pos && neg);
  };

  it("são os 4 cantos de gridLocalBounds por applyTransform (TL, TR, BR, BL)", () => {
    const g: GridShape = { ...squareGrid(40), ...transform };
    const b = gridLocalBounds(g);
    const expected = [
      { x: b.minX, y: b.minY }, { x: b.maxX, y: b.minY },
      { x: b.maxX, y: b.maxY }, { x: b.minX, y: b.maxY },
    ].map((p) => applyTransform(p, g));
    const got = gridWorldCorners(g);
    expect(got).toHaveLength(4);
    got.forEach((p, i) => {
      expect(p.x).toBeCloseTo(expected[i].x, 9);
      expect(p.y).toBeCloseTo(expected[i].y, 9);
    });
  });

  it("hex transformada: o centro de todo slot cai dentro do contorno", () => {
    const g: GridShape = { ...hexGrid(64), ...transform };
    const poly = gridWorldCorners(g);
    for (let col = 0; col < 10; col++) {
      for (let row = 0; row < 10; row++) {
        const c = slotToWorld({ kind: "hex", ...offsetToAxial(col, row) }, g);
        expect(insideConvex(c, poly), `slot ${col},${row}`).toBe(true);
      }
    }
  });

  it("premissa: na hex sem transform o retângulo cols*cellSize não cobre todo centro", () => {
    const g = hexGrid(64);
    let outside = false;
    for (let col = 0; col < g.cols; col++) {
      for (let row = 0; row < g.rows; row++) {
        const c = slotToWorld({ kind: "hex", ...offsetToAxial(col, row) }, g);
        if (c.x > g.cols * g.cellSize || c.x < 0 || c.y < 0) outside = true;
      }
    }
    expect(outside).toBe(true);
  });
});

const hexIso = (over: Partial<GridShape> = {}): GridShape => ({
  ...squareGrid(64),
  kind: "hex",
  cols: 16,
  rows: 12,
  ...over,
});

describe("F1 — pivô = centro dos limites da grade", () => {
  it("gridPivot de grade quadrada = (cols·cs/2, rows·cs/2)", () => {
    const g = { ...squareGrid(64), cols: 16, rows: 12 };
    expect(gridPivot(g)).toEqual({ x: 512, y: 384 });
  });

  it("hex 45°/0.5: o pivô não se move no applyTransform (só soma a origem)", () => {
    const g = hexIso({ rotation: 45, skewRatio: 0.5, originX: 15, originY: -20 });
    const p = gridPivot(g);
    const w = applyTransform(p, g);
    expect(w.x).toBeCloseTo(p.x + 15, 6);
    expect(w.y).toBeCloseTo(p.y - 20, 6);
  });

  it.each([
    [0, 1],
    [45, 0.5],
    [30, 0.7],
  ])("hex: arrastar a esfera (rot %i, skew %f) devolve a mesma rotação", (rotation, skewRatio) => {
    const g = hexIso({ rotation, skewRatio, originX: 15, originY: -20 });
    const s = gridRotateHandleWorld(g, 24);
    const out = gridFromHandleDrag("rotate", g, s.x, s.y, false)!;
    expect(out.rotation).toBeCloseTo(rotation, 6);
  });
});

describe("F2 — keepGridAnchored", () => {
  const iso = (): GridShape => ({
    ...squareGrid(64), cols: 16, rows: 12, rotation: 45, skewRatio: 0.5, originX: 15, originY: -20,
  });

  it("cols 16→17: todo slot da grade 16x12 mantém o slotToWorld", () => {
    const prev = iso();
    const next = keepGridAnchored(prev, { ...prev, cols: 17 });
    for (let r = 0; r < 12; r++) for (let c = 0; c < 16; c++) {
      const s = { kind: "square" as const, col: c, row: r };
      const a = slotToWorld(s, prev);
      const b = slotToWorld(s, next);
      expect(b.x).toBeCloseTo(a.x, 6);
      expect(b.y).toBeCloseTo(a.y, 6);
    }
  });

  it("rows 12→10: slots sobreviventes mantêm o slotToWorld", () => {
    const prev = iso();
    const next = keepGridAnchored(prev, { ...prev, rows: 10 });
    for (let r = 0; r < 10; r++) for (let c = 0; c < 16; c++) {
      const s = { kind: "square" as const, col: c, row: r };
      const a = slotToWorld(s, prev);
      const b = slotToWorld(s, next);
      expect(b.x).toBeCloseTo(a.x, 6);
      expect(b.y).toBeCloseTo(a.y, 6);
    }
  });

  it("cellSize 64→80: applyTransform({0,0}) não muda", () => {
    const prev = iso();
    const next = keepGridAnchored(prev, { ...prev, cellSize: 80 });
    const a = applyTransform({ x: 0, y: 0 }, prev);
    const b = applyTransform({ x: 0, y: 0 }, next);
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.y).toBeCloseTo(a.y, 6);
  });

  it("grade sem transform: origem inalterada", () => {
    const prev = { ...squareGrid(64), originX: 7, originY: 9 };
    const next = keepGridAnchored(prev, { ...prev, cols: 12 });
    expect(next.originX).toBe(7);
    expect(next.originY).toBe(9);
    const noOrigin = keepGridAnchored(squareGrid(64), { ...squareGrid(64), rows: 3 });
    expect(noOrigin.originX).toBe(0);
    expect(noOrigin.originY).toBe(0);
  });
});

describe("F3 — arrasto dá valores limpos e dentro do intervalo", () => {
  const g = { ...squareGrid(64), cols: 16, rows: 12 };
  const center = { x: 512, y: 384 };

  it("rotação normalizada para (-180, 180]", () => {
    // cursor à esquerda-abaixo do centro → ~200° bruto → -160
    const t = (200 - 90) * (Math.PI / 180);
    const out = gridFromHandleDrag("rotate", g, center.x + 100 * Math.cos(t), center.y + 100 * Math.sin(t), false)!;
    expect(out.rotation).toBe(-160);
  });

  it("rotação arredondada a 0.1° e skew a 0.01", () => {
    const out = gridFromHandleDrag("rotate", g, center.x + 77, center.y - 31, false)!;
    expect(Math.round(out.rotation * 10) / 10).toBe(out.rotation);
    expect(out.rotation).toBeGreaterThan(-180);
    expect(out.rotation).toBeLessThanOrEqual(180);
    const sk = gridFromHandleDrag("TC", g, 512, 77.777, true)!;
    expect(Math.round(sk.skewRatio * 100) / 100).toBe(sk.skewRatio);
  });
});

describe("slotScreenInradius — a ficha cabe na casa como aparece na tela", () => {
  it("sem transform: igual ao slotInradius (quadrado e hex)", () => {
    expect(slotScreenInradius(squareGrid(40))).toBeCloseTo(20, 6);
    expect(slotScreenInradius(hexGrid(40))).toBeCloseTo(slotInradius(hexGrid(40)), 6);
  });
  it("quadrado cs40 a 45 graus / 0,5 vira o losango achatado", () => {
    const g: GridShape = { ...squareGrid(40), rotation: 45, skewRatio: 0.5 };
    expect(slotScreenInradius(g)).toBeCloseTo(12.649110640673518, 6);
  });
  it("rotação 90 sem achatamento mantém cs/2", () => {
    const g: GridShape = { ...squareGrid(40), rotation: 90, skewRatio: 1 };
    expect(slotScreenInradius(g)).toBeCloseTo(20, 6);
  });
  it("stackOffsetToPx numa grade iso usa o raio da tela", () => {
    const g: GridShape = { ...squareGrid(40), rotation: 45, skewRatio: 0.5 };
    const r = slotScreenInradius(g);
    const px = stackOffsetToPx({ dx: 0.5, dy: -1 }, g);
    expect(px.x).toBeCloseTo(0.5 * r, 6);
    expect(px.y).toBeCloseTo(-r, 6);
  });
});
