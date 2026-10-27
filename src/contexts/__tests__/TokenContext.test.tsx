import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TokenProvider } from "../TokenContext";
import useToken from "../../hooks/useToken";
import { SESSION_EXPIRED_KEY } from "../../features/auth/sessionNotice";

function b64(o: object): string {
  return btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function makeToken(exp: number): string {
  return `${b64({ alg: "HS256" })}.${b64({ exp })}.sig`;
}

function Probe() {
  const { token } = useToken();
  return <div data-testid="token">{token ?? "null"}</div>;
}

describe("TokenProvider", () => {
  beforeEach(() => sessionStorage.clear());

  it("an expired stored token is dropped on start and marks the session as expired", () => {
    localStorage.setItem("token", JSON.stringify({ token: makeToken(1) }));
    localStorage.setItem("user", JSON.stringify({ uuid: "u1" }));

    render(<TokenProvider><Probe /></TokenProvider>);

    expect(screen.getByTestId("token")).toHaveTextContent("null");
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(sessionStorage.getItem(SESSION_EXPIRED_KEY)).toBe("1");
  });

  it("keeps a valid stored token", () => {
    const token = makeToken(Math.floor(Date.now() / 1000) + 3600);
    localStorage.setItem("token", JSON.stringify({ token }));

    render(<TokenProvider><Probe /></TokenProvider>);

    expect(screen.getByTestId("token")).toHaveTextContent(token);
    expect(sessionStorage.getItem(SESSION_EXPIRED_KEY)).toBeNull();
  });
});
