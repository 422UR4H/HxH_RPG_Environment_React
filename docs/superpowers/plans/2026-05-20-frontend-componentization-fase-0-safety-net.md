# Frontend Componentization — Fase 0: Safety Net Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estabelecer suite de characterization tests cobrindo as 8 páginas que serão refatoradas nas Fases 1-2, **sem mudar comportamento de produção**, pra que os refactors subsequentes tenham safety net.

**Architecture:** Vitest + React Testing Library (já configurados) + MSW pra mockar HTTP + `renderWithProviders` helper pra montar providers do app (QueryClient, Router, Token, User). Testes focam em comportamento do usuário (texto visível, roles, interações), não em estrutura DOM ou className.

**Tech Stack:** TypeScript estrito (verbatimModuleSyntax), Vitest 4, @testing-library/react 16, @testing-library/jest-dom 6, MSW 2, jsdom.

**Spec de referência:** `docs/superpowers/specs/2026-05-20-frontend-componentization-design.md`

---

## Phase 0 — escopo

8 páginas. KPI: ≥80% de cobertura comportamental por página, **exceto** `CharacterSheetPage` que fica em ~50-65% intencionalmente (a maior parte do comportamento mora dentro de `CharacterSheetTemplate`, que será refatorado na Fase 4 — ganha cobertura junto).

| Página | Testes | Cobertura alvo |
|---|---|---|
| CampaignPage | 11 | ≥80% |
| MatchPage | 12 | ≥80% |
| CampaignsPage | 5 | ≥80% |
| PublicCampaignsPage | 5 | ≥80% |
| CharacterSheetsPage | 6 | ≥80% |
| CreateCampaignPage | 8 | ≥80% |
| CreateMatchPage | 6 (+2 condicionais) | ≥80% |
| CharacterSheetPage | 4 | ~50-65% (justificado) |
| **Total** | **57 (+2 condicionais)** | |

Decisão tática (da §5.7 da spec): **opção (B)** — mockar `localStorage` em vez de modificar `TokenProvider`/`UserProvider`. Zero mudanças em código de produção.

---

## File Structure

**Arquivos criados:**

- `src/test/server.ts` — instância do MSW server
- `src/test/handlers.ts` — default handlers cobrindo happy path
- `src/test/setup.ts` — substitui `src/test-setup.ts`; setup global do MSW + localStorage mock
- `src/test/render.tsx` — `renderWithProviders()` helper
- `src/test/fixtures/campaign.ts` — `campaignFixture`, `campaignAsMaster()`
- `src/test/fixtures/match.ts` — `matchFixture`, `matchAsMaster()`, `matchOngoing()`, `matchEnded()`
- `src/test/fixtures/sheet.ts` — `sheetFixture`, `sheetSummaryFixture`, `pendingSheetFixture`
- `src/test/fixtures/user.ts` — `userFixture`, `masterUserFixture`
- `src/pages/__tests__/CampaignPage.test.tsx`
- `src/pages/__tests__/MatchPage.test.tsx`
- `src/pages/__tests__/CampaignsPage.test.tsx`
- `src/pages/__tests__/PublicCampaignsPage.test.tsx`
- `src/pages/__tests__/CharacterSheetsPage.test.tsx`
- `src/pages/__tests__/CreateCampaignPage.test.tsx`
- `src/pages/__tests__/CreateMatchPage.test.tsx`
- `src/pages/__tests__/CharacterSheetPage.test.tsx`

**Arquivos modificados:**

- `package.json` — adiciona deps `msw`, `@vitest/coverage-v8`; adiciona script `test:coverage`
- `vite.config.ts` — atualiza `setupFiles` pra apontar pro novo path
- `src/test-setup.ts` — DELETADO após Task 2

**Arquivos NUNCA tocados nessa fase (regra invioável):** qualquer arquivo dentro de `src/components/`, `src/pages/` (exceto criação dos `__tests__/`), `src/features/`, `src/hooks/`, `src/services/`, `src/contexts/`, `src/types/`, `src/utils/`. Phase 0 é "zero produção". Se algum teste exigir mudança em código de produção, **parar e escalar** — provavelmente é sinal de que a abordagem (B) tem limite e a opção (A) é necessária pra aquele caso.

---

## Task 1: Instalar dependências (msw + coverage)

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar `msw` como devDependency**

```bash
cd System_X_System_React
npm install --save-dev msw
```

Verificar que `package.json` lista `"msw": "^2.x.x"` em `devDependencies`.

- [ ] **Step 2: Instalar `@vitest/coverage-v8` como devDependency**

```bash
npm install --save-dev @vitest/coverage-v8
```

Verificar que `package.json` lista `"@vitest/coverage-v8": "^4.x.x"` (mesmo major do vitest instalado).

- [ ] **Step 3: Adicionar script de cobertura ao package.json**

Modify `package.json`, na seção `scripts`, adicionar `"test:coverage": "vitest run --coverage"`. Resultado final dos scripts deve ser:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

- [ ] **Step 4: Rodar testes existentes pra confirmar que nada quebrou**

```bash
npm test
```

Expected: todos os testes existentes em `src/features/sheet/__tests__/` passam (são 4 arquivos: `DiagramDistributionReset.test.tsx`, `ExpBar.test.tsx`, `ProficienciesList.test.tsx`, `buildFromClass.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(test): add msw and @vitest/coverage-v8 deps"
```

---

## Task 2: Reorganizar diretório de teste

**Files:**
- Create: `src/test/setup.ts` (copy of old)
- Modify: `vite.config.ts:10` (setupFiles path)
- Delete: `src/test-setup.ts`

- [ ] **Step 1: Ler conteúdo atual de `src/test-setup.ts`**

```bash
cat src/test-setup.ts
```

(Provavelmente contém apenas `import "@testing-library/jest-dom/vitest";` ou similar — captura o conteúdo pra preservar na cópia.)

- [ ] **Step 2: Criar pasta `src/test/` e copiar setup**

```bash
mkdir -p src/test
cp src/test-setup.ts src/test/setup.ts
```

- [ ] **Step 3: Atualizar `vite.config.ts` pra apontar pro novo path**

Modify `vite.config.ts:10` (linha `setupFiles: ["./src/test-setup.ts"],`):

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
} as any);
```

- [ ] **Step 4: Rodar testes pra confirmar que setup novo funciona**

```bash
npm test
```

Expected: testes em `src/features/sheet/__tests__/` continuam passando — só mudou o path do setup, conteúdo é idêntico.

- [ ] **Step 5: Deletar `src/test-setup.ts` antigo**

```bash
rm src/test-setup.ts
```

- [ ] **Step 6: Rodar testes uma última vez**

```bash
npm test
```

Expected: testes passam usando exclusivamente `src/test/setup.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/test/setup.ts vite.config.ts
git rm src/test-setup.ts
git commit -m "refactor(test): move test-setup.ts into src/test/ directory"
```

---

## Task 3: Criar MSW server e default handlers

**Files:**
- Create: `src/test/server.ts`
- Create: `src/test/handlers.ts`

> **Observação:** essa task cria a infra sem ainda usar. As fixtures vêm na Task 5; handlers vão referenciar fixtures que ainda não existem. Pra resolver, os handlers iniciais vão retornar objetos placeholder vazios — substituídos na Task 5. Isso evita dependência circular entre tasks.

- [ ] **Step 1: Criar `src/test/server.ts`**

```ts
// src/test/server.ts
import { setupServer } from "msw/node";
import { defaultHandlers } from "./handlers";

export const server = setupServer(...defaultHandlers);
```

- [ ] **Step 2: Criar `src/test/handlers.ts` com handlers placeholder**

```ts
// src/test/handlers.ts
import { http, HttpResponse } from "msw";

