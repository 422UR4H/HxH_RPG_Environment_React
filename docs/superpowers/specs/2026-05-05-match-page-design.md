# MatchPage — Design Spec

**Date:** 2026-05-05  
**Status:** Approved

---

## Goal

Create `MatchPage` (`/campaigns/:campaignId/matches/:matchId`) modeled on `CampaignPage`, with enrollment management (accept/reject), participant listing, and a master-only "Abrir Lobby" flow. Opportunistically extract reusable components along the way.

---

## Architecture

### Match States

A match has two states, determined by `gameStartAt`:

| State | Condition | Sidebar endpoint |
|---|---|---|
| Scheduled (open) | `gameStartAt` is null | `GET /matches/{uuid}/enrollments` |
| Started | `gameStartAt` is filled | `GET /matches/{uuid}/participants` |

### New / Modified Files

| File | Action |
|---|---|
| `src/types/campaign.ts` | Update `Match`; add `Enrollment`, `Participant`, `CharacterSheetWithVisibility`, `CharacterPrivateOnly` |
| `src/services/matchService.ts` | Add 5 new methods |
| `src/pages/CreateMatchPage.tsx` | Rename `gameStartAt` → `gameScheduledAt` everywhere |
| `src/App.tsx` | Add route `/campaigns/:campaignId/matches/:matchId` |
| `src/components/molecules/ExpandableText.tsx` | **New** — extract from `CampaignPage` |
| `src/components/atoms/PageStates.tsx` | **New** — extract loading/error containers |
| `src/features/match/EnrollmentSidebarItem.tsx` | **New** |
| `src/pages/MatchPage.tsx` | **New** |
| `src/pages/CampaignPage.tsx` | Use `ExpandableText` + `PageStates` |
| `src/features/campaign/CharacterSidebarItem.tsx` | Add `hasLeft?: boolean` prop → grey "Saiu" badge |

---

## Types (`src/types/campaign.ts`)

### Updated `Match`
```typescript
export interface Match {
  uuid: string;
  campaignUuid: string;
  title: string;
  briefInitialDescription: string;
  briefFinalDescription?: string;
  description: string;         // new field
  isPublic: boolean;
  gameScheduledAt: string;     // renamed from gameStartAt (real-world session date)
  gameStartAt?: string;        // nullable — null = scheduled, filled = started
  storyStartAt: string;
  storyEndAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### New Types
```typescript
export interface CharacterPrivateOnly {
  fullName: string;
  alignment: string;
  characterClass: string;
  birthday: string;
  categoryName: string;
  currHexValue?: number;
  level: number;
  points: number;
  talentLvl: number;
  physicalsLvl: number;
  mentalsLvl: number;
  spiritualsLvl: number;
  skillsLvl: number;
  stamina: StatusBar;
  health: StatusBar;
}

export interface CharacterSheetWithVisibility extends CharacterBaseSummary {
  private?: CharacterPrivateOnly;  // null for players, filled for master
}

export interface PlayerRef {
  uuid: string;
  nick: string;
}

export interface Enrollment {
  uuid: string;
  status: string;  // "pending" | "accepted" | "rejected"
  createdAt: string;
  characterSheet: CharacterSheetWithVisibility;
  player: PlayerRef;
}

