import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { masterUserFixture } from "../../test/fixtures/user";
import { mapFixture } from "../../test/fixtures/map";
import EditMapPage from "../EditMapPage";

const baseUrl = "http://localhost:5000";

function renderPage() {
  server.use(
    http.get(`${baseUrl}/maps/:mapId`, () =>
      HttpResponse.json({ map: mapFixture }, { status: 200 }),
    ),
  );
  return renderWithProviders(<EditMapPage />, {
    route: "/campaigns/campaign-1/maps/map-1/edit",
    path: "/campaigns/:campaignId/maps/:mapId/edit",
    user: masterUserFixture,
  });
}

describe("EditMapPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exibe loading enquanto carrega o mapa", () => {
    server.use(
      http.get(`${baseUrl}/maps/:mapId`, async () => {
        await new Promise(() => {}); // never resolves
      }),
    );
    renderWithProviders(<EditMapPage />, {
      route: "/campaigns/campaign-1/maps/map-1/edit",
      path: "/campaigns/:campaignId/maps/:mapId/edit",
      user: masterUserFixture,
    });
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it("após carregar, exibe o nome do mapa no campo", async () => {
    renderPage();
    const nameInput = await screen.findByPlaceholderText(/nome do mapa/i);
    expect(nameInput).toHaveValue(mapFixture.name);
  });

  it("salvar chama PUT com os dados atualizados", async () => {
    let capturedBody: unknown;
    server.use(
      http.put(`${baseUrl}/maps/:mapId`, async ({ request }) => {
        capturedBody = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderPage();
    await screen.findByPlaceholderText(/nome do mapa/i);
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));
    await waitFor(() => {
      expect(capturedBody).toMatchObject({ name: mapFixture.name });
    });
  });

  it("após salvar, permanece na página (sem navegar)", async () => {
    server.use(
      http.put(`${baseUrl}/maps/:mapId`, () =>
        new HttpResponse(null, { status: 204 }),
      ),
    );
    renderPage();
    await screen.findByPlaceholderText(/nome do mapa/i);
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/nome do mapa/i)).toBeInTheDocument();
    });
  });
});
