# Frontend Componentization — Design

- **Data:** 2026-05-20
- **Status:** Draft, aguardando revisão do usuário
- **Escopo:** Refatoração do front-end (`System_X_System_React/`) em 5 fases pra eliminar duplicação de páginas, formalizar Atomic Design (incluindo nova camada `organisms/`), introduzir design tokens semantic, e estabelecer safety net de testes.
- **Não-escopo:** Backend (`System_X_System/`), mudanças de produto/UX, internacionalização, dark mode.
- **Status do projeto:** O app não está em produção em 2026-05 — sem usuários reais. A disciplina dessa spec (testes antes, atomic commits, faseamento) protege qualidade do trabalho e revisão, não usuários. Renomes incidentais (ex: typo `AdaptativeActionButton`) podem rolar durante o refactor sem PR isolado. Smoke test manual continua boa prática mas não é gate de release.

---

## 1. Contexto

O front-end foi montado durante o desenvolvimento inicial do projeto. Tem duas dores principais:

1. **Duplicação de páginas com sidebar** — `CampaignPage` (334L) e `MatchPage` (519L) compartilham estrutura (header + sidebar de personagens + main content), divergindo apenas no conteúdo do main e nos items da sidebar.
2. **Duplicação de páginas com formulário** — `CreateCampaignPage` (488L) e `CreateMatchPage` (498L) compartilham estrutura (header + form central + RulesSidebar à direita).
3. **Duplicação de páginas de lista** — `CampaignsPage`, `PublicCampaignsPage`, `CharacterSheetsPage` compartilham shell (header + lista de cards + CTA).
4. **Falta da `RulesSidebar` nas páginas de view** — hoje só aparece nas Create pages; precisa também em CampaignPage e MatchPage.
5. **Componente `features/sheet/CharacterSheetTemplate.tsx`** (666L) está bem desenhado via `SheetMode`, mas merece reavaliação pra ver se sub-organisms podem ser extraídos.

O projeto já adota Atomic Design parcialmente (`ions/atoms/molecules/templates`) e tem disciplina arquitetural acima da média (TS strict, React Query consistente, factories no sheet). A regra do usuário pra `components/` vs `features/` é clara:

> `components/` (atomic) = UI compartilhada ou com alta probabilidade de virar compartilhada. `features/` = UI específica daquela feature. Quando um componente de feature começa a ser consumido por uma segunda feature, **migrar** pra `components/`, não duplicar.

Esse design formaliza essa regra e estrutura o refactor em fases auditáveis.

---

## 2. Faseamento (overview)

```
Fase 0 — Safety Net
  • Adicionar MSW, test helpers, fixtures
  • Characterization tests pras 8 páginas que vamos refatorar
  • Visual atual preservado; nenhuma mudança de produção
  ✅ Saída: suite verde rodando contra o código atual sem mudanças.

Fase 1 — Piloto
  • Criar organisms/, templates/ novos
  • Extrair DetailPageTemplate
  • CampaignPage e MatchPage usam o template
  • Adicionar RulesSidebar nas duas
  • Promover CharacterSidebarItem, AdaptativeActionButton p/ shared
  • Pixel-perfect; tests da Fase 0 não podem quebrar
  ✅ Saída: 2 páginas usando 1 template, RulesSidebar nas duas.

Fase 2 — Replicação Lista + Form
  • Extrair ListPageTemplate (CampaignsPage, PublicCampaignsPage, CharacterSheetsPage)
  • Extrair CreateFormTemplate (CreateCampaignPage, CreateMatchPage)
  • Componentizar formulário (FormField molecule)
  • Pixel-perfect
  ✅ Saída: 8 páginas consolidadas em 3 templates.

Fase 3 — Design Tokens + Visual Cleanup
  • Extrair tokens semantic em src/styles/tokens.ts
  • Normalizar inconsistências de espaçamento/cor/border (exceto zona pixel-tuned)
  • Único lugar onde visual muda
  ✅ Saída: visual coeso, tokens reusáveis.

Fase 4 — Polimento Sheet + CLAUDE.md final
  • Reavaliar features/sheet/CharacterSheetTemplate
  • Escrever src/components/CLAUDE.md definitivo
  • Consolidação de docs e memórias (cleanup)
  ✅ Saída: arquitetura documentada, sheet template menor (se aplicável).
```

