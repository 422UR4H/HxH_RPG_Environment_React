import { describe, it, expect, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useMatchEndedRedirect } from "../useMatchEndedRedirect";

const MATCH = "/campaigns/c1/matches/m1";

function Table({ endedRef }: { endedRef: { set?: (v: boolean) => void } }) {
  const [ended, setEnded] = useState(false);
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

function setup() {
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const endedRef: { set?: (v: boolean) => void } = {};
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/campaigns/c1", MATCH, `${MATCH}/game`]} initialIndex={2}>
        <Routes>
          <Route path="/campaigns/:campaignId" element={<div>campanha</div>} />
          <Route path="/campaigns/:campaignId/matches/:matchId" element={<MatchProbe />} />
          <Route path="/campaigns/:campaignId/matches/:matchId/game" element={<Table endedRef={endedRef} />} />
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

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["matchDetails", "tok", "m1"] });
    expect(screen.getByText("página da partida")).toBeInTheDocument();
    expect(screen.getByTestId("state")).toHaveTextContent(JSON.stringify({ endedByMaster: true }));

    // /game saiu do histórico: voltar cai na entrada anterior (a própria página da partida).
    act(() => screen.getByRole("button", { name: "voltar" }).click());
    expect(screen.queryByText("mesa")).not.toBeInTheDocument();
    expect(screen.getByText("página da partida")).toBeInTheDocument();
  });
});
