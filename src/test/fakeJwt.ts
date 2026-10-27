function b64url(o: object): string {
  return btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** JWT de mentira com `exp` no futuro (1 h): o TokenProvider descarta tokens ilegíveis ou vencidos. */
export function fakeJwt(expSeconds: number = Math.floor(Date.now() / 1000) + 3600): string {
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ exp: expSeconds })}.signature`;
}
