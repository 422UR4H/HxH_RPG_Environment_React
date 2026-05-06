# MatchPage — Design Spec

**Date:** 2026-05-05 (rev. 2026-05-06)
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
| `src/types/match.ts` | **New** — `Match`, `Enrollment`, `Participant`, `CharacterSheetWithVisibility`, `CharacterPrivateOnly`, `PlayerRef` |
| `src/types/campaign.ts` | Import `Match` from `match.ts`; remove inline `Match` definition |
| `src/services/matchService.ts` | Add 5 new methods; also needs `masterUuid` from backend (see below) |
| `src/pages/CreateMatchPage.tsx` | Rename `gameStartAt` → `gameScheduledAt` everywhere |
| `src/App.tsx` | Add route `/campaigns/:campaignId/matches/:matchId` |
| `src/components/molecules/ExpandableText.tsx` | **New** — extract from `CampaignPage` |
| `src/components/atoms/PageStates.tsx` | **New** — extract loading/error containers |
| `src/features/match/EnrollmentSidebarItem.tsx` | **New** |
| `src/pages/MatchPage.tsx` | **New** |
| `src/pages/CampaignPage.tsx` | Use `ExpandableText` + `PageStates` |
| `src/features/campaign/CharacterSidebarItem.tsx` | Add `hasLeft?: boolean` prop → grey "Saiu" badge |

---

## Types (`src/types/match.ts`)

### `Match`
Moved here from `campaign.ts`. `campaign.ts` imports it.

```typescript
export interface Match {
  uuid: string;
  campaignUuid: string;
  masterUuid: string;          // added by backend (see note below)
  title: string;
  briefInitialDescription: string;
  briefFinalDescription?: string;
  description: string;
  isPublic: boolean;
  gameScheduledAt: string;     // real-world scheduled session date
  gameStartAt?: string;        // null = scheduled, filled = started/closed
  storyStartAt: string;
  storyEndAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

> **Backend change required:** `GET /matches/{uuid}` needs to return `master_uuid`. This is the cleanest solution — avoids a second API call and doesn't rely on heuristics. Alternative (if backend change is unavailable): a dedicated `GET /matches/{uuid}/is-master?campaign_uuid=X` endpoint.

### Derived Types (reuse existing campaign types)

```typescript
import type { CharacterBaseSummary, CharacterPrivateSummary } from "./campaign";

// Private-only fields — derived from existing type, no duplication
export type CharacterPrivateOnly = Omit<CharacterPrivateSummary, keyof CharacterBaseSummary>;

