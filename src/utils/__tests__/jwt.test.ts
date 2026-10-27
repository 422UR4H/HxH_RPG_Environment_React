import { describe, it, expect } from "vitest";
import { isJwtExpired } from "../jwt";

function makeToken(payload: object): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${b64({ alg: "HS256" })}.${b64(payload)}.signature`;
}

describe("isJwtExpired", () => {
  it("reads exp from the payload", () => {
    const token = makeToken({ exp: 2000 });
    expect(isJwtExpired(token, 1999 * 1000)).toBe(false);
    expect(isJwtExpired(token, 2001 * 1000)).toBe(true);
  });

  it("treats a past exp as expired", () => {
    expect(isJwtExpired(makeToken({ exp: 1 }))).toBe(true);
  });

  it("treats an unreadable token as expired", () => {
    expect(isJwtExpired("not-a-jwt")).toBe(true);
    expect(isJwtExpired("a.%%%.c")).toBe(true);
    expect(isJwtExpired(makeToken({ sub: "no-exp" }))).toBe(true);
  });
});
