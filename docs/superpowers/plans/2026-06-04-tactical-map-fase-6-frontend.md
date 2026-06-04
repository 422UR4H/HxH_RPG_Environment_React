# Tactical Map Fase 6 — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `GamePage` deixa de ser placeholder e exibe o mapa em tela cheia; mestre anexa mapa na `MatchPage`; lobby mostra mapa com posicionamento interativo sincronizado via WS.

**Architecture:** Novo componente `TacticalMapPlacer` reutiliza `TacticalMapStage` + `NpcRosterPanel` sem duplicar lógica de edição. Estado de peças no lobby em `useState` (não no editorStore). `useLobbyWs` extendido com `sendPieceMoved`/`onPieceMoved`. `GamePage` usa novo `GamePageTemplate` (full-screen + sidebar colapsável). Spec: `docs/superpowers/specs/2026-06-04-tactical-map-fase-6-design.md`.

**Tech Stack:** React 19, TypeScript strict, React Query, styled-components, Vitest + Testing Library + msw, react-router-dom v7.

---

## Mapa de arquivos

### Novos
| Arquivo | Responsabilidade |
|---|---|
| `src/hooks/useMatchMap.ts` | React Query: GET /matches/:id/map (null se 204) |
| `src/hooks/useAttachMatchMap.ts` | Mutation: POST /matches/:id/map |
| `src/hooks/useDetachMatchMap.ts` | Mutation: DELETE /matches/:id/map |
| `src/features/tactical-map/TacticalMapPlacer.tsx` | Casca de posicionamento no lobby |
| `src/components/templates/GamePageTemplate.tsx` | Layout tela cheia + sidebar colapsável |
| `src/pages/__tests__/GamePage.test.tsx` | Testes da GamePage |

### Modificados
| Arquivo | O que muda |
|---|---|
| `src/types/tacticalMap.ts` | + `MatchMapResponse` |
| `src/services/mapsService.ts` | + attachMatchMap, getMatchMap, detachMatchMap |
| `src/components/organisms/TacticalMapStage.tsx` | + prop `draggablePieceIds?: Set<string>` (regra escoteiro) |
| `src/hooks/useLobbyWs.ts` | + `sendPieceMoved` retorno + `onPieceMoved` callback input |
| `src/pages/MatchPage.tsx` | + attach/detach UI na aba Mapas |
| `src/pages/LobbyPage.tsx` | + mapa + pieces state + save-on-start |
| `src/pages/GamePage.tsx` | Substituir placeholder pelo viewer |
| `src/pages/__tests__/LobbyPage.test.tsx` | + cenários de mapa |
| `src/pages/__tests__/MatchPage.test.tsx` | + cenários de attach/detach |

---

## Task 1: Tipos + Service

**Files:**
- Modify: `src/types/tacticalMap.ts`
- Modify: `src/services/mapsService.ts`

- [ ] **Step 1: Adicionar `MatchMapResponse` em `src/types/tacticalMap.ts`**

Abrir o arquivo e adicionar após o tipo `TacticalMap`:

```ts
export type MatchMapResponse = {
  matchUuid: string;
  mapUuid: string;
  attachedAt: string;
};
```

- [ ] **Step 2: Adicionar métodos em `src/services/mapsService.ts`**

Adicionar ao objeto `mapsService` (após `deleteMap`):

```ts
  attachMatchMap: (
    token: string,
    matchId: string,
    mapId: string,
  ): Promise<MatchMapResponse> =>
    httpClient
      .post<{ match_map: MatchMapResponse }>(
        `/matches/${matchId}/map`,
        objToSnakeCase({ mapUuid: mapId }),
        config(token),
      )
      .then(({ data: res }) => objToCamelCase<MatchMapResponse>(res.match_map)),

  getMatchMap: (
    token: string,
    matchId: string,
  ): Promise<MatchMapResponse | null> =>
    httpClient
      .get<{ match_map: MatchMapResponse } | null>(
        `/matches/${matchId}/map`,
        config(token),
      )
      .then(({ data: res }) =>
        res ? objToCamelCase<MatchMapResponse>(res.match_map) : null,
      )
      .catch((err) => {
        // 204 No Content: Axios não popula data — retornar null
        if (err?.response?.status === 204 || !err?.response) return null;
        throw err;
      }),

  detachMatchMap: (token: string, matchId: string): Promise<void> =>
    httpClient
      .delete(`/matches/${matchId}/map`, config(token))
      .then(() => undefined),
```

Adicionar o import do tipo `MatchMapResponse` no topo do arquivo:

```ts
import type { TacticalMap, GridShape, BgImage, Piece, MatchMapResponse } from "../types/tacticalMap";
```

- [ ] **Step 3: Build para verificar tipos**

```bash
npm run build 2>&1 | head -30
```

Esperado: sem erros de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/types/tacticalMap.ts src/services/mapsService.ts
git commit -m "feat(matchmap): add MatchMapResponse type and service methods"
```

---

## Task 2: React Query hooks

**Files:**
- Create: `src/hooks/useMatchMap.ts`
- Create: `src/hooks/useAttachMatchMap.ts`
- Create: `src/hooks/useDetachMatchMap.ts`

- [ ] **Step 1: `useMatchMap.ts`**

```ts
// src/hooks/useMatchMap.ts
import { useQuery } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";
import type { MatchMapResponse } from "../types/tacticalMap";

export function useMatchMap(token: string | null, matchId: string | undefined) {
  return useQuery<MatchMapResponse | null>({
    queryKey: ["match-map", matchId, token],
    queryFn: () => mapsService.getMatchMap(token!, matchId!),
    enabled: !!token && !!matchId,
    retry: 1,
  });
}
```

- [ ] **Step 2: `useAttachMatchMap.ts`**

```ts
// src/hooks/useAttachMatchMap.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";

export function useAttachMatchMap(token: string | null, matchId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mapId: string) =>
      mapsService.attachMatchMap(token!, matchId!, mapId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["match-map", matchId] });
    },
  });
}
```

- [ ] **Step 3: `useDetachMatchMap.ts`**

```ts
// src/hooks/useDetachMatchMap.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";

