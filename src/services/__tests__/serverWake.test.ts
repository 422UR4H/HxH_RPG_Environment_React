import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_URL } from "../httpClient";
import {
  WARM_UP_INTERVAL_MS,
  gameHttpOrigin,
  resetWarmUpForTests,
  warmUpServers,
} from "../serverWake";

describe("gameHttpOrigin", () => {
  it("swaps ws for http", () => {
    expect(gameHttpOrigin("ws://localhost:8081")).toBe("http://localhost:8081");
  });
  it("swaps wss for https and drops the path", () => {
    expect(gameHttpOrigin("wss://x.onrender.com/ws")).toBe("https://x.onrender.com");
  });
  it("returns null for empty or invalid input", () => {
    expect(gameHttpOrigin(undefined)).toBeNull();
    expect(gameHttpOrigin("")).toBeNull();
    expect(gameHttpOrigin("não é url")).toBeNull();
  });
});

describe("warmUpServers", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    resetWarmUpForTests();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(null));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("VITE_WS_URL", "ws://localhost:8081");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("fires the API readiness and the game health with no-cors", () => {
    warmUpServers(1_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/readiness`, { mode: "no-cors" });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8081/health", { mode: "no-cors" });
  });

  it("respects the 5-minute window", () => {
    warmUpServers(1_000);
    fetchMock.mockClear();
    warmUpServers(1_000 + WARM_UP_INTERVAL_MS - 1);
    expect(fetchMock).not.toHaveBeenCalled();
    warmUpServers(1_000 + WARM_UP_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("swallows a rejecting fetch", async () => {
    fetchMock.mockRejectedValue(new Error("rede"));
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    expect(() => warmUpServers(1_000)).not.toThrow();
    await new Promise((r) => setTimeout(r, 10));
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});
