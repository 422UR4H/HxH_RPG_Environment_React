// Lê só o `exp` do payload (base64url, sem verificar assinatura: quem valida é o servidor).
// Serve para o front descartar um token vencido ao abrir o app, sem esperar o primeiro 401.
export function isJwtExpired(token: string, nowMs: number = Date.now()): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const { exp } = JSON.parse(atob(padded)) as { exp?: unknown };
    if (typeof exp !== "number") return true;
    return exp * 1000 <= nowMs;
  } catch {
    return true;
  }
}
