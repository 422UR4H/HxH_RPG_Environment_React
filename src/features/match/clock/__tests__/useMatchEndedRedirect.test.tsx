import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMatchEndedRedirect } from "../useMatchEndedRedirect";
import { consumeEndedNotice, rememberMatchPageEntry } from "../matchHistoryEntry";

// Espia as chamadas de navegação sem trocar o roteador de memória de verdade.
const navigateSpy = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => {
      const navigate = actual.useNavigate();
      return useCallback(
        (...args: Parameters<typeof navigate>) => {
          navigateSpy(...args);
          return navigate(...(args as [never]));
        },
        [navigate],
      );
    },
  };
});

function setIdx(idx?: number) {
  window.history.replaceState(idx === undefined ? null : { idx }, "");
}

const MATCH = "/campaigns/c1/matches/m1";

const PAYLOAD = { matchId: "m1", storyAt: "2000-05-10T14:30:45", gameEndAt: "2026-11-08T10:00:00Z" };

function Table({ endedRef, queryFn }: { endedRef: { set?: (v: boolean) => void }; queryFn?: () => Promise<unknown> }) {
  const [ended, setEnded] = useState(false);
  // A mesa observa a mesma partida que a página da partida (como a GamePage).
  useQuery({ queryKey: ["matchDetails", "tok", "m1"], queryFn: queryFn ?? (async () => ({})), staleTime: Infinity });
  endedRef.set = setEnded;
  useMatchEndedRedirect({ token: "tok", campaignId: "c1", matchId: "m1", ended, matchEnded: ended ? PAYLOAD : null });
  return <div>mesa</div>;
}

function MatchProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div>
      <span>página da partida</span>
      <span data-testid="state">{JSON.stringify(location.state)}</span>
      <button type="button" onClick={() => navigate(-1)}>voltar</button>
    </div>
  );
}

function setup(queryFn?: () => Promise<unknown>, withLobby = false) {
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const endedRef: { set?: (v: boolean) => void } = {};
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={withLobby ? ["/campaigns/c1", MATCH, `${MATCH}/lobby`, `${MATCH}/game`] : ["/campaigns/c1", MATCH, `${MATCH}/game`]}
        initialIndex={withLobby ? 3 : 2}
      >
        <Routes>
          <Route path="/campaigns/:campaignId/matches/:matchId/lobby" element={<div>lobby</div>} />
          <Route path="/campaigns/:campaignId" element={<div>campanha</div>} />
          <Route path="/campaigns/:campaignId/matches/:matchId" element={<MatchProbe />} />
          <Route path="/campaigns/:campaignId/matches/:matchId/game" element={<Table endedRef={endedRef} queryFn={queryFn} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { invalidate, endedRef, queryClient };
}

describe("useMatchEndedRedirect", () => {
  beforeEach(() => {
    navigateSpy.mockReset();
    sessionStorage.clear();
    setIdx(undefined);
  });

  it("on end: goes back to the original match page entry when it is remembered", () => {
    // Campanha(0) → partida(1) → lobby(2) → mesa(3): a página da partida guardou o índice 1.
    setIdx(1);
    rememberMatchPageEntry("m1");
    setIdx(3);
    const { invalidate, endedRef } = setup(undefined, true);
    act(() => endedRef.set?.(true));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["matchDetails", "tok", "m1"], refetchType: "none" });
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(-2);
    expect(screen.getByText("página da partida")).toBeInTheDocument();
    // O aviso vai pelo sessionStorage: voltar no histórico não leva estado de rota.
    expect(screen.getByTestId("state")).toHaveTextContent("null");
    expect(consumeEndedNotice("m1")).toBe(true);
  });

  it("stays on the table while the match is live", () => {
    const { invalidate } = setup();
    expect(screen.getByText("mesa")).toBeInTheDocument();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("on end without a remembered entry: refreshes the match and replaces /game with the match page; Back never returns to the table", () => {
    const { invalidate, endedRef } = setup();
    act(() => endedRef.set?.(true));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["matchDetails", "tok", "m1"], refetchType: "none" });
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(MATCH, { replace: true, state: { endedByMaster: true } });
    expect(screen.getByText("página da partida")).toBeInTheDocument();
    expect(screen.getByTestId("state")).toHaveTextContent(JSON.stringify({ endedByMaster: true }));

    // /game saiu do histórico: voltar cai na entrada anterior (a própria página da partida).
    act(() => screen.getByRole("button", { name: "voltar" }).click());
    expect(screen.queryByText("mesa")).not.toBeInTheDocument();
    expect(screen.getByText("página da partida")).toBeInTheDocument();
  });

  it("on end: marks the match stale without refetching the still-mounted table's query", async () => {
    const queryFn = vi.fn(async () => ({ id: "m1" }));
    const { endedRef } = setup(queryFn);
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));

    act(() => endedRef.set?.(true));

    // Rebuscar com a /game montada faria a mesa ver `gameEndAt` e trocar a navegação por
    // um <Navigate> sem `endedByMaster`.
    await new Promise((r) => setTimeout(r, 0));
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("state")).toHaveTextContent(JSON.stringify({ endedByMaster: true }));
  });

  it("on end: writes the end into the cached match at once, without any refetch", async () => {
    const queryFn = vi.fn(async () => ({ id: "m1" }));
    const { endedRef, queryClient } = setup(queryFn);
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));

    act(() => endedRef.set?.(true));

    expect(queryClient.getQueryData(["matchDetails", "tok", "m1"])).toEqual({
      id: "m1",
      gameEndAt: "2026-11-08T10:00:00Z",
      storyEndAt: "2000-05-10",
      storyEndTime: "14:30:45",
    });
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});
