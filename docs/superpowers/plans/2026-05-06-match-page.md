# MatchPage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create MatchPage with enrollment management, participant listing, and master lobby flow; migrate character summary types to `characterSheet.ts`; extract shared `PageStates` and `ExpandableText` components from `CampaignPage`.

**Architecture:** Types migrate first (summaries → `characterSheet.ts`, match types → new `match.ts`), then shared UI components are extracted from `CampaignPage`, then `MatchPage` is built on top. All steps are build-verified independently. No test runner is configured — use `npm run build` and `npm run lint` to verify correctness.

**Tech Stack:** React 18, TypeScript (`verbatimModuleSyntax`, `noUnusedLocals`), styled-components, React Router v6, axios via `httpClient`, `objToCamelCase`/`objToSnakeCase` at API boundary.

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `src/types/characterSheet.ts` | Modify | Add `CharacterBaseSummary`, `CharacterPrivateSummary`, `CharacterPublicSummary` |
| `src/types/campaign.ts` | Modify | Re-export summaries from `characterSheet.ts`; re-export `Match` from `match.ts`; remove inline definitions |
| `src/types/match.ts` | **Create** | `Match`, `CharacterPrivateOnly`, `CharacterSheetWithVisibility`, `PlayerRef`, `Enrollment`, `Participant` |
| `src/services/matchService.ts` | Modify | Update import; add 5 new methods |
| `src/pages/CreateMatchPage.tsx` | Modify | Rename `gameStartAt` → `gameScheduledAt` everywhere |
| `src/components/atoms/PageStates.tsx` | **Create** | `LoadingContainer`, `ErrorContainer` styled exports |
| `src/components/molecules/ExpandableText.tsx` | **Create** | Collapsible text: 5-line cap, shadow, `ExpandButton`, `onToggle` callback |
| `src/pages/CampaignPage.tsx` | Modify | Use `PageStates` + `ExpandableText`; replace inline logic |
| `src/features/campaign/CharacterSidebarItem.tsx` | Modify | Add `hasLeft?: boolean` → grey "Saiu" badge |
| `src/features/match/EnrollmentSidebarItem.tsx` | **Create** | Enrollment item with status badge + always-active accept/reject buttons |
| `src/pages/MatchPage.tsx` | **Create** | Two-column layout; sidebar (enrollments/participants); main content; lobby confirm dialog |
| `src/App.tsx` | Modify | Add `/campaigns/:campaignId/matches/:matchId` route |

---

## Task 1: Type Foundation

**Files:**
- Modify: `src/types/characterSheet.ts`
- Create: `src/types/match.ts`
- Modify: `src/types/campaign.ts`

- [ ] **Step 1: Append character summaries to characterSheet.ts**

Append at the end of `src/types/characterSheet.ts`:

```typescript
export interface CharacterBaseSummary {
  uuid: string;
  playerUuid?: string;
  masterUuid?: string;
  campaignUuid?: string;
  nickName: string;
  storyStartAt?: string;
  storyCurrentAt?: string;
  deadAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterPrivateSummary extends CharacterBaseSummary {
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

export interface CharacterPublicSummary extends CharacterBaseSummary {}
```

- [ ] **Step 2: Create src/types/match.ts**

```typescript
import type { CharacterBaseSummary, CharacterPrivateSummary } from "./characterSheet";

export interface Match {
  uuid: string;
  campaignUuid: string;
  masterUuid: string;
  title: string;
  briefInitialDescription: string;
  briefFinalDescription?: string;
  description: string;
  isPublic: boolean;
  gameScheduledAt: string;
  gameStartAt?: string;
  storyStartAt: string;
  storyEndAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type CharacterPrivateOnly = Omit<
  CharacterPrivateSummary,
  keyof CharacterBaseSummary
>;

export interface CharacterSheetWithVisibility extends CharacterBaseSummary {
  private?: CharacterPrivateOnly;
}

export interface PlayerRef {
  uuid: string;
  nick: string;
}

export interface Enrollment {
  uuid: string;
  status: string;
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

- [ ] **Step 3: Replace src/types/campaign.ts**

Re-export the moved types so existing imports in `CampaignPage`, `CharacterSidebarItem`, etc. continue to work without changes.

```typescript
import type {
  CharacterBaseSummary,
  CharacterPrivateSummary,
  CharacterPublicSummary,
} from "./characterSheet";
import type { Match } from "./match";

