import { describe, it, expect } from "vitest";
import { uncoveredGridLines, trimUncoveredGrid } from "../bgCoverage";
import { slotToWorld } from "../coords";
import type { BgImage, GridShape } from "../../../../types/tacticalMap";

const grid = (over: Partial<GridShape> = {}): GridShape => ({
  kind: "square",
  cols: 10,
  rows: 10,
  cellSize: 40,
  skewRatio: 1,
  rotation: 0,
  color: "#4a90a4",
  opacity: 0.6,
  lineStyle: "solid",
  ...over,
});

const bg = (x: number, y: number, width: number, height: number, rotation = 0): NonNullable<BgImage> => ({
  url: "", x, y, width, height, rotation, opacity: 1,
});

const lines = (left: number, right: number, top: number, bottom: number) => ({ left, right, top, bottom });

const HEX_HALF_W = (20 * Math.sqrt(3)) / 2; // 17,3205…; 9·HEX_HALF_W = 155,8845… (borda direita em 138,564)

describe("uncoveredGridLines", () => {
  it("quadrado sem transform: mesmos números da fórmula antiga", () => {
    expect(uncoveredGridLines(grid(), bg(0, 0, 330, 400))).toEqual(lines(0, 1, 0, 0));
    expect(uncoveredGridLines(grid(), bg(50, 90, 350, 310))).toEqual(lines(1, 0, 2, 0));
    // a coluna/linha que só encosta na borda (x=320) conta como descoberta
    expect(uncoveredGridLines(grid(), bg(0, 0, 320, 320))).toEqual(lines(0, 2, 0, 2));
    expect(uncoveredGridLines(grid(), bg(0, 0, 400, 400))).toEqual(lines(0, 0, 0, 0));
  });

  it("isométrico 45°/0.5 com a imagem na caixa do losango: tudo coberto", () => {
    // Losango: centro (200,200), meia-largura 200·√2 = 282,84, meia-altura 200·√2·0,5 = 141,42.
    // Imagem x −82,84…482,84, y 58,58…341,42. A fórmula ANTIGA (inline em handleSave) dava:
    // bgBottom 341,42 < gridH 400 → floor(58,58/40) = 1 linha à direita/baixo; bg.y 58,58 > 0 →
    // floor(58,58/40) = 1 linha em cima; total 2 linhas "descobertas" e cortaria 1.
    const w = 400 * Math.SQRT2 * 0.5 * 2; // largura = 565,685…
    const x = 200 - 200 * Math.SQRT2;
    const y = 200 - 100 * Math.SQRT2;
    const g = grid({ rotation: 45, skewRatio: 0.5 });
    expect(uncoveredGridLines(g, bg(x, y, w, 200 * Math.SQRT2))).toEqual(lines(0, 0, 0, 0));
  });

  it("hex 6×6: a coluna 5 fica toda além da imagem", () => {
    // hexW = 20·√3 = 34,64; a imagem vai de x −17,32 (borda esquerda do hex 0) a 138,56.
    // Coluna 5: centros em 5·34,64 (=173,2) (+17,32 nas linhas ímpares) → bordas esquerdas ≥ 155,88 > 138,56.
    // Coluna 4 em linhas pares: centro 138,56, aresta esquerda 121,24 < 138,56 → coberta.
    const g = grid({ kind: "hex", cols: 6, rows: 6, cellSize: 20 });
    expect(
      uncoveredGridLines(g, bg(-HEX_HALF_W, -20, 9 * HEX_HALF_W, 190)),
    ).toEqual(lines(0, 1, 0, 0));
  });

  it("imagem longe da grade: nada é coberto, tudo 0", () => {
    expect(uncoveredGridLines(grid(), bg(5000, 5000, 100, 100))).toEqual(lines(0, 0, 0, 0));
  });

  it("imagem girada 90° em torno do próprio centro", () => {
    // 400×200 em (0,0), centro (200,100); girada 90° ocupa x 100…300, y −100…300.
    // Colunas: 0 (0–40) e 1 (40–80) ficam antes de x=100; a 2 (80–120) cobre; a 7 (280–320) cobre
    // e 8, 9 (≥320) ficam além de x=300 → left 2, right 2.
    // Linhas: a imagem vai de y=−100 a 300, então a linha 0 já cobre (top 0); a 7 (280–320) cobre
    // e 8, 9 ficam além → bottom 2.
    expect(uncoveredGridLines(grid(), bg(0, 0, 400, 200, 90))).toEqual(lines(2, 2, 0, 2));
  });
});

describe("trimUncoveredGrid", () => {
  it("grade 45°/0.5: slots sobreviventes mantêm a posição relativa à imagem", () => {
    const g = grid({ cols: 16, rows: 12, cellSize: 64, rotation: 45, skewRatio: 0.5 });
    const b = bg(10, 20, 900, 400);
    const { grid: tg, bg: tb } = trimUncoveredGrid(g, b, 2, 1);
    expect(tg.cols).toBe(14);
    expect(tg.rows).toBe(11);
    for (let r = 0; r < 11; r++) for (let c = 0; c < 14; c++) {
      const s = { kind: "square" as const, col: c, row: r };
      const before = slotToWorld(s, g);
      const after = slotToWorld(s, tg);
      expect(after.x - tb.x).toBeCloseTo(before.x - b.x, 6);
      expect(after.y - tb.y).toBeCloseTo(before.y - b.y, 6);
    }
  });
});