export function useDetachMatchMap(token: string | null, matchId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => mapsService.detachMatchMap(token!, matchId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["match-map", matchId] });
    },
  });
}
```

- [ ] **Step 4: Build**

```bash
npm run build 2>&1 | head -30
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMatchMap.ts src/hooks/useAttachMatchMap.ts src/hooks/useDetachMatchMap.ts
git commit -m "feat(matchmap): add useMatchMap, useAttachMatchMap, useDetachMatchMap hooks"
```

---

## Task 3: `TacticalMapStage` — prop `draggablePieceIds` (regra escoteiro)

**Files:**
- Modify: `src/components/organisms/TacticalMapStage.tsx`

Adicionar uma prop opcional que restringe quais peças são arrastáveis. Quando `undefined`, todas as peças são arrastáveis (comportamento atual do editor, inalterado).

- [ ] **Step 1: Localizar o type Props do TacticalMapStage**

```bash
grep -n "type Props" src/components/organisms/TacticalMapStage.tsx
```

- [ ] **Step 2: Adicionar `draggablePieceIds` ao type Props**

No type Props do `TacticalMapStage`, adicionar após `piecesInteractive?`:

```ts
// undefined = all pieces draggable (editor mode).
// Set<string> = only listed piece IDs are draggable (lobby placer mode).
draggablePieceIds?: Set<string>;
```

- [ ] **Step 3: Propagar `draggablePieceIds` até `PiecesLayer`**

Localizar onde `TacticalMapStage` renderiza o `PiecesLayer` (ou o inner component que usa `PiecesLayer`). Buscar:

```bash
grep -n "PiecesLayer\|piecesInteractive" src/components/organisms/TacticalMapStage.tsx | head -20
```

Adicionar `draggablePieceIds` à desestruturação dos props no componente raiz e passar adiante até chegar ao local onde `pointerdown` de peça é registrado (provavelmente dentro de `PiecesLayer` ou equivalente).

- [ ] **Step 4: Aplicar o guard no `pointerdown` de peça**

No local onde um `pointerdown` inicia o drag de uma peça existente no canvas (dentro do `useEffect` do `PiecesLayer` ou equivalente), adicionar antes de iniciar o drag:

```ts
// Guard: if draggablePieceIds is provided, only allow dragging listed pieces.
if (draggablePieceIds !== undefined && !draggablePieceIds.has(pieceId)) return;
```

- [ ] **Step 5: O editor passa `undefined` — confirmar que não quebra nada**

```bash
npx vitest run src/pages/__tests__/CreateMapPage.test.tsx src/pages/__tests__/EditMapPage.test.tsx
```

Esperado: todos passam.

- [ ] **Step 6: Build**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 7: Commit**

```bash
git add src/components/organisms/TacticalMapStage.tsx
git commit -m "feat(stage): add draggablePieceIds prop to restrict piece dragging (scout rule)"
```

---

## Task 4: `useLobbyWs` — extensão com `sendPieceMoved` e `onPieceMoved`

**Files:**
- Modify: `src/hooks/useLobbyWs.ts`

- [ ] **Step 1: Adicionar `SlotCoord` import**

No topo de `src/hooks/useLobbyWs.ts`, adicionar:

```ts
import type { SlotCoord } from "../types/tacticalMap";
```

- [ ] **Step 2: Adicionar `onPieceMoved` aos params do hook**

Dentro de `interface UseLobbyWsParams`, adicionar:

```ts
  onPieceMoved?: (pieceId: string, slot: SlotCoord) => void;
```

- [ ] **Step 3: Adicionar `sendPieceMoved` ao retorno**

Dentro de `interface UseLobbyWsResult`, adicionar:

```ts
  sendPieceMoved: (pieceId: string, slot: SlotCoord) => void;
```

- [ ] **Step 4: Destruturar `onPieceMoved` nos parâmetros do hook e criar ref**

Dentro de `export function useLobbyWs({...})`, adicionar `onPieceMoved` à desestruturação e criar ref (mesmo padrão de `onMatchStartedRef`):

```ts
const onPieceMovedRef = useRef(onPieceMoved);
onPieceMovedRef.current = onPieceMoved;
```

- [ ] **Step 5: Processar `lobby_piece_moved` no switch de `ws.onmessage`**

Dentro do `switch (msg.type)`, adicionar após o case `"match_started"`:

```ts
          case "lobby_piece_moved": {
            const p = payload as {
              piece_id: string;
              slot: { kind: string; col?: number; row?: number; q?: number; r?: number };
            };
            if (!p.piece_id || !p.slot) break;
            let slot: SlotCoord;
            if (p.slot.kind === "square" && p.slot.col != null && p.slot.row != null) {
              slot = { kind: "square", col: p.slot.col, row: p.slot.row };
            } else if (p.slot.kind === "hex" && p.slot.q != null && p.slot.r != null) {
              slot = { kind: "hex", q: p.slot.q, r: p.slot.r };
            } else {
              break;
            }
            onPieceMovedRef.current?.(p.piece_id, slot);
            break;
          }
```

- [ ] **Step 6: Criar `sendPieceMoved` usando `sendMessage` existente**

Após `sendCancelLobby`, adicionar:

```ts
  const sendPieceMoved = useCallback(
    (pieceId: string, slot: SlotCoord) => {
      const slotPayload =
        slot.kind === "square"
          ? { kind: "square", col: slot.col, row: slot.row }
          : { kind: "hex", q: slot.q, r: slot.r };
      sendMessage("lobby_piece_moved", { piece_id: pieceId, slot: slotPayload });
    },
    [sendMessage],
  );
```

- [ ] **Step 7: Adicionar `sendPieceMoved` ao return**

```ts
  return { status, participants, sendStartMatch, sendKick, sendCancelLobby, sendPieceMoved };
```

- [ ] **Step 8: Rodar os testes do LobbyPage**

```bash
npx vitest run src/pages/__tests__/LobbyPage.test.tsx
```

Esperado: todos passam (testes existentes não foram quebrados).

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useLobbyWs.ts
git commit -m "feat(lobby-ws): add sendPieceMoved and onPieceMoved for lobby map sync"
```

---

## Task 5: `TacticalMapPlacer`

