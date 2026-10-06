// src/pages/__tests__/MatchPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { matchApiFixture, matchAsMasterApi, matchOngoingApi, matchEndedApi } from "../../test/fixtures/match";
import { masterUserFixture, userFixture } from "../../test/fixtures/user";
import { mapApiFixture } from "../../test/fixtures/map";
import { campaignAsMasterApi } from "../../test/fixtures/campaign";
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
          return HttpResponse.json({ match: matchApiFixture });
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
        http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json({ match: matchOngoingApi() })),
      );
      renderPage();
      expect(await screen.findByText("EM ANDAMENTO")).toBeInTheDocument();
    });

    it("exibe 'ENCERRADA' e descrição final quando storyEndAt existe", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json({ match: matchEndedApi() })),
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
          HttpResponse.json({ match: matchAsMasterApi(masterUserFixture.user.uuid) }),
        ),
      );
      renderPage({ user: masterUserFixture });
      expect(await screen.findByText(/Abrir Lobby/i)).toBeInTheDocument();
    });

    it("exibe botão 'Gerenciar' quando a partida não começou", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({ match: matchAsMasterApi(masterUserFixture.user.uuid) }),
        ),
      );
      renderPage({ user: masterUserFixture });
      expect(await screen.findByText(/Gerenciar/i)).toBeInTheDocument();
    });

    it("clicar em 'Gerenciar' exibe opções Editar e Excluir", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({ match: matchAsMasterApi(masterUserFixture.user.uuid) }),
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
          HttpResponse.json({ match: matchAsMasterApi(masterUserFixture.user.uuid) }),
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
          HttpResponse.json({ match: matchAsMasterApi(masterUserFixture.user.uuid) }),
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
          HttpResponse.json({ match: matchOngoingApi() }),
        ),
      );
      renderPage({ user: masterUserFixture });
      await screen.findByText("EM ANDAMENTO");
      expect(screen.queryByText(/Gerenciar/i)).not.toBeInTheDocument();
    });

    it("clicar em 'Abrir Lobby' mostra dialog de confirmação", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({ match: matchAsMasterApi(masterUserFixture.user.uuid) }),
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
          HttpResponse.json({ match: matchAsMasterApi(masterUserFixture.user.uuid) }),
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
        http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json({ match: matchOngoingApi() })),
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

  describe("Entrar na partida", () => {
    const participantsOf = (playerUuid: string) =>
      http.get(`${baseUrl}/matches/:id/participants`, () =>
        HttpResponse.json({
          participants: [
            {
              uuid: "part-1",
              joinedAt: "2025-12-01T19:06:00Z",
              leftAt: null,
              characterSheet: {
                uuid: "sheet-y",
                playerUuid,
                nickName: "Participant",
                createdAt: "2025-01-01T00:00:00.000Z",
                updatedAt: "2025-01-01T00:00:00.000Z",
                private: null,
              },
            },
          ],
        }),
      );
    const GAME_URL = "/campaigns/campaign-1/matches/match-1/game";

    it("mestre vê o botão com a partida em andamento e o clique navega pro jogo", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({
            match: { ...matchOngoingApi(), masterUuid: masterUserFixture.user.uuid },
          }),
        ),
      );
      renderPage({ user: masterUserFixture });
      const u = userEvent.setup();
      await u.click(await screen.findByText("Entrar na partida"));
      expect(mockNavigate).toHaveBeenCalledWith(GAME_URL);
    });

    it("jogador com personagem em participants vê o botão", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json({ match: matchOngoingApi() })),
        participantsOf(userFixture.user.uuid),
      );
      renderPage({ user: userFixture });
      expect(await screen.findByText("Entrar na partida")).toBeInTheDocument();
    });

    it("usuário sem personagem na partida não vê o botão", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json({ match: matchOngoingApi() })),
        participantsOf("outro-jogador"),
      );
      renderPage({ user: userFixture });
      await screen.findByText("Participant");
      expect(screen.queryByText("Entrar na partida")).not.toBeInTheDocument();
    });

    it("partida não iniciada mostra 'Abrir Lobby' ao mestre, não o botão", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({ match: matchAsMasterApi(masterUserFixture.user.uuid) }),
        ),
      );
      renderPage({ user: masterUserFixture });
      expect(await screen.findByText(/Abrir Lobby/i)).toBeInTheDocument();
      expect(screen.queryByText("Entrar na partida")).not.toBeInTheDocument();
    });

    it("partida encerrada não mostra o botão", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({
            match: { ...matchEndedApi(), masterUuid: masterUserFixture.user.uuid },
          }),
        ),
      );
      renderPage({ user: masterUserFixture });
      await screen.findByText("ENCERRADA");
      expect(screen.queryByText("Entrar na partida")).not.toBeInTheDocument();
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
        http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json({ match: matchOngoingApi() })),
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

  describe("datas exibidas", () => {
    it("formata gameScheduledAt com hora e storyStartAt sem hora, sem shift de fuso", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({
            match: {
              ...matchApiFixture,
              gameScheduledAt: "2026-08-09T23:00:00Z",
              storyStartAt: "2026-08-09T23:00:00Z",
            },
          }),
        ),
      );
      renderPage();
      expect(
        await screen.findByText("09/08/2026 às 23:00"),
      ).toBeInTheDocument();
      expect(
        await screen.findByText(/^Início na história: 09\/08\/2026$/),
      ).toBeInTheDocument();
    });
  });

  describe("MatchPage — mapa", () => {
    const masterMatch = matchAsMasterApi(masterUserFixture.user.uuid);

    it("exibe botão Anexar quando nenhum mapa está anexado", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({ match: masterMatch }),
        ),
        http.get(`${baseUrl}/matches/:id/map`, () =>
          new HttpResponse(null, { status: 204 }),
        ),
        http.get(`${baseUrl}/campaigns/:cid/maps`, () =>
          HttpResponse.json({ maps: [mapApiFixture] }),
        ),
      );
      renderPage({ user: masterUserFixture });
      const u = userEvent.setup();
      // Navigate to Mapas tab
      await u.click(await screen.findByRole("button", { name: /Mapas/i }));
      expect(await screen.findByRole("button", { name: /anexar/i })).toBeInTheDocument();
    });

    it("exibe badge Anexado e botão Desanexar quando mapa está anexado", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({ match: masterMatch }),
        ),
        http.get(`${baseUrl}/matches/:id/map`, () =>
          HttpResponse.json({
            matchMap: {
              matchUuid: "match-1",
              mapUuid: mapApiFixture.id,
              attachedAt: "2026-06-04T00:00:00Z",
            },
          }),
        ),
        http.get(`${baseUrl}/campaigns/:cid/maps`, () =>
          HttpResponse.json({ maps: [mapApiFixture] }),
        ),
      );
      renderPage({ user: masterUserFixture });
      const u = userEvent.setup();
      // Navigate to Mapas tab
      await u.click(await screen.findByRole("button", { name: /Mapas/i }));
      expect(await screen.findByText(/Anexado/i)).toBeInTheDocument();
      expect(await screen.findByRole("button", { name: /desanexar/i })).toBeInTheDocument();
    });

    // F16: o back recusa trocar o mapa depois do start_match (422). Com a partida iniciada a
    // troca nem aparece.
    it("partida iniciada: não oferece anexar nem desanexar", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({ match: { ...matchOngoingApi(), masterUuid: masterUserFixture.user.uuid } }),
        ),
        http.get(`${baseUrl}/matches/:id/map`, () =>
          HttpResponse.json({
            matchMap: { matchUuid: "match-1", mapUuid: mapApiFixture.id, attachedAt: "2026-06-04T00:00:00Z" },
          }),
        ),
        http.get(`${baseUrl}/campaigns/:cid/maps`, () =>
          HttpResponse.json({ maps: [mapApiFixture, { ...mapApiFixture, id: "map-2", name: "Outro Mapa" }] }),
        ),
      );
      renderPage({ user: masterUserFixture });
      const u = userEvent.setup();
      await u.click(await screen.findByRole("button", { name: /Mapas/i }));
      expect(await screen.findByText("Outro Mapa")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /anexar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /desanexar/i })).not.toBeInTheDocument();
    });

    // A página carregou antes do início (sem `gameStartAt`) e o mestre tenta anexar depois.
    it("se o back recusa a troca porque a partida começou, mostra o motivo em português", async () => {
      // A recusa faz a página rebuscar a partida: a resposta nova já traz `gameStartAt`.
      let started = false;
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({ match: started ? { ...masterMatch, gameStartAt: "2025-12-01T19:05:00Z" } : masterMatch }),
        ),
        http.get(`${baseUrl}/matches/:id/map`, () =>
          new HttpResponse(null, { status: 204 }),
        ),
        http.get(`${baseUrl}/campaigns/:cid/maps`, () =>
          HttpResponse.json({ maps: [mapApiFixture] }),
        ),
        http.post(`${baseUrl}/matches/:id/map`, () => {
          started = true;
          return HttpResponse.json(
            // Texto qualquer: sem herança, o 422 basta para ser a recusa por partida iniciada.
            { title: "Unprocessable Entity", status: 422, detail: "match is already under way" },
            { status: 422 },
          );
        }),
      );
      renderPage({ user: masterUserFixture });
      const u = userEvent.setup();
      await u.click(await screen.findByRole("button", { name: /Mapas/i }));
      await u.click(await screen.findByRole("button", { name: /anexar/i }));
      expect(
        await screen.findByText("O mapa não pode ser trocado depois que a partida começou."),
      ).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByRole("button", { name: /anexar/i })).not.toBeInTheDocument());
      expect(screen.getByText("O mapa não pode ser trocado depois que a partida começou.")).toBeInTheDocument();
    });

    // F15 (B16): a partida começa de onde outra da mesma campanha, no mesmo mapa, terminou.
    describe("continuar o tabuleiro de outra partida", () => {
      const sourceMatch = {
        ...matchEndedApi(),
        uuid: "match-0",
        title: "Partida Anterior",
        gameStartAt: "2025-11-20T19:00:00Z",
      };

      function useInheritScenario(onPost: (body: unknown) => Response | Promise<Response>) {
        server.use(
          http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json({ match: masterMatch })),
          http.get(`${baseUrl}/campaigns/:cid`, () =>
            HttpResponse.json({
              campaign: { ...campaignAsMasterApi(masterUserFixture.user.uuid), matches: [masterMatch, sourceMatch] },
            }),
          ),
          http.get(`${baseUrl}/matches/:id/map`, ({ params }) =>
            params.id === "match-0"
              ? HttpResponse.json({
                  matchMap: { matchUuid: "match-0", mapUuid: mapApiFixture.id, attachedAt: "2025-11-20T00:00:00Z" },
                })
              : new HttpResponse(null, { status: 204 }),
          ),
          http.get(`${baseUrl}/campaigns/:cid/maps`, () => HttpResponse.json({ maps: [mapApiFixture] })),
          http.post(`${baseUrl}/matches/:id/map`, async ({ request }) => onPost(await request.json())),
        );
      }

      it("lista a partida anterior no mesmo mapa e pede a herança dela", async () => {
        let body: unknown;
        useInheritScenario((b) => {
          body = b;
          return HttpResponse.json({
            matchMap: { matchUuid: "match-1", mapUuid: mapApiFixture.id, attachedAt: "2026-06-04T00:00:00Z" },
          });
        });
        renderPage({ user: masterUserFixture });
        const u = userEvent.setup();
        await u.click(await screen.findByRole("button", { name: /Mapas/i }));
        await u.click(await screen.findByRole("button", { name: "Partida Anterior · 20/11/2025" }));
        await waitFor(() =>
          expect(body).toEqual({ mapUuid: mapApiFixture.id, inheritBoardFromMatchUuid: "match-0" }),
        );
        expect(
          await screen.findByText("O tabuleiro de «Partida Anterior» continua nesta partida."),
        ).toBeInTheDocument();
      });

      it("se a partida de origem não deixou tabuleiro, diz isso em português", async () => {
        useInheritScenario(() =>
          HttpResponse.json(
            { title: "Unprocessable Entity", status: 422, detail: "source match has no board to inherit" },
            { status: 422 },
          ),
        );
        renderPage({ user: masterUserFixture });
        const u = userEvent.setup();
        await u.click(await screen.findByRole("button", { name: /Mapas/i }));
        await u.click(await screen.findByRole("button", { name: "Partida Anterior · 20/11/2025" }));
        expect(
          await screen.findByText("Essa partida não deixou um tabuleiro para continuar."),
        ).toBeInTheDocument();
        // Não é a recusa por partida iniciada: a troca de mapa continua oferecida.
        expect(screen.getByRole("button", { name: /anexar/i })).toBeInTheDocument();
        expect(screen.queryByText(/depois que a partida começou/i)).not.toBeInTheDocument();
      });

      it("uma recusa 422 desconhecida na herança não manda tentar de novo nem diz que a partida começou", async () => {
        useInheritScenario(() =>
          HttpResponse.json(
            { title: "Unprocessable Entity", status: 422, detail: "some new refusal" },
            { status: 422 },
          ),
        );
        renderPage({ user: masterUserFixture });
        const u = userEvent.setup();
        await u.click(await screen.findByRole("button", { name: /Mapas/i }));
        await u.click(await screen.findByRole("button", { name: "Partida Anterior · 20/11/2025" }));
        expect(
          await screen.findByText("Não dá para continuar o tabuleiro dessa partida."),
        ).toBeInTheDocument();
        expect(screen.queryByText(/tente novamente/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/depois que a partida começou/i)).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /anexar/i })).toBeInTheDocument();
      });

      it("se o tabuleiro de origem está em outro mapa, diz isso em português", async () => {
        useInheritScenario(() =>
          HttpResponse.json(
            { title: "Unprocessable Entity", status: 422, detail: "source match's board is on a different map" },
            { status: 422 },
          ),
        );
        renderPage({ user: masterUserFixture });
        const u = userEvent.setup();
        await u.click(await screen.findByRole("button", { name: /Mapas/i }));
        await u.click(await screen.findByRole("button", { name: "Partida Anterior · 20/11/2025" }));
        expect(
          await screen.findByText("O tabuleiro dessa partida está em outro mapa."),
        ).toBeInTheDocument();
      });
    });
  });
});
