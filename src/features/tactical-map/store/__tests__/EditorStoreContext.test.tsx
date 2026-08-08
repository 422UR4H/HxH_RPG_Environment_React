import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createEditorStore } from "../editorStore";
import {
  EditorStoreProvider,
  useEditorStore,
  useEditorStoreRef,
} from "../EditorStoreContext";
import { mapFixture } from "../../../../test/fixtures/map";

function NameDisplay() {
  const name = useEditorStore((s) => s.map.name);
  const setName = useEditorStore((s) => s.setName);
  return (
    <div>
      <span data-testid="name">{name}</span>
      <button onClick={() => setName("Nome Novo")}>renomear</button>
    </div>
  );
}

function StoreRefDisplay() {
  const store = useEditorStoreRef();
  return <span data-testid="store-name">{store.getState().map.name}</span>;
}

describe("EditorStoreContext", () => {
  it("componente dentro do provider lê um valor do store", () => {
    const store = createEditorStore(mapFixture);
    render(
      <EditorStoreProvider store={store}>
        <NameDisplay />
      </EditorStoreProvider>,
    );
    expect(screen.getByTestId("name")).toHaveTextContent(mapFixture.name);
  });

  it("set no store re-renderiza o consumidor com o valor novo", () => {
    const store = createEditorStore(mapFixture);
    render(
      <EditorStoreProvider store={store}>
        <NameDisplay />
      </EditorStoreProvider>,
    );
    fireEvent.click(screen.getByText("renomear"));
    expect(screen.getByTestId("name")).toHaveTextContent("Nome Novo");
  });

  it("consumidor fora do provider lança o erro esperado", () => {
    // Silencia o console.error que o React imprime para o erro não capturado
    // por um error boundary durante o render de teste.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<NameDisplay />)).toThrow(
      "useEditorStore precisa de <EditorStoreProvider> acima na árvore",
    );
    spy.mockRestore();
  });

  it("dois providers com stores diferentes na mesma árvore não se contaminam", () => {
    const storeA = createEditorStore({ ...mapFixture, name: "Mapa A" });
    const storeB = createEditorStore({ ...mapFixture, name: "Mapa B" });
    render(
      <>
        <EditorStoreProvider store={storeA}>
          <NameDisplay />
        </EditorStoreProvider>
        <EditorStoreProvider store={storeB}>
          <NameDisplay />
        </EditorStoreProvider>
      </>,
    );
    const names = screen.getAllByTestId("name");
    expect(names[0]).toHaveTextContent("Mapa A");
    expect(names[1]).toHaveTextContent("Mapa B");

    fireEvent.click(screen.getAllByText("renomear")[0]);

    const namesAfter = screen.getAllByTestId("name");
    expect(namesAfter[0]).toHaveTextContent("Nome Novo");
    expect(namesAfter[1]).toHaveTextContent("Mapa B");
  });

  it("useEditorStoreRef devolve o store inteiro (ex.: para store.temporal)", () => {
    const store = createEditorStore(mapFixture);
    render(
      <EditorStoreProvider store={store}>
        <StoreRefDisplay />
      </EditorStoreProvider>,
    );
    expect(screen.getByTestId("store-name")).toHaveTextContent(mapFixture.name);
  });

  it("useEditorStoreRef fora do provider lança o erro esperado", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<StoreRefDisplay />)).toThrow(
      "useEditorStoreRef precisa de <EditorStoreProvider> acima na árvore",
    );
    spy.mockRestore();
  });
});
