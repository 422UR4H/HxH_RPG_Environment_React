# Tactical Map Fase 1 — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add maps service, React Query hooks, PageTabNav organism, MapCard molecule, tabs to CampaignPage and MatchPage, CreateMapPage, EditMapPage placeholder, and tests so the master can create a map and see it listed.

**Architecture:** Thin service layer with snake↔camel conversion at the HTTP boundary, React Query for server state keyed by `["maps", campaignId, token]`, URL-based tab state via `useSearchParams` (`?tab=`). `PageTabNav` is an organism that renders `null` when `tabs.length <= 1`. CampaignPage gets a master-only "Mapas" tab; MatchPage gets a "Mapas" tab gated on role and `storyEndAt`. Tab state lives in the URL so the browser back button and sharing work naturally.

**Tech Stack:** React 18 + TypeScript, React Query v5 (`@tanstack/react-query`), react-router-dom v6, styled-components, MSW v2 + Vitest + RTL for tests.

---

### Task 1: mapsService

**Files:**
- Create: `src/services/mapsService.ts`

- [ ] **Step 1: Write mapsService.ts**

```ts
// src/services/mapsService.ts
import { httpClient } from "./httpClient";
import { objToCamelCase, objToSnakeCase } from "../utils/caseConverter";
import config from "./config";
import type { TacticalMap } from "../types/tacticalMap";

export const mapsService = {
  createMap: (
    token: string,
    campaignId: string,
    data: { name: string; description?: string },
  ): Promise<TacticalMap> =>
    httpClient
      .post<{ map: TacticalMap }>(
        `/campaigns/${campaignId}/maps`,
        objToSnakeCase(data),
        config(token),
      )
      .then(({ data: res }) => objToCamelCase<TacticalMap>(res.map)),

  listMaps: (token: string, campaignId: string): Promise<TacticalMap[]> =>
    httpClient
      .get<{ maps: TacticalMap[] }>(
        `/campaigns/${campaignId}/maps`,
        config(token),
      )
      .then(({ data: res }) =>
        objToCamelCase<{ maps: TacticalMap[] }>(res).maps ?? [],
      ),

  getMap: (token: string, mapId: string): Promise<TacticalMap> =>
    httpClient
      .get<{ map: TacticalMap }>(`/maps/${mapId}`, config(token))
      .then(({ data: res }) => objToCamelCase<TacticalMap>(res.map)),

  updateMap: (
    token: string,
    mapId: string,
    data: object,
  ): Promise<TacticalMap> =>
    httpClient
      .put<{ map: TacticalMap }>(
        `/maps/${mapId}`,
        objToSnakeCase(data),
        config(token),
      )
      .then(({ data: res }) => objToCamelCase<TacticalMap>(res.map)),

  deleteMap: (token: string, mapId: string): Promise<void> =>
    httpClient
      .delete(`/maps/${mapId}`, config(token))
      .then(() => undefined),
};
```

- [ ] **Step 2: Verify types**

Run: `npm run build 2>&1 | head -30`
Expected: no TypeScript errors related to mapsService

- [ ] **Step 3: Commit**

```bash
git add src/services/mapsService.ts
git commit -m "feat: add mapsService with CRUD operations"
```

---

### Task 2: Query hooks — useMaps + useMap

**Files:**
- Create: `src/hooks/useMaps.ts`
- Create: `src/hooks/useMap.ts`

- [ ] **Step 1: Write useMaps.ts**

```ts
// src/hooks/useMaps.ts
import { useQuery } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";
import type { TacticalMap } from "../types/tacticalMap";

export function useMaps(token: string | null, campaignId: string | undefined) {
  return useQuery<TacticalMap[]>({
    queryKey: ["maps", campaignId, token],
    queryFn: () => mapsService.listMaps(token!, campaignId!),
    enabled: !!token && !!campaignId,
    retry: 1,
  });
}
```

- [ ] **Step 2: Write useMap.ts**

```ts
// src/hooks/useMap.ts
import { useQuery } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";
import type { TacticalMap } from "../types/tacticalMap";

export function useMap(token: string | null, mapId: string | undefined) {
  return useQuery<TacticalMap>({
    queryKey: ["map", mapId, token],
    queryFn: () => mapsService.getMap(token!, mapId!),
    enabled: !!token && !!mapId,
    retry: 1,
  });
}
```

- [ ] **Step 3: Verify types**

