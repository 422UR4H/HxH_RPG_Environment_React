// src/pages/__tests__/GameMasterPage.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { act, screen } from "@testing-library/react";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { matchApiFixture } from "../../test/fixtures/match";
import { mapWithPiecesApi } from "../../test/fixtures/map";
import GameMasterPage from "../GameMasterPage";

const baseUrl = "http://localhost:5000";

// Pixi não é coberto por teste (src/test/setup.ts mocka @pixi/react); o stub expõe um
// botão por peça e um botão de slot vazio (R13, mesmo padrão de GamePlayerPage.test.tsx).
vi.mock("../../features/tactical-map/TacticalMapViewer", () => ({
  default: (props: {
    map: { pieces: Array<{ id: string; characterId: string }> };
    onPieceSelect?: (pieceId: string) => void;
    onPieceLongPress?: (pieceId: string) => void;
    onEmptySlotClick?: (slot: { kind: "square"; col: number; row: number }, x: number, y: number) => void;
  }) => (
    <div data-testid="map-stub">
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
  FakeWS.instances = [];
  vi.stubGlobal("WebSocket", FakeWS as unknown as typeof WebSocket);
  vi.stubEnv("VITE_WS_URL", "ws://test");

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
    const ws = FakeWS.instances[0];
    act(() => ws.onopen?.());
    act(() => ws.emit("action_queued", { actionId: "a1", actorId: "c1", bars: ["action"] }));
    act(() => screen.getByRole("button", { name: /antecipar/i }).click());

    const sent = ws.send.mock.calls.map((c) => JSON.parse(c[0] as string));
    expect(sent[sent.length - 1]).toMatchObject({ type: "pull_action", payload: { actionId: "a1" } });
  });

  it("mostra o diálogo que o servidor computou e reenvia com confirm", async () => {
    renderMasterPage();
    const ws = FakeWS.instances[0];
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
    const ws = FakeWS.instances[0];
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

  it("inspeciona (não vira ator) quem o mestre não controla e nada envia", async () => {
    renderMasterPage();
    const ws = FakeWS.instances[0];
    act(() => ws.onopen?.());

    const pcButton = await screen.findByTestId("select-actor-c1");
    const sentBefore = ws.send.mock.calls.length;
    act(() => pcButton.click());

    // Nada de novo é enviado pelo clique (o board sync do mestre já rodou ao conectar).
    expect(ws.send.mock.calls.length).toBe(sentBefore);
    const personagensTab = screen.getByRole("button", { name: "Personagens" });
    expect(personagensTab).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText("Gon")).toBeInTheDocument();
    // não virou ator: a bottom sheet de compor ação não aparece
    expect(screen.queryByRole("button", { name: /declarar/i })).not.toBeInTheDocument();
  });
});
