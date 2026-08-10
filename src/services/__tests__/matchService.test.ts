// src/services/__tests__/matchService.test.ts
//
// Wire-format safety net for matchService.ts. Mirrors the Go structs in
// System_X_System/internal/app/api/match/{create_match,get_match,update_match,
// delete_match,list_match_enrollments,get_match_participants}.go and
// .../enrollment/{enroll_character_sheet,accept_enrollment,reject_enrollment}.go.
//
// Fase 8: the backend now speaks camelCase all the way down, and
// matchService no longer runs request/response bodies through any
// case-conversion — the body passes straight through, in both directions.
//
// Per method: (1) request URL/verb + wire-format (camelCase) body,
// (2) response passed straight through into the src/types/match.ts shape,
// (3) Authorization header sent when a token is passed.
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/server";
import { matchService } from "../matchService";
import type { Enrollment, Participant, CharacterSheetWithVisibility } from "../../types/match";
import { matchFixture, matchApiFixture } from "../../test/fixtures/match";

const baseUrl = "http://localhost:5000";
const token = "test-token";

// ─── Wire-format (Go) fixtures for the nested character sheet ─────────────
// Mirrors CharacterSheetWithVisibilityResponse (internal/app/api/sheet/
// character_sheet_sumary_response.go): base summary fields + a `private`
// key that is never omitted server-side (no `omitempty` on that json tag) —
// it's `null` for non-master viewers and populated for masters. These
// fixtures cover the master (populated) case. Since neither side converts
// case anymore, this is identical to the frontend's own
// CharacterSheetWithVisibility shape.
const sheetWithVisibilityWire: CharacterSheetWithVisibility = {
  uuid: "sheet-2",
  playerUuid: "user-2",
  nickName: "Gon Freecss",
  createdAt: "2025-02-01T00:00:00.000Z",
  updatedAt: "2025-02-01T00:00:00.000Z",
  private: {
    fullName: "Gon Freecss",
    alignment: "Bom",
    characterClass: "Transmutador",
    birthday: "1990-01-01",
    categoryName: "Transmutação",
    level: 5,
    points: 100,
    currExp: 200,
    nextLvlBaseExp: 500,
    talentLvl: 3,
    physicalsLvl: 4,
    mentalsLvl: 4,
    spiritualsLvl: 3,
    skillsLvl: 2,
    stamina: { min: 0, current: 80, max: 100 },
    health: { min: 0, current: 90, max: 100 },
  },
};

// Mirrors EnrollmentResponse (list_match_enrollments.go).
const enrollmentWire: Enrollment = {
  uuid: "enr-1",
  status: "pending",
  createdAt: "2025-03-01T00:00:00.000Z",
  characterSheet: sheetWithVisibilityWire,
  player: { uuid: "user-2", nick: "Gon" },
};

// Mirrors ParticipantResponse (get_match_participants.go).
const participantWire: Participant = {
  uuid: "part-1",
  joinedAt: "2025-03-05T00:00:00.000Z",
  leftAt: "2025-03-10T00:00:00.000Z",
  characterSheet: sheetWithVisibilityWire,
};