Run: `npm run build 2>&1 | head -30`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useMaps.ts src/hooks/useMap.ts
git commit -m "feat: add useMaps and useMap query hooks"
```

---

### Task 3: Mutation hooks — useCreateMap, useUpdateMap, useDeleteMap

**Files:**
- Create: `src/hooks/useCreateMap.ts`
- Create: `src/hooks/useUpdateMap.ts`
- Create: `src/hooks/useDeleteMap.ts`

- [ ] **Step 1: Write useCreateMap.ts**

```ts
// src/hooks/useCreateMap.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";

export function useCreateMap(
  token: string | null,
  campaignId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      mapsService.createMap(token!, campaignId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["maps", campaignId, token],
      });
    },
  });
}
```

- [ ] **Step 2: Write useUpdateMap.ts**

```ts
// src/hooks/useUpdateMap.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";

export function useUpdateMap(
  token: string | null,
  campaignId: string | undefined,
  mapId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => mapsService.updateMap(token!, mapId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maps", campaignId, token] });
      queryClient.invalidateQueries({ queryKey: ["map", mapId, token] });
    },
  });
}
```

- [ ] **Step 3: Write useDeleteMap.ts**

```ts
// src/hooks/useDeleteMap.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mapsService } from "../services/mapsService";

export function useDeleteMap(
  token: string | null,
  campaignId: string | undefined,
  mapId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => mapsService.deleteMap(token!, mapId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maps", campaignId, token] });
    },
  });
}
```

- [ ] **Step 4: Verify types**

Run: `npm run build 2>&1 | head -30`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCreateMap.ts src/hooks/useUpdateMap.ts src/hooks/useDeleteMap.ts
git commit -m "feat: add useCreateMap, useUpdateMap, useDeleteMap mutation hooks"
```

---

### Task 4: PageTabNav organism

**Files:**
- Create: `src/components/organisms/PageTabNav.tsx`

- [ ] **Step 1: Write PageTabNav.tsx**

```tsx
// src/components/organisms/PageTabNav.tsx
import { useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";

type Tab = { id: string; label: string };

interface PageTabNavProps {
  tabs: Tab[];
}

export default function PageTabNav({ tabs }: PageTabNavProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  if (tabs.length <= 1) return null;

  const activeTab = searchParams.get("tab") ?? tabs[0].id;

  return (
    <Nav>
      {tabs.map((tab) => (
        <TabButton
          key={tab.id}
          $active={activeTab === tab.id}
          onClick={() => setSearchParams({ tab: tab.id }, { replace: true })}
        >
          {tab.label}
        </TabButton>
      ))}
    </Nav>
  );
}

const Nav = styled.nav`
  display: flex;
  gap: 4px;
  border-bottom: 2px solid ${colors.borderDivider};
  margin-bottom: 24px;
`;

const TabButton = styled.button<{ $active: boolean }>`
  font-family: ${fonts.sans};
  font-size: 16px;
  font-weight: ${({ $active }) => ($active ? "700" : "400")};
  color: ${({ $active }) =>
    $active ? colors.textPrimary : colors.textPlaceholderStrong};
  background: none;
  border: none;
  border-bottom: 3px solid
    ${({ $active }) => ($active ? colors.brandAccent : "transparent")};
  padding: 10px 20px;
  margin-bottom: -2px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;

  &:hover {
    color: ${colors.textPrimary};
  }
`;
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | head -30`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/organisms/PageTabNav.tsx
git commit -m "feat: add PageTabNav organism with URL-based tab state"
```

---

### Task 5: MapCard molecule

**Files:**
- Create: `src/components/molecules/MapCard.tsx`

- [ ] **Step 1: Write MapCard.tsx**

```tsx
// src/components/molecules/MapCard.tsx
import styled from "styled-components";
import type { TacticalMap } from "../../types/tacticalMap";
import { colors, fonts } from "../../styles/tokens";

interface MapCardProps {
  map: TacticalMap;
  onClick: () => void;
}

export default function MapCard({ map, onClick }: MapCardProps) {
  return (
    <Card onClick={onClick}>
      <MapName>{map.name}</MapName>
      {map.description && (
        <MapDescription>{map.description}</MapDescription>
      )}
    </Card>
  );
}

const Card = styled.button`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  background-color: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background-color 0.15s;

  &:hover {
    background-color: ${colors.surfaceInputHover};
  }
`;

const MapName = styled.h3`
  font-family: ${fonts.sans};
  font-size: 18px;
  font-weight: 700;
  color: ${colors.textPrimary};
  margin: 0;
`;

