// src/services/__tests__/campaignService.test.ts
//
// Wire-format safety net for campaignService.ts. Mirrors the Go structs in
// System_X_System/internal/app/api/campaign/{get_campaign,list_campaigns,
// create_campaign,delete_campaign,update_campaign,
// list_public_upcoming_campaigns}.go and campaign_response.go.
//
// Fase 8: the backend now speaks camelCase all the way down, and
// campaignService no longer runs request/response bodies through any
// case-conversion — the body passes straight through, in both directions.
//
// Per method: (1) request URL/verb + wire-format (camelCase) body,
// (2) response passed straight through into the src/types/campaign(s).ts
// shape, (3) Authorization header sent when a token is passed.
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/server";
import { campaignService } from "../campaignService";
import type { CampaignEditResult } from "../../types/campaign";
import type { PublicCampaignSummary } from "../../types/campaigns";
import {
  campaignFixture,
  campaignApiFixture,
  campaignSummaryFixture,
  campaignSummaryApiFixture,
} from "../../test/fixtures/campaign";

const baseUrl = "http://localhost:5000";
const token = "test-token";

// Mirrors PublicCampaignSummaryResponse (list_public_upcoming_campaigns.go):
// CampaignSummaryResponse + nextGameScheduledAt.
const publicCampaignSummaryFixture: PublicCampaignSummary = {
  ...campaignSummaryFixture,
  nextGameScheduledAt: "2026-07-01T19:00:00Z",
};
const publicCampaignSummaryApiFixture = {
  ...campaignSummaryApiFixture,
  nextGameScheduledAt: "2026-07-01T19:00:00Z",
};

// Mirrors CampaignEditResponse (update_campaign.go) — a narrower shape than
// CampaignMaster (no characterSheets/pendingSheets/matches). Used as both the
// wire response and the expected result, since neither side converts case
// anymore.
const campaignEditFixture: CampaignEditResult = {
  uuid: "campaign-1",
  masterUuid: "master-1",
  name: "Campanha Atualizada",
  briefInitialDescription: "Brief inicial",
  description: "Descrição completa da campanha",
  isPublic: false,
  callLink: "https://discord.gg/xyz",
  storyStartAt: "2025-01-01",
  storyCurrentAt: "2025-06-20T12:00:00Z",
  updatedAt: "2025-06-20T12:00:00.000Z",
};

