import { useStore } from "zustand";
import type { EditorStore } from "../store/editorStore";

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

  return { undo, redo, canUndo, canRedo };
}
