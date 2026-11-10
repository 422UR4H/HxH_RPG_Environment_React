# Story Clock, Combat Close and End Match — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The table shows the story clock to everyone and gives the master a game-grade clock control; scene change closes combat with its summary; the master ends the match; ended matches redirect out of `/game` and `/lobby` for good.

**Architecture:** Clock state lives in the combat reducer (server-owned; no optimistic state). A `useStoryClock` hook ticks locally from the last `clock_changed`/`match_full_state`. Feature code in `src/features/match/clock/`; dialogs reuse `dialogStyles`/`ConfirmDialog`; colors only from `src/styles/tokens.ts`.

**Tech Stack:** React 19 + TypeScript strict, styled-components, React Query, Vitest + Testing Library.

**Spec:** `System_X_System/docs/superpowers/specs/2026-11-08-story-clock-design.pt-br.md` (§8 is the front; read it whole). **Contract (authority for every wire name):** `System_X_System/docs/dev/api/match-clock.md`, plus the updated `match-combat-ws.md`, `match.md`, `match-history.md` — read them in the backend worktree `System_X_System/.worktrees/story-clock`.

## Global Constraints

- Work ONLY in `System_X_System_React/.worktrees/story-clock` on branch `feat/story-clock`. Check `git branch --show-current` before every commit; only `git add <your files>` + `git commit`.
- Identifiers, file names and test titles (`describe`/`it`) in **English**; UI copy, comments and guard messages in **Portuguese** (`CLAUDE.md` Language rule). `verbatimModuleSyntax`: type-only imports use `import type`.
- Colors only through `colors.*` from `src/styles/tokens.ts`; no hex/rgba in components (guard test). Do NOT add palette entries; a new semantic token must point to an existing palette value and be justified in the report (`src/styles/CLAUDE.md`).
- **Story time is naive.** Wire `"2000-01-01T08:30:00"` (no Z). Never `new Date(str)` / `Date.parse` on it; all math goes through `storyTime.ts` (Task 1). Tests must pass with `TZ=America/Sao_Paulo` and `TZ=Asia/Tokyo`.
- Long skip: forward move strictly > 172 800 s needs confirmation; send `confirmLongSkip: true` only after the master confirms.
- **No calendar / date picker anywhere** (owner). Date moves by ±1 day steppers; time by numeric fields.
- Escalation for the master while real time runs: pulse every 10 s, stronger at every 60 s, from 5 min a steady alert tone + a short notice every 5 min. `prefers-reduced-motion: reduce` → no transform/animation, opacity/color steps only.
- Player notices: one per master change, coalescing consecutive `adjust`/`set` into the visible notice; `kind: round` and `kind: limit` never notify.
- After each task: `npm run lint && npx tsc -b` and the task's tests; `npm run test` (whole suite) before the last commit of each task.

## Review Focus

1. Naive time across time zones: `addSeconds("2000-01-01T23:59:59", 1)` → `"2000-01-02T00:00:00"` and formatting must not move with the browser TZ. Test in Task 1 under two `TZ` values.
2. A reconnect (`match_full_state`) while real time runs must resume ticking from the server value, not from the stale local one, and must not reset the master's escalation phase to "quiet" unless the clock is actually paused. Test in Task 2.
3. Back button after the match ends: from the match page, history back must never land on `/game` (`navigate(..., { replace: true })` and the `/game` guard). Test in Task 9.
4. Disabled controls must still explain themselves on touch (Tooltip with `aria-disabled`, the project pattern) — Race play button, crossing-limit minus buttons, end-match button. Tests in Tasks 5 and 9.
5. The master's start-time dialog must not be dismissible (no Esc, no outside click), and must reappear after reload while `storyAt` is null. Test in Task 6.

---

### Task 1: Wire types, naive time utils, reducer and socket plumbing

