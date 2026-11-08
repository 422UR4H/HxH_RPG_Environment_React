import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CombatState } from "../../combat/combatReducer";
import type { ClockState } from "../clockMessages";
import { useStoryClock } from "../useStoryClock";

type Clock = CombatState["clock"];

const T0 = new Date("2026-01-01T12:00:00.000Z").getTime();

function value(over: Partial<ClockState> = {}): ClockState {
  return { storyAt: "2000-01-01T08:30:00", running: true, limitAt: null, limitReason: "", seq: 1, ...over };
}

function clock(over: Partial<Clock> = {}): Clock {
  return { value: value(), receivedAt: T0, lastChange: null, changeSeq: 0, ...over };
}

const playChange = { kind: "play" as const };

function setup(initial: Clock, escalate = true) {
  return renderHook(({ c, e }) => useStoryClock(c, { escalate: e }), {
    initialProps: { c: initial, e: escalate },
  });
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("useStoryClock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it("ticks story time each second while running", () => {
    const { result } = setup(clock({ lastChange: playChange, changeSeq: 1 }));
    expect(result.current.now).toBe("2000-01-01T08:30:00");
    advance(1000);
    expect(result.current.now).toBe("2000-01-01T08:30:01");
    advance(2000);
    expect(result.current.now).toBe("2000-01-01T08:30:03");
    expect(result.current.running).toBe(true);
  });

  it("aligns ticks to whole seconds of receivedAt", () => {
    vi.setSystemTime(T0 + 400);
    const { result } = setup(clock());
    advance(599);
    expect(result.current.now).toBe("2000-01-01T08:30:00");
    advance(1);
    expect(result.current.now).toBe("2000-01-01T08:30:01");
  });

  it("freezes while paused and has no interval", () => {
    const { result } = setup(clock({ value: value({ running: false }) }));
    advance(5000);
    expect(result.current.now).toBe("2000-01-01T08:30:00");
    expect(result.current.phase).toBe("idle");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("returns null now and idle when unset", () => {
    const { result } = setup(clock({ value: null }));
    expect(result.current.now).toBeNull();
    expect(result.current.phase).toBe("idle");
  });

  it("cleans the timer on unmount after ticking", () => {
    const { unmount } = setup(clock());
    advance(1500);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cleans the timer when it pauses after ticking", () => {
    const { rerender } = setup(clock());
    advance(1500);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    rerender({
      c: clock({ value: value({ running: false, seq: 2 }), receivedAt: T0 + 1500, lastChange: { kind: "pause" }, changeSeq: 1 }),
      e: true,
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not drift over a long run", () => {
    vi.setSystemTime(T0 + 300);
    const { result } = setup(clock());
    advance(3600 * 1000 - 300);
    expect(result.current.now).toBe("2000-01-01T09:30:00");
  });

  it("resumes from the server value on a reconnect and keeps the phase", () => {
    const { result, rerender } = setup(clock({ lastChange: playChange, changeSeq: 1 }));
    advance(20000);
    expect(result.current.realElapsedSeconds).toBe(20);
    expect(result.current.now).toBe("2000-01-01T08:30:20");
    // reconexão: o estado cheio chega 2 s depois, com o valor do servidor já adiantado
    advance(2000);
    rerender({
      c: clock({
        value: value({ storyAt: "2000-01-01T08:30:22", seq: 2 }),
        receivedAt: T0 + 22000,
        lastChange: null,
        changeSeq: 1,
      }),
      e: true,
    });
    expect(result.current.now).toBe("2000-01-01T08:30:22");
    expect(result.current.realElapsedSeconds).toBe(22);
    advance(1000);
    expect(result.current.now).toBe("2000-01-01T08:30:23");
    expect(result.current.phase).not.toBe("idle");
  });

  it("starts the baseline at receipt when a full state arrives running", () => {
    const { result } = setup(clock());
    advance(7000);
    expect(result.current.realElapsedSeconds).toBe(7);
  });

  it("resets the baseline on a play after a pause", () => {
    const { result, rerender } = setup(clock({ lastChange: playChange, changeSeq: 1 }));
    advance(30000);
    rerender({
      c: clock({ value: value({ running: false, seq: 2 }), receivedAt: T0 + 30000, lastChange: { kind: "pause" }, changeSeq: 2 }),
      e: true,
    });
    expect(result.current.phase).toBe("idle");
    expect(result.current.realElapsedSeconds).toBe(0);
    rerender({
      c: clock({ value: value({ seq: 3 }), receivedAt: T0 + 30000, lastChange: playChange, changeSeq: 3 }),
      e: true,
    });
    advance(3000);
    expect(result.current.realElapsedSeconds).toBe(3);
  });

  it("resets the baseline on a play change even if already running", () => {
    const { result, rerender } = setup(clock({ lastChange: playChange, changeSeq: 1 }));
    advance(15000);
    rerender({
      c: clock({ value: value({ seq: 2 }), receivedAt: T0 + 15000, lastChange: playChange, changeSeq: 2 }),
      e: true,
    });
    expect(result.current.realElapsedSeconds).toBe(0);
  });

  it("does not reset on an adjust while running", () => {
    const { result, rerender } = setup(clock({ lastChange: playChange, changeSeq: 1 }));
    advance(15000);
    rerender({
      c: clock({ value: value({ seq: 2 }), receivedAt: T0 + 15000, lastChange: { kind: "adjust" }, changeSeq: 2 }),
      e: true,
    });
    expect(result.current.realElapsedSeconds).toBe(15);
  });

  describe("escalation phases", () => {
    it("walks running, pulse, strongPulse and alert", () => {
      const { result } = setup(clock({ lastChange: playChange, changeSeq: 1 }));
      advance(5000);
      expect(result.current.phase).toBe("running");
      expect(result.current.pulseKey).toBe(0);
      advance(5000); // 10 s
      expect(result.current.phase).toBe("pulse");
      expect(result.current.pulseKey).toBe(1);
      const key10 = result.current.pulseKey;
      advance(1000);
      expect(result.current.phase).toBe("running");
      advance(9000); // 20 s
      expect(result.current.phase).toBe("pulse");
      expect(result.current.pulseKey).toBe(2);
      expect(result.current.pulseKey).toBeGreaterThan(key10);
      advance(40000); // 60 s
      expect(result.current.phase).toBe("strongPulse");
      advance(1000);
      expect(result.current.phase).toBe("running");
      advance(239000); // 300 s
      expect(result.current.phase).toBe("strongPulse");
      expect(result.current.alertKey).toBe(1);
      expect(result.current.pulseKey).toBe(30);
      advance(1000); // 301 s
      expect(result.current.phase).toBe("alert");
      expect(result.current.pulseKey).toBe(30);
      advance(9000); // 310 s
      expect(result.current.phase).toBe("pulse");
      expect(result.current.pulseKey).toBe(31);
      advance(1000);
      expect(result.current.phase).toBe("alert");
      advance(289000); // 600 s
      expect(result.current.phase).toBe("strongPulse");
      expect(result.current.alertKey).toBe(2);
    });

    it("never leaves running when escalate is false", () => {
      const { result } = setup(clock({ lastChange: playChange, changeSeq: 1 }), false);
      for (const s of [10, 50, 240, 60, 300]) {
        advance(s * 1000);
        expect(result.current.phase).toBe("running");
      }
      expect(result.current.pulseKey).toBe(0);
      expect(result.current.alertKey).toBe(0);
    });
  });
});