Cada fase = spec + plano + PR separados. Smoke test manual obrigatório antes de cada merge.

---

## 3. Estrutura de pastas final

```
src/
├── components/                       ← UI shared OU likely-to-share
│   ├── ions/                         ← primitivos sem domínio
│   │   ├── BaseButton.tsx · BaseInput.tsx · BaseSelect.tsx · BaseOption.tsx
│   │   ├── Logo.tsx · BackButton.tsx · ExpandButton.tsx
│   │   ├── ExpBar.tsx (já tem teste) · ProgressBar.tsx
│   │   ├── PageTitle.tsx
│   │   └── PlusButton.tsx · MinusButton.tsx · PlusIcon.tsx
│   ├── atoms/                        ← com semântica de domínio
│   │   ├── PageHeader.tsx · PageStates.tsx
│   │   ├── BackgroundButton.tsx · ButtonSubmit.tsx
│   │   ├── LogoButton.tsx · CardButtonNavigation.tsx · Form.tsx
│   │   ├── CampaignCard.tsx · CharacterSheetCard.tsx
│   │   └── CharacterExpBar.tsx · HpBar.tsx · SpBar.tsx
│   ├── molecules/                    ← 2-3 atoms
│   │   ├── CharacterSheetHeader.tsx  ← ⚠ pixel-tuned, não normalizar
│   │   ├── ConfirmDialog.tsx · ExpandableText.tsx · ImagePickerModal.tsx
│   │   ├── CharacterSidebarItem.tsx   ← PROMOVIDO de features/campaign/ (Fase 1)
│   │   ├── AdaptativeActionButton.tsx ← PROMOVIDO de features/campaign/ (Fase 1)
│   │   ├── FormField.tsx             ← NOVO (Fase 2)
│   │   ├── EmptyState.tsx            ← NOVO (Fase 2)
│   │   └── RuleSection.tsx           ← NOVO (Fase 1)
│   ├── organisms/                    ← NOVO (Fase 1)
│   │   ├── CharactersSidebar.tsx     ← NOVO
│   │   └── RulesSidebar.tsx          ← NOVO
│   └── templates/
│       ├── SignPagesTemplate.tsx     ← já existe
│       ├── DetailPageTemplate.tsx    ← NOVO (Fase 1)
│       ├── ListPageTemplate.tsx      ← NOVO (Fase 2)
│       └── CreateFormTemplate.tsx    ← NOVO (Fase 2)
│
├── features/
│   ├── campaign/
│   │   ├── MatchItem.tsx             ← (só campaign usa)
│   │   └── utils/characterUtils.ts
│   ├── match/
│   │   └── EnrollmentSidebarItem.tsx ← (só match usa)
│   └── sheet/                        ← (estrutura interna preservada; Fase 4 reavalia)
│
├── pages/                            ← thin orchestrators após o refactor (50-100L cada)
├── hooks/  services/  contexts/  types/  utils/
├── styles/
│   └── tokens.ts                     ← NOVO (Fase 3)
└── test/                             ← NOVO (Fase 0)
    ├── setup.ts                      ← (renomear src/test-setup.ts → src/test/setup.ts)
    ├── server.ts                     ← MSW server
    ├── handlers.ts                   ← default handlers
    ├── render.tsx                    ← renderWithProviders helper
    └── fixtures/
        ├── campaign.ts · match.ts · sheet.ts · user.ts
```

### Decisões importantes