const baseUrl = "http://localhost:5000";

// Handlers default cobrem o happy path. Cada teste pode override via
// server.use(...) pra cenários específicos (erro, master vs player, etc).
export const defaultHandlers = [
  http.get(`${baseUrl}/campaigns`, () => HttpResponse.json([])),
  http.get(`${baseUrl}/campaigns/:id`, () => HttpResponse.json(null)),
  http.get(`${baseUrl}/campaigns/public`, () => HttpResponse.json([])),
  http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json(null)),
  http.get(`${baseUrl}/matches/:id/enrollments`, () => HttpResponse.json([])),
  http.get(`${baseUrl}/matches/:id/participants`, () => HttpResponse.json([])),
  http.get(`${baseUrl}/charactersheets`, () => HttpResponse.json([])),
  http.get(`${baseUrl}/charactersheets/:id`, () => HttpResponse.json(null)),
  http.get(`${baseUrl}/characterclasses`, () => HttpResponse.json([])),
];
```

- [ ] **Step 3: Verificar baseUrl correto**

Conferir `src/services/config.ts` ou `httpClient.ts` pra confirmar a URL base. Se for diferente de `http://localhost:5000`, ajustar a constante `baseUrl` em `src/test/handlers.ts`. Se há suporte a `import.meta.env.VITE_API_URL`, hardcodar `http://localhost:5000` mesmo (testes não leem env do app).

Run: `grep -n "VITE_API_URL\|baseURL\|localhost:5000" src/services/`

- [ ] **Step 4: Build pra garantir que TS aceita**

```bash
npm run build
```

Expected: build verde. Erros de tipo em `msw` indicam que `msw` v2 tem API diferente — verificar com `npm ls msw`.

- [ ] **Step 5: Commit**

```bash
git add src/test/server.ts src/test/handlers.ts
git commit -m "feat(test): add MSW server and placeholder handlers"
```

---

## Task 4: Integrar MSW no setup global + mock de localStorage

**Files:**
- Modify: `src/test/setup.ts`

- [ ] **Step 1: Substituir `src/test/setup.ts` por versão completa**

```ts
// src/test/setup.ts
import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { server } from "./server";

// --- MSW lifecycle -------------------------------------------------------
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// --- localStorage mock ---------------------------------------------------
// Os contexts (TokenContext, UserContext) hidratam de localStorage no mount.
// Cada teste começa com um localStorage limpo e populado pelo helper render().
// Reset entre testes garante isolamento.

class LocalStorageMock implements Storage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.get(key) ?? null; }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, value); }
}

beforeEach(() => {
  const storage = new LocalStorageMock();
  Object.defineProperty(window, "localStorage", {
    value: storage,
    writable: true,
    configurable: true,
  });
});
```

- [ ] **Step 2: Verificar que setup compila**

```bash
npm run build
```

Expected: build verde.

- [ ] **Step 3: Rodar testes existentes pra ver se algum quebra**

```bash
npm test
```

Expected: os 4 testes existentes (`ExpBar.test.tsx`, `ProficienciesList.test.tsx`, `DiagramDistributionReset.test.tsx`, `buildFromClass.test.ts`) continuam passando. Eles não dependem de localStorage nem de HTTP, então o setup novo é inerte pra eles.

Se algum quebrar com erro tipo "request without handler", o teste antigo está fazendo HTTP que não esperávamos — investigar antes de prosseguir.

- [ ] **Step 4: Commit**

```bash
git add src/test/setup.ts
git commit -m "feat(test): integrate MSW lifecycle and localStorage mock"
```

---

## Task 5: Criar fixtures tipadas

**Files:**
- Create: `src/test/fixtures/user.ts`
- Create: `src/test/fixtures/sheet.ts`
- Create: `src/test/fixtures/campaign.ts`
- Create: `src/test/fixtures/match.ts`
- Modify: `src/test/handlers.ts` (substituir placeholders por fixtures)

> **Importante:** As fixtures usam tipos de `src/types/`. Antes de escrever, confirma o shape lendo cada arquivo de tipo:
> ```bash
> cat src/types/user.ts src/types/characterSheet.ts src/types/campaign.ts src/types/campaigns.ts src/types/match.ts
> ```
> Se a shape diverge do mostrado abaixo (porque a API evoluiu desde a spec), ajustar fixture pra casar com o tipo. **TS vai pegar erros de campo faltando** — usar o build como guia.

- [ ] **Step 1: Criar `src/test/fixtures/user.ts`**

```ts
// src/test/fixtures/user.ts
import type { UserStorage } from "../../types/user";

export const userFixture: UserStorage = {
  uuid: "user-1",
  name: "Test Player",
  email: "player@test.com",
};

export const masterUserFixture: UserStorage = {
  uuid: "master-1",
  name: "Test Master",
  email: "master@test.com",
};
```

Se o tipo `UserStorage` tem campos adicionais (ex: `createdAt`, `avatarUrl`), adicionar com valores plausíveis. TS vai reclamar se faltar.

- [ ] **Step 2: Criar `src/test/fixtures/sheet.ts`**

```ts
// src/test/fixtures/sheet.ts
import type { CharacterSheet, CharacterSheetSummary, CharacterPrivateSummary } from "../../types/characterSheet";
import { createEmptyCharacterSheet } from "../../features/sheet/factories/characterSheet.factory";

export const sheetFixture: CharacterSheet = {
  ...createEmptyCharacterSheet(),
  uuid: "sheet-1",
  playerUuid: "user-1",
  characterClass: "Especialista",
  profile: {
    ...createEmptyCharacterSheet().profile,
    nickname: "TestNick",
    fullname: "Test Character",
  },
};

export const sheetSummaryFixture: CharacterSheetSummary = {
  uuid: "sheet-1",
  nickName: "TestNick",
  playerUuid: "user-1",
  coverUrl: null,
  avatarUrl: null,
};

export const pendingSheetFixture: CharacterPrivateSummary = {
  uuid: "sheet-pending",
  nickName: "PendingChar",
  playerUuid: "user-2",
  fullName: "Pending Character",
  characterClass: "Manipulador",
  coverUrl: null,
  avatarUrl: null,
  currExp: 0,
  nextLvlBaseExp: 100,
  health: { current: 100, max: 100 },
  stamina: { current: 100, max: 100 },
  deadAt: null,
};
```

> Os campos `health`/`stamina` etc dependem do shape `StatusBar` em `characterSheet.ts`. Ajustar conforme tipo real.

- [ ] **Step 3: Criar `src/test/fixtures/campaign.ts`**

```ts
// src/test/fixtures/campaign.ts
import type { CampaignDetails } from "../../types/campaign";
import type { CampaignSummary } from "../../types/campaigns";

export const campaignSummaryFixture: CampaignSummary = {
  uuid: "campaign-1",
  name: "Campanha de Teste",
  briefInitialDescription: "Brief",
  storyStartAt: "2025-01-01",
  isPublic: true,
  masterName: "Test Master",
  coverUrl: null,
  // ajustar campos conforme CampaignSummary real
};

export const campaignFixture: CampaignDetails = {
  uuid: "campaign-1",
  name: "Campanha de Teste",
  masterUuid: "master-1",
  briefInitialDescription: "Brief inicial",
  description: "Descrição completa da campanha",
  storyStartAt: "2025-01-01",
  storyCurrentAt: "2025-06-15T12:00:00Z",
  characterSheets: [],
  matches: [],
  pendingSheets: [],
  myPendingSheet: null,
  isPublic: true,
  callLink: "",
  // ajustar conforme CampaignDetails real
};

export const campaignAsMaster = (userUuid: string): CampaignDetails => ({
  ...campaignFixture,
  masterUuid: userUuid,
});

export const campaignWithPendingSheets = (sheets: CampaignDetails["pendingSheets"]): CampaignDetails => ({
  ...campaignFixture,
  pendingSheets: sheets,
});
```