**Files:**
- Create: `src/features/match/clock/storyTime.ts`, `src/features/match/clock/clockMessages.ts`
- Modify: `src/types/match.ts` (`storyStartTime?`, `gameEndAt?`, `storyEndTime?`), `src/features/match/combat/combatMessages.ts` (`ChangeScenePayload` gains `briefFinalDescription?`, `storyAt?`, `confirmLongSkip?`; `MatchFullStatePayload.clock?`; union gains `clock_changed`, `combat_summary`, `match_ended`), `src/features/match/combat/combatReducer.ts` (`clock` slice), `src/features/match/combat/useMatchCombat.ts` (send helpers; `clock_changed` in `HISTORY_TYPES`), `src/hooks/useMatchWs.ts` (route the three types; close code `4002` → new status `"ended"`), `src/features/match/combat/combatErrorMessages.ts` (PT copy for every new error code)
- Test: `src/features/match/clock/__tests__/storyTime.test.ts`, `combatReducer.test.ts`, `useMatchCombat.test.ts`, `combatErrorMessages.test.ts`

**Interfaces:**
- Produces (`storyTime.ts`): `type StoryParts = { y, mo, d, h, mi, s: number }`; `parseStory(s: string): StoryParts` (throws on offset/Z); `formatStory(p: StoryParts): string`; `addSeconds(s: string, n: number): string`; `diffSeconds(a: string, b: string): number` (a − b); `compareStory(a, b): -1|0|1`; `formatDateBR(s): "01/01/2000"`; `formatTime(s): "08:30:00"`; `formatDelta(seconds): string` → `"+2 h 10 min"`, `"−15 min"`, `"+1 dia 2 h"`, `"+2 dias"`, `"+45 s"`, `"0 s"` (U+2212 minus; units dia/dias, h, min, s; omit zero units; largest first). Implementation: epoch-free day arithmetic (days-from-civil), no `Date`.
- Produces (`clockMessages.ts`): `ClockState = { storyAt: string | null; running: boolean; limitAt: string | null; limitReason: LimitReason | "" }`, `ClockChange = { kind: ClockChangeKind; from?: string; to?: string; deltaSeconds?: number; reason?: PauseReason }`, `CombatSummary` and `MatchEnded` exactly as the contract.
- Reducer: `state.clock: { value: ClockState | null; receivedAt: number; lastChange: ClockChange | null; changeSeq: number }` set by `match_full_state.clock` (no `lastChange`) and `clock_changed` (bumps `changeSeq`). `ClockState` carries the server's monotonic `seq`: a `clock_changed` or full state whose `seq` is lower than the stored one is ignored (the server sends clock messages on two lanes without order guarantee) — test it; `state.combatSummary: CombatSummary | null`; `state.matchEnded: MatchEnded | null`.
- `useMatchCombat` returns `setClockStart(time)`, `adjustClock(deltaSeconds, confirmLongSkip?)`, `setClock(storyAt, confirmLongSkip?)`, `playClock()`, `pauseClock()`, `requestCombatSummary()`, `endMatch({ storyAt, briefFinalDescription?, confirmLongSkip? })`, each `boolean` like `enqueueAction`.
- [ ] Failing tests: `storyTime` (day/month/year rollover incl. 2000-02-29, negative add across midnight, `formatDelta` table above, parse rejects `"…Z"`), run under `TZ=Asia/Tokyo` and `TZ=America/Sao_Paulo` (`TZ=… npx vitest run src/features/match/clock`); reducer `clock_changed` / `match_full_state.clock` / `match_ended`; `useMatchWs` maps close 4002 → `"ended"`; every new error code has PT copy.
- [ ] Implement; tests pass; commit `feat(clock): wire types, naive time and reducer`.

### Task 2: `useStoryClock` — live value and the master's attention phases

**Files:** Create `src/features/match/clock/useStoryClock.ts`; Test `src/features/match/clock/__tests__/useStoryClock.test.ts`

**Interfaces:**
- `useStoryClock(clock: CombatState["clock"], opts: { escalate: boolean }): { now: string | null; running: boolean; limitAt: string | null; limitReason; realElapsedSeconds: number; phase: "idle" | "running" | "pulse" | "strongPulse" | "alert"; pulseKey: number }`.
- `now` = `value.storyAt + floor((Date.now() − receivedAt)/1000)` while running, ticking on a 1 s interval aligned to `receivedAt`; idle when paused. `realElapsedSeconds` counts from the last `play` change (or from receipt when a full state arrives running). Escalation (only when `escalate`): `pulse` at each 10 s multiple, `strongPulse` at each 60 s multiple, `alert` steady from 300 s with `pulseKey` bumping at every 300 s multiple; `pulseKey` changes on each pulse so CSS can re-trigger.
- [ ] Failing tests with fake timers: ticking; pause freezes; reconnect running resumes from the new value (Review Focus 2); phases at 10/60/300/600 s; `escalate:false` never leaves `running`.
- [ ] Implement; commit `feat(clock): live story clock hook`.

