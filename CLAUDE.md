# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Frontend for an HxH (Hunter x Hunter) RPG system — character sheets, campaigns, matches. Backend at `VITE_API_URL` (default `http://localhost:5000`). UI copy is mixed Brazilian Portuguese / English.

## Commands

- `npm run dev` — Vite dev server (HMR)
- `npm run build` — `tsc -b && vite build` (TS errors fail the build)
- `npm run lint` — `eslint .`
- `npm run test` — `vitest run` (suíte completa)
- `npm run test:watch` — vitest em watch
- `npm run test:coverage` — vitest com cobertura
- `npm run preview` — serve production build locally

Vercel SPA rewrite in `vercel.json`.

**New to this codebase?** See `docs/dev/frontend-architecture.md` for a full walkthrough (layers, data flow, error handling, pixel-tuned zone, Pixi coverage gap) — this file assumes it.

> **Cobertura:** `src/test/setup.ts` mocka `@pixi/react` (tudo vira `<div>`) e
> `ResizeObserver` com dimensão zero, então `TacticalMapStage` e toda a camada Pixi
> (`MapHandlesLayer`, `WallsLayer`, `PieceSprite`) **não são cobertos por teste**.
> Mudança nessa camada exige verificação visual no browser.

## TypeScript

`verbatimModuleSyntax` is on — type-only imports **must** use `import type { … }`. Mixing values and types in a plain `import` fails the build. Also enabled: `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`.

## Auth & session

Two parallel contexts, each hydrated from `localStorage` on mount:

- `TokenContext` — JWT under `localStorage["token"]` (JSON `Auth`). Use via `useToken()`.
- `UserContext` — current user under `localStorage["user"]` (JSON `UserStorage`). Use via `useUser()`.

`src/services/httpClient.ts` has a 401 interceptor that clears **both** localStorage keys and hard-redirects to `/` — it bypasses both contexts. If you add another auth-related key, update that interceptor too.

It only fires when a token was already stored. A failed login also returns 401, and firing there would wipe the error message before the page could render it.

Pages self-guard with `if (!token) return <Navigate to="/" replace />`. No route wrapper.

## API boundary: camelCase end-to-end

Backend and frontend both speak camelCase natively — there is no conversion layer at the HTTP boundary. `src/utils/caseConverter.ts` (`objToSnakeCase`/`objToCamelCase`) was deleted in Fase 8; services in `src/services/` pass request/response bodies straight through, and `src/types/` declarations are the direct 1:1 shape of what the wire sends. Do not reintroduce a generic converter.

One narrow, intentional exception: `src/utils/lowercaseFirstKeys.ts`, used by `characterSheetsService.ts`/`characterClassesService.ts`, lowercases the first letter of keys in a handful of response maps (`abilities`, `physicalAttributes`, `commonProficiencies`, etc.) whose keys are Go enum `String()` values (e.g. `"Resistance"`), not struct field names — the backend's camelCase json-tag migration has nothing to rename there. Read that file's header comment for the full rationale and field list before touching it.

## React Query (`src/hooks/`)

- Include `token` (and any resource id) in `queryKey` so caches invalidate on logout/switch.
- Guard with `enabled: !!token` (and `&& !!id`).
- `retry: 1` everywhere; global default in `main.tsx` is also `retry: 1`.
- React Query is for server state only; local UI state stays in `useState`/context.

## Components: Atomic Design

`src/components/` layers: `ions/` (primitives) → `atoms/` (small composed UI) → `molecules/` → `organisms/` (large UI pieces) → `templates/` (page shells). Place new shared UI at the lowest layer that fits; promote upward only when reused across layers.

**See `src/components/CLAUDE.md`** for the full architecture: `components/` vs `features/` rule, the migration policy, the available templates, design-token rules, and the pixel-tuned do-not-normalize zone.

## Design tokens

Colors, fonts and gradients live in `src/styles/tokens.ts` (`colors`, `fonts`, `gradients`). No raw hex/rgba in styled-components outside the pixel-tuned zone — add a token instead. Currently applied across the refactored surface (templates, organisms, form components, `CampaignPage`/`MatchPage`).

## Styling

`styled-components` only — no separate CSS files. `CharacterSheetTemplate` and its children use CSS container queries (`container-type: inline-size` + `cqi` units) heavily; child typography scales off container width, so be careful when resizing those components.

## Feature: character sheet

See `src/features/sheet/CLAUDE.md` for sheet-specific conventions (factories, distribute utils, SheetMode pattern).
