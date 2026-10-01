// src/pages/__tests__/GameMasterPage.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { matchApiFixture } from "../../test/fixtures/match";
import { mapWithPiecesApi } from "../../test/fixtures/map";
import { campaignWithNpcsApi, npcFixture } from "../../test/fixtures/campaign";
import GameMasterPage from "../GameMasterPage";
import { installFakeWebSocket, waitForSocket } from "../../test/fakeWebSocket";

const baseUrl = "http://localhost:5000";
const user = userEvent.setup();

// Pixi não é coberto por teste (src/test/setup.ts mocka @pixi/react); o stub expõe um
// botão por peça e um botão de slot vazio (R13, mesmo padrão de GamePlayerPage.test.tsx).
vi.mock("../../features/tactical-map/TacticalMapViewer", () => ({
  default: (props: {
    map: { pieces: Array<{ id: string; characterId: string }> };
    draggablePieceIds?: Set<string>;
    onPieceSelect?: (pieceId: string) => void;
    onPieceLongPress?: (pieceId: string) => void;
    onEmptySlotClick?: (slot: { kind: "square"; col: number; row: number }, x: number, y: number) => void;
    selectedPieceId?: string | null;
    inspectedPieceId?: string | null;
  }) => (
    <div
      data-testid="map-stub"
      // Final review, Important 1 (mirrors GamePlayerPage.test.tsx).
      data-draggable-piece-ids={props.draggablePieceIds ? JSON.stringify([...props.draggablePieceIds]) : "undefined"}
      // F7: whether the viewer received a live handler at all — proves onPieceLongPress/
      // onEmptySlotClick are truly omitted without an actor, not just no-op internally.
      data-has-long-press={String(!!props.onPieceLongPress)}
      data-has-empty-slot-click={String(!!props.onEmptySlotClick)}
      data-selected-piece-id={props.selectedPieceId ?? ""}
      data-inspected-piece-id={props.inspectedPieceId ?? ""}
    >
      {props.map.pieces.map((piece) => (
        <button
          key={piece.id}
          data-testid={`select-actor-${piece.characterId}`}
          onClick={() => props.onPieceSelect?.(piece.id)}
          onContextMenu={() => props.onPieceLongPress?.(piece.id)}
        >
          {piece.id}
        </button>
      ))}
      <button data-testid="empty-slot" onClick={() => props.onEmptySlotClick?.({ kind: "square", col: 9, row: 9 }, 0, 0)}>
        empty-slot
      </button>
    </div>
  ),
}));

vi.mock("../../hooks/useResizeObserver", () => ({
  useResizeObserver: () => ({ width: 800, height: 600 }),
}));

// Mesmo socket falso de GamePlayerPage.test.tsx/useMatchCombat.test.ts.

const participantsFixture = [
  {
    uuid: "participant-1",
    joinedAt: "2026-06-01T00:00:00Z",
    characterSheet: {
      uuid: "c1",
      playerUuid: "user-2",
      masterUuid: "user-1",
      campaignUuid: "campaign-1",
      nickName: "Gon",
      createdAt: "2026-06-01T00:00:00Z",
      updatedAt: "2026-06-01T00:00:00Z",
      private: {
        fullName: "Gon Freecss",
        alignment: "Neutral",
        characterClass: "Especialista",
        birthday: "1999-05-05",
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
        stamina: { min: 0, current: 10, max: 10 },
        health: { min: 0, current: 18, max: 20 },
      },
    },
  },
  {
    uuid: "participant-2",
    joinedAt: "2026-06-01T00:00:00Z",
    characterSheet: {
      uuid: "npc1",
      playerUuid: null,
      masterUuid: "user-1",
      campaignUuid: "campaign-1",
      nickName: "Capanga",
      createdAt: "2026-06-01T00:00:00Z",
      updatedAt: "2026-06-01T00:00:00Z",
      private: {
        fullName: "Capanga Anônimo",
        alignment: "Neutral",
        characterClass: "Especialista",
        birthday: "1990-01-01",
        categoryName: "Manipulador",
        level: 1,
        points: 0,
        currExp: 0,
        nextLvlBaseExp: 100,
        talentLvl: 1,
        physicalsLvl: 1,
        mentalsLvl: 1,
        spiritualsLvl: 1,
        skillsLvl: 1,
        stamina: { min: 0, current: 5, max: 5 },
        health: { min: 0, current: 10, max: 10 },
      },
    },
  },
];

