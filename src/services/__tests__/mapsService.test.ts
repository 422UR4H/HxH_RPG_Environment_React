// src/services/__tests__/mapsService.test.ts
//
// Wire-format safety net for mapsService.ts — the most deeply nested payload
// in the system (grid, bg, pieces, walls). Mirrors the Go structs in
// System_X_System/internal/app/api/map/map_response.go,
// .../map/create_map.go, .../map/update_map.go and
// .../matchmap/{response,attach,get}.go.
//
// Fase 8: the backend now speaks camelCase all the way down, and
// mapsService no longer runs request/response bodies through any
// case-conversion — the body passes straight through, in both directions.
//
// Per method: (1) request URL/verb + wire-format (camelCase) body,
// (2) response passed straight through into the src/types/ shape,
// (3) Authorization header sent when a token is passed.
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/server";
import { mapsService } from "../mapsService";
import type {
  TacticalMap,
  MatchMapResponse,
  GridShape,
  BgImage,
  Piece,
  WallSegment,
} from "../../types/tacticalMap";

const baseUrl = "http://localhost:5000";
const token = "test-token";

// ─── Wire-format (Go) fixtures ──────────────────────────────────────────────
// Hand-written literals, typed as Record<string, unknown> rather than the
// frontend GridShape/BgImage/Piece types — so a future field rename on those
// types can't silently drag these along and mask wire-format drift (see the
// campaign/map/match "Api" fixtures in src/test/fixtures/ for the same
// pattern, and finding [1] in the Fase 8 final review for why this matters).
//
// Mirrors GridShapeResponse in map_response.go — camelCase (cellSize,
// skewRatio, lineStyle). originX/originY never appear on the wire — they're
// editor-only per src/types/tacticalMap.ts.
const gridWire: Record<string, unknown> = {
  kind: "square",
  cols: 20,
  rows: 15,
  cellSize: 48,
  skewRatio: 0.5,
  rotation: 90,
  color: "#112233",
  opacity: 0.75,
  lineStyle: "dashed",
};

// Mirrors entity.BgImage — no r2Url on the wire (r2Url is a frontend-only
// editor concept swapped into `url` before persistence; see
// TacticalMapEditor.tsx).
const bgWire: Record<string, unknown> = {
  url: "https://r2.example.com/bg.png",
  x: 10,
  y: 20,
  width: 800,
  height: 600,
  rotation: 5,
  opacity: 0.9,
};

// Mirrors entity.Piece / entity.PieceCoord (Slot serialised as-is).
const pieceWire: Record<string, unknown> = {
  id: "piece-1",
  characterId: "char-1",
  coord: { slot: { kind: "square", col: 3, row: 4 }, z: 1.5 },
  visible: true,
};

// Mirrors entity.WallSegment. Two walls: one with an omitted (omitempty)
// doorSubtype/windowSubtype, one door with doorSubtype set.
const wallWireBasic: WallSegment = {
  id: "wall-1",
  p1: [0, 0],
  p2: [1, 0],
  wallType: "wall",
  material: "stone",
  move: false,
  sense: "none",
  direction: "both",
  open: false,
  locked: false,
  hp: 100,
  maxHp: 100,
  resistance: 5,
  destroyed: false,
  revealed: false,
};

const wallWireDoor: WallSegment = {
  id: "wall-2",
  p1: [2, 2],
  p2: [2, 3],
  wallType: "door",
  material: "wood",
  doorSubtype: "basic",
  move: true,
  sense: "sight",
  direction: "left",
  open: true,
  locked: false,
  hp: 40,
  maxHp: 50,
  resistance: 2,
  destroyed: false,
  revealed: true,
};

