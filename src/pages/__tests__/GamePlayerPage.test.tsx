// src/pages/__tests__/GamePlayerPage.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { act, screen, waitFor } from "@testing-library/react";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { matchApiFixture } from "../../test/fixtures/match";
import { mapApiFixture } from "../../test/fixtures/map";
import GamePlayerPage from "../GamePlayerPage";

const baseUrl = "http://localhost:5000";

// Pixi não é coberto por teste (src/test/setup.ts mocka @pixi/react); o único jeito de
// disparar cliques de peça/slot em vitest é substituir o componente inteiro por um stub
// (R13) que expõe um botão por peça e um botão de slot vazio.
vi.mock("../../features/tactical-map/TacticalMapViewer", () => ({
  default: (props: {
    map: { pieces: Array<{ id: string; characterId: string }>; walls: Array<{ id: string }> };
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
class FakeWS {
  static instances: FakeWS[] = [];
  static OPEN = 1;
  onopen?: () => void;
  onmessage?: (e: MessageEvent) => void;
  onclose?: (e: CloseEvent) => void;
  onerror?: () => void;
  readyState = 1;
  url: string;
  constructor(url: string) {
    this.url = url;
    FakeWS.instances.push(this);
  }
  send = vi.fn();
  close = vi.fn();
  emit(type: string, payload: unknown) {
    this.onmessage?.({ data: JSON.stringify({ type, payload }) } as MessageEvent);
  }
}

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

function renderPlayerPage() {
  return renderWithProviders(<GamePlayerPage token="fake-jwt-token" matchId="match-1" />);
}

beforeEach(() => {
  FakeWS.instances = [];
  vi.stubGlobal("WebSocket", FakeWS as unknown as typeof WebSocket);
  vi.stubEnv("VITE_WS_URL", "ws://test");

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
    const ws = FakeWS.instances[0];
    act(() => ws.onopen?.());
    act(() => ws.emit("error", { code: "forbidden", message: "only the master can perform this action" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/só o mestre/i);
  });

  it("aplica bars_updated e descarta snapshot atrasado", async () => {
    renderPlayerPage();
    // Espera participants (React Query) resolver, para nameOf("c1") já enxergar "Gon" —
    // senão o primeiro bars_updated chega antes do fetch, e a linha nasce com o id cru.
    await screen.findByText("Gon");
    const ws = FakeWS.instances[0];
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

  it("clica numa peça e Declarar manda enqueue_action com meu ator e o alvo clicado", async () => {
    renderPlayerPage();
    const ws = FakeWS.instances[0];
    act(() => ws.onopen?.());
    act(() =>
      ws.emit("map_full_state", {
        pieces: [
          { pieceId: "piece-c1", slot: { kind: "square", col: 1, row: 1 }, characterId: "c1", visible: true, z: 0 },
          { pieceId: "piece-c2", slot: { kind: "square", col: 3, row: 3 }, characterId: "c2", visible: true, z: 0 },
        ],
        walls: [],
        visiblePolygons: [],
        fogMode: "explored",
      }),
    );

    const declareButton = await screen.findByRole("button", { name: /declarar/i });
    const targetButton = await screen.findByTestId("select-actor-c2");
    act(() => targetButton.click());

    expect(declareButton).not.toBeDisabled();
    act(() => declareButton.click());

    const calls = ws.send.mock.calls;
    const lastSend = calls[calls.length - 1]?.[0] as string;
    expect(JSON.parse(lastSend)).toEqual({
      type: "enqueue_action",
      payload: { actorId: "c1", targetId: ["c2"], attack: {} },
    });
  });

  // Final review, Important 2/M3 (R28): o rascunho só some no ack que CORRESPONDE ao
  // envio do composer (clearsDraft:true) — não em qualquer action_enqueued que chegue.
  // O teste agora manda de verdade (clica Declarar) em vez de só emitir o ack solto, para
  // exercitar o FIFO de pendingSends que carrega essa metadata.
  it("rascunho persiste no localStorage e some quando o PRÓPRIO envio é confirmado (action_enqueued)", async () => {
    renderPlayerPage();
    const ws = FakeWS.instances[0];
    act(() => ws.onopen?.());
    act(() =>
      ws.emit("map_full_state", {
        pieces: [
          { pieceId: "piece-c1", slot: { kind: "square", col: 1, row: 1 }, characterId: "c1", visible: true, z: 0 },
          { pieceId: "piece-c2", slot: { kind: "square", col: 3, row: 3 }, characterId: "c2", visible: true, z: 0 },
        ],
        walls: [],
        visiblePolygons: [],
        fogMode: "explored",
      }),
    );

    const targetButton = await screen.findByTestId("select-actor-c2");
    act(() => targetButton.click());

    await waitFor(() =>
      expect(localStorage.getItem("match-draft:match-1:c1")).toEqual(
        JSON.stringify({ targets: ["c2"] }),
      ),
    );

    const declareButton = await screen.findByRole("button", { name: /declarar/i });
    act(() => declareButton.click());

    act(() => ws.emit("action_enqueued", { actionId: "action-1" }));

    await waitFor(() => expect(localStorage.getItem("match-draft:match-1:c1")).toBeNull());
  });

  // Final review, Important 3 / RULING R29: enqueue_action SEM actorId era sempre
  // recusado pelo servidor (contrato exige actorId) — o menu de parede do jogador agora
  // passa pelo mesmo send.enqueueAction do composer, com actorId = a própria sheet do
  // jogador, e clearsDraft: false (não deve apagar um rascunho do composer em voo, R28).
  it("clica numa parede e Abrir manda enqueue_action com meu actorId, sem apagar o rascunho do composer", async () => {
    renderPlayerPage();
    const ws = FakeWS.instances[0];
    act(() => ws.onopen?.());
    act(() =>
      ws.emit("map_full_state", {
        pieces: [
          { pieceId: "piece-c1", slot: { kind: "square", col: 1, row: 1 }, characterId: "c1", visible: true, z: 0 },
          { pieceId: "piece-c2", slot: { kind: "square", col: 3, row: 3 }, characterId: "c2", visible: true, z: 0 },
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
    await waitFor(() =>
      expect(localStorage.getItem("match-draft:match-1:c1")).toEqual(
        JSON.stringify({ targets: ["c2"] }),
      ),
    );

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
    expect(localStorage.getItem("match-draft:match-1:c1")).toEqual(
      JSON.stringify({ targets: ["c2"] }),
    );
  });

  // Final review, Important 2(b): Declarar não pode ficar habilitado enquanto o socket
  // não está "connected" — enfileirar ali seria descartado em silêncio por sendRaw.
  it("Declarar fica desabilitado enquanto o socket não está conectado", async () => {
    renderPlayerPage();
    const ws = FakeWS.instances[0];
    // Sem chamar ws.onopen(): status continua "connecting", nunca "connected".
    act(() =>
      ws.emit("map_full_state", {
        pieces: [
          { pieceId: "piece-c1", slot: { kind: "square", col: 1, row: 1 }, characterId: "c1", visible: true, z: 0 },
          { pieceId: "piece-c2", slot: { kind: "square", col: 3, row: 3 }, characterId: "c2", visible: true, z: 0 },
        ],
        walls: [],
        visiblePolygons: [],
        fogMode: "explored",
      }),
    );
    const targetButton = await screen.findByTestId("select-actor-c2");
    act(() => targetButton.click());

    const declareButton = await screen.findByRole("button", { name: /declarar/i });
    expect(declareButton).toBeDisabled();
  });

  // M4: sem isto, um link lento deixaria o jogador clicar Declarar de novo antes do ack
  // do primeiro envio, enfileirando a mesma ação duas vezes.
  it("Declarar fica desabilitado enquanto o meu próprio envio ainda não teve ack", async () => {
    renderPlayerPage();
    const ws = FakeWS.instances[0];
    act(() => ws.onopen?.());
    act(() =>
      ws.emit("map_full_state", {
        pieces: [
          { pieceId: "piece-c1", slot: { kind: "square", col: 1, row: 1 }, characterId: "c1", visible: true, z: 0 },
          { pieceId: "piece-c2", slot: { kind: "square", col: 3, row: 3 }, characterId: "c2", visible: true, z: 0 },
        ],
        walls: [],
        visiblePolygons: [],
        fogMode: "explored",
      }),
    );
    const targetButton = await screen.findByTestId("select-actor-c2");
    act(() => targetButton.click());

    const declareButton = await screen.findByRole("button", { name: /declarar/i });
    expect(declareButton).not.toBeDisabled();
    act(() => declareButton.click());

    // Ainda sem o ack: um segundo Declarar (mesmo ator) tem que estar bloqueado.
    expect(await screen.findByRole("button", { name: /declarar/i })).toBeDisabled();

    // O ack chega e limpa o rascunho (R28, clearsDraft:true por padrão do composer) — a
    // trava de "envio pendente" solta; escolher um novo alvo já habilita Declarar de novo,
    // provando que não é mais o pendingSend que está travando.
    act(() => ws.emit("action_enqueued", { actionId: "action-1" }));
    act(() => targetButton.click());
    expect(await screen.findByRole("button", { name: /declarar/i })).not.toBeDisabled();
  });

  it("passa draggablePieceIds vazio ao mapa — o servidor decide onde a peça para (I1)", async () => {
    renderPlayerPage();
    expect(await screen.findByTestId("map-stub")).toHaveAttribute(
      "data-draggable-piece-ids",
      "[]",
    );
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