**Files:**
- Create: `src/features/tactical-map/TacticalMapPlacer.tsx`

Este componente é uma casca de posicionamento. Reutiliza `TacticalMapStage` e `NpcRosterPanel` sem copiar a lógica de edição do `TacticalMapEditor`.

- [ ] **Step 1: Criar o arquivo**

```tsx
// src/features/tactical-map/TacticalMapPlacer.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import avatarPlaceholderUrl from "../../assets/placeholder/avatar.png";
import gungiFrameUrl from "../../assets/icons/gungi.svg";
import TacticalMapStage from "../../components/organisms/TacticalMapStage";
import { useResizeObserver } from "../../hooks/useResizeObserver";
import { useCampaignDetails } from "../../hooks/useCampaignDetails";
import useToken from "../../hooks/useToken";
import { colors } from "../../styles/tokens";
import type { TacticalMap, Piece, SlotCoord } from "../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../types/characterSheet";

// NpcRosterPanel is imported directly — zero code duplication.
// It is rendered only when draggablePieceIds is undefined (master mode).
import NpcRosterPanel from "../../components/molecules/NpcRosterPanel";

type Props = {
  map: TacticalMap;
  campaignId: string;
  pieces: Piece[];
  onPiecesChange: (pieces: Piece[]) => void;
  sendPieceMoved: (pieceId: string, slot: SlotCoord) => void;
  // undefined = all pieces draggable (master).
  // Set<string> = only listed piece IDs draggable (player with own piece).
  draggablePieceIds?: Set<string>;
};

export default function TacticalMapPlacer({
  map,
  campaignId,
  pieces,
  onPiecesChange,
  sendPieceMoved,
  draggablePieceIds,
}: Props) {
  const { token } = useToken();
  const { data: campaign } = useCampaignDetails(token, campaignId);

  const canvasRef = useRef<HTMLDivElement>(null);
  const { width, height } = useResizeObserver(canvasRef);

  // Ghost for roster-to-canvas drag (same pattern as TacticalMapEditor).
  // TODO: extract to useRosterDrag() when a 3rd consumer appears (YAGNI now).
  const [placingNpcId, setPlacingNpcId] = useState<string | null>(null);
  const [placingNpcData, setPlacingNpcData] = useState<CharacterPrivateSummary | null>(null);
  const [viewportScale, setViewportScale] = useState(1);
  const ghostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!placingNpcId) return;
    const handleMove = (e: PointerEvent) => {
      if (ghostRef.current) {
        ghostRef.current.style.left = `${e.clientX}px`;
        ghostRef.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, [placingNpcId]);

  const isMaster = draggablePieceIds === undefined;

  const placedCharacterIds = useMemo(
    () => new Set(pieces.map((p) => p.characterId)),
    [pieces],
  );

  const npcMap = useMemo(() => {
    const m = new Map<string, CharacterPrivateSummary>();
    (campaign?.characterSheets ?? []).forEach((cs) => m.set(cs.uuid, cs));
    return m;
  }, [campaign]);

  const handleNpcPointerDown = (npc: CharacterPrivateSummary) => {
    setPlacingNpcId(npc.uuid);
    setPlacingNpcData(npc);
  };

  const handleNpcPlacementCancel = useCallback(() => {
    setPlacingNpcId(null);
    setPlacingNpcData(null);
  }, []);

  const handleNpcPlaced = (slot: SlotCoord) => {
    if (!placingNpcData) {
      setPlacingNpcId(null);
      return;
    }
    const occupied = pieces.some(
      (p) => JSON.stringify(p.coord.slot) === JSON.stringify(slot),
    );
    if (occupied) {
      setPlacingNpcId(null);
      setPlacingNpcData(null);
      return;
    }
    const newPiece: Piece = {
      id: crypto.randomUUID(),
      characterId: placingNpcData.uuid,
      coord: { slot, z: 0 },
      visible: true,
    };
    const newPieces = [...pieces, newPiece];
    onPiecesChange(newPieces);
    sendPieceMoved(newPiece.id, slot);
    setPlacingNpcId(null);
    setPlacingNpcData(null);
  };

  const handlePieceMove = useCallback(
    (pieceId: string, slot: SlotCoord) => {
      onPiecesChange(
        pieces.map((p) =>
          p.id === pieceId ? { ...p, coord: { ...p.coord, slot } } : p,
        ),
      );
      sendPieceMoved(pieceId, slot);
    },
    [pieces, onPiecesChange, sendPieceMoved],
  );

  const handlePieceDragToRoster = useCallback(
    (pieceId: string) => {
      // Removal is not WS-synced in Phase 6.
      // TODO: add lobby_piece_removed WS event (Phase 7+)
      onPiecesChange(pieces.filter((p) => p.id !== pieceId));
    },
    [pieces, onPiecesChange],
  );

  const localMap: TacticalMap = useMemo(
    () => ({ ...map, pieces }),
    [map, pieces],
  );

  const dragGhostSize = Math.max(44, map.grid.cellSize * 0.9 * viewportScale);

  return (
    <PlacerRoot>
      <CanvasArea ref={canvasRef}>
        {width > 0 && height > 0 && (
          <TacticalMapStage
            map={localMap}
            width={width}
            height={height}
            piecesInteractive={true}
            npcMap={npcMap}
            placingNpcId={placingNpcId}
            onNpcPlaced={handleNpcPlaced}
            onNpcPlacementCancel={handleNpcPlacementCancel}
            onPieceMove={handlePieceMove}
            onPieceDragToRoster={isMaster ? handlePieceDragToRoster : undefined}
            draggablePieceIds={draggablePieceIds}
            onViewportScaleChange={setViewportScale}
          />
        )}
      </CanvasArea>

      {isMaster && (
        <RosterArea>
          <NpcRosterPanel
            campaignId={campaignId}
            placedCharacterIds={placedCharacterIds}
            placingNpcId={placingNpcId}
            isDraggingPieceToRoster={false}
            onPointerDownNpc={handleNpcPointerDown}
          />
        </RosterArea>
      )}

      {/* Roster-drag ghost — same portal pattern as TacticalMapEditor */}
      {placingNpcId &&
        placingNpcData &&
        createPortal(
          <GhostToken
            ref={ghostRef}
            style={{ width: dragGhostSize, height: dragGhostSize }}
          >
            <GhostFrame src={gungiFrameUrl} />
            <GhostAvatar
              src={placingNpcData.avatarUrl ?? avatarPlaceholderUrl}
            />
          </GhostToken>,
          document.body,
        )}
    </PlacerRoot>
  );
}

const PlacerRoot = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const CanvasArea = styled.div`
  flex: 1;
  min-width: 0;
  height: 100%;
