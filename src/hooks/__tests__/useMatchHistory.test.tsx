import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { server } from "../../test/server";
import { useMatchHistory } from "../useMatchHistory";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

describe("useMatchHistory", () => {
  it("busca o histórico e carimba a hora em que o fetch começou", async () => {
    vi.setSystemTime(new Date("2026-09-27T10:00:00Z"));
    server.use(http.get("http://localhost:5000/matches/m1/history", () => HttpResponse.json({ scenes: [{ uuid: "s1", category: "battle", briefDesc: "", createdAt: "", rounds: [] }] })));
    const { result } = renderHook(() => useMatchHistory("tok", "m1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.history.scenes).toHaveLength(1);
    expect(result.current.data?.fetchStartedAt).toBe(Date.parse("2026-09-27T10:00:00Z"));
    vi.useRealTimers();
  });
});