describe("campaignService", () => {
  describe("getCampaignDetails", () => {
    it("GETs /campaigns/:id with Authorization header", async () => {
      let capturedAuth: string | null = null;
      let capturedUrl = "";
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, ({ request }) => {
          capturedAuth = request.headers.get("authorization");
          capturedUrl = request.url;
          return HttpResponse.json({ campaign: campaignApiFixture });
        }),
      );

      await campaignService.getCampaignDetails(token, "campaign-1");

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedUrl).toBe(`${baseUrl}/campaigns/campaign-1`);
    });

    it("returns the campaign untouched, field by field (master view)", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ campaign: campaignApiFixture }),
        ),
      );

      const result = await campaignService.getCampaignDetails(token, "campaign-1");

      expect(result).toEqual(campaignFixture);
    });

    // FINDING (not fixed — documenting current behavior):
    // GetCampaignHandler (get_campaign.go) returns CampaignMasterResponse when the
    // viewer is the master, but CampaignPlayerResponse when they're not — the Go
    // response's `campaign` field is typed `any` specifically to allow this. The
    // two shapes differ: player view has no `pendingSheets` key at all (vs. master's
    // required array) and its `characterSheets` are public-only (no `private`-style
    // fields). campaignService.getCampaignDetails always types its return as
    // CampaignMaster regardless of which shape actually came back — so for a
    // non-master viewer, `result.pendingSheets` is `undefined` at runtime despite
    // the type declaring it as a required array. Reported for the PR body; not
    // fixed here since fixing requires a union return type in campaignService.ts /
    // types/campaign.ts (production code).
    it("player-view response omits pendingSheets even though the type declares it required", async () => {
      const playerViewWire = {
        uuid: "campaign-2",
        masterUuid: "master-9",
        name: "Campanha do Jogador",
        briefInitialDescription: "Brief",
        description: "Descrição",
        isPublic: true,
        callLink: "",
        storyStartAt: "2025-01-01",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        matches: [],
        characterSheets: [
          {
            uuid: "sheet-3",
            nickName: "PublicChar",
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
        ],
        myPendingSheet: {
          uuid: "sheet-4",
          playerUuid: "user-2",
          nickName: "MinhaFicha",
          fullName: "Minha Ficha",
          alignment: "Neutro",
          characterClass: "Manipulador",
          birthday: "1995-05-05",
          categoryName: "Transmutação",
          level: 1,
          points: 0,
          currExp: 0,
          nextLvlBaseExp: 100,
          talentLvl: 1,
          physicalsLvl: 1,
          mentalsLvl: 1,
          spiritualsLvl: 1,
          skillsLvl: 1,
          stamina: { min: 0, current: 100, max: 100 },
          health: { min: 0, current: 100, max: 100 },
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      };
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ campaign: playerViewWire }),
        ),
      );

      const result = await campaignService.getCampaignDetails(token, "campaign-2");

      // The service no longer runs a generic converter over the response — it
      // just returns data.campaign as-is, so it faithfully carries whatever
      // shape the backend actually sent, `pendingSheets` and all (i.e. absent).
      expect(result).toEqual(playerViewWire);
      // No pendingSheets key at all — the "required array" from the type never showed up.
      expect((result as { pendingSheets?: unknown }).pendingSheets).toBeUndefined();
    });
  });

  describe("listCampaigns", () => {
    it("GETs /campaigns with Authorization header", async () => {
      let capturedAuth: string | null = null;
      let capturedUrl = "";
      server.use(
        http.get(`${baseUrl}/campaigns`, ({ request }) => {
          capturedAuth = request.headers.get("authorization");
          capturedUrl = request.url;
          return HttpResponse.json({ campaigns: [campaignSummaryApiFixture] });
        }),
      );

      await campaignService.listCampaigns(token);

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedUrl).toBe(`${baseUrl}/campaigns`);
    });

    it("returns the list untouched, field by field (via the real `campaigns` envelope key)", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns`, () =>
          HttpResponse.json({ campaigns: [campaignSummaryApiFixture] }),
        ),
      );

      const result = await campaignService.listCampaigns(token);

      expect(result).toEqual([campaignSummaryFixture]);
    });

    it("returns [] when the response has no campaigns key", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns`, () => HttpResponse.json({})),
      );

      const result = await campaignService.listCampaigns(token);

      expect(result).toEqual([]);
    });
  });

  describe("listPublicCampaigns", () => {
    it("GETs /public/campaigns with Authorization header", async () => {
      let capturedAuth: string | null = null;
      let capturedUrl = "";
      server.use(
        http.get(`${baseUrl}/public/campaigns`, ({ request }) => {
          capturedAuth = request.headers.get("authorization");
          capturedUrl = request.url;
          return HttpResponse.json({
            campaigns: [publicCampaignSummaryApiFixture],
          });
        }),
      );

      await campaignService.listPublicCampaigns(token);

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedUrl).toBe(`${baseUrl}/public/campaigns`);
    });

    it("returns the list untouched, field by field (via the real `campaigns` envelope key)", async () => {
      server.use(
        http.get(`${baseUrl}/public/campaigns`, () =>
          HttpResponse.json({ campaigns: [publicCampaignSummaryApiFixture] }),
        ),
      );

      const result = await campaignService.listPublicCampaigns(token);

      expect(result).toEqual([publicCampaignSummaryFixture]);
    });

    it("returns [] when the response has no campaigns key", async () => {
      server.use(
        http.get(`${baseUrl}/public/campaigns`, () => HttpResponse.json({})),
      );

      const result = await campaignService.listPublicCampaigns(token);

      expect(result).toEqual([]);
    });
  });

  describe("createCampaign", () => {
    it("POSTs to /campaigns with the body untouched and Authorization header", async () => {
      let capturedBody: unknown;
      let capturedAuth: string | null = null;
      server.use(
        http.post(`${baseUrl}/campaigns`, async ({ request }) => {
          capturedBody = await request.json();
          capturedAuth = request.headers.get("authorization");
          // Real shape (see finding below) — irrelevant to this request-side test.
          return HttpResponse.json(campaignFixture, { status: 201 });
        }),
      );

      await campaignService.createCampaign(token, {
        name: "Nova Campanha",
        briefInitialDescription: "Brief",
        description: "Descrição",
        isPublic: false,
        callLink: "https://discord.gg/abc",
        storyStartAt: "2026-01-01",
      });

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedBody).toEqual({
        name: "Nova Campanha",
        briefInitialDescription: "Brief",
        description: "Descrição",
        isPublic: false,
        callLink: "https://discord.gg/abc",
        storyStartAt: "2026-01-01",
      });
    });

    // FINDING (real bug, not fixed — documenting current behavior):
    // CreateCampaignHandler's response body (CreateCampaignResponseBody in
    // create_campaign.go) puts uuid/name/... directly at the top level — there is
    // no nested `campaign` key, unlike every sibling endpoint (get_campaign.go,
    // update_campaign.go both wrap in `{"campaign": {...}}`, and matchService's
    // createMatch response is `{"match": {...}}`). campaignService.createCampaign
    // reads `data.campaign`, which is `undefined` against this real response, so
    // createCampaign silently resolves to `undefined` in production instead of the
    // created campaign. Reported for the PR body; not fixed here since fixing
    // requires editing either create_campaign.go (backend, out of scope) or
    // campaignService.ts (production code, excluded from this task).
    it("resolves to undefined against the real (unwrapped) backend response shape", async () => {
      server.use(
        http.post(`${baseUrl}/campaigns`, () =>
          HttpResponse.json(
            {
              // Flat body, exactly as CreateCampaignResponseBody serializes —
              // no "campaign" wrapper key.
              uuid: "campaign-9",
              name: "Nova Campanha",
              briefInitialDescription: "Brief",
              description: "Descrição",
              isPublic: false,
              callLink: "https://discord.gg/abc",
              storyStartAt: "2026-01-01",
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
            { status: 201 },
          ),
        ),
      );

      const result = await campaignService.createCampaign(token, {
        name: "Nova Campanha",
      });

      expect(result).toBeUndefined();
    });
  });

  describe("deleteCampaign", () => {
    it("DELETEs /campaigns/:id with Authorization header", async () => {
      let capturedAuth: string | null = null;
      let capturedUrl = "";
      server.use(
        http.delete(`${baseUrl}/campaigns/:id`, ({ request }) => {
          capturedAuth = request.headers.get("authorization");
          capturedUrl = request.url;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await campaignService.deleteCampaign(token, "campaign-1");

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedUrl).toBe(`${baseUrl}/campaigns/campaign-1`);
      expect(result).toBeUndefined();
    });
  });

  describe("updateCampaign", () => {
    it("PATCHes /campaigns/:id with the body untouched and Authorization header", async () => {
      let capturedBody: unknown;
      let capturedAuth: string | null = null;
      server.use(
        http.patch(`${baseUrl}/campaigns/:id`, async ({ request }) => {
          capturedBody = await request.json();
          capturedAuth = request.headers.get("authorization");
          return HttpResponse.json({ campaign: campaignEditFixture });
        }),
      );

      await campaignService.updateCampaign(token, "campaign-1", {
        name: "Campanha Atualizada",
        isPublic: false,
      });

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedBody).toEqual({
        name: "Campanha Atualizada",
        isPublic: false,
      });
    });

    it("returns the updated campaign untouched, field by field", async () => {
      server.use(
        http.patch(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ campaign: campaignEditFixture }),
        ),
      );

      const result = await campaignService.updateCampaign(token, "campaign-1", {
        name: "Campanha Atualizada",
      });

      expect(result).toEqual(campaignEditFixture);
    });
  });
});
