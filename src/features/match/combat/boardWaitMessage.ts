// O que a área do mapa diz enquanto o tabuleiro da partida ainda não chegou (mesa e lobby).
// Função pura: as três páginas usam a mesma, só mudam o status do socket que passam.

import { GAME_SERVER_WAKING } from "../../../services/serverWake";
import type { MatchWsStatus } from "../../../hooks/useMatchWs";
import type { WsStatus } from "../../../hooks/useLobbyWs";

export type BoardWaitMessage = { text: string; tone: "muted" | "error" };

// Status de mesa e de lobby em que o socket não está (e não vai estar sozinho) servindo a sala.
const NO_CONNECTION = new Set<MatchWsStatus | WsStatus>(["unreachable", "disconnected", "replaced", "kicked", "lobby_closed"]);

/**
 * Por ordem de prioridade: falha do tabuleiro (só conectado), mestre ausente, sem conexão,
 * carregando. A falha só vale conectado: todo novo registro numa sala que ainda falha reenvia o
 * erro, então nada se perde; sem conexão o status é a notícia mais atual.
 */
export function boardWaitMessage({
  boardUnavailable,
  status,
}: {
  boardUnavailable: boolean;
  status: MatchWsStatus | WsStatus;
}): BoardWaitMessage {
  if (boardUnavailable && status === "connected") {
    return {
      text: "Não foi possível carregar o tabuleiro da partida. Atualize a página para tentar de novo.",
      tone: "error",
    };
  }
  if (status === "waiting") {
    return { text: "O tabuleiro aparece quando o mestre abrir a sala.", tone: "muted" };
  }
  if (status === "waking") {
    return { text: GAME_SERVER_WAKING, tone: "muted" };
  }
  if (NO_CONNECTION.has(status)) {
    return { text: "Sem conexão com a sala. O tabuleiro aparece quando a conexão voltar.", tone: "muted" };
  }
  return { text: "Carregando o tabuleiro…", tone: "muted" };
}
