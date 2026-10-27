export const SESSION_EXPIRED_KEY = "sessionExpired";

// sessionStorage (e não localStorage): o aviso vale para esta aba, uma vez, e some ao fechá-la.
export function markSessionExpired(): void {
  try {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, "1");
  } catch {
    // Storage bloqueado: sem aviso, mas o redirecionamento ao login continua valendo.
  }
}

/** Só lê, sem apagar: para o inicializador do useState, que o StrictMode roda duas vezes. */
export function peekSessionExpired(): boolean {
  try {
    return sessionStorage.getItem(SESSION_EXPIRED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Lê e apaga: devolve `true` no máximo uma vez por sessão expirada. */
export function consumeSessionExpired(): boolean {
  try {
    const expired = sessionStorage.getItem(SESSION_EXPIRED_KEY) === "1";
    if (expired) sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    return expired;
  } catch {
    return false;
  }
}

/** Limpa as duas chaves de auth e marca o aviso. Usado pelo interceptor 401 e pelo TokenProvider. */
export function expireSession(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  markSessionExpired();
}
