// src/pages/__tests__/GamePlayerPage.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { act, screen, waitFor, within } from "@testing-library/react";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { matchApiFixture } from "../../test/fixtures/match";
import { mapApiFixture } from "../../test/fixtures/map";
import GamePlayerPage from "../GamePlayerPage";
import { installFakeWebSocket, waitForSocket } from "../../test/fakeWebSocket";

const baseUrl = "http://localhost:5000";

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

  it("o aside abre em Histórico (padrão) e o rail só tem Ação", async () => {
    renderPlayerPage();

    // A gaveta começa fechada por CSS (R24: o mapa precisa estar visível no celular no
    // primeiro render) — abrir pelo controle do topbar antes de checar a aba padrão.
    const toggle = await screen.findByRole("button", { name: "Ver histórico" });
    act(() => toggle.click());

    const historicoTab = await screen.findByRole("button", { name: "Histórico" });
    expect(historicoTab).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getAllByRole("button", { name: /^(ação|ficha|inventário|nen)$/i }),
    ).toHaveLength(1);
  });
});
