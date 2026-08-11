// src/test/handlers.ts
import { http, HttpResponse } from "msw";
import { campaignApiFixture, campaignSummaryApiFixture } from "./fixtures/campaign";
import { matchApiFixture } from "./fixtures/match";
import { sheetApiFixture, sheetSummaryApiFixture } from "./fixtures/sheet";

const baseUrl = "http://localhost:5000";

// Default handlers cover the happy path. Response bodies mirror the Go backend's actual
// wire format per internal/app/api/**/*.go json tags — camelCase fields, as of Fase 8.
// The *ApiFixture exports already are that wire format; services under src/services/ pass
// the body straight through with no case conversion. The three envelope keys that were
// deliberately left snake_case/PascalCase during the case-converter removal
// (characterSheet, characterClasses, matchMap) are now also camelCase, matching the real
// backend — see http-boundary-inventory.md for the (now-closed) migration history.
// Tests override individual handlers via server.use(...) for error/role scenarios — those
// overrides must follow the same convention (see src/test/fixtures/*.ts for the audit
// notes per endpoint).
export const defaultHandlers = [
  http.get(`${baseUrl}/campaigns`, () =>
    HttpResponse.json({ campaigns: [campaignSummaryApiFixture] }),
  ),
  http.get(`${baseUrl}/campaigns/:id`, () =>
    HttpResponse.json({ campaign: campaignApiFixture }),
  ),
  http.get(`${baseUrl}/campaigns/:id/maps`, () =>
    HttpResponse.json({ maps: [] }),
  ),
  http.get(`${baseUrl}/public/campaigns`, () =>
    HttpResponse.json({ campaigns: [campaignSummaryApiFixture] }),
  ),
  http.get(`${baseUrl}/matches/:id`, () =>
    HttpResponse.json({ match: matchApiFixture }),
  ),
  http.patch(`${baseUrl}/matches/:id`, () =>
    HttpResponse.json({ match: matchApiFixture }),
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
  // Go: ListCharacterSheetsBody.CharacterSheets now tags `json:"characterSheets"`
  // (camelCase) — matches both the real backend and the literal key
  // characterSheetsService.listCharacterSheets already reads, no deferral needed.
  http.get(`${baseUrl}/charactersheets`, () =>
    HttpResponse.json({ characterSheets: [sheetSummaryApiFixture] }),
  ),
  // Go: GetCharacterSheetBody.CharacterSheet now tags `json:"characterSheet"`
  // (camelCase) — matches both the real backend and the literal key
  // characterSheetsService.getCharacterSheetDetails reads.
  http.get(`${baseUrl}/charactersheets/:id`, () =>
    HttpResponse.json({ characterSheet: sheetApiFixture }),
  ),
  // Go: ListClassesBody's envelope field now tags `json:"characterClasses"`
  // (camelCase) — matches both the real backend and the literal key
  // characterClassesService.listCharacterClasses reads.
  http.get(`${baseUrl}/classes`, () =>
    HttpResponse.json({ characterClasses: [] }),
  ),
];