export type {
  CharacterBaseSummary,
  CharacterPrivateSummary,
  CharacterPublicSummary,
  Match,
};

export interface CampaignBase {
  uuid: string;
  masterUuid: string;
  name: string;
  briefInitialDescription: string;
  briefFinalDescription?: string;
  description: string;
  isPublic: boolean;
  callLink: string;
  storyStartAt: string;
  storyCurrentAt?: string;
  storyEndAt?: string;
  createdAt: string;
  updatedAt: string;
  matches?: Match[];
}

export interface CampaignMaster extends CampaignBase {
  characterSheets: CharacterPrivateSummary[];
  pendingSheets: CharacterPrivateSummary[];
}

export interface CampaignPlayer extends CampaignBase {
  characterSheets: CharacterPublicSummary[];
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```
Expected: exits 0. If errors appear, they will name the conflicting declarations — fix duplicate interface names between old `campaign.ts` and the new `characterSheet.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/types/characterSheet.ts src/types/campaign.ts src/types/match.ts
git commit -m "refactor: move character summaries to characterSheet.ts, extract match types to match.ts"
```

---

## Task 2: Update matchService

**Files:**
- Modify: `src/services/matchService.ts`

- [ ] **Step 1: Replace matchService.ts**

```typescript
import { httpClient } from "./httpClient";
import { objToCamelCase, objToSnakeCase } from "../utils/caseConverter";
import config from "./config";
import type { Match, Enrollment, Participant } from "../types/match";

export const matchService = {
  createMatch: (token: string, matchData: object) =>
    httpClient
      .post<{ match: Match }>("/matches", objToSnakeCase(matchData), config(token))
      .then((response) => ({
        ...response,
        data: objToCamelCase<Match>(response.data.match ?? {}),
      })),

  getMatchDetails: (token: string, matchId: string) =>
    httpClient
      .get<Match>(`/matches/${matchId}`, config(token))
      .then((response) => ({
        ...response,
        data: objToCamelCase<Match>(response.data),
      })),

  getEnrollments: (token: string, matchId: string) =>
    httpClient
      .get<Enrollment[]>(`/matches/${matchId}/enrollments`, config(token))
      .then((response) => ({
        ...response,
        data: objToCamelCase<Enrollment[]>(response.data),
      })),

  getParticipants: (token: string, matchId: string) =>
    httpClient
      .get<Participant[]>(`/matches/${matchId}/participants`, config(token))
      .then((response) => ({
        ...response,
        data: objToCamelCase<Participant[]>(response.data),
      })),

  acceptEnrollment: (token: string, enrollmentId: string) =>
    httpClient.post(`/enrollments/${enrollmentId}/accept`, {}, config(token)),

  rejectEnrollment: (token: string, enrollmentId: string) =>
    httpClient.post(`/enrollments/${enrollmentId}/reject`, {}, config(token)),
};
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/services/matchService.ts
git commit -m "feat: add match service methods (getMatchDetails, enrollments, participants, accept/reject)"
```

---

## Task 3: Fix CreateMatchPage

**Files:**
- Modify: `src/pages/CreateMatchPage.tsx`

- [ ] **Step 1: Rename gameStartAt → gameScheduledAt in the interface**

Change:
```typescript
interface MatchFormData {
  title: string;
  briefInitialDescription: string;
  description: string;
  isPublic: boolean;
  gameScheduledAt: string;
  storyStartAt: string;
}
```

- [ ] **Step 2: Rename in form initial state**

Change:
```typescript
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
```

- [ ] **Step 3: Rename in handleSubmit**

Change the `matchData` construction:
```typescript
const matchData = {
  ...form,
  gameScheduledAt: formatDateToISOString(form.gameScheduledAt),
  campaignUuid: campaignId,
};
```

- [ ] **Step 4: Rename in JSX input**

Replace the datetime-local `FormGroup`:
```tsx
<FormGroup style={{ flex: 1 }}>
  <Label htmlFor="gameScheduledAt">Data e Hora da Sessão</Label>
  <Input
    id="gameScheduledAt"
    name="gameScheduledAt"
    type="datetime-local"
    value={form.gameScheduledAt}
    onChange={handleForm}
    required
  />
  <HelpText>
    Esta é a data e hora real em que a sessão de jogo acontecerá
  </HelpText>
</FormGroup>
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```
Expected: exits 0. TypeScript will catch any missed occurrences.

- [ ] **Step 6: Commit**

```bash
git add src/pages/CreateMatchPage.tsx
git commit -m "fix: rename gameStartAt to gameScheduledAt in CreateMatchPage"
```

---

## Task 4: Extract PageStates

**Files:**
- Create: `src/components/atoms/PageStates.tsx`
- Modify: `src/pages/CampaignPage.tsx`

- [ ] **Step 1: Create src/components/atoms/PageStates.tsx**

```typescript
import styled from "styled-components";

export const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  min-height: 100dvh;
  font-size: 24px;
  color: white;
`;

export const ErrorContainer = styled.div`
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  margin: 30px;
  font-size: 18px;
`;
```

- [ ] **Step 2: Update CampaignPage.tsx**

Add import:
```typescript
import { LoadingContainer, ErrorContainer } from "../components/atoms/PageStates";
```

Delete the two styled components at the bottom of the file (`LoadingContainer` and `ErrorContainer`). The component bodies and JSX usages remain unchanged.

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/atoms/PageStates.tsx src/pages/CampaignPage.tsx
git commit -m "refactor: extract PageStates (LoadingContainer, ErrorContainer) from CampaignPage"
```

---

## Task 5: Extract ExpandableText

**Files:**
- Create: `src/components/molecules/ExpandableText.tsx`
- Modify: `src/pages/CampaignPage.tsx`

- [ ] **Step 1: Create src/components/molecules/ExpandableText.tsx**

```typescript
import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import ExpandButton from "../ions/ExpandButton";

interface ExpandableTextProps {
  children: React.ReactNode;
  backgroundColor?: string;
  onToggle?: () => void;
}

export default function ExpandableText({
  children,
  backgroundColor = "#493823",
  onToggle,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!children || !textRef.current) return;
    const el = textRef.current;
    const orig = el.style.maxHeight;
    el.style.maxHeight = "none";
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    const actualHeight = el.scrollHeight;
    el.style.maxHeight = orig;
    setShowButton(actualHeight > lineHeight * 5);
  }, [children, expanded]);

  if (!children) return null;

  const handleToggle = () => {
    setExpanded((prev) => !prev);
    onToggle?.();
  };

  return (
    <Container
      $expanded={expanded}
      $showButton={showButton}
      $backgroundColor={backgroundColor}
    >
      <p ref={textRef}>{children}</p>
      {showButton && (
        <ButtonContainer>
          <ExpandButton isExpanded={expanded} setIsExpanded={handleToggle} />
        </ButtonContainer>
      )}
    </Container>
  );
}

