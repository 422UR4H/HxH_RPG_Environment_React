import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import avatarPlaceholderUrl from "../../assets/placeholder/avatar.png";
import MapEditorTemplate from "../../components/templates/MapEditorTemplate";
import MapEditorToolbar from "../../components/organisms/MapEditorToolbar";
import TacticalMapStage from "../../components/organisms/TacticalMapStage";
import { useResizeObserver } from "../../hooks/useResizeObserver";
import { createEditorStore } from "./store/editorStore";
import type { EditorStore } from "./store/editorStore";
import type { TacticalMap, SlotCoord } from "../../types/tacticalMap";
import useToken from "../../hooks/useToken";
import { useCampaignDetails } from "../../hooks/useCampaignDetails";
import type { CharacterPrivateSummary } from "../../types/characterSheet";
import { useEditorHistory } from "./hooks/useEditorHistory";
import { isSlotInBounds } from "./utils/coords";

type Props = {
  campaignId: string;
  initialMap: TacticalMap;
  onSave: (map: TacticalMap) => Promise<void>;
  onSaveSuccess?: () => void;
  saveLabel?: string;
};

export default function TacticalMapEditor({
  campaignId,
  initialMap,
  onSave,
  onSaveSuccess,
  saveLabel = "Salvar",
}: Props) {
  const storeRef = useRef<EditorStore | null>(null);
  if (!storeRef.current) storeRef.current = createEditorStore(initialMap);
  const store = storeRef.current;

  const map = store((s) => s.map);
  const isDirty = store((s) => s.isDirty);
  const activeTool = store((s) => s.activeTool);
  const setGrid = store((s) => s.setGrid);
  const setName = store((s) => s.setName);
  const setDescription = store((s) => s.setDescription);
  const bg = store((s) => s.map.bg);
  const setBg = store((s) => s.setBg);
  const setActiveTool = store((s) => s.setActiveTool);
  const markClean = store((s) => s.markClean);
  const pieces = store((s) => s.map.pieces);
  const selection = store((s) => s.selection);
  const placePiece = store((s) => s.placePiece);
  const movePiece = store((s) => s.movePiece);
  const setPieceZ = store((s) => s.setPieceZ);
  const removePiece = store((s) => s.removePiece);
  const setSelection = store((s) => s.setSelection);

  const { undo, redo, canUndo, canRedo } = useEditorHistory(store);

  const { token } = useToken();
  const { data: campaign } = useCampaignDetails(token, campaignId);

  // UI-only state — not persisted in store
  const [placingNpcId, setPlacingNpcId] = useState<string | null>(null);
  const [placingNpcData, setPlacingNpcData] = useState<CharacterPrivateSummary | null>(null);
  const [isDraggingPieceToRoster, setIsDraggingPieceToRoster] = useState(false);

  const ghostRef = useRef<HTMLDivElement>(null);

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

  // Set of character IDs already on the map
  const placedCharacterIds = useMemo(
    () => new Set(pieces.map((p) => p.characterId)),
    [pieces],
  );

  // Map uuid → CharacterPrivateSummary for PieceSprite lookup
  const npcMap = useMemo(() => {
    const m = new Map<string, CharacterPrivateSummary>();
    (campaign?.characterSheets ?? []).forEach((cs) => m.set(cs.uuid, cs));
    return m;
  }, [campaign]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const { width, height } = useResizeObserver(canvasRef);

  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Protect unsaved changes on tab close
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Persist draft to localStorage
  useEffect(() => {
    if (!isDirty) return;
    const key = map.id
      ? `tactical-map-draft:${map.id}`
      : "tactical-map-draft:new";
    localStorage.setItem(key, JSON.stringify(map));
  }, [map, isDirty]);

  // Keyboard shortcuts: undo/redo, arrow keys for selected piece, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Ignorar quando o foco está num campo de texto — deixar o undo nativo agir
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) return;

      const mod = e.metaKey || e.ctrlKey;

      // Undo: Ctrl/Cmd+Z
      if (mod && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      // Redo: Shift+Ctrl/Cmd+Z ou Ctrl/Cmd+Y
      if ((mod && e.shiftKey && e.key.toLowerCase() === "z") || (mod && e.key.toLowerCase() === "y")) {
        e.preventDefault();
        redo();
        return;
      }

      // Teclas de peça — lê o estado atual via getState() para evitar re-registrar
      const currentSelection = store.getState().selection;
      if (!currentSelection || currentSelection.kind !== "piece") return;

      if (e.key === "Escape") {
        store.getState().setSelection(null);
        return;
      }

      const piece = store.getState().map.pieces.find((p) => p.id === currentSelection.id);
      if (!piece || piece.coord.slot.kind !== "square") return;

      const grid = store.getState().map.grid;
      if (grid.kind !== "square") return; // setas só para grade quadrada (hex = best-effort futuro)

      const { col, row } = piece.coord.slot;
      let newCol = col;
      let newRow = row;

      if (e.key === "ArrowLeft")  newCol = col - 1;
      else if (e.key === "ArrowRight") newCol = col + 1;
      else if (e.key === "ArrowUp")    newRow = row - 1;
      else if (e.key === "ArrowDown")  newRow = row + 1;
      else return;

      e.preventDefault();

      const newSlot = { kind: "square" as const, col: newCol, row: newRow };
      if (!isSlotInBounds(newSlot, grid)) return;

      const occupied = store.getState().map.pieces.some(
        (p) =>
          p.id !== currentSelection.id &&
          p.coord.slot.kind === "square" &&
          p.coord.slot.col === newCol &&
          p.coord.slot.row === newRow,
      );
      if (!occupied) store.getState().movePiece(currentSelection.id, newSlot);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, store]);

  const handleNpcPointerDown = (npc: CharacterPrivateSummary, _e: React.PointerEvent) => {
    setPlacingNpcId(npc.uuid);
    setPlacingNpcData(npc);
  };

  // Always reset placing state — called by TacticalMapStage on any failed
  // placement (outside canvas, pointercancel, occupied slot).
  const handleNpcPlacementCancel = useCallback(() => {
    setPlacingNpcId(null);
    setPlacingNpcData(null);
  }, []);

  const handleNpcPlaced = (slot: SlotCoord) => {
    if (!placingNpcData) {
      setPlacingNpcId(null);
      return;
    }
    const occupied = pieces.some(
      (p) => JSON.stringify(p.coord.slot) === JSON.stringify(slot),
    );
    if (occupied) {
      // Slot taken — cancel silently so the user can try another slot
      setPlacingNpcId(null);
      setPlacingNpcData(null);
      return;
    }
    placePiece({
      id: crypto.randomUUID(),
      characterId: placingNpcData.uuid,
      coord: { slot, z: 0 },
      visible: true,
    });
    setPlacingNpcId(null);
    setPlacingNpcData(null);
  };

  // Stable callback: prevents PiecesLayer's useEffect from re-running on every
  // TacticalMapEditor render (which would tear down and re-register all stage
  // event listeners mid-interaction).
  const handlePieceSelect = useCallback(
    (id: string) => setSelection({ kind: "piece", id }),
    [setSelection],
  );

  const handlePieceDragToRoster = (pieceId: string) => {
    removePiece(pieceId);
    if (selection?.kind === "piece" && selection.id === pieceId) {
      setSelection(null);
    }
  };

  const handleStageDeselect = () => setSelection(null);

  const handleSave = async () => {
    if (!map.name.trim()) {
      setNameError("O nome do mapa é obrigatório.");
      return;
    }
    setNameError(null);
    setSaveError(null);

    // Truncation check
    let mapToSave = map;
    if (map.bg) {
      const gridW = map.grid.cols * map.grid.cellSize;
      const gridH = map.grid.rows * map.grid.cellSize;
      const bgRight = map.bg.x + map.bg.width;
      const bgBottom = map.bg.y + map.bg.height;
      const uncoveredCols = bgRight < gridW
        ? Math.floor((gridW - bgRight) / map.grid.cellSize)
        : 0;
      const uncoveredRows = bgBottom < gridH
        ? Math.floor((gridH - bgBottom) / map.grid.cellSize)
        : 0;
      const uncoveredLeftCols = map.bg.x > 0
        ? Math.floor(map.bg.x / map.grid.cellSize)
        : 0;
      const uncoveredTopRows = map.bg.y > 0
        ? Math.floor(map.bg.y / map.grid.cellSize)
        : 0;

      const totalUncoveredCols = uncoveredLeftCols + uncoveredCols;
      const totalUncoveredRows = uncoveredTopRows + uncoveredRows;

      if (totalUncoveredCols > 0 || totalUncoveredRows > 0) {
        const parts: string[] = [];
        if (totalUncoveredCols > 0) parts.push(`${totalUncoveredCols} coluna${totalUncoveredCols > 1 ? "s" : ""}`);
        if (totalUncoveredRows > 0) parts.push(`${totalUncoveredRows} linha${totalUncoveredRows > 1 ? "s" : ""}`);
        const msg = `${parts.join(" e ")} não cobertas pela imagem. Deseja continuar e remover as colunas/linhas descobertas à direita/baixo?`;
        if (!window.confirm(msg)) return;

        mapToSave = {
          ...map,
          grid: {
            ...map.grid,
            cols: map.grid.cols - uncoveredCols,   // only trim right side
            rows: map.grid.rows - uncoveredRows,   // only trim bottom side
          },
        };
      }
    }

    setIsSaving(true);
    try {
      // bg.url may be a blob: URL (same-origin display workaround when R2 has
      // no CORS headers). Replace with the R2 URL for persistence. r2Url is
      // absent on the URL-input path, in which case url is already the final URL.
      const finalMap = mapToSave.bg?.r2Url
        ? { ...mapToSave, bg: { ...mapToSave.bg, url: mapToSave.bg.r2Url, r2Url: undefined } }
        : mapToSave;
      await onSave(finalMap);
      markClean();
      onSaveSuccess?.();
    } catch {
      setSaveError(
        "Não foi possível salvar. Suas alterações estão protegidas localmente.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <MapEditorTemplate
      sidebar={
        <MapEditorToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          grid={map.grid}
          onGridChange={setGrid}
          bg={map.bg}
          onBgChange={setBg}
          mapId={map.id}
          mapName={map.name}
          mapDescription={map.description ?? ""}
          onNameChange={setName}
          onDescriptionChange={setDescription}
          onSave={handleSave}
          isSaving={isSaving}
          saveLabel={saveLabel}
          nameError={nameError}
          saveError={saveError}
          campaignId={campaignId}
          placedCharacterIds={placedCharacterIds}
          placingNpcId={placingNpcId}
          isDraggingPieceToRoster={isDraggingPieceToRoster}
          selectedPiece={
            selection?.kind === "piece"
              ? (pieces.find((p) => p.id === selection.id) ?? null)
              : null
          }
          npcMap={npcMap}
          onPointerDownNpc={handleNpcPointerDown}
          onZChange={setPieceZ}
          onRemovePiece={(id: string) => { removePiece(id); setSelection(null); }}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      }
    >
      <div ref={canvasRef} style={{ width: "100%", height: "100%" }}>
        {width > 0 && height > 0 && (
          <TacticalMapStage
            map={map}
            width={width}
            height={height}
            bgInteractive={activeTool === "bg"}
            piecesInteractive={activeTool === "pieces"}
            selection={selection}
            npcMap={npcMap}
            placingNpcId={placingNpcId}
            onNpcPlaced={handleNpcPlaced}
            onNpcPlacementCancel={handleNpcPlacementCancel}
            onBgPositionChange={(x, y) => setBg(bg ? { ...bg, x, y } : null)}
            onPieceSelect={handlePieceSelect}
            onPieceMove={movePiece}
            onPieceDragToRoster={handlePieceDragToRoster}
            onPieceDragStart={() => setIsDraggingPieceToRoster(true)}
            onPieceDragEnd={() => setIsDraggingPieceToRoster(false)}
            onStageDeselect={handleStageDeselect}
          />
        )}
      </div>
    </MapEditorTemplate>
    {placingNpcId && placingNpcData && createPortal(
      <div
        ref={ghostRef}
        style={{
          position: "fixed",
          pointerEvents: "none",
          zIndex: 9999,
          transform: "translate(-50%, -50%)",
          width: 48,
          height: 48,
          borderRadius: "50%",
          overflow: "hidden",
          border: "2px solid #7c4dff",
          opacity: 0.9,
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        }}
      >
        <img
          src={placingNpcData.avatarUrl ?? avatarPlaceholderUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          alt=""
        />
      </div>,
      document.body,
    )}
    </>
  );
}