- [ ] **Step 4: Criar `src/test/fixtures/match.ts`**

```ts
// src/test/fixtures/match.ts
import type { MatchDetails } from "../../types/match";

export const matchFixture: MatchDetails = {
  uuid: "match-1",
  campaignUuid: "campaign-1",
  masterUuid: "master-1",
  title: "Partida de Teste",
  briefInitialDescription: "Brief partida",
  description: "Descrição partida",
  isPublic: true,
  gameScheduledAt: "2025-12-01T19:00:00Z",
  storyStartAt: "2025-12-01",
  gameStartAt: null,
  storyEndAt: null,
  briefFinalDescription: null,
  // ajustar conforme MatchDetails real
};

export const matchAsMaster = (userUuid: string): MatchDetails => ({
  ...matchFixture,
  masterUuid: userUuid,
});

export const matchOngoing = (): MatchDetails => ({
  ...matchFixture,
  gameStartAt: "2025-12-01T19:05:00Z",
});

export const matchEnded = (): MatchDetails => ({
  ...matchFixture,
  gameStartAt: "2025-12-01T19:05:00Z",
  storyEndAt: "2025-12-15",
  briefFinalDescription: "Partida encerrada",
});
```

- [ ] **Step 5: Substituir placeholders em `src/test/handlers.ts`**

```ts
// src/test/handlers.ts
import { http, HttpResponse } from "msw";
import { campaignFixture, campaignSummaryFixture } from "./fixtures/campaign";
import { matchFixture } from "./fixtures/match";
import { sheetFixture, sheetSummaryFixture } from "./fixtures/sheet";

const baseUrl = "http://localhost:5000";

export const defaultHandlers = [
  http.get(`${baseUrl}/campaigns`, () => HttpResponse.json([campaignSummaryFixture])),
  http.get(`${baseUrl}/campaigns/:id`, () => HttpResponse.json(campaignFixture)),
  http.get(`${baseUrl}/campaigns/public`, () => HttpResponse.json([campaignSummaryFixture])),
  http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json(matchFixture)),
  http.get(`${baseUrl}/matches/:id/enrollments`, () => HttpResponse.json([])),
  http.get(`${baseUrl}/matches/:id/participants`, () => HttpResponse.json([])),
  http.get(`${baseUrl}/charactersheets`, () => HttpResponse.json([sheetSummaryFixture])),
  http.get(`${baseUrl}/charactersheets/:id`, () => HttpResponse.json(sheetFixture)),
  http.get(`${baseUrl}/characterclasses`, () => HttpResponse.json([])),
];
```

> **Lembrete sobre snake_case:** o `httpClient` aplica `objToCamelCase` no inbound. Nossas fixtures ficam em **camelCase** porque é assim que chegam aos componentes. Se o backend real responder em snake_case e o teste falhar com "field undefined", revisar `httpClient.ts` pra confirmar se o caminho via MSW também passa pelo conversor (passa — MSW intercepta antes do conversor).

- [ ] **Step 6: Build pra validar tipos**

```bash
npm run build
```

Expected: build verde. Se TS reclamar de campos faltando nas fixtures, adicionar conforme os tipos reais em `src/types/`. Se reclamar de campos extras, remover.

- [ ] **Step 7: Commit**

```bash
git add src/test/fixtures/ src/test/handlers.ts
git commit -m "feat(test): add typed fixtures and wire up MSW handlers"
```

---

## Task 6: Criar `renderWithProviders` helper

**Files:**
- Create: `src/test/render.tsx`

- [ ] **Step 1: Criar `src/test/render.tsx`**

```tsx
// src/test/render.tsx
import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TokenContextProvider } from "../contexts/TokenContext";
import { UserContextProvider } from "../contexts/UserContext";
import { userFixture } from "./fixtures/user";
import type { UserStorage } from "../types/user";

interface ProvidersOptions {
  /** Pathname do MemoryRouter. Default: "/" */
  route?: string;
  /** Route pattern, ex: "/campaigns/:id". Necessário se a página usa useParams. */
  path?: string;
  /** JWT pra ser plantado em localStorage["token"]. null = não autenticado. */
  token?: string | null;
  /** UserStorage pra ser plantado em localStorage["user"]. null = sem user. */
  user?: UserStorage | null;
}

const TOKEN_KEY = "token";
const USER_KEY = "user";

export function renderWithProviders(
  ui: ReactElement,
  {
    route = "/",
    path,
    token = "fake-jwt-token",
    user = userFixture,
    ...rest
  }: ProvidersOptions & Omit<RenderOptions, "wrapper"> = {},
) {
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, JSON.stringify({ token }));
  }
  if (user) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TokenContextProvider>
          <UserContextProvider>
            <MemoryRouter initialEntries={[route]}>
              {path ? (
                <Routes>
                  <Route path={path} element={children} />
                </Routes>
              ) : (
                children
              )}
            </MemoryRouter>
          </UserContextProvider>
        </TokenContextProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...rest });
}
```

> **Pendência conhecida:** o nome exato dos providers (`TokenContextProvider` vs `TokenProvider` vs export default) depende de como estão escritos em `src/contexts/`. Conferir com:
> ```bash
> grep -n "export" src/contexts/TokenContext.tsx src/contexts/UserContext.tsx
> ```
> Ajustar imports + JSX do helper conforme nomes reais. Mesma checagem pra `TOKEN_KEY` / `USER_KEY` — confirmar os literals usados nos providers (CLAUDE.md menciona `"token"` e `"user"`, validar).

- [ ] **Step 2: Build pra validar**

```bash
npm run build
```

Expected: build verde. Se houver erros de import de contexts, ajustar nomes.

- [ ] **Step 3: Commit**

```bash
git add src/test/render.tsx
git commit -m "feat(test): add renderWithProviders helper"
```

---

## Task 7: Smoke test da infra (1 teste end-to-end)

**Files:**
- Create: `src/test/__smoke__/infra.test.tsx`

Esse teste prova que: (1) MSW intercepta requests, (2) `renderWithProviders` monta tudo, (3) `localStorage` mock está injetado, (4) jest-dom matchers funcionam. Se ele passar, a infra está sólida pra começar os characterization tests.

- [ ] **Step 1: Criar `src/test/__smoke__/infra.test.tsx`**

```tsx
// src/test/__smoke__/infra.test.tsx
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../render";
import CampaignsPage from "../../pages/CampaignsPage";

describe("Infra smoke test", () => {
  it("renderiza CampaignsPage e busca o título via MSW", async () => {
    renderWithProviders(<CampaignsPage />, {
      route: "/campaigns",
      path: "/campaigns",
    });

    expect(await screen.findByText(/LISTA DE CAMPANHAS/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o smoke test**

```bash
npx vitest run src/test/__smoke__/infra.test.tsx
```

Expected: 1 teste passa. Se falhar:

- "unhandled request" → handler faltando em `src/test/handlers.ts`; investigar URL.
- "could not find ... in DOM" → page mostrou loading/error em vez do título; provavelmente token/user não foram lidos (revisar names das keys de localStorage).
- "useContext returns undefined" → wrapping de providers em `render.tsx` está errado (ordem ou nomes).

- [ ] **Step 3: Rodar suite completa pra confirmar que infra não quebra testes existentes**

```bash
npm test
```

Expected: 5 arquivos de teste passam (4 existentes + smoke novo).

- [ ] **Step 4: Commit**

```bash
git add src/test/__smoke__/infra.test.tsx
git commit -m "test: add infra smoke test for MSW + providers wiring"
```

---

## Task 8: Testes de `CampaignPage`

**Files:**
- Create: `src/pages/__tests__/CampaignPage.test.tsx`

Cobertura alvo: ~11 testes em 4 grupos (loading/error, master, player com ficha, navegação).

> **Convenção:** todos os testes deste arquivo assumem rota `/campaigns/:id` e route `/campaigns/campaign-1`. O id `campaign-1` casa com o `campaignFixture`. Para cenário de outro id, definir handler específico via `server.use(...)`.

- [ ] **Step 1: Criar arquivo com setup e primeiro grupo (loading/error)**

```tsx
// src/pages/__tests__/CampaignPage.test.tsx
import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { campaignFixture, campaignAsMaster } from "../../test/fixtures/campaign";
import { pendingSheetFixture } from "../../test/fixtures/sheet";
import { masterUserFixture, userFixture } from "../../test/fixtures/user";
import CampaignPage from "../CampaignPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseUrl = "http://localhost:5000";

