# Sheet feature conventions

## SheetMode

`CharacterSheetTemplate` is reused for view, create, and edit flows. The page controls behavior via a composite `SheetMode` object:

```ts
{ headerMode, profileMode, diagramsMode, proficiencyMode, skillsMode }
```

Each sub-mode is `"view" | "create" | "edit" | "card"` (see `types/`). To expose a new edit surface, change the relevant sub-mode — don't fork the template.

## Factories (`factories/createEmpty*`)

Always use `createEmptyCharacterSheet()` (and the other `createEmpty*` factories) when you need a blank `CharacterSheet`. Never hand-build object literals — the factories ensure shape correctness and compose properly.

## Adding attributes or skills

All base attribute/skill lists per type (`physical | mental | spiritual`) live in `utils/distribute.ts`. Add new attributes or skills there, not at call sites.

## useCharSheetBuilder

`useCharSheetBuilder.buildFromClass(charClass, sheet?)` orchestrates the distribute utils. `CharacterSheetHeader` calls it on class-select change.

## Live preview (create/edit)

`CharacterSheetTemplate` shows `withLivePreview(charSheet, selectedClass)` whenever
`diagramsMode !== "view"`: the sheet as the backend will compute it from what is about to be sent.
`charSheet` stays the page state (changes start from it); the computed fields come from the engine
(`engine/`, see its `CLAUDE.md`). Rules:

- The request body is built **only** by `utils/sheetInput.ts` (`buildSheetInput`) — POST, PATCH and
  the preview share it, so the preview computes exactly what is sent.
- Points to distribute are derived (`level − spent primaries`) on every render — never keep a
  counter in state. Validation (`validateCharacterSheet`) reads the level from the preview.
- A class without `definition` (older backend) simply renders without preview.
