import { useEffect, useRef } from "react";

/**
 * Rede de segurança para animações de saída: se `animationend` nunca chegar
 * (animação cancelada por `display:none` de um ancestral, ambiente sem AnimationEvent),
 * chama `onDone` depois de `ms` enquanto `closing` for true. Limpa no cleanup.
 */
export function useClosingFallback(closing: boolean, onDone: () => void, ms: number) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (!closing) return;
    const id = window.setTimeout(() => onDoneRef.current(), ms);
    return () => window.clearTimeout(id);
  }, [closing, ms]);
}
