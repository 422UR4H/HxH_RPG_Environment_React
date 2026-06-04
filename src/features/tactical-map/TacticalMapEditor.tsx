import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useNavGuard } from "../../contexts/NavGuardContext";
import { createPortal } from "react-dom";
import avatarPlaceholderUrl from "../../assets/placeholder/avatar.png";
import gungiFrameUrl from "../../assets/icons/gungi.svg";
import MapEditorTemplate from "../../components/templates/MapEditorTemplate";
import MapEditorToolbar from "../../components/organisms/MapEditorToolbar";
import TacticalMapStage from "../../components/organisms/TacticalMapStage";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";
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
  const setBgWithGrid = store((s) => s.setBgWithGrid);
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

  const { registerGuard } = useNavGuard();
  const [navConfirmPending, setNavConfirmPending] = useState<
    ((confirmed: boolean) => void) | null
  >(null);

  const { token } = useToken();
  const { data: campaign } = useCampaignDetails(token, campaignId);

  // UI-only state — not persisted in store
  const [truncConfirmMsg, setTruncConfirmMsg] = useState<string | null>(null);
  const truncConfirmResolveRef = useRef<((ok: boolean) => void) | null>(null);

  // Cleanup truncConfirmResolveRef on unmount to prevent calling dangling resolver
  useEffect(() => {
    return () => {
      truncConfirmResolveRef.current = null;
    };
  }, []);

  // Cleanup navConfirmPending on unmount to prevent orphaned pending resolver
  useEffect(() => {
    return () => {
      if (navConfirmPending) navConfirmPending(false);
    };
  }, [navConfirmPending]);

  const [placingNpcId, setPlacingNpcId] = useState<string | null>(null);
  const [placingNpcData, setPlacingNpcData] = useState<CharacterPrivateSummary | null>(null);
  const [isDraggingPieceToRoster, setIsDraggingPieceToRoster] = useState(false);
  const [draggingCanvasPieceNpc, setDraggingCanvasPieceNpc] = useState<CharacterPrivateSummary | null>(null);
  // True while BgImagePanel is compressing + uploading a fresh image to R2.
  // Drives the canvas overlay during the upload phase (before bg.url changes).
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  // Current canvas zoom — used to size the drag ghost to match the on-screen
  // token (which scales with zoom in the Pixi viewport).
  const [viewportScale, setViewportScale] = useState(1);

  const ghostRef = useRef<HTMLDivElement>(null);
  const canvasDragGhostRef = useRef<HTMLDivElement>(null);

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
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const handleSaveSuccessDismiss = useCallback(() => setSaveSuccess(null), []);

  // Protect unsaved changes on tab close
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Register nav guard when there are unsaved changes
  useEffect(() => {
    if (!isDirty) {
      registerGuard(null);
      return;
    }
    const guardFn = () =>
      new Promise<boolean>((resolve) => {
        setNavConfirmPending(() => resolve);
      });
    registerGuard(guardFn);
    return () => registerGuard(null);
  }, [isDirty, registerGuard]);

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

  const askTruncConfirm = (msg: string): Promise<boolean> =>
    new Promise<boolean>((resolve) => {
      truncConfirmResolveRef.current = resolve;
      setTruncConfirmMsg(msg);
    });

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
        const ok = await askTruncConfirm(msg);
        if (!ok) return;

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
      setSaveSuccess("Mapa salvo!");
      onSaveSuccess?.();
    } catch {
      setSaveError(
        "Não foi possível salvar. Suas alterações estão protegidas localmente.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // On-screen token diameter = world token size (cellSize * 0.9) × current zoom.
  // Clamped so the ghost stays grabbable when zoomed far out.
  const dragGhostSize = Math.max(44, map.grid.cellSize * 0.9 * viewportScale);

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
          onApplyBg={setBgWithGrid}
          onBgUploadingChange={setIsUploadingBg}
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
          saveSuccessMsg={saveSuccess}
          onSaveSuccessDismiss={handleSaveSuccessDismiss}
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
            uploading={isUploadingBg}
            onViewportScaleChange={setViewportScale}
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
            onPieceDragStart={(_pieceId, npc) => {
              setIsDraggingPieceToRoster(true);
              setDraggingCanvasPieceNpc(npc ?? null);
            }}
            onPieceDragEnd={() => {
              setIsDraggingPieceToRoster(false);
              setDraggingCanvasPieceNpc(null);
            }}
            onStageDeselect={handleStageDeselect}
          />
        )}
      </div>
    </MapEditorTemplate>
    {truncConfirmMsg && (
      <ConfirmDialog
        message={truncConfirmMsg}
        confirmLabel="Remover e salvar"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        onConfirm={() => {
          truncConfirmResolveRef.current?.(true);
          truncConfirmResolveRef.current = null;
          setTruncConfirmMsg(null);
        }}
        onCancel={() => {
          truncConfirmResolveRef.current?.(false);
          truncConfirmResolveRef.current = null;
          setTruncConfirmMsg(null);
        }}
      />
    )}
    {navConfirmPending && (
      <ConfirmDialog
        message="Você tem alterações não salvas. Deseja sair mesmo assim?"
        confirmLabel="Sair sem salvar"
        cancelLabel="Continuar editando"
        confirmVariant="danger"
        onConfirm={() => {
          navConfirmPending(true);
          setNavConfirmPending(null);
        }}
        onCancel={() => {
          navConfirmPending(false);
          setNavConfirmPending(null);
        }}
      />
    )}
    {placingNpcId && placingNpcData && createPortal(
      <div ref={ghostRef} style={ghostStyle(dragGhostSize)}>
        <PieceDragGhost avatarUrl={placingNpcData.avatarUrl} />
      </div>,
      document.body,
    )}
    {draggingCanvasPieceNpc && createPortal(
      <div ref={canvasDragGhostRef} style={ghostStyle(dragGhostSize)}>
        <PieceDragGhost avatarUrl={draggingCanvasPieceNpc.avatarUrl} />
      </div>,
      document.body,
    )}
    </>
  );
}

// size = on-screen token diameter (px). The ghost is lifted to 1.2× so it
// reads as "picked up" — slightly larger than the token resting on the board —
// with a large, diffuse shadow offset below for depth (mirrors the old Pixi
// lift). Shadow blur/offset scale with size so it stays proportional at any zoom.
function ghostStyle(size: number): CSSProperties {
  return {
    position: "fixed",
    pointerEvents: "none",
    zIndex: 9999,
    transform: "translate(-50%, -50%) scale(1.2)",
    width: size,
    height: size,
    filter: `drop-shadow(0 ${Math.round(size * 0.22)}px ${Math.round(size * 0.36)}px rgba(0,0,0,0.55))`,
  };
}

// Floating cursor-follower shown during any piece drag (roster→canvas and
// canvas→roster). Mirrors the Pixi token layering: gungi frame as the base,
// avatar as a 70%-size circle centered on top (matching avatarRadius/tokenRadius
// in PieceSprite). Single visual for the whole drag — no second icon.
function PieceDragGhost({ avatarUrl }: { avatarUrl: string | null | undefined }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <img
        src={gungiFrameUrl}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        alt=""
      />
      <img
        src={avatarUrl ?? avatarPlaceholderUrl}
        style={{
          position: "absolute",
          top: "15%",
          left: "15%",
          width: "70%",
          height: "70%",
          objectFit: "cover",
          borderRadius: "50%",
        }}
        alt=""
      />
    </div>
  );
}
