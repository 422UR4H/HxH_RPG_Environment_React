import { useMemo, useState, type ChangeEvent } from "react";
import styled from "styled-components";
import { useEditorStore, useEditorStoreRef } from "./store/EditorStoreContext";
import { useEditorHistory } from "./hooks/useEditorHistory";
import useToken from "../../hooks/useToken";
import { useCampaignDetails } from "../../hooks/useCampaignDetails";
import type { CharacterPrivateSummary } from "../../types/characterSheet";
import { fitGridAndCover } from "./utils/bgFit";
import GridConfigPanel from "../../components/molecules/GridConfigPanel";
import BgImagePanel from "../../components/molecules/BgImagePanel";
import NpcRosterPanel from "../../components/molecules/NpcRosterPanel";
import PiecePropertyPanel from "../../components/molecules/PiecePropertyPanel";
import WallTypeChips from "../../components/molecules/WallTypeChips";
import WallConfigPanel from "../../components/molecules/WallConfigPanel";
import InlineFeedback from "../../components/ions/InlineFeedback";
import { colors, fonts } from "../../styles/tokens";
import type { ToolKind } from "./store/editorStore";

// Over the ~400-line guideline (docs/superpowers/specs/2026-08-06-tactical-map-refactor-design.md
// §6): roughly the last 180 lines are styled-components definitions, not logic.

type Props = {
  // Não sourceável do store — dependem de estado de drag/upload local do editor.
  campaignId: string;
  onBgUploadingChange?: (uploading: boolean) => void;

  // Fluxo de salvamento: vive no TacticalMapEditor porque depende do onSave que a
  // página injeta (criar vs editar mapa).
  save: {
    onSave: () => void;
    isSaving: boolean;
    label: string;
    nameError?: string | null;
    error?: string | null;
    successMsg?: string | null;
    onSuccessDismiss?: () => void;
  };

  // Arraste do roster: o TacticalMapEditor é dono do useRosterDrag (Fase 3) porque
  // ele também renderiza os ghosts e alimenta o TacticalMapStage.
  roster: {
    placingNpcId: string | null;
    isDropTarget: boolean;
    onPointerDownNpc: (npc: CharacterPrivateSummary, e: React.PointerEvent) => void;
  };
};

type TabDef = {
  tool: ToolKind;
  label: string;
  enabled: boolean;
};

const TABS: TabDef[] = [
  { tool: "bg", label: "Fundo", enabled: true },
  { tool: "grid", label: "Grade", enabled: true },
  { tool: "pieces", label: "Peças", enabled: true },
  { tool: "walls", label: "Paredes", enabled: true },
  { tool: "decorations", label: "Decorações", enabled: false },
];

