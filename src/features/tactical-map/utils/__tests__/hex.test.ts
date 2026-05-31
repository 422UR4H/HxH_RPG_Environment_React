import { describe, it, expect } from "vitest";
import {
  hexToPixel,
  pixelToHex,
  hexRound,
  axialToCube,
  cubeToAxial,
  hexDistance,
} from "../hex";

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

describe("hex — pointy-top axial", () => {
  it("hexToPixel(0,0) is origin", () => {
    const p = hexToPixel({ q: 0, r: 0 }, 1);
    expect(close(p.x, 0)).toBe(true);
    expect(close(p.y, 0)).toBe(true);
  });

  it("hexToPixel respects pointy-top formula", () => {
    // pointy-top: x = size * sqrt(3) * (q + r/2); y = size * 3/2 * r
    const size = 10;
    const p = hexToPixel({ q: 2, r: 1 }, size);
    expect(close(p.x, size * Math.sqrt(3) * (2 + 0.5))).toBe(true);
    expect(close(p.y, size * 1.5 * 1)).toBe(true);
  });

  it("pixelToHex is the inverse of hexToPixel on integer axials", () => {
    const size = 12;
    for (let q = -3; q <= 3; q++) {
      for (let r = -3; r <= 3; r++) {
        const pixel = hexToPixel({ q, r }, size);
        const hex = pixelToHex(pixel, size);
        expect(hex).toEqual({ q, r });
      }
    }
  });

  it("hexRound snaps a fractional axial to nearest integer hex", () => {
    expect(hexRound({ q: 0.1, r: 0.2 })).toEqual({ q: 0, r: 0 });
    expect(hexRound({ q: 0.6, r: 0.1 })).toEqual({ q: 1, r: 0 });
    expect(hexRound({ q: -0.6, r: -0.1 })).toEqual({ q: -1, r: 0 });
  });

  it("axialToCube and cubeToAxial roundtrip", () => {
    const a = { q: 2, r: -3 };
    expect(cubeToAxial(axialToCube(a))).toEqual(a);
  });

  it("axialToCube preserves cube invariant x+y+z=0", () => {
    const c = axialToCube({ q: 5, r: -2 });
    expect(c.x + c.y + c.z).toBe(0);
  });

  it("hexDistance is 0 for same hex and grows by 1 for neighbours", () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
    const neighbours = [
      { q: 1, r: 0 }, { q: -1, r: 0 },
      { q: 0, r: 1 }, { q: 0, r: -1 },
      { q: 1, r: -1 }, { q: -1, r: 1 },
    ];
    for (const n of neighbours) {
      expect(hexDistance({ q: 0, r: 0 }, n)).toBe(1);
    }
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: -2 })).toBe(3);
  });
});
