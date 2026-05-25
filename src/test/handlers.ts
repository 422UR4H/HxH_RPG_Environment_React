// src/test/handlers.ts
import { http, HttpResponse } from "msw";
import { campaignFixture, campaignSummaryFixture } from "./fixtures/campaign";
import { matchFixture } from "./fixtures/match";
import { sheetFixture, sheetSummaryFixture } from "./fixtures/sheet";

const baseUrl = "http://localhost:5000";

// Default handlers cover the happy path. Responses are envelope-wrapped to
// match what each service in src/services/ actually reads from the API.
// Tests override individual handlers via server.use(...) for error/role scenarios.
export const defaultHandlers = [
  http.get(`${baseUrl}/campaigns`, () =>
    HttpResponse.json({ campaigns: [campaignSummaryFixture] }),
  ),
  http.get(`${baseUrl}/campaigns/:id`, () =>
    HttpResponse.json({ campaign: campaignFixture }),
  ),
  http.get(`${baseUrl}/public/campaigns`, () =>
    HttpResponse.json({ campaigns: [campaignSummaryFixture] }),
  ),
  http.get(`${baseUrl}/matches/:id`, () =>
    HttpResponse.json({ match: matchFixture }),
  ),
  http.patch(`${baseUrl}/matches/:id`, () =>
    HttpResponse.json({ match: matchFixture }),
  ),
  http.delete(`${baseUrl}/matches/:id`, () =>
    new HttpResponse(null, { status: 204 }),
  ),
  http.get(`${baseUrl}/matches/:id/enrollments`, () =>
    HttpResponse.json({ enrollments: [] }),
  ),
  http.get(`${baseUrl}/matches/:id/participants`, () =>
    HttpResponse.json({ participants: [] }),
  ),
  http.get(`${baseUrl}/charactersheets`, () =>
    HttpResponse.json({ characterSheets: [sheetSummaryFixture] }),
  ),
  http.get(`${baseUrl}/charactersheets/:id`, () =>
    HttpResponse.json({ character_sheet: sheetFixture }),
  ),
  http.get(`${baseUrl}/classes`, () =>
    HttpResponse.json({ CharacterClasses: [] }),
  ),
];
