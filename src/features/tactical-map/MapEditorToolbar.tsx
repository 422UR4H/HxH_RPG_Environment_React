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
import ComingSoonBadge from "../../components/ions/ComingSoonBadge";
import Tooltip from "../../components/ions/Tooltip";
import { colors } from "../../styles/tokens";
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
        {TABS.map(({ tool, label, enabled }) =>
          enabled ? (
            <TabButton
              key={tool}
              type="button"
              $active={activeTool === tool}
              data-active={activeTool === tool}
              onClick={() => setActiveTool(tool)}
            >
              {label}
            </TabButton>
          ) : (
            // Desativada mas visível: o selo e a dica explicam que ainda não existe (não parece quebrada).
            <SoonRow key={tool}>
              <Tooltip label="Em breve" stretch>
                <TabButton type="button" $active={false} aria-disabled="true" $soon>
                  {label}
                  <ComingSoonBadge />
                </TabButton>
              </Tooltip>
            </SoonRow>
          ),
        )}
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
          <FieldLabel htmlFor="map-name">Nome do mapa</FieldLabel>
          <NameInput
            id="map-name"
            type="text"
            placeholder="Nome do mapa"
            value={mapName}
            onChange={handleNameChange}
          />
          {nameError && <ErrorText>{nameError}</ErrorText>}
        </FieldGroup>

        <FieldLabel htmlFor="map-description">Descrição</FieldLabel>
        <DescriptionTextarea
          id="map-description"
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
          {isSaving ? "Salvando…" : saveLabel}
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

const SoonRow = styled.div`
  display: flex;
  flex: 1 0 100%;
`;

const FieldLabel = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: ${colors.textPrimary};

  @media (max-width: 749px) {
    &[for="map-description"] {
      display: none;
    }
  }
`;

const TabButton = styled.button<{ $active: boolean; $soon?: boolean }>`
  flex: 1;
  min-width: 0;
  padding: clamp(4px, 1.5cqi, 6px) clamp(2px, 1cqi, 8px);
  height: max(40px, 8cqi);
  border-radius: 6px;
  border: 1px solid
    ${({ $active }) => ($active ? colors.brandAccent : colors.borderInput)};
  background: ${({ $active, $soon }) =>
    $soon ? colors.surfaceDisabled : $active ? colors.brandAccent : "transparent"};
  color: ${({ $soon }) => ($soon ? colors.textDisabledOnDark : colors.textPrimary)};
  font-size: clamp(12px, 3.2cqi, 13px);
  font-weight: 600;
  cursor: ${({ $soon }) => ($soon ? "not-allowed" : "pointer")};
  transition: background 0.15s;
  ${({ $soon }) => $soon && "display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;"}

  &:hover {
    filter: ${({ $soon }) => ($soon ? "none" : "brightness(1.1)")};
  }

  @media (pointer: coarse) {
    min-height: 44px;
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
  font-size: clamp(13px, 3.5cqi, 14px);
  color: ${colors.textPrimary};
  background: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  padding: clamp(6px, 2cqi, 8px) clamp(8px, 3cqi, 12px);
  outline: none;
  width: 100%;

  @media (pointer: coarse) {
    min-height: 44px;
  }

  &::placeholder {
    color: ${colors.textPlaceholder};
  }

  &:focus {
    border-color: ${colors.brandAccent};
  }
`;

const DescriptionTextarea = styled.textarea`
  font-size: 13px;
  color: ${colors.textPrimary};
  background: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  padding: 8px 12px;
  resize: vertical;
  outline: none;

  @media (pointer: coarse) {
    min-height: 44px;
  }

  @media (max-width: 749px) {
    display: none;
  }

  &::placeholder {
    color: ${colors.textPlaceholder};
  }

  &:focus {
    border-color: ${colors.brandAccent};
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
  font-size: 12px;
  color: ${colors.feedbackDanger};
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
  font-size: clamp(12px, 3.2cqi, 13px);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;

  @media (pointer: coarse) {
    min-height: 44px;
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    background: ${colors.surfaceInput};
  }
`;