const MapDescription = styled.p`
  font-family: ${fonts.sans};
  font-size: 14px;
  color: ${colors.textMuted};
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | head -30`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/molecules/MapCard.tsx
git commit -m "feat: add MapCard molecule"
```

---

### Task 6: CampaignPage — tabs integration

**Files:**
- Modify: `src/pages/CampaignPage.tsx`

The changes are:
1. Add `useSearchParams` to the react-router-dom import line
2. Add imports for `useMaps`, `PageTabNav`, `MapCard`
3. Add hooks and computed vars below the existing hooks
4. Refactor the JSX content: wrap matches list+actions in a tab check; add maps tab
5. Add two new styled components: `MapsGrid`, `MapsEmptyText`

- [ ] **Step 1: Add imports**

In `src/pages/CampaignPage.tsx`, update the react-router-dom import line (currently on line 2):

Old:
```tsx
import { useParams, useNavigate, useLocation } from "react-router-dom";
```

New:
```tsx
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
```

Add after the existing imports (after the `isApiError` import):
```tsx
import { useMaps } from "../hooks/useMaps";
import PageTabNav from "../components/organisms/PageTabNav";
import MapCard from "../components/molecules/MapCard";
```

- [ ] **Step 2: Add hooks and computed vars**

After `const isMaster = campaign?.masterUuid === user?.uuid;` (currently ~line 59), add:

```tsx
  const [searchParams] = useSearchParams();

  const availableTabs = isMaster
    ? [
        { id: "matches", label: "Partidas" },
        { id: "maps", label: "Mapas" },
      ]
    : [{ id: "matches", label: "Partidas" }];

  const rawTab = searchParams.get("tab");
  const activeTab = availableTabs.some((t) => t.id === rawTab)
    ? rawTab!
    : "matches";

  const { data: maps, isPending: mapsPending } = useMaps(
    token,
    isMaster ? id : undefined,
  );
```

- [ ] **Step 3: Refactor JSX — wrap matches content in tab check**

Inside the `DetailPageTemplate` children, after the `<CampaignDate>Início: ...` block, currently there is `<MatchesList>`, `<ActionsList>`, and `{deleteError && ...}`. Wrap those three in a tab condition and add PageTabNav before them, and add the maps tab:

Replace the section from `<MatchesList>` to the end of `{deleteError && ...}` with:

```tsx
        <PageTabNav tabs={availableTabs} />

        {activeTab === "matches" && (
          <>
            <MatchesList>
              {(campaign.matches ?? []).map((match) => (
                <MatchItem
                  key={match.uuid}
                  match={match}
                  onClick={() =>
                    navigate(
                      `/campaigns/${campaign.uuid}/matches/${match.uuid}`,
                      { state: { sheetId: playerSheetId } },
                    )
                  }
                />
              ))}
            </MatchesList>

            <ActionsList>
              {isMaster ? (
                <BottomActions
                  containerRef={mainContentRef}
                  contentChangeSignal={descriptionSignal}
                  manage={{
                    isFree: !hasStartedMatch,
                    deleteDisabledReason: hasStartedMatch
                      ? "Partida iniciada existente"
                      : undefined,
                    onEdit: handleEdit,
                    onDelete: handleDelete,
                    confirmMessage:
                      "Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita.",
                  }}
                  primaryButton={{
                    label: "Criar Partida",
                    onClick: handleCreateMatch,
                  }}
                />
              ) : !submitted && sheetId ? (
                <>
                  <AdaptiveActionButton
                    label={submitPending ? "Submetendo..." : "Submeter Ficha"}
                    type="match"
                    onClick={submitPending ? () => {} : handleRequestSubmit}
                    containerRef={mainContentRef}
                    contentChangeSignal={descriptionSignal}
                  />
                  {nickConflictError && (
                    <NickConflictMessage>
                      Já existe um personagem com o nick &quot;{sheetNick}&quot;
                      nesta campanha. Escolha outro nick antes de submeter.
                    </NickConflictMessage>
                  )}
                  {submitFailed && !nickConflictError && (
                    <NickConflictMessage>
                      {isApiError(submitError, 409)
                        ? `Já existe um personagem com o nick "${sheetNick}" nesta campanha. Escolha outro nick antes de submeter.`
                        : "Erro ao submeter ficha. Tente novamente."}
                    </NickConflictMessage>
                  )}
                </>
              ) : null}
            </ActionsList>

            {deleteError && <DeleteErrorMessage>{deleteError}</DeleteErrorMessage>}
          </>
        )}

        {activeTab === "maps" && (
          <>
            <MapsGrid>
              {mapsPending ? (
                <MapsEmptyText>Carregando mapas...</MapsEmptyText>
              ) : (maps ?? []).length === 0 ? (
                <MapsEmptyText>Nenhum mapa criado ainda.</MapsEmptyText>
              ) : (
                (maps ?? []).map((map) => (
                  <MapCard
                    key={map.id}
                    map={map}
                    onClick={() =>
                      navigate(`/campaigns/${id}/maps/${map.id}/edit`)
                    }
                  />
                ))
              )}
            </MapsGrid>

            <ActionsList>
              <AdaptiveActionButton
                label="Criar Mapa"
                type="match"
                onClick={() => navigate(`/campaigns/${id}/maps/new`)}
                containerRef={mainContentRef}
                contentChangeSignal={descriptionSignal}
              />
            </ActionsList>
          </>
        )}
