// src/services/__tests__/httpClient.test.ts
//
// NOT a full test of httpClient.ts (per the Fase 7 plan) — just the 401
// response interceptor, which is an invariant documented in the root
// CLAUDE.md ("o interceptor 401 em httpClient.ts limpa storage. Nova chave
// de auth precisa ir junto nele") but had no test locking it down. This
// also covers the Phase 6 fix: auto-logout only fires when there was
// already a `token` in localStorage — a 401 with no prior session must not
// clear anything or redirect.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/server";
import { httpClient } from "../httpClient";

const baseUrl = "http://localhost:5000";

describe("httpClient 401 interceptor", () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    // jsdom's real window.location.href setter attempts actual navigation
    // (and logs a "Not implemented" error). Replace it with a plain stub so
    // we can assert on it without side effects. Axios itself reads
    // window.location.href internally (same-origin checks / URL
    // resolution), so the stub needs a real absolute URL to start with —
    // an empty string makes axios throw "Invalid URL" before the request
    // is even sent.
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "http://localhost:3000/" },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("clears token and user from localStorage and redirects to / when a 401 arrives and a session existed", async () => {
    localStorage.setItem("token", "expired-token");
    localStorage.setItem("user", JSON.stringify({ uuid: "user-1", nick: "Gon", email: "gon@test.com" }));
    server.use(
      http.get(`${baseUrl}/protected`, () =>
        HttpResponse.json({ detail: "token expired" }, { status: 401 }),
      ),
    );

    await expect(httpClient.get("/protected")).rejects.toBeTruthy();

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(window.location.href).toBe("/");
  });

  it("does NOT clear localStorage or redirect on a 401 when there was no token to begin with (Phase 6 fix)", async () => {
    // No token set — localStorage starts clean per src/test/setup.ts.
    // A stray "user" key (e.g. leftover/corrupted state) must also survive
    // untouched, since the guard is specifically `token` presence.
    localStorage.setItem("user", JSON.stringify({ uuid: "user-1", nick: "Gon", email: "gon@test.com" }));
    server.use(
      http.get(`${baseUrl}/public-but-401`, () =>
        HttpResponse.json({ detail: "unauthorized" }, { status: 401 }),
      ),
    );

    await expect(httpClient.get("/public-but-401")).rejects.toBeTruthy();

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).not.toBeNull();
    expect(window.location.href).toBe("http://localhost:3000/");
  });
});
