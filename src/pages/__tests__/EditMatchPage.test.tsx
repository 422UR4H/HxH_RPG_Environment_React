import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { matchApiFixture } from "../../test/fixtures/match";
import { campaignApiFixture } from "../../test/fixtures/campaign";
import { masterUserFixture } from "../../test/fixtures/user";
import EditMatchPage from "../EditMatchPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseUrl = "http://localhost:5000";

function setup(campaign?: Record<string, unknown>) {
  if (campaign) {
    server.use(http.get(`${baseUrl}/campaigns/:id`, () => HttpResponse.json({ campaign })));
  }
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

describe("EditMatchPage — session in the past", () => {
  beforeEach(() => mockNavigate.mockReset());

  it("lets the master fix only the title: no session error and no gameScheduledAt in the PATCH", async () => {
    // O fixture tem a sessão em 2025 (já passou, partida ainda não iniciada).
    const captured = setup();
    const u = userEvent.setup();
    const title = await screen.findByLabelText(/Título da Partida/i);
    await screen.findByDisplayValue("Descrição atual");
    await u.clear(title);
    await u.type(title, "Título corrigido");
    await u.click(screen.getByRole("button", { name: /Salvar/i }));
    await waitFor(() => expect(captured.body).toBeDefined());
    expect(captured.body).toMatchObject({ title: "Título corrigido" });
    expect(captured.body).not.toHaveProperty("gameScheduledAt");
    expect(screen.queryByText("Escolha um horário a partir de agora.")).not.toBeInTheDocument();
  });

  it("tells the master the session has passed and that picking a new date reschedules it", async () => {
    setup();
    await screen.findByDisplayValue("Descrição atual");
    expect(screen.getByRole("status")).toHaveTextContent(
      "A data desta sessão já passou. Escolha uma nova data para reagendar.",
    );
  });

  describe("rescheduling", () => {
    beforeEach(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 5, 15, 12, 0) }));
    afterEach(() => vi.useRealTimers());

    it("sends the new date and drops the note when a future day is picked", async () => {
      const captured = setup();
      const u = userEvent.setup();
      await screen.findByDisplayValue("Descrição atual");
      await u.click(screen.getByLabelText("Data e Hora da Sessão"));
      const dialog = screen.getByRole("dialog", { name: "Escolher data" });
      // O calendário abre no mês de hoje, não no da data antiga (dez/2025).
      await u.click(within(dialog).getByRole("button", { name: /\b20 de junho de 2026/i }));
      await u.keyboard("{Escape}");
      expect(screen.queryByText(/já passou/)).not.toBeInTheDocument();
      await u.click(screen.getByRole("button", { name: /Salvar/i }));
      await waitFor(() => expect(captured.body).toBeDefined());
      expect(captured.body?.gameScheduledAt).toMatch(/^2026-06-20T/);
    });

    it("flags another past date with the error instead of the note", async () => {
      const captured = setup();
      const u = userEvent.setup();
      await screen.findByDisplayValue("Descrição atual");
      await u.click(screen.getByLabelText("Data e Hora da Sessão"));
      const dialog = screen.getByRole("dialog", { name: "Escolher data" });
      await u.click(within(dialog).getByRole("button", { name: /\b15 de junho de 2026/i }));
      await u.selectOptions(within(dialog).getByLabelText("Hora"), "11");
      await u.selectOptions(within(dialog).getByLabelText("Minuto"), "00");
      expect(await screen.findByRole("alert")).toHaveTextContent("Escolha um horário a partir de agora.");
      expect(screen.queryByText(/já passou/)).not.toBeInTheDocument();
      await u.keyboard("{Escape}");
      await u.click(screen.getByRole("button", { name: /Salvar/i }));
      expect(captured.body).toBeUndefined();
    });
  });

  it("flags a story start outside the campaign inline and skips the API", async () => {
    const captured = setup({ ...campaignApiFixture, storyStartAt: "2026-01-01" });
    const u = userEvent.setup();
    await screen.findByDisplayValue("Descrição atual");
    await waitFor(() =>
      expect(screen.getByLabelText("Data de Início na História")).toBeInTheDocument(),
    );
    // Dá tempo da campanha chegar antes de enviar.
    await new Promise((r) => setTimeout(r, 100));
    await u.click(screen.getByRole("button", { name: /Salvar/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A data de início na história deve ser igual ou posterior ao início da campanha.",
    );
    expect(captured.body).toBeUndefined();
  });
});