`;

const RosterArea = styled.div`
  width: 220px;
  flex-shrink: 0;
  height: 100%;
  overflow-y: auto;
  background: ${colors.surfaceSidebar};
  border-left: 1px solid ${colors.borderInput};
`;

const GhostToken = styled.div`
  position: fixed;
  pointer-events: none;
  transform: translate(-50%, -50%);
  z-index: 9999;
  border-radius: 50%;
  overflow: hidden;
`;

const GhostFrame = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const GhostAvatar = styled.img`
  position: absolute;
  inset: 10%;
  width: 80%;
  height: 80%;
  object-fit: cover;
  border-radius: 50%;
`;
```

- [ ] **Step 2: Build para verificar tipos**

```bash
npm run build 2>&1 | head -40
```

Esperado: sem erros de TypeScript. Se `NpcRosterPanel` ou `TacticalMapStage` tiverem props incompatíveis, corrigir (verificar interface atual dos componentes e ajustar apenas o `TacticalMapPlacer`, não os componentes).

- [ ] **Step 3: Commit**

```bash
git add src/features/tactical-map/TacticalMapPlacer.tsx
git commit -m "feat(tactical-map): add TacticalMapPlacer for lobby piece placement"
```

---

## Task 6: `MatchPage` — attach/detach UI na aba Mapas

**Files:**
- Modify: `src/pages/MatchPage.tsx`
- Modify: `src/pages/__tests__/MatchPage.test.tsx`

- [ ] **Step 1: Adicionar imports em `MatchPage.tsx`**

No topo de `MatchPage.tsx`, adicionar imports:

```ts
import { useMatchMap } from "../hooks/useMatchMap";
import { useAttachMatchMap } from "../hooks/useAttachMatchMap";
import { useDetachMatchMap } from "../hooks/useDetachMatchMap";
```

- [ ] **Step 2: Adicionar queries/mutations no corpo do componente**

Dentro do componente `MatchPage`, após os outros hooks:

```ts
  const { data: matchMap } = useMatchMap(token, matchId);
  const { mutate: attachMap, isPending: isAttaching } = useAttachMatchMap(token, matchId);
  const { mutate: detachMap, isPending: isDetaching } = useDetachMatchMap(token, matchId);
```

- [ ] **Step 3: Adicionar UI de attach/detach na aba Mapas**

Localizar o bloco JSX que renderiza os `MapCard`s na aba Mapas. Exemplo do trecho atual (simplificado):

```tsx
{activeTab === "maps" && isMaster && (
  /* ... lista de MapCard ... */
)}
```

Dentro deste bloco, envolver cada `MapCard` com lógica de botões:

```tsx
{activeTab === "maps" && isMaster && !matchStarted && (
  <MapsTabContent>
    {mapsPending && <p>Carregando mapas...</p>}
    {(maps ?? []).map((m) => {
      const isAttached = matchMap?.mapUuid === m.id;
      return (
        <MapCardRow key={m.id}>
          <MapCard map={m} />
          <MapCardActions>
            {isAttached ? (
              <>
                <AttachedBadge>Anexado</AttachedBadge>
                <DetachButton
                  type="button"
                  onClick={() => detachMap()}
                  disabled={isDetaching}
                >
                  Desanexar
                </DetachButton>
              </>
            ) : (
              <AttachButton
                type="button"
                onClick={() => attachMap(m.id)}
                disabled={isAttaching}
              >
                Anexar
              </AttachButton>
            )}
          </MapCardActions>
        </MapCardRow>
      );
    })}
  </MapsTabContent>
)}
```

Adicionar os styled-components necessários ao arquivo (seguindo os tokens existentes):

```ts
const MapsTabContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 0;
`;

const MapCardRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const MapCardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

