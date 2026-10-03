// src/pages/__tests__/GamePlayerPage.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { matchApiFixture } from "../../test/fixtures/match";
import { mapApiFixture } from "../../test/fixtures/map";
import GamePlayerPage from "../GamePlayerPage";
import { installFakeWebSocket, waitForSocket } from "../../test/fakeWebSocket";
import type { FakeWS } from "../../test/fakeWebSocket";

const baseUrl = "http://localhost:5000";
const user = userEvent.setup();

// Pixi não é coberto por teste (src/test/setup.ts mocka @pixi/react); o único jeito de
// disparar cliques de peça/slot em vitest é substituir o componente inteiro por um stub
// (R13) que expõe um botão por peça e um botão de slot vazio.
vi.mock("../../features/tactical-map/TacticalMapViewer", () => ({
  default: (props: {
    map: {
      pieces: Array<{ id: string; characterId: string; coord?: { slot?: { col?: number; row?: number } } }>;
      walls: Array<{ id: string }>;
    };
    draggablePieceIds?: Set<string>;
    onPieceSelect?: (pieceId: string) => void;
    onPieceLongPress?: (pieceId: string) => void;
    onWallClick?: (wall: { id: string }) => void;
    onEmptySlotClick?: (slot: { kind: "square"; col: number; row: number }, x: number, y: number) => void;
  }) => (
    <div
      data-testid="map-stub"
      // Final review, Important 1: draggablePieceIds must reach PiecesLayer as an empty
      // Set (not undefined) — undefined reads there as "every piece is draggable".
      data-draggable-piece-ids={props.draggablePieceIds ? JSON.stringify([...props.draggablePieceIds]) : "undefined"}
    >
      {props.map.pieces.map((piece) => (
        <button
          key={piece.id}
          data-testid={`select-actor-${piece.characterId}`}
          // F3: exposes the slot so a test can prove piece_moved actually reaches the
          // rendered board, not just the reducer/hook state.
          data-slot={JSON.stringify(piece.coord?.slot ?? null)}
          onClick={() => props.onPieceSelect?.(piece.id)}
          onContextMenu={() => props.onPieceLongPress?.(piece.id)}
        >
          {piece.id}
        </button>
      ))}
      {(props.map.walls ?? []).map((wall) => (
        <button key={wall.id} data-testid={`wall-${wall.id}`} onClick={() => props.onWallClick?.(wall)}>
          {wall.id}
        </button>
      ))}
      <button data-testid="empty-slot" onClick={() => props.onEmptySlotClick?.({ kind: "square", col: 9, row: 9 }, 0, 0)}>
        empty-slot
      </button>
    </div>
  ),
}));

// jsdom's ResizeObserver mock always reports zero size (src/test/setup.ts), which would
// keep GamePlayerPage's `width > 0 && height > 0` gate closed forever. The gate itself is a
// real, production guard (never mount Pixi at 0×0) — the fix is to give the test a
// non-zero measurement, not to remove the guard.
vi.mock("../../hooks/useResizeObserver", () => ({
  useResizeObserver: () => ({ width: 800, height: 600 }),
}));

// Same fake socket as useMatchCombat.test.ts/useMatchWs.test.ts — the hook gates sends on
// `ws.readyState === WebSocket.OPEN`.

const participantsFixture = [
  {
    uuid: "participant-1",
    joinedAt: "2026-06-01T00:00:00Z",
    characterSheet: {
      uuid: "c1",
      playerUuid: "user-1",
      masterUuid: "master-1",
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
      uuid: "c2",
      playerUuid: "user-2",
      masterUuid: "master-1",
      campaignUuid: "campaign-1",
      nickName: "Killua",
      createdAt: "2026-06-01T00:00:00Z",
      updatedAt: "2026-06-01T00:00:00Z",
      private: null,
    },
  },
];

const DRAFT_KEY = "match-draft:v2:match-1:c1";
const storedDraft = () => {
  const raw = localStorage.getItem(DRAFT_KEY);
  return raw ? JSON.parse(raw) : null;
};

const lastSent = (ws: { send: { mock: { calls: unknown[][] } } }) =>
  ws.send.mock.calls[ws.send.mock.calls.length - 1]?.[0];

function renderPlayerPage() {
  return renderWithProviders(<GamePlayerPage token="fake-jwt-token" matchId="match-1" />);
}

