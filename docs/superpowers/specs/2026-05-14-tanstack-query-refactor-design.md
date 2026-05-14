# TanStack Query Refactor — Design Spec

**Date:** 2026-05-14  
**Approach:** B — Services return typed data, all network calls via React Query (queries + mutations), including auth  
**Scope:** `System_X_System_React/` only  

---

## Context

The project already has `@tanstack/react-query` v5 installed and a `QueryClientProvider` in `main.tsx`. Three hooks (`useCharacterSheet`, `usePublicCampaigns`, `useCharacterClasses`) already follow the correct pattern. However, most pages still call services directly inside `useEffect` (for GETs) or `try/catch` blocks (for POSTs), managing their own `useState(isLoading)` and `useState(error)`.

This spec defines the full refactor to make every network call go through React Query, and to clean up the service layer so it returns typed domain data instead of axios response wrappers.

---

## Architecture

Three layers with clear responsibilities:

```
services/   → HTTP transport only: axios call + snake_case↔camelCase + returns typed data
hooks/      → React Query: useQuery for GETs, useMutation for writes
pages/      → Consume hooks only. No direct service imports. No useState for loading/error.
```

The `httpClient.ts` (axios instance + 401 interceptor) is unchanged.  
The `caseConverter.ts` utility is unchanged.  
The `config.ts` auth header helper is unchanged.

---

## Service Layer Changes

Every service method changes its return type from `Promise<{ ...AxiosResponse, data: T }>` to `Promise<T>`. The transformation happens inside the service; callers receive only the domain object.

### `campaignService.ts`

| Method | New return type |
|---|---|
| `getCampaignDetails` | `Promise<CampaignMaster>` |
| `listCampaigns` | `Promise<CampaignSummary[]>` |
| `listPublicCampaigns` | `Promise<PublicCampaignSummary[]>` |
| `createCampaign` | `Promise<CampaignMaster>` |

### `characterSheetsService.ts`

| Method | New return type |
|---|---|
| `listCharacterSheets` | `Promise<CharacterSheetSummary[]>` |
| `getCharacterSheetDetails` | `Promise<CharacterSheet>` |
| `submitCharacterSheet` | `Promise<void>` |

### `characterClassesService.ts`

| Method | New return type |
|---|---|
| `listCharacterClasses` | `Promise<CharacterClass[]>` |
| `getCharacterClassDetails` | `Promise<CharacterClass>` |

### `matchService.ts`

| Method | New return type |
|---|---|
| `createMatch` | `Promise<Match>` |
| `getMatchDetails` | `Promise<Match>` |
| `getEnrollments` | `Promise<Enrollment[]>` |
| `getParticipants` | `Promise<Participant[]>` |
| `acceptEnrollment` | `Promise<void>` |
| `rejectEnrollment` | `Promise<void>` |
| `enrollCharacterSheet` | `Promise<void>` |

### `authService.ts`

| Method | New return type |
|---|---|
| `signIn` | `Promise<UserResponse>` (already close; remove wrapper inconsistency) |
| `signUp` | `Promise<UserResponse>` |

---

## Hook Layer

### New query hooks (`src/hooks/`)

| Hook | `queryKey` | `queryFn` | `enabled` |
|---|---|---|---|
| `useCampaigns(token)` | `["campaigns", token]` | `campaignService.listCampaigns(token!)` | `!!token` |
| `useCharacterSheets(token)` | `["characterSheets", token]` | `characterSheetsService.listCharacterSheets(token!)` | `!!token` |
| `useCampaignDetails(token, id)` | `["campaignDetails", token, id]` | `campaignService.getCampaignDetails(token!, id!)` | `!!token && !!id` |
| `useMatchDetails(token, matchId)` | `["matchDetails", token, matchId]` | `matchService.getMatchDetails(token!, matchId!)` | `!!token && !!matchId` |
| `useMatchEnrollments(token, matchId, enabled)` | `["matchEnrollments", token, matchId]` | `matchService.getEnrollments(token!, matchId!)` | `!!token && !!matchId && enabled` |
| `useMatchParticipants(token, matchId, enabled)` | `["matchParticipants", token, matchId]` | `matchService.getParticipants(token!, matchId!)` | `!!token && !!matchId && enabled` |

`useMatchEnrollments` and `useMatchParticipants` accept an extra `enabled` boolean driven by `!!match.gameStartAt` (participants) or `!match.gameStartAt` (enrollments). This replaces the two dependent `useEffect`s in `MatchPage`.

### New mutation hooks (`src/hooks/`)

