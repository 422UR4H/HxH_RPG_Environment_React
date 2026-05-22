# Frontend Componentization — Fase 3: Design Tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar `src/styles/tokens.ts` (cores e fontes semânticas) e aplicá-lo na superfície refatorada nas Fases 0-2 (templates, organisms, molecules/atoms/ions de formulário, e os styled-components page-local de `CampaignPage`/`MatchPage`), substituindo literais hex/rgba/font-family por referências a tokens.

**Architecture:** Substituição 1:1 — cada literal vira o token de **valor idêntico**. Zero mudança visual; o valor renderizado é o mesmo. O ganho é manutenibilidade (rebrand futuro = editar `tokens.ts`).

**Tech Stack:** React 19, TypeScript estrito, styled-components, Vitest.

**Spec de referência:** `docs/superpowers/specs/2026-05-20-frontend-componentization-design.md` (§6 design tokens; §7 zona pixel-tuned).

---

## Contexto crítico para quem executa

- **Escopo decidido com o usuário:** SOMENTE a superfície refatorada nas Fases 0-2. NÃO tokenizar a feature `sheet/`, páginas de login, cards, ou outro código antigo — eles ganham tokens quando forem refatorados.
- **Substituição 1:1, pixel-perfect.** Cada literal é trocado pelo token cujo valor é **exatamente igual**. Nenhuma cor muda de valor. Os 89 characterization tests devem continuar passando sem edição (eles não checam cor, então passar = comportamento intacto; e os valores são idênticos = visual intacto).
- **Zona pixel-tuned — NÃO TOCAR:** `CharacterSheetHeader.tsx` e os Diagrams do `sheet/`. Nenhuma task aqui os toca.
- Se um arquivo tiver um literal de cor **que não está na tabela de mapeamento abaixo**, NÃO adivinhe — reporte `NEEDS_CONTEXT` com o literal e o arquivo, e o controlador adiciona o token.
- Um commit atômico por task. `rtk`: use `npm`/`git` simples.
- Baseline: `npm test` → 89 testes passando. `npm run build` → verde.

## Tabela de mapeamento literal → token

Esta tabela é a especificação completa das substituições. Toda substituição usa interpolação styled-components: `color: ${colors.textPrimary};` etc. Importar de `tokens.ts` com caminho relativo correto.

| Literal | Token |
|---|---|
| `#08491f` | `colors.brandPrimary` |
| `#107135` | `colors.brandAccent` |
| `#2d2215` | `colors.surfaceSidebar` |
| `#493823` | `colors.surfaceInput` |
| `#42331f` | `colors.surfaceScrollTrack` |
| `#5a4529` | `colors.surfaceScrollThumbHover` |
| `#604d31` | `colors.borderInput` |
| `#696969` | `colors.borderDivider` |
| `#ff1c1c` | `colors.accentDanger` |
| `white` | `colors.textPrimary` |
| `#e0e0e0` | `colors.textMuted` |
| `#ccc` | `colors.textDisabled` |
| `black` | `colors.textOnLight` |
| `#7a5618` | `colors.submitDisabled` |
| `#ffa216` | `colors.orangeStart` |
| `#e60000` | `colors.orangeEnd` |
| `#b8860b` | `colors.statusScheduled` |
| `#27ae60` | `colors.statusOngoing` |
| `#7d3030` | `colors.statusEnded` |
| `#3498db` | `colors.statusPending` |
| `#2ecc71` | `colors.statusNpc` |
| `#555` | `colors.statusLeft` |
| `#e74c3c` | `colors.danger` |
| `rgba(0, 0, 0, 0.7)` | `colors.overlay` |
| `rgba(0, 0, 0, 0.44)` | `colors.overlaySoft` |
| `rgba(231, 76, 60, 0.2)` | `colors.errorBg` |
| `rgba(231, 76, 60, 0.1)` | `colors.errorBgSoft` |
| `rgba(0, 0, 0, 0.3)` | `colors.shadowSoft` |
| `rgba(0, 0, 0, 0.4)` | `colors.shadowStrong` |
| `"Roboto", sans-serif` | `fonts.sans` |

