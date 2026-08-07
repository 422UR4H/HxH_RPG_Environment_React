import { useCallback, useEffect, useRef, useState } from "react";
import type { CharacterPrivateSummary } from "../../../types/characterSheet";

// Shared drag-state machine for the two token-drag gestures on the tactical
// map: roster → canvas (placing an NPC) and canvas → roster (dragging a
// piece back off the board). Both TacticalMapEditor and TacticalMapPlacer
// used to carry an identical copy of this state; extracted here per Fase 3
// task 2 of the tactical-map refactor.
export function useRosterDrag(opts: { enableRosterDrop: boolean }) {
  const { enableRosterDrop } = opts;

  const [placingNpcId, setPlacingNpcId] = useState<string | null>(null);
  const [placingNpcData, setPlacingNpcData] = useState<CharacterPrivateSummary | null>(null);
  const [isDraggingPieceToRoster, setIsDraggingPieceToRoster] = useState(false);
  const [draggingCanvasPieceNpc, setDraggingCanvasPieceNpc] = useState<CharacterPrivateSummary | null>(null);

  const ghostRef = useRef<HTMLDivElement>(null);
  const canvasDragGhostRef = useRef<HTMLDivElement>(null);

  // Ghost position is written imperatively via ghost.style.left/top on the
  // ref instead of through setState. A setState on every pointermove would
  // re-render the whole tree dozens of times a second and tank the drag's
  // framerate — the ghost only needs to move visually, it never needs to be
  // read back through React state. Both effects below early-return when no
  // drag of that kind is active, so the pointermove listener only exists for
  // the duration of the gesture, and both remove exactly the listener they
  // added (named function, not an inline closure re-created on removal) —
  // that pairing is the fix for the Fase 1 listener-leak bug (A2).

  useEffect(() => {
    if (!placingNpcId) return;
    const handleMove = (e: PointerEvent) => {
      if (ghostRef.current) {
        ghostRef.current.style.left = `${e.clientX}px`;
        ghostRef.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, [placingNpcId]);

  useEffect(() => {
    if (!draggingCanvasPieceNpc) return;
    const handleMove = (e: PointerEvent) => {
      const ghost = canvasDragGhostRef.current;
      if (!ghost) return;
      ghost.style.left = `${e.clientX}px`;
      ghost.style.top = `${e.clientY}px`;
    };
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, [draggingCanvasPieceNpc]);

  const startPlacing = useCallback((npc: CharacterPrivateSummary) => {
    setPlacingNpcId(npc.uuid);
    setPlacingNpcData(npc);
  }, []);

  const cancelPlacing = useCallback(() => {
    setPlacingNpcId(null);
    setPlacingNpcData(null);
  }, []);

  // enableRosterDrop: false is the placer's player mode — a player dragging
  // their own piece around the canvas should not light up the roster
  // sidebar as a drop target (the roster isn't even rendered for players),
  // so isDraggingPieceToRoster stays false while draggingCanvasPieceNpc still
  // tracks the drag for the ghost.
  const startCanvasDrag = useCallback(
    (npc: CharacterPrivateSummary | undefined) => {
      if (enableRosterDrop) setIsDraggingPieceToRoster(true);
      setDraggingCanvasPieceNpc(npc ?? null);
    },
    [enableRosterDrop],
  );

  const endCanvasDrag = useCallback(() => {
    if (enableRosterDrop) setIsDraggingPieceToRoster(false);
    setDraggingCanvasPieceNpc(null);
  }, [enableRosterDrop]);

  return {
    placingNpcId,
    placingNpcData,
    isDraggingPieceToRoster,
    draggingCanvasPieceNpc,
    ghostRef,
    canvasDragGhostRef,
    startPlacing,
    cancelPlacing,
    startCanvasDrag,
    endCanvasDrag,
  };
}