1. **Páginas viram thin orchestrators** (~50-100L vs 300-500L hoje).
2. **`organisms/` é a camada que faltava** — sidebar inteira (shell + conteúdo) é organism.
3. **`features/` mantém `MatchItem` e `EnrollmentSidebarItem`** — uso single-feature.
4. **`CharacterSidebarItem` e `AdaptativeActionButton` migram** — já são shared de facto (MatchPage importa ambos hoje).
5. **`features/sheet/CharacterSheetTemplate.tsx` fica onde está por enquanto** — Fase 4 reavalia.

---

## 4. APIs dos templates e organisms

### 4.1 `templates/DetailPageTemplate.tsx`

```tsx
interface DetailPageTemplateProps {
  headerColor?: string;          // default "#08491f"
  bgImage?: string;              // default worldMap
  leftSidebar: ReactNode;        // geralmente <CharactersSidebar>
  rightSidebar?: ReactNode;      // <RulesSidebar>; opcional
  children: ReactNode;           // conteúdo central
}
```

Slot-based, sem mode/variant. O que varia entre Campaign e Match é estrutura, não enumeração.

### 4.2 `organisms/CharactersSidebar.tsx`

```tsx
interface CharactersSidebarProps<T> {
  title?: string;                // default "PERSONAGENS"
  items: T[];
  renderItem: (item: T) => ReactNode;
  footer?: ReactNode;            // ex: <AdaptiveActionButton label="Criar NPC" />
}
```

Genérico em `T` — MatchPage tem 3 tipos de item (enrollment, participant-with-private, basic-participant); página decide o item; organism só fornece shell + lista.

### 4.3 `organisms/RulesSidebar.tsx`

```tsx
interface RulesSidebarProps {
  title?: string;                // default "REGRAS"
  children: ReactNode;           // seções de regras
  footer?: ReactNode;            // opcional
}
```

E `molecules/RuleSection.tsx`:
```tsx
interface RuleSectionProps {
  title: string;
  children: ReactNode;
}
```

Uso:
```tsx
<RulesSidebar>
  <RuleSection title="Sistema de Combate">{...}</RuleSection>
  <RuleSection title="Progressão">{...}</RuleSection>
</RulesSidebar>
```

### 4.4 Exemplo: CampaignPage após refactor (Fase 1)

De ~334L pra ~80L:

```tsx
export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useToken();
  const { user } = useUser();
  const navigate = useNavigate();
  const { sheetId, sheetNick } = useLocationState();
  const { data: campaign, isPending, isError } = useCampaignDetails(token, id);
  const { mutate: submitSheet, ... } = useSubmitCharacterSheet(token, id);

  if (isPending) return <LoadingContainer>Carregando campanha...</LoadingContainer>;
  if (isError || !campaign) return <ErrorContainer>...</ErrorContainer>;

  const isMaster = campaign.masterUuid === user?.uuid;
  const sortedSheets = getSortedCharacters(campaign.characterSheets, ...);

  return (
    <DetailPageTemplate
      leftSidebar={
        <CharactersSidebar
          items={sortedSheets}
          renderItem={(c) => (
            <CharacterSidebarItem
              character={c}
              isMaster={isMaster}
              isOwn={c.playerUuid === user?.uuid}
              onClick={() => navigate(`/charactersheet/${c.uuid}`, { state: ... })}
            />
          )}
          footer={isMaster && <AdaptiveActionButton label="Criar NPC" onClick={handleCreateNpc} />}
        />
      }
      rightSidebar={
        <RulesSidebar>
          <RuleSection title="Sistema de Combate">{campaign.combatRules}</RuleSection>
          <RuleSection title="Progressão">{campaign.progressionRules}</RuleSection>
          <RuleSection title="Nen & Habilidades">{campaign.nenRules}</RuleSection>
        </RulesSidebar>
      }
    >
      <CampaignHeader campaign={campaign} />
      <CampaignBriefDescription>{campaign.briefInitialDescription}</CampaignBriefDescription>
      <ExpandableText>{campaign.description}</ExpandableText>
      <MatchesList matches={campaign.matches} ... />
    </DetailPageTemplate>
  );
}
```

