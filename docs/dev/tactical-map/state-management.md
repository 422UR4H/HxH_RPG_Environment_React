# Gerenciamento de estado no mapa

> Como decidir: React Query, Zustand, ou `useState`? E como Zustand + zundo + immer trabalham juntos pra dar undo/redo no editor.

## Três tipos de estado, três ferramentas

| Tipo de estado | Exemplo | Ferramenta |
|---|---|---|
| **Servidor** (vive no backend) | Mapa salvo, lista de mapas da campanha | **React Query** |
| **Local complexo** (rascunho, undo, seleção, ferramenta ativa) | Estado de edição do mapa antes de salvar | **Zustand** |
| **Local simples** (UI efêmera) | Modal aberto, input focado, dropdown expandido | **`useState`** ou `useContext` |

A regra é: **não misture**. Server state nunca vai pro Zustand; rascunho do editor nunca vai pro React Query; modal aberto nunca vai pro Zustand.

## React Query — o que já existe no projeto

Você já usa: hooks como `useMatchDetails`, `useMatchEnrollments`. No mapa, segue o mesmo padrão:

```ts
// src/hooks/useMap.ts (Fase 1)
export function useMap(token: string | null, mapId: string | undefined) {
  return useQuery({
    queryKey: ['map', token, mapId],
    queryFn: () => mapsService.getMap(token!, mapId!),
    enabled: !!token && !!mapId,
    retry: 1,
  });
}
```

Quando o mestre abre `EditMapPage`, esse hook carrega o mapa do servidor. Quando ele salva, uma `useMutation` atualiza e invalida o cache.

**O dado do React Query é "read-only" do ponto de vista do editor**. O editor não modifica esse cache diretamente; ele tem **sua própria cópia** (no Zustand) que vira a "rascunho".

## Zustand — o que é

Zustand é uma lib de **estado global local** (não confunda — "global" pra todos os componentes do app, "local" no sentido de vive no navegador, não no servidor). Diferença pra Context:

| Aspecto | Context (React) | Zustand |
|---|---|---|
| Boilerplate | Provider + Consumer + reducer | Um `create` e pronto |
| Re-render | Tudo que usa o context re-renderiza | Só quem usa o slice que mudou |
| Performance em apps grandes | Ruim | Excelente |
| Curva | Médio | Pequena |

**A store é um objeto com estado + funções (actions)**. Você acessa via hook.

```ts
// features/tactical-map/store/editorStore.ts (esqueleto Fase 0)
import { create } from 'zustand';

type EditorState = {
  map: TacticalMap | null;
  isDirty: boolean;
  loadMap: (map: TacticalMap) => void;
  setBg: (bg: BgImage | null) => void;
};

export const useEditorStore = create<EditorState>((set) => ({
  map: null,
  isDirty: false,
  loadMap: (map) => set({ map, isDirty: false }),
  setBg: (bg) => set((state) => ({
    map: state.map ? { ...state.map, bg } : null,
    isDirty: true,
  })),
}));
```

E consumir:

```tsx
function BgControls() {
  const bg = useEditorStore((s) => s.map?.bg);  // ⬅ selector
  const setBg = useEditorStore((s) => s.setBg);
  return <BgImageAdjuster bg={bg} onChange={setBg} />;
}
```

**O selector é a chave da performance**. `s => s.map?.bg` quer dizer "só me chame de novo quando `bg` mudar". Se outras partes da store mudarem (peças, ferramenta ativa), esse componente não re-renderiza.

## immer — escrever mutável, manter imutável

Com Zustand puro, atualizar estado nested é verboso:

```ts
setPieceZ: (pieceId, z) => set((state) => ({
  map: state.map ? {
    ...state.map,
    pieces: state.map.pieces.map((p) =>
      p.id === pieceId ? { ...p, coord: { ...p.coord, z } } : p
    ),
  } : null,
}));
```

Com `immer`, vira:

```ts
setPieceZ: (pieceId, z) => set(produce((draft) => {
  const piece = draft.map?.pieces.find((p) => p.id === pieceId);
  if (piece) piece.coord.z = z;
}));
```

`produce` te dá um "draft" — um objeto que parece mutável. Você modifica como quiser. O immer, por baixo, gera o estado imutável correto. Bônus: ele gera o **JSON Patch** equivalente (que vai virar nosso "delta" para enviar via WS — veja [sync-and-delta.md](./sync-and-delta.md)).

## zundo — undo/redo de graça

