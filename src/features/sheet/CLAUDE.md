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
- Dois recursos do Markdown dos docs (`RulesMarkdown`): o texto literal `(em breve)` vira o
  `ComingSoonBadge` (plugin `remarkComingSoon`; não vale em code span/fence) — marca o que o back já
  tem mas o jogador ainda não usa, sem o doc depender de HTML. E o fence ```` ```math ```` vira MathML
  nativo via `temml` (`MathBlock`, carregado sob demanda): fórmula legível sem fontes extras; LaTeX
  inválido cai no texto cru em estilo de código, nunca derruba o painel.
- Rolar entre capítulos nunca reescreve a URL. O último capítulo (`lastSlug`) fica só em memória: o
  "?" reabre nele (senão em Atributos); o deep link vence. Nada vai pro storage do navegador.
- Abre sozinho em Criação, uma vez por montagem, só em `/charactersheet/new` e só quando a lista de
  fichas **terminou de carregar com sucesso e veio vazia** (`isSuccess && !isFetching && length === 0`).
  Carregando ou com erro não conta como vazio. O NPC nunca abre sozinho.
- A ficha embutida na partida (`sheetMode.embedded`) não tem "?".
- Abrir não pode travar: o primeiro quadro mostra só o painel, e os capítulos montam **um por tarefa**,
  o pedido primeiro e depois os vizinhos (`progressiveChapters.ts`). Capítulo que entra acima do
  aberto corrige a rolagem para a leitura não pular; chip ou link para um capítulo ainda não montado
  monta todos antes de rolar. A ficha busca as regras ao montar (`usePrefetchSheetRules`), então o "?"
  não espera a rede. Montar os dez de uma vez custava ~0,9 s de CPU (4× mais lento) na abertura.

## Proficiências e dano da arma

- **O dano vem do back, nunca de tabela no front.** `GET /rules/weapons` (`rulesService.getWeapons`) →
  `useWeaponDamage()` devolve `(arma) => dano formatado | undefined`, buscando por nome. Formatar só via
  `formatDamage(dice, flat)` (`src/utils/dice.ts`). Catálogo estático e rota pública: sem token na chave,
  `staleTime: Infinity` (exceção consciente às invariantes de hook de `docs/dev/frontend-architecture.md`).
  Por quê: arma nova ou balanceada no back aparece sozinha; uma tabela no front divergiria em silêncio.
- **Dano desconhecido é silêncio.** Catálogo carregando, falho ou sem a arma: card, slot e opção simplesmente
  não mostram dano. Sem spinner, sem texto de erro, sem dica. Por quê: a ficha continua usável sem o catálogo.
- **A seção preenche a linha.** `ProficienciesList` usa flex-wrap (`flex: 1 1 260px`, gap 15px): até três
  cards lado a lado na largura de desktop, um card sozinho ocupa a linha toda. Por quê: o cinza morto à
  direita era feio e desperdiçava espaço.
- **Card conjunto** (`JointProficiencyCard`): fechado por padrão, botão "N armas" com a seta logo depois do
  rótulo (gap de 8px). Aberto, lista as armas em colunas CSS (`column-width: 220px`, `column-gap: 24px`,
  linhas sem quebrar entre colunas). Com `JOINT_FULL_ROW_FROM = 9` armas ou mais (ou seja, mais de 8) o card
  aberto ocupa a linha toda; com 8 ou menos fica no lugar. **Nunca rolagem** dentro do card: se a lista não
  cabe, o card cresce. Por quê: rolagem aninhada esconde armas e briga com a rolagem da ficha.
- **Tamanhos de texto** em `proficiencyCardParts.ts`: `textSize = min(22px, 5cqi)`; `secondaryTextSize`
  (dano, rótulo "N armas", lista) = 0.77× disso, com piso de 14px no celular. Por quê: abaixo de 14px o
  dano some na leitura em tablet/celular.
- **Título "Proficiências"** (`ProficienciesTitle` em `CharacterSheetTemplate.tsx`) tem o mesmo tamanho do
  título "ATRIBUTOS" em qualquer largura (a coluna dele tem `8cqi` da própria largura). Como a seção é um
  container diferente, a fórmula usa a largura de conteúdo `c` dela: uma coluna `calc(8cqi + 3.2px)`; duas
  colunas (`c >= 510px`) `calc(4cqi + 0.4px)`. Os `px` compensam o padding da coluna (`c + 40px` em uma
  coluna; `(c + 10px) / 2` em duas). Se mudar o padding ou o breakpoint do grid, refaça a conta.
  "PERÍCIAS" fica ~2px menor que "ATRIBUTOS" por padding interno da coluna dela; isso é anterior e não é
  deste título, que segue o ATRIBUTOS.
