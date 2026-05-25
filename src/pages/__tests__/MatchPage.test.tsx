// src/pages/__tests__/MatchPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { matchFixture, matchAsMaster, matchOngoing, matchEnded } from "../../test/fixtures/match";
import { masterUserFixture, userFixture } from "../../test/fixtures/user";
import MatchPage from "../MatchPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseUrl = "http://localhost:5000";

function renderPage(opts: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(<MatchPage />, {
    route: "/campaigns/campaign-1/matches/match-1",
    path: "/campaigns/:campaignId/matches/:matchId",
    ...opts,
  });
}

describe("MatchPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  describe("loading & error", () => {
    it("mostra 'Carregando partida...' enquanto resolve", () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, async () => {
          await new Promise((r) => setTimeout(r, 50));
          return HttpResponse.json({ match: matchFixture });
        }),
      );
      renderPage();
      expect(screen.getByText(/Carregando partida\.\.\./i)).toBeInTheDocument();
    });

    it("mostra erro se a API responde 500", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({ error: "x" }, { status: 500 }),
        ),
      );
      renderPage();
      expect(
        await screen.findByText(/Falha ao carregar detalhes da partida/i, {}, { timeout: 5000 }),
      ).toBeInTheDocument();
    });

    it("mostra 'Partida não encontrada' quando response é null", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json({ match: null })),
      );
      renderPage();
      expect(await screen.findByText(/Partida n[ãa]o encontrada/i)).toBeInTheDocument();
    });

    it("renderiza estado vazio se não há token", () => {
      const { container } = renderPage({ token: null });
      expect(container.querySelector("h1")).toBeNull();
    });
  });

  describe("status da partida", () => {
    it("exibe 'AGENDADA' quando gameStartAt é null", async () => {
      renderPage();
      expect(await screen.findByText("AGENDADA")).toBeInTheDocument();
    });

    it("exibe 'EM ANDAMENTO' quando há gameStartAt mas sem storyEndAt", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json({ match: matchOngoing() })),
      );
      renderPage();
      expect(await screen.findByText("EM ANDAMENTO")).toBeInTheDocument();
    });

    it("exibe 'ENCERRADA' e descrição final quando storyEndAt existe", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json({ match: matchEnded() })),
      );
      renderPage();
      expect(await screen.findByText("ENCERRADA")).toBeInTheDocument();
      expect(await screen.findByText(/Partida encerrada/i)).toBeInTheDocument();
    });
  });

  describe("como Master", () => {
    it("exibe 'Abrir Lobby' quando a partida não começou", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({ match: matchAsMaster(masterUserFixture.user.uuid) }),
        ),
      );
      renderPage({ user: masterUserFixture });
      expect(await screen.findByText(/Abrir Lobby/i)).toBeInTheDocument();
    });

    it("exibe botão 'Gerenciar' quando a partida não começou", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({ match: matchAsMaster(masterUserFixture.user.uuid) }),
        ),
      );
      renderPage({ user: masterUserFixture });
      expect(await screen.findByText(/Gerenciar/i)).toBeInTheDocument();
    });

    it("clicar em 'Gerenciar' exibe opções Editar e Excluir", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({ match: matchAsMaster(masterUserFixture.user.uuid) }),
        ),
      );
      renderPage({ user: masterUserFixture });
      const u = userEvent.setup();
      await u.click(await screen.findByText(/Gerenciar/i));
      expect(await screen.findByText(/Editar/i)).toBeInTheDocument();
      expect(await screen.findByText(/Excluir/i)).toBeInTheDocument();
    });

    it("clicar em 'Editar' no menu navega para a página de edição", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({ match: matchAsMaster(masterUserFixture.user.uuid) }),
        ),
      );
      renderPage({ user: masterUserFixture });
      const u = userEvent.setup();
      await u.click(await screen.findByText(/Gerenciar/i));
      await u.click(await screen.findByText(/Editar/i));
      expect(mockNavigate).toHaveBeenCalledWith(
        "/campaigns/campaign-1/matches/match-1/edit",
      );
    });

    it("clicar em 'Excluir' no menu exibe confirmação de exclusão", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({ match: matchAsMaster(masterUserFixture.user.uuid) }),
        ),
      );
      renderPage({ user: masterUserFixture });
      const u = userEvent.setup();
      await u.click(await screen.findByText(/Gerenciar/i));
      await u.click(await screen.findByText(/Excluir/i));
      expect(await screen.findByText(/Tem certeza que deseja excluir esta partida/i)).toBeInTheDocument();
    });

    it("NÃO exibe 'Gerenciar' quando a partida já começou", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({ match: matchOngoing() }),
        ),
      );
      renderPage({ user: masterUserFixture });
      await screen.findByText("EM ANDAMENTO");
      expect(screen.queryByText(/Gerenciar/i)).not.toBeInTheDocument();
    });

    it("clicar em 'Abrir Lobby' mostra dialog de confirmação", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({ match: matchAsMaster(masterUserFixture.user.uuid) }),
        ),
      );
      renderPage({ user: masterUserFixture });
      const u = userEvent.setup();
      await u.click(await screen.findByText(/Abrir Lobby/i));
      expect(
        await screen.findByText(/Tem certeza que deseja abrir o lobby/i),
      ).toBeInTheDocument();
    });

    it("clicar em 'Abrir Lobby' no dialog navega pro lobby", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({ match: matchAsMaster(masterUserFixture.user.uuid) }),
        ),
      );
      renderPage({ user: masterUserFixture });
      const u = userEvent.setup();
      await u.click(await screen.findByText(/Abrir Lobby/i));
      const buttons = await screen.findAllByText(/Abrir Lobby/i);
      await u.click(buttons[buttons.length - 1]);
      expect(mockNavigate).toHaveBeenCalledWith("/campaigns/campaign-1/matches/match-1/lobby");
    });
  });

  describe("como Player", () => {
    it("exibe 'Inscrever-se' se há sheetId no state e partida não começou", async () => {
      renderPage({ user: userFixture, state: { sheetId: "sheet-1" } });
      expect(await screen.findByText(/Inscrever-se/i)).toBeInTheDocument();
    });

    it("NÃO exibe 'Inscrever-se' se a partida já começou", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json({ match: matchOngoing() })),
      );
      renderPage({ user: userFixture, state: { sheetId: "sheet-1" } });
      await screen.findByText("EM ANDAMENTO");
      expect(screen.queryByText(/Inscrever-se/i)).not.toBeInTheDocument();
    });

    it("clicar em 'Inscrever-se' mostra ConfirmDialog", async () => {
      renderPage({ user: userFixture, state: { sheetId: "sheet-1" } });
      const u = userEvent.setup();
      await u.click(await screen.findByText(/Inscrever-se/i));
      expect(
        await screen.findByText(/Tem certeza que deseja se inscrever/i),
      ).toBeInTheDocument();
    });
  });

  describe("sidebar dependente do status", () => {
    it("antes do gameStart busca /enrollments e renderiza", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id/enrollments`, () =>
          HttpResponse.json({
            enrollments: [
              {
                uuid: "enr-1",
                status: "pending" as const,
                createdAt: "2025-01-01T00:00:00.000Z",
                player: { uuid: "user-x", nick: "PlayerX" },
                characterSheet: {
                  uuid: "sheet-x",
                  nickName: "Enrolled",
                  createdAt: "2025-01-01T00:00:00.000Z",
                  updatedAt: "2025-01-01T00:00:00.000Z",
                },
              },
            ],
          }),
        ),
      );
      renderPage();
      expect(await screen.findByText("Enrolled")).toBeInTheDocument();
    });

    it("depois do gameStart busca /participants e renderiza", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json({ match: matchOngoing() })),
        http.get(`${baseUrl}/matches/:id/participants`, () =>
          HttpResponse.json({
            participants: [
              {
                uuid: "part-1",
                joinedAt: "2025-12-01T19:06:00Z",
                leftAt: null,
                characterSheet: {
                  uuid: "sheet-y",
                  nickName: "Participant",
                  createdAt: "2025-01-01T00:00:00.000Z",
                  updatedAt: "2025-01-01T00:00:00.000Z",
                  private: null,
                },
              },
            ],
          }),
        ),
      );
      renderPage();
      expect(await screen.findByText("Participant")).toBeInTheDocument();
    });
  });

  describe("sidebar de regras", () => {
    it("exibe a sidebar de regras com as seções", async () => {
      renderPage();
      expect(
        await screen.findByRole("heading", { name: /^REGRAS$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Sistema de Combate" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Progressão de Personagens" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Nen & Habilidades" }),
      ).toBeInTheDocument();
    });
  });
});