Zundo é um middleware do Zustand que **automaticamente** mantém histórico:

```ts
import { create } from 'zustand';
import { temporal } from 'zundo';

export const useEditorStore = create(
  temporal<EditorState>(
    (set) => ({
      map: null,
      setBg: (bg) => set(/* immer aqui */),
      // ... outras actions
    }),
    {
      limit: 50,  // mantém 50 níveis de undo
    }
  )
);

// uso:
function UndoButton() {
  const { undo, futureStates } = useEditorStore.temporal.getState();
  return <button onClick={undo} disabled={futureStates.length === 0}>↶</button>;
}
```

Cada `set` na store vai pro histórico. `undo()` reverte para o estado anterior; `redo()` reaplica.

**O que NÃO entra no histórico**:
- Estado de UI efêmera (modal aberto, etc.) — esse fica no `useState`
- Ferramenta ativa, seleção — também não fazem sentido desfazer

Pra excluir certos campos do histórico, dá pra configurar `partialize` no zundo:

```ts
{
  limit: 50,
  partialize: (state) => ({ map: state.map }),  // só `map` entra no histórico
}
```

Tudo isso configurado no esqueleto da Fase 0; você herda funcionando.

## Save explícito — o fluxo completo

Quando o mestre clica "Salvar":

```
1. Pega o `map` atual da store
2. Dispara `useUpdateMap.mutate(map)` (React Query)
3. Mutation envia PUT /maps/:id
4. No `onSuccess`, marca `isDirty = false` na store
5. Invalida o cache de `useMap` (próxima visita pega o atualizado)
```

Indicador "alterações não salvas" lê `isDirty`:

```tsx
function SaveButton() {
  const isDirty = useEditorStore((s) => s.isDirty);
  const map = useEditorStore((s) => s.map);
  const updateMap = useUpdateMap();
  return (
    <button
      onClick={() => map && updateMap.mutate(map)}
      disabled={!isDirty}
    >
      {isDirty ? 'Salvar*' : 'Salvar'}
    </button>
  );
}
```

## Proteção contra perda — rascunho em localStorage

Mestre abre `EditMapPage`, faz mudanças, fecha sem salvar (acidente). Pra não perder:

A store grava o `map` em `localStorage[\`tactical-map-draft:${mapId}\`]` sempre que ele muda (com `subscribe` do Zustand). Ao abrir a página, se houver rascunho, oferece "Restaurar rascunho local".

Isso é polish da Fase 5; o esqueleto está preparado desde a Fase 0.

## Quando NÃO usar Zustand

- Modal/dropdown aberto: `useState` no componente que controla.
- Forma sendo digitada num modal antes de aplicar: `useState` local; só vai pra store quando "OK".
- Hover state: `useState` no componente.
- Estado do `MapEditorToolbar` colapsada/expandida em mobile: `useState` local.

Regra simples: **se desfazer aquilo não faz sentido**, não vai na store.

## Estrutura prevista da store

```ts
// features/tactical-map/store/editorStore.ts

type ToolKind = 'grid' | 'bg' | 'pieces' | 'walls' | 'decorations';

type Selection =
  | { kind: 'piece'; id: string }
  | { kind: 'decoration'; id: string }
  | null;

type EditorState = {
  // dado
  map: TacticalMap | null;
  isDirty: boolean;

  // UI do editor (não no histórico)
  activeTool: ToolKind;
  selection: Selection;

  // lifecycle
  loadMap: (map: TacticalMap) => void;
  markClean: () => void;

  // grid
  setGrid: (grid: GridShape) => void;

  // bg
  setBg: (bg: BgImage | null) => void;

  // pieces
  placePiece: (characterId: string, slot: SlotCoord) => void;
  movePiece: (pieceId: string, slot: SlotCoord) => void;
  setPieceZ: (pieceId: string, z: number) => void;
  removePiece: (pieceId: string) => void;

  // UI
  setActiveTool: (tool: ToolKind) => void;
  setSelection: (sel: Selection) => void;
};
```

Implementação completa entra na Fase 0 (esqueleto) e cresce com cada fase do editor (2-5).

## Onde aprender mais

- Zustand: [github.com/pmndrs/zustand](https://github.com/pmndrs/zustand)
- zundo: [github.com/charkour/zundo](https://github.com/charkour/zundo)
- immer: [immerjs.github.io/immer](https://immerjs.github.io/immer/)

Os três têm READMEs curtos e exemplos vivos — vale dar uma olhada na primeira vez.