**Regras de aplicação:**
- `white`/`black` só viram token quando usados como **cor** (`color:`, `background-color:`, `border:` etc.) — NÃO troque a palavra `white` se aparecer em outro contexto.
- Casar valores de forma tolerante a espaços: `rgba(0,0,0,0.5)` e `rgba(0, 0, 0, 0.5)` são o mesmo; se um literal só difere em espaçamento de um da tabela, é match.
- A font-family aparece como `font-family: "Roboto", sans-serif;` → `font-family: ${fonts.sans};`.
- Se um arquivo tiver um literal de cor fora da tabela → `NEEDS_CONTEXT`.

---

## File Structure

**Criado:** `src/styles/tokens.ts`

**Modificados (superfície refatorada — apenas estes):**
- `src/components/templates/DetailPageTemplate.tsx`
- `src/components/templates/ListPageTemplate.tsx`
- `src/components/templates/CreateFormTemplate.tsx`
- `src/components/organisms/CharactersSidebar.tsx`
- `src/components/organisms/RulesSidebar.tsx`
- `src/components/molecules/RuleSection.tsx`
- `src/components/molecules/FormField.tsx`
- `src/components/molecules/FormCheckbox.tsx`
- `src/components/molecules/EmptyState.tsx`
- `src/components/molecules/CharacterSidebarItem.tsx`
- `src/components/molecules/AdaptiveActionButton.tsx`
- `src/components/atoms/CreateButton.tsx`
- `src/components/ions/FormInput.tsx`
- `src/components/ions/FormTextArea.tsx`
- `src/pages/CampaignPage.tsx`
- `src/pages/MatchPage.tsx`

> `FormRow.tsx` não tem cores — não entra. `SignPagesTemplate.tsx`, `PageStates.tsx`, `PageHeader.tsx`, `PageTitle.tsx` etc. são pré-existentes (não refatorados nas Fases 0-2) — fora de escopo.

---

## Task 1: Criar `src/styles/tokens.ts`

**Files:**
- Create: `src/styles/tokens.ts`

- [ ] **Step 1: Criar `src/styles/tokens.ts`**

```ts
// Design tokens — semantic. Phase 3 of the componentization refactor.
// One token per distinct value. To rebrand, edit here.

export const colors = {
  // brand
  brandPrimary: "#08491f", // page header green
  brandAccent: "#107135", // interactive green: buttons, focus rings, submit

  // surfaces
  surfaceSidebar: "#2d2215", // character/rules sidebar background
  surfaceInput: "#493823", // form field background, rule-section background
  surfaceScrollTrack: "#42331f", // webkit scrollbar track
  surfaceScrollThumbHover: "#5a4529", // webkit scrollbar thumb on hover

  // borders
  borderInput: "#604d31",
  borderDivider: "#696969",
  accentDanger: "#ff1c1c", // danger accent border / alert text

  // text
  textPrimary: "white",
  textMuted: "#e0e0e0",
  textDisabled: "#ccc",
  textOnLight: "black",

  // actions
  submitDisabled: "#7a5618",
  orangeStart: "#ffa216", // create-button orange gradient start
  orangeEnd: "#e60000", // create-button orange gradient end

  // domain status
  statusScheduled: "#b8860b",
  statusOngoing: "#27ae60",
  statusEnded: "#7d3030",
  statusPending: "#3498db",
  statusNpc: "#2ecc71",
  statusLeft: "#555",

  // feedback
  danger: "#e74c3c",
  errorBg: "rgba(231, 76, 60, 0.2)",
  errorBgSoft: "rgba(231, 76, 60, 0.1)",

  // surfaces — translucent
  overlay: "rgba(0, 0, 0, 0.7)",
  overlaySoft: "rgba(0, 0, 0, 0.44)",

  // shadows
  shadowSoft: "rgba(0, 0, 0, 0.3)",
  shadowStrong: "rgba(0, 0, 0, 0.4)",
} as const;

export const fonts = {
  sans: '"Roboto", sans-serif',
  display: '"Oswald", sans-serif',
} as const;
```

- [ ] **Step 2: Build** — `npm run build` — verde. Nada consome ainda.
- [ ] **Step 3: Rodar a suite** — `npm test` — 89 testes passando.
- [ ] **Step 4: Commit**

```bash
git add src/styles/tokens.ts
git commit -m "feat(styles): add semantic design tokens"
```

## Context

Task 1 of 4. Cria o arquivo de tokens. As Tasks 2-4 aplicam. `noUnusedLocals` não reclama de export não usado, então `fonts.display` pode ficar sem uso inicialmente — tudo bem.

## Self-Review

- Arquivo com o código exato; `npm run build` verde; `npm test` → 89; commit único.