describe("matchService", () => {
  describe("createMatch", () => {
    it("POSTs to /matches with the body untouched and Authorization header", async () => {
      let capturedBody: unknown;
      let capturedAuth: string | null = null;
      server.use(
        http.post(`${baseUrl}/matches`, async ({ request }) => {
          capturedBody = await request.json();
          capturedAuth = request.headers.get("authorization");
          return HttpResponse.json({ match: matchApiFixture }, { status: 201 });
        }),
      );

      await matchService.createMatch(token, {
        campaignUuid: "campaign-1",
        title: "Nova Partida",
        briefInitialDescription: "Brief da partida",
        description: "Descrição completa",
        isPublic: true,
        gameScheduledAt: "2026-06-15T19:30:00Z",
        storyStartAt: "2026-06-01",
      });

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedBody).toEqual({
        campaignUuid: "campaign-1",
        title: "Nova Partida",
        briefInitialDescription: "Brief da partida",
        description: "Descrição completa",
        isPublic: true,
        gameScheduledAt: "2026-06-15T19:30:00Z",
        storyStartAt: "2026-06-01",
      });
    });

    it("returns the created match untouched, field by field", async () => {
      server.use(
        http.post(`${baseUrl}/matches`, () =>
          HttpResponse.json({ match: matchApiFixture }, { status: 201 }),
        ),
      );

      const result = await matchService.createMatch(token, {
        campaignUuid: "campaign-1",
        title: "Nova Partida",
      });

      expect(result).toEqual(matchFixture);
    });
  });

  describe("getMatchDetails", () => {
    it("GETs /matches/:matchId with Authorization header", async () => {
      let capturedAuth: string | null = null;
      let capturedUrl = "";
      server.use(
        http.get(`${baseUrl}/matches/:matchId`, ({ request }) => {
          capturedAuth = request.headers.get("authorization");
          capturedUrl = request.url;
          return HttpResponse.json({ match: matchApiFixture });
        }),
      );

      await matchService.getMatchDetails(token, "match-1");

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedUrl).toBe(`${baseUrl}/matches/match-1`);
    });

    it("returns the match untouched, field by field", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:matchId`, () =>
          HttpResponse.json({ match: matchApiFixture }),
        ),
      );

      const result = await matchService.getMatchDetails(token, "match-1");

      expect(result).toEqual(matchFixture);
    });
  });

  describe("getEnrollments", () => {
    it("GETs /matches/:matchId/enrollments with Authorization header", async () => {
      let capturedAuth: string | null = null;
      let capturedUrl = "";
      server.use(
        http.get(`${baseUrl}/matches/:matchId/enrollments`, ({ request }) => {
          capturedAuth = request.headers.get("authorization");
          capturedUrl = request.url;
          return HttpResponse.json({ enrollments: [enrollmentWire] });
        }),
      );

      await matchService.getEnrollments(token, "match-1");

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedUrl).toBe(`${baseUrl}/matches/match-1/enrollments`);
    });

    it("returns enrollments untouched, field by field (incl. nested character sheet)", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:matchId/enrollments`, () =>
          HttpResponse.json({ enrollments: [enrollmentWire] }),
        ),
      );

      const result = await matchService.getEnrollments(token, "match-1");

      expect(result).toEqual([enrollmentWire]);
    });
  });

  describe("getParticipants", () => {
    it("GETs /matches/:matchId/participants with Authorization header", async () => {
      let capturedAuth: string | null = null;
      let capturedUrl = "";
      server.use(
        http.get(`${baseUrl}/matches/:matchId/participants`, ({ request }) => {
          capturedAuth = request.headers.get("authorization");
          capturedUrl = request.url;
          return HttpResponse.json({ participants: [participantWire] });
        }),
      );

      await matchService.getParticipants(token, "match-1");

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedUrl).toBe(`${baseUrl}/matches/match-1/participants`);
    });

    it("returns participants untouched, field by field (incl. nested character sheet)", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:matchId/participants`, () =>
          HttpResponse.json({ participants: [participantWire] }),
        ),
      );

      const result = await matchService.getParticipants(token, "match-1");

      expect(result).toEqual([participantWire]);
    });
  });

  describe("acceptEnrollment", () => {
    it("POSTs an empty body to /enrollments/:enrollmentId/accept with Authorization header", async () => {
      let capturedBody: unknown;
      let capturedAuth: string | null = null;
      server.use(
        http.post(`${baseUrl}/enrollments/:enrollmentId/accept`, async ({ request }) => {
          capturedBody = await request.json();
          capturedAuth = request.headers.get("authorization");
          return HttpResponse.json({});
        }),
      );

      const result = await matchService.acceptEnrollment(token, "enr-1");

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedBody).toEqual({});
      expect(result).toBeUndefined();
    });
  });

  describe("rejectEnrollment", () => {
    it("POSTs an empty body to /enrollments/:enrollmentId/reject with Authorization header", async () => {
      let capturedBody: unknown;
      let capturedAuth: string | null = null;
      server.use(
        http.post(`${baseUrl}/enrollments/:enrollmentId/reject`, async ({ request }) => {
          capturedBody = await request.json();
          capturedAuth = request.headers.get("authorization");
          return HttpResponse.json({});
        }),
      );

      const result = await matchService.rejectEnrollment(token, "enr-1");

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedBody).toEqual({});
      expect(result).toBeUndefined();
    });
  });

  describe("updateMatch", () => {
    it("PATCHes /matches/:matchId with the body untouched and Authorization header", async () => {
      let capturedBody: unknown;
      let capturedAuth: string | null = null;
      server.use(
        http.patch(`${baseUrl}/matches/:matchId`, async ({ request }) => {
          capturedBody = await request.json();
          capturedAuth = request.headers.get("authorization");
          return HttpResponse.json({ match: matchApiFixture });
        }),
      );

      await matchService.updateMatch(token, "match-1", {
        title: "Novo Título",
        isPublic: false,
      });

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedBody).toEqual({
        title: "Novo Título",
        isPublic: false,
      });
    });

    it("returns the updated match untouched, field by field", async () => {
      server.use(
        http.patch(`${baseUrl}/matches/:matchId`, () =>
          HttpResponse.json({ match: matchApiFixture }),
        ),
      );

      const result = await matchService.updateMatch(token, "match-1", {
        title: "Novo Título",
      });

      expect(result).toEqual(matchFixture);
    });
  });

  describe("deleteMatch", () => {
    it("DELETEs /matches/:matchId with Authorization header", async () => {
      let capturedAuth: string | null = null;
      let capturedUrl = "";
      server.use(
        http.delete(`${baseUrl}/matches/:matchId`, ({ request }) => {
          capturedAuth = request.headers.get("authorization");
          capturedUrl = request.url;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await matchService.deleteMatch(token, "match-1");

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedUrl).toBe(`${baseUrl}/matches/match-1`);
      expect(result).toBeUndefined();
    });
  });

  describe("enrollCharacterSheet", () => {
    it("POSTs to /enrollments/charactersheets/enroll with the body untouched and Authorization header", async () => {
      let capturedBody: unknown;
      let capturedAuth: string | null = null;
      server.use(
        http.post(
          `${baseUrl}/enrollments/charactersheets/enroll`,
          async ({ request }) => {
            capturedBody = await request.json();
            capturedAuth = request.headers.get("authorization");
            return HttpResponse.json({}, { status: 201 });
          },
        ),
      );

      const result = await matchService.enrollCharacterSheet(
        token,
        "sheet-1",
        "match-1",
      );

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedBody).toEqual({
        sheetUuid: "sheet-1",
        matchUuid: "match-1",
      });
      expect(result).toBeUndefined();
    });
  });
});
