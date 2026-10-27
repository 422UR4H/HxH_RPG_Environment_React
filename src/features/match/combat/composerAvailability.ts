// Por que o compositor do jogador não pode agir agora (ou `undefined` se pode): depende do
// estado da conexão, não de uma frase única.

import type { MatchWsStatus } from "../../../hooks/useMatchWs";

export const WAIT_FOR_MASTER = "Aguarde o mestre abrir a sala para agir.";

export function composerUnavailableReason(status: MatchWsStatus, hasBoard: boolean): string | undefined {
  switch (status) {
    case "connected":
      return hasBoard ? undefined : WAIT_FOR_MASTER;
    case "waiting":
      return WAIT_FOR_MASTER;
    case "connecting":
    case "waking":
      return "Conectando à mesa…";
    default:
      return "Sem conexão com a mesa.";
  }
}