const Container = styled.div<{
  $expanded: boolean;
  $showButton: boolean;
  $backgroundColor: string;
}>`
  font-family: "Roboto", sans-serif;
  font-weight: 300;
  font-size: 18px;
  background-color: ${({ $backgroundColor }) => $backgroundColor};
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  position: relative;
  display: flex;
  flex-direction: column;

  p {
    line-height: 1.6;
    color: white;
    max-height: ${({ $expanded }) => ($expanded ? "none" : "calc(1.6em * 5)")};
    overflow: hidden;
    position: relative;

    ${({ $expanded, $showButton }) =>
      !$expanded &&
      $showButton &&
      `
      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 50px;
        box-shadow: inset 0 -40px 50px 0 rgba(73, 56, 35, 0.9);
        pointer-events: none;
      }
    `}
  }
`;

const ButtonContainer = styled.div`
  position: absolute;
  left: 50%;
  bottom: -22px;
  transform: translateX(-50%);
  width: 54px;
`;
```

- [ ] **Step 2: Update CampaignPage.tsx**

**Add import:**
```typescript
import ExpandableText from "../components/molecules/ExpandableText";
```

**Replace state declarations** — remove:
```typescript
const [expandDescription, setExpandDescription] = useState<boolean>(false);
const [shouldShowExpandButton, setShouldShowExpandButton] = useState<boolean>(false);
```
Add:
```typescript
const [descriptionSignal, setDescriptionSignal] = useState(false);
```

**Remove** `const descriptionRef = useRef<HTMLParagraphElement>(null);`

**Remove** the entire second `useEffect` block (the one that measures `descriptionRef` height with `setShouldShowExpandButton`).

**Replace** the `<CampaignFullDescription ...>` JSX block (including its `<ExpandButtonContainer>`) with:
```tsx
<ExpandableText onToggle={() => setDescriptionSignal((s) => !s)}>
  {campaign.description}