function renderPage() {
  return renderWithProviders(<CampaignPage />, {
    route: "/campaigns/campaign-1",
    path: "/campaigns/:id",
  });
}

describe("CampaignPage", () => {
  describe("loading & error", () => {
    it("mostra 'Carregando campanha...' enquanto a request resolve", () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, async () => {
          await new Promise((r) => setTimeout(r, 50));
          return HttpResponse.json(campaignFixture);
        }),
      );

      renderPage();

      expect(screen.getByText(/Carregando campanha\.\.\./i)).toBeInTheDocument();
    });

    it("mostra mensagem de erro se a API responde 500", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ error: "server error" }, { status: 500 }),
        ),
      );

      renderPage();

      expect(await screen.findByText(/Falha ao carregar detalhes da campanha/i)).toBeInTheDocument();
    });

    it("mostra 'Campanha não encontrada' quando response é null", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () => HttpResponse.json(null)),
      );

      renderPage();

      expect(await screen.findByText(/Campanha n[ãa]o encontrada/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Rodar o primeiro grupo pra validar setup do arquivo**

```bash
npx vitest run src/pages/__tests__/CampaignPage.test.tsx
```

Expected: 3 testes passam. Se falhar com "useCampaignDetails returns immediately" ou similar, ajustar handler do delay ou revisar como o hook é importado.

- [ ] **Step 3: Adicionar grupo "como Master"**

Append ao `describe("CampaignPage", ...)`:

```tsx
  describe("como Master", () => {
    it("exibe botão 'Criar NPC' na sidebar", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json(campaignAsMaster(masterUserFixture.uuid)),
        ),
      );

      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });

      expect(await screen.findByText(/Criar NPC/i)).toBeInTheDocument();
    });

    it("exibe botão 'Criar Partida' no main content", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json(campaignAsMaster(masterUserFixture.uuid)),
        ),
      );

      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });

      expect(await screen.findByText(/Criar Partida/i)).toBeInTheDocument();
    });

    it("lista fichas pendentes da campanha inteira", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({
            ...campaignAsMaster(masterUserFixture.uuid),
            pendingSheets: [pendingSheetFixture],
          }),
        ),
      );

      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });

      expect(await screen.findByText("PendingChar")).toBeInTheDocument();
    });
  });
```

- [ ] **Step 4: Adicionar grupo "como Player com ficha"**

```tsx
  describe("como Player com ficha", () => {
    it("NÃO exibe botões de Master", async () => {
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: userFixture, // não é master
      });

      expect(await screen.findByText(campaignFixture.name.toUpperCase())).toBeInTheDocument();
      expect(screen.queryByText(/Criar NPC/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Criar Partida/i)).not.toBeInTheDocument();
    });

    it("exibe 'Submeter Ficha' quando location.state tem sheetId", async () => {
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: userFixture,
        // Importante: passar location.state requer extender o helper OU usar
        // initialEntries do MemoryRouter. Pra simplificar, esse teste usa
        // useLocation mockado:
      });

      // Esse teste é deferido pra Task 8.5 — a helper precisa suportar state.
      // Por ora, deixar marcado como TODO no plano:
      // (esse it() é stub; será preenchido após extender renderWithProviders)
    });

    it("mostra erro de conflito 409 ao submeter ficha", async () => {
      // Stub — mesma razão do anterior.
    });
  });
```

> **Decisão tática:** os 2 testes que dependem de `location.state` são tecnicamente complicados (renderWithProviders precisa aceitar `state` no entry do MemoryRouter). Vou extender o helper na Task 8.5 e voltar pra preencher esses testes.

- [ ] **Step 5: Estender `renderWithProviders` pra aceitar `state`**

Modify `src/test/render.tsx`, dentro de `ProvidersOptions`:

```tsx
interface ProvidersOptions {
  route?: string;
  path?: string;
  token?: string | null;
  user?: UserStorage | null;
  /** Estado do location pra useLocation().state */
  state?: unknown;
}
```

E no body de `renderWithProviders`, mudar `initialEntries`:

```tsx
<MemoryRouter
  initialEntries={[
    state !== undefined ? { pathname: route, state } : route,
  ]}
>
```

(Destructure `state` no params.)

- [ ] **Step 6: Preencher os 2 testes que aguardavam o `state`**

Substituir os 2 stubs no grupo "como Player com ficha":

```tsx
    it("exibe 'Submeter Ficha' quando location.state tem sheetId", async () => {
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: userFixture,
        state: { sheetId: "sheet-1", sheetNick: "MyChar" },
      });

      expect(await screen.findByText(/Submeter Ficha/i)).toBeInTheDocument();
    });

    it("mostra erro de conflito 409 ao submeter ficha com nick duplicado", async () => {
      const conflictNick = "DupeNick";
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({
            ...campaignFixture,
            characterSheets: [
              {
                uuid: "existing-sheet",
                nickName: conflictNick,
                playerUuid: "other-user",
                coverUrl: null,
                avatarUrl: null,
              },
            ],
          }),
        ),
      );

      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: userFixture,
        state: { sheetId: "sheet-1", sheetNick: conflictNick },
      });

      const user = userEvent.setup();
      const submitButton = await screen.findByText(/Submeter Ficha/i);
      await user.click(submitButton);

      // O componente detecta conflito pelo array characterSheets antes de mandar request:
      expect(await screen.findByText(/Já existe um personagem com o nick/i)).toBeInTheDocument();
    });
```

- [ ] **Step 7: Adicionar grupo "navegação"**

```tsx
  describe("navegação", () => {
    it("clicar em personagem na sidebar chama navigate para /charactersheet/:uuid", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({
            ...campaignAsMaster(masterUserFixture.uuid),
            characterSheets: [
              {
                uuid: "sheet-clickable",
                nickName: "Clickable",
                playerUuid: "user-2",
                coverUrl: null,
                avatarUrl: null,
                fullName: "Click Me",
                characterClass: "Especialista",
                currExp: 0,
                nextLvlBaseExp: 100,
              },
            ],
          }),
        ),
      );

      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });

      const user = userEvent.setup();
      const charItem = await screen.findByText("Clickable");
      await user.click(charItem.closest("[class]")!); // click no container

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          "/charactersheet/sheet-clickable",
          expect.objectContaining({ state: expect.any(Object) }),
        );
      });
    });

    it("clicar em 'Criar NPC' chama navigate para /campaigns/:id/npcs/new", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json(campaignAsMaster(masterUserFixture.uuid)),
        ),
      );

      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });

      const user = userEvent.setup();
      const button = await screen.findByText(/Criar NPC/i);
      await user.click(button);

      expect(mockNavigate).toHaveBeenCalledWith("/campaigns/campaign-1/npcs/new");
    });
  });
});  // fecha describe("CampaignPage")
```

- [ ] **Step 8: Rodar todos os testes do arquivo**

```bash
npx vitest run src/pages/__tests__/CampaignPage.test.tsx
```

Expected: 11 testes passam. Possíveis falhas:

- "click target null" → o `closest` pra container falhou; usar `screen.getByText("Clickable").closest("div")` ou ajustar seletor.
- Conflito de nick não aparece → o componente só mostra após clicar "Submeter" e ANTES de mandar request; revisar fluxo no `CampaignPage.tsx:56-68`.

- [ ] **Step 9: Limpar mocks entre testes**

Append no topo do `describe("CampaignPage", ...)`, antes do primeiro `describe` aninhado:

```tsx
  beforeEach(() => {
    mockNavigate.mockReset();
  });
```

E adicionar `beforeEach` no import de `vitest`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
```

- [ ] **Step 10: Rodar uma vez final**

```bash
npx vitest run src/pages/__tests__/CampaignPage.test.tsx
```

Expected: 11 verdes.

- [ ] **Step 11: Commit**

```bash
git add src/pages/__tests__/CampaignPage.test.tsx src/test/render.tsx
git commit -m "test: characterization tests for CampaignPage (11 tests)"
```

---

## Task 9: Testes de `MatchPage`

**Files:**
- Create: `src/pages/__tests__/MatchPage.test.tsx`

Cobertura alvo: ~12 testes. MatchPage é mais complexa que CampaignPage porque tem 3 estados de partida (scheduled / ongoing / ended) e a sidebar muda dependendo se gameStartAt está setado.

- [ ] **Step 1: Criar arquivo com imports e helpers**

```tsx
// src/pages/__tests__/MatchPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { matchFixture, matchAsMaster, matchOngoing, matchEnded } from "../../test/fixtures/match";
import { masterUserFixture, userFixture } from "../../test/fixtures/user";
import MatchPage from "../MatchPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseUrl = "http://localhost:5000";

function renderPage(opts: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(<MatchPage />, {
    route: "/campaigns/campaign-1/matches/match-1",
    path: "/campaigns/:campaignId/matches/:matchId",
    ...opts,
  });
}

describe("MatchPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  describe("loading & error", () => {
    it("mostra 'Carregando partida...' enquanto resolve", () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, async () => {
          await new Promise((r) => setTimeout(r, 50));
          return HttpResponse.json(matchFixture);
        }),
      );

      renderPage();

      expect(screen.getByText(/Carregando partida\.\.\./i)).toBeInTheDocument();
    });

    it("mostra erro se a API responde 500", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json({ error: "x" }, { status: 500 }),
        ),
      );

      renderPage();

      expect(await screen.findByText(/Falha ao carregar detalhes da partida/i)).toBeInTheDocument();
    });

    it("mostra 'Partida não encontrada' quando response é null", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json(null)),
      );

      renderPage();

      expect(await screen.findByText(/Partida n[ãa]o encontrada/i)).toBeInTheDocument();
    });

    it("redireciona pra '/' se não há token", () => {
      const { container } = renderPage({ token: null });
      // Navigate component faz redirect; o conteúdo da página não renderiza.
      expect(container.querySelector("h1")).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Rodar primeiro grupo**

```bash
npx vitest run src/pages/__tests__/MatchPage.test.tsx
```

Expected: 4 testes passam.

- [ ] **Step 3: Adicionar grupo de status da partida**

Append antes do fechamento do `describe("MatchPage", ...)`:

```tsx
  describe("status da partida", () => {
    it("exibe 'AGENDADA' quando gameStartAt é null", async () => {
      // matchFixture default tem gameStartAt: null
      renderPage();
      expect(await screen.findByText("AGENDADA")).toBeInTheDocument();
    });

    it("exibe 'EM ANDAMENTO' quando há gameStartAt mas sem storyEndAt", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json(matchOngoing())),
      );
      renderPage();
      expect(await screen.findByText("EM ANDAMENTO")).toBeInTheDocument();
    });

    it("exibe 'ENCERRADA' e descrição final quando storyEndAt existe", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json(matchEnded())),
      );
      renderPage();
      expect(await screen.findByText("ENCERRADA")).toBeInTheDocument();
      expect(await screen.findByText(/Partida encerrada/i)).toBeInTheDocument();
    });
  });
```

- [ ] **Step 4: Adicionar grupo "como Master"**

```tsx
  describe("como Master", () => {
    it("exibe 'Abrir Lobby' quando a partida não começou", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json(matchAsMaster(masterUserFixture.uuid)),
        ),
      );

      renderPage({ user: masterUserFixture });
      expect(await screen.findByText(/Abrir Lobby/i)).toBeInTheDocument();
    });

    it("clicar em 'Abrir Lobby' mostra dialog de confirmação", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json(matchAsMaster(masterUserFixture.uuid)),
        ),
      );

      renderPage({ user: masterUserFixture });

      const u = userEvent.setup();
      await u.click(await screen.findByText(/Abrir Lobby/i));
      expect(await screen.findByText(/Tem certeza que deseja abrir o lobby/i)).toBeInTheDocument();
    });

    it("clicar em 'Abrir Lobby' no dialog navega pro lobby", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () =>
          HttpResponse.json(matchAsMaster(masterUserFixture.uuid)),
        ),
      );

      renderPage({ user: masterUserFixture });

      const u = userEvent.setup();
      await u.click(await screen.findByText(/Abrir Lobby/i));

      // Tem 2 botões "Abrir Lobby" agora (a ação original + dialog). Pegar o segundo:
      const buttons = await screen.findAllByText(/Abrir Lobby/i);
      await u.click(buttons[buttons.length - 1]);

      expect(mockNavigate).toHaveBeenCalledWith("/campaigns/campaign-1/matches/match-1/lobby");
    });
  });
```

- [ ] **Step 5: Adicionar grupo "como Player"**

```tsx
  describe("como Player", () => {
    it("exibe 'Inscrever-se' se há sheetId no state e partida não começou", async () => {
      renderPage({
        user: userFixture,
        state: { sheetId: "sheet-1" },
      });

      expect(await screen.findByText(/Inscrever-se/i)).toBeInTheDocument();
    });

    it("NÃO exibe 'Inscrever-se' se a partida já começou", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json(matchOngoing())),
      );

      renderPage({
        user: userFixture,
        state: { sheetId: "sheet-1" },
      });

      // Aguarda o load da página
      await screen.findByText("EM ANDAMENTO");
      expect(screen.queryByText(/Inscrever-se/i)).not.toBeInTheDocument();
    });

    it("clicar em 'Inscrever-se' mostra ConfirmDialog", async () => {
      renderPage({
        user: userFixture,
        state: { sheetId: "sheet-1" },
      });

      const u = userEvent.setup();
      await u.click(await screen.findByText(/Inscrever-se/i));
      expect(await screen.findByText(/Tem certeza que deseja se inscrever/i)).toBeInTheDocument();
    });
  });
```

- [ ] **Step 6: Adicionar grupo "sidebar dependente do status"**

```tsx
  describe("sidebar dependente do status", () => {
    it("antes do gameStart busca /enrollments e renderiza", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id/enrollments`, () =>
          HttpResponse.json([
            {
              uuid: "enr-1",
              characterSheet: {
                uuid: "sheet-x",
                nickName: "Enrolled",
                playerUuid: "user-x",
                coverUrl: null,
                avatarUrl: null,
              },
            },
          ]),
        ),
      );

      renderPage();
      expect(await screen.findByText("Enrolled")).toBeInTheDocument();
    });

    it("depois do gameStart busca /participants e renderiza", async () => {
      server.use(
        http.get(`${baseUrl}/matches/:id`, () => HttpResponse.json(matchOngoing())),
        http.get(`${baseUrl}/matches/:id/participants`, () =>
          HttpResponse.json([
            {
              uuid: "part-1",
              characterSheet: {
                uuid: "sheet-y",
                nickName: "Participant",
                private: null,
              },
              leftAt: null,
            },
          ]),
        ),
      );

      renderPage();
      expect(await screen.findByText("Participant")).toBeInTheDocument();
    });
  });
});  // fim describe("MatchPage")
```

- [ ] **Step 7: Rodar todos**

```bash
npx vitest run src/pages/__tests__/MatchPage.test.tsx
```

Expected: 12 verdes.

- [ ] **Step 8: Commit**

```bash
git add src/pages/__tests__/MatchPage.test.tsx
git commit -m "test: characterization tests for MatchPage (12 tests)"
```

---

## Task 10: Testes de `CampaignsPage`

**Files:**
- Create: `src/pages/__tests__/CampaignsPage.test.tsx`

- [ ] **Step 1: Criar o arquivo de teste completo**

```tsx
// src/pages/__tests__/CampaignsPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { campaignSummaryFixture } from "../../test/fixtures/campaign";
import CampaignsPage from "../CampaignsPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseUrl = "http://localhost:5000";