```

- [ ] **Step 4: Add styled components**

At the bottom of `CampaignPage.tsx`, after the existing styled components, add:

```tsx
const MapsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
`;

const MapsEmptyText = styled.p`
  font-family: ${fonts.sans};
  font-size: 16px;
  color: ${colors.textMuted};
  padding: 20px 0;
`;
```

- [ ] **Step 5: Verify build**

Run: `npm run build 2>&1 | head -40`
Expected: no TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add src/pages/CampaignPage.tsx
git commit -m "feat(CampaignPage): add URL-based Partidas/Mapas tabs for master"
```

---

### Task 7: MatchPage — tabs integration

**Files:**
- Modify: `src/pages/MatchPage.tsx`

Changes:
1. Add `useSearchParams`, `useEffect` to react-router-dom import
2. Add `useMaps`, `PageTabNav`, `MapCard` imports
3. Add hooks and computed vars after existing hooks (before loading guard)
4. Add redirect effect for invalid tabs
5. Refactor JSX: wrap ActionsList in 'events' tab; add 'maps' tab with role-based content
6. Add styled components: `MapsGrid`, `MapsEmptyText`, `MapsPlaceholder`

- [ ] **Step 1: Add imports**

Update the react-router-dom import:

Old:
```tsx
import { Navigate, useParams, useNavigate, useLocation } from "react-router-dom";
```

New:
```tsx
import { Navigate, useParams, useNavigate, useLocation, useSearchParams, useEffect } from "react-router-dom";
```

Add after the existing component imports (after `RuleSection`):
```tsx
import { useMaps } from "../hooks/useMaps";
import PageTabNav from "../components/organisms/PageTabNav";
import MapCard from "../components/molecules/MapCard";
```

- [ ] **Step 2: Add hooks and computed vars**

Add after `const { mutate: deleteMatch } = useDeleteMatch(token, matchId);` (before the `sheetId` derivation), the following block:

```tsx
  const [searchParams, setSearchParams] = useSearchParams();

  const matchEnded = !!match?.storyEndAt;

  const availableTabs =
    isMaster || matchEnded
      ? [
          { id: "events", label: "Eventos" },
          { id: "maps", label: "Mapas" },
        ]
      : [{ id: "events", label: "Eventos" }];

  const rawTab = searchParams.get("tab");
  const activeTab = availableTabs.some((t) => t.id === rawTab)
    ? rawTab!
    : "events";

  const { data: maps, isPending: mapsPending } = useMaps(
    token,
    activeTab === "maps" && isMaster ? campaignId : undefined,
  );

  useEffect(() => {
    if (!match) return;
    const tab = searchParams.get("tab");
    if (tab && !availableTabs.some((t) => t.id === tab)) {
      setSearchParams({ tab: "events" }, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match]);
```

Note: `isMaster` here is computed earlier in the component as `!!match && match.masterUuid === user?.uuid`. It is `false` before `match` loads, so the redirect effect safely fires only once `match` is available.

- [ ] **Step 3: Refactor JSX — wrap ActionsList in events tab and add maps tab**

Inside the `DetailPageTemplate` children, locate `<ActionsList>` and the section that wraps `BottomActions` / lobby / enroll buttons. Add `PageTabNav` before it and wrap `ActionsList` in the events tab condition. Add maps tab content after.

Replace the `<ActionsList>` block with:

```tsx
        <PageTabNav tabs={availableTabs} />

        {activeTab === "events" && (
          <ActionsList>
            {(isMaster && !match.gameStartAt) || canEnterLobby || canEnroll ? (
              <BottomActions
                containerRef={mainContentRef}
                contentChangeSignal={descriptionSignal}
                manage={
                  isMaster && !match.gameStartAt
                    ? {
                        isFree: true,
                        onEdit: handleEdit,
                        onDelete: handleDelete,
                        confirmMessage:
                          "Tem certeza que deseja excluir esta partida? Esta ação não pode ser desfeita.",
                      }
                    : undefined
                }
                primaryButton={
                  isMaster && !match.gameStartAt
                    ? {
                        label: "Abrir Lobby",
                        onClick: () => setShowLobbyConfirm(true),
                      }
                    : canEnterLobby
                    ? {
                        label: "Entrar no Lobby",
                        onClick: () =>
                          navigate(
                            `/campaigns/${campaignId}/matches/${matchId}/lobby`,
                          ),
                      }
                    : canEnroll
                    ? {
                        label: enrollPending ? "Inscrevendo..." : "Inscrever-se",
                        onClick: enrollPending
                          ? () => {}
                          : () => setShowEnrollConfirm(true),
                      }
                    : undefined
                }
              />
            ) : null}
          </ActionsList>
        )}

        {activeTab === "maps" && isMaster && (
          <MapsGrid>
            {mapsPending ? (
              <MapsEmptyText>Carregando mapas...</MapsEmptyText>
            ) : (maps ?? []).length === 0 ? (
              <MapsEmptyText>Nenhum mapa criado ainda.</MapsEmptyText>
            ) : (
              (maps ?? []).map((map) => (
                <MapCard
                  key={map.id}
                  map={map}
                  onClick={() =>
                    navigate(`/campaigns/${campaignId}/maps/${map.id}/edit`)
                  }
                />
              ))
            )}
          </MapsGrid>
        )}

        {activeTab === "maps" && !isMaster && matchEnded && (
          <MapsPlaceholder>
            Os mapas jogados nesta partida estarão disponíveis em breve.
          </MapsPlaceholder>
        )}
```

- [ ] **Step 4: Add styled components**

Add at the bottom of `MatchPage.tsx` after existing styled components:

```tsx
const MapsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 112px;
`;

const MapsEmptyText = styled.p`
  font-family: ${fonts.sans};
  font-size: 16px;
  color: ${colors.textMuted};
  padding: 20px 0;
`;

const MapsPlaceholder = styled.p`
  font-family: ${fonts.sans};
  font-size: 16px;
  color: ${colors.textMuted};
  padding: 40px 0;
  text-align: center;
`;
```

- [ ] **Step 5: Verify build**

Run: `npm run build 2>&1 | head -40`
Expected: no TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add src/pages/MatchPage.tsx
git commit -m "feat(MatchPage): add URL-based Eventos/Mapas tabs with role and storyEndAt gate"
```

---

### Task 8: CreateMapPage

**Files:**
- Create: `src/pages/CreateMapPage.tsx`

- [ ] **Step 1: Write CreateMapPage.tsx**

```tsx
// src/pages/CreateMapPage.tsx
import { useState } from "react";
import type { FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { colors, fonts } from "../styles/tokens";
import useToken from "../hooks/useToken";
import { useCreateMap } from "../hooks/useCreateMap";

const friendlyMessages: Record<string, string> = {
  name_required: "O nome do mapa é obrigatório.",
  "name is required": "O nome do mapa é obrigatório.",
};

export default function CreateMapPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { token } = useToken();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate: createMap, isPending } = useCreateMap(token, campaignId);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("O nome do mapa é obrigatório.");
      return;
    }
    setError(null);
    createMap(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => navigate(`/campaigns/${campaignId}`),
        onError: (err: any) => {
          console.error("[CreateMapPage]", err.response?.data);
          const detail: string = err.response?.data?.detail ?? "";
          setError(
            friendlyMessages[detail] || "Erro ao criar mapa. Tente novamente.",
          );
        },
      },
    );
  };

  if (!token) return null;

  return (
    <PageWrapper>
      <PageTitle>Criar Mapa</PageTitle>
      <Form onSubmit={handleSubmit}>
        <Label>
          Nome *
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Floresta do Norte"
            maxLength={255}
            autoFocus
          />
        </Label>
        <Label>
          Descrição
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição opcional do mapa"
            rows={4}
          />
        </Label>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <ButtonRow>
          <CancelButton
            type="button"
            onClick={() => navigate(`/campaigns/${campaignId}`)}
          >
            Cancelar
          </CancelButton>
          <SubmitButton type="submit" disabled={isPending}>
            {isPending ? "Criando..." : "Criar Mapa"}
          </SubmitButton>
        </ButtonRow>
      </Form>
    </PageWrapper>
  );
}

