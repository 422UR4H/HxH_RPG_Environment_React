# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Frontend for an HxH (Hunter x Hunter) RPG system — character sheets, campaigns, matches. Backend at `VITE_API_URL` (default `http://localhost:5000`). UI copy is mixed Brazilian Portuguese / English.

## Commands

- `npm run dev` — Vite dev server (HMR)
- `npm run build` — `tsc -b && vite build` (TS errors fail the build)
- `npm run lint` — `eslint .`
- `npm run preview` — serve production build locally

No test runner configured. Vercel SPA rewrite in `vercel.json`.

## TypeScript

`verbatimModuleSyntax` is on — type-only imports **must** use `import type { … }`. Mixing values and types in a plain `import` fails the build. Also enabled: `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`.

## Auth & session

Two parallel contexts, each hydrated from `localStorage` on mount:

- `TokenContext` — JWT under `localStorage["token"]` (JSON `Auth`). Use via `useToken()`.
- `UserContext` — current user under `localStorage["user"]` (JSON `UserStorage`). Use via `useUser()`.

`src/services/httpClient.ts` has a 401 interceptor that clears **both** localStorage keys and hard-redirects to `/` — it bypasses both contexts. If you add another auth-related key, update that interceptor too.

Pages self-guard with `if (!token) return <Navigate to="/" replace />`. No route wrapper.

## API boundary: snake_case ⇄ camelCase

Backend speaks snake_case; frontend types are camelCase. Every service in `src/services/` must convert at the boundary via `src/utils/caseConverter.ts`:

- Outbound: `objToSnakeCase(body)` before `httpClient.post/put/patch`.
- Inbound: `objToCamelCase<T>(response.data)` before returning.

Types in `src/types/` assume camelCase is already applied.

## React Query (`src/hooks/`)

- Include `token` (and any resource id) in `queryKey` so caches invalidate on logout/switch.
- Guard with `enabled: !!token` (and `&& !!id`).
- `retry: 1` everywhere; global default in `main.tsx` is also `retry: 1`.
- React Query is for server state only; local UI state stays in `useState`/context.

## Components: Atomic Design

`src/components/` layers: `ions/` (primitives) → `atoms/` (small composed UI) → `molecules/` → `templates/` (page shells). Place new shared UI at the lowest layer that fits; promote upward only when reused across layers.

## Styling

`styled-components` only — no separate CSS files. `CharacterSheetTemplate` and its children use CSS container queries (`container-type: inline-size` + `cqi` units) heavily; child typography scales off container width, so be careful when resizing those components.

## Feature: character sheet

See `src/features/sheet/CLAUDE.md` for sheet-specific conventions (factories, distribute utils, SheetMode pattern).
