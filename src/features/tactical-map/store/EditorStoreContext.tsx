import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { EditorState, EditorStore } from "./editorStore";

// O editorStore é criado por instância (createEditorStore(initialMap) num ref do
// TacticalMapEditor), não é um singleton de módulo — por isso precisa de contexto em
// vez de um import direto. Dois editores na mesma tela teriam stores independentes.
const EditorStoreContext = createContext<EditorStore | null>(null);

export function EditorStoreProvider({
  store,
  children,
}: {
  store: EditorStore;
  children: ReactNode;
}) {
  return (
    <EditorStoreContext.Provider value={store}>
      {children}
    </EditorStoreContext.Provider>
  );
}

// Assina uma fatia do store. O seletor precisa devolver referência ou primitivo —
// derivação com alocação (new Set, .map, objeto literal) causa re-render infinito.
// Ver o plano da Fase 5, seção "A armadilha do zustand".
export function useEditorStore<T>(selector: (s: EditorState) => T): T {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("useEditorStore precisa de <EditorStoreProvider> acima na árvore");
  return store(selector);
}

// Para quem precisa do store inteiro (ex.: useEditorHistory, que assina store.temporal).
export function useEditorStoreRef(): EditorStore {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("useEditorStoreRef precisa de <EditorStoreProvider> acima na árvore");
  return store;
}