const PageWrapper = styled.div`
  max-width: 600px;
  margin: 60px auto;
  padding: 0 24px;
`;

const PageTitle = styled.h1`
  font-family: ${fonts.sans};
  font-size: 32px;
  font-weight: 900;
  color: ${colors.textPrimary};
  margin-bottom: 32px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: ${fonts.sans};
  font-size: 14px;
  font-weight: 600;
  color: ${colors.textDisabled};
`;

const Input = styled.input`
  font-family: ${fonts.sans};
  font-size: 16px;
  color: ${colors.textPrimary};
  background-color: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  padding: 12px 16px;
  outline: none;

  &:focus {
    border-color: ${colors.brandAccentBright};
  }

  &::placeholder {
    color: ${colors.textPlaceholder};
  }
`;

const Textarea = styled.textarea`
  font-family: ${fonts.sans};
  font-size: 16px;
  color: ${colors.textPrimary};
  background-color: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  padding: 12px 16px;
  resize: vertical;
  outline: none;

  &:focus {
    border-color: ${colors.brandAccentBright};
  }

  &::placeholder {
    color: ${colors.textPlaceholder};
  }
`;

const ErrorMessage = styled.p`
  font-family: ${fonts.sans};
  font-size: 14px;
  color: ${colors.accentDanger};
  border-left: 3px solid ${colors.accentDanger};
  padding: 8px 12px;
  border-radius: 0 6px 6px 0;
  background: ${colors.overlaySoft};
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const BaseButton = styled.button`
  font-family: ${fonts.sans};
  font-size: 16px;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  transition: filter 0.15s;

  &:hover {
    filter: brightness(1.1);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    filter: none;
  }
