# TanStack Query Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor all HTTP calls in the React frontend to go through TanStack Query (`useQuery` / `useMutation`), with services returning typed domain data instead of axios response wrappers.

**Architecture:** Services become pure HTTP + transformation functions that return typed data. Hooks wrap services with `useQuery` (reads) or `useMutation` (writes). Pages consume only hooks — no direct service imports, no manual `useState(isLoading)` / `useEffect` for data fetching.

**Tech Stack:** React 19, TanStack Query v5, TypeScript, axios (`httpClient.ts`)

**Spec:** `docs/superpowers/specs/2026-05-14-tanstack-query-refactor-design.md`

---

## File Map

### Modified
| File | Change |
|---|---|
| `src/services/campaignService.ts` | Return typed data, remove axios wrapper |
| `src/services/characterSheetsService.ts` | Return typed data, remove axios wrapper |
| `src/services/characterClassesService.ts` | Return typed data, remove axios wrapper |
| `src/services/matchService.ts` | Return typed data, remove axios wrapper |
| `src/services/authService.ts` | Return typed data, align signIn/signUp signatures |
| `src/hooks/useCharacterSheet.ts` | Remove `{ data }` destructure from queryFn |
| `src/hooks/usePublicCampaigns.ts` | Remove `{ data }` destructure from queryFn |
| `src/hooks/useCharacterClasses.ts` | Add `token` to queryKey (bug fix) + remove `{ data }` destructure |
| `src/main.tsx` | Add `staleTime: 60_000`, remove commented lines |
| `src/pages/CampaignsPage.tsx` | Replace useEffect+service with `useCampaigns` |
| `src/pages/CharacterSheetsPage.tsx` | Replace useEffect+service with `useCharacterSheets` |
| `src/pages/CampaignPage.tsx` | Replace useEffect+service with `useCampaignDetails` + `useSubmitCharacterSheet` |
| `src/pages/MatchPage.tsx` | Replace useEffect+services with 3 query hooks + 3 mutation hooks |
| `src/pages/CreateCampaignPage.tsx` | Replace try/catch+service with `useCreateCampaign` |
| `src/pages/CreateMatchPage.tsx` | Replace try/catch+service with `useCreateMatch` |
| `src/pages/LoginPage.tsx` | Replace service call with `useSignIn` |
| `src/pages/RegisterPage.tsx` | Replace service call with `useSignUp` |

### Created
| File | Responsibility |
|---|---|
| `src/hooks/useCampaigns.ts` | `useQuery` for campaign list |
| `src/hooks/useCharacterSheets.ts` | `useQuery` for character sheet list |
| `src/hooks/useCampaignDetails.ts` | `useQuery` for single campaign |
| `src/hooks/useMatchDetails.ts` | `useQuery` for single match |
| `src/hooks/useMatchEnrollments.ts` | `useQuery` for match enrollments (conditionally enabled) |
| `src/hooks/useMatchParticipants.ts` | `useQuery` for match participants (conditionally enabled) |
| `src/hooks/useSignIn.ts` | `useMutation` for login |
| `src/hooks/useSignUp.ts` | `useMutation` for register |
| `src/hooks/useCreateCampaign.ts` | `useMutation` for campaign creation + cache invalidation |
| `src/hooks/useCreateMatch.ts` | `useMutation` for match creation + cache invalidation |
| `src/hooks/useSubmitCharacterSheet.ts` | `useMutation` for sheet submission + cache invalidation |
| `src/hooks/useAcceptEnrollment.ts` | `useMutation` for accept + cache invalidation |
| `src/hooks/useRejectEnrollment.ts` | `useMutation` for reject + cache invalidation |
| `src/hooks/useEnrollCharacterSheet.ts` | `useMutation` for enroll + cache invalidation |

---

## Task 1: Refactor service layer — return typed data

**Files:**
- Modify: `src/services/campaignService.ts`
- Modify: `src/services/characterSheetsService.ts`
- Modify: `src/services/characterClassesService.ts`
- Modify: `src/services/matchService.ts`
- Modify: `src/services/authService.ts`

Every service method stops returning `{ ...axiosResponse, data: T }` and returns `Promise<T>` directly.
After this task the existing 3 hooks will have TypeScript errors (fixed in Task 2).

- [ ] **Step 1: Replace `src/services/campaignService.ts`**

```ts
import { httpClient } from "./httpClient";
import type { CampaignMaster } from "../types/campaign";
import { objToCamelCase, objToSnakeCase } from "../utils/caseConverter";
import config from "./config";
import type {
  CampaignsResponse,
  PublicCampaignsResponse,
  CampaignSummary,
  PublicCampaignSummary,
} from "../types/campaigns";

export const campaignService = {
  getCampaignDetails: (token: string, id: string): Promise<CampaignMaster> =>
    httpClient
      .get<{ campaign: CampaignMaster }>(`/campaigns/${id}`, config(token))
      .then(({ data }) => objToCamelCase<CampaignMaster>(data.campaign)),

  listCampaigns: (token: string): Promise<CampaignSummary[]> =>
    httpClient
      .get<CampaignsResponse>("/campaigns", config(token))
      .then(({ data }) => objToCamelCase<CampaignsResponse>(data).campaigns ?? []),

  listPublicCampaigns: (token: string): Promise<PublicCampaignSummary[]> =>
    httpClient
      .get<PublicCampaignsResponse>("/public/campaigns", config(token))
      .then(({ data }) =>
        objToCamelCase<PublicCampaignsResponse>(data).campaigns ?? []
      ),

  createCampaign: (token: string, campaignData: object): Promise<CampaignMaster> =>
    httpClient
      .post<{ campaign: CampaignMaster }>(
        "/campaigns",
        objToSnakeCase(campaignData),
        config(token)
      )
      .then(({ data }) => objToCamelCase<CampaignMaster>(data.campaign)),
};
```

- [ ] **Step 2: Replace `src/services/characterSheetsService.ts`**

