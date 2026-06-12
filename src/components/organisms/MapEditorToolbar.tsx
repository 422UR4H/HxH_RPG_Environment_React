import { useState, type ChangeEvent } from "react";
import styled from "styled-components";
import type { ToolKind } from "../../features/tactical-map/store/editorStore";
import type { BgImage, GridShape, Piece, WallSegment, WallType, WallMaterial } from "../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../types/characterSheet";
import { fitGridAndCover } from "../../features/tactical-map/utils/bgFit";
import GridConfigPanel from "../molecules/GridConfigPanel";
import BgImagePanel from "../molecules/BgImagePanel";
import NpcRosterPanel from "../molecules/NpcRosterPanel";
import PiecePropertyPanel from "../molecules/PiecePropertyPanel";
import WallTypeChips from "../molecules/WallTypeChips";
import WallConfigPanel from "../molecules/WallConfigPanel";
import InlineFeedback from "../ions/InlineFeedback";
import { colors, fonts } from "../../styles/tokens";

type Props = {
  activeTool: ToolKind;
  onToolChange: (tool: ToolKind) => void;
  grid: GridShape;
  onGridChange: (grid: GridShape) => void;
  bg: BgImage;
  onBgChange: (bg: BgImage | null) => void;
  onApplyBg?: (bg: BgImage | null, grid: GridShape) => void;
  onBgUploadingChange?: (uploading: boolean) => void;
  mapId: string;
  mapName: string;
  mapDescription: string;
  onNameChange: (name: string) => void;
  onDescriptionChange: (desc: string) => void;
  onSave: () => void;
  isSaving: boolean;
  saveLabel: string;
  nameError?: string | null;
  saveError?: string | null;
  saveSuccessMsg?: string | null;
  onSaveSuccessDismiss?: () => void;
  // Fase 4 — pieces
  campaignId: string;
  placedCharacterIds: Set<string>;
  placingNpcId: string | null;
  isDraggingPieceToRoster: boolean;
  selectedPiece: Piece | null;
  npcMap: Map<string, CharacterPrivateSummary>;
  onPointerDownNpc: (npc: CharacterPrivateSummary, e: React.PointerEvent) => void;
  onZChange: (pieceId: string, z: number) => void;
  onRemovePiece: (pieceId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Fase 10 — walls
  activeWallType: WallType;
  activeMaterial: WallMaterial;
  wallsDrawMode: "browse" | "draw";
  onEnterWallsDrawMode: (t: WallType) => void;
  onExitWallsDrawMode: () => void;
  onMaterialChange: (m: WallMaterial) => void;
  selectedWall: WallSegment | null;
  onWallUpdate: (id: string, patch: Partial<WallSegment>) => void;
  onRemoveWall: (id: string) => void;
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
  activeTool,
  onToolChange,
  grid,
  onGridChange,
  bg,
  onBgChange,
  onApplyBg,
  onBgUploadingChange,
  mapId,
  mapName,
  mapDescription,
  onNameChange,
  onDescriptionChange,
  onSave,
  isSaving,
  saveLabel,
  nameError,
  saveError,
  saveSuccessMsg,
  onSaveSuccessDismiss,
  // Fase 4 — pieces
  campaignId,
  placedCharacterIds,
  placingNpcId,
  isDraggingPieceToRoster,
  selectedPiece,
  npcMap,
  onPointerDownNpc,
  onZChange,
  onRemovePiece,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  // Fase 10 — walls
  activeWallType,
  activeMaterial,
  wallsDrawMode,
  onEnterWallsDrawMode,
  onExitWallsDrawMode,
  onMaterialChange,
  selectedWall,
  onWallUpdate,
  onRemoveWall,
}: Props) {
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    onNameChange(e.target.value);
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onDescriptionChange(e.target.value);
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
    if (onApplyBg) onApplyBg(fitted, newGrid);
    else {
      onGridChange(newGrid);
      onBgChange(fitted);
    }
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
            onClick={() => enabled && onToolChange(tool)}
          >
            {label}
          </TabButton>
        ))}
      </TabRow>

      <HistoryRow>
        <HistoryButton
          type="button"
          disabled={!canUndo}
          onClick={onUndo}
          aria-label="Desfazer"
          title="Desfazer (Ctrl+Z)"
        >
          ↺ Desfazer
        </HistoryButton>
        <HistoryButton
          type="button"
          disabled={!canRedo}
          onClick={onRedo}
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
            onChange={onGridChange}
            onRefit={handleRefitGrid}
            canRefit={!!bg}
          />
        )}
        {activeTool === "bg" && (
          <BgImagePanel
            bg={bg}
            grid={grid}
            mapId={mapId}
            onBgChange={onBgChange}
            onGridChange={onGridChange}
            onApplyBg={onApplyBg}
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
                onZChange={(z) => onZChange(selectedPiece.id, z)}
                onRemove={() => onRemovePiece(selectedPiece.id)}
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
                if (t === null) onExitWallsDrawMode();
                else onEnterWallsDrawMode(t);
              }}
              onMaterialChange={onMaterialChange}
            />
            {wallsDrawMode === "browse" && selectedWall && (
              <WallConfigPanel
                wall={selectedWall}
                onUpdate={(patch) => onWallUpdate(selectedWall.id, patch)}
                onRemove={() => onRemoveWall(selectedWall.id)}
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