`;

const CancelButton = styled(BaseButton)`
  background: transparent;
  border: 1px solid ${colors.textPrimary};
  color: ${colors.textPrimary};
`;

const SubmitButton = styled(BaseButton)`
  background-color: ${colors.brandAccent};
  border: none;
  color: ${colors.textPrimary};
`;
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | head -40`
Expected: no errors

Note: `colors.overlaySoft` must exist in `src/styles/tokens.ts`. If it does not, replace with `colors.overlayMedium` or `colors.grayBgPanel`. Check `src/styles/tokens.ts` before building.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CreateMapPage.tsx
git commit -m "feat: add CreateMapPage with name+description form"
```

---

### Task 9: EditMapPage placeholder + App.tsx routes

**Files:**
- Create: `src/pages/EditMapPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write EditMapPage.tsx**

```tsx
// src/pages/EditMapPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { colors, fonts } from "../styles/tokens";

export default function EditMapPage() {
  const { campaignId } = useParams<{ campaignId: string; mapId: string }>();
  const navigate = useNavigate();

  return (
    <PageWrapper>
      <PageTitle>Editor de Mapa</PageTitle>
      <Message>O editor de mapas será implementado na Fase 2.</Message>
      <BackButton onClick={() => navigate(`/campaigns/${campaignId}`)}>
        Voltar para a campanha
      </BackButton>
    </PageWrapper>
  );
}

const PageWrapper = styled.div`
  max-width: 600px;
  margin: 60px auto;
  padding: 0 24px;
`;

const PageTitle = styled.h1`
  font-family: ${fonts.sans};
  font-size: 32px;
  font-weight: 900;
  color: ${colors.textPrimary};
  margin-bottom: 24px;
`;

const Message = styled.p`
  font-family: ${fonts.sans};
  font-size: 18px;
  color: ${colors.textMuted};
  margin-bottom: 32px;
`;

const BackButton = styled.button`
  font-family: ${fonts.sans};
  font-size: 16px;
  font-weight: 600;
  color: ${colors.textPrimary};
  background: transparent;
  border: 1px solid ${colors.textPrimary};
  border-radius: 6px;
  padding: 12px 24px;
  cursor: pointer;

  &:hover {
    filter: brightness(1.1);
  }
`;
```

- [ ] **Step 2: Add lazy routes to App.tsx**

In `src/App.tsx`, add after the existing lazy import (line 21, after `TacticalMapDemoPage`):

```tsx
const CreateMapPage = lazy(() => import("./pages/CreateMapPage"));
const EditMapPage = lazy(() => import("./pages/EditMapPage"));
```

Then add two new `<Route>` elements inside `<Routes>`, after the `/campaigns/:campaignId/matches/:matchId/game` route (before the DEV block):

```tsx
        <Route
          path="/campaigns/:campaignId/maps/new"
          element={
            <Suspense fallback={<div>Loading...</div>}>
              <CreateMapPage />
            </Suspense>
          }
        />
        <Route
          path="/campaigns/:campaignId/maps/:mapId/edit"
          element={
            <Suspense fallback={<div>Loading...</div>}>
              <EditMapPage />
            </Suspense>
          }
        />
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | head -40`
Expected: no TypeScript errors; no unused imports

- [ ] **Step 4: Commit**