```ts
import { httpClient } from "./httpClient";
import type {
  CharacterSheet,
  CharacterSheetResponse,
  CharacterSheetSummary,
} from "../types/characterSheet";
import { objToCamelCase, objToSnakeCase } from "../utils/caseConverter";
import config from "./config";

export const characterSheetsService = {
  listCharacterSheets: (token: string): Promise<CharacterSheetSummary[]> =>
    httpClient
      .get<CharacterSheetResponse>("/charactersheets", config(token))
      .then(({ data }) => {
        const { characterSheets = [] } =
          objToCamelCase<CharacterSheetResponse>(data);
        return characterSheets.map((sheet) =>
          objToCamelCase<CharacterSheetSummary>(sheet)
        );
      }),

  getCharacterSheetDetails: (token: string, id: string): Promise<CharacterSheet> =>
    httpClient
      .get<{ character_sheet: CharacterSheet }>(
        `/charactersheets/${id}`,
        config(token)
      )
      .then(({ data }) => objToCamelCase<CharacterSheet>(data.character_sheet)),

  submitCharacterSheet: (
    token: string,
    sheetUuid: string,
    campaignUuid: string
  ): Promise<void> =>
    httpClient
      .post(
        "/submissions/charactersheets/submit",
        objToSnakeCase({ sheetUuid, campaignUuid }),
        config(token)
      )
      .then(() => undefined),
};
```

- [ ] **Step 3: Replace `src/services/characterClassesService.ts`**

```ts
import { httpClient } from "./httpClient";
import type { CharacterClass, CharacterClassResponse } from "../types/characterClass";
import { objToCamelCase } from "../utils/caseConverter";
import config from "./config";

export const characterClassesService = {
  listCharacterClasses: (token: string): Promise<CharacterClass[]> =>
    httpClient
      .get<CharacterClassResponse>("/classes", config(token))
      .then(({ data }) =>
        data.CharacterClasses.map((c) => objToCamelCase<CharacterClass>(c))
      ),

  getCharacterClassDetails: (token: string, id: string): Promise<CharacterClass> =>
    httpClient
      .get<{ character_class: CharacterClass }>(`/classes/${id}`, config(token))
      .then(({ data }) => objToCamelCase<CharacterClass>(data.character_class)),
};
```

- [ ] **Step 4: Replace `src/services/matchService.ts`**

```ts
import { httpClient } from "./httpClient";
import { objToCamelCase, objToSnakeCase } from "../utils/caseConverter";
import config from "./config";
import type { Match, Enrollment, Participant } from "../types/match";

export const matchService = {
  createMatch: (token: string, matchData: object): Promise<Match> =>
    httpClient
      .post<{ match: Match }>("/matches", objToSnakeCase(matchData), config(token))
      .then(({ data }) => objToCamelCase<Match>(data.match)),

  getMatchDetails: (token: string, matchId: string): Promise<Match> =>
    httpClient
      .get<{ match: Match }>(`/matches/${matchId}`, config(token))
      .then(({ data }) => objToCamelCase<Match>(data.match)),

  getEnrollments: (token: string, matchId: string): Promise<Enrollment[]> =>
    httpClient
      .get<{ enrollments: Enrollment[] }>(
        `/matches/${matchId}/enrollments`,
        config(token)
      )
      .then(({ data }) => objToCamelCase<Enrollment[]>(data.enrollments)),

  getParticipants: (token: string, matchId: string): Promise<Participant[]> =>
    httpClient
      .get<{ participants: Participant[] }>(
        `/matches/${matchId}/participants`,
        config(token)
      )
      .then(({ data }) => objToCamelCase<Participant[]>(data.participants)),

  acceptEnrollment: (token: string, enrollmentId: string): Promise<void> =>
    httpClient
      .post(`/enrollments/${enrollmentId}/accept`, {}, config(token))
      .then(() => undefined),

  rejectEnrollment: (token: string, enrollmentId: string): Promise<void> =>
    httpClient
      .post(`/enrollments/${enrollmentId}/reject`, {}, config(token))
      .then(() => undefined),

  enrollCharacterSheet: (
    token: string,
    sheetUuid: string,
    matchUuid: string
  ): Promise<void> =>
    httpClient
      .post(
        "/enrollments/charactersheets/enroll",
        objToSnakeCase({ sheetUuid, matchUuid }),
        config(token)
      )
      .then(() => undefined),
};
```

- [ ] **Step 5: Replace `src/services/authService.ts`**

```ts
import { httpClient } from "./httpClient";
import type { SignInBody, SignUpBody, UserResponse } from "../types/user";
import { objToCamelCase, objToSnakeCase } from "../utils/caseConverter";

export const authService = {
  signIn: (body: SignInBody): Promise<UserResponse> =>
    httpClient
      .post<UserResponse>("/auth/login", objToSnakeCase(body))
      .then(({ data }) => data),

  signUp: (body: SignUpBody): Promise<UserResponse> =>
    httpClient
      .post<UserResponse>("/auth/register", objToSnakeCase(body))
      .then(({ data }) => objToCamelCase<UserResponse>(data)),
};
```

- [ ] **Step 6: Commit**

```bash
git add src/services/
git commit -m "refactor: services return typed data, remove axios response wrappers"
```

---

## Task 2: Fix QueryClient + update existing hooks

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/hooks/useCharacterSheet.ts`
- Modify: `src/hooks/usePublicCampaigns.ts`
- Modify: `src/hooks/useCharacterClasses.ts`

- [ ] **Step 1: Update `src/main.tsx` — add `staleTime`, remove commented lines**

Replace the `QueryClient` block:

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});
```

- [ ] **Step 2: Replace `src/hooks/useCharacterSheet.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { characterSheetsService } from "../services/characterSheetsService";

export function useCharacterSheet(token: string | null, id?: string) {
  return useQuery({
    queryKey: ["characterSheet", token, id],
    queryFn: () => characterSheetsService.getCharacterSheetDetails(token!, id!),
    enabled: !!token && !!id,
    retry: 1,
  });
}
```