`CampaignHeader`, `CampaignBriefDescription`, `MatchesList` viram molecules em `components/molecules/` ou ficam locais — decisão na implementação conforme uso real.

### 4.5 `templates/ListPageTemplate.tsx` (Fase 2)

```tsx
interface ListPageTemplateProps {
  title: string;
  headerColor?: string;
  bgImage?: string;
  isPending?: boolean;
  isError?: boolean;
  loadingLabel?: string;
  errorLabel?: string;
  emptyState?: ReactNode;
  isEmpty?: boolean;
  children: ReactNode;
  footerAction?: ReactNode;
}
```

Uso (`CharacterSheetsPage` cai 131L → ~40L):
```tsx
<ListPageTemplate
  title="LISTA DE PERSONAGENS"
  headerColor="black"
  bgImage={space}
  isPending={isPending}
  isError={isError}
  footerAction={
    <CreateButton variant="orange" onClick={() => navigate("/charactersheet/new")}>
      <PlusIcon /> Criar Nova Ficha
    </CreateButton>
  }
>
  {(charSheets ?? []).map((s) => <CharacterSheetCard key={s.uuid} character={s} to={...} />)}
</ListPageTemplate>
```

`CreateButton` vira atom com prop `variant="orange" | "green"`.

### 4.6 `templates/CreateFormTemplate.tsx` (Fase 2)

```tsx
interface CreateFormTemplateProps {
  title: string;
  headerColor?: string;
  bgImage?: string;
  rulesContent?: ReactNode;
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
  error?: string | null;
  actions: ReactNode;
}
```

`molecules/FormField.tsx`:
```tsx
interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  helpText?: string;
  children: ReactNode;  // Input | TextArea | Checkbox
}
```

`CreateCampaignPage` cai 488L → ~120L; `CreateMatchPage` idem.

### 4.7 Princípios de API

| Princípio | Por quê |
|---|---|
| Slots > variants | Fácil estender sem mexer no template. |
| Genéricos só quando necessário | Sidebar tem 3 tipos de item — genérico é honesto. |
| `isPending`/`isError` no template | Reduz boilerplate na página. |
| Sem polimorfismo `as` | YAGNI. |
| Defaults sensatos | Página média não passa 5 props. |

---

## 5. Infraestrutura de testes (Fase 0)

### 5.1 Dependências

```jsonc
"msw": "^2.x",
"@vitest/coverage-v8": "^4.x",
// já temos: vitest, @testing-library/{react,jest-dom,user-event}, jsdom
```

### 5.2 MSW setup

`src/test/server.ts`:
```ts
import { setupServer } from "msw/node";
import { defaultHandlers } from "./handlers";
export const server = setupServer(...defaultHandlers);
```

`src/test/handlers.ts`:
```ts
import { http, HttpResponse } from "msw";
import { campaignFixture, matchFixture, sheetFixture } from "./fixtures";
const baseUrl = "http://localhost:5000";

export const defaultHandlers = [
  http.get(`${baseUrl}/campaigns`, () => HttpResponse.json([campaignFixture])),
  http.get(`${baseUrl}/campaigns/:id`, () => HttpResponse.json(campaignFixture)),
  http.get(`${baseUrl}/campaigns/public`, () => HttpResponse.json([campaignFixture])),
  http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json(matchFixture)),
  http.get(`${baseUrl}/matches/:id/enrollments`, () => HttpResponse.json([])),
  http.get(`${baseUrl}/matches/:id/participants`, () => HttpResponse.json([])),
  http.get(`${baseUrl}/charactersheets`, () => HttpResponse.json([sheetFixture])),
  http.get(`${baseUrl}/charactersheets/:id`, () => HttpResponse.json(sheetFixture)),
];
```

