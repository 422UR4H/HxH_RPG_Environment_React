import { useEffect, useRef, useState } from "react";
import MapEditorTemplate from "../../components/templates/MapEditorTemplate";
import MapEditorToolbar from "../../components/organisms/MapEditorToolbar";
import TacticalMapStage from "../../components/organisms/TacticalMapStage";
import { useResizeObserver } from "../../hooks/useResizeObserver";
import { createEditorStore } from "./store/editorStore";
import type { EditorStore } from "./store/editorStore";
import type { TacticalMap } from "../../types/tacticalMap";

type Props = {
  campaignId: string;
  initialMap: TacticalMap;
  onSave: (map: TacticalMap) => Promise<void>;
  onSaveSuccess?: () => void;
  saveLabel?: string;
};

export default function TacticalMapEditor({
  campaignId: _campaignId,
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
      await onSave(mapToSave);
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
                  onBgPositionChange={(x, y) => setBg(bg ? { ...bg, x, y } : null)}
                />
        )}
      </div>
    </MapEditorTemplate>
  );
}
