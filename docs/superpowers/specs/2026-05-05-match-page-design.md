# MatchPage — Design Spec

**Date:** 2026-05-05 (rev. 2026-05-06 × 2)
**Status:** Approved

---

## Goal

Create `MatchPage` (`/campaigns/:campaignId/matches/:matchId`) modeled on `CampaignPage`, with enrollment management (accept/reject), participant listing, and a master-only "Abrir Lobby" flow. Opportunistically extract reusable components along the way.

---

## Architecture

### Match States

| State | Condition | Sidebar endpoint | Status pill |
|---|---|---|---|
| Agendada | `gameStartAt` null | `GET /matches/{uuid}/enrollments` | 🟡 amarelo |
| Em Andamento | `gameStartAt` filled, `storyEndAt` null | `GET /matches/{uuid}/participants` | 🟢 verde |
| Encerrada | `gameStartAt` filled, `storyEndAt` filled | `GET /matches/{uuid}/participants` | 🔴 vermelho apagado |

`storyEndAt` only affects the status pill. Sidebar/endpoint logic is driven by `gameStartAt` alone.

### New / Modified Files

| File | Action |
|---|---|
| `src/types/characterSheet.ts` | Move `CharacterBaseSummary`, `CharacterPrivateSummary` here from `campaign.ts` |
| `src/types/campaign.ts` | Import summaries from `characterSheet.ts`; import `Match` from `match.ts`; remove inline definitions |
| `src/types/match.ts` | **New** — `Match`, `CharacterPrivateOnly`, `CharacterSheetWithVisibility`, `PlayerRef`, `Enrollment`, `Participant` |
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

## Types

### `src/types/characterSheet.ts` — summaries moved here

`CharacterBaseSummary` and `CharacterPrivateSummary` (and `StatusBar`) move from `campaign.ts` to `characterSheet.ts` — they describe the character sheet entity, not the campaign. `campaign.ts` imports them from here.

### `src/types/match.ts`

```typescript
import type { CharacterBaseSummary, CharacterPrivateSummary } from "./characterSheet";

export interface Match {
  uuid: string;
  campaignUuid: string;
  masterUuid: string;        // backend adds master_uuid to GET /matches/{uuid}
  title: string;
  briefInitialDescription: string;
  briefFinalDescription?: string;
  description: string;
  isPublic: boolean;
  gameScheduledAt: string;   // real-world scheduled session date
  gameStartAt?: string;      // null = scheduled, filled = started
  storyStartAt: string;
  storyEndAt?: string;       // filled = match ended (affects status pill only)
  createdAt: string;
  updatedAt: string;
}

// Private-only fields — derived from existing type, no duplication
export type CharacterPrivateOnly = Omit<CharacterPrivateSummary, keyof CharacterBaseSummary>;

// Wraps base summary with optional private section (absent = player view)
export interface CharacterSheetWithVisibility extends CharacterBaseSummary {
  private?: CharacterPrivateOnly;
}

export interface PlayerRef {
  uuid: string;
  nick: string;
}

export interface Enrollment {
  uuid: string;
  status: string;   // "pending" | "accepted" | "rejected"
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

`CharacterSheetWithVisibility` handles both master (private filled) and player (private absent) with a single type — the page treats either state fluidly.

> **Backend change agreed:** `GET /matches/{uuid}` will return `master_uuid`.

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

Errors: 404, 400, 401, 403, 500 — surfaced via rejected promise.

---

## Extracted Components

### `ExpandableText` (`src/components/molecules/ExpandableText.tsx`)
Encapsulates the 5-line collapse/expand logic with shadow + `ExpandButton`.
Props: `children: React.ReactNode`, `backgroundColor?: string`.
Returns `null` if children is empty/falsy.
Used in `CampaignPage` (replaces existing inline logic) and `MatchPage`.

### `PageStates` (`src/components/atoms/PageStates.tsx`)
Named styled-components exports: `LoadingContainer`, `ErrorContainer`.
Replaces identical inline versions in `CampaignPage`, `CampaignsPage`, etc.

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
- If `private` is filled (master view): shows `fullName` + health/stamina bars (same pattern as `CharacterSidebarItem`)
- If `isMaster`: always shows ✓ / ✗ buttons for all enrollments (master can change any status)
- Per-enrollment loading via `actionLoading[enrollment.uuid]`
- Click navigates to character sheet (master only)
- Styled with `styled-components`, consistent with existing sidebar items

---

## `CharacterSidebarItem` update

Adds optional `hasLeft?: boolean` prop. When true, renders a grey `"Saiu"` badge.
No breaking changes.

---

## `MatchPage` (`src/pages/MatchPage.tsx`)

**Route:** `/campaigns/:campaignId/matches/:matchId`
**Auth guard:** `if (!token) navigate("/")`

### Data Fetching

1. `getMatchDetails(token, matchId)` on mount
2. `isMaster = match.masterUuid === user.uuid`
3. After match loads: `gameStartAt` null → `getEnrollments`; filled → `getParticipants`

### Layout (mirrors `CampaignPage`)

```
PageHeader (back → /campaigns/:campaignId, backgroundColor="#08491f")
├── Sidebar (300px, #2d2215)
│   ├── Title: "PERSONAGENS"
│   └── EnrollmentSidebarItem list  (gameStartAt null)
│       or CharacterSidebarItem list with hasLeft  (gameStartAt filled)
└── MainContent (flex:1, worldMap background)
    ├── MatchHeader
    │   ├── title (left)
    │   └── status pill + date info (right, same column)
    ├── storyStartAt
    ├── briefInitialDescription (italic, large)
    ├── ExpandableText: description
    ├── briefFinalDescription (if present, italic, border-top)
    ├── storyEndAt (if present)
    └── [Abrir Lobby button] (master only, gameStartAt === null)
```

### Status Pill + Date Display

The pill sits in the right column of `MatchHeader`, clearly separated from the title.

| State | Pill | Date label | Date value |
|---|---|---|---|
| Agendada | `AGENDADA` amarelo | "Agendada para:" | `gameScheduledAt` |
| Em Andamento | `EM ANDAMENTO` verde | "Iniciada em:" | `gameStartAt` + hover tooltip → `gameScheduledAt` |
| Encerrada | `ENCERRADA` vermelho apagado | "Iniciada em:" | `gameStartAt` + hover tooltip → `gameScheduledAt` |

Hover tooltip uses CSS `title` attribute — no JS library needed.

### "Abrir Lobby" Flow

- Master-only, bottom of main content, `gameStartAt === null` only
- On click: `showLobbyConfirm = true`
- Confirmation dialog:
  > "Tem certeza que deseja abrir o lobby desta partida? Os jogadores aceitos poderão entrar."
  > [Cancelar] [Confirmar]
- On confirm: `navigate(\`/campaigns/${campaignId}/matches/${matchId}/lobby\`)` — WebSocket is future work

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

Page-level errors via `ErrorContainer` from `PageStates`.
Accept/reject errors shown inline near the buttons — do not replace the whole page.

---

## Out of Scope (future)

- WebSocket lobby connection
- Match editing by master
- Setting `gameStartAt` (opening the match) — lobby page handles this