// Mirrors MapResponse in map_response.go.
function mapResponseWire(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "map-1",
    campaignId: "campaign-1",
    name: "Floresta do Norte",
    description: "Uma floresta densa ao norte do reino.",
    grid: gridWire,
    bg: bgWire,
    pieces: [pieceWire],
    walls: [wallWireBasic, wallWireDoor],
    decorations: [],
    items: [],
    createdAt: "2026-05-31T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

function expectedTacticalMap(
  overrides: Partial<TacticalMap> = {},
): TacticalMap {
  return {
    id: "map-1",
    campaignId: "campaign-1",
    name: "Floresta do Norte",
    description: "Uma floresta densa ao norte do reino.",
    grid: gridWire as GridShape,
    bg: bgWire as BgImage,
    pieces: [pieceWire as Piece],
    walls: [wallWireBasic, wallWireDoor],
    decorations: [],
    items: [],
    createdAt: "2026-05-31T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

describe("mapsService", () => {
  describe("createMap", () => {
    it("POSTs to /campaigns/:campaignId/maps with the body untouched and Authorization header", async () => {
      let capturedBody: unknown;
      let capturedAuth: string | null = null;
      server.use(
        http.post(
          `${baseUrl}/campaigns/:campaignId/maps`,
          async ({ request }) => {
            capturedBody = await request.json();
            capturedAuth = request.headers.get("authorization");
            return HttpResponse.json(
              { map: mapResponseWire() },
              { status: 201 },
            );
          },
        ),
      );

      await mapsService.createMap(token, "campaign-1", {
        name: "Floresta do Norte",
        description: "Uma floresta densa ao norte do reino.",
        grid: gridWire as GridShape,
        bg: bgWire as BgImage,
        pieces: [pieceWire as Piece],
      });

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedBody).toEqual({
        name: "Floresta do Norte",
        description: "Uma floresta densa ao norte do reino.",
        grid: gridWire,
        bg: bgWire,
        pieces: [pieceWire],
      });
    });

    it("returns the created map untouched, field by field", async () => {
      server.use(
        http.post(`${baseUrl}/campaigns/:campaignId/maps`, () =>
          HttpResponse.json({ map: mapResponseWire() }, { status: 201 }),
        ),
      );

      const result = await mapsService.createMap(token, "campaign-1", {
        name: "Floresta do Norte",
        grid: gridWire as GridShape,
      });

      expect(result).toEqual(expectedTacticalMap());
    });
  });

  describe("listMaps", () => {
    it("GETs /campaigns/:campaignId/maps with Authorization header", async () => {
      let capturedAuth: string | null = null;
      let capturedUrl = "";
      server.use(
        http.get(`${baseUrl}/campaigns/:campaignId/maps`, ({ request }) => {
          capturedAuth = request.headers.get("authorization");
          capturedUrl = request.url;
          return HttpResponse.json({ maps: [mapResponseWire()] });
        }),
      );

      await mapsService.listMaps(token, "campaign-1");

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedUrl).toBe(`${baseUrl}/campaigns/campaign-1/maps`);
    });

    it("returns the list untouched, field by field", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:campaignId/maps`, () =>
          HttpResponse.json({ maps: [mapResponseWire()] }),
        ),
      );

      const result = await mapsService.listMaps(token, "campaign-1");

      expect(result).toEqual([expectedTacticalMap()]);
    });

    it("returns [] when the response has no maps key", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:campaignId/maps`, () =>
          HttpResponse.json({}),
        ),
      );

      const result = await mapsService.listMaps(token, "campaign-1");

      expect(result).toEqual([]);
    });
  });

  describe("getMap", () => {
    it("GETs /maps/:mapId with Authorization header", async () => {
      let capturedAuth: string | null = null;
      let capturedUrl = "";
      server.use(
        http.get(`${baseUrl}/maps/:mapId`, ({ request }) => {
          capturedAuth = request.headers.get("authorization");
          capturedUrl = request.url;
          return HttpResponse.json({ map: mapResponseWire() });
        }),
      );

      await mapsService.getMap(token, "map-1");

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedUrl).toBe(`${baseUrl}/maps/map-1`);
    });

    it("returns the map untouched, field by field (grid, bg, pieces, walls)", async () => {
      server.use(
        http.get(`${baseUrl}/maps/:mapId`, () =>
          HttpResponse.json({ map: mapResponseWire() }),
        ),
      );

      const result = await mapsService.getMap(token, "map-1");

      const expected = expectedTacticalMap();
      expect(result.id).toBe(expected.id);
      expect(result.campaignId).toBe(expected.campaignId);
      expect(result.name).toBe(expected.name);
      expect(result.description).toBe(expected.description);
      expect(result.grid).toEqual(expected.grid);
      expect(result.bg).toEqual(expected.bg);
      expect(result.pieces).toEqual(expected.pieces);
      expect(result.walls).toEqual(expected.walls);
      expect(result.decorations).toEqual(expected.decorations);
      expect(result.items).toEqual(expected.items);
      expect(result.createdAt).toBe(expected.createdAt);
      expect(result.updatedAt).toBe(expected.updatedAt);
      // fogMode is never emitted by MapResponse on the Go side today (no
      // json tag on map_response.go) — see findings in the task report.
      expect(result.fogMode).toBeUndefined();
    });

    it("returns pieces:[] and walls:[] as sent by the non-master role filter", async () => {
      server.use(
        http.get(`${baseUrl}/maps/:mapId`, () =>
          HttpResponse.json({
            map: mapResponseWire({ pieces: [], walls: [] }),
          }),
        ),
      );

      const result = await mapsService.getMap(token, "map-1");

      expect(result.pieces).toEqual([]);
      expect(result.walls).toEqual([]);
    });

    it("maps a null bg through as null", async () => {
      server.use(
        http.get(`${baseUrl}/maps/:mapId`, () =>
          HttpResponse.json({ map: mapResponseWire({ bg: null }) }),
        ),
      );

      const result = await mapsService.getMap(token, "map-1");

      expect(result.bg).toBeNull();
    });
  });

  describe("updateMap", () => {
    it("PUTs to /maps/:mapId with the body untouched and Authorization header, resolving void", async () => {
      let capturedBody: unknown;
      let capturedAuth: string | null = null;
      let capturedUrl = "";
      server.use(
        http.put(`${baseUrl}/maps/:mapId`, async ({ request }) => {
          capturedBody = await request.json();
          capturedAuth = request.headers.get("authorization");
          capturedUrl = request.url;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await mapsService.updateMap(token, "map-1", {
        name: "Novo nome",
        grid: gridWire,
        pieces: [pieceWire],
        walls: [wallWireBasic],
      });

      expect(capturedUrl).toBe(`${baseUrl}/maps/map-1`);
      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedBody).toEqual({
        name: "Novo nome",
        grid: gridWire,
        pieces: [pieceWire],
        walls: [wallWireBasic],
      });
      expect(result).toBeUndefined();
    });
  });

  describe("deleteMap", () => {
    it("DELETEs /maps/:mapId with Authorization header, resolving void", async () => {
      let capturedAuth: string | null = null;
      let capturedUrl = "";
      server.use(
        http.delete(`${baseUrl}/maps/:mapId`, ({ request }) => {
          capturedAuth = request.headers.get("authorization");
          capturedUrl = request.url;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await mapsService.deleteMap(token, "map-1");

      expect(capturedUrl).toBe(`${baseUrl}/maps/map-1`);
      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(result).toBeUndefined();
    });
  });

  describe("attachMatchMap", () => {
    // The `matchMap` envelope key matches both the literal key
    // mapsService.ts reads (`res.matchMap`) and the real backend
    // (matchmap/attach.go tags this field `json:"matchMap"` as of the Fase 8
    // migration). The request body key (mapUuid) and the response's inner
    // fields (matchUuid/mapUuid/attachedAt) are NOT envelope keys — those
    // already matched the real backend before this task, no change needed.
    it("POSTs to /matches/:matchId/map with { mapUuid } body and Authorization header", async () => {
      let capturedBody: unknown;
      let capturedAuth: string | null = null;
      let capturedUrl = "";
      server.use(
        http.post(`${baseUrl}/matches/:matchId/map`, async ({ request }) => {
          capturedBody = await request.json();
          capturedAuth = request.headers.get("authorization");
          capturedUrl = request.url;
          return HttpResponse.json({
            matchMap: {
              matchUuid: "match-1",
              mapUuid: "map-1",
              attachedAt: "2026-06-01T00:00:00Z",
            },
          });
        }),
      );

      const result = await mapsService.attachMatchMap(
        token,
        "match-1",
        "map-1",
      );

      expect(capturedUrl).toBe(`${baseUrl}/matches/match-1/map`);
      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedBody).toEqual({ mapUuid: "map-1" });

      const expected: MatchMapResponse = {
        matchUuid: "match-1",
        mapUuid: "map-1",
        attachedAt: "2026-06-01T00:00:00Z",
      };
      expect(result).toEqual(expected);
    });
  });

  describe("getMatchMap", () => {
    // See the note on attachMatchMap above re: the `matchMap` envelope key.
    it("GETs /matches/:matchId/map with Authorization header and returns the body untouched on 200", async () => {
      let capturedAuth: string | null = null;
      let capturedUrl = "";
      server.use(
        http.get(`${baseUrl}/matches/:matchId/map`, ({ request }) => {
          capturedAuth = request.headers.get("authorization");
          capturedUrl = request.url;
          return HttpResponse.json({
            matchMap: {
              matchUuid: "match-1",
              mapUuid: "map-1",
              attachedAt: "2026-06-01T00:00:00Z",
            },
          });
        }),
      );

      const result = await mapsService.getMatchMap(token, "match-1");

      expect(capturedUrl).toBe(`${baseUrl}/matches/match-1/map`);
      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(result).toEqual({
        matchUuid: "match-1",
        mapUuid: "map-1",
        attachedAt: "2026-06-01T00:00:00Z",
      } satisfies MatchMapResponse);
    });

    it("returns null on 204 No Content (no map attached)", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:matchId/map`, () =>
          new HttpResponse(null, { status: 204 }),
        ),
      );

      const result = await mapsService.getMatchMap(token, "match-1");

      expect(result).toBeNull();
    });

    it("rethrows on a real server error (e.g. 500)", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:matchId/map`, () =>
          HttpResponse.json({ detail: "boom" }, { status: 500 }),
        ),
      );

      await expect(
        mapsService.getMatchMap(token, "match-1"),
      ).rejects.toBeTruthy();
    });

    it("swallows a network error (no response) and returns null — current behavior, not necessarily intended", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:matchId/map`, () =>
          HttpResponse.error(),
        ),
      );

      const result = await mapsService.getMatchMap(token, "match-1");

      expect(result).toBeNull();
    });
  });

  describe("detachMatchMap", () => {
    it("DELETEs /matches/:matchId/map with Authorization header, resolving void", async () => {
      let capturedAuth: string | null = null;
      let capturedUrl = "";
      server.use(
        http.delete(`${baseUrl}/matches/:matchId/map`, ({ request }) => {
          capturedAuth = request.headers.get("authorization");
          capturedUrl = request.url;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await mapsService.detachMatchMap(token, "match-1");

      expect(capturedUrl).toBe(`${baseUrl}/matches/match-1/map`);
      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(result).toBeUndefined();
    });
  });
});