```bash
git add src/pages/EditMapPage.tsx src/App.tsx
git commit -m "feat: add EditMapPage placeholder and map routes to App.tsx"
```

---

### Task 10: Test fixtures, handlers, and CampaignPage tests

**Files:**
- Create: `src/test/fixtures/map.ts`
- Modify: `src/test/handlers.ts`
- Modify: `src/pages/__tests__/CampaignPage.test.tsx`

- [ ] **Step 1: Write src/test/fixtures/map.ts**

```ts
// src/test/fixtures/map.ts
import type { TacticalMap } from "../../types/tacticalMap";

export const mapFixture: TacticalMap = {
  id: "map-1",
  campaignId: "campaign-1",
  name: "Floresta do Norte",
  description: "Uma floresta densa ao norte do reino.",
  grid: {
    kind: "square",
    cols: 25,
    rows: 25,
    cellSize: 64,
    skewRatio: 1.0,
    rotation: 0,
    color: "#ffffff",
    opacity: 0.5,
    lineStyle: "solid",
  },
  bg: null,
  pieces: [],
  walls: [],
  decorations: [],
  items: [],
  createdAt: "2026-05-31T00:00:00.000Z",
  updatedAt: "2026-05-31T00:00:00.000Z",
};
```

- [ ] **Step 2: Run test to verify the fixture type-checks**

Run: `npm run build 2>&1 | grep fixtures`
Expected: no errors

- [ ] **Step 3: Add default maps handler to handlers.ts**

In `src/test/handlers.ts`:
- Add import at the top: `import { mapFixture } from "./fixtures/map";`
- Add the following handler to `defaultHandlers`:

```ts
  http.get(`${baseUrl}/campaigns/:id/maps`, () =>
    HttpResponse.json({ maps: [] }),
  ),
```

This default returns an empty list. Individual tests override it for specific scenarios.

- [ ] **Step 4: Add maps tab describe blocks to CampaignPage.test.tsx**

Append the following describe blocks to `src/pages/__tests__/CampaignPage.test.tsx` (inside the outer `describe("CampaignPage", ...)` block, after the last existing `describe`):

```tsx
import { mapFixture } from "../../test/fixtures/map";

// Add inside describe("CampaignPage", ...) after existing describes:

  describe("aba Mapas — como Master", () => {
    function renderAsMasterOnMapsTab() {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({
            campaign: campaignAsMaster(masterUserFixture.user.uuid),
          }),
        ),
        http.get(`${baseUrl}/campaigns/:id/maps`, () =>
          HttpResponse.json({ maps: [mapFixture] }),
        ),
      );
      return renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1?tab=maps",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });
    }

    it("exibe aba 'Mapas' para master", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({
            campaign: campaignAsMaster(masterUserFixture.user.uuid),
          }),
        ),
      );
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });
      expect(await screen.findByRole("button", { name: "Mapas" })).toBeInTheDocument();
    });

    it("NÃO exibe aba 'Mapas' para player", async () => {
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: userFixture,
      });
      expect(await screen.findByText(campaignFixture.name.toUpperCase())).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Mapas" })).not.toBeInTheDocument();
    });

    it("aba Mapas exibe MapCard com nome do mapa", async () => {
      renderAsMasterOnMapsTab();
      expect(
        await screen.findByText("Floresta do Norte"),
      ).toBeInTheDocument();
    });

    it("aba Mapas exibe botão 'Criar Mapa'", async () => {
      renderAsMasterOnMapsTab();
      expect(
        await screen.findByRole("button", { name: /Criar Mapa/i }),
      ).toBeInTheDocument();
    });

    it("clicar em 'Criar Mapa' navega para /campaigns/:id/maps/new", async () => {
      renderAsMasterOnMapsTab();
      const user = userEvent.setup();
      await user.click(
        await screen.findByRole("button", { name: /Criar Mapa/i }),
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        "/campaigns/campaign-1/maps/new",
      );
    });

    it("clicar em MapCard navega para /campaigns/:id/maps/:mapId/edit", async () => {
      renderAsMasterOnMapsTab();
      const user = userEvent.setup();
      await user.click(await screen.findByText("Floresta do Norte"));
      expect(mockNavigate).toHaveBeenCalledWith(
        "/campaigns/campaign-1/maps/map-1/edit",
      );
    });

    it("aba Mapas mostra 'Nenhum mapa criado ainda.' quando lista está vazia", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({
            campaign: campaignAsMaster(masterUserFixture.user.uuid),
          }),
        ),
        http.get(`${baseUrl}/campaigns/:id/maps`, () =>
          HttpResponse.json({ maps: [] }),
        ),
      );
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1?tab=maps",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });
      expect(
        await screen.findByText(/Nenhum mapa criado ainda\./i),
      ).toBeInTheDocument();
    });
  });
```