Each mutation hook receives `token` as parameter and exposes the standard `useMutation` return (`mutate`, `isPending`, `isError`, `error`).

**Auth mutations** (`useSignIn`, `useSignUp`) only wrap the API call. They do NOT handle navigation or context updates — those are side effects that belong in the page's `onSuccess` callback passed to `mutate()`. The hook has no knowledge of `TokenContext` or `useNavigate`.

**Action mutations** handle cache invalidation internally via `onSuccess` + `queryClient.invalidateQueries`. Hooks that need a `campaignId` or `matchId` to know which cache entry to invalidate receive them as parameters.

| Hook | Signature | `mutationFn` | `onSuccess` invalidates |
|---|---|---|---|
| `useSignIn` | `useSignIn()` | `authService.signIn(body)` | — (page handles login + navigate) |
| `useSignUp` | `useSignUp()` | `authService.signUp(body)` | — (page handles logout + navigate) |
| `useCreateCampaign` | `useCreateCampaign(token)` | `campaignService.createCampaign(token!, data)` | `["campaigns", token]` |
| `useCreateMatch` | `useCreateMatch(token, campaignId)` | `matchService.createMatch(token!, data)` | `["campaignDetails", token, campaignId]` |
| `useSubmitCharacterSheet` | `useSubmitCharacterSheet(token, campaignId)` | `characterSheetsService.submitCharacterSheet(token!, ...)` | `["campaignDetails", token, campaignId]` |
| `useAcceptEnrollment` | `useAcceptEnrollment(token, matchId)` | `matchService.acceptEnrollment(token!, id)` | `["matchEnrollments", token, matchId]` |
| `useRejectEnrollment` | `useRejectEnrollment(token, matchId)` | `matchService.rejectEnrollment(token!, id)` | `["matchEnrollments", token, matchId]` |
| `useEnrollCharacterSheet` | `useEnrollCharacterSheet(token, matchId)` | `matchService.enrollCharacterSheet(token!, ...)` | `["matchEnrollments", token, matchId]` |

### Existing hooks — adjustments

| Hook | Change |
|---|---|
| `useCharacterClasses` | Add `token` to `queryKey`: `["characterClasses", token]`. Bug fix: different users shared the same cache entry. |
| `useCharacterSheet` | Update `queryFn` to consume new service signature (no `{ data }` destructure). |
| `usePublicCampaigns` | Same as above. |

---

## QueryClient Configuration (`main.tsx`)

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 minute — no redundant GETs on navigation
      retry: 1,
    },
  },
});
```

`staleTime: 60_000` means: if data was fetched less than 1 minute ago, React Query serves it from cache without a network request. Equivalent to `Cache-Control: max-age=60` for in-memory state.

---

## Page Layer Changes

Pages stop importing services directly. All loading/error state comes from hooks.

| Page | Removes | Gains |
|---|---|---|
| `CampaignsPage` | `useEffect` + `useState` × 3 + service import | `useCampaigns` |
| `CharacterSheetsPage` | `useEffect` + `useState` × 3 + service import | `useCharacterSheets` |
| `CampaignPage` | `useEffect` + `useState` × 3 + service import | `useCampaignDetails` + `useSubmitCharacterSheet` |
| `MatchPage` | 2× `useEffect` + `useState` × 6 + service import | `useMatchDetails` + `useMatchEnrollments` + `useMatchParticipants` + 3 mutation hooks |
| `CreateCampaignPage` | `useState(isLoading)` + `useState(error)` + service import | `useCreateCampaign` |
| `CreateMatchPage` | `useState(isLoading)` + `useState(error)` + service import | `useCreateMatch` |
| `LoginPage` | `useState(isLoading)` + service import | `useSignIn` |
| `RegisterPage` | `useState(isLoading)` + service import | `useSignUp` |

All `console.log` / `console.error` dev statements are removed as part of this pass.

---

## Invariants (unchanged)

- `snake_case ↔ camelCase` boundary stays in `services/` via `caseConverter.ts`.
- Auth: JWT in `localStorage["token"]` + `TokenContext`. The 401 interceptor in `httpClient.ts` is unchanged.
- `queryKey` always includes `token` (and resource `id` when applicable) so cache invalidates on logout/user switch.
- `enabled: !!token` (and `&& !!id`) on every query.
- `retry: 1` everywhere; set globally in `main.tsx`.

---

## Out of Scope

- Migrating auth token from `localStorage` to `HttpOnly` cookies (requires backend changes — separate task).
- Query key factory pattern (approach C) — easy to add later as a mechanical refactor.
- React Query DevTools — can be added independently at any time.
