# UI Components — arquitetura

Este diretório é o **UI Kit** do front-end: componentes compartilhados entre mais de uma feature/página — ou com alta probabilidade de virarem compartilhados. Componentes específicos de uma única feature ficam em `src/features/<feature>/`.

## `components/` vs `features/`

| Onde | O quê |
|---|---|
| `src/components/` | UI usada por 2+ features/páginas, **ou** com alta probabilidade de virar compartilhada. |
| `src/features/<feature>/` | UI usada por **uma única** feature. |

**Regra de migração:** quando um componente de `features/X/` passa a ser importado por uma 2ª feature (ou por `pages/`), **mova-o** para `components/<camada>/` — não duplique. A migração é deliberada: ao escrever o 2º import, pare e pergunte "isto devia ser compartilhado?". Se sim, migre primeiro, depois importe.

> Exemplo real: `CharacterSidebarItem` e `AdaptiveActionButton` nasceram em `features/campaign/`, passaram a ser usados também por `MatchPage`, e foram promovidos para `components/molecules/`.

## Atomic Design — 5 camadas

Da menor para a maior; cada camada compõe a anterior:

### `ions/` — primitivos sem semântica de domínio
Wrappers de HTML que poderiam viver em qualquer projeto React. Ex.: `BaseButton`, `BaseInput`, `Logo`, `ExpBar`, `PageTitle`, `FormInput`, `FormTextArea`, `PlusIcon`.

> **Por que `ions/` existe além de `atoms/`?** O Atomic Design canônico (Brad Frost) não tem essa camada. Foi adicionada porque, na prática, é útil distinguir "wrapper de HTML genérico" (ion) de "unidade com semântica do nosso jogo" (atom).

### `atoms/` — UI pequena com semântica de domínio
Já carrega noção do projeto. Ex.: `CampaignCard` (sabe o que é uma campanha), `PageHeader` (cor de marca), `CharacterSheetCard`, `CreateButton`, `PageStates`.

### `molecules/` — composição de 2-3 ions/atoms
Pequenas unidades funcionais. Ex.: `ConfirmDialog`, `ExpandableText`, `FormField` (Label + campo + ajuda), `FormCheckbox`, `FormRow`, `RuleSection`, `EmptyState`, `CharacterSidebarItem`, `AdaptiveActionButton`, `CharacterSheetHeader`.

### `organisms/` — pedaços grandes de UI auto-suficientes
Sub-seções de página inteiras. Ex.: `CharactersSidebar` (shell + lista de personagens, genérico no tipo do item), `RulesSidebar` (shell + slot de seções de regra).

### `templates/` — layouts de página
Estrutura macro: header + colunas + slots. Sem dados, sem lógica de negócio — as páginas em `src/pages/` injetam conteúdo via slots.

- **`DetailPageTemplate`** — header + 3 colunas (`leftSidebar`, `children`, `rightSidebar`). Usado por `CampaignPage`, `MatchPage`.
- **`ListPageTemplate`** — container com background + header + gate de loading/erro + body centralizado. Usado por `CampaignsPage`, `PublicCampaignsPage`, `CharacterSheetsPage`.
- **`CreateFormTemplate`** — header + coluna de formulário (título + erro + `<form>` + botões) + slot de regras. Usado por `CreateCampaignPage`, `CreateMatchPage`.
- **`SignPagesTemplate`** — layout das telas de login/cadastro.

> As páginas viram **thin orchestrators**: buscam dados (hooks) e compõem templates + organisms. Não têm styled-components de layout.

## Design tokens — `src/styles/tokens.ts`

Cores, fontes e gradientes vivem em `src/styles/tokens.ts` (`colors`, `fonts`, `gradients`).

- **Sem literal de cor em styled-components.** Use o token: `background-color: ${colors.surfaceSidebar};`. Hex/rgba cru fora da zona pixel-tuned é code smell — espere challenge no review.
- **Um token por valor distinto**, nomeado por uso (`brandPrimary`, `surfaceSidebar`, `statusOngoing`), não por matiz.
- **Gradiente é uma decisão de design só** → um token por gradiente em `gradients`, **não** um token por cor-stop. Ex.: `gradients.orange` é a string `linear-gradient(...)` inteira. Não crie `orangeStart`/`orangeEnd` só para remontar um gradiente.
- Se não existe um token apropriado, **crie o token** antes de hardcodar — é 1 linha em `tokens.ts`.
- `tokens.ts` é `as const` → autocomplete e erro de TS em typo.

> Escopo atual: os tokens estão aplicados na superfície refatorada (templates, organisms, molecules/atoms/ions de formulário, `CampaignPage`, `MatchPage`). Áreas ainda não refatoradas (feature `sheet/`, login, cards) adotam tokens quando forem refatoradas.

## Zona pixel-tuned — NÃO normalizar

Os arquivos abaixo têm valores de CSS ajustados **na mão, pixel a pixel**, para compensar SVGs geometricamente imperfeitos (bordas vazias, falta de centralização). Substituir valores por tokens, padronizar paddings ou "limpar" números anômalos **quebra o alinhamento visual**:

- `src/components/molecules/CharacterSheetHeader.tsx`
- `src/features/sheet/MentalsDiagram.tsx`
- `src/features/sheet/PhysicalsDiagram.tsx`
- `src/features/sheet/NenPrinciplesDiagram.tsx`

Em refactors estruturais (mover arquivo, extrair template): preservar os valores numéricos exatos. Em normalização de tokens: pular esses arquivos. Se o SVG fonte for corrigido, o ajuste no CSS pode ser removido — mas as duas coisas mudam juntas.

## Princípios de design de componente

1. **Slots > variants.** Prefira `children` e props `ReactNode` a `variant: "x" | "y"`. Mais flexível, evita explosão de combinações. (Ex.: `DetailPageTemplate` recebe `leftSidebar`/`rightSidebar`/`children` como slots.)
2. **Genéricos só quando necessário.** `CharactersSidebar<T>` é genérico porque a página decide o tipo do item; templates não precisam.
3. **YAGNI nas props.** Não adicione prop "pra caso de precisar". Adicione quando 2 chamadores diferentes precisarem.
4. **Tipo > runtime check.** Confie no TS na fronteira interna; valide input só na fronteira do sistema (forms, API).
5. **Sem comentários óbvios.** Nome bom > comentário. Comentário só para "por quê não-óbvio" (workaround, constraint).
6. **Promote, don't duplicate.** Segunda feature precisa do componente? Promova. Nunca copie.

## Estilo

`styled-components` apenas — sem arquivos CSS separados. `CharacterSheetTemplate` e filhos (incluindo os Diagrams) usam CSS container queries (`container-type: inline-size` + unidades `cqi`) intensamente — a tipografia escala pela largura do container; cuidado ao redimensionar.

## Testes

Componentes compartilhados são cobertos pelos **integration tests das páginas** que os consomem (`src/pages/__tests__/`, via MSW — ver `src/test/`). Não escrevemos unit test por componente — replicaria o que o integration test já valida. Exceções: ions com lógica própria não-trivial (`ExpBar` tem teste de long-press) e utils puros (`src/features/sheet/__tests__/`).
