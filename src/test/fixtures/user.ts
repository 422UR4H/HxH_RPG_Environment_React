// src/test/fixtures/user.ts
//
// Audited against auth.LoginResponseBody / user.User (Go) — no fix needed here.
// This fixture doesn't cross the HTTP boundary: renderWithProviders
// (src/test/render.tsx) writes it straight into localStorage["user"] to simulate an
// already-authenticated session, bypassing authService entirely. And unlike every other
// fixture file, User's own fields (uuid, nick, email) have no snake_case/camelCase
// distinction to get wrong — the backend now sends camelCase directly either way.
import type { UserStorage, User } from "../../types/user";

export const playerUser: User = {
  uuid: "user-1",
  nick: "TestPlayer",
  email: "player@test.com",
};

export const masterUser: User = {
  uuid: "master-1",
  nick: "TestMaster",
  email: "master@test.com",
};

export const userFixture: UserStorage = {
  user: playerUser,
};

export const masterUserFixture: UserStorage = {
  user: masterUser,
};
