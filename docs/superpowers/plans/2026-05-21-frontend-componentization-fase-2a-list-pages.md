# Frontend Componentization — Fase 2a: ListPageTemplate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar a duplicação estrutural entre as 3 páginas de lista (`CampaignsPage`, `PublicCampaignsPage`, `CharacterSheetsPage`) extraindo um `ListPageTemplate` + `EmptyState` (molecule) + `CreateButton` (atom).

**Architecture:** Slot-based. `ListPageTemplate` é o shell (container com background, header, gate de loading/erro, body centralizado) e recebe `children`. As páginas viram thin orchestrators: buscam dados e compõem `PageTitle` + cards + `EmptyState`/`CreateButton`.

**Tech Stack:** React 19, TypeScript estrito (`verbatimModuleSyntax`, `noUnusedLocals`), styled-components, Vitest + MSW.

**Spec de referência:** `docs/superpowers/specs/2026-05-20-frontend-componentization-design.md` (§4.5).

---

## Contexto crítico para quem executa

- **Refatoração, não feature nova.** O comportamento das 3 páginas está travado por characterization tests da Fase 0: `CampaignsPage.test.tsx` (5 testes), `PublicCampaignsPage.test.tsx` (5), `CharacterSheetsPage.test.tsx` (7). **Os 17 testes devem continuar passando, sem edição.** Nenhum teste novo é adicionado nesta fase.
- **Duas mudanças visuais intencionais, decididas com o usuário / aceitas:**
  1. **Espaçamento da lista de personagens normalizado.** Hoje `CharacterSheetsPage` usa espaçamento relativo ao viewport (`gap: 8vw` / `5vw`, `padding: 8vw 0` / `45px 0`). Passa a usar o mesmo das listas de campanha: `gap: 30px; padding: 30px`. O usuário aprovou explicitamente essa normalização.
  2. **Loading state do `CampaignsPage`.** Hoje `CampaignsPage` tem cópias locais de `LoadingContainer`/`ErrorContainer` (com `height: 50vh`). Passa a usar as compartilhadas de `components/atoms/PageStates` (`min-height: 100dvh`) — que `PublicCampaignsPage` e `CharacterSheetsPage` já usam. É a remoção de uma duplicação divergente; o loading é UI transitória.
- Fora isso, **pixel-perfect**: header, título, cards, botão de criar renderizam idênticos.
- **Zona pixel-tuned — NÃO TOCAR:** `CharacterSheetHeader.tsx` e os Diagrams do sheet. Nenhuma task aqui os toca.
- Um commit atômico por task. Rode comandos sem bypassar o `rtk` (use `npm`/`git` simples).
- Baseline atual: `npm test` → 89 testes passando. `npm run build` → verde.

---

## File Structure

**Arquivos criados:**

- `src/components/molecules/EmptyState.tsx` — molecule: estado vazio centralizado (mensagem).
- `src/components/atoms/CreateButton.tsx` — atom: botão CTA "Criar Nova X" com `variant` (`green` | `orange`).
- `src/components/templates/ListPageTemplate.tsx` — template: shell de página de lista.

**Arquivos modificados:**

- `src/pages/CampaignsPage.tsx` — vira thin orchestrator.
- `src/pages/PublicCampaignsPage.tsx` — idem.
- `src/pages/CharacterSheetsPage.tsx` — idem.

**Não modificados:** os 3 arquivos de teste em `src/pages/__tests__/` — devem passar sem edição.

---

## Task 1: Criar `EmptyState` (molecule) e `CreateButton` (atom)

**Files:**
- Create: `src/components/molecules/EmptyState.tsx`
- Create: `src/components/atoms/CreateButton.tsx`

Dois componentes presentacionais pequenos que as páginas de lista vão consumir. `EmptyState` deriva do bloco `EmptyState`/`EmptyMessage` hoje duplicado em `CampaignsPage` e `PublicCampaignsPage`. `CreateButton` deriva do `CreateButton` hoje duplicado (com variação verde/laranja) em `CampaignsPage` e `CharacterSheetsPage`.