// Wraps base summary with optional private section (null = player view)
export interface CharacterSheetWithVisibility extends CharacterBaseSummary {
  private?: CharacterPrivateOnly;
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

`CharacterSheetWithVisibility` covers both master (private filled) and player (private absent) views with a single type, making the page treat either state fluidly.

---

## Service (`src/services/matchService.ts`)

New methods (all with `objToCamelCase` on response, `objToSnakeCase` on body):

```typescript
getMatchDetails(token, matchId)        // GET /matches/{uuid}
getEnrollments(token, matchId)         // GET /matches/{uuid}/enrollments
getParticipants(token, matchId)        // GET /matches/{uuid}/participants
acceptEnrollment(token, enrollmentId)  // POST /enrollments/{uuid}/accept  (empty body)
rejectEnrollment(token, enrollmentId)  // POST /enrollments/{uuid}/reject  (empty body)
```

Error handling: 404, 400, 401, 403, 500 — surfaced via rejected promise.

---

## Extracted Components

### `ExpandableText` (`src/components/molecules/ExpandableText.tsx`)
Encapsulates the 5-line collapse/expand logic with shadow effect and `ExpandButton`.

Props: `children: React.ReactNode` | `backgroundColor?: string`
Returns `null` if children is empty/falsy.
Used in: `CampaignPage` (replaces existing inline logic), `MatchPage`.

### `PageStates` (`src/components/atoms/PageStates.tsx`)
Two named styled-components exports: `LoadingContainer` and `ErrorContainer`.
Replaces the identical inline versions in `CampaignPage`, `CampaignsPage`, etc.

---

## `EnrollmentSidebarItem` (`src/features/match/EnrollmentSidebarItem.tsx`)

Props:
```typescript
{
  enrollment: Enrollment;
  isMaster: boolean;
  onAccept: (enrollmentId: string) => Promise<void>;
  onReject: (enrollmentId: string) => Promise<void>;
  onClick: () => void;   // navigate to character sheet (master only)
}
```

Behavior:
- Shows `nickName` + status badge: `Pendente` (blue) / `Aceito` (green) / `Rejeitado` (red)
- If `private` is filled (master view), shows `fullName` + health/stamina bars (same pattern as `CharacterSidebarItem`)
- If `isMaster`: always shows ✓ / ✗ buttons regardless of current status (master can change any enrollment)
- Per-enrollment loading state via `actionLoading[enrollment.uuid]`
- Click navigates to character sheet (master only), consistent with `CampaignPage`
- Styled with `styled-components`, consistent with existing sidebar items

---

## `CharacterSidebarItem` update

Adds optional `hasLeft?: boolean` prop. When true, renders a grey `"Saiu"` badge.
No breaking changes to existing usage.

---

## `MatchPage` (`src/pages/MatchPage.tsx`)

**Route:** `/campaigns/:campaignId/matches/:matchId`
**Params:** `campaignId`, `matchId`
**Auth guard:** `if (!token) navigate("/")`

### Data Fetching

1. `getMatchDetails(token, matchId)` on mount
2. `isMaster = match.masterUuid === user.uuid`
3. After match loads: if `match.gameStartAt` is null → `getEnrollments`; else → `getParticipants`

### Layout (mirrors `CampaignPage`)

```
PageHeader (back → /campaigns/:campaignId, backgroundColor="#08491f")
├── Sidebar (300px, #2d2215)
│   ├── Title: "PERSONAGENS"
│   └── EnrollmentSidebarItem list (scheduled)
│       or CharacterSidebarItem list with hasLeft (started)
└── MainContent (flex:1, worldMap background)
    ├── MatchHeader
    │   ├── title (+ "ENCERRADA" badge if gameStartAt filled)
    │   └── date display (see below)
    ├── storyStartAt
    ├── briefInitialDescription (italic, large)
    ├── ExpandableText: description
    ├── briefFinalDescription (if present, italic, border-top)
    ├── storyEndAt (if present)
    └── [Abrir Lobby button] (master only, gameStartAt === null)
```

### Date Display UX

**Scheduled** (`gameStartAt` null):
- Shows `gameScheduledAt` labeled `"Sessão agendada para:"` in the header

**Started** (`gameStartAt` filled):
- Shows `gameStartAt` labeled `"Sessão realizada em:"` as primary date
- `gameScheduledAt` shown only on hover — a small styled wrapper with CSS `title` attribute tooltip
- "ENCERRADA" badge in muted red next to the match title — makes the closed state immediately obvious without being disruptive

This decision avoids JS tooltip libraries and works purely with CSS/HTML.

### "Abrir Lobby" Flow

- Master-only, bottom of main content, visible only when `gameStartAt === null`
- On click: `showLobbyConfirm = true`
- Confirmation dialog (styled `<dialog>` or overlay):
  > "Tem certeza que deseja abrir o lobby desta partida? Os jogadores aceitos poderão entrar."
  > [Cancelar] [Confirmar]
- On confirm: `navigate(\`/campaigns/${campaignId}/matches/${matchId}/lobby\`)` — WebSocket logic is future work

### State

```typescript
match: Match | null
enrollments: Enrollment[]
participants: Participant[]
isLoading: boolean
error: string | null
actionLoading: Record<string, boolean>  // keyed by enrollment UUID
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

All API errors (404, 400, 401, 403, 500) surfaced via `ErrorContainer` from `PageStates` for page-level errors. Accept/reject action errors shown inline near the buttons — do not replace the whole page.

---

## Out of Scope (future)

- WebSocket lobby connection
- Match editing by master
- `gameStartAt` being set (starting the match) — lobby page handles this
