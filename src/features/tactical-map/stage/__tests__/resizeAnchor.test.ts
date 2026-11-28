import { describe, expect, it } from "vitest";
import { resizeShift, type CanvasBox } from "../resizeAnchor";

const box = (left: number, top: number, width: number, height: number): CanvasBox => ({
  left,
  top,
  width,
  height,
});

describe("resizeShift", () => {
  it("refits on the first measure", () => {
    expect(resizeShift(null, box(320, 56, 1000, 700))).toEqual({ dx: 0, dy: 0, refit: true });
  });

  it("keeps the map still when the right column opens", () => {
    expect(resizeShift(box(320, 56, 1000, 700), box(320, 56, 720, 700))).toEqual({
      dx: 0,
      dy: 0,
      refit: false,
    });
  });

  it("compensates the left edge when the left column grows from 320 to 340", () => {
    expect(resizeShift(box(320, 56, 1000, 700), box(340, 56, 980, 700))).toEqual({
      dx: -20,
      dy: 0,
      refit: false,
    });
  });

  it("compensates the left edge when the left column closes", () => {
    expect(resizeShift(box(320, 56, 1000, 700), box(0, 56, 1320, 700))).toEqual({
      dx: 320,
      dy: 0,
      refit: false,
    });
  });

  it("compensates a top-only move without refitting", () => {
    expect(resizeShift(box(0, 56, 1000, 700), box(0, 64, 1000, 700))).toEqual({
      dx: 0,
      dy: -8,
      refit: false,
    });
  });

  it("refits when the height changes", () => {
    expect(resizeShift(box(0, 56, 390, 700), box(0, 56, 390, 420))).toEqual({
      dx: 0,
      dy: 0,
      refit: true,
    });
  });

  it("refits when the height changes together with the width", () => {
    expect(resizeShift(box(0, 0, 390, 844), box(0, 0, 844, 390))).toEqual({
      dx: 0,
      dy: 0,
      refit: true,
    });
  });

  it("ignores a sub-pixel height change and keeps the map still", () => {
    expect(resizeShift(box(0, 45, 753, 552), box(0, 45, 553, 552.4))).toEqual({
      dx: 0,
      dy: 0,
      refit: false,
    });
  });

  it("refits when the height changes by one pixel or more", () => {
    expect(resizeShift(box(0, 45, 753, 552), box(0, 45, 753, 551)).refit).toBe(true);
  });
});
