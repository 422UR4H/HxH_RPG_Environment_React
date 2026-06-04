// src/pages/__tests__/GamePage.test.tsx
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { matchFixture } from "../../test/fixtures/match";
import { mapFixture } from "../../test/fixtures/map";
import GamePage from "../GamePage";

const baseUrl = "http://localhost:5000";

function renderPage(opts: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(<GamePage />, {
    route: "/campaigns/campaign-1/matches/match-1/game",
    path: "/campaigns/:campaignId/matches/:matchId/game",
    ...opts,
  });
}

describe("GamePage", () => {
  it("exibe mensagem quando nenhum mapa está anexado", async () => {
    server.use(
      http.get(`${baseUrl}/matches/:id/map`, () =>
        new HttpResponse(null, { status: 204 }),
      ),
      http.get(`${baseUrl}/matches/:id`, () =>
        HttpResponse.json({ match: matchFixture }),
      ),
      http.get(`${baseUrl}/matches/:id/participants`, () =>
        HttpResponse.json({ participants: [] }),
      ),
    );

    renderPage();

    expect(
      await screen.findByText(/nenhum mapa anexado/i),
    ).toBeInTheDocument();
  });

  it("não exibe mensagem de erro quando mapa está carregado", async () => {
    server.use(
      http.get(`${baseUrl}/matches/:id/map`, () =>
        HttpResponse.json({
          match_map: {
            match_uuid: "match-1",
            map_uuid: mapFixture.id,
            attached_at: "2026-06-04T00:00:00Z",
          },
        }),
      ),
      http.get(`${baseUrl}/matches/:id`, () =>
        HttpResponse.json({ match: matchFixture }),
      ),
      http.get(`${baseUrl}/matches/:id/participants`, () =>
        HttpResponse.json({ participants: [] }),
      ),
      http.get(`${baseUrl}/maps/:id`, () =>
        HttpResponse.json({ map: mapFixture }),
      ),
    );

    renderPage();

    await waitFor(() => {
      expect(
        screen.queryByText(/nenhum mapa anexado/i),
      ).not.toBeInTheDocument();
    });
  });
});
