import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { matchApiFixture } from "../../test/fixtures/match";
import { masterUserFixture } from "../../test/fixtures/user";
import EditMatchPage from "../EditMatchPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseUrl = "http://localhost:5000";

function setup() {
  server.use(
    http.get(`${baseUrl}/matches/:id`, () =>
      HttpResponse.json({
        match: {
          ...matchApiFixture,
          masterUuid: masterUserFixture.user.uuid,
          description: "Descrição atual",
        },
      }),
    ),
  );
  const captured: { body?: Record<string, unknown> } = {};
  server.use(
    http.patch(`${baseUrl}/matches/:id`, async ({ request }) => {
      captured.body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ match: matchApiFixture });
    }),
  );
  renderWithProviders(<EditMatchPage />, {
    route: "/campaigns/campaign-1/matches/match-1/edit",
    path: "/campaigns/:campaignId/matches/:matchId/edit",
    user: masterUserFixture,
  });
  return captured;
}

describe("EditMatchPage — empty description", () => {
  beforeEach(() => mockNavigate.mockReset());

  it("sends an empty string when the description is cleared", async () => {
    const captured = setup();
    const u = userEvent.setup();
    await u.clear(await screen.findByLabelText(/Descrição Completa/));
    await u.click(screen.getByRole("button", { name: /Salvar/i }));
    await waitFor(() => expect(captured.body).toBeDefined());
    expect(captured.body).toMatchObject({ description: "" });
  });

  it("keeps sending the current description when untouched", async () => {
    const captured = setup();
    const u = userEvent.setup();
    await screen.findByDisplayValue("Descrição atual");
    await u.click(screen.getByRole("button", { name: /Salvar/i }));
    await waitFor(() => expect(captured.body).toBeDefined());
    expect(captured.body).toMatchObject({ description: "Descrição atual" });
  });
});
