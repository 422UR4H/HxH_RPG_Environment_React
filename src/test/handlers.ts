// src/test/handlers.ts
import { http, HttpResponse } from "msw";
import { campaignApiFixture, campaignSummaryApiFixture } from "./fixtures/campaign";
import { matchApiFixture } from "./fixtures/match";
import { sheetFixture, sheetSummaryApiFixture } from "./fixtures/sheet";

const baseUrl = "http://localhost:5000";

// Default handlers cover the happy path. Response bodies mirror the Go backend's actual
// wire format (envelope key + snake_case fields, per internal/app/api/**/*.go json tags)
// — NOT the frontend's post-conversion camelCase shape. The *ApiFixture / sheetFixture
// exports already are that wire format; each service under src/services/ is what turns
// them back into camelCase (objToCamelCase). Tests override individual handlers via
// server.use(...) for error/role scenarios — those overrides must follow the same
// convention (see src/test/fixtures/*.ts for the audit notes per endpoint).
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
  // Go: ListCharacterSheetsBody.CharacterSheets `json:"character_sheets"` — the mock used
  // to say "characterSheets" (already-converted shape), which made objToCamelCase() a
  // no-op and hid this exact envelope mismatch.
  http.get(`${baseUrl}/charactersheets`, () =>
    HttpResponse.json({ character_sheets: [sheetSummaryApiFixture] }),
  ),
  http.get(`${baseUrl}/charactersheets/:id`, () =>
    HttpResponse.json({ character_sheet: sheetFixture }),
  ),
  // Go: ListCharacterClassesBody.CharacterClasses `json:"CharacterClasses"` — PascalCase
  // on the wire is intentional (see comment in internal/app/api/sheet/list_classes.go),
  // not a bug to "fix" here.
  http.get(`${baseUrl}/classes`, () =>
    HttpResponse.json({ CharacterClasses: [] }),
  ),
];