export default function MapEditorToolbar({
  campaignId,
  onBgUploadingChange,
  save,
  roster,
}: Props) {
  const {
    onSave,
    isSaving,
    label: saveLabel,
    nameError,
    error: saveError,
    successMsg: saveSuccessMsg,
    onSuccessDismiss: onSaveSuccessDismiss,
  } = save;
  const { placingNpcId, isDropTarget: isDraggingPieceToRoster, onPointerDownNpc } = roster;

  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const grid = useEditorStore((s) => s.map.grid);
  const setGrid = useEditorStore((s) => s.setGrid);
  const bg = useEditorStore((s) => s.map.bg);
  const setBg = useEditorStore((s) => s.setBg);
  const setBgWithGrid = useEditorStore((s) => s.setBgWithGrid);
  const mapId = useEditorStore((s) => s.map.id);
  const mapName = useEditorStore((s) => s.map.name);
  const mapDescription = useEditorStore((s) => s.map.description ?? "");
  const setName = useEditorStore((s) => s.setName);
  const setDescription = useEditorStore((s) => s.setDescription);
  const pieces = useEditorStore((s) => s.map.pieces);
  const walls = useEditorStore((s) => s.map.walls);
  const selection = useEditorStore((s) => s.selection);
  const setPieceZ = useEditorStore((s) => s.setPieceZ);
  const removePiece = useEditorStore((s) => s.removePiece);
  const updateWallSegment = useEditorStore((s) => s.updateWallSegment);
  const removeWallSegment = useEditorStore((s) => s.removeWallSegment);
  const activeWallType = useEditorStore((s) => s.activeWallType);
  const activeMaterial = useEditorStore((s) => s.activeMaterial);
  const wallsDrawMode = useEditorStore((s) => s.wallsDrawMode);
  const setActiveMaterial = useEditorStore((s) => s.setActiveMaterial);
  const enterWallsDrawMode = useEditorStore((s) => s.enterWallsDrawMode);
  const exitWallsDrawMode = useEditorStore((s) => s.exitWallsDrawMode);

  // beginGesture/endGesture (useGestureHistory) são exclusivos do TacticalMapEditor
  // (canvas); o toolbar só precisa de undo/redo/canUndo/canRedo.
  const { undo, redo, canUndo, canRedo } = useEditorHistory(useEditorStoreRef());

  const { token } = useToken();
  const { data: campaign } = useCampaignDetails(token, campaignId);
  // Map uuid → CharacterPrivateSummary for PieceSprite lookup. TacticalMapEditor
  // keeps its own copy (needed for TacticalMapStage) — React Query dedupes by
  // queryKey, so this doesn't cost an extra request.
  const npcMap = useMemo(() => {
    const m = new Map<string, CharacterPrivateSummary>();
    (campaign?.characterSheets ?? []).forEach((cs) => m.set(cs.uuid, cs));
    return m;
  }, [campaign]);

  // new Set() aloca — precisa ficar fora do seletor (ver "A armadilha do zustand").
  const placedCharacterIds = useMemo(
    () => new Set(pieces.map((p) => p.characterId)),
    [pieces],
  );

  const selectedPiece =
    selection?.kind === "piece" ? (pieces.find((p) => p.id === selection.id) ?? null) : null;
  const selectedWall =
    selection?.kind === "wall" ? (walls.find((w) => w.id === selection.id) ?? null) : null;

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  };

  // "Encaixar Grade" — shared by the Fundo and Grade tabs. Lives here because
  // the toolbar owns both panels. Uses the image's natural size (reported by
  // BgImagePanel on add) so the fit is resolution-correct and idempotent;
  // falls back to the bg's current size for reloaded maps.
  const [bgNaturalSize, setBgNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const handleRefitGrid = () => {
    if (!bg) return;
    const nw = bgNaturalSize?.w ?? bg.width;
    const nh = bgNaturalSize?.h ?? bg.height;
    const { grid: newGrid, bg: fitted } = fitGridAndCover(nw, nh, grid, bg.url, bg.r2Url);
    setBgWithGrid(fitted, newGrid);
  };

  return (
    <Toolbar>
      <TabRow>
        {TABS.map(({ tool, label, enabled }) => (
          <TabButton
            key={tool}
            type="button"
            $active={activeTool === tool}
            data-active={activeTool === tool}
            disabled={!enabled}
            onClick={() => enabled && setActiveTool(tool)}
          >
            {label}
          </TabButton>
        ))}
      </TabRow>

      <HistoryRow>
        <HistoryButton
          type="button"
          disabled={!canUndo}
          onClick={undo}
          aria-label="Desfazer"
          title="Desfazer (Ctrl+Z)"
        >
          ↺ Desfazer
        </HistoryButton>
        <HistoryButton
          type="button"
          disabled={!canRedo}
          onClick={redo}
          aria-label="Refazer"
          title="Refazer (Shift+Ctrl+Z)"
        >
          ↻ Refazer
        </HistoryButton>
      </HistoryRow>

      <PanelArea>
        {activeTool === "grid" && (
          <GridConfigPanel
            grid={grid}
            onChange={setGrid}
            onRefit={handleRefitGrid}
            canRefit={!!bg}
          />
        )}
        {activeTool === "bg" && (
          <BgImagePanel
            bg={bg}
            grid={grid}
            mapId={mapId}
            onBgChange={setBg}
            onGridChange={setGrid}
            onApplyBg={setBgWithGrid}
            onUploadingChange={onBgUploadingChange}
            onRefit={handleRefitGrid}
            onNaturalSizeChange={setBgNaturalSize}
          />
        )}
        {activeTool === "pieces" && (
          <PiecesPanel>
            {selectedPiece && npcMap.get(selectedPiece.characterId) && (
              <PiecePropertyPanel
                piece={selectedPiece}
                npc={npcMap.get(selectedPiece.characterId)!}
                onZChange={(z) => setPieceZ(selectedPiece.id, z)}
                onRemove={() => removePiece(selectedPiece.id)}
              />
            )}
            <NpcRosterPanel
              campaignId={campaignId}
              placedCharacterIds={placedCharacterIds}
              placingNpcId={placingNpcId}
              isDropTarget={isDraggingPieceToRoster}
              onPointerDownNpc={onPointerDownNpc}
            />
          </PiecesPanel>
        )}
        {activeTool === "walls" && (
          <>
            <WallTypeChips
              activeType={wallsDrawMode === "draw" ? activeWallType : null}
              activeMaterial={activeMaterial}
              drawMode={wallsDrawMode === "draw"}
              onTypeChange={(t) => {
                if (t === null) exitWallsDrawMode();
                else enterWallsDrawMode(t);
              }}
              onMaterialChange={setActiveMaterial}
            />
            {wallsDrawMode === "browse" && selectedWall && (
              <WallConfigPanel
                wall={selectedWall}
                onUpdate={(patch) => updateWallSegment(selectedWall.id, patch)}
                onRemove={() => removeWallSegment(selectedWall.id)}
              />
            )}
          </>
        )}
      </PanelArea>

      <MetaSection>
        <FieldGroup>
          <NameInput
            type="text"
            placeholder="Nome do mapa"
            value={mapName}
            onChange={handleNameChange}
          />
          {nameError && <ErrorText>{nameError}</ErrorText>}
        </FieldGroup>

        <DescriptionTextarea
          placeholder="Descrição (opcional)"
          value={mapDescription}
          onChange={handleDescriptionChange}
          rows={3}
        />
      </MetaSection>

      <SaveArea>
        {saveError && <ErrorText>{saveError}</ErrorText>}
        {saveSuccessMsg && (
          <InlineFeedback
            message={saveSuccessMsg}
            variant="success"
            autoDismissMs={3000}
            onDismiss={onSaveSuccessDismiss}
          />
        )}
        <SaveButton
          type="button"
          disabled={isSaving}
          onClick={onSave}
        >
          {isSaving ? "Salvando..." : saveLabel}
        </SaveButton>
      </SaveArea>
    </Toolbar>
  );
}