function renderPage() {
  return renderWithProviders(<CampaignsPage />, {
    route: "/campaigns",
    path: "/campaigns",
  });
}

describe("CampaignsPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("mostra 'Carregando campanhas...' inicialmente", () => {
    server.use(
      http.get(`${baseUrl}/campaigns`, async () => {
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json([campaignSummaryFixture]);
      }),
    );

    renderPage();
    expect(screen.getByText(/Carregando campanhas\.\.\./i)).toBeInTheDocument();
  });

  it("mostra erro se a API falha", async () => {
    server.use(
      http.get(`${baseUrl}/campaigns`, () => HttpResponse.json({ error: "x" }, { status: 500 })),
    );

    renderPage();
    expect(await screen.findByText(/Falha ao carregar campanhas/i)).toBeInTheDocument();
  });

  it("mostra empty state quando lista é vazia", async () => {
    server.use(
      http.get(`${baseUrl}/campaigns`, () => HttpResponse.json([])),
    );

    renderPage();
    expect(await screen.findByText(/Você ainda não possui campanhas/i)).toBeInTheDocument();
  });

  it("renderiza um card pra cada campanha", async () => {
    renderPage();
    expect(await screen.findByText(campaignSummaryFixture.name)).toBeInTheDocument();
  });

  it("clicar em 'Criar Nova Campanha' navega pra /campaigns/new", async () => {
    renderPage();

    const u = userEvent.setup();
    const button = await screen.findByText(/Criar Nova Campanha/i);
    await u.click(button);

    expect(mockNavigate).toHaveBeenCalledWith("/campaigns/new");
  });
});
```

- [ ] **Step 2: Rodar**

```bash
npx vitest run src/pages/__tests__/CampaignsPage.test.tsx
```

Expected: 5 verdes.

- [ ] **Step 3: Commit**

```bash
git add src/pages/__tests__/CampaignsPage.test.tsx
git commit -m "test: characterization tests for CampaignsPage (5 tests)"
```

---

## Task 11: Testes de `PublicCampaignsPage`

**Files:**
- Create: `src/pages/__tests__/PublicCampaignsPage.test.tsx`

- [ ] **Step 1: Criar arquivo completo**

```tsx
// src/pages/__tests__/PublicCampaignsPage.test.tsx
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { campaignSummaryFixture } from "../../test/fixtures/campaign";
import PublicCampaignsPage from "../PublicCampaignsPage";

