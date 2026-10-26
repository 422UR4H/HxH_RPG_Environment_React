import { describe, expect, it } from "vitest";
import {
  RECONNECT_WINDOW_MS,
  createReconnectPolicy,
} from "../reconnectPolicy";

describe("createReconnectPolicy", () => {
  it("waits 500, 1000, 2000, 4000, 5000, 5000 between consecutive failures", () => {
    const policy = createReconnectPolicy();
    const now = 1_000_000;
    const delays = [0, 1, 2, 3, 4, 5].map(() => policy.nextDelay(now));
    expect(delays).toEqual([500, 1000, 2000, 4000, 5000, 5000]);
  });

  it("gives up (null) at 180 000 ms from the start, and not before", () => {
    const policy = createReconnectPolicy();
    const start = 2_000_000;
    expect(policy.nextDelay(start)).toBe(500);
    expect(policy.nextDelay(start + 179_999)).not.toBeNull();
    expect(policy.nextDelay(start + RECONNECT_WINDOW_MS)).toBeNull();
  });

  it("after reset(), the next failure opens a new window and goes back to 500", () => {
    const policy = createReconnectPolicy();
    const start = 3_000_000;
    policy.nextDelay(start);
    policy.nextDelay(start + 1_000);
    policy.nextDelay(start + 3_000);
    policy.reset();

    // Mesmo instante em que a janela antiga já teria vencido: a nova começa agora.
    const later = start + RECONNECT_WINDOW_MS + 60_000;
    expect(policy.nextDelay(later)).toBe(500);
    expect(policy.nextDelay(later + 179_999)).not.toBeNull();
    expect(policy.nextDelay(later + RECONNECT_WINDOW_MS)).toBeNull();
  });
});
