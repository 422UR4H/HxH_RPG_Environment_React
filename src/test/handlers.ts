import { http, HttpResponse } from "msw";
import { campaignFixture, campaignSummaryFixture } from "./fixtures/campaign";
import { matchFixture } from "./fixtures/match";
import { sheetFixture, sheetSummaryFixture } from "./fixtures/sheet";

const baseUrl = "http://localhost:5000";

// Handlers default cobrem o happy path. Cada teste pode override via
// server.use(...) pra cenários específicos (erro, master vs player, etc).
export const defaultHandlers = [
  http.get(`${baseUrl}/campaigns`, () => HttpResponse.json([campaignSummaryFixture])),
  http.get(`${baseUrl}/campaigns/:id`, () => HttpResponse.json(campaignFixture)),
  http.get(`${baseUrl}/campaigns/public`, () => HttpResponse.json([campaignSummaryFixture])),
  http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json(matchFixture)),
  http.get(`${baseUrl}/matches/:id/enrollments`, () => HttpResponse.json([])),
  http.get(`${baseUrl}/matches/:id/participants`, () => HttpResponse.json([])),
  http.get(`${baseUrl}/charactersheets`, () => HttpResponse.json([sheetSummaryFixture])),
  http.get(`${baseUrl}/charactersheets/:id`, () => HttpResponse.json(sheetFixture)),
  http.get(`${baseUrl}/characterclasses`, () => HttpResponse.json([])),
];
