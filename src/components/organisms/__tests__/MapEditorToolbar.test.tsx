import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MapEditorToolbar from "../MapEditorToolbar";
import type { ToolKind } from "../../../features/tactical-map/store/editorStore";
import { DEFAULT_GRID } from "../../../features/tactical-map/defaultMap";
import { renderWithProviders } from "../../../test/render";
import type { BgImage } from "../../../types/tacticalMap";

const baseProps = {
  activeTool: "grid" as ToolKind,
  onToolChange: vi.fn(),
  grid: DEFAULT_GRID,
  onGridChange: vi.fn(),
  bg: null as BgImage,
  onBgChange: vi.fn(),
  mapId: "map-test-1",
  mapName: "",
  mapDescription: "",
  onNameChange: vi.fn(),
  onDescriptionChange: vi.fn(),
  onSave: vi.fn(),
  isSaving: false,
  saveLabel: "Criar Mapa",
  nameError: null,
  saveError: null,
  // Fase 4 — pieces
  campaignId: "campaign-test-1",
  placedCharacterIds: new Set<string>(),
  placingNpcId: null,
  isDraggingPieceToRoster: false,
  selectedPiece: null,
  npcMap: new Map(),
  onPointerDownNpc: vi.fn(),
  onZChange: vi.fn(),
  onRemovePiece: vi.fn(),
};

describe("MapEditorToolbar", () => {
  it("exibe todas as abas de ferramentas", () => {
    render(<MapEditorToolbar {...baseProps} />);
    expect(screen.getByRole("button", { name: /grade/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fundo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /peças/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /paredes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /decorações/i })).toBeInTheDocument();
  });

  it("abas walls e decorações estão desabilitadas", () => {
    render(<MapEditorToolbar {...baseProps} />);
    expect(screen.getByRole("button", { name: /paredes/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /decorações/i })).toBeDisabled();
  });

  it("aba grid está habilitada e mostra GridConfigPanel", () => {
    render(<MapEditorToolbar {...baseProps} />);
    expect(screen.getByRole("button", { name: /grade/i })).not.toBeDisabled();
    expect(screen.getByLabelText(/colunas/i)).toBeInTheDocument();
  });

  it("campo nome renderiza e chama onNameChange ao digitar", async () => {
    render(<MapEditorToolbar {...baseProps} />);
    const nameInput = screen.getByPlaceholderText(/nome do mapa/i);
    await userEvent.type(nameInput, "A");
    expect(baseProps.onNameChange).toHaveBeenCalled();
  });

  it("botão salvar chama onSave ao clicar", async () => {
    render(<MapEditorToolbar {...baseProps} />);
    await userEvent.click(screen.getByRole("button", { name: /criar mapa/i }));
    expect(baseProps.onSave).toHaveBeenCalledOnce();
  });

  it("nameError é exibido abaixo do campo nome", () => {
    render(
      <MapEditorToolbar
        {...baseProps}
        nameError="O nome do mapa é obrigatório."
      />,
    );
    expect(
      screen.getByText(/O nome do mapa é obrigatório/i),
    ).toBeInTheDocument();
  });

  it("botão salvar fica desabilitado enquanto isSaving", () => {
    render(<MapEditorToolbar {...baseProps} isSaving />);
    expect(screen.getByRole("button", { name: /salvando/i })).toBeDisabled();
  });

  it("aba Fundo está habilitada", () => {
    render(<MapEditorToolbar {...baseProps} />);
    expect(screen.getByRole("button", { name: /fundo/i })).not.toBeDisabled();
  });

  it("aba Fundo ativa exibe BgImagePanel", () => {
    renderWithProviders(
      <MapEditorToolbar {...baseProps} activeTool="bg" />,
    );
    expect(screen.getByText(/clique ou solte/i)).toBeInTheDocument();
  });
});
