// src/pages/__tests__/GamePage.test.tsx
//
// GamePage é a ROTA (Tarefa 12): loading guard + escolha da página pelo papel. Os
// comportamentos de tela (mapa, ação, histórico...) são cobertos por
// GamePlayerPage.test.tsx — aqui só o que é responsabilidade da rota.
import { describe, it, expect } from "vitest";
import { http, HttpResponse, delay } from "msw";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes, useLocation, useNavigationType } from "react-router-dom";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { matchApiFixture, matchAsMasterApi, matchEndedApi } from "../../test/fixtures/match";
import GamePage from "../GamePage";

const baseUrl = "http://localhost:5000";

function renderPage(opts: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(<GamePage />, {
    route: "/campaigns/campaign-1/matches/match-1/game",
    path: "/campaigns/:campaignId/matches/:matchId/game",
    ...opts,
  });
}

describe("GamePage (rota)", () => {
  it("mostra o loading guard enquanto a partida ainda não chegou", async () => {
    server.use(
      http.get(`${baseUrl}/matches/:id`, async () => {
        await delay(30);
        return HttpResponse.json({ match: matchApiFixture });
      }),
      http.get(`${baseUrl}/matches/:id/map`, () => new HttpResponse(null, { status: 204 })),
      http.get(`${baseUrl}/matches/:id/participants`, () =>
        HttpResponse.json({ participants: [] }),
      ),
    );

    renderPage();

    expect(screen.getByText(/carregando partida/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText(/carregando partida/i)).not.toBeInTheDocument(),
    );
  });

  it("monta GamePlayerPage para quem não é mestre", async () => {
    server.use(
      http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json({ match: matchApiFixture })),
      http.get(`${baseUrl}/matches/:id/map`, () => new HttpResponse(null, { status: 204 })),
      http.get(`${baseUrl}/matches/:id/participants`, () =>
        HttpResponse.json({ participants: [] }),
      ),
    );

    renderPage();

    expect(await screen.findByRole("button", { name: /^ação$/i })).toBeInTheDocument();
  });

  // Tarefa 13: o ramo do mestre monta GameMasterPage — rail Fila/Agir, não Ação.
  // Esta rota não muda de caminho.
  it("monta GameMasterPage para o mestre", async () => {
    server.use(
      http.get(`${baseUrl}/matches/:id`, () =>
        HttpResponse.json({ match: matchAsMasterApi("user-1") }),
      ),
      http.get(`${baseUrl}/matches/:id/map`, () => new HttpResponse(null, { status: 204 })),
      http.get(`${baseUrl}/matches/:id/participants`, () =>
        HttpResponse.json({ participants: [] }),
      ),
    );

    renderPage();

    expect(await screen.findByRole("button", { name: /^fila/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^agir$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^ação$/i })).not.toBeInTheDocument();
  });

  it("500 on the match shows the error with 'Tentar de novo', not an endless loading", async () => {
    server.use(
      http.get(`${baseUrl}/matches/:id`, () =>
        HttpResponse.json({ error: "x" }, { status: 500 }),
      ),
    );
    renderPage();
    expect(
      await screen.findByText("Não foi possível carregar a partida", {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/carregando partida/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });

  it("404 on the match shows 'Partida não encontrada' with a way back to the campaign", async () => {
    server.use(
      http.get(`${baseUrl}/matches/:id`, () =>
        HttpResponse.json({ error: "not found" }, { status: 404 }),
      ),
    );
    renderPage();
    expect(await screen.findByText("Partida não encontrada", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para a campanha" })).toHaveAttribute(
      "href",
      "/campaigns/campaign-1",
    );
  });
  // Review Focus 3: /game de uma partida encerrada nunca monta a mesa e sai do histórico.
  describe("finished match", () => {
    function MatchProbe() {
      const location = useLocation();
      return (
        <div data-testid="match-page" data-nav={useNavigationType()} data-state={JSON.stringify(location.state)}>
          {location.pathname}
        </div>
      );
    }

    function renderRoutes() {
      return renderWithProviders(
        <Routes>
          <Route path="/campaigns/:campaignId/matches/:matchId/game" element={<GamePage />} />
          <Route path="/campaigns/:campaignId/matches/:matchId" element={<MatchProbe />} />
        </Routes>,
        { route: "/campaigns/campaign-1/matches/match-1/game" },
      );
    }

    it.each([
      ["player", matchEndedApi()],
      ["master", { ...matchEndedApi(), masterUuid: "user-1" }],
    ])("redirects the %s to the match page with replace", async (_who, match) => {
      server.use(http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json({ match })));
      renderRoutes();
      const page = await screen.findByTestId("match-page");
      expect(page).toHaveTextContent("/campaigns/campaign-1/matches/match-1");
      expect(page).toHaveAttribute("data-nav", "REPLACE");
      // Mesmo se a mesa rebuscar a partida antes de sair, o aviso de encerramento vai junto.
      expect(page).toHaveAttribute("data-state", JSON.stringify({ endedByMaster: true }));
      expect(screen.queryByRole("button", { name: /^fila/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^ação$/i })).not.toBeInTheDocument();
    });
  });
});
