import type { ChangeEvent } from "react";
import styled from "styled-components";
import type { ToolKind } from "../../features/tactical-map/store/editorStore";
import type { BgImage, GridShape, Piece } from "../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../types/characterSheet";
import GridConfigPanel from "../molecules/GridConfigPanel";
import BgImagePanel from "../molecules/BgImagePanel";
import NpcRosterPanel from "../molecules/NpcRosterPanel";
import PiecePropertyPanel from "../molecules/PiecePropertyPanel";
import { colors, fonts } from "../../styles/tokens";

type Props = {
  activeTool: ToolKind;
  onToolChange: (tool: ToolKind) => void;
  grid: GridShape;
  onGridChange: (grid: GridShape) => void;
  bg: BgImage;
  onBgChange: (bg: BgImage | null) => void;
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
};

type TabDef = {
  tool: ToolKind;
  label: string;
  enabled: boolean;
};

const TABS: TabDef[] = [
  { tool: "grid", label: "Grade", enabled: true },
  { tool: "bg", label: "Fundo", enabled: true },
  { tool: "pieces", label: "Peças", enabled: true },
  { tool: "walls", label: "Paredes", enabled: false },
  { tool: "decorations", label: "Decorações", enabled: false },
];

export default function MapEditorToolbar({
  activeTool,
  onToolChange,
  grid,
  onGridChange,
  bg,
  onBgChange,
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
}: Props) {
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    onNameChange(e.target.value);
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onDescriptionChange(e.target.value);
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

      <PanelArea>
        {activeTool === "grid" && (
          <GridConfigPanel grid={grid} onChange={onGridChange} />
        )}
        {activeTool === "bg" && (
          <BgImagePanel
            bg={bg}
            grid={grid}
            mapId={mapId}
            onBgChange={onBgChange}
            onGridChange={onGridChange}
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
  min-width: 60px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid
    ${({ $active }) => ($active ? colors.brandAccent : colors.borderInput)};
  background: ${({ $active }) =>
    $active ? colors.brandAccent : "transparent"};
  color: ${({ disabled }) =>
    disabled ? colors.textPlaceholderStrong : colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 12px;
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
  gap: 8px;
  padding: 12px;
  border-top: 1px solid ${colors.borderInput};
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const NameInput = styled.input`
  font-family: ${fonts.sans};
  font-size: 14px;
  color: ${colors.textPrimary};
  background: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  padding: 8px 12px;
  outline: none;

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
  gap: 6px;
  padding: 12px;
  border-top: 1px solid ${colors.borderInput};
`;

const SaveButton = styled.button`
  width: 100%;
  padding: 10px;
  border-radius: 6px;
  border: none;
  background: ${colors.brandAccent};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 14px;
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