`src/test/setup.ts` (substitui `src/test-setup.ts`):
```ts
import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

`vite.config.ts` ajusta path: `setupFiles: ["./src/test/setup.ts"]`.

### 5.3 Helper de render

`src/test/render.tsx`:
```tsx
interface ProvidersOptions {
  route?: string;
  path?: string;
  token?: string | null;
  user?: { uuid: string; name: string } | null;
}

export function renderWithProviders(
  ui: ReactElement,
  { route = "/", path, token = "fake-jwt-token", user = defaultUser, ...rest }: ProvidersOptions & RenderOptions = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TokenProvider initialToken={token}>
          <UserProvider initialUser={user}>
            <MemoryRouter initialEntries={[route]}>
              {path ? <Routes><Route path={path} element={children} /></Routes> : children}
            </MemoryRouter>
          </UserProvider>
        </TokenProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...rest });
}
```

O test setup precisa dar valores iniciais aos contexts. Dois caminhos válidos, decisão na Fase 0:

- **(A)** Modificar `TokenProvider`/`UserProvider` pra aceitar `initialToken`/`initialUser` opcionais (1 prop extra cada).
- **(B)** Mockar `localStorage` no `src/test/setup.ts` antes de cada teste — zero mudanças em código de produção.

(B) é mais puro pro princípio "Fase 0 não toca produção". (A) é mais legível no teste. Plano da Fase 0 escolhe.

### 5.4 Fixtures

Cada fixture é mínima e tipada exatamente como `src/types/`:

```ts
// src/test/fixtures/campaign.ts
import type { CampaignDetails } from "../../types/campaign";

export const campaignFixture: CampaignDetails = {
  uuid: "campaign-1",
  name: "Campanha de Teste",
  masterUuid: "master-1",
  briefInitialDescription: "Brief de teste",
  description: "Descrição completa",
  storyStartAt: "2025-01-01",
  storyCurrentAt: "2025-06-15T12:00:00Z",
  characterSheets: [],
  matches: [],
  pendingSheets: [],
  myPendingSheet: null,
};

