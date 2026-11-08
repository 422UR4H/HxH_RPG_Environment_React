import { describe, it, expect, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMatchEndedRedirect } from "../useMatchEndedRedirect";

const MATCH = "/campaigns/c1/matches/m1";

function Table({ endedRef, queryFn }: { endedRef: { set?: (v: boolean) => void }; queryFn?: () => Promise<unknown> }) {
  const [ended, setEnded] = useState(false);
  // A mesa observa a mesma partida que a página da partida (como a GamePage).
  useQuery({ queryKey: ["matchDetails", "tok", "m1"], queryFn: queryFn ?? (async () => ({})), staleTime: Infinity });
  endedRef.set = setEnded;
  useMatchEndedRedirect({ token: "tok", campaignId: "c1", matchId: "m1", ended });
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

function setup(queryFn?: () => Promise<unknown>) {
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const endedRef: { set?: (v: boolean) => void } = {};
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/campaigns/c1", MATCH, `${MATCH}/game`]} initialIndex={2}>
        <Routes>
          <Route path="/campaigns/:campaignId" element={<div>campanha</div>} />
          <Route path="/campaigns/:campaignId/matches/:matchId" element={<MatchProbe />} />
          <Route path="/campaigns/:campaignId/matches/:matchId/game" element={<Table endedRef={endedRef} queryFn={queryFn} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { invalidate, endedRef };
}

describe("useMatchEndedRedirect", () => {
  it("stays on the table while the match is live", () => {
    const { invalidate } = setup();
    expect(screen.getByText("mesa")).toBeInTheDocument();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("on end: refreshes the match and replaces /game with the match page; Back never returns to the table", () => {
    const { invalidate, endedRef } = setup();
    act(() => endedRef.set?.(true));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["matchDetails", "tok", "m1"], refetchType: "none" });
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
});
