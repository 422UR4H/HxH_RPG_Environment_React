// O aviso que ocupa a área do mapa enquanto o tabuleiro não chegou (mesa e lobby).
import { boardWaitMessage } from "./boardWaitMessage";
import { MapErrorMessage, MapLoadingMessage } from "./mapCanvasStyles";

export function BoardWaitNotice({ boardUnavailable, status }: { boardUnavailable: boolean; status: string }) {
  const { text, tone } = boardWaitMessage({ boardUnavailable, status });
  return tone === "error" ? (
    <MapErrorMessage role="status">{text}</MapErrorMessage>
  ) : (
    <MapLoadingMessage>{text}</MapLoadingMessage>
  );
}
