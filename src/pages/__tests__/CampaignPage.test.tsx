// src/pages/__tests__/CampaignPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { campaignFixture, campaignApiFixture, campaignAsMasterApi } from "../../test/fixtures/campaign";
import { pendingSheetApiFixture } from "../../test/fixtures/sheet";
import { masterUserFixture, userFixture } from "../../test/fixtures/user";
import { mapApiFixture } from "../../test/fixtures/map";
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
          return HttpResponse.json({ campaign: campaignApiFixture });
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
          HttpResponse.json({ campaign: campaignAsMasterApi(masterUserFixture.user.uuid) }),
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
          HttpResponse.json({ campaign: campaignAsMasterApi(masterUserFixture.user.uuid) }),
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
            campaign: {
              ...campaignAsMasterApi(masterUserFixture.user.uuid),
              pending_sheets: [pendingSheetApiFixture],
            },
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
              ...campaignApiFixture,
              character_sheets: [
                { uuid: "existing-sheet", nick_name: conflictNick, player_uuid: "other-user", cover_url: null, avatar_url: null, created_at: "2025-01-01T00:00:00.000Z", updated_at: "2025-01-01T00:00:00.000Z", full_name: "Existing", alignment: "Neutral", character_class: "Especialista", birthday: "2000-01-01", category_name: "Emissor", level: 1, points: 0, curr_exp: 0, next_lvl_base_exp: 100, talent_lvl: 1, physicals_lvl: 1, mentals_lvl: 1, spirituals_lvl: 1, skills_lvl: 1, stamina: { min: 0, current: 100, max: 100 }, health: { min: 0, current: 100, max: 100 } },
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
              ...campaignAsMasterApi(masterUserFixture.user.uuid),
              character_sheets: [
                {
                  uuid: "sheet-clickable",
                  nick_name: "Clickable",
                  player_uuid: "user-2",
                  cover_url: null,
                  avatar_url: null,
                  full_name: "Click Me",
                  character_class: "Especialista",
                  alignment: "Neutral",
                  birthday: "2000-01-01",
                  category_name: "Emissor",
                  level: 1,
                  points: 0,
                  curr_exp: 0,
                  next_lvl_base_exp: 100,
                  talent_lvl: 1,
                  physicals_lvl: 1,
                  mentals_lvl: 1,
                  spirituals_lvl: 1,
                  skills_lvl: 1,
                  stamina: { min: 0, current: 100, max: 100 },
                  health: { min: 0, current: 100, max: 100 },
                  created_at: "2025-01-01T00:00:00.000Z",
                  updated_at: "2025-01-01T00:00:00.000Z",
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
          HttpResponse.json({ campaign: campaignAsMasterApi(masterUserFixture.user.uuid) }),
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
          HttpResponse.json({ campaign: campaignAsMasterApi(masterUserFixture.user.uuid) }),
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
          HttpResponse.json({ campaign: campaignAsMasterApi(masterUserFixture.user.uuid) }),
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
          HttpResponse.json({ campaign: campaignAsMasterApi(masterUserFixture.user.uuid) }),
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
        ...campaignAsMasterApi(masterUserFixture.user.uuid),
        matches: [
          {
            uuid: "match-started",
            campaign_uuid: "campaign-1",
            master_uuid: masterUserFixture.user.uuid,
            title: "Partida Iniciada",
            brief_initial_description: "Brief",
            description: "Desc",
            is_public: true,
            game_scheduled_at: "2025-01-01T10:00:00Z",
            game_start_at: "2025-01-01T10:05:00Z",
            story_start_at: "2025-01-01",
            created_at: "2025-01-01T00:00:00.000Z",
            updated_at: "2025-01-01T00:00:00.000Z",
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
          HttpResponse.json({ campaign: campaignAsMasterApi(masterUserFixture.user.uuid) }),
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

  describe("aba Mapas — como Master", () => {
    function renderAsMasterOnMapsTab() {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({
            campaign: campaignAsMasterApi(masterUserFixture.user.uuid),
          }),
        ),
        http.get(`${baseUrl}/campaigns/:id/maps`, () =>
          HttpResponse.json({ maps: [mapApiFixture] }),
        ),
      );
      return renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1?tab=maps",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });
    }

    it("exibe aba 'Mapas' para master", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({
            campaign: campaignAsMasterApi(masterUserFixture.user.uuid),
          }),
        ),
      );
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });
      expect(await screen.findByRole("button", { name: "Mapas" })).toBeInTheDocument();
    });

    it("NÃO exibe aba 'Mapas' para player", async () => {
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: userFixture,
      });
      expect(await screen.findByText(campaignFixture.name.toUpperCase())).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Mapas" })).not.toBeInTheDocument();
    });

    it("aba Mapas exibe MapCard com nome do mapa", async () => {
      renderAsMasterOnMapsTab();
      expect(
        await screen.findByText("Floresta do Norte"),
      ).toBeInTheDocument();
    });

    it("aba Mapas exibe botão 'Criar Mapa'", async () => {
      renderAsMasterOnMapsTab();
      expect(
        await screen.findByRole("button", { name: /Criar Mapa/i }),
      ).toBeInTheDocument();
    });

    it("clicar em 'Criar Mapa' navega para /campaigns/:id/maps/new", async () => {
      renderAsMasterOnMapsTab();
      const user = userEvent.setup();
      await user.click(
        await screen.findByRole("button", { name: /Criar Mapa/i }),
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        "/campaigns/campaign-1/maps/new",
      );
    });

    it("clicar em MapCard navega para /campaigns/:id/maps/:mapId/edit", async () => {
      renderAsMasterOnMapsTab();
      const user = userEvent.setup();
      await user.click(await screen.findByText("Floresta do Norte"));
      expect(mockNavigate).toHaveBeenCalledWith(
        "/campaigns/campaign-1/maps/map-1/edit",
      );
    });

    it("aba Mapas mostra 'Nenhum mapa criado ainda.' quando lista está vazia", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({
            campaign: campaignAsMasterApi(masterUserFixture.user.uuid),
          }),
        ),
        http.get(`${baseUrl}/campaigns/:id/maps`, () =>
          HttpResponse.json({ maps: [] }),
        ),
      );
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1?tab=maps",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });
      expect(
        await screen.findByText(/Nenhum mapa criado ainda\./i),
      ).toBeInTheDocument();
    });
  });
});
