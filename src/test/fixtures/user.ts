// src/test/fixtures/user.ts
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
