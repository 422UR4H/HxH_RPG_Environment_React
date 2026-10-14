import { create } from "zustand";
import { temporal } from "zundo";
import type { TemporalState } from "zundo";
import type { StoreApi } from "zustand";
import { immer } from "zustand/middleware/immer";
import { scaleWallsToGrid } from "../utils/walls";
import { debounceBurst } from "../../../utils/debounce";
import type {
  BgImage,
  GridShape,
  Piece,
  SlotCoord,
  TacticalMap,
  WallMaterial,
  WallSegment,
  WallType,
} from "../../../types/tacticalMap";
import { resolveOverlaps } from "../utils/walls";

export type ToolKind = "grid" | "bg" | "pieces" | "walls" | "decorations";

// Max number of undo steps retained by the temporal (zundo) history. Shared
// with useEditorHistory's gesture commit so the two never drift.
export const HISTORY_LIMIT = 100;

export type Selection =
  | { kind: "piece"; id: string }
  | { kind: "decoration"; id: string }
  | { kind: "wall"; id: string }
  | null;

export type EditorState = {
  map: TacticalMap;
  isDirty: boolean;
  activeTool: ToolKind;
  selection: Selection;
  activeWallType: WallType;
  activeMaterial: WallMaterial;
  wallsDrawMode: "browse" | "draw";

  setGrid: (grid: GridShape) => void;
  setName: (name: string) => void;
  setDescription: (desc: string) => void;
  setBg: (bg: BgImage | null) => void;
  setBgWithGrid: (bg: BgImage | null, grid: GridShape) => void;
  placePiece: (piece: Piece) => void;
  movePiece: (pieceId: string, slot: SlotCoord) => void;
  setPieceZ: (pieceId: string, z: number) => void;
  removePiece: (pieceId: string) => void;
  mergeWalls: (segments: WallSegment[]) => void;
  updateWallSegment: (id: string, patch: Partial<WallSegment>) => void;
  removeWallSegment: (id: string) => void;
  setActiveTool: (tool: ToolKind) => void;
  setSelection: (sel: Selection) => void;
  markClean: () => void;
  markDirty: () => void;
  setActiveMaterial: (m: WallMaterial) => void;
  enterWallsDrawMode: (t: WallType) => void;
  exitWallsDrawMode: () => void;
};

export function createEditorStore(initialMap: TacticalMap) {
  // Preenchido pelo handleSet do temporal; descarrega a rajada pendente.
  let flushHistory: () => void = () => {};
  // Reativo p/ a toolbar: rajada pendente habilita Desfazer (ligado abaixo).
  let setPending: (pending: boolean) => void = () => {};
  const store = create<EditorState>()(
    temporal(
      immer((set) => ({
        map: initialMap,
        isDirty: false,
        activeTool: "grid",
        selection: null,
        activeWallType: "wall",
        activeMaterial: "stone",
        wallsDrawMode: "browse",

        setGrid: (grid) =>
          set((s) => {
            s.map.walls = scaleWallsToGrid(s.map.walls, s.map.grid, grid);
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
        // Atomic bg+grid update: adding an image resizes the grid AND sets the
        // image together. Doing it in one set keeps "add image" as a single,
        // fully-reversible undo step (two separate sets would be merged by the
        // history debounce into a broken intermediate snapshot).
        setBgWithGrid: (bg, grid) =>
          set((s) => {
            s.map.bg = bg;
            s.map.walls = scaleWallsToGrid(s.map.walls, s.map.grid, grid);
            s.map.grid = grid;
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
            // A seleção não pode sobreviver ao alvo: um painel de propriedades
            // apontando para uma peça removida renderiza com dados fantasma.
            if (s.selection?.kind === "piece" && s.selection.id === pieceId) s.selection = null;
            s.isDirty = true;
          }),
        mergeWalls: (segments) =>
          set((s) => {
            const { toAdd, toRemove } = resolveOverlaps(segments, s.map.walls);
            s.map.walls = s.map.walls.filter((w) => !toRemove.has(w.id));
            s.map.walls.push(...toAdd);
            s.isDirty = true;
          }),
        updateWallSegment: (id, patch) =>
          set((s) => {
            const w = s.map.walls.find((x) => x.id === id);
            if (w) { Object.assign(w, patch); s.isDirty = true; }
          }),
        removeWallSegment: (id) =>
          set((s) => {
            s.map.walls = s.map.walls.filter((x) => x.id !== id);
            // Mesma regra de removePiece: seleção não sobrevive ao alvo removido.
            if (s.selection?.kind === "wall" && s.selection.id === id) s.selection = null;
            s.isDirty = true;
          }),
        setActiveTool: (tool) =>
          set((s) => {
            s.activeTool = tool;
            // Sair da aba de paredes sempre volta para browse: continuar em "draw" numa
            // outra aba deixaria o desenho armado invisível, e o próximo clique no
            // canvas criaria parede sem o usuário pedir.
            if (tool !== "walls") s.wallsDrawMode = "browse";
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
        setActiveMaterial: (m) =>
          set((s) => {
            s.activeMaterial = m;
          }),
        enterWallsDrawMode: (t) =>
          set((s) => {
            s.activeWallType = t;
            s.wallsDrawMode = "draw";
          }),
        exitWallsDrawMode: () =>
          set((s) => {
            s.wallsDrawMode = "browse";
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
        // Debounce de 400ms: agrupa mudanças contínuas (sliders, digitação)
        // num único passo, cujo pastState é o de ANTES da rajada inteira.
        // Efeito colateral: ações discretas entram no histórico após ~400ms;
        // undo/redo/pause descarregam a rajada pendente (ver abaixo).
        handleSet: (handleSet) => {
          const burst = debounceBurst(handleSet, 400, (p) => setPending(p));
          flushHistory = burst.flush;
          return burst;
        },
        limit: HISTORY_LIMIT,
      },
    ),
  );
  // Rajada pendente vira passo ANTES de desfazer/refazer/pausar; senão o passo
  // chegaria depois e bagunçaria a pilha (ou se misturaria ao gesto).
  setPending = (pending) =>
    (store.temporal as StoreApi<EditorTemporalState>).setState({ hasPendingHistory: pending });
  const { undo, redo, pause } = store.temporal.getState();
  store.temporal.setState({
    undo: (...a) => {
      flushHistory();
      undo(...a);
    },
    redo: (...a) => {
      flushHistory();
      redo(...a);
    },
    pause: () => {
      flushHistory();
      pause();
    },
  });
  return store;
}

// TemporalState do zundo + a flag de rajada pendente que este store acrescenta; tipar a flag
// faz uma chave errada falhar no tsc em vez de passar por cast.
export type EditorTemporalState = TemporalState<{ map: TacticalMap }> & { hasPendingHistory?: boolean };

export type EditorStore = ReturnType<typeof createEditorStore>;