</ExpandableText>
```

**Update both `AdaptiveActionButton` calls** — change `contentChangeSignal={expandDescription}` to `contentChangeSignal={descriptionSignal}`.

**Remove** the `CampaignFullDescription` and `ExpandButtonContainer` styled components at the bottom of the file.

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: exits 0. If `noUnusedLocals` fires on `expandDescription`, the removal in Step 2 wasn't complete — search for any remaining references.

- [ ] **Step 4: Commit**

```bash
git add src/components/molecules/ExpandableText.tsx src/pages/CampaignPage.tsx
git commit -m "refactor: extract ExpandableText molecule, apply to CampaignPage"
```

---

## Task 6: Update CharacterSidebarItem

**Files:**
- Modify: `src/features/campaign/CharacterSidebarItem.tsx`

- [ ] **Step 1: Add hasLeft prop to the interface**

```typescript
interface CharacterSidebarItemProps {
  character: CharacterPrivateSummary & { isPending?: boolean };
  isMaster: boolean;
  hasLeft?: boolean;
  onClick: () => void;
}
```

- [ ] **Step 2: Destructure hasLeft in the component**

```typescript
export default function CharacterSidebarItem({
  character,
  isMaster,
  hasLeft,
  onClick,
}: CharacterSidebarItemProps) {
```

- [ ] **Step 3: Render the badge after existing badges**

Below `{isDead && <DeadBadge>Morto</DeadBadge>}`, add:
```tsx
{hasLeft && <LeftBadge>Saiu</LeftBadge>}
```

- [ ] **Step 4: Add LeftBadge styled component**

Below the existing `NpcBadge` definition:
```typescript
const LeftBadge = styled(Badge)`
  background-color: #555;
  color: #ccc;
`;
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/features/campaign/CharacterSidebarItem.tsx
git commit -m "feat: add hasLeft badge to CharacterSidebarItem"
```

---

## Task 7: Create EnrollmentSidebarItem

**Files:**
- Create: `src/features/match/EnrollmentSidebarItem.tsx`

- [ ] **Step 1: Create src/features/match/EnrollmentSidebarItem.tsx**

```typescript
import styled from "styled-components";
import type { Enrollment } from "../../types/match";

interface EnrollmentSidebarItemProps {
  enrollment: Enrollment;
  isMaster: boolean;
  isLoading: boolean;
  onAccept: (enrollmentId: string) => Promise<void>;
  onReject: (enrollmentId: string) => Promise<void>;
  onClick: () => void;
}

export default function EnrollmentSidebarItem({
  enrollment,
  isMaster,
  isLoading,
  onAccept,
  onReject,
  onClick,
}: EnrollmentSidebarItemProps) {
  const { characterSheet, status } = enrollment;
  const priv = characterSheet.private;

  return (
    <ItemContainer $clickable={isMaster} onClick={isMaster ? onClick : undefined}>
      <TopRow>
        <NickName>{characterSheet.nickName}</NickName>
        <StatusBadge $status={status}>
          {status === "pending" && "Pendente"}
          {status === "accepted" && "Aceito"}
          {status === "rejected" && "Rejeitado"}
        </StatusBadge>
      </TopRow>

      {priv && (
        <PrivateInfo>
          <FullName>{priv.fullName}</FullName>
          <Bars>
            <Bar
              $type="health"
              $value={(priv.health.current / priv.health.max) * 100}
            />
            <Bar
              $type="stamina"
              $value={(priv.stamina.current / priv.stamina.max) * 100}
            />
          </Bars>
        </PrivateInfo>
      )}

      {isMaster && (
        <Actions>
          <ActionButton
            $variant="accept"
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              onAccept(enrollment.uuid);
            }}
          >
            ✓
          </ActionButton>
          <ActionButton
            $variant="reject"
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              onReject(enrollment.uuid);
            }}
          >
            ✗
          </ActionButton>
        </Actions>
      )}
    </ItemContainer>
  );
}