Note: the `import { mapFixture }` line should be added to the top of the test file alongside the other fixture imports.

- [ ] **Step 5: Run CampaignPage tests**

Run: `npm test -- --reporter=verbose src/pages/__tests__/CampaignPage.test.tsx`
Expected: all existing tests pass + new maps tab tests pass

- [ ] **Step 6: Commit**

```bash
git add src/test/fixtures/map.ts src/test/handlers.ts src/pages/__tests__/CampaignPage.test.tsx
git commit -m "test(CampaignPage): add maps tab visibility, MapCard, and navigation tests"
```

---

### Task 11: CreateMapPage tests

**Files:**
- Create: `src/pages/__tests__/CreateMapPage.test.tsx`

- [ ] **Step 1: Write CreateMapPage.test.tsx**

```tsx
// src/pages/__tests__/CreateMapPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { masterUserFixture } from "../../test/fixtures/user";
import { mapFixture } from "../../test/fixtures/map";
import CreateMapPage from "../CreateMapPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseUrl = "http://localhost:5000";

function renderPage() {
  return renderWithProviders(<CreateMapPage />, {
    route: "/campaigns/campaign-1/maps/new",
    path: "/campaigns/:campaignId/maps/new",
    user: masterUserFixture,
  });
}

describe("CreateMapPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("exibe campo de nome e descrição", () => {
    renderPage();
    expect(screen.getByPlaceholderText(/Ex.: Floresta do Norte/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Descrição opcional/i)).toBeInTheDocument();
  });

  it("submit sem nome exibe mensagem de erro em português sem chamar API", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Criar Mapa/i }));
    expect(
      await screen.findByText(/O nome do mapa é obrigatório/i),
    ).toBeInTheDocument();
  });

  it("submit válido chama POST e navega para /campaigns/:id", async () => {
    server.use(
      http.post(`${baseUrl}/campaigns/:campaignId/maps`, () =>
        HttpResponse.json({ map: mapFixture }, { status: 201 }),
      ),
    );
    renderPage();
    const user = userEvent.setup();
    await user.type(
      screen.getByPlaceholderText(/Ex.: Floresta do Norte/i),
      "Floresta do Norte",
    );
    await user.click(screen.getByRole("button", { name: /Criar Mapa/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/campaigns/campaign-1");
    });
  });

  it("erro 422 do servidor exibe mensagem em português", async () => {
    server.use(
      http.post(`${baseUrl}/campaigns/:campaignId/maps`, () =>
        HttpResponse.json(
          { detail: "name is required" },
          { status: 422 },
        ),
      ),
    );
    renderPage();
    const user = userEvent.setup();
    // Type a name so client validation passes, then let server reject
    await user.type(
      screen.getByPlaceholderText(/Ex.: Floresta do Norte/i),
      "Mapa X",
    );
    await user.click(screen.getByRole("button", { name: /Criar Mapa/i }));
    expect(
      await screen.findByText(/O nome do mapa é obrigatório/i),
    ).toBeInTheDocument();
  });

  it("erro genérico do servidor exibe mensagem de fallback", async () => {
    server.use(
      http.post(`${baseUrl}/campaigns/:campaignId/maps`, () =>
        HttpResponse.json({ detail: "unexpected_error" }, { status: 422 }),
      ),
    );
    renderPage();
    const user = userEvent.setup();
    await user.type(
      screen.getByPlaceholderText(/Ex.: Floresta do Norte/i),
      "Mapa X",
    );
    await user.click(screen.getByRole("button", { name: /Criar Mapa/i }));
    expect(
      await screen.findByText(/Erro ao criar mapa\. Tente novamente/i),
    ).toBeInTheDocument();
  });

  it("botão Cancelar navega para /campaigns/:id", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Cancelar/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/campaigns/campaign-1");
  });
});
```

- [ ] **Step 2: Run CreateMapPage tests**

Run: `npm test -- --reporter=verbose src/pages/__tests__/CreateMapPage.test.tsx`
Expected: all 6 tests pass

- [ ] **Step 3: Run full test suite to check for regressions**

Run: `npm test`
Expected: all tests pass (no regressions in existing CampaignPage, MatchPage, or other test files)

- [ ] **Step 4: Commit**

```bash
git add src/pages/__tests__/CreateMapPage.test.tsx
git commit -m "test(CreateMapPage): add submit, validation, and error handling tests"
```