const piecesFixture = [
  { id: "piece-c1", characterId: "c1", coord: { slot: { kind: "square", col: 1, row: 1 }, z: 0 }, visible: true },
  { id: "piece-npc1", characterId: "npc1", coord: { slot: { kind: "square", col: 4, row: 4 }, z: 0 }, visible: true },
];

function renderMasterPage() {
  return renderWithProviders(<GameMasterPage token="fake-jwt-token" matchId="match-1" />);
}

beforeEach(() => {
  installFakeWebSocket();

  server.use(
    http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json({ match: matchApiFixture })),
    http.get(`${baseUrl}/matches/:id/map`, () =>
      HttpResponse.json({
        matchMap: { matchUuid: "match-1", mapUuid: "map-1", attachedAt: "2026-06-04T00:00:00Z" },
      }),
    ),
    http.get(`${baseUrl}/maps/:id`, () => HttpResponse.json({ map: mapWithPiecesApi(piecesFixture as never) })),
    http.get(`${baseUrl}/matches/:id/participants`, () =>
      HttpResponse.json({ participants: participantsFixture }),
    ),
    http.get(`${baseUrl}/charactersheets/:id/combat-catalogue`, () =>
      HttpResponse.json({
        weapons: [{ name: "Fist", dice: [6, 6, 4], flatDamage: 0, defenseBonus: 0, proficiencyLevel: 0 }],
        skills: ["Push"],
      }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("GameMasterPage", () => {
  it("abre a próxima ação e antecipa uma da fila", async () => {
    renderMasterPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    act(() => ws.emit("action_queued", { actionId: "a1", actorId: "c1", bars: ["action"] }));
    // O badge do rail conta o que está na fila.
    expect(screen.getByRole("button", { name: /Fila/ })).toHaveTextContent("1");
    act(() => screen.getByRole("button", { name: "Abrir agora" }).click());

    let sent = ws.send.mock.calls.map((c) => JSON.parse(c[0] as string));
    expect(sent[sent.length - 1]).toMatchObject({ type: "pull_action", payload: { actionId: "a1" } });

    act(() => screen.getByRole("button", { name: "Abrir próxima" }).click());
    sent = ws.send.mock.calls.map((c) => JSON.parse(c[0] as string));
    expect(sent[sent.length - 1]?.type).toBe("open_next_action");
  });

  it("F7: turno aberto mostra o card em andamento na Fila, com o cálculo anexado", async () => {
    renderMasterPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    act(() => ws.emit("action_queued", { actionId: "a1", actorId: "c1", bars: ["action"] }));
    act(() => ws.emit("turn_opened", { turnId: "t1", actorId: "c1", actionId: "a1", actionType: "" }));
    act(() =>
      ws.emit("resolution_updated", {
        turnId: "t1",
        isSettled: false,
        targets: [
          {
            targetId: "npc1",
            avoided: false,
            defended: false,
            dodgeTotal: 10,
            defenseTotal: 5,
            rawDamage: 8,
            defenseApplied: 0,
            projectedDamage: 8,
          },
        ],
      }),
    );

    const openRow = screen.getByTestId("queue-open");
    expect(within(openRow).getByText(/em andamento/i)).toBeInTheDocument();
    expect(within(openRow).getByText("Capanga")).toBeInTheDocument();
  });

  // BF3: a ordem real no socket do mestre em open_next_action é resolution_updated(settled=
  // false) ANTES de turn_opened — o teste acima cobre a ordem antiga (turn_opened primeiro),
  // este cobre a real: sem o fix o card em andamento não mostra o cálculo.
  it("BF3: resolução chega antes do turn_opened (ordem real) e mesmo assim aparece no card em andamento", async () => {
    renderMasterPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    act(() => ws.emit("action_queued", { actionId: "a1", actorId: "c1", bars: ["action"] }));
    act(() =>
      ws.emit("resolution_updated", {
        turnId: "t1",
        isSettled: false,
        targets: [
          {
            targetId: "npc1",
            avoided: false,
            defended: false,
            dodgeTotal: 10,
            defenseTotal: 5,
            rawDamage: 8,
            defenseApplied: 0,
            projectedDamage: 8,
          },
        ],
      }),
    );
    act(() => ws.emit("turn_opened", { turnId: "t1", actorId: "c1", actionId: "a1", actionType: "" }));

    const openRow = screen.getByTestId("queue-open");
    expect(within(openRow).getByText(/em andamento/i)).toBeInTheDocument();
    expect(within(openRow).getByText("Capanga")).toBeInTheDocument();
  });

  it("mostra o diálogo que o servidor computou e reenvia com confirm", async () => {
    renderMasterPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    act(() =>
      ws.emit("close_turn_refused", {
        turnId: "t1",
        pendingReactions: [{ reactionId: "r1", actorId: "c2", kind: "repel" }],
      }),
    );
    act(() => screen.getByRole("button", { name: /fechar mesmo assim/i }).click());

    const sent = ws.send.mock.calls.map((c) => JSON.parse(c[0] as string));
    expect(sent[sent.length - 1]).toEqual({ type: "close_turn", payload: { confirm: true } });
  });

  it("compõe ação por um NPC com enqueue_action, não com enqueue_master_action", async () => {
    renderMasterPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());

    const actorButton = await screen.findByTestId("select-actor-npc1");
    // 1º clique sem ator selecionado: vira ator (não alvo). 2º clique, já com o NPC
    // como ator: qualquer clique marca alvo — na própria peça, alvejar a si mesmo é
    // legítimo (§6) — e é o que deixa "Declarar" habilitado (tem alvo).
    act(() => actorButton.click());
    act(() => actorButton.click());
    const declareButton = await screen.findByRole("button", { name: /declarar/i });
    expect(declareButton).not.toBeDisabled();
    act(() => declareButton.click());

    const sent = ws.send.mock.calls.map((c) => JSON.parse(c[0] as string));
    expect(sent[sent.length - 1]?.type).toBe("enqueue_action");
    expect(sent[sent.length - 1]?.payload.actorId).toBe("npc1");
  });

  it("escolhe o NPC pelo painel Agir e tocar de novo o solta", async () => {
    renderMasterPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());

    act(() => screen.getByRole("button", { name: "Agir" }).click());
    const chip = await screen.findByRole("button", { name: "Capanga" });
    act(() => chip.click());
    expect(screen.getByRole("button", { name: "Capanga" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Compor ação")).toHaveTextContent("Agindo como Capanga");

    act(() => screen.getByRole("button", { name: "Capanga" }).click());
    expect(screen.getByRole("button", { name: "Capanga" })).toHaveAttribute("aria-pressed", "false");
  });

  it("passa draggablePieceIds vazio ao mapa — o servidor decide onde a peça para (I1)", async () => {
    renderMasterPage();
    expect(await screen.findByTestId("map-stub")).toHaveAttribute(
      "data-draggable-piece-ids",
      "[]",
    );
  });

  // F2 removeu o `everyone` com participantes sintéticos `map-npc:*` (o antigo teste "F6"
  // cobria exatamente isso): um NPC do mapa que ainda não é participante não aparece mais
  // em Personagens — a rede de segurança do F2 rebusca os participantes até ele chegar.
  it("Personagens do mestre não inclui um NPC do mapa que ainda não é participante (F2)", async () => {
    server.use(
      http.get(`${baseUrl}/maps/:id`, () =>
        HttpResponse.json({
          map: mapWithPiecesApi([
            ...piecesFixture,
            {
              id: "piece-mapnpc",
              characterId: "map-npc-1",
              coord: { slot: { kind: "square", col: 6, row: 6 }, z: 0 },
              visible: true,
            },
          ] as never),
        }),
      ),
      http.get(`${baseUrl}/campaigns/:id`, () =>
        HttpResponse.json({
          campaign: campaignWithNpcsApi([{ ...npcFixture, uuid: "map-npc-1", nickName: "NPC Só no Mapa" }]),
        }),
      ),
    );

    renderWithProviders(
      <GameMasterPage token="fake-jwt-token" matchId="match-1" campaignId="campaign-1" />,
    );
    const ws = await waitForSocket();
    act(() => ws.onopen?.());

    const toggle = await screen.findByRole("button", { name: "Ver histórico" });
    act(() => toggle.click());
    act(() => screen.getByRole("button", { name: "Personagens" }).click());

    // Continua mostrando os participantes normais.
    expect(await screen.findByText("Gon")).toBeInTheDocument();
    expect(screen.queryByText("NPC Só no Mapa")).not.toBeInTheDocument();
  });

  it("F11: inspecionar uma peça que o mestre não controla não troca a aba da direita", async () => {
    // mesmo arranjo do teste de inspeção existente (mestre, sem ator, clica na peça de um
    // jogador) — invertido: a aba da direita continua em Histórico, não pula para Personagens.
    renderMasterPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());

    const pcButton = await screen.findByTestId("select-actor-c1");
    const sentBefore = ws.send.mock.calls.length;
    act(() => pcButton.click());

    // Nada de novo é enviado pelo clique (o board sync do mestre já rodou ao conectar).
    expect(ws.send.mock.calls.length).toBe(sentBefore);
    // A gaveta começa fechada nesta viewport de teste (sem setAsideOpen no tap agora) — abrir
    // pra inspecionar em qual aba ela ficou.
    act(() => screen.getByRole("button", { name: "Ver histórico" }).click());
    expect(screen.getByRole("button", { name: "Histórico" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Personagens" })).toHaveAttribute("aria-pressed", "false");
    // não virou ator: a bottom sheet de compor ação não aparece
    expect(screen.queryByRole("button", { name: /declarar/i })).not.toBeInTheDocument();

    // F7 (M1): o anel é de INSPEÇÃO, não de seleção de ator — os dois props do viewer
    // não podem apontar para a mesma peça aqui.
    const mapStub = screen.getByTestId("map-stub");
    expect(mapStub).toHaveAttribute("data-inspected-piece-id", "piece-c1");
    expect(mapStub).toHaveAttribute("data-selected-piece-id", "");
  });

  // F7 (M1): sem ator selecionado não há alvo pra um hold marcar, nem actorSlot pra um
  // clique em slot vazio desenhar — os dois handlers ficam de fora do viewer até um NPC
  // virar ator; depois de virar, o anel de seleção (não mais inspeção) segue a peça dele.
  it("sem ator: onPieceLongPress/onEmptySlotClick não vão pro viewer; com ator, o anel de seleção segue a peça (F7)", async () => {
    renderMasterPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());

    let mapStub = await screen.findByTestId("map-stub");
    expect(mapStub).toHaveAttribute("data-has-long-press", "false");
    expect(mapStub).toHaveAttribute("data-has-empty-slot-click", "false");

    const npcButton = await screen.findByTestId("select-actor-npc1");
    act(() => npcButton.click());

    mapStub = screen.getByTestId("map-stub");
    expect(mapStub).toHaveAttribute("data-has-long-press", "true");
    expect(mapStub).toHaveAttribute("data-has-empty-slot-click", "true");
    expect(mapStub).toHaveAttribute("data-selected-piece-id", "piece-npc1");
    expect(mapStub).toHaveAttribute("data-inspected-piece-id", "");
  });

  // F7 (M1): a dica muda quando a partida não tem NENHUM NPC controlável — "clique num
  // NPC" seria um beco sem saída, já que não existe nenhum pra clicar.
  it("sem NPC nenhum na partida, o painel Agir diz isso em vez de mandar escolher um NPC (F7)", async () => {
    server.use(
      http.get(`${baseUrl}/matches/:id/participants`, () =>
        HttpResponse.json({
          participants: [participantsFixture[0]], // só o PC (Gon) — nenhum NPC
        }),
      ),
    );
    renderMasterPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());

    act(() => screen.getByRole("button", { name: "Agir" }).click());
    expect(
      await screen.findByText(/nenhum npc nesta partida/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Agir por" })).not.toBeInTheDocument();
  });

  // F7 (M1): um NPC do mapa que NÃO é participante da partida é inspecionado (nunca vira
  // ator) — a mensagem "não está inscrito" saiu com F2 (a rede de segurança do B11 cobre
  // a janela e o participante chega pouco depois).
  it("NPC do mapa fora da partida: inspeciona sem virar ator (F7)", async () => {
    server.use(
      http.get(`${baseUrl}/maps/:id`, () =>
        HttpResponse.json({
          map: mapWithPiecesApi([
            ...piecesFixture,
            {
              id: "piece-mapnpc",
              characterId: "map-npc-1",
              coord: { slot: { kind: "square", col: 6, row: 6 }, z: 0 },
              visible: true,
            },
          ] as never),
        }),
      ),
      http.get(`${baseUrl}/campaigns/:id`, () =>
        HttpResponse.json({
          campaign: campaignWithNpcsApi([{ ...npcFixture, uuid: "map-npc-1", nickName: "NPC Só no Mapa" }]),
        }),
      ),
    );
    renderWithProviders(
      <GameMasterPage token="fake-jwt-token" matchId="match-1" campaignId="campaign-1" />,
    );
    const ws = await waitForSocket();
    act(() => ws.onopen?.());

    const mapNpcButton = await screen.findByTestId("select-actor-map-npc-1");
    act(() => mapNpcButton.click());

    const mapStub = screen.getByTestId("map-stub");
    expect(mapStub).toHaveAttribute("data-inspected-piece-id", "piece-mapnpc");
    expect(mapStub).toHaveAttribute("data-selected-piece-id", "");
    // não virou ator
    expect(screen.queryByRole("button", { name: /declarar/i })).not.toBeInTheDocument();
  });

  it("F2: pôr um NPC da campanha na partida manda add_npc", async () => {
    server.use(
      http.get(`${baseUrl}/campaigns/:id`, () =>
        HttpResponse.json({ campaign: campaignWithNpcsApi([npcFixture]) }),
      ),
    );
    renderWithProviders(
      <GameMasterPage token="fake-jwt-token" matchId="match-1" campaignId="campaign-1" />,
    );
    const ws = await waitForSocket();
    act(() => ws.onopen?.());

    act(() => screen.getByRole("button", { name: "Agir" }).click());
    await user.selectOptions(await screen.findByLabelText("Pôr na partida"), npcFixture.uuid);
    await user.click(screen.getByRole("button", { name: "Pôr" }));
    expect(ws.sent("add_npc")).toEqual([{ characterSheetUuid: npcFixture.uuid }]);
  });

  it("F2: npc_added rebusca os participantes", async () => {
    let calls = 0;
    server.use(
      http.get(`${baseUrl}/matches/:id/participants`, () => {
        calls += 1;
        return HttpResponse.json({ participants: participantsFixture });
      }),
    );
    renderMasterPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    await vi.waitFor(() => expect(calls).toBe(1));

    act(() => { ws.emit("npc_added", { characterId: "npc-x" }); });
    await vi.waitFor(() => expect(calls).toBe(2));
  });

  it("F2: peça de não-participante rebusca uma vez só", async () => {
    let calls = 0;
    server.use(
      http.get(`${baseUrl}/matches/:id/participants`, () => {
        calls += 1;
        return HttpResponse.json({ participants: participantsFixture });
      }),
      http.get(`${baseUrl}/maps/:id`, () =>
        HttpResponse.json({
          map: mapWithPiecesApi([
            ...piecesFixture,
            {
              id: "p-orfao",
              characterId: "npc-orfao",
              coord: { slot: { kind: "square", col: 5, row: 5 }, z: 0 },
              visible: true,
            },
          ] as never),
        }),
      ),
    );
    renderMasterPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    await vi.waitFor(() => expect(calls).toBe(2));

    // Outro re-render (ex.: bars_updated) não deve disparar uma segunda rebusca da mesma peça.
    act(() => { ws.emit("bars_updated", { seq: 1, bars: [] }); });
    expect(calls).toBe(2);
  });

  it("F2: npc_already_in_match não aparece como erro", async () => {
    server.use(
      http.get(`${baseUrl}/campaigns/:id`, () =>
        HttpResponse.json({ campaign: campaignWithNpcsApi([npcFixture]) }),
      ),
    );
    renderWithProviders(
      <GameMasterPage token="fake-jwt-token" matchId="match-1" campaignId="campaign-1" />,
    );
    const ws = await waitForSocket();
    act(() => ws.onopen?.());

    act(() => screen.getByRole("button", { name: "Agir" }).click());
    await user.selectOptions(await screen.findByLabelText("Pôr na partida"), npcFixture.uuid);
    await user.click(screen.getByRole("button", { name: "Pôr" }));
    act(() => { ws.emit("error", { code: "npc_already_in_match", message: "npc already in match" }); });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("F8: nova cena manda change_scene com a categoria minúscula", async () => {
    renderMasterPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());

    await user.click(screen.getAllByRole("button", { name: "Nova cena" })[0]);
    await user.click(screen.getByRole("radio", { name: "Interpretação" }));
    await user.type(screen.getByLabelText("Descrição inicial"), "Taverna");
    await user.click(screen.getByRole("button", { name: "Trocar de cena" }));
    expect(ws.sent("change_scene")).toEqual([{ category: "roleplay", briefInitialDescription: "Taverna" }]);
  });

  it("F8: com turno aberto, Nova cena fica desabilitado", async () => {
    renderMasterPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    act(() => { ws.emit("turn_opened", { turnId: "t1", actorId: "c1", actionId: "a1", actionType: "" }); });
    for (const b of screen.getAllByRole("button", { name: "Nova cena" })) expect(b).toBeDisabled();
  });

  it("F3: tocar num card abre a ficha no painel, sem navegar", async () => {
    renderMasterPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());

    await user.click(await screen.findByRole("button", { name: "Ver histórico" }));
    await user.click(screen.getByRole("button", { name: "Personagens" }));
    await user.click(await screen.findByTestId("character-row-c1"));
    expect(await screen.findByTestId("match-sheet")).toBeInTheDocument();
    // o painel alarga só para a ficha, e a aba da direita continua em Personagens
    expect(screen.getByTestId("match-panel")).toHaveAttribute("data-wide", "true");
    expect(screen.getByRole("button", { name: "Personagens", pressed: true })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Fila/ }));
    expect(screen.getByTestId("match-panel")).toHaveAttribute("data-wide", "false");
  });
  // F4: o mestre também lê o Histórico do REST — com o ao vivo que o REST não guarda por cima.
  it("F4: o Histórico do mestre junta o turno do REST e o regime ao vivo", async () => {
    server.use(
      http.get(`${baseUrl}/matches/:id/history`, () =>
        HttpResponse.json({
          scenes: [{
            uuid: "s1", category: "battle", briefDesc: "", createdAt: "2026-06-01T00:00:00Z",
            rounds: [{
              uuid: "r1", mode: "Race", createdAt: "2026-06-01T00:00:00Z",
              turns: [{
                uuid: "t1", createdAt: "2026-06-01T00:01:00Z", finishedAt: "2026-06-01T00:01:00Z",
                action: { uuid: "a1", actorId: "npc1", reactionKind: "", targetId: ["c1"], attack: { weapon: "Sword" } },
                resolution: {
                  isSettled: true,
                  targets: [{
                    targetId: "c1", avoided: false, defended: false, dodgeTotal: 0, defenseTotal: 0,
                    rawDamage: 4, defenseApplied: 0, projectedDamage: 4,
                  }],
                },
              }],
            }],
          }],
        }),
      ),
    );
    renderMasterPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    await user.click(await screen.findByRole("button", { name: "Ver histórico" }));

    expect(await screen.findByText("Turno de Capanga — atacou Gon com Sword · Gon −4")).toBeInTheDocument();
    act(() => ws.emit("round_mode_changed", { mode: "Free" }));
    await vi.waitFor(() => expect(screen.getAllByTestId("event-row")).toHaveLength(2));
    const rows = screen.getAllByTestId("event-row");
    expect(rows[0]).toHaveTextContent("Turno de Capanga");
    expect(rows[1]).toHaveTextContent("Regime: Livre");
  });
});