const AttachedBadge = styled.span`
  font-family: ${fonts.sans};
  font-size: 11px;
  font-weight: 700;
  color: ${colors.brandAccent};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const AttachButton = styled.button`
  font-family: ${fonts.sans};
  font-size: 12px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid ${colors.brandAccent};
  background: transparent;
  color: ${colors.brandAccent};
  cursor: pointer;
  transition: background 0.15s;
  &:hover:not(:disabled) { background: ${colors.brandAccent}22; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const DetachButton = styled.button`
  font-family: ${fonts.sans};
  font-size: 12px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid ${colors.danger}55;
  background: transparent;
  color: ${colors.danger};
  cursor: pointer;
  transition: background 0.15s;
  &:hover:not(:disabled) { background: ${colors.danger}11; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
```

- [ ] **Step 4: Adicionar MSW handlers e testes no `MatchPage.test.tsx`**

No arquivo de testes existente, adicionar os handlers MSW para os novos endpoints e dois testes:

```ts
// Adicionar nos handlers MSW do server de testes:
http.get(`${baseUrl}/matches/:matchId/map`, () =>
  HttpResponse.json({ match_map: null }, { status: 204 })
),
```

Adicionar testes:

```ts
describe("MatchPage — mapa", () => {
  it("exibe botão Anexar quando nenhum mapa está anexado", async () => {
    server.use(
      http.get(`${baseUrl}/campaigns/:cid/maps`, () =>
        HttpResponse.json({ maps: [{ id: "map-1", name: "Floresta", grid: mockGrid, pieces: [], walls: [], decorations: [], items: [], created_at: "", updated_at: "" }] })
      ),
      http.get(`${baseUrl}/matches/:id/map`, () => new HttpResponse(null, { status: 204 })),
    );
    renderWithProviders(<MatchPage />, { routePath: "/campaigns/:campaignId/matches/:matchId", currentPath: `/campaigns/${campaignFixture.uuid}/matches/${matchFixture.uuid}`, user: masterUserFixture });
    // Navegar para aba Mapas
    await userEvent.click(await screen.findByRole("tab", { name: /mapas/i }));
    expect(await screen.findByRole("button", { name: /anexar/i })).toBeInTheDocument();
  });

  it("exibe badge Anexado e botão Desanexar quando mapa está anexado", async () => {
    server.use(
      http.get(`${baseUrl}/campaigns/:cid/maps`, () =>
        HttpResponse.json({ maps: [{ id: "map-1", name: "Floresta", grid: mockGrid, pieces: [], walls: [], decorations: [], items: [], created_at: "", updated_at: "" }] })
      ),
      http.get(`${baseUrl}/matches/:id/map`, () =>
        HttpResponse.json({ match_map: { match_uuid: matchFixture.uuid, map_uuid: "map-1", attached_at: "" } })
      ),
    );
    renderWithProviders(<MatchPage />, { routePath: "/campaigns/:campaignId/matches/:matchId", currentPath: `/campaigns/${campaignFixture.uuid}/matches/${matchFixture.uuid}`, user: masterUserFixture });
    await userEvent.click(await screen.findByRole("tab", { name: /mapas/i }));
    expect(await screen.findByText(/anexado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desanexar/i })).toBeInTheDocument();
  });
});
```

Nota: adaptar `mockGrid`, `matchFixture`, `campaignFixture`, `masterUserFixture` aos fixtures existentes no projeto.

- [ ] **Step 5: Rodar os testes do MatchPage**

```bash
npx vitest run src/pages/__tests__/MatchPage.test.tsx
```

Esperado: todos passam.

- [ ] **Step 6: Commit**

```bash
git add src/pages/MatchPage.tsx src/pages/__tests__/MatchPage.test.tsx
git commit -m "feat(match-page): add attach/detach map UI in Maps tab"
```

---

## Task 7: `LobbyPage` — mapa + posicionamento + save-on-start

**Files:**
- Modify: `src/pages/LobbyPage.tsx`
- Modify: `src/pages/__tests__/LobbyPage.test.tsx`

- [ ] **Step 1: Adicionar imports em `LobbyPage.tsx`**

```ts
import { useState, useEffect, useCallback } from "react"; // já existem; garantir que useCallback está
import { useMatchMap } from "../hooks/useMatchMap";
import { useMap } from "../hooks/useMap";
import { mapsService } from "../services/mapsService";
import TacticalMapPlacer from "../features/tactical-map/TacticalMapPlacer";
import type { Piece, SlotCoord } from "../types/tacticalMap";
```

- [ ] **Step 2: Adicionar queries e estado de peças no corpo do componente**

Logo após os hooks existentes (`useMatchDetails`, `useMatchEnrollments`, `useLobbyWs`):

```ts
  const { data: matchMap } = useMatchMap(token, matchId);
  const { data: fullMap } = useMap(token, matchMap?.mapUuid);

  const [lobbyPieces, setLobbyPieces] = useState<Piece[]>([]);
  const [mapSaveError, setMapSaveError] = useState<string | null>(null);

  // Initialize pieces from loaded map (runs when map changes).
  useEffect(() => {
    if (fullMap) setLobbyPieces(fullMap.pieces);
  }, [fullMap?.id]);
```

- [ ] **Step 3: Adicionar `onPieceMoved` callback para o WS**

```ts
  const handleWsPieceMoved = useCallback((pieceId: string, slot: SlotCoord) => {
    setLobbyPieces((prev) =>
      prev.map((p) => (p.id === pieceId ? { ...p, coord: { ...p.coord, slot } } : p)),
    );
  }, []);
```

- [ ] **Step 4: Passar `onPieceMoved` ao `useLobbyWs`**

Localizar a chamada de `useLobbyWs` e adicionar:

```ts
  const { status, participants, sendStartMatch, sendKick, sendCancelLobby, sendPieceMoved } =
    useLobbyWs({
      matchUuid: matchId ?? "",
      token: token ?? "",
      nickname: user?.nick ?? "",
      userUuid: user?.uuid,
      enabled: lobbyEnabled,
      onMatchStarted: () =>
        navigate(`/campaigns/${campaignId}/matches/${matchId}/game`),
      onKicked: () => setIsKicked(true),
      onPieceMoved: handleWsPieceMoved,  // ← adicionar
    });
```

- [ ] **Step 5: Calcular `draggablePieceIds`**

```ts
  const draggablePieceIds: Set<string> | undefined = useMemo(() => {
    if (isMaster) return undefined; // master: todos draggable
    // player: só a própria peça
    const playerPiece = lobbyPieces.find((p) =>
      enrollments.some(
        (e) => e.player?.uuid === user?.uuid && e.characterSheet.uuid === p.characterId,
      ),
    );
    return playerPiece ? new Set([playerPiece.id]) : new Set<string>();
  }, [isMaster, lobbyPieces, enrollments, user?.uuid]);
```

Adicionar `useMemo` ao import do React se ainda não estiver.

- [ ] **Step 6: Modificar `handleStartMatch` para salvar peças**

Substituir o clique direto em `sendStartMatch` por uma função que salva primeiro:

```ts
  const handleStartMatch = async () => {
    setMapSaveError(null);
    if (fullMap && lobbyPieces.length > 0) {
      try {
        await mapsService.updateMap(token!, fullMap.id, { pieces: lobbyPieces });
      } catch {
        setMapSaveError("Não foi possível salvar as posições. Tente novamente.");
        return;
      }
    }
    sendStartMatch();
  };
```

Localizar onde `sendStartMatch` é chamado (botão "Iniciar Partida") e substituir por `handleStartMatch`.

- [ ] **Step 7: Renderizar o mapa no conteúdo central**

No JSX, dentro do bloco de conteúdo principal (após os controles de lobby existentes), adicionar:

```tsx
{fullMap && (
  <LobbyMapSection>
    <TacticalMapPlacer
      map={fullMap}
      campaignId={campaignId!}
      pieces={lobbyPieces}
      onPiecesChange={setLobbyPieces}
      sendPieceMoved={sendPieceMoved}
      draggablePieceIds={draggablePieceIds}
    />
  </LobbyMapSection>
)}
{mapSaveError && (
  <MapSaveError>{mapSaveError}</MapSaveError>
)}
```

Adicionar styled-components:

```ts
const LobbyMapSection = styled.div`
  width: 100%;
  height: min(60vh, 500px);
  margin-top: 16px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid ${colors.borderInput};
`;

const MapSaveError = styled.p`
  font-family: ${fonts.sans};
  font-size: 13px;
  color: ${colors.danger};
  margin-top: 8px;
`;
```

- [ ] **Step 8: Adicionar testes em `LobbyPage.test.tsx`**

No arquivo de testes existente, adicionar handlers MSW e testes:

```ts
// Handlers MSW adicionais
const mapFixture = {
  id: "map-1", name: "Floresta", campaign_id: "camp-1",
  grid: { kind: "square", cols: 10, rows: 10, cell_size: 64, skew_ratio: 1, rotation: 0, color: "#fff", opacity: 0.5, line_style: "solid" },
  bg: null, pieces: [], walls: [], decorations: [], items: [],
  created_at: "", updated_at: "",
};

// Nos testes, usar:
server.use(
  http.get(`${baseUrl}/matches/:id/map`, () =>
    HttpResponse.json({ match_map: { match_uuid: matchFixture.uuid, map_uuid: "map-1", attached_at: "" } })
  ),
  http.get(`${baseUrl}/maps/map-1`, () => HttpResponse.json({ map: mapFixture })),
);

it("renderiza o TacticalMapPlacer quando há mapa anexado", async () => {
  // ... setup com handlers acima
  renderWithProviders(<LobbyPage />, { ... });
  await waitForWsConnect();
  simulateWsOpen();
  sendFromServer("room_state", { players: [], match_uuid: matchFixture.uuid, state: "lobby" });
  // TacticalMapStage é mockado em vitest.setup — verifica apenas que o placer renderizou
  await screen.findByTestId("tactical-map-placer"); // ou outra âncora disponível
});

it("não renderiza o mapa quando não há mapa anexado (204)", async () => {
  server.use(
    http.get(`${baseUrl}/matches/:id/map`, () => new HttpResponse(null, { status: 204 })),
  );
  renderWithProviders(<LobbyPage />, { ... });
  await waitForWsConnect();
  simulateWsOpen();
  sendFromServer("room_state", { players: [], match_uuid: matchFixture.uuid, state: "lobby" });
  await waitFor(() => expect(screen.queryByTestId("tactical-map-placer")).not.toBeInTheDocument());
});

it("handleStartMatch salva peças antes de enviar start_match", async () => {
  let updateMapCalled = false;
  server.use(
    http.get(`${baseUrl}/matches/:id/map`, () =>
      HttpResponse.json({ match_map: { match_uuid: matchFixture.uuid, map_uuid: "map-1", attached_at: "" } })
    ),
    http.get(`${baseUrl}/maps/map-1`, () => HttpResponse.json({ map: { ...mapFixture, pieces: [{ id: "p1", character_id: "c1", coord: { slot: { kind: "square", col: 0, row: 0 }, z: 0 }, visible: true }] } })),
    http.put(`${baseUrl}/maps/map-1`, () => {
      updateMapCalled = true;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  renderWithProviders(<LobbyPage />, { ... });
  await waitForWsConnect();
  simulateWsOpen();
  sendFromServer("room_state", { players: [], match_uuid: matchFixture.uuid, state: "lobby" });
  // Clicar no botão "Iniciar Partida" (visível apenas para o master)
  const startBtn = await screen.findByRole("button", { name: /iniciar partida/i });
  await userEvent.click(startBtn);
  await waitFor(() => expect(updateMapCalled).toBe(true));
  expect(wsInstance.send).toHaveBeenCalledWith(
    expect.stringContaining("start_match"),
  );
});
```

Nota: adicionar `data-testid="tactical-map-placer"` ao `PlacerRoot` em `TacticalMapPlacer.tsx` para facilitar os testes.

- [ ] **Step 9: Adicionar `data-testid` ao PlacerRoot em `TacticalMapPlacer.tsx`**

```tsx
const PlacerRoot = styled.div.attrs({ "data-testid": "tactical-map-placer" })`
  ...
`;
```

- [ ] **Step 10: Rodar os testes do LobbyPage**

```bash
npx vitest run src/pages/__tests__/LobbyPage.test.tsx
```

Esperado: todos passam.

- [ ] **Step 11: Commit**

```bash
git add src/pages/LobbyPage.tsx src/pages/__tests__/LobbyPage.test.tsx src/features/tactical-map/TacticalMapPlacer.tsx
git commit -m "feat(lobby): add map placement section with WS sync and save-on-start"
```

---

## Task 8: `GamePageTemplate` + `GamePage`

**Files:**
- Create: `src/components/templates/GamePageTemplate.tsx`
- Modify: `src/pages/GamePage.tsx`
- Create: `src/pages/__tests__/GamePage.test.tsx`

- [ ] **Step 1: Criar `GamePageTemplate.tsx`**

```tsx
// src/components/templates/GamePageTemplate.tsx
import { useState } from "react";
import type { ReactNode } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";

type Props = {
  sidebar: ReactNode;
  children: ReactNode;
};

export default function GamePageTemplate({ sidebar, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Root>
      <CanvasArea>{children}</CanvasArea>
      <SidebarOverlay $open={sidebarOpen} onClick={() => setSidebarOpen(false)} />
      <SidebarPanel $open={sidebarOpen}>
        <SidebarHeader>
          <CloseButton type="button" onClick={() => setSidebarOpen(false)} aria-label="Fechar painel">
            ✕
          </CloseButton>
        </SidebarHeader>
        {sidebar}
      </SidebarPanel>
      <ToggleButton
        type="button"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Abrir painel"
      >
        ☰
      </ToggleButton>
    </Root>
  );
}

const Root = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  background: ${colors.surfaceCanvas ?? "#1a1a1a"};
  overflow: hidden;
`;

const CanvasArea = styled.div`
  flex: 1;
  min-width: 0;
  height: 100%;
`;

const SidebarOverlay = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 10;
  display: ${({ $open }) => ($open ? "block" : "none")};
  @media (min-width: 768px) {
    display: none;
  }
`;

const SidebarPanel = styled.div<{ $open: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 260px;
  background: ${colors.surfaceSidebar};
  z-index: 11;
  display: flex;
  flex-direction: column;
  transform: ${({ $open }) => ($open ? "translateX(0)" : "translateX(100%)")};
  transition: transform 0.25s ease;
  @media (min-width: 768px) {
    position: relative;
    transform: translateX(0);
    flex-shrink: 0;
  }
`;

const SidebarHeader = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 8px;
  border-bottom: 1px solid ${colors.borderInput};
  @media (min-width: 768px) {
    display: none;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${colors.textPrimary};
  font-size: 16px;
  cursor: pointer;
`;

const ToggleButton = styled.button`
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 20;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid ${colors.borderInput};
  background: ${colors.surfaceSidebar};
  color: ${colors.textPrimary};
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  @media (min-width: 768px) {
    display: none;
  }
`;
```

Nota: se `colors.surfaceCanvas` não existir em `tokens.ts`, usar `"#1a1a1a"` diretamente ou adicionar o token. Verificar o arquivo de tokens antes.

- [ ] **Step 2: Verificar tokens disponíveis**

```bash
grep -n "surfaceCanvas\|surface" src/styles/tokens.ts | head -20
```

Se `surfaceCanvas` não existir, usar a cor mais próxima disponível (ex: `colors.surfaceSidebar` ou `colors.background`). Ou adicionar o token em `tokens.ts`.

- [ ] **Step 3: Reescrever `GamePage.tsx`**

```tsx
// src/pages/GamePage.tsx
import { useRef } from "react";
import { Navigate, useParams } from "react-router-dom";
import styled from "styled-components";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import { useMatchMap } from "../hooks/useMatchMap";
import { useMap } from "../hooks/useMap";
import { useMatchParticipants } from "../hooks/useMatchParticipants";
import { useMatchDetails } from "../hooks/useMatchDetails";
import { LoadingContainer } from "../components/atoms/PageStates";
import GamePageTemplate from "../components/templates/GamePageTemplate";
import TacticalMapViewer from "../features/tactical-map/TacticalMapViewer";
import { useResizeObserver } from "../hooks/useResizeObserver";
import { colors, fonts } from "../styles/tokens";

export default function GamePage() {
  const { campaignId, matchId } = useParams<{
    campaignId: string;
    matchId: string;
  }>();
  const { token } = useToken();
  const { user } = useUser();

  const { data: match } = useMatchDetails(token, matchId);
  const { data: matchMap, isPending: matchMapPending } = useMatchMap(token, matchId);
  const { data: map, isPending: mapPending } = useMap(
    token,
    matchMap?.mapUuid,
  );
  const { data: participants = [] } = useMatchParticipants(token, matchId, true);

  const canvasRef = useRef<HTMLDivElement>(null);
  const { width, height } = useResizeObserver(canvasRef);

  if (!token) return <Navigate to="/" replace />;

  const isMaster = !!match && match.masterUuid === user?.uuid;
  const isLoading = matchMapPending || (!!matchMap && mapPending);

  if (isLoading) {
    return <LoadingContainer>Carregando partida...</LoadingContainer>;
  }

  const sidebar = (
    <ParticipantsList>
      <ParticipantsTitle>Participantes</ParticipantsTitle>
      {participants.map((p) => {
        const isMasterParticipant = p.characterSheet.uuid === match?.masterUuid;
        return (
          <ParticipantItem key={p.uuid}>
            <ParticipantName>{p.characterSheet.nickName}</ParticipantName>
            {isMasterParticipant && <MasterBadge>Mestre</MasterBadge>}
            {p.leftAt && <LeftBadge>Saiu</LeftBadge>}
          </ParticipantItem>
        );
      })}
      {isMaster && <MasterNote>Você é o Mestre</MasterNote>}
    </ParticipantsList>
  );

  return (
    <GamePageTemplate sidebar={sidebar}>
      <CanvasContainer ref={canvasRef}>
        {!matchMap && (
          <NoMapMessage>Nenhum mapa anexado a esta partida.</NoMapMessage>
        )}
        {map && width > 0 && height > 0 && (
          <TacticalMapViewer map={map} width={width} height={height} />
        )}
      </CanvasContainer>
    </GamePageTemplate>
  );
}

const CanvasContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
`;

const NoMapMessage = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${colors.textMuted};
  font-family: ${fonts.sans};
  font-size: 16px;
`;

const ParticipantsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  overflow-y: auto;
`;

const ParticipantsTitle = styled.h3`
  font-family: ${fonts.sans};
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${colors.textDisabled};
  margin: 0 0 8px;
`;

const ParticipantItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  border-bottom: 1px solid ${colors.borderInput};
`;

const ParticipantName = styled.span`
  font-family: ${fonts.sans};
  font-size: 13px;
  color: ${colors.textPrimary};
  flex: 1;
`;

const MasterBadge = styled.span`
  font-family: ${fonts.sans};
  font-size: 10px;
  font-weight: 700;
  color: ${colors.brandAccent};
  text-transform: uppercase;
`;

const LeftBadge = styled.span`
  font-family: ${fonts.sans};
  font-size: 10px;
  color: ${colors.textMuted};
`;

const MasterNote = styled.p`
  font-family: ${fonts.sans};
  font-size: 12px;
  color: ${colors.brandAccent};
  margin-top: 12px;
  text-align: center;
`;
```

- [ ] **Step 4: Criar `GamePage.test.tsx`**

```tsx
// src/pages/__tests__/GamePage.test.tsx
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { matchFixture } from "../../test/fixtures/match";
import { userFixture } from "../../test/fixtures/user";
import GamePage from "../GamePage";

const baseUrl = "http://localhost:5000";
const mapFixture = {
  id: "map-1", name: "Floresta", campaign_id: "camp-1",
  grid: { kind: "square", cols: 10, rows: 10, cell_size: 64, skew_ratio: 1, rotation: 0, color: "#fff", opacity: 0.5, line_style: "solid" },
  bg: null, pieces: [], walls: [], decorations: [], items: [],
  created_at: "", updated_at: "",
};

describe("GamePage", () => {
  it("exibe mensagem quando nenhum mapa está anexado (204)", async () => {
    server.use(
      http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json({ match: matchFixture })),
      http.get(`${baseUrl}/matches/:id/map`, () => new HttpResponse(null, { status: 204 })),
      http.get(`${baseUrl}/matches/:id/participants`, () => HttpResponse.json({ participants: [] })),
    );
    renderWithProviders(<GamePage />, {
      routePath: "/campaigns/:campaignId/matches/:matchId/game",
      currentPath: `/campaigns/camp-1/matches/${matchFixture.uuid}/game`,
      user: userFixture,
    });
    expect(await screen.findByText(/nenhum mapa anexado/i)).toBeInTheDocument();
  });

  it("renderiza TacticalMapViewer quando há mapa anexado", async () => {
    server.use(
      http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json({ match: matchFixture })),
      http.get(`${baseUrl}/matches/:id/map`, () =>
        HttpResponse.json({ match_map: { match_uuid: matchFixture.uuid, map_uuid: "map-1", attached_at: "" } })
      ),
      http.get(`${baseUrl}/maps/map-1`, () => HttpResponse.json({ map: mapFixture })),
      http.get(`${baseUrl}/matches/:id/participants`, () => HttpResponse.json({ participants: [] })),
    );
    renderWithProviders(<GamePage />, {
      routePath: "/campaigns/:campaignId/matches/:matchId/game",
      currentPath: `/campaigns/camp-1/matches/${matchFixture.uuid}/game`,
      user: userFixture,
    });
    // TacticalMapViewer é wrappado por TacticalMapStage, que é mockado no vitest.setup.
    // Verificamos que o loading desaparece e nenhum erro aparece.
    await waitFor(() =>
      expect(screen.queryByText(/carregando partida/i)).not.toBeInTheDocument(),
    );
    // Nenhuma mensagem de "nenhum mapa" quando mapa está carregado
    expect(screen.queryByText(/nenhum mapa anexado/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Rodar os testes da GamePage**

```bash
npx vitest run src/pages/__tests__/GamePage.test.tsx
```

Esperado: todos passam.

- [ ] **Step 6: Build de produção**

```bash
npm run build 2>&1 | head -40
```

Esperado: sem erros de TS.

- [ ] **Step 7: Commit**

```bash
git add src/components/templates/GamePageTemplate.tsx \
        src/pages/GamePage.tsx \
        src/pages/__tests__/GamePage.test.tsx
git commit -m "feat(game-page): full-screen viewer with collapsible sidebar + GamePageTemplate"
```

---

## Task 9: Smoke test visual + PR

- [ ] **Step 1: Rodar todos os testes**

```bash
npx vitest run
```

Esperado: todos passam.

- [ ] **Step 2: Smoke test manual no browser**

```bash
# A partir de System_X_System_Project/:
./dev-checkout.sh feat/tactical-map-fase-6
```

Verificar:
- [ ] `MatchPage` aba Mapas: mapa sem anexo → botão "Anexar" visível. Clicar → badge "Anexado" aparece, botão vira "Desanexar".
- [ ] `LobbyPage` de partida com mapa: mapa aparece no conteúdo central. Como mestre: drag de peças funciona. Como jogador (outra aba): apenas peça própria é arrastável.
- [ ] `LobbyPage`: mestre clica "Iniciar Partida" → spinning → todos navegam para `/game`.
- [ ] `GamePage`: mapa aparece em tela cheia. Toggle abre/fecha sidebar. Mobile: sidebar fechada por padrão.
- [ ] `GamePage` sem mapa: mensagem "Nenhum mapa anexado" aparece.

- [ ] **Step 3: Push e PR**

```bash
git push -u origin feat/tactical-map-fase-6
```

```bash
gh pr create \
  --title "feat(tactical-map): fase 6 — GamePage, lobby placement, match-maps" \
  --body "$(cat <<'EOF'
## Summary
- `MatchPage` aba Mapas: botões Anexar/Desanexar (hooks + service)
- `LobbyPage`: mapa interativo com `TacticalMapPlacer`; mestre move tudo, jogador move peça própria; sync via `lobby_piece_moved` WS; salva posições antes de iniciar partida
- `GamePage`: substitui placeholder — full-screen `TacticalMapViewer` + sidebar colapsável
- `GamePageTemplate`: novo template tela cheia
- `TacticalMapStage`: prop `draggablePieceIds` (regra escoteiro)
- `useLobbyWs`: `sendPieceMoved` + `onPieceMoved`

## Test plan
- [ ] `npx vitest run` — todos passam
- [ ] `npm run build` — sem erros TS
- [ ] Smoke: attach/detach na MatchPage
- [ ] Smoke: lobby com mapa, drag de peças, sync entre duas abas
- [ ] Smoke: iniciar partida → GamePage mostra mapa com posições

Cross-link: PR backend feat/tactical-map-fase-6

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

Cobertura do spec `2026-06-04-tactical-map-fase-6-design.md`:

| Requisito do spec | Task |
|---|---|
| MatchMapResponse + service methods | Task 1 |
| useMatchMap / useAttachMatchMap / useDetachMatchMap | Task 2 |
| TacticalMapStage.draggablePieceIds | Task 3 |
| useLobbyWs sendPieceMoved + onPieceMoved | Task 4 |
| TacticalMapPlacer (reuso Stage + NpcRosterPanel) | Task 5 |
| MatchPage attach/detach UI | Task 6 |
| LobbyPage mapa + pieces state + WS callback + save-on-start | Task 7 |
| GamePageTemplate + GamePage | Task 8 |
| Testes | Tasks 2–8 |

Inconsistências verificadas:
- `sendPieceMoved` retornado por `useLobbyWs` → usado em `TacticalMapPlacer` ✓
- `draggablePieceIds?: Set<string>` no Stage → consumido pelo Placer ✓
- `fullMap.id` referenciado em `updateMap` → string UUID ✓ (consistente com `mapsService.updateMap(token, mapId, data)`)
- `matchMap?.mapUuid` (camelCase) → vindo de `objToCamelCase(res.match_map)` ✓
