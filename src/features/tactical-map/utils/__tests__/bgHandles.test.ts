import { describe, it, expect } from "vitest";
import { computeNewBgFromDrag } from "../bgHandles";
import type { BgImage } from "../../../../types/tacticalMap";

// Starting bg: no rotation, so the resize math is checkable by hand.
// aspectRatio = width / height = 200 / 100 = 2.
const bg: NonNullable<BgImage> = {
  url: "x",
  x: 100,
  y: 100,
  width: 200,
  height: 100,
  rotation: 0,
  opacity: 1,
};
const aspectRatio = bg.width / bg.height; // 2

describe("computeNewBgFromDrag", () => {
  it("rotate: cursor directly above the center yields angle 0, and leaves x/y/width/height untouched", () => {
    // center = (200, 150). Cursor at (200, 50) is straight up from center.
    // formula: atan2(dy,dx)*180/pi + 90 = atan2(-100,0)*180/pi + 90 = -90+90 = 0.
    const result = computeNewBgFromDrag("rotate", bg, 200, 50, aspectRatio, false);
    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(0);
    expect(result!.x).toBe(bg.x);
    expect(result!.y).toBe(bg.y);
    expect(result!.width).toBe(bg.width);
    expect(result!.height).toBe(bg.height);
  });

  it('"BR" without freeResize: width follows the cursor, height follows the aspect ratio, TL corner (x/y) stays put', () => {
    // Cursor at (400, 500): newW = 400 - 100 = 300; newH = 300 / 2 = 150 (aspect-locked).
    const result = computeNewBgFromDrag("BR", bg, 400, 500, aspectRatio, false);
    expect(result).not.toBeNull();
    expect(result!.width).toBe(300);
    expect(result!.height).toBe(150);
    expect(result!.x).toBe(bg.x);
    expect(result!.y).toBe(bg.y);
  });

  it('"BR" with freeResize: width and height move independently of the aspect ratio', () => {
    // Cursor at (400, 500): newW = 300, newH = 500 - 100 = 400 (not 150 — aspect ratio ignored).
    const result = computeNewBgFromDrag("BR", bg, 400, 500, aspectRatio, true);
    expect(result).not.toBeNull();
    expect(result!.width).toBe(300);
    expect(result!.height).toBe(400);
  });

  it('"TL" without freeResize: the opposite corner (x+width, y+height) stays anchored', () => {
    // Cursor at (50, 50): newW = 300 - 50 = 250; newH = 250 / 2 = 125.
    // x = 300 - 250 = 50; y = 200 - 125 = 75.
    const result = computeNewBgFromDrag("TL", bg, 50, 50, aspectRatio, false);
    expect(result).not.toBeNull();
    expect(result!.x).not.toBe(bg.x);
    expect(result!.y).not.toBe(bg.y);
    expect(result!.x + result!.width).toBeCloseTo(bg.x + bg.width, 10);
    expect(result!.y + result!.height).toBeCloseTo(bg.y + bg.height, 10);
  });

  it('"MR": width follows the cursor, height follows the aspect ratio, block stays vertically centered', () => {
    // Cursor x=400 (worldY is irrelevant to MR): newW = 400 - 100 = 300; newH = 300/2 = 150.
    const result = computeNewBgFromDrag("MR", bg, 400, 999, aspectRatio, false);
    expect(result).not.toBeNull();
    expect(result!.width).toBe(300);
    expect(result!.height).toBe(150);
    const originalCenterY = bg.y + bg.height / 2;
    const newCenterY = result!.y + result!.height / 2;
    expect(newCenterY).toBeCloseTo(originalCenterY, 10);
  });

  it('"TC": height follows the cursor, width follows the aspect ratio, block stays horizontally centered', () => {
    // Cursor y=50 (worldX is irrelevant to TC): newH = 200 - 50 = 150; newW = 150*2 = 300.
    const result = computeNewBgFromDrag("TC", bg, 999, 50, aspectRatio, false);
    expect(result).not.toBeNull();
    expect(result!.height).toBe(150);
    expect(result!.width).toBe(300);
    const originalCenterX = bg.x + bg.width / 2;
    const newCenterX = result!.x + result!.width / 2;
    expect(newCenterX).toBeCloseTo(originalCenterX, 10);
  });

  it("clamps to the MIN (16) when dragging BR past the anchor toward the top-left", () => {
    // freeResize:true so both dimensions are independently clamped by the cursor,
    // rather than height being derived from an already-clamped width via aspect ratio.
    const result = computeNewBgFromDrag("BR", bg, 50, 50, aspectRatio, true);
    expect(result).not.toBeNull();
    expect(result!.width).toBeGreaterThanOrEqual(16);
    expect(result!.height).toBeGreaterThanOrEqual(16);
  });

  it("returns null for an unknown handle", () => {
    const result = computeNewBgFromDrag("XX", bg, 1, 1, aspectRatio, false);
    expect(result).toBeNull();
  });

  it("with rotation: MR keeps the result finite, positive, and aspect-ratio-preserving", () => {
    const rotatedBg: NonNullable<BgImage> = { ...bg, rotation: 90 };
    const result = computeNewBgFromDrag("MR", rotatedBg, 400, 999, aspectRatio, false);
    expect(result).not.toBeNull();
    expect(Number.isFinite(result!.x)).toBe(true);
    expect(Number.isFinite(result!.y)).toBe(true);
    expect(Number.isFinite(result!.width)).toBe(true);
    expect(Number.isFinite(result!.height)).toBe(true);
    expect(result!.width).toBeGreaterThan(0);
    expect(result!.height).toBeGreaterThan(0);
    expect(result!.width / result!.height).toBeCloseTo(aspectRatio, 5);
  });
});
