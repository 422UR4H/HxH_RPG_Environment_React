import { API_URL } from "./httpClient";

// Textos do servidor gratuito que dorme (Render): o primeiro acesso depois de um tempo parado demora.
export const SERVER_WAKING_HINT = "O servidor está acordando. Isso pode levar até um minuto.";
export const GAME_SERVER_WAKING = "Acordando o servidor da mesa… pode levar até um minuto.";
export const GAME_SERVER_UNREACHABLE = "Não foi possível conectar ao servidor da mesa.";

export const WARM_UP_INTERVAL_MS = 300_000;

let lastWarmUpAt: number | null = null;

// Origem HTTP do servidor do jogo, derivada da URL do WebSocket.
export function gameHttpOrigin(wsUrl: string | undefined): string | null {
  if (!wsUrl) return null;
  try {
    const url = new URL(wsUrl);
    if (url.protocol === "ws:") return `http://${url.host}`;
    if (url.protocol === "wss:") return `https://${url.host}`;
    return null;
  } catch {
    return null;
  }
}

function ping(url: string) {
  fetch(url, { mode: "no-cors" }).catch(() => {});
}

// Dispara, sem esperar, um request barato em cada servidor para tirá-los do sono.
export function warmUpServers(now: number = Date.now()): void {
  if (lastWarmUpAt !== null && now - lastWarmUpAt < WARM_UP_INTERVAL_MS) return;
  lastWarmUpAt = now;
  ping(`${API_URL}/readiness`);
  const gameOrigin = gameHttpOrigin(import.meta.env.VITE_WS_URL);
  if (gameOrigin) ping(`${gameOrigin}/health`);
}

export function resetWarmUpForTests(): void {
  lastWarmUpAt = null;
}
