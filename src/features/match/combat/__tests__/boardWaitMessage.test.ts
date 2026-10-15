import { describe, it, expect } from "vitest";
import { boardWaitMessage } from "../boardWaitMessage";
import type { MatchWsStatus } from "../../../../hooks/useMatchWs";
import type { WsStatus } from "../../../../hooks/useLobbyWs";

type S = MatchWsStatus | WsStatus;

const NO_CONNECTION = "Sem conexão com a sala. O tabuleiro aparece quando a conexão voltar.";

describe("boardWaitMessage", () => {
  it("board_unavailable conectado: texto de falha, em tom de erro", () => {
    expect(boardWaitMessage({ boardUnavailable: true, status: "connected" })).toEqual({
      text: "Não foi possível carregar o tabuleiro da partida. Atualize a página para tentar de novo.",
      tone: "error",
    });
  });
  it("board_unavailable só vale conectado: fora disso o status decide", () => {
    expect(boardWaitMessage({ boardUnavailable: true, status: "waiting" })).toEqual({
      text: "O tabuleiro aparece quando o mestre abrir a sala.",
      tone: "muted",
    });
    expect(boardWaitMessage({ boardUnavailable: true, status: "disconnected" })).toEqual({ text: NO_CONNECTION, tone: "muted" });
    expect(boardWaitMessage({ boardUnavailable: true, status: "connecting" })).toEqual({
      text: "Carregando o tabuleiro…",
      tone: "muted",
    });
  });
  it("mesa aguardando o mestre", () => {
    expect(boardWaitMessage({ boardUnavailable: false, status: "waiting" })).toEqual({
      text: "O tabuleiro aparece quando o mestre abrir a sala.",
      tone: "muted",
    });
  });
  it("sem conexão: mesa e lobby", () => {
    for (const status of ["disconnected", "error", "throttled", "replaced", "kicked", "lobby_closed"] as S[]) {
      expect(boardWaitMessage({ boardUnavailable: false, status })).toEqual({ text: NO_CONNECTION, tone: "muted" });
    }
  });
  it("conectando ou conectado: carregando", () => {
    for (const status of ["connecting", "connected"] as S[]) {
      expect(boardWaitMessage({ boardUnavailable: false, status })).toEqual({
        text: "Carregando o tabuleiro…",
        tone: "muted",
      });
    }
  });
});
