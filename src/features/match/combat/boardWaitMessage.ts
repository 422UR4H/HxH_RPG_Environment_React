// O que a área do mapa diz enquanto o tabuleiro da partida ainda não chegou (mesa e lobby).
// Função pura: as três páginas usam a mesma, só mudam o status do socket que passam.

export type BoardWaitMessage = { text: string; tone: "muted" | "error" };

// Status de mesa e de lobby em que o socket não está (e não vai estar sozinho) servindo a sala.
const NO_CONNECTION = new Set(["disconnected", "error", "throttled", "replaced", "kicked", "lobby_closed"]);

/** Por ordem de prioridade: falha do tabuleiro, mestre ausente, sem conexão, carregando. */
export function boardWaitMessage({
  boardUnavailable,
  status,
}: {
  boardUnavailable: boolean;
  status: string;
}): BoardWaitMessage {
  if (boardUnavailable) {
    return {
      text: "Não foi possível carregar o tabuleiro da partida. Atualize a página para tentar de novo.",
      tone: "error",
    };
  }
  if (status === "waiting") {
    return { text: "O tabuleiro aparece quando o mestre abrir a sala.", tone: "muted" };
  }
  if (NO_CONNECTION.has(status)) {
    return { text: "Sem conexão com a sala. O tabuleiro aparece quando a conexão voltar.", tone: "muted" };
  }
  return { text: "Carregando o tabuleiro…", tone: "muted" };
}