const Toolbar = styled.div`
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  background: ${colors.surfaceSidebar};
  font-family: ${fonts.sans};
  min-width: 240px;
  height: 100%;
  overflow: hidden;
`;

const TabRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid ${colors.borderInput};
`;

const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  min-width: 0;
  padding: clamp(4px, 1.5cqi, 6px) clamp(2px, 1cqi, 8px);
  height: max(40px, 8cqi);
  border-radius: 6px;
  border: 1px solid
    ${({ $active }) => ($active ? colors.brandAccent : colors.borderInput)};
  background: ${({ $active }) =>
    $active ? colors.brandAccent : "transparent"};
  color: ${({ disabled }) =>
    disabled ? colors.textPlaceholderStrong : colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: clamp(10px, 2.8cqi, 12px);
  font-weight: 600;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  transition: background 0.15s;

  &:not(:disabled):hover {
    filter: brightness(1.1);
  }
`;

const PanelArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;

const PiecesPanel = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

const MetaSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 2cqi, 8px);
  padding: clamp(8px, 3cqi, 12px);
  border-top: 1px solid ${colors.borderInput};
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const NameInput = styled.input`
  font-family: ${fonts.sans};
  font-size: clamp(12px, 3.5cqi, 14px);
  color: ${colors.textPrimary};
  background: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  padding: clamp(6px, 2cqi, 8px) clamp(8px, 3cqi, 12px);
  outline: none;
  width: 100%;

  &::placeholder {
    color: ${colors.textPlaceholder};
  }

  &:focus {
    border-color: ${colors.brandAccentBright};
  }
`;

const DescriptionTextarea = styled.textarea`
  font-family: ${fonts.sans};
  font-size: 13px;
  color: ${colors.textPrimary};
  background: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  padding: 8px 12px;
  resize: vertical;
  outline: none;

  @media (max-width: 749px) {
    display: none;
  }

  &::placeholder {
    color: ${colors.textPlaceholder};
  }

  &:focus {
    border-color: ${colors.brandAccentBright};
  }
`;

const SaveArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 1.5cqi, 6px);
  padding: clamp(8px, 3cqi, 12px);
  border-top: 1px solid ${colors.borderInput};
`;

const SaveButton = styled.button`
  width: 100%;
  height: max(44px, 9cqi);
  border-radius: 6px;
  border: none;
  background: ${colors.brandAccent};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: clamp(12px, 3.5cqi, 14px);
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.15s;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    filter: brightness(1.1);
  }
`;

const ErrorText = styled.span`
  font-family: ${fonts.sans};
  font-size: 12px;
  color: ${colors.danger};
`;

const HistoryRow = styled.div`
  display: flex;
  gap: 4px;
  padding: 4px 8px;
  border-bottom: 1px solid ${colors.borderInput};
`;

const HistoryButton = styled.button`
  flex: 1;
  height: max(36px, 7cqi);
  border-radius: 5px;
  border: 1px solid ${colors.borderInput};
  background: transparent;
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: clamp(10px, 2.8cqi, 12px);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    background: ${colors.surfaceInput};
  }
`;
