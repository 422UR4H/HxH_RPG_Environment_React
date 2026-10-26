import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_URL } from "../httpClient";
import {
  WARM_UP_INTERVAL_MS,
  gameHttpOrigin,
  resetWarmUpForTests,
  warmUpServers,
} from "../serverWake";

describe("gameHttpOrigin", () => {
  it("troca ws por http", () => {
    expect(gameHttpOrigin("ws://localhost:8081")).toBe("http://localhost:8081");
  });
  it("troca wss por https e descarta o caminho", () => {
    expect(gameHttpOrigin("wss://x.onrender.com/ws")).toBe("https://x.onrender.com");
  });
  it("devolve null para vazio ou inválido", () => {
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

  it("dispara readiness da API e health do jogo com no-cors", () => {
    warmUpServers(1_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/readiness`, { mode: "no-cors" });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8081/health", { mode: "no-cors" });
  });

  it("respeita a janela de 5 minutos", () => {
    warmUpServers(1_000);
    fetchMock.mockClear();
    warmUpServers(1_000 + WARM_UP_INTERVAL_MS - 1);
    expect(fetchMock).not.toHaveBeenCalled();
    warmUpServers(1_000 + WARM_UP_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("engole fetch que rejeita", async () => {
    fetchMock.mockRejectedValue(new Error("rede"));
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    expect(() => warmUpServers(1_000)).not.toThrow();
    await new Promise((r) => setTimeout(r, 10));
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});
