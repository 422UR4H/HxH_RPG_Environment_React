// O aviso que ocupa a área do mapa enquanto o tabuleiro não chegou (mesa e lobby).
import type { MatchWsStatus } from "../../../hooks/useMatchWs";
import type { WsStatus } from "../../../hooks/useLobbyWs";
import { boardWaitMessage } from "./boardWaitMessage";
import { MapErrorMessage, MapLoadingMessage } from "./mapCanvasStyles";

export function BoardWaitNotice({ boardUnavailable, status }: { boardUnavailable: boolean; status: MatchWsStatus | WsStatus }) {
  const { text, tone } = boardWaitMessage({ boardUnavailable, status });
  return tone === "error" ? (
    <MapErrorMessage role="status">{text}</MapErrorMessage>
  ) : (
    <MapLoadingMessage>{text}</MapLoadingMessage>
  );
}
