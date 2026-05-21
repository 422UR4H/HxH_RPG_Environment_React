import { http, HttpResponse } from "msw";

const baseUrl = "http://localhost:5000";

// Handlers default cobrem o happy path. Cada teste pode override via
// server.use(...) pra cenários específicos (erro, master vs player, etc).
export const defaultHandlers = [
  http.get(`${baseUrl}/campaigns`, () => HttpResponse.json([])),
  http.get(`${baseUrl}/campaigns/:id`, () => HttpResponse.json(null)),
  http.get(`${baseUrl}/campaigns/public`, () => HttpResponse.json([])),
  http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json(null)),
  http.get(`${baseUrl}/matches/:id/enrollments`, () => HttpResponse.json([])),
  http.get(`${baseUrl}/matches/:id/participants`, () => HttpResponse.json([])),
  http.get(`${baseUrl}/charactersheets`, () => HttpResponse.json([])),
  http.get(`${baseUrl}/charactersheets/:id`, () => HttpResponse.json(null)),
  http.get(`${baseUrl}/characterclasses`, () => HttpResponse.json([])),
];
