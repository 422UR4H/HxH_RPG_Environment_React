import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Posiciona, sem estado, o ghost que segue o ponteiro (`PieceDragGhostPortal`). Mesma técnica
 * do `useRosterDrag` (style.left/top por ref, um ouvinte de `pointermove` só enquanto há arraste),
 * mas sem o payload de `CharacterPrivateSummary`; e parte do ponto onde o arraste começou, não de (0,0).
 */
export function usePointerGhost(origin: { x: number; y: number } | null) {
  const ghostRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ghost = ghostRef.current;
    if (!origin || !ghost) return;
    ghost.style.left = `${origin.x}px`;
    ghost.style.top = `${origin.y}px`;
  }, [origin]);

  const active = origin != null;
  useEffect(() => {
    if (!active) return;
    const handleMove = (e: PointerEvent) => {
      const ghost = ghostRef.current;
      if (!ghost) return;
      ghost.style.left = `${e.clientX}px`;
      ghost.style.top = `${e.clientY}px`;
    };
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, [active]);

  return ghostRef;
}