beforeEach(() => {
  installFakeWebSocket();

  server.use(
    http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json({ match: matchApiFixture })),
    http.get(`${baseUrl}/matches/:id/map`, () =>
      HttpResponse.json({
        matchMap: { matchUuid: "match-1", mapUuid: mapApiFixture.id, attachedAt: "2026-06-04T00:00:00Z" },
      }),
    ),
    http.get(`${baseUrl}/maps/:id`, () => HttpResponse.json({ map: mapApiFixture })),
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

describe("GamePlayerPage", () => {
  it("mostra o erro do servidor em vez de engoli-lo", async () => {
    renderPlayerPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    act(() => ws.emit("error", { code: "forbidden", message: "only the master can perform this action" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/só o mestre/i);
  });

  it("aplica bars_updated e descarta snapshot atrasado", async () => {
    renderPlayerPage();
    // Espera participants (React Query) resolver, para nameOf("c1") já enxergar "Gon" —
    // senão o primeiro bars_updated chega antes do fetch, e a linha nasce com o id cru.
    await screen.findByText("Gon");
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    act(() =>
      ws.emit("bars_updated", {
        seq: 5,
        prices: { action: 14 },
        characters: [],
        order: [{ actorId: "c1", bars: ["action"], key: 18 }],
      }),
    );
    expect(await screen.findByTestId("order-row")).toHaveTextContent("Gon");

    act(() => ws.emit("bars_updated", { seq: 2, prices: {}, characters: [], order: [] }));
    expect(screen.getAllByTestId("order-row")).toHaveLength(1);
  });

  // R33 regression (post-PR#67): Go serializes a nil slice as JSON `null`, not `[]` — an
  // empty round's bars_updated genuinely arrives with order/characters/prices null.
  // Without normalizeWire.ts, GeneralBar's `[...bars.order]` (and OwnBars' `bars.prices`
  // lookup) throw "bars.order is not iterable" and take the whole page down.
  it("bars_updated com order/characters/prices null não derruba a página (R33)", async () => {
    renderPlayerPage();
    await screen.findByText("Gon");
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    act(() =>
      ws.emit("bars_updated", {
        seq: 1,
        prices: null,
        characters: null,
        order: null,
      }),
    );

    // A página não crashou: a barra geral diz que a ordem está vazia e os saldos seguem lá.
    expect(await screen.findByText("ordem vazia")).toBeInTheDocument();
    expect(screen.getByTestId("balance-action")).toBeInTheDocument();
    // Sem entradas na ordem projetada (order normalizou para []).
    expect(screen.queryByTestId("order-row")).not.toBeInTheDocument();
  });

  it("clica numa peça e Declarar manda enqueue_action com meu ator e o alvo clicado", async () => {
    renderPlayerPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    act(() =>
      ws.emit("map_full_state", {
        pieces: [
          { pieceId: "piece-c1", slot: { kind: "square", col: 1, row: 1 }, characterId: "c1", visible: true, z: 0 },
          { pieceId: "piece-c2", slot: { kind: "square", col: 2, row: 2 }, characterId: "c2", visible: true, z: 0 },
        ],
        walls: [],
        visiblePolygons: [],
        fogMode: "explored",
      }),
    );

    const targetButton = await screen.findByTestId("select-actor-c2");
    act(() => targetButton.click());

    // Alvo colado: só ataque — ninguém é obrigado a se mover.
    const declareButton = await screen.findByRole("button", { name: "Declarar ataque" });
    expect(declareButton).not.toBeDisabled();
    act(() => declareButton.click());

    const calls = ws.send.mock.calls;
    const lastSend = calls[calls.length - 1]?.[0] as string;
    expect(JSON.parse(lastSend)).toEqual({
      type: "enqueue_action",
      payload: { actorId: "c1", targetId: ["c2"], attack: {} },
    });
  });

  // F3: o contrato diz que o servidor move a peça sozinho na abertura do turno (ou numa
  // fuga de reação) e emite piece_moved/piece_removed — antes disto useMatchWs só dava
  // warn em DEV e o tabuleiro nunca se mexia sozinho.
  it("piece_moved move a peça renderizada; um pieceId novo entra no tabuleiro (F3)", async () => {
    renderPlayerPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    act(() =>
      ws.emit("map_full_state", {
        pieces: [
          { pieceId: "piece-c1", slot: { kind: "square", col: 1, row: 1 }, characterId: "c1", visible: true, z: 0 },
        ],
        walls: [],
        visiblePolygons: [],
        fogMode: "explored",
      }),
    );
    const c1Button = await screen.findByTestId("select-actor-c1");
    expect(c1Button).toHaveAttribute("data-slot", JSON.stringify({ kind: "square", col: 1, row: 1 }));

    // O servidor move a peça existente sozinho (abertura do turno).
    act(() =>
      ws.emit("piece_moved", {
        pieceId: "piece-c1",
        slot: { kind: "square", col: 7, row: 7 },
        characterId: "c1",
        visible: true,
        z: 0,
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("select-actor-c1")).toHaveAttribute(
        "data-slot",
        JSON.stringify({ kind: "square", col: 7, row: 7 }),
      ),
    );

    // Uma peça ainda não conhecida (entrou em campo de visão) é inserida, não ignorada.
    act(() =>
      ws.emit("piece_moved", {
        pieceId: "piece-c2",
        slot: { kind: "square", col: 3, row: 3 },
        characterId: "c2",
        visible: true,
        z: 0,
      }),
    );
    expect(await screen.findByTestId("select-actor-c2")).toHaveAttribute(
      "data-slot",
      JSON.stringify({ kind: "square", col: 3, row: 3 }),
    );

    // piece_removed some com ela de novo (saiu de campo de visão).
    act(() => ws.emit("piece_removed", { pieceId: "piece-c2" }));
    await waitFor(() =>
      expect(screen.queryByTestId("select-actor-c2")).not.toBeInTheDocument(),
    );
  });

  // Final review, Important 2/M3 (R28): o rascunho só some no ack que CORRESPONDE ao
  // envio do composer (clearsDraft:true) — não em qualquer action_enqueued que chegue.
  // O teste agora manda de verdade (clica Declarar) em vez de só emitir o ack solto, para
  // exercitar o FIFO de pendingSends que carrega essa metadata.
  it("rascunho persiste no localStorage e some quando o PRÓPRIO envio é confirmado (action_enqueued)", async () => {
    renderPlayerPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    act(() =>
      ws.emit("map_full_state", {
        pieces: [
          { pieceId: "piece-c1", slot: { kind: "square", col: 1, row: 1 }, characterId: "c1", visible: true, z: 0 },
          { pieceId: "piece-c2", slot: { kind: "square", col: 2, row: 2 }, characterId: "c2", visible: true, z: 0 },
        ],
        walls: [],
        visiblePolygons: [],
        fogMode: "explored",
      }),
    );

    const targetButton = await screen.findByTestId("select-actor-c2");
    act(() => targetButton.click());

    await waitFor(() => expect(storedDraft()?.attack).toEqual({ targets: ["c2"] }));

    const declareButton = await screen.findByRole("button", { name: /^declarar/i });
    act(() => declareButton.click());

    act(() => ws.emit("action_enqueued", { actionId: "action-1" }));

    await waitFor(() => expect(storedDraft()).toBeNull());
  });

  // F10/B12: o servidor reiniciou e perdeu a fila. Uma declarada que ele não conhece sai da
  // lista; só depois do histórico buscado DEPOIS do match_full_state ela vira perda (aviso +
  // rascunho de volta) — ou some calada, se rodou durante a queda. NADA é reenviado (I7).
  describe("F10: declaradas seguem o servidor", () => {
    const wall = {
      id: "wall-1", p1: [0, 0], p2: [1, 0], wallType: "door", material: "wood",
      move: false, sense: "none", direction: "both", open: false, locked: false,
      hp: 10, maxHp: 10, resistance: 0, destroyed: false,
    };
    const board = (ws: FakeWS) =>
      act(() =>
        ws.emit("map_full_state", {
          pieces: [
            { pieceId: "piece-c1", slot: { kind: "square", col: 1, row: 1 }, characterId: "c1", visible: true, z: 0 },
            { pieceId: "piece-c2", slot: { kind: "square", col: 2, row: 2 }, characterId: "c2", visible: true, z: 0 },
          ],
          walls: [wall],
          visiblePolygons: [],
          fogMode: "explored",
        }),
      );
    const declare = async (ws: FakeWS, pick: () => void, actionId: string) => {
      act(pick);
      act(() => screen.getByRole("button", { name: /^declarar/i }).click());
      act(() => ws.emit("action_enqueued", { actionId }));
      await waitFor(() => expect(storedDraft()).toBeNull());
    };
    const attackC2 = () => screen.getByTestId("select-actor-c2").click();
    const fullState = (ws: FakeWS, extra: Record<string, unknown> = {}) =>
      act(() =>
        ws.emit("match_full_state", {
          roundMode: "Race", bars: { seq: 1, prices: {}, characters: [], order: [] }, ownQueue: [], ...extra,
        }),
      );
    const turnOf = (actionId: string) => ({
      scenes: [{
        uuid: "s1", category: "battle", briefDesc: "", createdAt: "2026-06-01T00:00:00Z",
        rounds: [{
          uuid: "r1", mode: "Race", createdAt: "2026-06-01T00:00:00Z",
          turns: [{
            uuid: "t1", createdAt: "2026-06-01T00:01:00Z", finishedAt: "2026-06-01T00:01:00Z",
            action: { uuid: actionId, actorId: "c1", reactionKind: "", targetId: ["c2"], attack: { weapon: "Fist" } },
            masterActions: [],
          }],
          events: [],
        }],
      }],
    });
    /** O 1º fetch (montagem) responde vazio; os seguintes, `later` — depois de `gate`, se houver. */
    const historyHandler = (later: Record<string, unknown>, gate?: Promise<void>) => {
      const calls = { n: 0 };
      server.use(
        http.get(`${baseUrl}/matches/:id/history`, async () => {
          calls.n += 1;
          if (calls.n === 1) return HttpResponse.json({ scenes: [] });
          if (gate) await gate;
          return HttpResponse.json(later);
        }),
      );
      return calls;
    };

    it("perdida de verdade: aviso, o rascunho volta e nada é reenviado", async () => {
      renderPlayerPage();
      const ws = await waitForSocket();
      act(() => ws.onopen?.());
      board(ws);
      await declare(ws, attackC2, "action-1");
      expect(ws.sent("enqueue_action")).toHaveLength(1);

      fullState(ws);

      const notice = await screen.findByText(/o servidor perdeu 1 ação/i);
      expect(notice).toHaveTextContent(/o rascunho voltou para o compositor/i);
      await waitFor(() => expect(storedDraft()?.attack).toEqual({ targets: ["c2"] }));
      expect(ws.sent("enqueue_action")).toHaveLength(1);

      await user.click(screen.getByRole("button", { name: /fechar aviso/i }));
      expect(screen.queryByText(/o servidor perdeu/i)).not.toBeInTheDocument();
      expect(ws.sent("enqueue_action")).toHaveLength(1);
    });

    it("abriu e fechou durante a queda (está no histórico): some calada, sem rascunho de volta", async () => {
      const calls = historyHandler(turnOf("action-1"));
      renderPlayerPage();
      const ws = await waitForSocket();
      act(() => ws.onopen?.());
      board(ws);
      await declare(ws, attackC2, "action-1");

      fullState(ws);

      // A linha do turno só existe na resposta do fetch pós-reconexão: quando ela aparece,
      // a decisão já foi tomada.
      expect(await screen.findByText(/Turno de Gon/)).toBeInTheDocument();
      expect(calls.n).toBeGreaterThanOrEqual(2);
      await act(async () => {});
      expect(screen.queryByText(/o servidor perdeu/i)).not.toBeInTheDocument();
      expect(storedDraft()).toBeNull();
      expect(screen.queryAllByTestId("declared-row")).toHaveLength(0);
      expect(ws.sent("enqueue_action")).toHaveLength(1);
    });

    it("nada acontece antes do histórico pós-reconexão chegar", async () => {
      let release!: () => void;
      const gate = new Promise<void>((r) => { release = r; });
      const calls = historyHandler({ scenes: [] }, gate);
      renderPlayerPage();
      const ws = await waitForSocket();
      act(() => ws.onopen?.());
      board(ws);
      await declare(ws, attackC2, "action-1");

      fullState(ws);
      await waitFor(() => expect(calls.n).toBe(2));
      await act(async () => {});
      expect(screen.queryByText(/o servidor perdeu/i)).not.toBeInTheDocument();
      expect(storedDraft()).toBeNull();

      release();
      expect(await screen.findByText(/o servidor perdeu 1 ação/i)).toBeInTheDocument();
      await waitFor(() => expect(storedDraft()?.attack).toEqual({ targets: ["c2"] }));
    });

    it("várias perdidas do mesmo ator: volta só a mais recente", async () => {
      renderPlayerPage();
      const ws = await waitForSocket();
      act(() => ws.onopen?.());
      board(ws);
      await declare(ws, attackC2, "action-1");
      // `at` é Date.now(): garante que a segunda é mais nova.
      await new Promise((r) => setTimeout(r, 5));
      await declare(ws, () => screen.getByTestId("empty-slot").click(), "action-2");

      fullState(ws);

      const notice = await screen.findByText(/o servidor perdeu 2 ações/i);
      expect(notice).toHaveTextContent(/o rascunho de 1 delas voltou/i);
      await waitFor(() => expect(storedDraft()).toMatchObject({ moveMode: "manual", to: [9, 9, 0] }));
      expect(storedDraft()?.attack).toBeUndefined();
    });

    it("perdida só de parede: aviso sem prometer rascunho, e nenhum rascunho aparece", async () => {
      renderPlayerPage();
      const ws = await waitForSocket();
      act(() => ws.onopen?.());
      board(ws);
      act(() => screen.getByTestId("wall-wall-1").click());
      act(() => screen.getByRole("button", { name: /^abrir$/i }).click());
      act(() => ws.emit("action_enqueued", { actionId: "action-wall-1" }));

      fullState(ws);

      const notice = await screen.findByText(/o servidor perdeu 1 ação/i);
      expect(notice).not.toHaveTextContent(/rascunho voltou/i);
      expect(notice).toHaveTextContent(/declare de novo se ainda quiser/i);
      expect(storedDraft()).toBeNull();
    });

    it("rascunho já começado não é atropelado, e o aviso não diz que voltou", async () => {
      renderPlayerPage();
      const ws = await waitForSocket();
      act(() => ws.onopen?.());
      board(ws);
      await declare(ws, attackC2, "action-1");
      act(() => screen.getByTestId("empty-slot").click());
      await waitFor(() => expect(storedDraft()?.moveMode).toBe("manual"));

      fullState(ws);

      const notice = await screen.findByText(/o servidor perdeu 1 ação/i);
      expect(notice).not.toHaveTextContent(/rascunho voltou/i);
      expect(storedDraft()?.attack).toBeUndefined();
    });

    it("declarada que o servidor ainda tem continua, sem aviso", async () => {
      renderPlayerPage();
      const ws = await waitForSocket();
      act(() => ws.onopen?.());
      await declare(ws, () => screen.getByTestId("empty-slot").click(), "action-1");

      fullState(ws, { ownQueue: [{ actionId: "action-1", action: { uuid: "action-1", actorId: "c1" } }] });
      await act(async () => {});
      expect(screen.queryByText(/o servidor perdeu/i)).not.toBeInTheDocument();
      expect(screen.getAllByTestId("declared-row")).toHaveLength(1);
      expect(storedDraft()).toBeNull();
    });
  });

  // Uma recusa do servidor ao envio do composer (ex.: move_blocked) mantém o rascunho
  // inteiro — destino e alvo — para o jogador só corrigir o que o servidor recusou e
  // declarar de novo; nada some da lista de "declaradas" como se tivesse entrado na fila.
  it("recusa do servidor ao Declarar mantém o rascunho e libera Declarar de novo", async () => {
    renderPlayerPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    act(() =>
      ws.emit("map_full_state", {
        pieces: [
          { pieceId: "piece-c1", slot: { kind: "square", col: 1, row: 1 }, characterId: "c1", visible: true, z: 0 },
          { pieceId: "piece-c2", slot: { kind: "square", col: 2, row: 2 }, characterId: "c2", visible: true, z: 0 },
        ],
        walls: [],
        visiblePolygons: [],
        fogMode: "explored",
      }),
    );

    act(() => screen.getByTestId("select-actor-c2").click());
    act(() => screen.getByTestId("empty-slot").click());

    await waitFor(() => {
      const draft = storedDraft();
      expect(draft.attack.targets).toEqual(["c2"]);
      expect(draft.to).toEqual([9, 9, 0]);
    });

    const declareButton = await screen.findByRole("button", { name: "Declarar movimento + ataque" });
    act(() => declareButton.click());
    const sent = JSON.parse(lastSent(ws) as string);
    expect(sent).toEqual({
      type: "enqueue_action",
      payload: {
        actorId: "c1",
        targetId: ["c2"],
        attack: {},
        move: { category: "Dash", from: [1, 1, 0], position: [9, 9, 0] },
      },
    });
    expect(screen.getByRole("button", { name: "Declarar movimento + ataque" })).toBeDisabled();

    act(() => ws.emit("error", { code: "move_blocked", message: "move blocked by a wall" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Declarar movimento + ataque" })).not.toBeDisabled(),
    );
    expect(storedDraft().to).toEqual([9, 9, 0]);
    expect(screen.queryByTestId("declared-row")).not.toBeInTheDocument();
  });

  // O pedido central da Fase 6 revisada: tocar em alguém longe liga "mover e atacar" com o
  // destino ao lado dele — mas o jogador pode desligar o movimento e atacar de onde está.
  it("alvo longe propõe aproximação; desligar Mover manda só o ataque", async () => {
    renderPlayerPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    act(() =>
      ws.emit("map_full_state", {
        pieces: [
          { pieceId: "piece-c1", slot: { kind: "square", col: 1, row: 1 }, characterId: "c1", visible: true, z: 0 },
          { pieceId: "piece-c2", slot: { kind: "square", col: 6, row: 1 }, characterId: "c2", visible: true, z: 0 },
        ],
        walls: [],
        visiblePolygons: [],
        fogMode: "explored",
      }),
    );

    act(() => screen.getByTestId("select-actor-c2").click());
    expect(await screen.findByTestId("move-destination")).toHaveTextContent("ao lado de Killua");
    expect(screen.getByRole("button", { name: "Declarar movimento + ataque" })).toBeInTheDocument();

    act(() => screen.getByRole("button", { name: /Mover/ }).click());
    const declareButton = await screen.findByRole("button", { name: "Declarar ataque" });
    act(() => declareButton.click());
    expect(JSON.parse(lastSent(ws) as string)).toEqual({
      type: "enqueue_action",
      payload: { actorId: "c1", targetId: ["c2"], attack: {} },
    });
  });

  it("tocar num espaço vazio declara só movimento", async () => {
    renderPlayerPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    act(() =>
      ws.emit("map_full_state", {
        pieces: [
          { pieceId: "piece-c1", slot: { kind: "square", col: 1, row: 1 }, characterId: "c1", visible: true, z: 0 },
        ],
        walls: [],
        visiblePolygons: [],
        fogMode: "explored",
      }),
    );

    act(() => screen.getByTestId("empty-slot").click());
    const declareButton = await screen.findByRole("button", { name: "Declarar movimento" });
    act(() => declareButton.click());
    expect(JSON.parse(lastSent(ws) as string)).toEqual({
      type: "enqueue_action",
      payload: { actorId: "c1", move: { category: "Dash", from: [1, 1, 0], position: [9, 9, 0] } },
    });
    act(() => ws.emit("action_enqueued", { actionId: "action-9" }));
    expect(await screen.findByTestId("declared-row")).toHaveTextContent("na fila");
  });

  // Final review, Important 3 / RULING R29: enqueue_action SEM actorId era sempre
  // recusado pelo servidor (contrato exige actorId) — o menu de parede do jogador agora
  // passa pelo mesmo send.enqueueAction do composer, com actorId = a própria sheet do
  // jogador, e clearsDraft: false (não deve apagar um rascunho do composer em voo, R28).
  it("clica numa parede e Abrir manda enqueue_action com meu actorId, sem apagar o rascunho do composer", async () => {
    renderPlayerPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    act(() =>
      ws.emit("map_full_state", {
        pieces: [
          { pieceId: "piece-c1", slot: { kind: "square", col: 1, row: 1 }, characterId: "c1", visible: true, z: 0 },
          { pieceId: "piece-c2", slot: { kind: "square", col: 2, row: 2 }, characterId: "c2", visible: true, z: 0 },
        ],
        walls: [
          {
            id: "wall-1", p1: [0, 0], p2: [1, 0], wallType: "door", material: "wood",
            move: false, sense: "none", direction: "both", open: false, locked: false,
            hp: 10, maxHp: 10, resistance: 0, destroyed: false,
          },
        ],
        visiblePolygons: [],
        fogMode: "explored",
      }),
    );

    // Um rascunho do composer em voo (alvo escolhido) não pode ser apagado pelo envio da
    // parede — só o ack de um envio com clearsDraft:true (o composer) apaga.
    const targetButton = await screen.findByTestId("select-actor-c2");
    act(() => targetButton.click());
    await waitFor(() => expect(storedDraft()?.attack).toEqual({ targets: ["c2"] }));

    const wallButton = await screen.findByTestId("wall-wall-1");
    act(() => wallButton.click());
    const openButton = await screen.findByRole("button", { name: /^abrir$/i });
    act(() => openButton.click());

    const calls = ws.send.mock.calls.map((c) => JSON.parse(c[0] as string));
    const wallSend = calls.find((m) => m.payload?.targetId?.[0] === "wall-1");
    expect(wallSend).toEqual({
      type: "enqueue_action",
      payload: { actorId: "c1", targetId: ["wall-1"], interact: { kind: "open" } },
    });

    act(() => ws.emit("action_enqueued", { actionId: "action-wall-1" }));
    // O ack do envio da parede (clearsDraft:false) NÃO apaga o rascunho do composer.
    expect(storedDraft()?.attack).toEqual({ targets: ["c2"] });
  });

  // Final review, Important 2(b): Declarar não pode ficar habilitado enquanto o socket
  // não está "connected" — enfileirar ali seria descartado em silêncio por sendRaw.
  it("Declarar fica desabilitado enquanto o socket não está conectado", async () => {
    renderPlayerPage();
    const ws = await waitForSocket();
    // Sem chamar ws.onopen(): status continua "connecting", nunca "connected".
    act(() =>
      ws.emit("map_full_state", {
        pieces: [
          { pieceId: "piece-c1", slot: { kind: "square", col: 1, row: 1 }, characterId: "c1", visible: true, z: 0 },
          { pieceId: "piece-c2", slot: { kind: "square", col: 2, row: 2 }, characterId: "c2", visible: true, z: 0 },
        ],
        walls: [],
        visiblePolygons: [],
        fogMode: "explored",
      }),
    );
    const targetButton = await screen.findByTestId("select-actor-c2");
    act(() => targetButton.click());
    // O socket caiu de vez (fechamento normal): nada de reconexão, Declarar trava.
    act(() => ws.onclose?.({ code: 1000 } as CloseEvent));

    const declareButton = await screen.findByRole("button", { name: /^declarar/i });
    expect(declareButton).toBeDisabled();
  });

  // M4: sem isto, um link lento deixaria o jogador clicar Declarar de novo antes do ack
  // do primeiro envio, enfileirando a mesma ação duas vezes.
  it("Declarar fica desabilitado enquanto o meu próprio envio ainda não teve ack", async () => {
    renderPlayerPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    act(() =>
      ws.emit("map_full_state", {
        pieces: [
          { pieceId: "piece-c1", slot: { kind: "square", col: 1, row: 1 }, characterId: "c1", visible: true, z: 0 },
          { pieceId: "piece-c2", slot: { kind: "square", col: 2, row: 2 }, characterId: "c2", visible: true, z: 0 },
        ],
        walls: [],
        visiblePolygons: [],
        fogMode: "explored",
      }),
    );
    const targetButton = await screen.findByTestId("select-actor-c2");
    act(() => targetButton.click());

    const declareButton = await screen.findByRole("button", { name: /^declarar/i });
    expect(declareButton).not.toBeDisabled();
    act(() => declareButton.click());

    // Ainda sem o ack: um segundo Declarar (mesmo ator) tem que estar bloqueado.
    expect(await screen.findByRole("button", { name: /^declarar/i })).toBeDisabled();

    // O ack chega e limpa o rascunho (R28, clearsDraft:true por padrão do composer) — a
    // trava de "envio pendente" solta; escolher um novo alvo já habilita Declarar de novo,
    // provando que não é mais o pendingSend que está travando.
    act(() => ws.emit("action_enqueued", { actionId: "action-1" }));
    act(() => targetButton.click());
    expect(await screen.findByRole("button", { name: /^declarar/i })).not.toBeDisabled();
  });

  it("passa draggablePieceIds vazio ao mapa — o servidor decide onde a peça para (I1)", async () => {
    renderPlayerPage();
    expect(await screen.findByTestId("map-stub")).toHaveAttribute(
      "data-draggable-piece-ids",
      "[]",
    );
  });

  // F6 (B4): um personagem escondido pelo fog do jogador (participante sem peça
  // visível para ele) não aparece na lista de Personagens — só quem tem peça projetada
  // no canvas dele (após o fog do servidor) mais o próprio personagem, mesmo sem peça.
  it("Personagens do jogador esconde quem o fog não mostra (F6)", async () => {
    renderPlayerPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    // Só a peça do próprio personagem (c1/Gon) chega — c2/Killua nunca teve peça
    // projetada para este jogador (fog escondeu).
    act(() =>
      ws.emit("map_full_state", {
        pieces: [
          { pieceId: "piece-c1", slot: { kind: "square", col: 1, row: 1 }, characterId: "c1", visible: true, z: 0 },
        ],
        walls: [],
        visiblePolygons: [],
        fogMode: "explored",
      }),
    );

    const toggle = await screen.findByRole("button", { name: "Ver histórico" });
    act(() => toggle.click());
    act(() => screen.getByRole("button", { name: "Personagens" }).click());

    const aside = screen.getByTestId("match-aside");
    expect(await within(aside).findByText("Gon")).toBeInTheDocument();
    expect(within(aside).queryByText("Killua")).not.toBeInTheDocument();

    // Assim que a peça de Killua entra em campo de visão (piece_moved, F3), ele passa a
    // aparecer — a lista segue o que o mapa realmente projeta, não um snapshot.
    act(() =>
      ws.emit("piece_moved", {
        pieceId: "piece-c2",
        slot: { kind: "square", col: 3, row: 3 },
        characterId: "c2",
        visible: true,
        z: 0,
      }),
    );
    expect(await within(aside).findByText("Killua")).toBeInTheDocument();
  });

  it("o aside abre em Histórico (padrão) e o rail tem Ação e Ficha (F3)", async () => {
    renderPlayerPage();

    // A gaveta começa fechada por CSS (R24: o mapa precisa estar visível no celular no
    // primeiro render) — abrir pelo controle do topbar antes de checar a aba padrão.
    const toggle = await screen.findByRole("button", { name: "Ver histórico" });
    act(() => toggle.click());

    const historicoTab = await screen.findByRole("button", { name: "Histórico" });
    expect(historicoTab).toHaveAttribute("aria-pressed", "true");
    // F3: o rail ganhou o item Ficha, ao lado de Ação.
    expect(
      screen.getAllByRole("button", { name: /^(ação|ficha|inventário|nen)$/i }),
    ).toHaveLength(2);
  });

  // F3: a ficha do próprio personagem abre dentro da partida, no painel — nunca navega
  // para fora dela.
  it("F3: Ficha no rail abre a ficha do próprio personagem dentro da partida", async () => {
    renderPlayerPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());

    await user.click(screen.getByRole("button", { name: /Ficha/ }));
    expect(await screen.findByTestId("match-sheet")).toBeInTheDocument();
  });

  it("F3: a ficha mostra o HP ao vivo", async () => {
    renderPlayerPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());

    await user.click(screen.getByRole("button", { name: /Ficha/ }));
    await screen.findByTestId("match-sheet");
    act(() => {
      ws.emit("character_hp_changed", { characterId: "c1", hp: 7, maxHp: 30, damage: 3 });
    });
    const sheet = screen.getByTestId("match-sheet");
    expect(await within(sheet).findByText(/7\/30/)).toBeInTheDocument();
  });

  // F4: a aba Histórico vem do REST; cada turn_closed invalida e rebusca a mesma query.
  it("F4: o Histórico mostra os turnos do REST e rebusca a cada turn_closed", async () => {
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
                action: { uuid: "a1", actorId: "c1", reactionKind: "", targetId: ["c2"], attack: {} },
                masterActions: [],
              }],
              events: [],
            }],
          }],
        });
      }),
    );
    renderPlayerPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());

    const toggle = await screen.findByRole("button", { name: "Ver histórico" });
    act(() => toggle.click());
    expect(await screen.findByText("Turno de Gon — atacou Killua")).toBeInTheDocument();
    expect(calls).toBe(1);

    act(() => ws.emit("turn_closed", { turnId: "t2" }));
    await vi.waitFor(() => expect(calls).toBe(2));
  });

  // F4, fix round 1: o refetch do turn_closed roda no MESMO stack síncrono que carimba o
  // receivedAt — o relógio parado reproduz o caso comum (mesmo milissegundo). O turno fechado
  // aparece uma vez só (pelo REST), e a linha ♥ que o servidor manda antes do turn_closed sai.
  it("F4: turno fechado no mesmo milissegundo do refetch aparece uma vez, sem a linha ♥", async () => {
    let calls = 0;
    const closed = {
      uuid: "t1", createdAt: "2026-06-01T00:01:00Z", finishedAt: "2026-06-01T00:01:00Z",
      action: { uuid: "a1", actorId: "c1", reactionKind: "", targetId: ["c2"], attack: {} },
      masterActions: [],
      resolution: {
        isSettled: true,
        targets: [{
          targetId: "c2", avoided: false, defended: false, dodgeTotal: 0, defenseTotal: 0,
          rawDamage: 3, defenseApplied: 0, projectedDamage: 3,
        }],
      },
    };
    server.use(
      http.get(`${baseUrl}/matches/:id/history`, () => {
        calls++;
        return HttpResponse.json({
          scenes: [{
            uuid: "s1", category: "battle", briefDesc: "", createdAt: "2026-06-01T00:00:00Z",
            rounds: [{ uuid: "r1", mode: "Race", createdAt: "2026-06-01T00:00:00Z", turns: calls >= 2 ? [closed] : [], events: [] }],
          }],
        });
      }),
    );
    renderPlayerPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    const toggle = await screen.findByRole("button", { name: "Ver histórico" });
    act(() => toggle.click());
    await vi.waitFor(() => expect(calls).toBe(1));
    await screen.findByText("Cena: batalha");

    const now = vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-06-01T00:01:00Z"));
    try {
      act(() => {
        ws.emit("character_hp_changed", { characterId: "c2", hp: 7, maxHp: 10, damage: 3 });
        ws.emit("turn_closed", { turnId: "t1" });
      });
      await vi.waitFor(() => expect(calls).toBe(2));
      expect(await screen.findByText(`Turno de Gon — atacou Killua · Killua −3`)).toBeInTheDocument();
      const rows = screen.getAllByTestId("event-row");
      expect(rows).toHaveLength(2);
      expect(rows[0]).toHaveTextContent("Cena: batalha");
      expect(screen.queryByText(/♥/)).toBeNull();
    } finally {
      now.mockRestore();
    }
  });

  // F5: MatchCharactersSidebar sempre renderiza CharacterSidebarItem — um participante sem
  // `private` (um NPC, aqui) usa só o dado público (toSidebarCharacter) e ganha o selo NPC.
  it("Personagens do jogador: um NPC sem private mostra o card com o selo NPC (F5)", async () => {
    server.use(
      http.get(`${baseUrl}/matches/:id/participants`, () =>
        HttpResponse.json({
          participants: [
            ...participantsFixture,
            {
              uuid: "p-npc",
              joinedAt: "2026-06-01T00:00:00Z",
              characterSheet: {
                uuid: "npc-1",
                nickName: "Guarda",
                masterUuid: "master-1",
                createdAt: "",
                updatedAt: "",
              },
            },
          ],
        }),
      ),
    );
    renderPlayerPage();
    const ws = await waitForSocket();
    act(() => ws.onopen?.());
    // O NPC não é "meu" (sem playerUuid) — precisa de peça no tabuleiro pra entrar na lista
    // (mesmo filtro de visibilidade do F6).
    act(() =>
      ws.emit("map_full_state", {
        pieces: [
          { pieceId: "piece-npc", slot: { kind: "square", col: 5, row: 5 }, characterId: "npc-1", visible: true, z: 0 },
        ],
        walls: [],
        visiblePolygons: [],
        fogMode: "explored",
      }),
    );

    const toggle = await screen.findByRole("button", { name: "Ver histórico" });
    act(() => toggle.click());
    act(() => screen.getByRole("button", { name: "Personagens" }).click());

    expect(await screen.findByTestId("character-row-npc-1")).toBeInTheDocument();
    expect(screen.getByText("NPC")).toBeInTheDocument();
  });
});