- [ ] **Step 1: Criar `src/components/molecules/EmptyState.tsx`**

```tsx
import { type ReactNode } from "react";
import styled from "styled-components";

interface EmptyStateProps {
  children: ReactNode;
}

export default function EmptyState({ children }: EmptyStateProps) {
  return (
    <Container>
      <Message>{children}</Message>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
`;

const Message = styled.p`
  font-family: "Roboto", sans-serif;
  font-weight: 600;
  color: white;
  font-size: 28px;
  margin-bottom: 20px;
`;
```

- [ ] **Step 2: Criar `src/components/atoms/CreateButton.tsx`**

```tsx
import styled from "styled-components";
import PlusIcon from "../ions/PlusIcon";

interface CreateButtonProps {
  variant: "green" | "orange";
  label: string;
  onClick: () => void;
}

export default function CreateButton({ variant, label, onClick }: CreateButtonProps) {
  return (
    <StyledButton type="button" $variant={variant} onClick={onClick}>
      <PlusIcon />
      <span>{label}</span>
    </StyledButton>
  );
}

const StyledButton = styled.button<{ $variant: "green" | "orange" }>`
  font-family: "Roboto", sans-serif;
  font-size: 26px;
  font-weight: 600;
  ${({ $variant }) =>
    $variant === "green"
      ? "background-color: #107135; color: white;"
      : "background: linear-gradient(to bottom, #ffa216 0%, #ffa216 20%, #e60000 100%); color: black;"}
  height: 100px;
  width: 80vw;
  max-width: 940px;
  border-radius: 12px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;

  &:hover {
    transform: translateY(-5px);
    filter: brightness(1.1);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.4);
    border: 4px solid ${({ $variant }) => ($variant === "green" ? "white" : "black")};
  }
  &:active {
    transform: scale(0.98);
  }

  @media (max-width: 500px) {
    font-size: 22px;
    width: 100%;
    border-radius: 0px;

    &:hover {
      border-width: 4px 0px 4px 0px;
    }
    &:active {
      transform: scale(1);
    }
  }
`;
```

> Nota: o `CreateButton` atual nas páginas não tem `type` explícito (default `submit`). Como ele nunca está dentro de um `<form>` nas páginas de lista, isso é inofensivo hoje; adicionar `type="button"` é correto e não muda comportamento observável.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: verde. Nada consome os componentes ainda.

- [ ] **Step 4: Rodar a suite**

Run: `npm test`
Expected: 89 testes passando (inalterado).

- [ ] **Step 5: Commit**

```bash
git add src/components/molecules/EmptyState.tsx src/components/atoms/CreateButton.tsx
git commit -m "feat(components): add EmptyState molecule and CreateButton atom"
```

---

## Task 2: Criar `ListPageTemplate` (template)

**Files:**
- Create: `src/components/templates/ListPageTemplate.tsx`

Shell de página de lista: container com imagem de fundo + `PageHeader` + gate de loading/erro + body centralizado em coluna. Os estilos derivam dos styled-components hoje duplicados nas 3 páginas de lista. O loading/erro usa os componentes compartilhados de `components/atoms/PageStates` e são renderizados "crus" (sem header/fundo) — preservando o comportamento atual em que `if (isPending) return <LoadingContainer>...`.

- [ ] **Step 1: Criar `src/components/templates/ListPageTemplate.tsx`**

```tsx
import { type ReactNode } from "react";
import styled from "styled-components";
import PageHeader from "../atoms/PageHeader";
import { LoadingContainer, ErrorContainer } from "../atoms/PageStates";

interface ListPageTemplateProps {
  bgImage: string;
  headerColor?: string;
  bgAttachment?: "fixed" | "scroll";
  isPending?: boolean;
  isError?: boolean;
  loadingLabel?: string;
  errorLabel?: string;
  children: ReactNode;
}