const ItemContainer = styled.div<{ $clickable: boolean }>`
  background-color: #333;
  border-radius: 8px;
  padding: 15px;
  position: relative;
  border-left: 4px solid #ffa216;
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};

  &:hover {
    background-color: ${({ $clickable }) => ($clickable ? "#444" : "#333")};
  }
`;

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

const NickName = styled.div`
  font-family: "Oswald", sans-serif;
  font-size: 18px;
  font-weight: bold;
  color: white;
`;

const StatusBadge = styled.span<{ $status: string }>`
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: bold;
  background-color: ${({ $status }) =>
    $status === "pending"
      ? "#3498db"
      : $status === "accepted"
      ? "#2ecc71"
      : "#e74c3c"};
  color: white;
`;

const PrivateInfo = styled.div`
  margin-top: 4px;
`;

const FullName = styled.div`
  font-size: 14px;
  color: #9f9f9f;
  margin-bottom: 6px;
`;

const Bars = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Bar = styled.div<{ $type: "health" | "stamina"; $value: number }>`
  height: 6px;
  background-color: #444;
  border-radius: 3px;
  position: relative;
  overflow: hidden;

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${({ $value }) => Math.min(Math.max($value, 0), 100)}%;
    background-color: ${({ $type }) =>
      $type === "health" ? "#e74c3c" : "#2ecc71"};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 10px;
`;

const ActionButton = styled.button<{ $variant: "accept" | "reject" }>`
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  background-color: ${({ $variant }) =>
    $variant === "accept" ? "#27ae60" : "#c0392b"};
  color: white;
  transition: filter 0.2s;

  &:hover:not(:disabled) {
    filter: brightness(1.15);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/features/match/EnrollmentSidebarItem.tsx
git commit -m "feat: create EnrollmentSidebarItem with status badges and accept/reject controls"
```

---

## Task 8: Create MatchPage and add route

**Files:**
- Create: `src/pages/MatchPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create src/pages/MatchPage.tsx**

```typescript
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import { matchService } from "../services/matchService";
import type { Match, Enrollment, Participant } from "../types/match";
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