export interface Participant {
  uuid: string;
  joinedAt: string;
  leftAt?: string;
  characterSheet: CharacterSheetWithVisibility;
}
```

---

## Service (`src/services/matchService.ts`)

New methods (all with `objToCamelCase` on response, `objToSnakeCase` on body):

```typescript
getMatchDetails(token, matchId)       // GET /matches/{uuid}
getEnrollments(token, matchId)        // GET /matches/{uuid}/enrollments
getParticipants(token, matchId)       // GET /matches/{uuid}/participants
acceptEnrollment(token, enrollmentId) // POST /enrollments/{uuid}/accept  (empty body)
rejectEnrollment(token, enrollmentId) // POST /enrollments/{uuid}/reject  (empty body)
```

Error handling: 404, 400, 401, 403, 500 — all surfaced to the component via rejected promise.

---

## Extracted Components

### `ExpandableText` (`src/components/molecules/ExpandableText.tsx`)
Encapsulates the 5-line collapse/expand logic with shadow effect and `ExpandButton`.

Props: `children: React.ReactNode` | `backgroundColor?: string`  
Returns `null` if children is empty/falsy.  
Used in: `CampaignPage` (replaces existing inline logic), `MatchPage`.

### `PageStates` (`src/components/atoms/PageStates.tsx`)
Two named styled exports: `LoadingContainer` and `ErrorContainer`.  
Identical to what currently exists inline in `CampaignPage`, `CampaignsPage`, etc.

---

## `EnrollmentSidebarItem` (`src/features/match/EnrollmentSidebarItem.tsx`)

Props:
```typescript
{
  enrollment: Enrollment;
  isMaster: boolean;
  onAccept: (enrollmentId: string) => Promise<void>;
  onReject: (enrollmentId: string) => Promise<void>;
  onClick: () => void;       // navigate to character sheet (master only)
}
```

Behavior:
- Shows `nickName` + status badge: `Pendente` (blue) / `Aceito` (green) / `Rejeitado` (red)
- If `private` is filled (master), shows `fullName` and health/stamina bars (same as `CharacterSidebarItem`)
- If `status === "pending"` and `isMaster`: shows inline ✓ / ✗ buttons with per-enrollment loading state
- Click on item navigates to character sheet (master only)
- Styled with `styled-components`, consistent with existing sidebar items

---

## `CharacterSidebarItem` update

Adds `hasLeft?: boolean` prop. When true, renders a grey `"Saiu"` badge.  
No breaking changes.

---

## `MatchPage` (`src/pages/MatchPage.tsx`)

**Route:** `/campaigns/:campaignId/matches/:matchId`  
**Params:** `campaignId`, `matchId`  
**Auth guard:** `if (!token) navigate("/")`

### Data fetching
1. Parallel: `getMatchDetails(token, matchId)` + `getCampaignDetails(token, campaignId)`
2. `isMaster = campaign.masterUuid === user.uuid` (same pattern as `CampaignPage`)
3. After match loads: if `match.gameStartAt` is null → `getEnrollments(token, matchId)`; else → `getParticipants(token, matchId)`

> **Why parallel campaign fetch:** `getMatchDetails` doesn't return `masterUuid`. Inferring master role from `private` presence on enrollments breaks when the list is empty (master with zero enrollments would lose master-only UI). Parallel fetch adds no perceived latency and reuses the existing `campaignService.getCampaignDetails`.

### Layout (mirrors `CampaignPage`)
```
PageHeader (back → /campaigns/:campaignId, backgroundColor="#08491f")
├── Sidebar (300px, #2d2215)
│   ├── Title: "PERSONAGENS"
│   └── List of EnrollmentSidebarItem (scheduled) or CharacterSidebarItem (started)
└── MainContent (flex:1, worldMap background)
    ├── MatchHeader: title + gameScheduledAt
    ├── storyStartAt
    ├── briefInitialDescription (italic, large)
    ├── ExpandableText: description
    ├── briefFinalDescription (if present)
    ├── storyEndAt (if present)
    └── [Abrir Lobby button] (master only, gameStartAt is null)
```

### "Abrir Lobby" flow
- Button rendered at the bottom of main content, master-only, `gameStartAt === null`
- On click: sets `showLobbyConfirm = true`
- Confirmation dialog (styled `<dialog>` or overlay):
  > "Tem certeza que deseja abrir o lobby desta partida? Os jogadores aceitos poderão entrar."
  > [Cancelar] [Confirmar]
- On confirm: `navigate(\`/campaigns/${campaignId}/matches/${matchId}/lobby\`)` — WebSocket logic is future work

### State
```typescript
match: Match | null
enrollments: Enrollment[]      // or
participants: Participant[]
isLoading: boolean
error: string | null
actionLoading: Record<string, boolean>  // per-enrollment loading for accept/reject
showLobbyConfirm: boolean
```

---

## Routing (`src/App.tsx`)

```tsx
<Route
  path="/campaigns/:campaignId/matches/:matchId"
  element={<MatchPage />}
/>
```

---

## Error Handling

All API errors (404, 400, 401, 403, 500) are caught and displayed via `ErrorContainer` from `PageStates`. For accept/reject actions, errors are shown inline (small error message near the buttons), not replacing the whole page.

---

## Out of Scope (future)

- WebSocket lobby connection
- Match editing by master
- `gameStartAt` being set (starting the match) — lobby page will handle this
