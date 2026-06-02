import { create } from "zustand";
import { temporal } from "zundo";
import { immer } from "zustand/middleware/immer";
import type {
  BgImage,
  GridShape,
  Piece,
  SlotCoord,
  TacticalMap,
} from "../../../types/tacticalMap";

export type ToolKind = "grid" | "bg" | "pieces" | "walls" | "decorations";

export type Selection =
  | { kind: "piece"; id: string }
  | { kind: "decoration"; id: string }
  | null;

export type EditorState = {
  map: TacticalMap;
  isDirty: boolean;
  activeTool: ToolKind;
  selection: Selection;

  setGrid: (grid: GridShape) => void;
  setName: (name: string) => void;
  setDescription: (desc: string) => void;
  setBg: (bg: BgImage | null) => void;
  placePiece: (piece: Piece) => void;
  movePiece: (pieceId: string, slot: SlotCoord) => void;
  setPieceZ: (pieceId: string, z: number) => void;
  removePiece: (pieceId: string) => void;
  setActiveTool: (tool: ToolKind) => void;
  setSelection: (sel: Selection) => void;
  markClean: () => void;
};

export function createEditorStore(initialMap: TacticalMap) {
  return create<EditorState>()(
    temporal(
      immer((set) => ({
        map: initialMap,
        isDirty: false,
        activeTool: "grid",
        selection: null,

        setGrid: (grid) =>
          set((s) => {
            s.map.grid = grid;
            s.isDirty = true;
          }),
        setName: (name) =>
          set((s) => {
            s.map.name = name;
            s.isDirty = true;
          }),
        setDescription: (desc) =>
          set((s) => {
            s.map.description = desc;
            s.isDirty = true;
          }),
        setBg: (bg) =>
          set((s) => {
            s.map.bg = bg;
            s.isDirty = true;
          }),
        placePiece: (piece) =>
          set((s) => {
            s.map.pieces.push(piece);
            s.isDirty = true;
          }),
        movePiece: (pieceId, slot) =>
          set((s) => {
            const p = s.map.pieces.find((x) => x.id === pieceId);
            if (p) {
              p.coord.slot = slot;
              s.isDirty = true;
            }
          }),
        setPieceZ: (pieceId, z) =>
          set((s) => {
            const p = s.map.pieces.find((x) => x.id === pieceId);
            if (p) {
              p.coord.z = z;
              s.isDirty = true;
            }
          }),
        removePiece: (pieceId) =>
          set((s) => {
            s.map.pieces = s.map.pieces.filter((x) => x.id !== pieceId);
            s.isDirty = true;
          }),
        setActiveTool: (tool) =>
          set((s) => {
            s.activeTool = tool;
          }),
        setSelection: (sel) =>
          set((s) => {
            s.selection = sel;
          }),
        markClean: () =>
          set((s) => {
            s.isDirty = false;
          }),
      })),
      {
        partialize: (state) => ({
          map: state.map,
          activeTool: state.activeTool,
        }),
      },
    ),
  );
}

export type EditorStore = ReturnType<typeof createEditorStore>;