function getMatchStatus(match: Match): MatchStatus {
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

  const [match, setMatch] = useState<Match | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [showLobbyConfirm, setShowLobbyConfirm] = useState(false);
  const [descriptionSignal, setDescriptionSignal] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const isMaster = !!match && match.masterUuid === user?.uuid;

  useEffect(() => {
    if (!token || !matchId) {
      navigate("/");
      return;
    }
    setIsLoading(true);
    matchService
      .getMatchDetails(token, matchId)
      .then(({ data }) => {
        setMatch(data);
        setError(null);
      })
      .catch(() => setError("Falha ao carregar detalhes da partida."))
      .finally(() => setIsLoading(false));
  }, [token, matchId, navigate]);

  useEffect(() => {
    if (!token || !match) return;
    if (!match.gameStartAt) {
      matchService
        .getEnrollments(token, match.uuid)
        .then(({ data }) => setEnrollments(data))
        .catch(() => setError("Falha ao carregar inscrições."));
    } else {
      matchService
        .getParticipants(token, match.uuid)
        .then(({ data }) => setParticipants(data))
        .catch(() => setError("Falha ao carregar participantes."));
    }
  }, [token, match]);

  const handleAccept = async (enrollmentId: string) => {
    if (!token) return;
    setActionLoading((prev) => ({ ...prev, [enrollmentId]: true }));
    try {
      await matchService.acceptEnrollment(token, enrollmentId);
      setEnrollments((prev) =>
        prev.map((e) =>
          e.uuid === enrollmentId ? { ...e, status: "accepted" } : e
        )
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, [enrollmentId]: false }));
    }
  };

  const handleReject = async (enrollmentId: string) => {
    if (!token) return;
    setActionLoading((prev) => ({ ...prev, [enrollmentId]: true }));
    try {
      await matchService.rejectEnrollment(token, enrollmentId);
      setEnrollments((prev) =>
        prev.map((e) =>
          e.uuid === enrollmentId ? { ...e, status: "rejected" } : e
        )
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, [enrollmentId]: false }));
    }
  };

  const handleLobbyConfirm = () => {
    navigate(`/campaigns/${campaignId}/matches/${matchId}/lobby`);
  };

  if (isLoading)
    return <LoadingContainer>Carregando partida...</LoadingContainer>;
  if (error) return <ErrorContainer>{error}</ErrorContainer>;
  if (!match) return <ErrorContainer>Partida não encontrada</ErrorContainer>;

  const status = getMatchStatus(match);

  const statusLabels: Record<MatchStatus, string> = {
    scheduled: "AGENDADA",
    ongoing: "EM ANDAMENTO",
    ended: "ENCERRADA",
  };

  return (
    <MatchContainer>
      <PageHeader to={`/campaigns/${campaignId}`} backgroundColor="#08491f" />
      <PageBody>
        <SidebarContainer ref={sidebarRef}>
          <SidebarTitle>PERSONAGENS</SidebarTitle>
          <CharactersList>
            {!match.gameStartAt
              ? enrollments.map((enrollment) => (
                  <EnrollmentSidebarItem
                    key={enrollment.uuid}
                    enrollment={enrollment}
                    isMaster={isMaster}
                    isLoading={!!actionLoading[enrollment.uuid]}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onClick={() =>
                      navigate(
                        `/character-sheets/${enrollment.characterSheet.uuid}`
                      )
                    }
                  />
                ))
              : participants.map((participant) => {
                  const priv = participant.characterSheet.private;
                  if (!priv) {
                    return (
                      <BasicParticipantItem key={participant.uuid}>
                        <span>{participant.characterSheet.nickName}</span>
                        {participant.leftAt && (
                          <LeftBadge>Saiu</LeftBadge>
                        )}
                      </BasicParticipantItem>
                    );
                  }
                  const character: CharacterPrivateSummary & {
                    isPending?: boolean;
                  } = {
                    ...participant.characterSheet,
                    ...priv,
                    isPending: false,
                  };
                  return (
                    <CharacterSidebarItem
                      key={participant.uuid}
                      character={character}
                      isMaster={isMaster}
                      hasLeft={!!participant.leftAt}
                      onClick={() =>
                        navigate(
                          `/character-sheets/${participant.characterSheet.uuid}`
                        )
                      }
                    />
                  );
                })}
          </CharactersList>
        </SidebarContainer>

        <MainContentContainer ref={mainContentRef}>
          <MatchHeader>
            <MatchTitle>{match.title.toUpperCase()}</MatchTitle>
            <DateSection>
              <StatusPill $status={status}>{statusLabels[status]}</StatusPill>
              {status === "scheduled" ? (
                <DateLabel>
                  Agendada para:{" "}
                  <span>{formatDateTime(match.gameScheduledAt)}</span>
                </DateLabel>
              ) : (
                <DateLabel>
                  Iniciada em:{" "}
                  <DateValueWithTooltip
                    title={`Agendada para: ${formatDateTime(match.gameScheduledAt)}`}
                  >
                    {formatDateTime(match.gameStartAt!)}
                  </DateValueWithTooltip>
                </DateLabel>
              )}
            </DateSection>
          </MatchHeader>

          <StoryDate>Início na história: {formatDate(match.storyStartAt)}</StoryDate>

          <MatchBriefDescription>
            {match.briefInitialDescription}
          </MatchBriefDescription>

          <ExpandableText
            onToggle={() => setDescriptionSignal((s) => !s)}
          >
            {match.description}
          </ExpandableText>

          {match.briefFinalDescription && (
            <MatchFinalDescription>
              {match.briefFinalDescription}
            </MatchFinalDescription>
          )}

          {match.storyEndAt && (
            <StoryDate>
              Fim na história: {formatDate(match.storyEndAt)}
            </StoryDate>
          )}

          <ActionsList>
            {isMaster && !match.gameStartAt && (
              <AdaptiveActionButton
                label="Abrir Lobby"
                type="match"
                onClick={() => setShowLobbyConfirm(true)}
                containerRef={mainContentRef}
                contentChangeSignal={descriptionSignal}
              />
            )}
          </ActionsList>
        </MainContentContainer>
      </PageBody>

      {showLobbyConfirm && (
        <ConfirmOverlay onClick={() => setShowLobbyConfirm(false)}>
          <ConfirmDialog onClick={(e) => e.stopPropagation()}>
            <ConfirmText>
              Tem certeza que deseja abrir o lobby desta partida? Os jogadores
              aceitos poderão entrar.
            </ConfirmText>
            <ConfirmButtons>
              <DialogCancelButton onClick={() => setShowLobbyConfirm(false)}>
                Cancelar
              </DialogCancelButton>
              <DialogLobbyButton onClick={handleLobbyConfirm}>
                Abrir Lobby
              </DialogLobbyButton>
            </ConfirmButtons>
          </ConfirmDialog>
        </ConfirmOverlay>
      )}
    </MatchContainer>
  );
}

