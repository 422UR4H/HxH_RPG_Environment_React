// Mestre: pede ao servidor o ponto de vista de uma peça (`watch_piece_view`) e devolve a
// visão só quando ela é da peça pedida. Contrato: "Ponto de vista do mestre" em
// `System_X_System/docs/dev/api/maps.md`.
import { useEffect, useRef } from "react";
import type { PieceView } from "../../../types/tacticalMap";
import type { MatchWsStatus } from "../../../hooks/useMatchWs";

/**
 * Reenvia a observação quando a peça muda, quando o socket (re)conecta — um socket novo nasce
 * sem observação no servidor — e quando `resyncKey` muda (o `match_full_state` zera a visão
 * guardada; reenviar garante uma nova). O servidor não avisa quando a observação acaba, então
 * quem decide se a visão vale é o front: só a da peça pedida.
 */
export function usePiecePerspective(
  pieceId: string | undefined,
  view: PieceView | undefined,
  status: MatchWsStatus,
  watch: (id: string | null) => boolean,
  resyncKey: number,
): PieceView | undefined {
  const connected = status === "connected";
  // O que o servidor está observando nesta conexão, pelo que o front sabe.
  const watchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!connected) {
      watchedRef.current = null;
      return;
    }
    const id = pieceId ?? null;
    // Nada pedido e nada observado: um "" no fio seria só ruído.
    if (id === null && watchedRef.current === null) return;
    if (watch(id)) watchedRef.current = id;
  }, [connected, pieceId, resyncKey, watch]);

  return pieceId && view?.pieceId === pieceId ? view : undefined;
}