- [ ] **Step 3: Replace `src/hooks/usePublicCampaigns.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { campaignService } from "../services/campaignService";
import type { PublicCampaignSummary } from "../types/campaigns";

export function usePublicCampaigns(token: string | null) {
  return useQuery<PublicCampaignSummary[]>({
    queryKey: ["publicCampaigns", token],
    queryFn: () => campaignService.listPublicCampaigns(token!),
    enabled: !!token,
    retry: 1,
  });
}
```

- [ ] **Step 4: Replace `src/hooks/useCharacterClasses.ts` — fix queryKey bug**

Token was missing from `queryKey`, causing different users to share cache entries.

```ts
import { useQuery } from "@tanstack/react-query";
import { characterClassesService } from "../services/characterClassesService";

export function useCharacterClasses(token: string | null) {
  return useQuery({
    queryKey: ["characterClasses", token],
    queryFn: () => characterClassesService.listCharacterClasses(token!),
    enabled: !!token,
    retry: 1,
  });
}
```

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```

Expected: build succeeds with 0 TypeScript errors. At this point services and the 3 existing hooks are consistent.

- [ ] **Step 6: Commit**

```bash
git add src/main.tsx src/hooks/useCharacterSheet.ts src/hooks/usePublicCampaigns.ts src/hooks/useCharacterClasses.ts
git commit -m "fix: update existing hooks for new service signatures, add staleTime, fix characterClasses queryKey"
```

---

## Task 3: New query hooks — campaign & character sheet lists

**Files:**
- Create: `src/hooks/useCampaigns.ts`
- Create: `src/hooks/useCharacterSheets.ts`

- [ ] **Step 1: Create `src/hooks/useCampaigns.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { campaignService } from "../services/campaignService";
import type { CampaignSummary } from "../types/campaigns";

export function useCampaigns(token: string | null) {
  return useQuery<CampaignSummary[]>({
    queryKey: ["campaigns", token],
    queryFn: () => campaignService.listCampaigns(token!),
    enabled: !!token,
    retry: 1,
  });
}
```

- [ ] **Step 2: Create `src/hooks/useCharacterSheets.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { characterSheetsService } from "../services/characterSheetsService";
import type { CharacterSheetSummary } from "../types/characterSheet";

