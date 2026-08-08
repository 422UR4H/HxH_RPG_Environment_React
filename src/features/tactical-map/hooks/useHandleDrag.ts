import { useCallback, useEffect, useRef } from "react";
import { useApplication } from "@pixi/react";
import type { Viewport } from "pixi-viewport";

type DragState<TStart> = {
  handle: string;
  // Grab point in world space, snapshotted at pointerdown.
  startWorldX: number;
  startWorldY: number;
  // Whatever the caller needs to compute from: the bg snapshot plus its
  // aspect ratio, the grid snapshot, …
  start: TStart;
  shiftKey: boolean;
} | null;

// One handle drag: registers the window listeners, converts the cursor to
// world space, and delegates the math to the caller's `compute`. Brackets the
// whole gesture with onGestureStart/onGestureEnd so it becomes ONE undo step.
export function useHandleDrag<TStart, TResult>(opts: {
  vpRef: React.MutableRefObject<Viewport | null>;
  getStart: () => TStart;
  compute: (handle: string, start: TStart, worldX: number, worldY: number, shift: boolean) => TResult | null;
  onResult: (r: TResult) => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
}): (handleId: string, shift: boolean, ex: number, ey: number) => void {
  const { vpRef, getStart, compute, onResult, onGestureStart, onGestureEnd } = opts;
  const { app } = useApplication();
  const dragState = useRef<DragState<TStart>>(null);

  // The pointermove listener outlives the render that started the gesture, so
  // reading `onResult` out of its closure would pin the drag to the callback
  // of that first render — the parent's newer onBgChange/onGridChange would
  // silently stop being called. Route it through a ref every render refreshes.
  const onResultRef = useRef(onResult);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  return useCallback((handleId: string, shift: boolean, ex: number, ey: number) => {
    const vp = vpRef.current;
    if (!vp) return;
    onGestureStart?.();
    const world = vp.toWorld(ex, ey);
    dragState.current = {
      handle: handleId,
      startWorldX: world.x,
      startWorldY: world.y,
      start: getStart(),
      shiftKey: shift,
    };
    const canvas = app?.renderer ? app.canvas : null;
    const onMove = (e: PointerEvent) => {
      const dr = dragState.current;
      const vp2 = vpRef.current;
      if (!dr || !vp2 || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const wld = vp2.toWorld(e.clientX - rect.left, e.clientY - rect.top);
      const next = compute(dr.handle, dr.start, wld.x, wld.y, dr.shiftKey);
      if (next) onResultRef.current(next);
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      onGestureEnd?.();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, [app, vpRef, getStart, compute, onGestureStart, onGestureEnd]);
}
