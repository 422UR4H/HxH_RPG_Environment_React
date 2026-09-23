// src/pages/__tests__/GamePage.test.tsx
//
// GamePage é a ROTA (Tarefa 12): loading guard + escolha da página pelo papel. Os
// comportamentos de tela (mapa, ação, histórico...) são cobertos por
// GamePlayerPage.test.tsx — aqui só o que é responsabilidade da rota.
import { describe, it, expect } from "vitest";
import { http, HttpResponse, delay } from "msw";
import { screen, waitFor } from "@testing-library/react";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { matchApiFixture, matchAsMasterApi } from "../../test/fixtures/match";
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

  // Tarefa 13: o ramo do mestre monta GameMasterPage — rail Fila/Fichas, não Ação.
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

    expect(await screen.findByRole("button", { name: /^fila$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^fichas$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^ação$/i })).not.toBeInTheDocument();
  });
});