export default function ListPageTemplate({
  bgImage,
  headerColor = "#08491f",
  bgAttachment = "fixed",
  isPending,
  isError,
  loadingLabel = "Carregando...",
  errorLabel = "Falha ao carregar. Tente novamente mais tarde.",
  children,
}: ListPageTemplateProps) {
  if (isPending) {
    return <LoadingContainer>{loadingLabel}</LoadingContainer>;
  }
  if (isError) {
    return <ErrorContainer>{errorLabel}</ErrorContainer>;
  }
  return (
    <PageContainer $bgImage={bgImage} $bgAttachment={bgAttachment}>
      <PageHeader backgroundColor={headerColor} />
      <PageBody>{children}</PageBody>
    </PageContainer>
  );
}

const PageContainer = styled.div<{ $bgImage: string; $bgAttachment: string }>`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background-image: url(${({ $bgImage }) => $bgImage});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: ${({ $bgAttachment }) => $bgAttachment};
`;

const PageBody = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  padding: 30px;
  width: 100vw;

  @media (max-width: 500px) {
    padding: 30px 0;
  }
`;
```

> Decisão de espaçamento: o `PageBody` usa `gap: 30px; padding: 30px` para as 3 páginas. `CharacterSheetsPage` hoje usa `8vw`/`5vw` — passa a usar `30px` (normalização aprovada pelo usuário). `bgAttachment` tem default `"fixed"` (campanhas); `CharacterSheetsPage` passará `"scroll"` (valor inicial do CSS, equivalente a não ter a propriedade).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: verde. Erro comum: confirmar que `PageHeader` é `export default` em `components/atoms/PageHeader.tsx` (é) e que `LoadingContainer`/`ErrorContainer` são named exports em `components/atoms/PageStates.tsx` (são).

- [ ] **Step 3: Rodar a suite**

Run: `npm test`
Expected: 89 testes passando.

- [ ] **Step 4: Commit**

```bash
git add src/components/templates/ListPageTemplate.tsx
git commit -m "feat(components): add ListPageTemplate"
```

---

## Task 3: Refatorar `CampaignsPage`

**Files:**
- Modify: `src/pages/CampaignsPage.tsx` (reescrita completa — vira thin orchestrator)

A página perde TODOS os seus styled-components e os early-returns de loading/erro (delegados ao template). Substituir o conteúdo INTEIRO de `src/pages/CampaignsPage.tsx` por:

```tsx
import { useCampaigns } from "../hooks/useCampaigns";
import { useNavigate } from "react-router-dom";
import type { CampaignSummary } from "../types/campaigns";
import worldMap from "../assets/images/worldmap.png";
import CampaignCard from "../components/atoms/CampaignCard";
import useToken from "../hooks/useToken";
import PageTitle from "../components/ions/PageTitle";
import ListPageTemplate from "../components/templates/ListPageTemplate";
import EmptyState from "../components/molecules/EmptyState";
import CreateButton from "../components/atoms/CreateButton";

function CampaignsPage() {
  const { token } = useToken();
  const navigate = useNavigate();
  const { data: campaigns = [], isPending, isError } = useCampaigns(token);

  return (
    <ListPageTemplate
      bgImage={worldMap}
      isPending={isPending}
      isError={isError}
      loadingLabel="Carregando campanhas..."
      errorLabel="Falha ao carregar campanhas. Tente novamente mais tarde."
    >
      <PageTitle>LISTA DE CAMPANHAS</PageTitle>

      {campaigns.length === 0 ? (
        <EmptyState>Você ainda não possui campanhas.</EmptyState>
      ) : (
        campaigns.map((campaign: CampaignSummary) => (
          <CampaignCard
            key={campaign.uuid}
            campaign={campaign}
            to={`/campaigns/${campaign.uuid}`}
          />
        ))
      )}

      <CreateButton
        variant="green"
        label="Criar Nova Campanha"
        onClick={() => navigate("/campaigns/new")}
      />
    </ListPageTemplate>
  );
}

export default CampaignsPage;
```

> `headerColor` não é passado porque `"#08491f"` é o default do template. O `styled` import some — não há mais styled-components na página.

