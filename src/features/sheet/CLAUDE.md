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