export const campaignAsMaster = (userUuid: string) => ({
  ...campaignFixture,
  masterUuid: userUuid,
});
```

Idem `match.ts`, `sheet.ts`, `user.ts`.

### 5.5 Cobertura por página

| Arquivo de teste | Estimativa |
|---|---|
| `pages/CampaignPage.test.tsx` | ~10 testes |
| `pages/MatchPage.test.tsx` | ~12 testes |
| `pages/CampaignsPage.test.tsx` | ~5 testes |
| `pages/PublicCampaignsPage.test.tsx` | ~5 testes |
| `pages/CharacterSheetsPage.test.tsx` | ~6 testes |
| `pages/CreateCampaignPage.test.tsx` | ~8 testes |
| `pages/CreateMatchPage.test.tsx` | ~8 testes |
| `pages/CharacterSheetPage.test.tsx` | ~10 testes |
| **Total estimado** | **~64 testes** |

**Foco em comportamento do usuário, não estrutura.** Exemplo de organização:

```tsx
describe("CampaignPage", () => {
  describe("loading & error", () => {
    it("mostra 'Carregando...' enquanto a request roda");
    it("mostra erro se a API falha");
    it("mostra 'Campanha não encontrada' se response vazio");
  });
  describe("como Master", () => {
    it("exibe botão 'Criar NPC' na sidebar");
    it("exibe botão 'Criar Partida' no main");
    it("lista todas as fichas pendentes");
  });
  describe("como Player com ficha", () => {
    it("NÃO exibe 'Criar NPC' nem 'Criar Partida'");
    it("exibe 'Submeter Ficha' quando há sheetId no location.state");
    it("mostra erro de conflito de nick se a API responder 409");
  });
});
```

Nenhum teste menciona styled-components, className, ou DOM interno.

### 5.6 KPI de cobertura

Cobertura medida com `vitest run --coverage` vai ficar ~40-55% no projeto inteiro (inclui páginas fora do escopo). **KPI real:** ≥80% nas 8 páginas refatoradas. Relatório filtrado vai junto com o PR da Fase 0.

### 5.7 Riscos conhecidos

1. **`TokenContext`/`UserContext`** precisam aceitar `initialToken`/`initialUser` pra testes — pequena adaptação nos providers.
2. **Fixtures fortemente tipadas** — se `src/types/` mudar, TS pega e força atualização. Bom, mas é manutenção.
3. **Asserts em PT-BR** hardcoded — refatoramos quando virar i18n.

---

## 6. Design tokens (Fase 3)

### 6.1 Filosofia

Tokens são **semantic** (nomeados por uso), não por matiz. Trocar `colors.brown[900]` por `colors.surface.sidebar` deixa o código mais legível e protege rebrand futuro.

### 6.2 `src/styles/tokens.ts`

```ts
export const colors = {
  brand: {
    primary:        "#08491f",
    primaryHover:   "#107135",
  },
  surface: {
    sidebar:        "#2d2215",
    input:          "#493823",
    scrollTrack:    "#42331f",
    overlay:        "rgba(0, 0, 0, 0.7)",
    overlaySoft:    "rgba(0, 0, 0, 0.44)",
  },
  border: {
    input:          "#604d31",
    divider:        "#696969",
    accentDanger:   "#ff1c1c",
  },
  text: {
    primary:        "white",
    muted:          "#e0e0e0",
    disabled:       "#ccc",
    onLight:        "black",
  },
  action: {
    submitBg:       "#107135",
    submitDisabled: "#7a5618",
    cancelBorder:   "white",
    npc:            "#2ecc71",
    danger:         "#e74c3c",
  },
  status: {
    scheduled:      "#b8860b",
    ongoing:        "#27ae60",
    ended:          "#7d3030",
    pending:        "#3498db",
    dead:           "#e74c3c",
    npc:            "#2ecc71",
    left:           "#555",
  },
  feedback: {
    error:          "#e74c3c",
    errorAlert:     "#ff1c1c",
    errorBg:        "rgba(231, 76, 60, 0.2)",
    errorBgSoft:    "rgba(231, 76, 60, 0.1)",
  },
} as const;

export const spacing = {
  xs: "8px", sm: "12px", md: "20px", lg: "30px", xl: "40px",
} as const;

export const radii = {
  sm: "6px", md: "8px", lg: "12px", xl: "16px", pill: "20px",
} as const;

export const typography = {
  family: {
    sans:    '"Roboto", sans-serif',
    display: '"Oswald", sans-serif',
  },
  size: {
    xs: "12px", sm: "14px", md: "16px", lg: "18px",
    xl: "20px", "2xl": "24px", "3xl": "26px", "4xl": "32px", "5xl": "42px",
  },
  weight: {
    regular: 400, medium: 500, semibold: 600, bold: 700, black: 900,
  },
} as const;

