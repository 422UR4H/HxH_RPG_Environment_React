// src/pages/__tests__/GameMasterPage.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { matchApiFixture } from "../../test/fixtures/match";
import { mapApiFixture, mapWithPiecesApi } from "../../test/fixtures/map";
import { campaignWithNpcsApi, npcFixture } from "../../test/fixtures/campaign";
import GameMasterPage from "../GameMasterPage";
import { installFakeWebSocket, waitForSocket } from "../../test/fakeWebSocket";
import type { FakeWS } from "../../test/fakeWebSocket";

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
    intentGhosts?: unknown[];
    intentPreview?: unknown;
    onPieceMove?: (pieceId: string, slot: { kind: "square"; col: number; row: number } | { kind: "hex"; q: number; r: number }) => void;
    placingNpcId?: string | null;
    onNpcPlaced?: (slot: { kind: "square"; col: number; row: number }) => void;
  }) => (
    <div
      data-testid="map-stub"
      // Final review, Important 1 (mirrors GamePlayerPage.test.tsx).
      data-draggable-piece-ids={props.draggablePieceIds ? JSON.stringify([...props.draggablePieceIds]) : "undefined"}
      // F7: whether the viewer received a live handler at all — proves onPieceLongPress/
      // onEmptySlotClick are truly omitted without an actor, not just no-op internally.
      data-has-long-press={String(!!props.onPieceLongPress)}
      data-has-empty-slot-click={String(!!props.onEmptySlotClick)}
      data-has-piece-select={String(!!props.onPieceSelect)}
      data-selected-piece-id={props.selectedPieceId ?? ""}
      data-inspected-piece-id={props.inspectedPieceId ?? ""}
      // T13/F1: o fantasma do mestre para cada ação na fila com `move` — verificado em
      // JSON porque o viewer real desenha isto no canvas Pixi, que o teste não cobre.
      data-ghosts={JSON.stringify(props.intentGhosts ?? [])}
      // F12: o pré-visualizar do destino pendente e o "pôr" do placer do lobby.
      data-intent-preview={props.intentPreview ? JSON.stringify(props.intentPreview) : ""}
      data-placing-npc-id={props.placingNpcId ?? ""}
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
      {/* F12: soltar a peça arrastada num slot vazio, como o PiecesLayer faz. */}
      {props.map.pieces.map((piece) => (
        <button
          key={`move-${piece.id}`}
          data-testid={`move-piece-${piece.id}`}
          onClick={() => props.onPieceMove?.(piece.id, { kind: "square", col: 2, row: 2 })}
        >
          move {piece.id}
        </button>
      ))}
      {props.map.pieces.map((piece) => (
        <button
          key={`move-hex-${piece.id}`}
          data-testid={`move-piece-hex-${piece.id}`}
          onClick={() => props.onPieceMove?.(piece.id, { kind: "hex", q: 2, r: -1 })}
        >
          move hex {piece.id}
        </button>
      ))}
      <button data-testid="place-slot" onClick={() => props.onNpcPlaced?.({ kind: "square", col: 3, row: 5 })}>
        place-slot
      </button>
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

/**
 * O tabuleiro da partida chega como o servidor manda em todo registro com peças: num
 * `map_full_state` (F13) — o mapa do REST só dá fundo e grade.
 */
function openWithServerBoard(ws: FakeWS, pieces: typeof piecesFixture = piecesFixture) {
  act(() => {
    ws.onopen?.();
    ws.emit("map_full_state", {
      pieces: pieces.map((p) => ({ pieceId: p.id, slot: p.coord.slot, characterId: p.characterId, visible: p.visible })),
      walls: [],
      visiblePolygons: [],
      fogMode: "explored",
    });
  });
}

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
  // F13: as peças vêm só do servidor. O mapa da campanha (REST) tem duas peças; o tabuleiro
  // da partida pode ter outras — ou nenhuma, e aí o registro nem traz `map_full_state`.
  describe("o tabuleiro é do servidor (F13)", () => {
    it("tabuleiro vazio no servidor: não desenha as peças do REST nem manda map_state_sync", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      act(() => ws.onopen?.());
      await screen.findByTestId("map-stub");
      act(() => ws.emit("match_full_state", { roundMode: "", bars: { seq: 0, prices: null, characters: null, order: null } }));

      expect(ws.sent("map_state_sync")).toEqual([]);
      expect(screen.queryByTestId("select-actor-c1")).not.toBeInTheDocument();
      expect(screen.queryByTestId("select-actor-npc1")).not.toBeInTheDocument();
    });

    it("desenha as peças do map_full_state, não as do mapa da campanha", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      act(() => ws.onopen?.());
      await screen.findByTestId("map-stub");
      act(() =>
        ws.emit("map_full_state", {
          pieces: [{ pieceId: "server-piece", slot: { kind: "square", col: 7, row: 2 }, characterId: "c1" }],
          walls: [], visiblePolygons: [], fogMode: "explored",
        }),
      );

      expect(screen.getByTestId("select-actor-c1")).toHaveTextContent("server-piece");
      expect(screen.queryByTestId("select-actor-npc1")).not.toBeInTheDocument();
    });
  });

  it("abre a próxima ação e antecipa uma da fila", async () => {
    renderMasterPage();
    const ws = await waitForSocket();
    openWithServerBoard(ws);
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

  // T13/F6(2): o fantasma do MESTRE para uma ação na fila com `move` — o destino vem de
  // `action.move.position` (contrato), a origem é a posição atual da peça no tabuleiro.
  // Some no turn_opened porque a fila já tira a ação de `state.queue` ali (combatReducer).
  it("T13: action_queued com move desenha o fantasma do mestre no mapa, que some ao abrir o turno", async () => {
    renderMasterPage();
    const ws = await waitForSocket();
    openWithServerBoard(ws);

    act(() =>
      ws.emit("action_queued", {
        actionId: "a1",
        actorId: "npc1",
        bars: ["move"],
        action: {
          uuid: "a1",
          actorId: "npc1",
          reactionKind: "",
          move: { category: "Dash", from: [4, 4, 0], position: [6, 4, 0], finalSpeed: 12 },
        },
      }),
    );

    let mapStub = screen.getByTestId("map-stub");
    expect(JSON.parse(mapStub.getAttribute("data-ghosts") ?? "[]")).toEqual([
      { from: [4, 4, 0], to: [6, 4, 0] },
    ]);

    act(() => ws.emit("turn_opened", { turnId: "t1", actorId: "npc1", actionId: "a1", actionType: "" }));
    mapStub = screen.getByTestId("map-stub");
    expect(JSON.parse(mapStub.getAttribute("data-ghosts") ?? "[]")).toEqual([]);
  });

  // Fix round 1 (Important 2): uma ação que o PRÓPRIO mestre declarou por um NPC chega a
  // `state.declared` (pelo ack `action_enqueued`) E a `state.queue` (`action_queued` é
  // master-only, sempre, mesmo para quem declarou) com o MESMO actionId — sem a exclusão em
  // `useGameTable`, o fantasma apareceria duplicado sobre a mesma peça.
  it("T13: o fantasma de uma ação que o próprio mestre declarou por um NPC não duplica", async () => {
    renderMasterPage();
    const ws = await waitForSocket();
    openWithServerBoard(ws);

    const npcButton = await screen.findByTestId("select-actor-npc1");
    act(() => npcButton.click());
    act(() => screen.getByTestId("empty-slot").click());
    const declareButton = await screen.findByRole("button", { name: /declarar/i });
    act(() => declareButton.click());

    // O ack estampa o actionId real em `state.declared`.
    act(() => ws.emit("action_enqueued", { actionId: "a1" }));
    // `action_queued` chega para o mestre com o MESMO actionId, como sempre (master-only).
    act(() =>
      ws.emit("action_queued", {
        actionId: "a1",
        actorId: "npc1",
        bars: ["move"],
        action: {
          uuid: "a1",
          actorId: "npc1",
          reactionKind: "",
          move: { category: "Dash", from: [4, 4, 0], position: [9, 9, 0], finalSpeed: 10 },
        },
      }),
    );

    const mapStub = screen.getByTestId("map-stub");
    const ghosts = JSON.parse(mapStub.getAttribute("data-ghosts") ?? "[]");
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0]).toEqual({ from: [4, 4, 0], to: [9, 9, 0] });
  });

  // F10/B12: o mestre não recebe `ownQueue` — as declaradas dele (pelos NPCs) se reconciliam
  // pela `queue`. Depois de um reinício a Fila vem vazia, e a lista e o fantasma vão junto.
  describe("F10: as declaradas do mestre seguem a fila do servidor", () => {
    const declareNpcMove = async (ws: { emit: (t: string, p: unknown) => void }) => {
      act(() => screen.getByTestId("select-actor-npc1").click());
      act(() => screen.getByTestId("empty-slot").click());
      act(() => screen.getByRole("button", { name: /declarar/i }).click());
      act(() => ws.emit("action_enqueued", { actionId: "a1" }));
      await vi.waitFor(() => expect(screen.getAllByTestId("declared-row")).toHaveLength(1));
    };
    const ghosts = () => JSON.parse(screen.getByTestId("map-stub").getAttribute("data-ghosts") ?? "[]");
    const fullState = (ws: { emit: (t: string, p: unknown) => void }, extra: Record<string, unknown> = {}) =>
      act(() => ws.emit("match_full_state", {
        roundMode: "Race", bars: { seq: 1, prices: {}, characters: [], order: [] }, ...extra,
      }));

    it("a que a queue não tem sai da lista e o fantasma some", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      openWithServerBoard(ws);
      await screen.findByTestId("select-actor-npc1");
      await declareNpcMove(ws);
      expect(ghosts()).toHaveLength(1);

      fullState(ws); // `queue` ausente = fila vazia (contrato)

      await vi.waitFor(() => expect(screen.queryAllByTestId("declared-row")).toHaveLength(0));
      expect(ghosts()).toEqual([]);
    });

    it("a que a queue tem fica", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      openWithServerBoard(ws);
      await screen.findByTestId("select-actor-npc1");
      await declareNpcMove(ws);

      fullState(ws, {
        queue: [{
          actionId: "a1", actorId: "npc1", bars: ["move"],
          action: { uuid: "a1", actorId: "npc1", reactionKind: "", move: { category: "Dash", position: [9, 9, 0], finalSpeed: 10 } },
        }],
      });
      await act(async () => {});
      expect(screen.getAllByTestId("declared-row")).toHaveLength(1);
      expect(ghosts()).toHaveLength(1);
    });
  });

  it("F7: turno aberto mostra o card em andamento na Fila, com o cálculo anexado", async () => {
    renderMasterPage();
    const ws = await waitForSocket();
    openWithServerBoard(ws);
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
    openWithServerBoard(ws);
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
    openWithServerBoard(ws);
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
    openWithServerBoard(ws);

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
    openWithServerBoard(ws);

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
    openWithServerBoard(ws, [
      ...piecesFixture,
      {
        id: "piece-mapnpc",
        characterId: "map-npc-1",
        coord: { slot: { kind: "square", col: 6, row: 6 }, z: 0 },
        visible: true,
      },
    ]);

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
    openWithServerBoard(ws);

    const pcButton = await screen.findByTestId("select-actor-c1");
    const sentBefore = ws.send.mock.calls.length;
    act(() => pcButton.click());

    // Nada de novo é enviado pelo clique.
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
    openWithServerBoard(ws);

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
    openWithServerBoard(ws);

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
    openWithServerBoard(ws, [
      ...piecesFixture,
      {
        id: "piece-mapnpc",
        characterId: "map-npc-1",
        coord: { slot: { kind: "square", col: 6, row: 6 }, z: 0 },
        visible: true,
      },
    ]);

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
    openWithServerBoard(ws);

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
    openWithServerBoard(ws);
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
    );
    renderMasterPage();
    const ws = await waitForSocket();
    openWithServerBoard(ws, [
      ...piecesFixture,
      {
        id: "p-orfao",
        characterId: "npc-orfao",
        coord: { slot: { kind: "square", col: 5, row: 5 }, z: 0 },
        visible: true,
      },
    ]);
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
    openWithServerBoard(ws);

    act(() => screen.getByRole("button", { name: "Agir" }).click());
    await user.selectOptions(await screen.findByLabelText("Pôr na partida"), npcFixture.uuid);
    await user.click(screen.getByRole("button", { name: "Pôr" }));
    act(() => { ws.emit("error", { code: "npc_already_in_match", message: "npc already in match" }); });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("F8: nova cena manda change_scene com a categoria minúscula", async () => {
    renderMasterPage();
    const ws = await waitForSocket();
    openWithServerBoard(ws);

    await user.click(screen.getAllByRole("button", { name: "Nova cena" })[0]);
    await user.click(screen.getByRole("radio", { name: "Interpretação" }));
    await user.type(screen.getByLabelText("Descrição inicial"), "Taverna");
    await user.click(screen.getByRole("button", { name: "Trocar de cena" }));
    expect(ws.sent("change_scene")).toEqual([{ category: "roleplay", briefInitialDescription: "Taverna" }]);
  });

  // D1 (deferred do Task 7): o diálogo fica sempre montado, então category/description
  // sobreviviam ao Cancelar — reabrir mostrava o que foi digitado da vez anterior.
  it("D1: cancelar e reabrir reseta a categoria e a descrição para os padrões", async () => {
    renderMasterPage();
    const ws = await waitForSocket();
    openWithServerBoard(ws);

    await user.click(screen.getAllByRole("button", { name: "Nova cena" })[0]);
    await user.click(screen.getByRole("radio", { name: "Interpretação" }));
    await user.type(screen.getByLabelText("Descrição inicial"), "Taverna");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await user.click(screen.getAllByRole("button", { name: "Nova cena" })[0]);
    expect(screen.getByLabelText("Descrição inicial")).toHaveValue("");
    expect(screen.getByRole("radio", { name: "Batalha" })).toBeChecked();
  });

  it("F8: com turno aberto, Nova cena fica desabilitado", async () => {
    renderMasterPage();
    const ws = await waitForSocket();
    openWithServerBoard(ws);
    act(() => { ws.emit("turn_opened", { turnId: "t1", actorId: "c1", actionId: "a1", actionType: "" }); });
    for (const b of screen.getAllByRole("button", { name: "Nova cena" })) expect(b).toBeDisabled();
  });

  it("F3: tocar num card abre a ficha no painel, sem navegar", async () => {
    renderMasterPage();
    const ws = await waitForSocket();
    openWithServerBoard(ws);

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
  // F4: o mestre também lê o Histórico do REST — o ao vivo por cima até o refetch, que o
  // `round_mode_changed` dispara (parte 2: o REST guarda a troca de regime em `events`).
  it("F4: o Histórico do mestre junta o turno do REST e o regime, que o refetch traz", async () => {
    let calls = 0;
    server.use(
      http.get(`${baseUrl}/matches/:id/history`, () => {
        calls++;
        return HttpResponse.json({
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
                masterActions: [],
              }],
              events: calls >= 2
                // Antes do turno de propósito: a linha ao vivo (00:02) fica DEPOIS dele — se ela
                // não saísse quando o REST chega, a contagem e a ordem denunciariam.
                ? [{ uuid: "e1", kind: "roundModeChanged", createdAt: "2026-06-01T00:00:30Z", payload: { from: "Race", to: "Free" } }]
                : [],
            }],
          }],
        });
      }),
    );
    renderMasterPage();
    const ws = await waitForSocket();
    openWithServerBoard(ws);
    await user.click(await screen.findByRole("button", { name: "Ver histórico" }));

    expect(await screen.findByText("Turno de Capanga — atacou Gon com Sword · Gon −4")).toBeInTheDocument();
    const before = calls;
    const texts = () => screen.getAllByTestId("event-row").map((r) => r.textContent);
    act(() => ws.emit("round_mode_changed", { mode: "Free" }, { timestamp: "2026-06-01T00:02:00Z" }));
    // Ao vivo, antes de o refetch responder: o regime na hora da mensagem, depois do turno.
    expect(texts()).toEqual([
      expect.stringContaining("Cena: batalha"),
      expect.stringContaining("Turno de Capanga"),
      expect.stringContaining("Regime: Livre"),
    ]);
    await vi.waitFor(() => expect(calls).toBe(before + 1));
    // O REST chegou: a linha ao vivo saiu e a do REST ocupa a hora gravada, antes do turno.
    await vi.waitFor(() => expect(texts()).toEqual([
      expect.stringContaining("Cena: batalha"),
      expect.stringContaining("Regime: Livre"),
      expect.stringContaining("Turno de Capanga"),
    ]));
  });

  // F12: o mestre arruma o tabuleiro num modo próprio — fora dele nada arrasta (I1). Soltar,
  // pôr e tirar só abrem a confirmação; quem move a peça é o `piece_moved` do servidor.
  describe("F12: Arrumar o tabuleiro", () => {
    const mapStub = () => screen.getByTestId("map-stub");
    const dialog = () => screen.queryByRole("dialog", { name: "Arrumar o tabuleiro" });
    const enterArrange = () => act(() => screen.getByRole("button", { name: "Arrumar" }).click());

    it("entrar no modo torna todas as peças arrastáveis, solta o ator e mostra o painel; Esc sai", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      openWithServerBoard(ws);
      act(() => screen.getByTestId("select-actor-npc1").click());
      expect(mapStub()).toHaveAttribute("data-has-long-press", "true");

      enterArrange();
      expect(screen.getByRole("button", { name: "Arrumar" })).toHaveAttribute("aria-pressed", "true");
      expect(JSON.parse(mapStub().getAttribute("data-draggable-piece-ids") ?? "[]")).toEqual(["piece-c1", "piece-npc1"]);
      expect(mapStub()).toHaveAttribute("data-has-long-press", "false");
      expect(screen.getByText("Arrumar o tabuleiro")).toBeInTheDocument();
      // o ator foi solto: o compositor sumiu
      expect(screen.queryByRole("button", { name: /declarar/i })).not.toBeInTheDocument();

      await user.keyboard("{Escape}");
      expect(screen.getByRole("button", { name: "Arrumar" })).toHaveAttribute("aria-pressed", "false");
      expect(mapStub()).toHaveAttribute("data-draggable-piece-ids", "[]");
      expect(screen.queryByText("Arrumar o tabuleiro")).not.toBeInTheDocument();
    });

    it("soltar a peça abre a confirmação, mostra o destino e não envia nada", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      openWithServerBoard(ws);
      enterArrange();

      act(() => screen.getByTestId("move-piece-piece-c1").click());
      expect(dialog()).toHaveTextContent("Mover Gon para coluna 3, linha 3?");
      expect(ws.sent("enqueue_master_action")).toEqual([]);
      expect(JSON.parse(mapStub().getAttribute("data-intent-preview") ?? "null")).toEqual({
        from: { kind: "square", col: 1, row: 1 },
        to: { kind: "square", col: 2, row: 2 },
        auto: false,
        targets: [],
      });
    });

    it("confirmar o arrastar manda o move do contrato, com o uuid da ficha", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      openWithServerBoard(ws);
      enterArrange();

      act(() => screen.getByTestId("move-piece-piece-c1").click());
      await user.click(screen.getByRole("button", { name: "Confirmar" }));
      expect(ws.sent("enqueue_master_action")).toEqual([{ targetIds: ["c1"], move: { position: [2, 2, 0] } }]);
      expect(dialog()).not.toBeInTheDocument();
      expect(mapStub()).toHaveAttribute("data-intent-preview", "");
    });

    it("cancelar não envia nada e fecha a confirmação", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      openWithServerBoard(ws);
      enterArrange();

      act(() => screen.getByTestId("move-piece-piece-c1").click());
      await user.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(dialog()).not.toBeInTheDocument();
      expect(ws.sent("enqueue_master_action")).toEqual([]);
    });

    it("pôr: lista quem não tem peça e os NPCs da campanha, nunca o jogador de fora; confirmar manda o move", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({
            campaign: campaignWithNpcsApi(
              [npcFixture],
              [{ ...npcFixture, uuid: "pc-out", nickName: "Leorio", playerUuid: "user-9" }],
            ),
          }),
        ),
      );
      renderWithProviders(
        <GameMasterPage token="fake-jwt-token" matchId="match-1" campaignId="campaign-1" />,
      );
      const ws = await waitForSocket();
      openWithServerBoard(ws, [piecesFixture[0]]);
      enterArrange();

      const placeList = await screen.findByRole("group", { name: "Pôr no mapa" });
      await within(placeList).findByRole("button", { name: npcFixture.nickName });
      expect(within(placeList).getByRole("button", { name: "Capanga" })).toBeInTheDocument();
      expect(within(placeList).queryByRole("button", { name: "Gon" })).not.toBeInTheDocument();
      expect(within(placeList).queryByRole("button", { name: "Leorio" })).not.toBeInTheDocument();

      await user.click(within(placeList).getByRole("button", { name: "Capanga" }));
      expect(mapStub()).toHaveAttribute("data-placing-npc-id", "npc1");
      await user.click(screen.getByTestId("place-slot"));
      expect(dialog()).toHaveTextContent("Pôr Capanga em coluna 4, linha 6?");
      expect(ws.sent("enqueue_master_action")).toEqual([]);

      await user.click(screen.getByRole("button", { name: "Confirmar" }));
      expect(ws.sent("enqueue_master_action")).toEqual([{ targetIds: ["npc1"], move: { position: [3, 5, 0] } }]);
      expect(mapStub()).toHaveAttribute("data-placing-npc-id", "");
    });

    it("pôr um NPC da campanha que não participa manda o move com o uuid dele", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ campaign: campaignWithNpcsApi([npcFixture]) }),
        ),
      );
      renderWithProviders(
        <GameMasterPage token="fake-jwt-token" matchId="match-1" campaignId="campaign-1" />,
      );
      const ws = await waitForSocket();
      openWithServerBoard(ws);
      enterArrange();

      await user.click(await screen.findByRole("button", { name: npcFixture.nickName }));
      await user.click(screen.getByTestId("place-slot"));
      expect(dialog()).toHaveTextContent(`Pôr ${npcFixture.nickName} em coluna 4, linha 6?`);
      await user.click(screen.getByRole("button", { name: "Confirmar" }));
      expect(ws.sent("enqueue_master_action")).toEqual([{ targetIds: [npcFixture.uuid], move: { position: [3, 5, 0] } }]);
    });

    it("tirar: tocar seleciona a peça e Tirar do mapa, confirmado, manda o remove", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      openWithServerBoard(ws);
      enterArrange();
      expect(screen.queryByRole("button", { name: "Tirar do mapa" })).not.toBeInTheDocument();

      act(() => screen.getByTestId("select-actor-c1").click());
      expect(mapStub()).toHaveAttribute("data-selected-piece-id", "piece-c1");
      await user.click(screen.getByRole("button", { name: "Tirar do mapa" }));
      expect(dialog()).toHaveTextContent("Tirar Gon do mapa?");
      expect(ws.sent("enqueue_master_action")).toEqual([]);

      await user.click(screen.getByRole("button", { name: "Confirmar" }));
      expect(ws.sent("enqueue_master_action")).toEqual([{ targetIds: ["c1"], remove: {} }]);
    });

    it("a confirmação pendente cai ao sair do modo e em todo match_full_state", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      openWithServerBoard(ws);
      enterArrange();

      act(() => screen.getByTestId("move-piece-piece-c1").click());
      expect(dialog()).toBeInTheDocument();
      act(() => ws.emit("match_full_state", { roundMode: "", bars: { seq: 0, prices: null, characters: null, order: null } }));
      expect(dialog()).not.toBeInTheDocument();
      // o modo continua
      expect(screen.getByRole("button", { name: "Arrumar" })).toHaveAttribute("aria-pressed", "true");

      act(() => screen.getByTestId("move-piece-piece-c1").click());
      expect(dialog()).toBeInTheDocument();
      act(() => screen.getByRole("button", { name: "Arrumar" }).click());
      expect(dialog()).not.toBeInTheDocument();

      enterArrange();
      act(() => screen.getByTestId("move-piece-piece-c1").click());
      await user.keyboard("{Escape}");
      expect(dialog()).not.toBeInTheDocument();
      expect(ws.sent("enqueue_master_action")).toEqual([]);
    });

    it("fora do modo, soltar e pôr não fazem nada", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      openWithServerBoard(ws);
      act(() => screen.getByTestId("move-piece-piece-c1").click());
      act(() => screen.getByTestId("place-slot").click());
      expect(dialog()).not.toBeInTheDocument();
      expect(ws.sent("enqueue_master_action")).toEqual([]);
    });
    // ─── Follow-up (revisão da T17) ──────────────────────────────────────────
    it("chip armado: um toque num controle por cima do mapa não vira pôr e desarma", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      openWithServerBoard(ws, [piecesFixture[0]]);
      enterArrange();
      await user.click(screen.getByRole("button", { name: "Capanga" }));
      expect(mapStub()).toHaveAttribute("data-placing-npc-id", "npc1");
      // arrastar e pôr na mesma soltura brigam: com o chip armado nada arrasta
      expect(mapStub()).toHaveAttribute("data-draggable-piece-ids", "[]");

      // O placer do Pixi escuta o pointerup na janela e só olha se ele caiu dentro da caixa
      // do canvas — o Enquadrar está dentro dela. O stub reproduz a chamada sem pointerup.
      fireEvent.pointerUp(screen.getByRole("button", { name: "Enquadrar" }));
      act(() => screen.getByTestId("place-slot").click());

      expect(dialog()).not.toBeInTheDocument();
      expect(mapStub()).toHaveAttribute("data-placing-npc-id", "");
      expect(ws.sent("enqueue_master_action")).toEqual([]);
    });

    it("soltar a peça no próprio slot não pergunta nada", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      openWithServerBoard(ws, [{ ...piecesFixture[0], coord: { slot: { kind: "square", col: 2, row: 2 }, z: 0 } }]);
      enterArrange();
      act(() => screen.getByTestId("move-piece-piece-c1").click());
      expect(dialog()).not.toBeInTheDocument();
    });

    it("Esc de outro diálogo ou de um campo de texto não sai do Arrumar", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      openWithServerBoard(ws);
      enterArrange();

      await user.click(screen.getAllByRole("button", { name: "Nova cena" })[0]);
      await user.keyboard("{Escape}");
      expect(screen.getByRole("button", { name: "Arrumar" })).toHaveAttribute("aria-pressed", "true");
      await user.click(screen.getByRole("button", { name: "Cancelar" }));

      const input = document.createElement("input");
      document.body.append(input);
      input.focus();
      await user.keyboard("{Escape}");
      expect(screen.getByRole("button", { name: "Arrumar" })).toHaveAttribute("aria-pressed", "true");
      input.remove();
    });

    it("em grade hex, o move vai como [q, r, z]", async () => {
      server.use(
        http.get(`${baseUrl}/maps/:id`, () =>
          HttpResponse.json({ map: { ...mapApiFixture, grid: { ...(mapApiFixture.grid as object), kind: "hex" } } }),
        ),
      );
      renderMasterPage();
      const ws = await waitForSocket();
      openWithServerBoard(ws, [
        { id: "piece-c1", characterId: "c1", coord: { slot: { kind: "hex", q: 0, r: 0 } as never, z: 0 }, visible: true },
      ]);
      enterArrange();

      act(() => screen.getByTestId("move-piece-hex-piece-c1").click());
      expect(dialog()).toHaveTextContent("Mover Gon para q 2, r -1?");
      await user.click(screen.getByRole("button", { name: "Confirmar" }));
      expect(ws.sent("enqueue_master_action")).toEqual([{ targetIds: ["c1"], move: { position: [2, -1, 0] } }]);
    });

    it("sem conexão, Confirmar fica desabilitado, o pedido fica e nada sai", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      openWithServerBoard(ws);
      enterArrange();
      act(() => screen.getByTestId("move-piece-piece-c1").click());

      act(() => ws.onclose?.({ code: 1000 } as CloseEvent));
      const confirm = within(dialog()!).getByRole("button", { name: "Confirmar" });
      expect(confirm).toBeDisabled();
      await user.click(confirm);
      expect(dialog()).toHaveTextContent("Mover Gon para coluna 3, linha 3?");
      expect(ws.sent("enqueue_master_action")).toEqual([]);
    });

    it("escolher uma aba do rail sai do Arrumar e abre a aba", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      openWithServerBoard(ws);
      enterArrange();
      act(() => screen.getByTestId("move-piece-piece-c1").click());
      act(() => screen.getByRole("button", { name: "Agir" }).click());

      expect(screen.getByRole("button", { name: "Arrumar" })).toHaveAttribute("aria-pressed", "false");
      expect(screen.queryByText("Arrumar o tabuleiro")).not.toBeInTheDocument();
      expect(screen.getByText("Agir por")).toBeInTheDocument();
      expect(dialog()).not.toBeInTheDocument();
    });

    it("tocar de novo na peça selecionada a solta", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      openWithServerBoard(ws);
      enterArrange();
      act(() => screen.getByTestId("select-actor-c1").click());
      expect(mapStub()).toHaveAttribute("data-selected-piece-id", "piece-c1");
      act(() => screen.getByTestId("select-actor-c1").click());
      expect(mapStub()).toHaveAttribute("data-selected-piece-id", "");
      expect(screen.queryByRole("button", { name: "Tirar do mapa" })).not.toBeInTheDocument();
    });
  });

  describe("F14: o mestre escolhe onde cai a fuga que falhou", () => {
    const mapStub = () => screen.getByTestId("map-stub");
    const dialog = () => screen.queryByRole("dialog", { name: "Onde cai" });
    const chooseFall = () =>
      act(() => within(screen.getByTestId("queue-open")).getByRole("button", { name: "Escolher onde cai" }).click());

    /** O Capanga ataca o Gon, que fugiu e está falhando no movimento. */
    function openFailingEscape(ws: FakeWS) {
      openWithServerBoard(ws);
      act(() => ws.emit("action_queued", { actionId: "a1", actorId: "npc1", bars: ["action"] }));
      act(() => ws.emit("turn_opened", { turnId: "t1", actorId: "npc1", actionId: "a1", actionType: "" }));
      act(() =>
        ws.emit("resolution_updated", {
          turnId: "t1",
          isSettled: false,
          targets: [{
            targetId: "c1", avoided: false, defended: false, dodgeTotal: 14, defenseTotal: 0,
            rawDamage: 8, defenseApplied: 0, projectedDamage: 8,
            reaction: { kind: "escape", total: 14, reactionId: "r-esc", margin: 0, difference: 0, stopsAttack: false },
            escape: { escaped: false, movePassed: false, dodgePassed: true, awaitsMaster: true },
          }],
        }),
      );
    }

    it("escolher, tocar no slot vazio e confirmar manda o edit_action com o slot", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      openFailingEscape(ws);
      act(() => screen.getByTestId("select-actor-npc1").click());
      expect(mapStub()).toHaveAttribute("data-has-long-press", "true");
      act(() => screen.getByRole("button", { name: "Fila" }).click());

      chooseFall();
      // o ator foi solto e tocar nas peças não faz nada: só o slot vazio responde
      expect(screen.queryByRole("button", { name: /declarar/i })).not.toBeInTheDocument();
      expect(mapStub()).toHaveAttribute("data-has-piece-select", "false");
      expect(mapStub()).toHaveAttribute("data-has-long-press", "false");
      expect(mapStub()).toHaveAttribute("data-has-empty-slot-click", "true");
      expect(screen.getByRole("button", { name: "Arrumar" })).toHaveAttribute("aria-pressed", "false");

      act(() => screen.getByTestId("empty-slot").click());
      expect(dialog()).toHaveTextContent("Gon cai em coluna 10, linha 10?");
      expect(JSON.parse(mapStub().getAttribute("data-intent-preview") ?? "null")).toEqual({
        from: { kind: "square", col: 1, row: 1 },
        to: { kind: "square", col: 9, row: 9 },
        auto: false,
        targets: [],
      });
      expect(ws.sent("edit_action")).toEqual([]);

      await user.click(screen.getByRole("button", { name: "Confirmar" }));
      expect(ws.sent("edit_action")).toEqual([
        { actionId: "r-esc", escapeLanding: { position: [9, 9, 0] } },
      ]);
      expect(dialog()).not.toBeInTheDocument();
      expect(mapStub()).toHaveAttribute("data-has-empty-slot-click", "false");
      expect(mapStub()).toHaveAttribute("data-has-piece-select", "true");
    });

    it("Esc e o × cancelam sem enviar nada", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      openFailingEscape(ws);

      chooseFall();
      act(() => screen.getByTestId("empty-slot").click());
      await user.keyboard("{Escape}");
      expect(dialog()).not.toBeInTheDocument();
      expect(mapStub()).toHaveAttribute("data-has-empty-slot-click", "false");

      chooseFall();
      await user.click(screen.getByRole("button", { name: "Cancelar a escolha de onde cai" }));
      expect(mapStub()).toHaveAttribute("data-has-empty-slot-click", "false");
      expect(screen.queryByRole("button", { name: "Cancelar a escolha de onde cai" })).not.toBeInTheDocument();
      expect(ws.sent("edit_action")).toEqual([]);
    });

    it("entrar no Arrumar sai da escolha, e vice-versa", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      openFailingEscape(ws);

      chooseFall();
      act(() => screen.getByRole("button", { name: "Arrumar" }).click());
      expect(screen.getByRole("button", { name: "Arrumar" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.queryByRole("button", { name: "Cancelar a escolha de onde cai" })).not.toBeInTheDocument();
      act(() => screen.getByTestId("empty-slot").click());
      expect(dialog()).not.toBeInTheDocument();

      act(() => screen.getByRole("button", { name: "Arrumar" }).click());
      chooseFall();
      expect(screen.getByRole("button", { name: "Arrumar" })).toHaveAttribute("aria-pressed", "false");
      expect(mapStub()).toHaveAttribute("data-draggable-piece-ids", "[]");
    });

    it("o turno fechar no meio da escolha encerra o modo", async () => {
      renderMasterPage();
      const ws = await waitForSocket();
      openFailingEscape(ws);

      chooseFall();
      act(() => screen.getByTestId("empty-slot").click());
      act(() => ws.emit("turn_closed", { turnId: "t1" }));
      expect(dialog()).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Cancelar a escolha de onde cai" })).not.toBeInTheDocument();
      expect(mapStub()).toHaveAttribute("data-has-empty-slot-click", "false");
    });
  });
});
