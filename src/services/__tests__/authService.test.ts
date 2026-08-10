// src/services/__tests__/authService.test.ts
//
// Wire-format safety net for authService.ts. Mirrors the Go structs in
// System_X_System/internal/app/api/auth/{request,response}.go and
// auth_handler.go (RegisterRequestBody/LoginRequestBody, LoginResponseBody).
//
// Fase 8: the backend now speaks camelCase all the way down, and authService
// no longer runs request/response bodies through any case-conversion — both
// signIn and signUp pass the body straight through, in both directions.
// (Before Fase 8, signUp ran its response through the generic case converter while
// signIn didn't — that asymmetry is gone now that neither converts anything.)
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/server";
import { authService } from "../authService";

const baseUrl = "http://localhost:5000";

describe("authService", () => {
  describe("signIn", () => {
    it("POSTs to /auth/login with the body untouched", async () => {
      let capturedUrl = "";
      let capturedBody: unknown;
      server.use(
        http.post(`${baseUrl}/auth/login`, async ({ request }) => {
          capturedUrl = request.url;
          capturedBody = await request.json();
          return HttpResponse.json({
            token: "jwt-abc",
            user: { uuid: "user-1", nick: "Gon", email: "gon@test.com" },
          });
        }),
      );

      await authService.signIn({ email: "gon@test.com", password: "secret123" });

      expect(capturedUrl).toBe(`${baseUrl}/auth/login`);
      expect(capturedBody).toEqual({
        email: "gon@test.com",
        password: "secret123",
      });
    });

    it("returns the wire response untouched (no case conversion)", async () => {
      const wireWithMultiWordField = {
        token: "jwt-abc",
        user: { uuid: "user-1", nick: "Gon", email: "gon@test.com" },
        sessionExpiresAt: "2026-08-10T00:00:00Z",
      };
      server.use(
        http.post(`${baseUrl}/auth/login`, () =>
          HttpResponse.json(wireWithMultiWordField),
        ),
      );

      const result = await authService.signIn({
        email: "gon@test.com",
        password: "secret123",
      });

      expect(result).toEqual(wireWithMultiWordField);
    });
  });

  describe("signUp", () => {
    it("POSTs to /auth/register with the body untouched (confirmPass stays confirmPass)", async () => {
      let capturedUrl = "";
      let capturedBody: unknown;
      server.use(
        http.post(`${baseUrl}/auth/register`, async ({ request }) => {
          capturedUrl = request.url;
          capturedBody = await request.json();
          return new HttpResponse(null, { status: 201 });
        }),
      );

      await authService.signUp({
        nick: "Gon",
        email: "gon@test.com",
        password: "secret123",
        confirmPass: "secret123",
      });

      expect(capturedUrl).toBe(`${baseUrl}/auth/register`);
      expect(capturedBody).toEqual({
        nick: "Gon",
        email: "gon@test.com",
        password: "secret123",
        confirmPass: "secret123",
      });
    });

    it("returns the wire response untouched, same as signIn (hypothetical body-bearing response)", async () => {
      const wireWithMultiWordField = {
        token: "jwt-abc",
        user: { uuid: "user-1", nick: "Gon", email: "gon@test.com" },
        sessionExpiresAt: "2026-08-10T00:00:00Z",
      };
      server.use(
        http.post(`${baseUrl}/auth/register`, () =>
          HttpResponse.json(wireWithMultiWordField, { status: 201 }),
        ),
      );

      const result = await authService.signUp({
        nick: "Gon",
        email: "gon@test.com",
        password: "secret123",
        confirmPass: "secret123",
      });

      expect(result).toEqual(wireWithMultiWordField);
    });

    // FINDING (real bug, not fixed — documenting current behavior):
    // RegisterResponse (internal/app/api/auth/response.go) is
    // `struct { Status int \`json:"status"\` }` — it has NO Body field.
    // Unlike LoginResponse (which has `Body LoginResponseBody`), the real
    // POST /auth/register response carries no JSON payload at all — just
    // a 201 with an empty body. authService.signUp is typed
    // `Promise<UserResponse>` and its call site in RegisterPage.tsx never
    // reads the resolved value (onSuccess just logs out and navigates), so
    // this is currently harmless in the UI — but the type signature lies
    // about what signUp actually resolves to against the real backend.
    // Reported for the PR body; not fixed here (production code, and the
    // fix touches whichever side is judged wrong — backend contract or
    // frontend type — which is out of scope for a test-only task).
    it("resolves without a usable user/token against the real (bodyless) /auth/register response", async () => {
      server.use(
        http.post(`${baseUrl}/auth/register`, () =>
          new HttpResponse(null, { status: 201 }),
        ),
      );

      const result = await authService.signUp({
        nick: "Gon",
        email: "gon@test.com",
        password: "secret123",
        confirmPass: "secret123",
      });

      // Whatever axios does with an empty body (empty string, per this
      // adapter), it is certainly not a { token, user } shape — accessing
      // result.token or result.user in a real caller would blow up.
      expect(result).not.toHaveProperty("token");
      expect(result).not.toHaveProperty("user");
    });
  });
});