## Report

Status + commit SHA + build/test + concerns.

---

## Task 2: Aplicar tokens nos templates e organisms

**Files:**
- Modify: `src/components/templates/DetailPageTemplate.tsx`
- Modify: `src/components/templates/ListPageTemplate.tsx`
- Modify: `src/components/templates/CreateFormTemplate.tsx`
- Modify: `src/components/organisms/CharactersSidebar.tsx`
- Modify: `src/components/organisms/RulesSidebar.tsx`

Em cada arquivo: importar de `tokens.ts` o que for usado e substituir cada literal de cor e cada `font-family: "Roboto", sans-serif` pela referência ao token, conforme a Tabela de mapeamento. Caminho de import: de `components/templates/` e `components/organisms/` para `src/styles/` é `../../styles/tokens`.

- [ ] **Step 1: Para cada um dos 5 arquivos**, ler o arquivo, identificar os literais de cor e font-family, e substituí-los pelos tokens da tabela. Exemplo de transformação (DetailPageTemplate `headerColor` default e o `MainContentContainer` não têm hex; o `headerColor = "#08491f"` default É um literal de cor):

Padrão de import a adicionar no topo (só os tokens realmente usados no arquivo):
```ts
import { colors, fonts } from "../../styles/tokens";
```

Exemplo — um default de prop com cor:
```tsx
// antes
headerColor = "#08491f",
// depois
headerColor = colors.brandPrimary,
```

Exemplo — dentro de um styled-component:
```tsx
// antes
background-color: #2d2215;
font-family: "Roboto", sans-serif;
// depois
background-color: ${colors.surfaceSidebar};
font-family: ${fonts.sans};
```

> Se um arquivo não usar `fonts`, importe só `{ colors }` (e vice-versa) — `noUnusedLocals` reclama de import não usado. Se um arquivo não tiver NENHUM literal de cor nem font-family, não o modifique (não deve acontecer nos 5, mas confirme).

- [ ] **Step 2: Build** — `npm run build` — verde. Erros de import não usado → ajustar o import.
- [ ] **Step 3: Rodar a suite** — `npm test` — 89 testes passando (valores idênticos → pixel-perfect → tests verdes).
- [ ] **Step 4: Commit**

```bash
git add src/components/templates/ src/components/organisms/
git commit -m "refactor(styles): apply design tokens to templates and organisms"
```

## Context

Task 2 of 4. Substituição mecânica 1:1. Cada token tem o MESMO valor do literal — verificável pela tabela e pelo `tokens.ts`. Não muda nada visual.

## Self-Review

- Os 5 arquivos: todo literal de cor da tabela virou token; font-family virou `fonts.sans`; imports corretos e sem sobra
- `npm run build` verde; `npm test` → 89; commit único, só templates/ e organisms/

## Report

Status + commit SHA + build/test + qualquer literal fora da tabela (NEEDS_CONTEXT) + concerns.

---

## Task 3: Aplicar tokens nos molecules, atom e ions de formulário

**Files:**
- Modify: `src/components/molecules/RuleSection.tsx`
- Modify: `src/components/molecules/FormField.tsx`
- Modify: `src/components/molecules/FormCheckbox.tsx`
- Modify: `src/components/molecules/EmptyState.tsx`
- Modify: `src/components/molecules/CharacterSidebarItem.tsx`
- Modify: `src/components/molecules/AdaptiveActionButton.tsx`
- Modify: `src/components/atoms/CreateButton.tsx`
- Modify: `src/components/ions/FormInput.tsx`
- Modify: `src/components/ions/FormTextArea.tsx`

Mesma operação da Task 2 — substituir literais de cor e font-family pelos tokens da Tabela de mapeamento. Caminhos de import: de `components/molecules/`, `components/atoms/`, `components/ions/` para `src/styles/` é `../../styles/tokens`.

- [ ] **Step 1: Para cada um dos 9 arquivos**, ler, substituir literais conforme a Tabela de mapeamento, ajustar import (`import { colors } from "../../styles/tokens";` e/ou `fonts`).

> `CharacterSidebarItem.tsx` usa as cores de status (`#e74c3c`, `#3498db`, `#2ecc71`, `#ffa216`, `#555`) — todas na tabela. `AdaptiveActionButton.tsx` e `CreateButton.tsx` têm gradientes/sombras — `#ffa216`/`#e60000` (orange), `rgba(0,0,0,0.3)`/`rgba(0,0,0,0.4)` (shadows) — todos na tabela. Se aparecer um literal fora da tabela, reportar NEEDS_CONTEXT.