- [ ] **Step 1: Substituir o arquivo inteiro pelo conteúdo acima.**

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: verde. `noUnusedLocals` pega qualquer import sobrando.

- [ ] **Step 3: Rodar os testes do CampaignsPage**

Run: `npx vitest run src/pages/__tests__/CampaignsPage.test.tsx`
Expected: 5 testes passando, sem edição no arquivo de teste. Se algum falhar, comparar o render com o comportamento original e corrigir `CampaignsPage.tsx`.

- [ ] **Step 4: Rodar a suite completa**

Run: `npm test`
Expected: 89 testes passando.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CampaignsPage.tsx
git commit -m "refactor(pages): rebuild CampaignsPage on ListPageTemplate"
```

---

## Task 4: Refatorar `PublicCampaignsPage`

**Files:**
- Modify: `src/pages/PublicCampaignsPage.tsx` (reescrita completa)

`PublicCampaignsPage` mantém o guard de token (`if (!token) return <Navigate to="/" replace />`) ANTES de renderizar o template — o teste "redireciona pra '/' se não há token" depende disso (verifica que nenhum `<h1>` renderiza). A página usa `usePublicCampaigns`, que retorna `isLoading`/`error` (não `isPending`/`isError`). Substituir o conteúdo INTEIRO de `src/pages/PublicCampaignsPage.tsx` por:

```tsx
import { Navigate, useLocation } from "react-router-dom";
import useToken from "../hooks/useToken";
import { usePublicCampaigns } from "../hooks/usePublicCampaigns";
import CampaignCard from "../components/atoms/CampaignCard";
import PageTitle from "../components/ions/PageTitle";
import ListPageTemplate from "../components/templates/ListPageTemplate";
import EmptyState from "../components/molecules/EmptyState";
import worldMap from "../assets/images/worldmap.png";

function PublicCampaignsPage() {
  const { token } = useToken();
  const location = useLocation();
  const sheetId = (location.state as { sheetId?: string; sheetNick?: string } | null)?.sheetId;
  const sheetNick = (location.state as { sheetId?: string; sheetNick?: string } | null)?.sheetNick;

  const { data: campaigns, isLoading, error } = usePublicCampaigns(token);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return (
    <ListPageTemplate
      bgImage={worldMap}
      isPending={isLoading}
      isError={!!error}
      loadingLabel="Carregando campanhas..."
      errorLabel="Falha ao carregar campanhas. Tente novamente mais tarde."
    >
      <PageTitle>CAMPANHAS PÚBLICAS</PageTitle>

      {(campaigns ?? []).length === 0 ? (
        <EmptyState>Nenhuma campanha pública disponível.</EmptyState>
      ) : (
        (campaigns ?? []).map((campaign) => (
          <CampaignCard
            key={campaign.uuid}
            campaign={campaign}
            to={`/campaigns/${campaign.uuid}`}
            nextGameScheduledAt={campaign.nextGameScheduledAt}
            state={sheetId ? { sheetId, sheetNick } : undefined}
          />
        ))
      )}
    </ListPageTemplate>
  );
}

export default PublicCampaignsPage;
```

> `PublicCampaignsPage` não tem `CreateButton`. O `styled` import some.

- [ ] **Step 1: Substituir o arquivo inteiro pelo conteúdo acima.**

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: verde.

- [ ] **Step 3: Rodar os testes do PublicCampaignsPage**

Run: `npx vitest run src/pages/__tests__/PublicCampaignsPage.test.tsx`
Expected: 5 testes passando, sem edição no arquivo de teste.

- [ ] **Step 4: Rodar a suite completa**

Run: `npm test`
Expected: 89 testes passando.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PublicCampaignsPage.tsx
git commit -m "refactor(pages): rebuild PublicCampaignsPage on ListPageTemplate"
```

---

## Task 5: Refatorar `CharacterSheetsPage`

**Files:**
- Modify: `src/pages/CharacterSheetsPage.tsx` (reescrita completa)

