// Mestre: pede ao servidor o ponto de vista de uma peça (`watch_piece_view`) e devolve a
// visão só quando ela é da peça pedida. Contrato: "Ponto de vista do mestre" em
// `System_X_System/docs/dev/api/maps.md`.
import { useEffect, useRef, useState } from "react";
import type { PieceView } from "../../../types/tacticalMap";
import type { MatchWsStatus } from "../../../hooks/useMatchWs";

/**
 * Reenvia a observação quando a peça muda, quando o socket (re)conecta — um socket novo nasce
 * sem observação no servidor — e quando `resyncKey` muda (o `match_full_state` zera a visão
 * guardada; reenviar garante uma nova). O servidor não avisa quando a observação acaba, então
 * quem decide se a visão vale é o front: só a da peça pedida, e só uma que chegou depois de
 * a peça ser pedida — reselecionar a mesma peça não mostra a visão guardada da seleção anterior.
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

  // A visão que estava guardada quando a peça pedida mudou é de uma observação anterior: não
  // vale até chegar outra (o `useGameTable` troca o objeto a cada piece_view). Ajuste de estado
  // durante o render, para a visão velha não aparecer nem num quadro.
  const [selection, setSelection] = useState({ pieceId, staleView: view });
  let staleView = selection.staleView;
  if (selection.pieceId !== pieceId) {
    staleView = view;
    setSelection({ pieceId, staleView: view });
  }

  return pieceId && view?.pieceId === pieceId && view !== staleView ? view : undefined;
}
