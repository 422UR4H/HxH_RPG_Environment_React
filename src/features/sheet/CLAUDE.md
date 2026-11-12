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

## Diagramas com a luz

`PhysicalsDiagram`, `MentalsDiagram` e `NenPrinciplesDiagram` desenham o fundo com
`features/diagrams/GlowDiagram` (ver o `CLAUDE.md` de lá), totalmente pintado. Rótulos, números, +/− e
posições continuam na zona pixel-tuned (`src/components/CLAUDE.md`).

- `variant`: `"sheet"` (padrão) ou `"rules"`. A de regras é a do painel: usa o layout da visualização
  mesmo num modo de distribuição e esconde números e o centro da habilidade.
- `paint`: o que acende em cor (padrão `"all"`). Passe uma referência estável (constante ou `useMemo`):
  o `GlowDiagram` é memoizado por referência.
- **O mental não tem bolinhas de aresta, de propósito.** Atributo mental não tem médios; ele usa a
  geometria do losango físico sem as quatro bolinhas das arestas. Não "corrija" para ficar igual ao físico.

## Painel de regras (`features/rules/`)

O "?" da coluna ATRIBUTOS abre os docs do jogo (`GET /rules/character-sheet`) ao lado da ficha, sem
perder o que o jogador já preencheu. Por isso o estado mora na URL e a ficha nunca remonta:

- `?regras=<slug>` (`useRulesPanel`). Abrir faz **push**; o voltar do navegador **fecha** o painel e
  fica na ficha. X/Esc/"?" com a entrada nossa chamam `navigate(-1)`; num deep link (sem entrada
  nossa) fechar faz **replace** tirando o parâmetro.
- Rolar entre capítulos nunca reescreve a URL. O último capítulo (`lastSlug`) fica só em memória: o
  "?" reabre nele (senão em Atributos); o deep link vence. Nada vai pro storage do navegador.
- Abre sozinho em Criação, uma vez por montagem, só em `/charactersheet/new` e só quando a lista de
  fichas **terminou de carregar com sucesso e veio vazia** (`isSuccess && !isFetching && length === 0`).
  Carregando ou com erro não conta como vazio. O NPC nunca abre sozinho.
- A ficha embutida na partida (`sheetMode.embedded`) não tem "?".
