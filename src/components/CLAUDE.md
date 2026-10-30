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
Wrappers de HTML que poderiam viver em qualquer projeto React. Ex.: `BaseButton`, `Logo`, `ExpBar`, `PageTitle`, `FormInput`, `FormTextArea`, `PlusIcon`.

> **Por que `ions/` existe além de `atoms/`?** O Atomic Design canônico (Brad Frost) não tem essa camada. Foi adicionada porque, na prática, é útil distinguir "wrapper de HTML genérico" (ion) de "unidade com semântica do nosso jogo" (atom).

### `atoms/` — UI pequena com semântica de domínio
Já carrega noção do projeto. Ex.: `CampaignCard` (sabe o que é uma campanha), `PageHeader` (cor de marca), `CharacterSheetCard`, `CreateButton`.

### `molecules/` — composição de 2-3 ions/atoms
Pequenas unidades funcionais. Ex.: `ConfirmDialog`, `ExpandableText`, `FormField` (Label + campo + ajuda), `FormCheckbox`, `FormRow`, `RuleSection`, `EmptyState`, `CharacterSidebarItem`, `AdaptiveActionButton`, `BlockableButton` (o jeito único de ação indisponível: `aria-disabled` + "?" + motivo no `Tooltip`), `CharacterSheetHeader`, `EdgeDrawer` (aba na borda + gaveta com véu; usada pelos templates para recolher colunas laterais).

### `organisms/` — pedaços grandes de UI auto-suficientes
Sub-seções de página inteiras. Ex.: `CharactersSidebar` (shell + lista de personagens, genérico no tipo do item), `RulesSidebar` (shell + slot de seções de regra), `UpcomingRulesSidebar` (a coluna REGRAS de todas as telas enquanto o sistema de regras não existe: selo "Em breve", os mesmos cards e a mesma nota), `PageTabNav` (abas em forma de pasta; só funciona dentro do `TabbedPanel`, que passa a aba ativa já validada pela página), `TabbedPanel` (a barra de abas colada num painel marrom; exporta `TabPanelHeading` e `TabPanelNote`).

> A pilha Pixi do mapa tático vive em `src/features/tactical-map/` — é usada por uma
> única feature (regra da tabela acima).

### `templates/` — layouts de página
Estrutura macro: header + colunas + slots. Sem dados, sem lógica de negócio — as páginas em `src/pages/` injetam conteúdo via slots.

- **`DetailPageTemplate`** — header + 3 colunas (`leftSidebar`, `children`, `rightSidebar`). Usado por `CampaignPage`, `MatchPage`.
- **`ListPageTemplate`** — container com background + header + gate de loading/erro + body centralizado. Usado por `CampaignsPage`, `PublicCampaignsPage`, `CharacterSheetsPage`.
- **`CreateFormTemplate`** — header + coluna de formulário (título + erro + `<form>` + botões) + slot de regras. Usado pelas páginas de criar **e** editar de campanha e de partida. Abaixo de 1149 px recolhe a coluna de regras numa `EdgeDrawer` (aba "REGRAS").
- **`PageState`** — `PageLoading` / `PageError` (com "Tentar de novo") / `PageNotFound`, famílias `world` e `sheet` (`backdrop`). Padrão de guard em `src/pages/CLAUDE.md`.
- **`SignPagesTemplate`** — layout das telas de login/cadastro.

> As páginas viram **thin orchestrators**: buscam dados (hooks) e compõem templates + organisms. Não têm styled-components de layout.

## Design tokens

Cores, fontes e gradientes vivem em `src/styles/tokens.ts`, em duas camadas (palette × semântica). Componente só usa `colors`/`gradients`/`alpha`; cor crua falha no teste. Regras, grupos de prefixo, fluxo para cor nova e scrollbars: **`src/styles/CLAUDE.md`**.

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

Quando o bloco de `styled-components` de um arquivo passa de ~150 linhas, extraia para `<Componente>.styles.ts` ao lado.

## Testes

Componentes compartilhados são cobertos pelos **integration tests das páginas** que os consomem (`src/pages/__tests__/`, via MSW — ver `src/test/`). Não escrevemos unit test por componente — replicaria o que o integration test já valida. Exceções: ions com lógica própria não-trivial (`ExpBar` tem teste de long-press) e utils puros (`src/features/sheet/__tests__/`).