`CharacterSheetsPage` mantém: o guard de token, o `useEffect` que redireciona pra `/charactersheet/new` quando a lista vem vazia, e usa `useCharacterSheets` (retorna `isPending`/`isFetching`/`isError`). Fundo `space`, header preto, `bgAttachment="scroll"` (a página hoje NÃO tem `background-attachment: fixed`). Substituir o conteúdo INTEIRO de `src/pages/CharacterSheetsPage.tsx` por:

```tsx
import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import useToken from "../hooks/useToken";
import space from "../assets/images/space.png";
import { useCharacterSheets } from "../hooks/useCharacterSheets";
import type { CharacterSheetSummary } from "../types/characterSheet";
import CharacterSheetCard from "../components/atoms/CharacterSheetCard";
import PageTitle from "../components/ions/PageTitle";
import ListPageTemplate from "../components/templates/ListPageTemplate";
import CreateButton from "../components/atoms/CreateButton";

function CharacterSheetsPage() {
  const { token } = useToken();
  const navigate = useNavigate();
  const { data: charSheets, isPending, isFetching, isError } = useCharacterSheets(token);

  // Rules of Hooks: useEffect must be before any conditional return
  useEffect(() => {
    if (!isPending && !isFetching && charSheets && charSheets.length === 0) {
      navigate("/charactersheet/new", { replace: true });
    }
  }, [charSheets, isPending, isFetching, navigate]);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return (
    <ListPageTemplate
      bgImage={space}
      headerColor="black"
      bgAttachment="scroll"
      isPending={isPending}
      isError={isError}
      loadingLabel="Carregando..."
      errorLabel="Falha ao carregar personagens. Tente novamente mais tarde."
    >
      <PageTitle>LISTA DE PERSONAGENS</PageTitle>

      {(charSheets ?? []).map((sheet: CharacterSheetSummary) => (
        <CharacterSheetCard
          key={sheet.uuid}
          character={sheet}
          to={`/charactersheet/${sheet.uuid}`}
        />
      ))}

      <CreateButton
        variant="orange"
        label="Criar Nova Ficha"
        onClick={() => navigate("/charactersheet/new")}
      />
    </ListPageTemplate>
  );
}

export default CharacterSheetsPage;
```

> O `styled` import some. O espaçamento dos cards passa de `8vw`/`5vw` para o `30px` do template — normalização aprovada.

- [ ] **Step 1: Substituir o arquivo inteiro pelo conteúdo acima.**

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: verde.

- [ ] **Step 3: Rodar os testes do CharacterSheetsPage**

Run: `npx vitest run src/pages/__tests__/CharacterSheetsPage.test.tsx`
Expected: 7 testes passando, sem edição no arquivo de teste. O teste do redirect-quando-vazio depende do `useEffect` — confirmar que ele foi preservado.

- [ ] **Step 4: Rodar a suite completa + build**

Run: `npm test` e `npm run build`
Expected: 89 testes passando, build verde.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CharacterSheetsPage.tsx
git commit -m "refactor(pages): rebuild CharacterSheetsPage on ListPageTemplate"
```

---

## Self-review checklist (executor faz antes de fechar a fase)

- [ ] `npm run build` verde
- [ ] `npm test` verde — 89 testes (mesma contagem da baseline; esta fase não adiciona testes)
- [ ] `npm run lint` verde
- [ ] Os 17 testes das 3 páginas de lista passam **sem terem sido editados**
- [ ] As 3 páginas não têm mais nenhum styled-component nem `import styled`
- [ ] Nenhum arquivo da zona pixel-tuned foi tocado
- [ ] Smoke test manual: `npm run dev`, abrir `/campaigns`, `/campaigns/public`, `/charactersheets` — header / título / cards / botão de criar idênticos; a lista de personagens agora tem espaçamento de 30px (mudança esperada)

## Next phase

Quando a Fase 2a estiver mergeada: nova sessão, `superpowers:writing-plans` para a **Fase 2b** (CreateFormTemplate + FormField, refatorando `CreateCampaignPage` e `CreateMatchPage`).
