// src/pages/__tests__/CampaignPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { campaignFixture, campaignAsMaster } from "../../test/fixtures/campaign";
import { pendingSheetFixture } from "../../test/fixtures/sheet";
import { masterUserFixture, userFixture } from "../../test/fixtures/user";
import CampaignPage from "../CampaignPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseUrl = "http://localhost:5000";

function renderPage() {
  return renderWithProviders(<CampaignPage />, {
    route: "/campaigns/campaign-1",
    path: "/campaigns/:id",
  });
}

describe("CampaignPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  describe("loading & error", () => {
    it("mostra 'Carregando campanha...' enquanto a request resolve", () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, async () => {
          await new Promise((r) => setTimeout(r, 50));
          return HttpResponse.json({ campaign: campaignFixture });
        }),
      );
      renderPage();
      expect(screen.getByText(/Carregando campanha\.\.\./i)).toBeInTheDocument();
    });

    it("mostra mensagem de erro se a API responde 500", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ error: "server error" }, { status: 500 }),
        ),
      );
      renderPage();
      expect(
        await screen.findByText(/Falha ao carregar detalhes da campanha/i, {}, { timeout: 5000 }),
      ).toBeInTheDocument();
    });

    it("mostra 'Campanha não encontrada' quando response é null", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () => HttpResponse.json({ campaign: null })),
      );
      renderPage();
      expect(await screen.findByText(/Campanha n[ãa]o encontrada/i)).toBeInTheDocument();
    });
  });

  describe("como Master", () => {
    it("exibe botão 'Criar NPC' na sidebar", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ campaign: campaignAsMaster(masterUserFixture.user.uuid) }),
        ),
      );
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1", path: "/campaigns/:id", user: masterUserFixture,
      });
      expect(await screen.findByText(/Criar NPC/i)).toBeInTheDocument();
    });

    it("exibe botão 'Criar Partida' no main content", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ campaign: campaignAsMaster(masterUserFixture.user.uuid) }),
        ),
      );
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1", path: "/campaigns/:id", user: masterUserFixture,
      });
      expect(await screen.findByText(/Criar Partida/i)).toBeInTheDocument();
    });

    it("lista fichas pendentes da campanha inteira", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({
            campaign: { ...campaignAsMaster(masterUserFixture.user.uuid), pendingSheets: [pendingSheetFixture] },
          }),
        ),
      );
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1", path: "/campaigns/:id", user: masterUserFixture,
      });
      expect(await screen.findByText("PendingChar")).toBeInTheDocument();
    });
  });

  describe("como Player com ficha", () => {
    it("NÃO exibe botões de Master", async () => {
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1", path: "/campaigns/:id", user: userFixture,
      });
      expect(await screen.findByText(campaignFixture.name.toUpperCase())).toBeInTheDocument();
      expect(screen.queryByText(/Criar NPC/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Criar Partida/i)).not.toBeInTheDocument();
    });

    it("exibe 'Submeter Ficha' quando location.state tem sheetId", async () => {
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1", path: "/campaigns/:id", user: userFixture,
        state: { sheetId: "sheet-1", sheetNick: "MyChar" },
      });
      expect(await screen.findByText(/Submeter Ficha/i)).toBeInTheDocument();
    });

    it("mostra erro de conflito 409 ao submeter ficha com nick duplicado", async () => {
      const conflictNick = "DupeNick";
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({
            campaign: {
              ...campaignFixture,
              characterSheets: [
                { uuid: "existing-sheet", nickName: conflictNick, playerUuid: "other-user", coverUrl: null, avatarUrl: null, createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z", fullName: "Existing", alignment: "Neutral", characterClass: "Especialista", birthday: "2000-01-01", categoryName: "Emissor", level: 1, points: 0, currExp: 0, nextLvlBaseExp: 100, talentLvl: 1, physicalsLvl: 1, mentalsLvl: 1, spiritualsLvl: 1, skillsLvl: 1, stamina: { min: 0, current: 100, max: 100 }, health: { min: 0, current: 100, max: 100 } },
              ],
            },
          }),
        ),
      );
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1", path: "/campaigns/:id", user: userFixture,
        state: { sheetId: "sheet-1", sheetNick: conflictNick },
      });
      const user = userEvent.setup();
      const submitButton = await screen.findByText(/Submeter Ficha/i);
      await user.click(submitButton);
      expect(await screen.findByText(/Já existe um personagem com o nick/i)).toBeInTheDocument();
    });
  });

  describe("navegação", () => {
    it("clicar em personagem na sidebar chama navigate para /charactersheet/:uuid", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({
            campaign: {
              ...campaignAsMaster(masterUserFixture.user.uuid),
              characterSheets: [
                {
                  uuid: "sheet-clickable",
                  nickName: "Clickable",
                  playerUuid: "user-2",
                  coverUrl: null,
                  avatarUrl: null,
                  fullName: "Click Me",
                  characterClass: "Especialista",
                  alignment: "Neutral",
                  birthday: "2000-01-01",
                  categoryName: "Emissor",
                  level: 1,
                  points: 0,
                  currExp: 0,
                  nextLvlBaseExp: 100,
                  talentLvl: 1,
                  physicalsLvl: 1,
                  mentalsLvl: 1,
                  spiritualsLvl: 1,
                  skillsLvl: 1,
                  stamina: { min: 0, current: 100, max: 100 },
                  health: { min: 0, current: 100, max: 100 },
                  createdAt: "2025-01-01T00:00:00.000Z",
                  updatedAt: "2025-01-01T00:00:00.000Z",
                },
              ],
            },
          }),
        ),
      );
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1", path: "/campaigns/:id", user: masterUserFixture,
      });
      const user = userEvent.setup();
      const charItem = await screen.findByText("Clickable");
      await user.click(charItem);
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          "/charactersheet/sheet-clickable",
          expect.objectContaining({ state: expect.any(Object) }),
        );
      });
    });

    it("clicar em 'Criar NPC' chama navigate para /campaigns/:id/npcs/new", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ campaign: campaignAsMaster(masterUserFixture.user.uuid) }),
        ),
      );
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1", path: "/campaigns/:id", user: masterUserFixture,
      });
      const user = userEvent.setup();
      await user.click(await screen.findByText(/Criar NPC/i));
      expect(mockNavigate).toHaveBeenCalledWith("/campaigns/campaign-1/npcs/new");
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

  describe("delete campanha", () => {
    it("exibe 'Gerenciar' para master", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ campaign: campaignAsMaster(masterUserFixture.user.uuid) }),
        ),
      );
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });
      expect(await screen.findByText(/Gerenciar/i)).toBeInTheDocument();
    });

    it("não exibe 'Gerenciar' para player", async () => {
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: userFixture,
      });
      expect(await screen.findByText(campaignFixture.name.toUpperCase())).toBeInTheDocument();
      expect(screen.queryByText(/Gerenciar/i)).not.toBeInTheDocument();
    });

    it("delete com sucesso navega para /campaigns", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ campaign: campaignAsMaster(masterUserFixture.user.uuid) }),
        ),
        http.delete(`${baseUrl}/campaigns/:id`, () =>
          new HttpResponse(null, { status: 204 }),
        ),
      );
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });
      const user = userEvent.setup();
      await user.click(await screen.findByText(/Gerenciar/i));
      await user.click(screen.getByText(/Excluir/i));
      await user.click(await screen.findByRole("button", { name: "Excluir" }));
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/campaigns");
      });
    });

    it("delete 422 exibe mensagem 'partida iniciada'", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ campaign: campaignAsMaster(masterUserFixture.user.uuid) }),
        ),
        http.delete(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ error: "has started match" }, { status: 422 }),
        ),
      );
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });
      const user = userEvent.setup();
      await user.click(await screen.findByText(/Gerenciar/i));
      await user.click(screen.getByText(/Excluir/i));
      await user.click(await screen.findByRole("button", { name: "Excluir" }));
      expect(
        await screen.findByText(/partida iniciada e não pode ser deletada/i),
      ).toBeInTheDocument();
    });

    it("campanha com partida iniciada exibe 'Excluir' desabilitado com motivo", async () => {
      const campaignWithStartedMatch = {
        ...campaignAsMaster(masterUserFixture.user.uuid),
        matches: [
          {
            uuid: "match-started",
            campaignUuid: "campaign-1",
            masterUuid: masterUserFixture.user.uuid,
            title: "Partida Iniciada",
            briefInitialDescription: "Brief",
            description: "Desc",
            isPublic: true,
            gameScheduledAt: "2025-01-01T10:00:00Z",
            gameStartAt: "2025-01-01T10:05:00Z",
            storyStartAt: "2025-01-01",
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
        ],
      };
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ campaign: campaignWithStartedMatch }),
        ),
      );
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });
      const user = userEvent.setup();
      await user.click(await screen.findByText(/Gerenciar/i));
      expect(await screen.findByText(/Partida iniciada existente/i)).toBeInTheDocument();
    });

    it("'Criar Partida' em BottomActions chama navigate", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ campaign: campaignAsMaster(masterUserFixture.user.uuid) }),
        ),
      );
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });
      const user = userEvent.setup();
      await user.click(await screen.findByRole("button", { name: /Criar Partida/i }));
      expect(mockNavigate).toHaveBeenCalledWith("/campaigns/campaign-1/matches/new");
    });
  });
});
