// src/test/handlers.ts
import { http, HttpResponse } from "msw";
import { campaignApiFixture, campaignSummaryApiFixture } from "./fixtures/campaign";
import { matchApiFixture } from "./fixtures/match";
import { sheetApiFixture, sheetSummaryApiFixture } from "./fixtures/sheet";

const baseUrl = "http://localhost:5000";

// Default handlers cover the happy path. Response bodies mirror the Go backend's actual
// wire format per internal/app/api/**/*.go json tags — camelCase fields, as of Fase 8.
// The *ApiFixture exports already are that wire format; services under src/services/ pass
// the body straight through with no case conversion. A handful of envelope keys
// (character_sheet(s), CharacterClasses, match_map) are still snake_case/PascalCase here
// on purpose — renaming those is a separate, later task (see http-boundary-inventory.md).
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
  // Deferred: characterSheetsService.getCharacterSheetDetails still reads the raw
  // `character_sheet` key, though the real backend now sends `characterSheet`
  // (camelCase) — see http-boundary-inventory.md. Kept snake_case here so the
  // default handler matches what the (not-yet-updated) service code expects.
  http.get(`${baseUrl}/charactersheets/:id`, () =>
    HttpResponse.json({ character_sheet: sheetApiFixture }),
  ),
  // Deferred: characterClassesService.listCharacterClasses still reads the raw
  // PascalCase `CharacterClasses` key, though the real backend now sends
  // `characterClasses` (camelCase) — see http-boundary-inventory.md.
  http.get(`${baseUrl}/classes`, () =>
    HttpResponse.json({ CharacterClasses: [] }),
  ),
];