- [ ] **Step 2: Build** — `npm run build` — verde.
- [ ] **Step 3: Rodar a suite** — `npm test` — 89 testes passando.
- [ ] **Step 4: Commit**

```bash
git add src/components/molecules/ src/components/atoms/ src/components/ions/
git commit -m "refactor(styles): apply design tokens to form molecules, atom and ions"
```

## Context

Task 3 of 4. Mesma substituição 1:1 mecânica.

## Self-Review

- Os 9 arquivos tokenizados; imports corretos; `npm run build` verde; `npm test` → 89; commit único.

## Report

Status + commit SHA + build/test + literais fora da tabela (se houver) + concerns.

---

## Task 4: Aplicar tokens nos styled-components page-local de `CampaignPage` e `MatchPage`

**Files:**
- Modify: `src/pages/CampaignPage.tsx`
- Modify: `src/pages/MatchPage.tsx`

Essas duas páginas mantêm styled-components page-local (headers, títulos, datas, `StatusPill`, `NickConflictMessage`, dialog do lobby etc.) — esses têm literais de cor. Substituir conforme a Tabela. Caminho de import: de `pages/` para `src/styles/` é `../styles/tokens`.

- [ ] **Step 1: Ler `src/pages/CampaignPage.tsx`**, substituir literais de cor e font-family nos styled-components page-local. Import: `import { colors, fonts } from "../styles/tokens";` (só o que usar).

> `MatchPage` tem o `StatusPill` que escolhe cor por `$status` — os valores `#b8860b`/`#27ae60`/`#7d3030` viram `colors.statusScheduled`/`statusOngoing`/`statusEnded`. O `NickConflictMessage` do `CampaignPage` usa `#ff1c1c` (→ `colors.accentDanger`) e `rgba(0,0,0,0.44)` (→ `colors.overlaySoft`). O dialog do lobby do `MatchPage` usa `rgba(0,0,0,0.7)` (→ `colors.overlay`).

- [ ] **Step 2: Ler `src/pages/MatchPage.tsx`**, mesma substituição.

- [ ] **Step 3: Build** — `npm run build` — verde.
- [ ] **Step 4: Rodar a suite** — `npx vitest run src/pages/__tests__/CampaignPage.test.tsx src/pages/__tests__/MatchPage.test.tsx` (os 12 + 16 testes dessas páginas) e depois `npm test` (89 total). Tudo verde.
- [ ] **Step 5: Commit**

```bash
git add src/pages/CampaignPage.tsx src/pages/MatchPage.tsx
git commit -m "refactor(styles): apply design tokens to CampaignPage and MatchPage"
```

## Context

Task 4 of 4. Última aplicação. `CampaignsPage`/`PublicCampaignsPage`/`CharacterSheetsPage`/`CreateCampaignPage`/`CreateMatchPage` NÃO entram — não têm mais styled-components (Fases 2a/2b moveram tudo pros templates).

## Self-Review

- As 2 páginas tokenizadas; `npm run build` verde; `npm test` → 89; commit único.

## Report

Status + commit SHA + build/test + literais fora da tabela (se houver) + concerns.

---

## Self-review checklist (executor faz antes de fechar a fase)

- [ ] `npm run build` verde
- [ ] `npm test` verde — 89 testes (sem mudança de contagem; esta fase não adiciona testes)
- [ ] `npm run lint` verde
- [ ] `grep -rn '#[0-9a-fA-F]' src/components/templates src/components/organisms src/components/atoms/CreateButton.tsx src/components/ions/FormInput.tsx src/components/ions/FormTextArea.tsx` — idealmente zero hex literais nesses arquivos (todos viraram token); exceção: se algum literal estava fora da tabela e foi escalado, documentar
- [ ] Nenhum arquivo da zona pixel-tuned foi tocado
- [ ] Nenhum arquivo fora da lista de "File Structure" foi tocado (sheet/, login, cards intocados)
- [ ] Smoke test manual: `npm run dev`, abrir as páginas refatoradas — visual idêntico (substituição foi 1:1, então deve estar pixel-perfect)

## Next phase

Fase 4 (final): reavaliar `features/sheet/CharacterSheetTemplate.tsx`, escrever o `src/components/CLAUDE.md` definitivo, e consolidar docs + memórias.
