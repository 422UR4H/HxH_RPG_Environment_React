import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MapEditorToolbar from "../MapEditorToolbar";
import { createEditorStore } from "../store/editorStore";
import { EditorStoreProvider } from "../store/EditorStoreContext";
import { mapFixture } from "../../../test/fixtures/map";
import { renderWithProviders } from "../../../test/render";
import type { TacticalMap } from "../../../types/tacticalMap";

const baseProps = {
  onSave: vi.fn(),
  isSaving: false,
  saveLabel: "Criar Mapa",
  nameError: null as string | null,
  saveError: null as string | null,
  campaignId: "campaign-test-1",
  placingNpcId: null,
  isDraggingPieceToRoster: false,
  onPointerDownNpc: vi.fn(),
};

function makeStore(mapOverrides: Partial<TacticalMap> = {}) {
  return createEditorStore({
    ...mapFixture,
    id: "map-test-1",
    name: "",
    description: "",
    ...mapOverrides,
  });
}

function renderToolbar(
  props: Partial<typeof baseProps> = {},
  store = makeStore(),
) {
  return renderWithProviders(
    <EditorStoreProvider store={store}>
      <MapEditorToolbar {...baseProps} {...props} />
    </EditorStoreProvider>,
  );
}

describe("MapEditorToolbar", () => {
  it("exibe todas as abas de ferramentas", () => {
    renderToolbar();
    // exact "Grade" to avoid matching the "Encaixar Grade" action button
    expect(screen.getByRole("button", { name: "Grade" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fundo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /peças/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /paredes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /decorações/i })).toBeInTheDocument();
  });

  it("aba decorações está desabilitada e walls está habilitada", () => {
    renderToolbar();
    expect(screen.getByRole("button", { name: /paredes/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /decorações/i })).toBeDisabled();
  });

  it("aba grid está habilitada e mostra GridConfigPanel", () => {
    renderToolbar();
    expect(screen.getByRole("button", { name: "Grade" })).not.toBeDisabled();
    expect(screen.getByLabelText(/colunas/i)).toBeInTheDocument();
  });

  it("clicar numa aba muda o activeTool do store", async () => {
    const store = makeStore();
    renderToolbar({}, store);
    await userEvent.click(screen.getByRole("button", { name: /fundo/i }));
    expect(store.getState().activeTool).toBe("bg");
  });

  it("campo nome renderiza e escreve no store ao digitar", async () => {
    const store = makeStore();
    renderToolbar({}, store);
    const nameInput = screen.getByPlaceholderText(/nome do mapa/i);
    await userEvent.type(nameInput, "A");
    expect(store.getState().map.name).toBe("A");
  });

  it("botão salvar chama onSave ao clicar", async () => {
    const onSave = vi.fn();
    renderToolbar({ onSave });
    await userEvent.click(screen.getByRole("button", { name: /criar mapa/i }));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("nameError é exibido abaixo do campo nome", () => {
    renderToolbar({ nameError: "O nome do mapa é obrigatório." });
    expect(
      screen.getByText(/O nome do mapa é obrigatório/i),
    ).toBeInTheDocument();
  });

  it("botão salvar fica desabilitado enquanto isSaving", () => {
    renderToolbar({ isSaving: true });
    expect(screen.getByRole("button", { name: /salvando/i })).toBeDisabled();
  });

  it("aba Fundo está habilitada", () => {
    renderToolbar();
    expect(screen.getByRole("button", { name: /fundo/i })).not.toBeDisabled();
  });

  it("aba Fundo ativa exibe BgImagePanel", () => {
    const store = makeStore();
    store.getState().setActiveTool("bg");
    renderToolbar({}, store);
    expect(screen.getByText(/clique ou solte/i)).toBeInTheDocument();
  });
});
