import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCardDragTracker } from "../cardDragGesture";
import { TAP_TOLERANCE_PX } from "../../tactical-map/hooks/tapGesture";
import { HOLD_MS } from "../../tactical-map/hooks/useHoldGesture";

const mouse = (x: number, y: number) => ({ pointerId: 1, clientX: x, clientY: y, button: 0, pointerType: "mouse" });
const touch = (x: number, y: number) => ({ pointerId: 1, clientX: x, clientY: y, pointerType: "touch" });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createCardDragTracker", () => {
  it("starts a mouse drag only past the tap tolerance, at the pointer position", () => {
    const onStart = vi.fn();
    const t = createCardDragTracker({ onStart });
    t.down(mouse(10, 10));
    t.move(mouse(10 + TAP_TOLERANCE_PX, 10));
    expect(onStart).not.toHaveBeenCalled();
    t.move(mouse(10 + TAP_TOLERANCE_PX + 1, 10));
    expect(onStart).toHaveBeenCalledWith({ x: 10 + TAP_TOLERANCE_PX + 1, y: 10 }, "mouse");
    expect(t.end()).toBe(true);
  });

  it("starts only once and a press without movement is a plain click", () => {
    const onStart = vi.fn();
    const t = createCardDragTracker({ onStart });
    t.down(mouse(0, 0));
    expect(t.end()).toBe(false);
    t.down(mouse(0, 0));
    t.move(mouse(30, 0));
    t.move(mouse(60, 0));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("ignores non-primary buttons", () => {
    const onStart = vi.fn();
    const t = createCardDragTracker({ onStart });
    t.down({ ...mouse(0, 0), button: 2 });
    t.move(mouse(50, 0));
    expect(onStart).not.toHaveBeenCalled();
  });

  it("touch: starts after the hold without moving", () => {
    const onStart = vi.fn();
    const t = createCardDragTracker({ onStart });
    t.down(touch(5, 5));
    t.move(touch(7, 5));
    vi.advanceTimersByTime(HOLD_MS - 1);
    expect(onStart).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onStart).toHaveBeenCalledWith({ x: 7, y: 5 }, "touch");
    expect(t.isStarted()).toBe(true);
  });

  it("touch: moving before the hold is scrolling and abandons the gesture", () => {
    const onStart = vi.fn();
    const t = createCardDragTracker({ onStart });
    t.down(touch(0, 0));
    t.move(touch(0, 40));
    vi.advanceTimersByTime(HOLD_MS * 2);
    expect(onStart).not.toHaveBeenCalled();
    expect(t.end()).toBe(false);
  });

  it("touch: releasing before the hold cancels the timer", () => {
    const onStart = vi.fn();
    const t = createCardDragTracker({ onStart });
    t.down(touch(0, 0));
    t.end();
    vi.advanceTimersByTime(HOLD_MS * 2);
    expect(onStart).not.toHaveBeenCalled();
  });

  it("a second pointer disarms the gesture", () => {
    const onStart = vi.fn();
    const t = createCardDragTracker({ onStart });
    t.down(touch(0, 0));
    t.down({ ...touch(50, 50), pointerId: 2 });
    vi.advanceTimersByTime(HOLD_MS * 2);
    expect(onStart).not.toHaveBeenCalled();
  });
});