const MatchContainer = styled.div`
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
`;

const PageBody = styled.main`
  display: flex;
  color: white;
  min-height: 0;
  overflow: hidden;
`;

const SidebarContainer = styled.div`
  width: 300px;
  background-color: #2d2215;
  padding: 20px;
  position: relative;
  overflow-y: auto;
  flex-shrink: 0;
`;

const SidebarTitle = styled.h2`
  font-family: "Roboto", sans-serif;
  font-weight: 700;
  font-size: 32px;
  text-align: center;
  color: white;
  margin-bottom: 20px;
  border-bottom: 1px solid #696969;
  padding-bottom: 10px;
`;

const CharactersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  padding-bottom: 103px;
`;

const BasicParticipantItem = styled.div`
  background-color: #333;
  border-radius: 8px;
  padding: 15px;
  border-left: 4px solid #ffa216;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: "Oswald", sans-serif;
  font-size: 18px;
  font-weight: bold;
  color: white;
`;

const LeftBadge = styled.span`
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: bold;
  background-color: #555;
  color: #ccc;
`;

const MainContentContainer = styled.div`
  flex: 1;
  padding: 30px 30px 20px 30px;
  overflow-y: auto;
  background-image: url(${worldMap});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
`;

const MatchHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 40px;
  margin-bottom: 20px;
`;

const MatchTitle = styled.h1`
  font-family: "Roboto", sans-serif;
  font-size: 42px;
  font-weight: 900;
  color: white;
`;

const DateSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
`;

const StatusPill = styled.span<{ $status: MatchStatus }>`
  font-family: "Roboto", sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 4px 12px;
  border-radius: 20px;
  background-color: ${({ $status }) =>
    $status === "scheduled"
      ? "#b8860b"
      : $status === "ongoing"
      ? "#27ae60"
      : "#7d3030"};
  color: white;
`;

const DateLabel = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: 18px;
  color: white;
  text-align: right;
`;

const DateValueWithTooltip = styled.span`
  text-decoration: underline dotted;
  cursor: help;
`;

const StoryDate = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: 18px;
  color: white;
  margin-bottom: 20px;
`;

const MatchBriefDescription = styled.p`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: 26px;
  line-height: 1.5;
  margin-bottom: 20px;
  color: white;
  font-style: italic;
`;

const MatchFinalDescription = styled.p`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: 18px;
  line-height: 1.5;
  font-style: italic;
  color: #e0e0e0;
  border-top: 1px solid #555;
  padding-top: 15px;
  margin-bottom: 20px;
`;

const ActionsList = styled.div`
  position: relative;
  padding-bottom: 112px;
`;

const ConfirmOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

const ConfirmDialog = styled.div`
  background-color: #2d2215;
  border-radius: 12px;
  padding: 30px;
  max-width: 480px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const ConfirmText = styled.p`
  font-family: "Roboto", sans-serif;
  font-size: 20px;
  color: white;
  line-height: 1.5;
`;

const ConfirmButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const BaseDialogButton = styled.button`
  font-family: "Roboto", sans-serif;
  font-size: 18px;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
  }
`;

const DialogCancelButton = styled(BaseDialogButton)`
  background-color: transparent;
  border: 1px solid white;
  color: white;
`;

const DialogLobbyButton = styled(BaseDialogButton)`
  background-color: #107135;
  border: none;
  color: white;
`;
```

- [ ] **Step 2: Add route to App.tsx**

Add import:
```typescript
import MatchPage from "./pages/MatchPage";
```

Add route inside `<Routes>` (after the `CreateMatchPage` route):
```tsx
<Route
  path="/campaigns/:campaignId/matches/:matchId"
  element={<MatchPage />}
/>
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/pages/MatchPage.tsx src/App.tsx
git commit -m "feat: add MatchPage with enrollment management, participant listing, and lobby confirm dialog"
```