export const breakpoints = {
  sm: "500px", md: "609px", lg: "768px", xl: "1024px",
} as const;
```

### 6.3 Regra de uso

1. Sempre preferir token semantic quando o uso é claro.
2. Se não existe token apropriado, **criar** o token antes de hardcodar.
3. Hex literal em styled-components fora da zona pixel-tuned = code smell (lint rule a estabelecer).
4. Tokens `as const` → autocomplete + erro de typo do TS.

### 6.4 Estratégia de aplicação

- **Commit 1:** criar `tokens.ts` populado. Nada usa ainda.
- **Commits 2-N:** um commit por template/organism, substituindo valores. Tests verdes.
- **Último commit:** (opcional) lint rule proibindo hex literal em arquivos novos.

### 6.5 Sem ThemeProvider por enquanto

Import direto basta. Migração pra ThemeProvider só quando aparecer demanda real (dark mode, white-label).

---

## 7. Zona pixel-tuned (do-not-normalize)

Esses arquivos têm valores numéricos ajustados manualmente pra compensar SVGs imperfeitos (bordas vazias, ausência de centralização). **Substituir por tokens, padronizar paddings, ou "limpar" valores anômalos vai quebrar visual.**

- `src/components/molecules/CharacterSheetHeader.tsx`
- `src/features/sheet/MentalsDiagram.tsx`
- `src/features/sheet/PhysicalsDiagram.tsx`
- `src/features/sheet/NenPrinciplesDiagram.tsx`

**Regra:** durante refactor estrutural (mover arquivo, extrair template), preservar valores numéricos exatos. Durante Fase 3 (design tokens), pular esses arquivos inteiros. Se o SVG fonte for corrigido um dia, o CSS pode ser limpo — mas as duas mudanças andam juntas.

---

## 8. Migrações de arquivo — protocolo

Cada migração segue:

1. Criar o arquivo no destino final.
2. Atualizar todos os imports do projeto.
3. `npm run build` (TS pega quebrados).
4. `npm test` (characterization tests confirmam comportamento).
5. Deletar arquivo original.
6. Commit atômico (1 commit por migração lógica).

Commits atômicos permitem `git bisect` granular. Migrações em massa num commit perdem essa garantia.

### Migrações da Fase 1

| Arquivo | De | Para | Motivo |
|---|---|---|---|
| `CharacterSidebarItem.tsx` | `features/campaign/` | `components/molecules/` | já é shared (MatchPage importa) |
| `AdaptativeActionButton.tsx` | `features/campaign/` | `components/molecules/` | já é shared (MatchPage importa) |

> Nome `AdaptativeActionButton` tem typo (deveria ser `Adaptive`). **Não corrigir nesse refactor** — correção de nome é mudança separada que polui o diff. Pode virar PR de 1 commit depois.

### Migrações da Fase 2

| Componentes a criar (novos) | Local | Motivo |
|---|---|---|
| `FormField.tsx` | `components/molecules/` | nasce shared (3+ forms usam) |
| `EmptyState.tsx` | `components/molecules/` | nasce shared |
| `RuleSection.tsx` | `components/molecules/` | nasce shared |

| Renomear | De | Para | Motivo |
|---|---|---|---|
| setup de teste | `src/test-setup.ts` | `src/test/setup.ts` | agrupar tudo de teste |

### Não migram

- `MatchItem.tsx` — só CampaignPage usa, fica em `features/campaign/`.
- `EnrollmentSidebarItem.tsx` — só MatchPage usa, fica em `features/match/`.
- `features/sheet/*` — reavaliação na Fase 4.

### Rollback

Cada fase = PR separado. Bug não pego por testes:

- **Fase 0:** revert do PR; testes podem ser desativados em massa via `vitest --exclude`.
- **Fase 1+:** revert do merge; commits atômicos permitem revert seletivo.

Antes de cada merge: `npm run build` + `npm test` + **smoke test manual** das páginas tocadas.

---

## 9. `src/components/CLAUDE.md` — esboço

Versão final escrita na Fase 4. Esboço:

```markdown
# UI components — arquitetura

Esse diretório é o UI Kit do projeto: componentes que são (ou serão) compartilhados
entre mais de uma feature/página. Específicos de uma feature ficam em src/features/.

## Quando colocar aqui vs em features/

- Aqui: UI usada por 2+ features OU com alta probabilidade de virar shared.
- features/: UI usada por uma única feature. Quando uma 2ª feature começar a importar,
  MOVER pra cá (não duplicar). Migração é deliberada: pause no 2º import e pergunte
  "isso devia ser shared?". Se sim, migra primeiro, depois importa.

## Atomic Design — 5 camadas

- ions/         primitivos sem semântica de domínio (BaseButton, Logo)
- atoms/        UI pequena com semântica do domínio (CampaignCard, PageHeader)
- molecules/    2-3 atoms (ConfirmDialog, FormField, CharacterSidebarItem)
- organisms/    pedaços grandes (CharactersSidebar, RulesSidebar)
- templates/    layouts de página (DetailPageTemplate, ListPageTemplate, CreateFormTemplate, SignPagesTemplate)

> Por que ions existe além de atoms: na prática é útil distinguir wrapper HTML
> genérico (ion) de wrapper com semântica do nosso jogo (atom).

## Templates disponíveis

(Lista preenchida na Fase 4 com link, props, exemplo de uso.)

## Princípios

1. Slots > variants
2. YAGNI nas props
3. Tipo > runtime check (validar input só na fronteira do sistema)
4. Sem comentários óbvios — comentário só pra "por quê não-óbvio"
5. Promote, don't duplicate

## Tokens

Em src/styles/tokens.ts (semantic). Sem hex literal fora da zona pixel-tuned.

## Zona pixel-tuned (do-not-normalize)

- src/components/molecules/CharacterSheetHeader.tsx
- src/features/sheet/MentalsDiagram.tsx
- src/features/sheet/PhysicalsDiagram.tsx
- src/features/sheet/NenPrinciplesDiagram.tsx

CSS ajustado manualmente pra compensar SVGs imperfeitos. Não normalizar.

## Testes

Integration via src/test/. Sem unit test pra cada componente — exceção pra ions
com lógica complexa (ExpBar) e utils puros.
```

---

## 10. Melhorias fora-de-escopo (registrado pra futuro)

Não vai ser feito agora; vale ter no radar:

1. **`useForm`** usa `Record<string, any>` (contrasta com TS estrito do resto). PR de 10 min.
2. **`useLocationState<T>()`** — hook pra extrair `location.state` tipado. Vai entrar na Fase 1 como side-effect natural.
3. **Magic strings de URL** — `src/routes.ts` com `routes.campaign(id)`. Baixa prioridade.
4. **`isApiError`** vive em `services/httpClient.ts` mas é importado por `pages/`. Mover pra `src/utils/apiErrors.ts` — Fase 1 ou 2.
5. **Mensagens hardcoded em PT-BR** — i18n quando virar prioridade. `src/i18n/pt-BR.ts` pode começar enquanto.
6. **`vite.config.ts` cast `as any`** — esconde tipo. Remover quando Vitest 4 exportar tipos cleanly.
7. **CSS container queries em `CharacterSheetTemplate`** — não testado. Visual regression no sheet é risco.
8. **`useCharSheetBuilder`** — bem feito, não mexer.

---

## 11. Sugestões estratégicas

- **PR pequenos = revisão honesta.** PR de 200L é revisado de verdade; PR de 2.000L vira "LGTM" cego.
- **Documente decisões, não código.** Código mostra "o quê"; doc explica "por quê não-óbvio" (ex: por que `ions/` existe, por que zona pixel-tuned).
- **Smoke test manual antes de cada merge.** Mesmo com testes verdes. Testes pegam regressão funcional; olho pega regressão visual.
- **Reversibilidade > otimalidade.** "Adicionar token novo" é reversível em 30s. "Promover componente" requer atualizar imports. "Renomear pasta principal" tem custo alto. Decisão fundo = mais perigosa.

---

## 12. Evoluções futuras (depois das 5 fases)

- **Storybook** quando tiver 10+ organisms/templates. Hoje ~5.
- **ThemeProvider** quando aparecer demanda dark/light/sazonal.
- **Playwright** com 3-4 E2E críticos (criar conta → criar campanha → submeter ficha → master aceita).
- **MSW worker em dev** quando back tiver indisponibilidade frequente.

---

## 13. Aprovação e próximos passos

- Usuário aprova esse design.
- Eu invoco `superpowers:writing-plans` pra gerar o **plano da Fase 0** (testes).
- Cada fase ganha seu próprio plano em `docs/superpowers/plans/`.
- Ao final da Fase 4: passo de consolidação (enxugar docs e memórias auto, ver feedback memory `feedback-trim-docs-and-memory-at-end`).
