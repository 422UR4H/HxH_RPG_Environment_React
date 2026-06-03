import { create } from "zustand";
import { temporal } from "zundo";
import { immer } from "zustand/middleware/immer";
import { debounce } from "../../../utils/debounce";
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
  markDirty: () => void;
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
        markDirty: () =>
          set((s) => {
            s.isDirty = true;
          }),
      })),
      {
        // Rastrear apenas `map` — mudanças em activeTool/selection/isDirty
        // não criam passos de undo (são estado de UI, não de conteúdo).
        partialize: (state) => ({ map: state.map }),
        // Sem equality: zundo registraria um snapshot em todo set, mesmo que
        // `map` não tenha mudado (ex: setActiveTool). Com equality por referência
        // de `map`, snapshots só são criados quando o conteúdo do mapa muda.
        equality: (a, b) => a.map === b.map,
        // Trailing debounce de 400ms: agrupa mudanças contínuas (sliders)
        // num único snapshot. Efeito colateral: ações discretas (placePiece,
        // movePiece) entram no histórico após ~400ms. Aceito pelo spec.
        handleSet: (handleSet) => debounce(handleSet, 400),
        limit: 100,
      },
    ),
  );
}

export type EditorStore = ReturnType<typeof createEditorStore>;
