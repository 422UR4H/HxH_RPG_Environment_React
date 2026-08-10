// src/services/__tests__/authService.test.ts
//
// Wire-format safety net for authService.ts. Mirrors the Go structs in
// System_X_System/internal/app/api/auth/{request,response}.go and
// auth_handler.go (RegisterRequestBody/LoginRequestBody, LoginResponseBody).
//
// Per method: (1) request URL/verb + wire-format (snake_case) body,
// (2) response — authService.signIn and authService.signUp behave
// *differently* on the response side (see FINDING comments below), so this
// file asserts what each one actually does today rather than assuming they
// match, (3) no Authorization header case — both endpoints precede having a
// token.
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/server";
import { authService } from "../authService";

const baseUrl = "http://localhost:5000";

describe("authService", () => {
  describe("signIn", () => {
    it("POSTs to /auth/login with a snake_case body", async () => {
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
      // email/password are already single-word keys — objToSnakeCase is a
      // no-op here, but this locks the wire shape down regardless.
      expect(capturedBody).toEqual({
        email: "gon@test.com",
        password: "secret123",
      });
    });

    // FINDING (not fixed — documenting current behavior, Task 1's Finding 5):
    // signIn's `.then(({ data }) => data)` never calls objToCamelCase, unlike
    // signUp below. Every real field on LoginResponseBody (token, user.uuid,
    // user.nick, user.email) is already a single word, so in production this
    // is currently harmless — there's no snake_case key that would fail to
    // convert. To make the asymmetry *observable*, this test adds a
    // synthetic multi-word key that isn't part of the real contract. It
    // proves signIn passes the wire response through completely untouched.
    it("returns the raw wire response untouched (no camelCase conversion, unlike signUp)", async () => {
      const wireWithSyntheticField = {
        token: "jwt-abc",
        user: { uuid: "user-1", nick: "Gon", email: "gon@test.com" },
        // Not part of LoginResponseBody — added only to expose the
        // signIn/signUp asymmetry (see FINDING above).
        session_expires_at: "2026-08-10T00:00:00Z",
      };
      server.use(
        http.post(`${baseUrl}/auth/login`, () =>
          HttpResponse.json(wireWithSyntheticField),
        ),
      );

      const result = await authService.signIn({
        email: "gon@test.com",
        password: "secret123",
      });

      expect(result).toEqual(wireWithSyntheticField);
      // Still snake_case — proves no conversion happened.
      expect((result as unknown as Record<string, unknown>).session_expires_at).toBe(
        "2026-08-10T00:00:00Z",
      );
    });
  });

  describe("signUp", () => {
    it("POSTs to /auth/register with a snake_case body (confirmPass -> confirm_pass)", async () => {
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
        confirm_pass: "secret123",
      });
    });

    it("returns the response camelCase-converted, unlike signIn (hypothetical body-bearing response)", async () => {
      const wireWithSyntheticField = {
        token: "jwt-abc",
        user: { uuid: "user-1", nick: "Gon", email: "gon@test.com" },
        session_expires_at: "2026-08-10T00:00:00Z",
      };
      server.use(
        http.post(`${baseUrl}/auth/register`, () =>
          HttpResponse.json(wireWithSyntheticField, { status: 201 }),
        ),
      );

      const result = await authService.signUp({
        nick: "Gon",
        email: "gon@test.com",
        password: "secret123",
        confirmPass: "secret123",
      });

      expect(result).toEqual({
        token: "jwt-abc",
        user: { uuid: "user-1", nick: "Gon", email: "gon@test.com" },
        sessionExpiresAt: "2026-08-10T00:00:00Z",
      });
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
