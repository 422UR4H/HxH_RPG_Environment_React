import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { server } from "../../test/server";
import { campaignApiFixture } from "../../test/fixtures/campaign";
import { matchApiFixture } from "../../test/fixtures/match";
import { useInheritableBoards } from "../useInheritableBoards";

const baseUrl = "http://localhost:5000";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const match = (uuid: string, title: string, gameStartAt?: string) => ({
  ...matchApiFixture,
  uuid,
  title,
  ...(gameStartAt ? { gameStartAt } : {}),
});

describe("useInheritableBoards", () => {
  it("agrupa por mapa as outras partidas já iniciadas da campanha, a mais recente primeiro", async () => {
    const mapOf: Record<string, string> = { a: "map-1", b: "map-2", d: "map-1" };
    const fetched: string[] = [];
    server.use(
      http.get(`${baseUrl}/campaigns/:id`, () =>
        HttpResponse.json({
          campaign: {
            ...campaignApiFixture,
            matches: [
              match("self", "Esta Partida", "2025-12-20T19:00:00Z"),
              match("a", "Partida A", "2025-12-01T19:00:00Z"),
              match("b", "Partida B", "2025-12-05T19:00:00Z"),
              match("c", "Partida C"), // nunca começou: não tem tabuleiro
              match("d", "Partida D", "2025-12-10T19:00:00Z"),
            ],
          },
        }),
      ),
      http.get(`${baseUrl}/matches/:id/map`, ({ params }) => {
        const id = params.id as string;
        fetched.push(id);
        return HttpResponse.json({
          matchMap: { matchUuid: id, mapUuid: mapOf[id], attachedAt: "2025-12-01T00:00:00Z" },
        });
      }),
    );

    const { result } = renderHook(
      () => useInheritableBoards("tok", "campaign-1", "self", true),
      { wrapper },
    );

    await waitFor(() => expect(result.current["map-1"]).toHaveLength(2));
    expect(result.current["map-1"]).toEqual([
      { matchUuid: "d", title: "Partida D", startedAt: "2025-12-10T19:00:00Z" },
      { matchUuid: "a", title: "Partida A", startedAt: "2025-12-01T19:00:00Z" },
    ]);
    expect(result.current["map-2"]).toEqual([
      { matchUuid: "b", title: "Partida B", startedAt: "2025-12-05T19:00:00Z" },
    ]);
    expect([...fetched].sort()).toEqual(["a", "b", "d"]);
  });

  it("ignora a partida sem mapa anexado (204)", async () => {
    server.use(
      http.get(`${baseUrl}/campaigns/:id`, () =>
        HttpResponse.json({
          campaign: {
            ...campaignApiFixture,
            matches: [
              match("a", "Partida A", "2025-12-01T19:00:00Z"),
              match("b", "Partida B", "2025-12-05T19:00:00Z"),
            ],
          },
        }),
      ),
      http.get(`${baseUrl}/matches/:id/map`, ({ params }) =>
        params.id === "a"
          ? new HttpResponse(null, { status: 204 })
          : HttpResponse.json({
              matchMap: { matchUuid: "b", mapUuid: "map-1", attachedAt: "2025-12-01T00:00:00Z" },
            }),
      ),
    );

    const { result } = renderHook(
      () => useInheritableBoards("tok", "campaign-1", "self", true),
      { wrapper },
    );

    await waitFor(() => expect(result.current["map-1"]).toHaveLength(1));
    expect(Object.keys(result.current)).toEqual(["map-1"]);
    expect(result.current["map-1"][0].matchUuid).toBe("b");
  });

  it("uma busca de mapa que falha (500) não derruba as outras", async () => {
    let failedCalls = 0;
    server.use(
      http.get(`${baseUrl}/campaigns/:id`, () =>
        HttpResponse.json({
          campaign: {
            ...campaignApiFixture,
            matches: [
              match("a", "Partida A", "2025-12-01T19:00:00Z"),
              match("b", "Partida B", "2025-12-05T19:00:00Z"),
              match("c", "Partida C", "2025-12-08T19:00:00Z"),
            ],
          },
        }),
      ),
      http.get(`${baseUrl}/matches/:id/map`, ({ params }) => {
        const id = params.id as string;
        if (id === "b") {
          failedCalls++;
          return HttpResponse.json({ detail: "boom" }, { status: 500 });
        }
        return HttpResponse.json({
          matchMap: { matchUuid: id, mapUuid: id === "a" ? "map-1" : "map-2", attachedAt: "2025-12-01T00:00:00Z" },
        });
      }),
    );

    const { result } = renderHook(
      () => useInheritableBoards("tok", "campaign-1", "self", true),
      { wrapper },
    );

    await waitFor(() => expect(Object.keys(result.current).sort()).toEqual(["map-1", "map-2"]));
    expect(result.current["map-1"].map((s) => s.matchUuid)).toEqual(["a"]);
    expect(result.current["map-2"].map((s) => s.matchUuid)).toEqual(["c"]);
    // Espera a nova tentativa (retry: 1) acabar dentro do teste, com o handler ainda no ar.
    await waitFor(() => expect(failedCalls).toBe(2), { timeout: 3000 });
    expect(result.current["map-2"].map((s) => s.matchUuid)).toEqual(["c"]);
  });

  it("desligado, não busca nada", async () => {
    let calls = 0;
    server.use(
      http.get(`${baseUrl}/campaigns/:id`, () => {
        calls++;
        return HttpResponse.json({ campaign: campaignApiFixture });
      }),
    );

    const { result } = renderHook(
      () => useInheritableBoards("tok", "campaign-1", "self", false),
      { wrapper },
    );

    await new Promise((r) => setTimeout(r, 20));
    expect(calls).toBe(0);
    expect(result.current).toEqual({});
  });
});