### Task 3: Stopwatch icon and the clock pill (HUD)

**Files:** Create `src/components/ions/StopwatchIcon.tsx` (inline SVG, `stroke="currentColor"`, 24×24 viewBox, `aria-hidden`), `src/features/match/clock/ClockPill.tsx`; Modify `src/features/match/combat/GeneralBar.tsx` and `src/features/match/combat/mapCanvasStyles.ts` (`StageNotices`) to sit below the pill (export one `CLOCK_PILL_OFFSET` constant used by both), `src/pages/GameMasterPage.tsx` and `src/pages/GamePlayerPage.tsx` (mount the pill in the stage); Test `src/features/match/clock/__tests__/ClockPill.test.tsx`

**Interfaces:** `ClockPill({ clock: ReturnType<typeof useStoryClock>; interactive: boolean; open?: boolean; onToggle?: () => void })`. Shows the icon + `HH:MM:SS`; the date from `tabletUp` up; `"Hora a definir"` when `now` is null; "ao vivo" dot when running; `data-phase={phase}` and a keyed pulse animation. Player: `interactive=false` → a non-button element (no focus, no hover). Master: `<button aria-expanded>` labelled "Relógio da história".
- [ ] Failing tests: renders time/date; unset copy; player not focusable; master toggles; `data-phase` follows the hook; reduced motion has no `animation` (assert via the styled rule's media query presence or a class).
- [ ] Implement; verify the overlay stack visually later (Task 11); commit `feat(clock): stopwatch pill on the table`.

### Task 4: `ClockEditor` — direct edit (reused in four places)

**Files:** Create `src/features/match/clock/ClockEditor.tsx`, `src/features/match/clock/LongSkipConfirm.tsx` (thin wrapper over `ConfirmDialog`, copy: "Avançar {formatDelta}? Os personagens perdem os dias de treino desse período." / "Avançar" / "Voltar"); Test `__tests__/ClockEditor.test.tsx`

**Interfaces:** `ClockEditor({ base: string; minimum: string | null; minimumReason?: string; initial?: string; showSeconds?: boolean; submitLabel: string; cancelLabel?: string; onSubmit: (storyAt: string, confirmLongSkip: boolean) => void; onCancel?: () => void })`. Date row `[−] 01/01/2000 [+]` (±1 day, buttons with `aria-label` "Dia anterior"/"Próximo dia"); time as three numeric inputs `HH : MM : SS` (2 digits, clamp 0–23/0–59, ArrowUp/ArrowDown step, carry into the next unit); preview line `"→ 16:42:07 · +2 h 10 min"`; below `minimum`: submit disabled + `"Não volta antes de 08:12:40 — {minimumReason}"`; forward > 172 800 s from `base` → `LongSkipConfirm` first.
- [ ] Failing tests: day stepper crosses month; typing 25 in hours clamps to 23; below-minimum disables with the reason; long skip opens the confirm and submits with `true`; ≤ 2 days submits `false`.
- [ ] Implement; commit `feat(clock): direct clock editor`.

### Task 5: The master's clock panel

**Files:** Create `src/features/match/clock/ClockPanel.tsx`; Modify `GameMasterPage.tsx` (pill opens panel; wiring to `useMatchCombat`); Test `__tests__/ClockPanel.test.tsx`

**Interfaces:** `ClockPanel({ clock; roundMode: RoundMode | ""; onAdjust(delta: number): void; onSet(storyAt, confirm): void; onPlay(); onPause(); onClose() })`, anchored under the pill (popover; Esc, outside pointerdown and the pill close it).
- Level 1: big time (a button "Editar hora" → level 3) + date; limit line (`limitReason` copy: start "início da partida", turn "último turno", scene "troca de cena", roundMode "troca de regime", round "último round"); **▶ Tempo real / ❚❚ Pausar** (disabled in Race with `Tooltip` "No turno disputado, cada round vale 1 segundo."); **+1 h**, **+1 min** (immediate `onAdjust(3600|60)`); **Passar dias** (level 3 with `initial = now + 1 day`); **⋯ Mais** toggles level 2.
- Level 2: **+1 s**, **−1 h**, **−1 min**, **−1 s**; a minus button that would cross `limitAt` is `aria-disabled` with `Tooltip` "Não volta antes de {time} — {reason}".
- Level 3: `ClockEditor` with `base = now`, `minimum = limitAt`, submit "Aplicar".
- [ ] Failing tests for each control, the Race tooltip, the crossing-limit tooltip, level transitions, Esc closes.
- [ ] Implement; commit `feat(clock): master clock panel`.

### Task 6: Mandatory start-time dialog

**Files:** Create `src/features/match/clock/StartTimeDialog.tsx`; Modify `GameMasterPage.tsx`; Test `__tests__/StartTimeDialog.test.tsx`
- Shown to the master while `clock.value?.storyAt === null`. Title "Que horas são no início da partida?", fixed date (from the match `storyStartAt`, `formatDateBR`), `HH : MM` (+ optional seconds) with the ClockEditor time fields (extract them as `TimeFields` inside `ClockEditor.tsx` and reuse), one button "Começar". No cancel, no Esc, no outside close (`role="dialog" aria-modal`). Sends `setClockStart("HH:MM:SS")`. Server error → inline message from `combatErrorMessages`.
- [ ] Failing tests: not dismissible; sends the formatted time; reappears when a new full state still has `storyAt: null` (Review Focus 5). Commit `feat(clock): start time dialog`.

### Task 7: Players' notices and clock rows in the history

**Files:** Create `src/features/match/clock/clockNotice.ts` (pure: `noticeText(change: ClockChange): string | null`, `coalesce(prev, next): ClockChange`), `src/features/match/clock/ClockNotice.tsx` (in `StageNotices`, ~6 s, `role="status"`); Modify `GamePlayerPage.tsx` (and master: the 5-min alert notice from Task 2's `phase` uses the same component, copy "Tempo real ligado há {n} min"), `src/features/match/combat/historyRows.ts` + `EventStream.tsx` (rows for `clockStarted`, `clockAdjusted`, `clockRealTime`; types in `src/types/matchHistory.ts`); Test `__tests__/clockNotice.test.ts`, `historyRows.test.ts`
- Copy (exact): adjust/set forward "O mestre avançou o tempo {delta} — agora {date} {time}"; backward "O mestre voltou o tempo {delta sem sinal} — agora {date} {time}"; play "O mestre ligou o tempo real"; pause manual "O mestre pausou o tempo real ({+elapsed})"; pause other reasons "O tempo real pausou ({motivo})" with motivo roundMode "troca de regime", scene "troca de cena", masterLeft "o mestre saiu", end "fim da partida", restart "reinício do servidor"; start "A partida começa às {time} de {date}"; scene with a move "O combate terminou — agora {date} {time}"; end → none (Task 9 handles it). round/limit → null.
- [ ] Failing tests for each text, coalescing (two adjusts of +60 → "+2 min"), round/limit silent. Commit `feat(clock): clock notices and history rows`.

### Task 8: Scene change closes combat

**Files:** Modify `src/features/match/combat/SceneChangeDialog.tsx` (split into sections; keep it the single dialog), `GameMasterPage.tsx` (request the summary on open when the current scene is battle); Create `src/features/match/clock/CombatSummaryBlock.tsx`; Test `__tests__/SceneChangeDialog.test.tsx`
- Section "Cena atual": "Descrição final (opcional)" (≤ 255 with counter) for any category. If the current scene is `battle`: title "Encerrar combate e trocar de cena"; loading state until `combat_summary`; `CombatSummaryBlock` ("{n} rounds disputados = {n} s, já no relógio" + "+1 s ao encerrar" when `activeRoundCounts`; hiatuses list "Hiato {i}: depois do round {r} ({nome} — {ação}) e antes do round {r'} ({nome'} — {ação'})", names via the page's `nameOf`, action labels via the existing combat text helpers; the message from spec §4 verbatim; empty list → "Nenhum hiato: o combate foi contínuo."); `ClockEditor` with `base = minimumStoryAt`, `minimum = minimumStoryAt`, submit is the dialog's own button.
- Section "Nova cena": as today. Submit sends `change_scene` with `briefFinalDescription` (trimmed, omitted if empty) and, in battle, `storyAt` + `confirmLongSkip`.
- [ ] Failing tests: roleplay shows only final description; battle shows summary and editor; hiatus copy; submit payloads for both. Commit `feat(clock): combat close in the scene dialog`.

### Task 9: End match, redirects and the ended match page

**Files:** Create `src/features/match/clock/EndMatchDialog.tsx`; Modify `src/features/match/combat/MasterControls.tsx` (button "Encerrar partida" next to "Nova cena", destructive style `colors.actionDestructive*`, `aria-disabled` + `Tooltip` reasons: battle "Encerre o combate antes (troque de cena).", open turn "Feche o turno aberto antes.", unset clock "Defina a hora da partida antes."), `GameMasterPage.tsx`, `GamePlayerPage.tsx`, `src/pages/GamePage.tsx` (finished → `<Navigate to=match page replace />`), `src/pages/LobbyPage.tsx` (same), `src/pages/MatchPage.tsx` (`getMatchStatus` from `gameEndAt`; hide "Abrir mesa"/"Abrir lobby" when ended; banner "A partida foi encerrada pelo mestre." when arriving with router state `{ endedByMaster: true }`), `src/hooks/useMatchDetails.ts` consumers as needed; Test `__tests__/EndMatchDialog.test.tsx`, `src/pages/__tests__/GamePage.test.tsx`, `MatchPage` tests
- Flow: `ConfirmDialog` ("Encerrar a partida? Não dá para desfazer: depois de encerrada, a partida não volta para a mesa." / "Continuar" danger / "Cancelar") → `EndMatchDialog` (`ClockEditor` base = now, minimum = max(limit, now+1 s if the active round counts — the server's error is the backstop), submit "Encerrar partida"; "Resumo final (opcional)" textarea ≤ 255 with counter) → sends `endMatch` → on `match_ended` (or WS status `"ended"`) every client: invalidate the match query and `navigate(matchPage, { replace: true, state: { endedByMaster: true } })`.
- [ ] Failing tests: disabled reasons; confirm → dialog → payload; `match_ended` navigates with `replace`; `/game` of a finished match renders `Navigate replace` (Review Focus 3); MatchPage hides table/lobby buttons when ended. Commit `feat(match): end match from the table`.

### Task 10: Start time in the match form

**Files:** Create `src/components/molecules/TimeOfDayField.tsx` (label + two numeric inputs `HH : MM`, optional; value `"HH:MM"` or `""`; no picker); Modify `src/pages/CreateMatchPage.tsx`, `src/pages/EditMatchPage.tsx`, `src/services/matchesService.ts` (or the service that posts matches), `src/types/match.ts`; Test `src/components/molecules/__tests__/TimeOfDayField.test.tsx`, create/edit page tests
- Label "Hora na história (opcional)" next to the story date; help "Se ficar vazio, você informa a hora quando a partida começar." Create sends `storyStartTime` only when filled; edit sends `""` to clear.
- [ ] Failing tests; implement; commit `feat(match): optional story start time`.

### Task 11: Docs and browser verification

- Create `docs/dev/match/relogio-da-historia.md` (where state lives, naive time rule, escalation, notices, dialogs, redirects); link it from `CLAUDE.md` "Feature: match combat".
- Browser, master + player (`go run ./cmd/devseed` in the backend worktree — seed accounts only, never the owner's): pill at phone/tablet/desktop widths with the GeneralBar below; panel levels; real time ticking and escalation; Race disables play; a Race combat gives +1 s per round; scene change shows the summary; end match → both land on the match page; browser Back never returns to `/game`; reopening `/game` and `/lobby` redirects. Screenshots in the session scratchpad.
