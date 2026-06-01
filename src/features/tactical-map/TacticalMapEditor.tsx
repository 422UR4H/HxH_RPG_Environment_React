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
    setIsSaving(true);
    try {
      await onSave(map);
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
          <TacticalMapStage map={map} width={width} height={height} />
        )}
      </div>
    </MapEditorTemplate>
  );
}
