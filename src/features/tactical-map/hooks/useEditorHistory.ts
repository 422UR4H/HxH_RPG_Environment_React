import { useRef } from "react";
import { useStore } from "zustand";
import type { EditorStore } from "../store/editorStore";
import { HISTORY_LIMIT } from "../store/editorStore";
import type { TacticalMap } from "../../../types/tacticalMap";

export function useEditorHistory(store: EditorStore) {
  const temporalUndo = useStore(store.temporal, (s) => s.undo);
  const temporalRedo = useStore(store.temporal, (s) => s.redo);
  const canUndo = useStore(store.temporal, (s) => s.pastStates.length > 0);
  const canRedo = useStore(store.temporal, (s) => s.futureStates.length > 0);
  const markDirty = store((s) => s.markDirty);

  const undo = () => {
    temporalUndo();
    markDirty();
  };
  const redo = () => {
    temporalRedo();
    markDirty();
  };

  // ─── Gesture-scoped history ────────────────────────────────────────────────
  // A continuous canvas drag (move the bg image, resize/rotate handles) writes
  // to the store on every pointermove. Left to the 400ms debounce, one slow
  // drag fragments into several undo steps. Instead we pause history-tracking
  // for the whole gesture (the store still updates, so the canvas stays live)
  // and commit exactly ONE past-state — the pre-drag map — on release.
  const gestureBase = useRef<TacticalMap | null>(null);

  const beginGesture = () => {
    gestureBase.current = store.getState().map;
    store.temporal.getState().pause();
  };

  const endGesture = () => {
    const base = gestureBase.current;
    gestureBase.current = null;
    store.temporal.getState().resume();
    // No base, or nothing actually changed (e.g. a click without a drag).
    if (!base || store.getState().map === base) return;
    // Push a single undo step (pre-drag map) and invalidate redo. pastStates /
    // futureStates are part of zundo's public TemporalState; the entry shape
    // ({ map }) matches the store's partialize.
    store.temporal.setState((s) => ({
      pastStates: [...s.pastStates, { map: base }].slice(-HISTORY_LIMIT),
      futureStates: [],
    }));
  };

  return { undo, redo, canUndo, canRedo, beginGesture, endGesture };
}