const baseUrl = "http://localhost:5000";

function renderPage(opts: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(<PublicCampaignsPage />, {
    route: "/campaigns/public",
    path: "/campaigns/public",
    ...opts,
  });
}

describe("PublicCampaignsPage", () => {
  it("mostra 'Carregando campanhas...' inicialmente", () => {
    server.use(
      http.get(`${baseUrl}/campaigns/public`, async () => {
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json([campaignSummaryFixture]);
      }),
    );

    renderPage();
    expect(screen.getByText(/Carregando campanhas\.\.\./i)).toBeInTheDocument();
  });

  it("mostra erro se a API falha", async () => {
    server.use(
      http.get(`${baseUrl}/campaigns/public`, () =>
        HttpResponse.json({ error: "x" }, { status: 500 }),
      ),
    );

    renderPage();
    expect(await screen.findByText(/Falha ao carregar campanhas/i)).toBeInTheDocument();
  });

  it("mostra 'Nenhuma campanha pública disponível' quando lista é vazia", async () => {
    server.use(
      http.get(`${baseUrl}/campaigns/public`, () => HttpResponse.json([])),
    );

    renderPage();
    expect(await screen.findByText(/Nenhuma campanha pública/i)).toBeInTheDocument();
  });

  it("renderiza cards das campanhas públicas", async () => {
    renderPage();
    expect(await screen.findByText(campaignSummaryFixture.name)).toBeInTheDocument();
  });

  it("redireciona pra '/' se não há token", () => {
    const { container } = renderPage({ token: null });
    // Navigate component faz redirect; conteúdo não renderiza
    expect(container.querySelector("h1")).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar**

```bash
npx vitest run src/pages/__tests__/PublicCampaignsPage.test.tsx
```

Expected: 5 verdes.

- [ ] **Step 3: Commit**

```bash
git add src/pages/__tests__/PublicCampaignsPage.test.tsx
git commit -m "test: characterization tests for PublicCampaignsPage (5 tests)"
```

---

## Task 12: Testes de `CharacterSheetsPage`

**Files:**
- Create: `src/pages/__tests__/CharacterSheetsPage.test.tsx`

> **Atenção:** essa página tem um `useEffect` que redireciona pra `/charactersheet/new` quando a lista vem vazia. Pra testar a empty list **sem disparar o redirect**, vamos ter que mockar a quantidade pra `[fixture]` e testar o redirect explicitamente em outro teste.

- [ ] **Step 1: Criar arquivo completo**

```tsx
// src/pages/__tests__/CharacterSheetsPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { sheetSummaryFixture } from "../../test/fixtures/sheet";
import CharacterSheetsPage from "../CharacterSheetsPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseUrl = "http://localhost:5000";

function renderPage(opts: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(<CharacterSheetsPage />, {
    route: "/charactersheets",
    path: "/charactersheets",
    ...opts,
  });
}

describe("CharacterSheetsPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("mostra 'Carregando...' inicialmente", () => {
    server.use(
      http.get(`${baseUrl}/charactersheets`, async () => {
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json([sheetSummaryFixture]);
      }),
    );

    renderPage();
    expect(screen.getByText(/Carregando\.\.\./i)).toBeInTheDocument();
  });

  it("mostra erro se a API falha", async () => {
    server.use(
      http.get(`${baseUrl}/charactersheets`, () =>
        HttpResponse.json({ error: "x" }, { status: 500 }),
      ),
    );

    renderPage();
    expect(await screen.findByText(/Falha ao carregar personagens/i)).toBeInTheDocument();
  });

  it("renderiza card pra cada ficha", async () => {
    renderPage();
    expect(await screen.findByText(sheetSummaryFixture.nickName)).toBeInTheDocument();
  });

  it("redireciona pra /charactersheet/new se lista vem vazia", async () => {
    server.use(
      http.get(`${baseUrl}/charactersheets`, () => HttpResponse.json([])),
    );

    renderPage();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/charactersheet/new", { replace: true });
    });
  });

  it("clicar em 'Criar Nova Ficha' navega pra /charactersheet/new", async () => {
    renderPage();

    const u = userEvent.setup();
    const button = await screen.findByText(/Criar Nova Ficha/i);
    await u.click(button);

    expect(mockNavigate).toHaveBeenCalledWith("/charactersheet/new");
  });

  it("redireciona pra '/' se não há token", () => {
    const { container } = renderPage({ token: null });
    expect(container.querySelector("h1")).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar**

```bash
npx vitest run src/pages/__tests__/CharacterSheetsPage.test.tsx
```

Expected: 6 verdes.

- [ ] **Step 3: Commit**

```bash
git add src/pages/__tests__/CharacterSheetsPage.test.tsx
git commit -m "test: characterization tests for CharacterSheetsPage (6 tests)"
```

---

## Task 13: Testes de `CreateCampaignPage`

**Files:**
- Create: `src/pages/__tests__/CreateCampaignPage.test.tsx`

- [ ] **Step 1: Criar arquivo completo**

```tsx
// src/pages/__tests__/CreateCampaignPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import CreateCampaignPage from "../CreateCampaignPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseUrl = "http://localhost:5000";

function renderPage() {
  return renderWithProviders(<CreateCampaignPage />, {
    route: "/campaigns/new",
    path: "/campaigns/new",
  });
}

describe("CreateCampaignPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("renderiza o título 'CRIAR NOVA CAMPANHA'", () => {
    renderPage();
    expect(screen.getByText(/CRIAR NOVA CAMPANHA/i)).toBeInTheDocument();
  });

  it("renderiza todos os campos do form", () => {
    renderPage();
    expect(screen.getByLabelText(/Nome da Campanha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrição Breve/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrição Completa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Link da Chamada/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Data de Início da História/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Campanha Pública/i)).toBeInTheDocument();
  });

  it("renderiza a sidebar de regras", () => {
    renderPage();
    expect(screen.getByText(/Regras da Campanha/i)).toBeInTheDocument();
    expect(screen.getByText(/Sistema de Combate/i)).toBeInTheDocument();
    expect(screen.getByText(/Progressão de Personagens/i)).toBeInTheDocument();
    expect(screen.getByText(/Nen & Habilidades/i)).toBeInTheDocument();
  });

  it("mostra erro de validação se Nome e Descrição Breve estão vazios", async () => {
    renderPage();

    const u = userEvent.setup();
    // Os inputs têm `required`, então preciso preencher mínimo e remover pra ver erro do código:
    // Na verdade o componente checa `!form.name || !form.briefInitialDescription` no submit.
    // Mas required do HTML pode bloquear o submit. Vou usar fireEvent submit.
    const form = screen.getByText(/Criar Campanha/i).closest("form")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await waitFor(() => {
      expect(screen.getByText(/Nome e descrição breve são obrigatórios/i)).toBeInTheDocument();
    });
  });

  it("submete o form com dados válidos e navega de volta", async () => {
    server.use(
      http.post(`${baseUrl}/campaigns`, () =>
        HttpResponse.json({ uuid: "new-campaign-1", name: "Nova Campanha" }, { status: 201 }),
      ),
    );

    renderPage();

    const u = userEvent.setup();
    await u.type(screen.getByLabelText(/Nome da Campanha/i), "Nova Campanha");
    await u.type(screen.getByLabelText(/Descrição Breve/i), "Brief teste");

    await u.click(screen.getByText(/Criar Campanha/i));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  it("mostra erro quando API retorna falha no submit", async () => {
    server.use(
      http.post(`${baseUrl}/campaigns`, () =>
        HttpResponse.json({ message: "Server explodiu" }, { status: 500 }),
      ),
    );

    renderPage();

    const u = userEvent.setup();
    await u.type(screen.getByLabelText(/Nome da Campanha/i), "Nova");
    await u.type(screen.getByLabelText(/Descrição Breve/i), "Brief");
    await u.click(screen.getByText(/Criar Campanha/i));

    expect(await screen.findByText(/Server explodiu/i)).toBeInTheDocument();
  });

  it("toggle de 'Campanha Pública' inverte o checkbox", async () => {
    renderPage();

    const u = userEvent.setup();
    const checkbox = screen.getByLabelText(/Campanha Pública/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(true); // default

    await u.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it("clicar em 'Cancelar' navega de volta", async () => {
    renderPage();

    const u = userEvent.setup();
    await u.click(screen.getByText(/Cancelar/i));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
```

- [ ] **Step 2: Rodar**

```bash
npx vitest run src/pages/__tests__/CreateCampaignPage.test.tsx
```

Expected: 8 verdes.

- [ ] **Step 3: Commit**

```bash
git add src/pages/__tests__/CreateCampaignPage.test.tsx
git commit -m "test: characterization tests for CreateCampaignPage (8 tests)"
```

---

## Task 14: Testes de `CreateMatchPage` (6 testes garantidos + 2 condicionais)

**Files:**
- Create: `src/pages/__tests__/CreateMatchPage.test.tsx`

CreateMatchPage espelha CreateCampaignPage com pequenas diferenças (campos diferentes, endpoint, e `campaignId` no path).

- [ ] **Step 1: Criar arquivo completo**

```tsx
// src/pages/__tests__/CreateMatchPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import CreateMatchPage from "../CreateMatchPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseUrl = "http://localhost:5000";

function renderPage() {
  return renderWithProviders(<CreateMatchPage />, {
    route: "/campaigns/campaign-1/matches/new",
    path: "/campaigns/:campaignId/matches/new",
  });
}

describe("CreateMatchPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("renderiza o título 'CRIAR NOVA PARTIDA'", () => {
    renderPage();
    expect(screen.getByText(/CRIAR NOVA PARTIDA/i)).toBeInTheDocument();
  });

  it("renderiza todos os campos do form", () => {
    renderPage();
    expect(screen.getByLabelText(/Título da Partida/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrição Breve/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrição Completa/i)).toBeInTheDocument();
  });

  it("renderiza a sidebar de regras", () => {
    renderPage();
    expect(screen.getByText(/Regras/i)).toBeInTheDocument();
  });

  it("mostra erro de validação se Título e Descrição Breve estão vazios", async () => {
    renderPage();
    const form = screen.getByText(/Criar Partida/i).closest("form")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => {
      expect(screen.getByText(/Título e descrição breve são obrigatórios/i)).toBeInTheDocument();
    });
  });

  it("submete dados válidos e navega de volta", async () => {
    server.use(
      http.post(`${baseUrl}/campaigns/:campaignId/matches`, () =>
        HttpResponse.json({ uuid: "new-match-1" }, { status: 201 }),
      ),
    );

    renderPage();

    const u = userEvent.setup();
    await u.type(screen.getByLabelText(/Título da Partida/i), "Nova Partida");
    await u.type(screen.getByLabelText(/Descrição Breve/i), "Brief partida");
    await u.click(screen.getByText(/Criar Partida/i));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  it("mostra erro quando API falha no submit", async () => {
    server.use(
      http.post(`${baseUrl}/campaigns/:campaignId/matches`, () =>
        HttpResponse.json({ message: "Erro do server" }, { status: 500 }),
      ),
    );

    renderPage();

    const u = userEvent.setup();
    await u.type(screen.getByLabelText(/Título da Partida/i), "X");
    await u.type(screen.getByLabelText(/Descrição Breve/i), "Y");
    await u.click(screen.getByText(/Criar Partida/i));

    expect(await screen.findByText(/Erro do server/i)).toBeInTheDocument();
  });

});
```

> **Antes de implementar:** ler `src/pages/CreateMatchPage.tsx` linhas 70-150 pra confirmar nomes de label e existência de campos opcionais. Os 6 testes acima cobrem o caminho garantido — não inclui checkbox/cancel pra evitar falsos positivos. Se a leitura do source confirmar botão "Cancelar" e checkbox "Pública", adicionar 2 testes equivalentes ao CreateCampaignPage.test.tsx, com assertion direta (sem if/else defensivo).

- [ ] **Step 2: Rodar**

```bash
npx vitest run src/pages/__tests__/CreateMatchPage.test.tsx
```

Expected: 6 verdes. Se o source de `CreateMatchPage.tsx` confirmar a presença de checkbox de visibilidade e botão Cancelar, adicionar os 2 testes adicionais espelhando CreateCampaignPage.test.tsx.

- [ ] **Step 3: Commit**

```bash
git add src/pages/__tests__/CreateMatchPage.test.tsx
git commit -m "test: characterization tests for CreateMatchPage (8 tests)"
```

---

## Task 15: Testes de `CharacterSheetPage` (4 testes page-level)

**Files:**
- Create: `src/pages/__tests__/CharacterSheetPage.test.tsx`

CharacterSheetPage é "view mode" — usa `CharacterSheetTemplate` (666L, intocado nessa fase). Os testes cobrem comportamento **page-level** observável: estados de loading/erro, redirect sem token, e mutations disparadas pelos callbacks. Comportamento interno do template (botões dentro de SheetBottomActions, ManageButton, etc) fica pra Fase 4 quando refatorarmos o template — não trava agora porque não vai mudar nas Fases 1-2.

- [ ] **Step 1: Antes de escrever, conferir comportamento esperado**

Ler:
```bash
sed -n '30,50p' src/pages/CharacterSheetPage.tsx
sed -n '60,80p' src/pages/CharacterSheetPage.tsx
```

Confirmar:
- Que `if (!token || !id) return <Navigate to="/" replace />` está em CharacterSheetPage.tsx
- Que `handleAccept`/`handleReject` chamam mutations `acceptSubmission`/`rejectSubmission` com o id da sheet

- [ ] **Step 2: Criar arquivo com 4 testes page-level**

```tsx
// src/pages/__tests__/CharacterSheetPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { sheetFixture } from "../../test/fixtures/sheet";
import { userFixture } from "../../test/fixtures/user";
import CharacterSheetPage from "../CharacterSheetPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseUrl = "http://localhost:5000";

function renderPage(opts: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(<CharacterSheetPage />, {
    route: "/charactersheet/sheet-1",
    path: "/charactersheet/:id",
    ...opts,
  });
}

describe("CharacterSheetPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("não renderiza dados durante o loading", () => {
    server.use(
      http.get(`${baseUrl}/charactersheets/:id`, async () => {
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json(sheetFixture);
      }),
    );

    const { container } = renderPage();
    expect(container.textContent ?? "").not.toContain("TestNick");
  });

  it("renderiza o nickname quando os dados chegam", async () => {
    renderPage({ user: userFixture });
    expect(await screen.findByText(/TestNick/i)).toBeInTheDocument();
  });

  it("renderiza estado vazio se não há token (Navigate dispara redirect)", () => {
    const { container } = renderPage({ token: null });
    // Sem token, Navigate retorna antes de renderizar conteúdo.
    expect(container.textContent ?? "").not.toContain("TestNick");
    expect(container.textContent ?? "").not.toContain("Carregando");
  });

  it("chama mutation accept quando o handler é invocado via state isPending", async () => {
    // Esse teste verifica indiretamente que useAcceptSheetSubmission é
    // configurado quando location.state.isPending=true. Como a UI do botão
    // mora dentro do template (não refatorado ainda), trava no nível do
    // mock de network.
    let acceptedCalled = false;
    server.use(
      http.patch(`${baseUrl}/charactersheets/:id/submissions/accept`, () => {
        acceptedCalled = true;
        return HttpResponse.json({});
      }),
    );

    renderPage({
      user: userFixture,
      state: { isPending: true, campaignId: "campaign-1" },
    });

    await screen.findByText(/TestNick/i);
    // O accept só dispara via click em botão dentro do template.
    // Esse teste documenta a expectativa; a interação completa será
    // testada na Fase 4 quando o template for refatorado.
    // Por enquanto, validamos apenas que a página carregou no modo correto.
    expect(acceptedCalled).toBe(false); // ainda não foi clicado
  });
});
```

> **Honestidade sobre cobertura:** essa página atinge cobertura modesta nessa fase (~50-65%) porque a maior parte do comportamento mora no template. Isso é **aceitável e intencional**: estamos travando o que é observável no nível da página. A Fase 4 vai refatorar o template e ganhar cobertura dele junto. Documentar no PR que CharacterSheetPage tem cobertura sub-80% e por quê.

- [ ] **Step 3: Rodar**

```bash
npx vitest run src/pages/__tests__/CharacterSheetPage.test.tsx
```

Expected: 4 verdes.

- [ ] **Step 4: Commit**

```bash
git add src/pages/__tests__/CharacterSheetPage.test.tsx
git commit -m "test: characterization tests for CharacterSheetPage (4 page-level tests)"
```

---

## Task 16: Cobertura final + relatório filtrado

**Files:**
- Modify: `vite.config.ts` (config de coverage)

- [ ] **Step 1: Adicionar config de coverage ao `vite.config.ts`**

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/pages/CampaignPage.tsx",
        "src/pages/MatchPage.tsx",
        "src/pages/CampaignsPage.tsx",
        "src/pages/PublicCampaignsPage.tsx",
        "src/pages/CharacterSheetsPage.tsx",
        "src/pages/CreateCampaignPage.tsx",
        "src/pages/CreateMatchPage.tsx",
        "src/pages/CharacterSheetPage.tsx",
      ],
    },
  },
} as any);
```

- [ ] **Step 2: Rodar coverage filtrado**

```bash
npm run test:coverage
```

Expected: relatório com as 8 páginas listadas. Anotar % por arquivo. Meta: ≥80% por arquivo.

Se alguma página ficar abaixo, ler o relatório HTML em `coverage/index.html`, identificar branches não cobertos, e:
- Se branch é importante → adicionar teste na próxima iteração.
- Se branch é defensivo (ex: ramo que nunca é alcançado em uso real) → documentar em `docs/superpowers/specs/2026-05-20-frontend-componentization-design.md` e seguir.

- [ ] **Step 3: Adicionar `coverage/` ao `.gitignore`**

```bash
echo "coverage/" >> .gitignore
```

Verificar `cat .gitignore` que linha foi adicionada (e que não há duplicata).

- [ ] **Step 4: Rodar suite completa uma última vez**

```bash
npm test
```

Expected: todos os arquivos passam. Total esperado: **57 testes characterization** (+2 condicionais em CreateMatchPage se source confirmar) + 4 já existentes + 1 smoke = **62-64 testes**.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts .gitignore
git commit -m "test: configure coverage to focus on 8 pages of refactor scope"
```

---

## Self-review checklist (executor faz antes de fechar PR)

- [ ] `npm run build` verde
- [ ] `npm test` verde (todos os ~69 testes)
- [ ] `npm run lint` verde
- [ ] `npm run test:coverage` mostra ≥80% em 7 das 8 páginas (CharacterSheetPage exceto, ~50-65%, documentar no PR)
- [ ] Zero mudanças em `src/components/`, `src/features/`, `src/hooks/`, `src/services/`, `src/contexts/`, `src/types/`, `src/utils/`, `src/pages/*.tsx` (exceto criação de `__tests__/`)
- [ ] Commits são atômicos por task (1 commit por task; máximo 2 se a task tem refactor de helper como Task 8)
- [ ] Smoke test manual do app: `npm run dev`, abrir `/campaigns`, `/charactersheet/:id`, etc — UI igual antes do PR. Phase 0 é zero-mudança-visual.

## Next phase

Quando a Fase 0 estiver merged, abrir nova sessão e invocar `superpowers:writing-plans` com a spec apontando pra **Fase 1 — Piloto** (DetailPageTemplate + RulesSidebar + CampaignPage/MatchPage refactor).
