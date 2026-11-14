import { useCallback, useEffect, useRef, useState, type DragEvent, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createCardDragTracker, type CardDragPoint } from "./cardDragGesture";

/**
 * Enquanto um arraste por toque está ativo, a página não pode rolar (o dedo está levando o
 * card ao mapa). O `touchmove` precisa ser não passivo para o `preventDefault` valer. Os
 * ouvintes de soltura saem sozinhos no fim do gesto — independem do card continuar montado
 * (a gaveta fecha ao começar o arraste).
 */
function blockPageScrollUntilRelease() {
  const block = (e: TouchEvent) => {
    if (e.cancelable) e.preventDefault();
  };
  const release = () => {
    document.removeEventListener("touchmove", block);
    window.removeEventListener("pointerup", release);
    window.removeEventListener("pointercancel", release);
  };
  document.addEventListener("touchmove", block, { passive: false });
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
}

/**
 * Liga o gesto de arrastar a um wrapper do card. Sem `enabled`, os handlers não fazem nada e o
 * card segue um clique comum.
 */
export function useCardDragGesture({
  enabled,
  onDragStart,
}: {
  enabled: boolean;
  onDragStart: (point: CardDragPoint) => void;
}) {
  const onDragStartRef = useRef(onDragStart);
  useEffect(() => {
    onDragStartRef.current = onDragStart;
  });
  // Ainda há um arraste a engolir o clique que vem depois da soltura?
  const swallowClick = useRef(false);
  const touching = useRef(false);
  const cleanup = useRef<(() => void) | null>(null);

  const [tracker] = useState(() =>
    createCardDragTracker({
      onStart: (point, pointerType) => {
        swallowClick.current = true;
        if (pointerType === "touch") blockPageScrollUntilRelease();
        onDragStartRef.current(point);
      },
    }),
  );

  const stop = useCallback(() => {
    cleanup.current?.();
    cleanup.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return;
      stop();
      swallowClick.current = false;
      touching.current = e.pointerType === "touch";
      tracker.down(e);
      const onMove = (ev: PointerEvent) => tracker.move(ev);
      const onEnd = () => {
        tracker.end();
        stop();
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
      cleanup.current = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
        tracker.end();
      };
    },
    [enabled, tracker, stop],
  );

  // O clique que sucede um arraste (soltura sobre o próprio card) não abre a ficha.
  const handleClickCapture = useCallback((e: MouseEvent<HTMLElement>) => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // O toque longo abriria o menu do navegador no meio do segurar.
  const handleContextMenu = useCallback((e: MouseEvent<HTMLElement>) => {
    if (touching.current) e.preventDefault();
  }, []);

  // O arrastar nativo de imagem/texto cancelaria os eventos de ponteiro.
  const handleDragStart = useCallback((e: DragEvent<HTMLElement>) => e.preventDefault(), []);

  if (!enabled) return {};
  return {
    onPointerDown: handlePointerDown,
    onClickCapture: handleClickCapture,
    onContextMenu: handleContextMenu,
    onDragStart: handleDragStart,
  };
}