export function useCharacterSheets(token: string | null) {
  return useQuery<CharacterSheetSummary[]>({
    queryKey: ["characterSheets", token],
    queryFn: () => characterSheetsService.listCharacterSheets(token!),
    enabled: !!token,
    retry: 1,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCampaigns.ts src/hooks/useCharacterSheets.ts
git commit -m "feat: add useCampaigns and useCharacterSheets query hooks"
```

---

## Task 4: New query hooks — detail pages

**Files:**
- Create: `src/hooks/useCampaignDetails.ts`
- Create: `src/hooks/useMatchDetails.ts`
- Create: `src/hooks/useMatchEnrollments.ts`
- Create: `src/hooks/useMatchParticipants.ts`

- [ ] **Step 1: Create `src/hooks/useCampaignDetails.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { campaignService } from "../services/campaignService";
import type { CampaignMaster } from "../types/campaign";

export function useCampaignDetails(token: string | null, id?: string) {
  return useQuery<CampaignMaster>({
    queryKey: ["campaignDetails", token, id],
    queryFn: () => campaignService.getCampaignDetails(token!, id!),
    enabled: !!token && !!id,
    retry: 1,
  });
}
```

- [ ] **Step 2: Create `src/hooks/useMatchDetails.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { matchService } from "../services/matchService";
import type { Match } from "../types/match";

export function useMatchDetails(token: string | null, matchId?: string) {
  return useQuery<Match>({
    queryKey: ["matchDetails", token, matchId],
    queryFn: () => matchService.getMatchDetails(token!, matchId!),
    enabled: !!token && !!matchId,
    retry: 1,
  });
}
```

- [ ] **Step 3: Create `src/hooks/useMatchEnrollments.ts`**

The `enabled` parameter is driven by `!match.gameStartAt` — only fetch enrollments when the match hasn't started yet.

```ts
import { useQuery } from "@tanstack/react-query";
import { matchService } from "../services/matchService";
import type { Enrollment } from "../types/match";

export function useMatchEnrollments(
  token: string | null,
  matchId: string | undefined,
  enabled: boolean
) {
  return useQuery<Enrollment[]>({
    queryKey: ["matchEnrollments", token, matchId],
    queryFn: () => matchService.getEnrollments(token!, matchId!),
    enabled: !!token && !!matchId && enabled,
    retry: 1,
  });
}
```

- [ ] **Step 4: Create `src/hooks/useMatchParticipants.ts`**

The `enabled` parameter is driven by `!!match.gameStartAt` — only fetch participants once the match has started.

```ts
import { useQuery } from "@tanstack/react-query";
import { matchService } from "../services/matchService";
import type { Participant } from "../types/match";

export function useMatchParticipants(
  token: string | null,
  matchId: string | undefined,
  enabled: boolean
) {
  return useQuery<Participant[]>({
    queryKey: ["matchParticipants", token, matchId],
    queryFn: () => matchService.getParticipants(token!, matchId!),
    enabled: !!token && !!matchId && enabled,
    retry: 1,
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCampaignDetails.ts src/hooks/useMatchDetails.ts src/hooks/useMatchEnrollments.ts src/hooks/useMatchParticipants.ts
git commit -m "feat: add useCampaignDetails, useMatchDetails, useMatchEnrollments, useMatchParticipants query hooks"
```

---

## Task 5: New mutation hooks — auth

**Files:**
- Create: `src/hooks/useSignIn.ts`
- Create: `src/hooks/useSignUp.ts`

These hooks only wrap the API call. Navigation and context updates (`login()`, `putUser()`, `logout()`) happen in the page via the `onSuccess` callback passed to `mutate()`.

- [ ] **Step 1: Create `src/hooks/useSignIn.ts`**

```ts
import { useMutation } from "@tanstack/react-query";
import { authService } from "../services/authService";
import type { SignInBody } from "../types/user";

export function useSignIn() {
  return useMutation({
    mutationFn: (body: SignInBody) => authService.signIn(body),
  });
}
```

- [ ] **Step 2: Create `src/hooks/useSignUp.ts`**

```ts
import { useMutation } from "@tanstack/react-query";
import { authService } from "../services/authService";
import type { SignUpBody } from "../types/user";

export function useSignUp() {
  return useMutation({
    mutationFn: (body: SignUpBody) => authService.signUp(body),
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSignIn.ts src/hooks/useSignUp.ts
git commit -m "feat: add useSignIn and useSignUp mutation hooks"
```

---

## Task 6: New mutation hooks — campaign & character sheet writes

**Files:**
- Create: `src/hooks/useCreateCampaign.ts`
- Create: `src/hooks/useSubmitCharacterSheet.ts`

- [ ] **Step 1: Create `src/hooks/useCreateCampaign.ts`**

After a campaign is created, invalidate the campaigns list so it refetches.

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campaignService } from "../services/campaignService";

export function useCreateCampaign(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => campaignService.createCampaign(token!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", token] });
    },
  });
}
```

- [ ] **Step 2: Create `src/hooks/useSubmitCharacterSheet.ts`**

After submission, the campaign's pending sheets list changes — invalidate the campaign details cache.

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { characterSheetsService } from "../services/characterSheetsService";

export function useSubmitCharacterSheet(
  token: string | null,
  campaignId: string | undefined
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sheetUuid,
      campaignUuid,
    }: {
      sheetUuid: string;
      campaignUuid: string;
    }) =>
      characterSheetsService.submitCharacterSheet(token!, sheetUuid, campaignUuid),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaignDetails", token, campaignId],
      });
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCreateCampaign.ts src/hooks/useSubmitCharacterSheet.ts
git commit -m "feat: add useCreateCampaign and useSubmitCharacterSheet mutation hooks"
```

---

## Task 7: New mutation hooks — match writes

**Files:**
- Create: `src/hooks/useCreateMatch.ts`
- Create: `src/hooks/useAcceptEnrollment.ts`
- Create: `src/hooks/useRejectEnrollment.ts`
- Create: `src/hooks/useEnrollCharacterSheet.ts`

- [ ] **Step 1: Create `src/hooks/useCreateMatch.ts`**

After match creation, invalidate the campaign details so the new match appears in the list.

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { matchService } from "../services/matchService";

export function useCreateMatch(
  token: string | null,
  campaignId: string | undefined
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => matchService.createMatch(token!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaignDetails", token, campaignId],
      });
    },
  });
}
```

- [ ] **Step 2: Create `src/hooks/useAcceptEnrollment.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { matchService } from "../services/matchService";

export function useAcceptEnrollment(
  token: string | null,
  matchId: string | undefined
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: string) =>
      matchService.acceptEnrollment(token!, enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["matchEnrollments", token, matchId],
      });
    },
  });
}
```

- [ ] **Step 3: Create `src/hooks/useRejectEnrollment.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { matchService } from "../services/matchService";

export function useRejectEnrollment(
  token: string | null,
  matchId: string | undefined
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: string) =>
      matchService.rejectEnrollment(token!, enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["matchEnrollments", token, matchId],
      });
    },
  });
}
```

- [ ] **Step 4: Create `src/hooks/useEnrollCharacterSheet.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { matchService } from "../services/matchService";

export function useEnrollCharacterSheet(
  token: string | null,
  matchId: string | undefined
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sheetUuid,
      matchUuid,
    }: {
      sheetUuid: string;
      matchUuid: string;
    }) => matchService.enrollCharacterSheet(token!, sheetUuid, matchUuid),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["matchEnrollments", token, matchId],
      });
    },
  });
}
```

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```

Expected: 0 TypeScript errors. All 14 new hooks and 5 updated services compile cleanly.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useCreateMatch.ts src/hooks/useAcceptEnrollment.ts src/hooks/useRejectEnrollment.ts src/hooks/useEnrollCharacterSheet.ts
git commit -m "feat: add match mutation hooks with cache invalidation"
```

---

## Task 8: Update CampaignsPage and CharacterSheetsPage

**Files:**
- Modify: `src/pages/CampaignsPage.tsx`
- Modify: `src/pages/CharacterSheetsPage.tsx`

- [ ] **Step 1: Replace `src/pages/CampaignsPage.tsx`**

Remove `useEffect`, `useState` × 3, direct `campaignService` import. Use `useCampaigns`.

```tsx
import { useCampaigns } from "../hooks/useCampaigns";
import { useNavigate } from "react-router-dom";
import type { CampaignSummary } from "../types/campaigns";
import worldMap from "../assets/images/worldmap.png";
import CampaignCard from "../components/atoms/CampaignCard";
import PlusIcon from "../components/ions/PlusIcon";
import useToken from "../hooks/useToken";
import styled from "styled-components";
import PageHeader from "../components/atoms/PageHeader";
import PageTitle from "../components/ions/PageTitle";

function CampaignsPage() {
  const { token } = useToken();
  const navigate = useNavigate();
  const { data: campaigns = [], isPending, isError } = useCampaigns(token);

  if (isPending) {
    return <LoadingContainer>Carregando campanhas...</LoadingContainer>;
  }

  if (isError) {
    return (
      <ErrorContainer>
        Falha ao carregar campanhas. Tente novamente mais tarde.
      </ErrorContainer>
    );
  }

  return (
    <StyledCampaignsPage>
      <PageHeader to="/home" backgroundColor="#08491f" />
      <PageBody>
        <PageTitle>LISTA DE CAMPANHAS</PageTitle>

        {campaigns.length === 0 ? (
          <EmptyState>
            <EmptyMessage>Você ainda não possui campanhas.</EmptyMessage>
          </EmptyState>
        ) : (
          <>
            {campaigns.map((campaign: CampaignSummary) => (
              <CampaignCard
                key={campaign.uuid}
                campaign={campaign}
                to={`/campaigns/${campaign.uuid}`}
              />
            ))}
          </>
        )}
        <CreateButton onClick={() => navigate("/campaigns/new")}>
          <PlusIcon />
          <span>Criar Nova Campanha</span>
        </CreateButton>
      </PageBody>
    </StyledCampaignsPage>
  );
}

export default CampaignsPage;

const StyledCampaignsPage = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background-image: url(${worldMap});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
`;

const PageBody = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  padding: 30px;
  width: 100vw;

  @media (max-width: 500px) {
    padding: 30px 0;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
  color: white;
  font-size: 24px;
`;

const ErrorContainer = styled.div`
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  margin: 30px;
  font-size: 18px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
`;

const EmptyMessage = styled.p`
  font-family: "Roboto", sans-serif;
  font-weight: 600;
  color: white;
  font-size: 28px;
  margin-bottom: 20px;
`;

const CreateButton = styled.button`
  font-family: "Roboto", sans-serif;
  font-size: 26px;
  font-weight: 600;
  color: white;
  background-color: #107135;
  height: 100px;
  width: 80vw;
  max-width: 940px;
  border-radius: 12px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;

  &:hover {
    transform: translateY(-5px);
    filter: brightness(1.1);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.4);
    border: 4px solid white;
  }
  &:active {
    transform: scale(0.98);
  }

  @media (max-width: 500px) {
    font-size: 22px;
    width: 100%;
    border-radius: 0px;

    &:hover {
      border-width: 4px 0px 4px 0px;
    }
    &:active {
      transform: scale(1);
    }
  }
`;
```

- [ ] **Step 2: Replace `src/pages/CharacterSheetsPage.tsx`**

The navigate-to-new-page-when-empty logic uses `useEffect` watching `data`, since TanStack Query v5 removed the `onSuccess` callback from `useQuery`.

```tsx
import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import styled from "styled-components";
import useToken from "../hooks/useToken";
import space from "../assets/images/space.png";
import { useCharacterSheets } from "../hooks/useCharacterSheets";
import type { CharacterSheetSummary } from "../types/characterSheet";
import CharacterSheetCard from "../components/atoms/CharacterSheetCard";
import PageHeader from "../components/atoms/PageHeader";
import PageTitle from "../components/ions/PageTitle";
import PlusIcon from "../components/ions/PlusIcon";
import { LoadingContainer, ErrorContainer } from "../components/atoms/PageStates";

function CharacterSheetsPage() {
  const { token } = useToken();
  const navigate = useNavigate();
  const { data: charSheets, isPending, isError } = useCharacterSheets(token);

  // All hooks must come before any conditional return (Rules of Hooks)
  useEffect(() => {
    if (charSheets && charSheets.length === 0) {
      navigate("/charactersheet/new");
    }
  }, [charSheets, navigate]);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (isPending) {
    return <LoadingContainer>Carregando...</LoadingContainer>;
  }
  if (isError) {
    return (
      <ErrorContainer>
        Falha ao carregar personagens. Tente novamente mais tarde.
      </ErrorContainer>
    );
  }

  return (
    <StyledCharacterSheetsPage>
      <PageHeader to="/home" backgroundColor="black" />
      <PageBody>
        <PageTitle>LISTA DE PERSONAGENS</PageTitle>

        {(charSheets ?? []).map((sheet: CharacterSheetSummary) => (
          <CharacterSheetCard
            key={sheet.uuid}
            character={sheet}
            to={`/charactersheet/${sheet.uuid}`}
          />
        ))}

        <CreateButton onClick={() => navigate("/charactersheet/new")}>
          <PlusIcon />
          <span>Criar Nova Ficha</span>
        </CreateButton>
      </PageBody>
    </StyledCharacterSheetsPage>
  );
}
export default CharacterSheetsPage;

const StyledCharacterSheetsPage = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background-image: url(${space});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
`;

const PageBody = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8vw;
  padding: 8vw 0;
  width: 100vw;

  @media (min-width: 500px) {
    padding: 45px 0;
    gap: 45px;
  }
`;

const CreateButton = styled.button`
  font-family: "Roboto", sans-serif;
  font-size: 26px;
  font-weight: 600;
  background: linear-gradient(to bottom, #ffa216 0%, #ffa216 20%, #e60000 100%);
  color: black;
  height: 100px;
  width: 80vw;
  max-width: 940px;
  border-radius: 12px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;

  &:hover {
    transform: translateY(-5px);
    filter: brightness(1.1);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.4);
    border: 4px solid black;
  }
  &:active {
    transform: scale(0.98);
  }

  @media (max-width: 500px) {
    font-size: 22px;
    width: 100%;
    border-radius: 0px;

    &:hover {
      border-width: 4px 0px 4px 0px;
    }
    &:active {
      transform: scale(1);
    }
  }
`;
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/CampaignsPage.tsx src/pages/CharacterSheetsPage.tsx
git commit -m "refactor: CampaignsPage and CharacterSheetsPage use React Query hooks"
```

---

## Task 9: Update LoginPage and RegisterPage

**Files:**
- Modify: `src/pages/LoginPage.tsx`
- Modify: `src/pages/RegisterPage.tsx`

- [ ] **Step 1: Replace `src/pages/LoginPage.tsx`**

Replace `useState(isLoading)` + direct `authService.signIn` call with `useSignIn`. Navigation and context updates go in the `mutate` call's `onSuccess`.

```tsx
import { useEffect, type FormEvent } from "react";
import SignPagesTemplate from "../components/templates/SignPagesTemplate";
import Form from "../components/atoms/Form";
import useForm from "../hooks/useForm";
import ButtonSubmit from "../components/atoms/ButtonSubmit";
import useToken from "../hooks/useToken";
import { Link, useNavigate } from "react-router-dom";
import useUser from "../hooks/useUser";
import { useSignIn } from "../hooks/useSignIn";
import BaseInput from "../components/ions/BaseInput";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { token, login } = useToken();
  const { putUser } = useUser();
  const { form, handleForm } = useForm<LoginForm>({ email: "", password: "" });
  const navigate = useNavigate();
  const { mutate: signIn, isPending } = useSignIn();

  useEffect(() => {
    if (token) navigate("/home");
  }, [token, navigate]);

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (form.email === "" || form.password === "") {
      alert("Preencha todos os campos!");
      return;
    }
    signIn(form, {
      onSuccess: (data) => {
        login(data);
        putUser(data);
        navigate("/home");
      },
      onError: (err: any) => {
        alert(err.response?.data?.message || "Erro ao fazer login");
      },
    });
  }

  return (
    <SignPagesTemplate>
      <Form onSubmit={handleSubmit}>
        <BaseInput
          name="email"
          type="email"
          placeholder="e-mail"
          value={form.email}
          onChange={handleForm}
          maxLength={64}
          required
        />
        <BaseInput
          name="password"
          type="password"
          placeholder="password"
          value={form.password}
          onChange={handleForm}
          minLength={3}
          maxLength={32}
          required
        />
        <ButtonSubmit disabled={isPending}>Log In</ButtonSubmit>
      </Form>
      <Link to="/sign-up">First time? Create an account!</Link>
    </SignPagesTemplate>
  );
}
```

- [ ] **Step 2: Replace `src/pages/RegisterPage.tsx`**

```tsx
import { type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import useForm from "../hooks/useForm";
import Form from "../components/atoms/Form";
import ButtonSubmit from "../components/atoms/ButtonSubmit";
import SignPagesTemplate from "../components/templates/SignPagesTemplate";
import type { SignUpBody } from "../types/user";
import { useSignUp } from "../hooks/useSignUp";
import useToken from "../hooks/useToken";
import BaseInput from "../components/ions/BaseInput";

function isAnyFieldEmpty({ nick, email, password, confirmPass }: SignUpBody) {
  return email === "" || password === "" || nick === "" || confirmPass === "";
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { form, handleForm } = useForm<SignUpBody>({
    nick: "",
    email: "",
    password: "",
    confirmPass: "",
  });
  const { logout } = useToken();
  const { mutate: signUp, isPending } = useSignUp();

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (isAnyFieldEmpty(form)) {
      alert("Preencha todos os campos!");
      return;
    }
    signUp(form, {
      onSuccess: () => {
        logout();
        navigate("/");
      },
      onError: (err: any) => {
        alert(err.response?.data?.message || "Erro ao criar conta");
      },
    });
  }

  return (
    <SignPagesTemplate>
      <Form onSubmit={handleSubmit}>
        <BaseInput
          name="email"
          type="email"
          placeholder="e-mail"
          value={form.email}
          onChange={handleForm}
          minLength={12}
          maxLength={64}
          required
        />
        <BaseInput
          name="nick"
          type="text"
          placeholder="nick"
          value={form.nick}
          onChange={handleForm}
          minLength={3}
          maxLength={20}
          required
        />
        <BaseInput
          name="password"
          type="password"
          placeholder="password"
          value={form.password}
          onChange={handleForm}
          minLength={8}
          maxLength={32}
          required
        />
        <BaseInput
          name="confirmPass"
          type="password"
          placeholder="confirm password"
          value={form.confirmPass}
          onChange={handleForm}
          minLength={8}
          maxLength={32}
          required
        />
        <ButtonSubmit disabled={isPending}>Sign Up</ButtonSubmit>
      </Form>
      <Link to="/">Switch back to log in</Link>
    </SignPagesTemplate>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/LoginPage.tsx src/pages/RegisterPage.tsx
git commit -m "refactor: LoginPage and RegisterPage use useSignIn/useSignUp mutation hooks"
```

---

## Task 10: Update CreateCampaignPage and CreateMatchPage

**Files:**
- Modify: `src/pages/CreateCampaignPage.tsx`
- Modify: `src/pages/CreateMatchPage.tsx`

- [ ] **Step 1: Update `src/pages/CreateCampaignPage.tsx`**

Remove `useState(isLoading)` and the manual try/catch. Keep `useState(error)` for displaying validation and API errors as a string. Replace service call with `useCreateCampaign`.

Find the existing imports block and replace it with:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateCampaign } from "../hooks/useCreateCampaign";
import worldMap from "../assets/images/worldmap.png";
import useToken from "../hooks/useToken";
import useForm from "../hooks/useForm";
import styled from "styled-components";
import PageHeader from "../components/atoms/PageHeader";
import PageTitle from "../components/ions/PageTitle";
```

Replace the state + handler inside the component (keep all the JSX/styled-components unchanged):

```tsx
export default function CreateCampaignPage() {
  const { token } = useToken();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const { form, handleForm, setForm } = useForm<CampaignFormData>({
    name: "",
    briefInitialDescription: "",
    description: "",
    isPublic: true,
    callLink: "",
    storyStartAt: new Date().toISOString().split("T")[0],
  });

  const { mutate: createCampaign, isPending } = useCreateCampaign(token);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.briefInitialDescription) {
      setError("Nome e descrição breve são obrigatórios.");
      return;
    }
    setError(null);
    createCampaign(form, {
      onSuccess: () => navigate("/campaigns"),
      onError: (err: any) => {
        setError(
          err.response?.data?.message ||
            "Erro ao criar campanha. Tente novamente."
        );
      },
    });
  };

  const handleTogglePublic = () => {
    setForm({ ...form, isPublic: !form.isPublic });
  };
  // ... rest of JSX unchanged, replace isLoading with isPending in the SubmitButton disabled prop
```

In the JSX, find `disabled={isLoading}` and change to `disabled={isPending}`, and `{isLoading ? "Criando..." : "Criar Campanha"}` to `{isPending ? "Criando..." : "Criar Campanha"}`.

- [ ] **Step 2: Update `src/pages/CreateMatchPage.tsx`**

Same pattern as `CreateCampaignPage`: remove `useState(isLoading)`, keep `useState(error)`, replace service call with `useCreateMatch`.

Replace the imports block:

```tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCreateMatch } from "../hooks/useCreateMatch";
import worldMap from "../assets/images/worldmap.png";
import styled from "styled-components";
import useToken from "../hooks/useToken";
import useForm from "../hooks/useForm";
import PageHeader from "../components/atoms/PageHeader";
import PageTitle from "../components/ions/PageTitle";
```

Replace state + handler inside the component:

```tsx
export default function CreateMatchPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { token } = useToken();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const { form, handleForm, setForm } = useForm<MatchFormData>({
    title: "",
    briefInitialDescription: "",
    description: "",
    isPublic: true,
    gameScheduledAt: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .substring(0, 16),
    storyStartAt: new Date().toISOString().split("T")[0],
  });

  const { mutate: createMatch, isPending } = useCreateMatch(token, campaignId);

  const formatDateToISOString = (dateTimeString: string): string =>
    `${dateTimeString}:00Z`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.briefInitialDescription) {
      setError("Título e descrição breve são obrigatórios.");
      return;
    }
    setError(null);
    const matchData = {
      ...form,
      gameScheduledAt: formatDateToISOString(form.gameScheduledAt),
      campaignUuid: campaignId,
    };
    createMatch(matchData, {
      onSuccess: () => navigate(`/campaigns/${campaignId}`),
      onError: (err: any) => {
        setError(
          err.response?.data?.message ||
            "Erro ao criar partida. Tente novamente."
        );
      },
    });
  };

  const handleTogglePublic = () => {
    setForm({ ...form, isPublic: !form.isPublic });
  };
  // ... rest of JSX unchanged, replace isLoading with isPending
```

In the JSX, replace `disabled={isLoading}` → `disabled={isPending}`, and `{isLoading ? "Criando..." : "Criar Partida"}` → `{isPending ? "Criando..." : "Criar Partida"}`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CreateCampaignPage.tsx src/pages/CreateMatchPage.tsx
git commit -m "refactor: CreateCampaignPage and CreateMatchPage use mutation hooks"
```

---

## Task 11: Update CampaignPage

**Files:**
- Modify: `src/pages/CampaignPage.tsx`

Replaces:
- `useEffect` + `campaignService.getCampaignDetails` → `useCampaignDetails`
- Manual `submitCharacterSheet` with state flags → `useSubmitCharacterSheet`
- Removes: `useState(campaign)`, `useState(isLoading)`, `useState(error)`, `useState(submitLoading)`, `useState(submitted)`

`isSuccess` from the mutation replaces `useState(submitted)`.

- [ ] **Step 1: Replace the top of `CampaignPage.tsx` (imports + component logic)**

Replace everything from the first line to the opening of the JSX return. Keep all styled-components at the bottom unchanged.

```tsx
import { useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import { useCampaignDetails } from "../hooks/useCampaignDetails";
import { useSubmitCharacterSheet } from "../hooks/useSubmitCharacterSheet";
import type { CharacterPrivateSummary } from "../types/campaign";
import worldMap from "../assets/images/worldmap.png";
import styled from "styled-components";
import CharacterSidebarItem from "../features/campaign/CharacterSidebarItem";
import MatchItem from "../features/campaign/MatchItem";
import AdaptiveActionButton from "../features/campaign/AdaptativeActionButton";
import { getSortedCharacters } from "../features/campaign/utils/characterUtils";
import PageHeader from "../components/atoms/PageHeader";
import { LoadingContainer, ErrorContainer } from "../components/atoms/PageStates";
import ExpandableText from "../components/molecules/ExpandableText";
import { useState } from "react";

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useToken();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { from?: string; sheetId?: string } | null;
  const backTo = locationState?.from ?? "/campaigns";
  const sheetId = locationState?.sheetId;

  const [descriptionSignal, setDescriptionSignal] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const { data: campaign, isPending, isError } = useCampaignDetails(token, id);
  const {
    mutate: submitSheet,
    isPending: submitPending,
    isSuccess: submitted,
  } = useSubmitCharacterSheet(token, id);

  const isMaster = campaign?.masterUuid === user?.uuid;

  const playerSheetId = campaign?.characterSheets.find(
    (s) => s.playerUuid === user?.uuid
  )?.uuid;

  const handleSubmitSheet = () => {
    if (!sheetId || !campaign) return;
    submitSheet({ sheetUuid: sheetId, campaignUuid: campaign.uuid });
  };

  let sortedSheets: (CharacterPrivateSummary & { isPending?: boolean })[] = [];
  if (campaign) {
    const pendingSheets = isMaster ? campaign.pendingSheets : [];
    sortedSheets = getSortedCharacters(campaign.characterSheets, pendingSheets);
  }

  const handleCreateNpc = () => {};
  const handleCreateMatch = () => {
    navigate(`/campaigns/${id}/matches/new`);
  };

  if (isPending) {
    return <LoadingContainer>Carregando campanha...</LoadingContainer>;
  }
  if (isError) {
    return <ErrorContainer>Falha ao carregar detalhes da campanha.</ErrorContainer>;
  }
  if (!campaign) {
    return <ErrorContainer>Campanha não encontrada</ErrorContainer>;
  }
```

In the JSX body, find the `AdaptiveActionButton` for "Submeter Ficha" and update its props:

```tsx
{!isMaster && !submitted && sheetId && (
  <AdaptiveActionButton
    label={submitPending ? "Submetendo..." : "Submeter Ficha"}
    type="match"
    onClick={submitPending ? () => {} : handleSubmitSheet}
    containerRef={mainContentRef}
    contentChangeSignal={descriptionSignal}
  />
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/CampaignPage.tsx
git commit -m "refactor: CampaignPage uses useCampaignDetails and useSubmitCharacterSheet"
```

---

## Task 12: Update MatchPage

**Files:**
- Modify: `src/pages/MatchPage.tsx`

Most complex page: 2 dependent `useEffect`s → 3 query hooks; 3 direct service mutations → 3 mutation hooks.

`useMatchEnrollments` / `useMatchParticipants` replace the dependent `useEffect` pattern. The `actionLoading` per-item state is kept alongside the mutations to preserve the per-row spinner UX.

- [ ] **Step 1: Replace the top of `MatchPage.tsx` (imports + component logic)**

Replace everything from the first line through the component body, keeping the styled-components at the bottom unchanged.

```tsx
import { useState, useRef } from "react";
import { Navigate, useParams, useNavigate, useLocation } from "react-router-dom";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import { useMatchDetails } from "../hooks/useMatchDetails";
import { useMatchEnrollments } from "../hooks/useMatchEnrollments";
import { useMatchParticipants } from "../hooks/useMatchParticipants";
import { useAcceptEnrollment } from "../hooks/useAcceptEnrollment";
import { useRejectEnrollment } from "../hooks/useRejectEnrollment";
import { useEnrollCharacterSheet } from "../hooks/useEnrollCharacterSheet";
import type { Participant } from "../types/match";
import type { CharacterPrivateSummary } from "../types/characterSheet";
import worldMap from "../assets/images/worldmap.png";
import styled from "styled-components";
import EnrollmentSidebarItem from "../features/match/EnrollmentSidebarItem";
import CharacterSidebarItem from "../features/campaign/CharacterSidebarItem";
import AdaptiveActionButton from "../features/campaign/AdaptativeActionButton";
import ExpandableText from "../components/molecules/ExpandableText";
import PageHeader from "../components/atoms/PageHeader";
import { LoadingContainer, ErrorContainer } from "../components/atoms/PageStates";

type MatchStatus = "scheduled" | "ongoing" | "ended";

function getMatchStatus(match: { gameStartAt?: string; storyEndAt?: string }): MatchStatus {
  if (!match.gameStartAt) return "scheduled";
  if (!match.storyEndAt) return "ongoing";
  return "ended";
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("T")[0].split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(iso: string): string {
  const [datePart, timePart] = iso.split("T");
  const [year, month, day] = datePart.split("-");
  const time = timePart?.substring(0, 5);
  return `${day}/${month}/${year}${time ? ` às ${time}` : ""}`;
}

export default function MatchPage() {
  const { campaignId, matchId } = useParams<{
    campaignId: string;
    matchId: string;
  }>();
  const { token } = useToken();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { sheetId?: string } | null;
  const sheetId = locationState?.sheetId;

  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [showLobbyConfirm, setShowLobbyConfirm] = useState(false);
  const [descriptionSignal, setDescriptionSignal] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const { data: match, isPending, isError } = useMatchDetails(token, matchId);

  const matchStarted = !!match?.gameStartAt;

  const { data: enrollments = [] } = useMatchEnrollments(
    token,
    matchId,
    !matchStarted
  );
  const { data: participants = [] } = useMatchParticipants(
    token,
    matchId,
    matchStarted
  );

  const { mutate: acceptEnrollment } = useAcceptEnrollment(token, matchId);
  const { mutate: rejectEnrollment } = useRejectEnrollment(token, matchId);
  const {
    mutate: enrollSheet,
    isPending: enrollPending,
    isSuccess: isEnrolled,
  } = useEnrollCharacterSheet(token, matchId);

  if (!token) return <Navigate to="/" replace />;

  const isMaster = !!match && match.masterUuid === user?.uuid;

  const handleAccept = (enrollmentId: string) => {
    setActionLoading((prev) => ({ ...prev, [enrollmentId]: true }));
    acceptEnrollment(enrollmentId, {
      onSettled: () =>
        setActionLoading((prev) => ({ ...prev, [enrollmentId]: false })),
    });
  };

  const handleReject = (enrollmentId: string) => {
    setActionLoading((prev) => ({ ...prev, [enrollmentId]: true }));
    rejectEnrollment(enrollmentId, {
      onSettled: () =>
        setActionLoading((prev) => ({ ...prev, [enrollmentId]: false })),
    });
  };

  const handleLobbyConfirm = () => {
    navigate(`/campaigns/${campaignId}/matches/${matchId}/lobby`);
  };

  const handleEnroll = () => {
    if (!sheetId || !match) return;
    enrollSheet({ sheetUuid: sheetId, matchUuid: match.uuid });
  };

  if (isPending)
    return <LoadingContainer>Carregando partida...</LoadingContainer>;
  if (isError) return <ErrorContainer>Falha ao carregar detalhes da partida.</ErrorContainer>;
  if (!match) return <ErrorContainer>Partida não encontrada</ErrorContainer>;

  const status = getMatchStatus(match);

  const statusLabels: Record<MatchStatus, string> = {
    scheduled: "AGENDADA",
    ongoing: "EM ANDAMENTO",
    ended: "ENCERRADA",
  };

  const canEnroll =
    !isMaster &&
    !match.gameStartAt &&
    !!sheetId &&
    !isEnrolled &&
    !enrollments.some((e) => e.characterSheet.uuid === sheetId);
```

In the JSX body, update the `canEnroll` button's props:

```tsx
{canEnroll && (
  <AdaptiveActionButton
    label={enrollPending ? "Inscrevendo..." : "Inscrever-se"}
    type="match"
    onClick={enrollPending ? () => {} : handleEnroll}
    containerRef={mainContentRef}
    contentChangeSignal={descriptionSignal}
  />
)}
```

- [ ] **Step 2: Verify final build**

```bash
npm run build
```

Expected: 0 TypeScript errors, 0 lint errors. All pages compile.

- [ ] **Step 3: Commit**

```bash
git add src/pages/MatchPage.tsx
git commit -m "refactor: MatchPage uses React Query hooks for match, enrollments, and mutations"
```

---

## Final verification

- [ ] Start the dev server and manually navigate the golden paths:
  - Login → `/home` → `/campaigns` (list loads)
  - Open a campaign (details load)
  - Open a match (enrollments load)
  - Navigate back to campaigns — verify no new network request fires within 1 minute (staleTime working)

```bash
npm run dev
```
