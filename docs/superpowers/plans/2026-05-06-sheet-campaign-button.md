# Sheet Campaign Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar botão adaptativo em cada ficha de personagem (view) que navega para a campanha associada ou para a listagem pública de campanhas, e criar a `PublicCampaignsPage` com ordenação e exibição de próxima partida nos cards.

**Architecture:** Copiar `AdaptativeActionButton` como `SheetCampaignButton` adaptado para scroll de `window` e posicionamento à direita; adicionar `campaignUuid` ao tipo `CharacterSheet`; criar `PublicCampaignsPage` reutilizando `CampaignCard` com nova prop opcional `nextGameScheduledAt`.

**Tech Stack:** React 18, TypeScript (`verbatimModuleSyntax`), styled-components, React Query (`@tanstack/react-query`), React Router v6, Vite.

---

## File Map

| Arquivo | Ação |
|---|---|
| `src/types/characterSheet.ts` | Modificar — adicionar `campaignUuid?: string` a `CharacterSheet` |
| `src/types/campaigns.ts` | Modificar — adicionar `PublicCampaignSummary` |
| `src/services/campaignService.ts` | Modificar — adicionar `listPublicCampaigns` |
| `src/hooks/usePublicCampaigns.ts` | Criar — hook React Query para campanhas públicas |
| `src/components/atoms/CampaignCard.tsx` | Modificar — prop `nextGameScheduledAt` + formatação |
| `src/features/sheet/SheetCampaignButton.tsx` | Criar — cópia adaptada do `AdaptativeActionButton` |
| `src/features/sheet/CharacterSheetTemplate.tsx` | Modificar — props novas + botão condicional |
| `src/pages/CharacterSheetPage.tsx` | Modificar — lógica de navegação + props ao template |
| `src/pages/PublicCampaignsPage.tsx` | Criar — listagem pública de campanhas |
| `src/App.tsx` | Modificar — rota `/campaigns/public` |

---

## Task 1: Tipos — `CharacterSheet` e `PublicCampaignSummary`

**Files:**
- Modify: `src/types/characterSheet.ts`
- Modify: `src/types/campaigns.ts`

- [ ] **Step 1.1: Adicionar `campaignUuid` a `CharacterSheet`**

Em `src/types/characterSheet.ts`, na interface `CharacterSheet`, adicionar o campo após `characterClass`:

```ts
export interface CharacterSheet {
  campaignUuid?: string;
  characterClass: string;
  // ... resto dos campos existentes
```

O backend já retorna `campaign_uuid`; `objToCamelCase` converte automaticamente.

- [ ] **Step 1.2: Adicionar `PublicCampaignSummary` em `campaigns.ts`**

Em `src/types/campaigns.ts`, após a interface `CampaignsResponse` existente, adicionar:

```ts
export interface PublicCampaignSummary extends CampaignSummary {
  nextGameScheduledAt: string | null;
}

export interface PublicCampaignsResponse {
  campaigns: PublicCampaignSummary[];
}
```

- [ ] **Step 1.3: Verificar compilação**

```bash
npm run build
```

Esperado: sem erros de TypeScript.

- [ ] **Step 1.4: Commit**

```bash
git add src/types/characterSheet.ts src/types/campaigns.ts
git commit -m "feat: add campaignUuid to CharacterSheet and PublicCampaignSummary type"
```

---

## Task 2: Serviço e Hook para campanhas públicas

**Files:**
- Modify: `src/services/campaignService.ts`
- Create: `src/hooks/usePublicCampaigns.ts`

- [ ] **Step 2.1: Adicionar `listPublicCampaigns` ao serviço**

Em `src/services/campaignService.ts`, adicionar os imports necessários no topo:

```ts
import type { CampaignsResponse, PublicCampaignsResponse } from "../types/campaigns";
```

(Substituir o import existente de `CampaignsResponse` por essa versão atualizada.)

Adicionar o método ao objeto `campaignService`, após `listCampaigns`:

```ts
listPublicCampaigns: (token: string) =>
  httpClient
    .get<PublicCampaignsResponse>("/public/campaigns", config(token))
    .then((response) => {
      const data = objToCamelCase<PublicCampaignsResponse>(response.data);
      return {
        ...response,
        data: data.campaigns || [],
      };
    }),
```

- [ ] **Step 2.2: Criar `usePublicCampaigns`**

Criar `src/hooks/usePublicCampaigns.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { campaignService } from "../services/campaignService";

export function usePublicCampaigns(token: string | null) {
  return useQuery({
    queryKey: ["publicCampaigns", token],
    queryFn: async () => {
      if (!token) throw new Error("Token inválido");
      const { data } = await campaignService.listPublicCampaigns(token);
      return data;
    },
    enabled: !!token,
    retry: 1,
  });
}
```

- [ ] **Step 2.3: Verificar compilação**

```bash
npm run build
```

Esperado: sem erros.

- [ ] **Step 2.4: Commit**

```bash
git add src/services/campaignService.ts src/hooks/usePublicCampaigns.ts
git commit -m "feat: add listPublicCampaigns service and usePublicCampaigns hook"
```

---

## Task 3: Atualizar `CampaignCard` com `nextGameScheduledAt`

**Files:**
- Modify: `src/components/atoms/CampaignCard.tsx`

- [ ] **Step 3.1: Adicionar prop e função de formatação**

Em `src/components/atoms/CampaignCard.tsx`, adicionar a função utilitária antes do componente e atualizar a interface de props:

```ts
function formatNextGame(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const gameDate = new Date(dateStr);
  gameDate.setHours(0, 0, 0, 0);
  const diffMs = gameDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const formatted = gameDate.toLocaleDateString("pt-BR");
  if (diffDays === 0) return `Partida agendada para: ${formatted} (hoje)`;
  if (diffDays === 1) return `Partida agendada para: ${formatted} (amanhã)`;
  return `Partida agendada para: ${formatted} (em ${diffDays} dias)`;
}

interface CampaignCardProps {
  campaign: CampaignSummary;
  to: string;
  nextGameScheduledAt?: string | null;
}
```

- [ ] **Step 3.2: Renderizar informação no card**

Dentro de `CampaignCard`, após a linha `const startDate = ...`, calcular o texto da próxima partida:

```ts
const nextGameText =
  nextGameScheduledAt === undefined
    ? null
    : nextGameScheduledAt === null
    ? "Sem partidas agendadas"
    : formatNextGame(nextGameScheduledAt);
```

No JSX, dentro de `<MetaInfo>`, adicionar após `<DateInfo>` e antes de `<PublicStatus>`:

```tsx
{nextGameText && <NextGameInfo>{nextGameText}</NextGameInfo>}
```

- [ ] **Step 3.3: Adicionar styled component `NextGameInfo`**

Ao final do arquivo, após `PublicStatus`:

```ts
const NextGameInfo = styled.span`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: 16px;
  color: #f0c040;
`;
```

- [ ] **Step 3.4: Verificar compilação e lint**

```bash
npm run build && npm run lint
```

Esperado: sem erros.

- [ ] **Step 3.5: Testar manualmente**

Iniciar o dev server (`npm run dev`), navegar para `/campaigns` e confirmar que os cards existentes **não** exibem nenhuma linha extra de próxima partida (prop `nextGameScheduledAt` ausente = `undefined` = nada renderizado).

- [ ] **Step 3.6: Commit**

```bash
git add src/components/atoms/CampaignCard.tsx
git commit -m "feat: add optional nextGameScheduledAt display to CampaignCard"
```

---

## Task 4: Criar `SheetCampaignButton`

**Files:**
- Create: `src/features/sheet/SheetCampaignButton.tsx`

- [ ] **Step 4.1: Criar o componente**

Criar `src/features/sheet/SheetCampaignButton.tsx` com o conteúdo abaixo. É uma cópia do `AdaptativeActionButton` adaptada para scroll de `window` (sem `containerRef`) e posicionamento no canto inferior **direito** quando flutuando:

```tsx
import { useEffect, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import PlusIcon from "../../components/ions/PlusIcon";
import styled from "styled-components";

interface SheetCampaignButtonProps {
  label: string;
  onClick: () => void;
}

export default function SheetCampaignButton({
  label,
  onClick,
}: SheetCampaignButtonProps) {
  const [isFloating, setIsFloating] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const debouncedScrollPosition = useDebounce(scrollPosition, 50);

  useEffect(() => {
    const checkScroll = () => setScrollPosition(window.scrollY);
    checkScroll();
    window.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      window.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  useEffect(() => {
    const scrollBottom = debouncedScrollPosition + window.innerHeight;
    const contentHeight = document.documentElement.scrollHeight;
    setIsFloating(scrollBottom < contentHeight - 30);
  }, [debouncedScrollPosition]);

  return (
    <ButtonWrapper $isFloating={isFloating}>
      <ActionButton $isFloating={isFloating} onClick={onClick}>
        <PlusIcon />
        <span>{label}</span>
      </ActionButton>
    </ButtonWrapper>
  );
}

const ButtonWrapper = styled.div<{ $isFloating: boolean }>`
  position: absolute;
  bottom: 0px;
  left: 0px;
  z-index: 10;
  height: 91px;
  width: 100%;
`;

const ActionButton = styled.button<{ $isFloating: boolean }>`
  border: none;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;

  ${({ $isFloating }) =>
    $isFloating
      ? `
        position: fixed;
        bottom: 20px;
        right: 20px;
        border-radius: 50px;
        padding: 15px 30px 15px 26px;
        background-color: #107135;
        color: white;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        gap: 10px;

        font-family: "Roboto", sans-serif;
        font-size: 26px;
        font-weight: 600;

        &:hover {
          transform: translateY(-5px);
          filter: brightness(1.1);
          box-shadow: 0 8px 15px rgba(0, 0, 0, 0.4);
        }
        &:active {
          transform: scale(0.98);
        }
      `
      : `
        position: relative;
        width: 100%;
        height: 100%;
        justify-content: center;
        padding: 15px;
        border-radius: 8px;
        background-color: #107135;
        color: white;
        box-shadow: none;
        gap: 15px;

        font-family: "Roboto", sans-serif;
        font-size: 26px;
        font-weight: 600;

        &:hover {
          transform: translateY(-5px);
          filter: brightness(1.1);
        }
        &:active {
          transform: scale(0.98);
        }
      `}
`;
```

- [ ] **Step 4.2: Verificar compilação**

```bash
npm run build
```

Esperado: sem erros.

- [ ] **Step 4.3: Commit**

```bash
git add src/features/sheet/SheetCampaignButton.tsx
git commit -m "feat: add SheetCampaignButton with window scroll and right-side positioning"
```

---

## Task 5: Atualizar `CharacterSheetTemplate`

**Files:**
- Modify: `src/features/sheet/CharacterSheetTemplate.tsx`

- [ ] **Step 5.1: Adicionar import de `SheetCampaignButton`**

No topo de `src/features/sheet/CharacterSheetTemplate.tsx`, adicionar após os imports existentes:

```ts
import SheetCampaignButton from "./SheetCampaignButton";
```

- [ ] **Step 5.2: Adicionar props ao tipo `Data`**

Na interface `Data`, adicionar os dois campos opcionais:

```ts
interface Data {
  error: string | null;
  isLoading: boolean;
  charSheet?: CharacterSheet;
  setCharSheet?: (charSheet: CharacterSheet) => void;
  charClasses?: CharacterClass[];
  selectedClass?: CharacterClass;
  applyClassDistribution?: (className: string) => void;
  onCampaignClick?: () => void;
  hasCampaign?: boolean;
}
```

- [ ] **Step 5.3: Desestruturar as novas props na função**

Na assinatura da função `CharacterSheetTemplate`, atualizar a desestruturação de `data`:

```ts
function CharacterSheetTemplate({
  data: { charSheet, setCharSheet, charClasses, isLoading, error, onCampaignClick, hasCampaign },
  sheetMode,
}: CharacterSheetTemplateProps) {
```

- [ ] **Step 5.4: Adicionar `$hasCampaignButton` ao `SheetContainer`**

Atualizar o styled component `SheetContainer` ao final do arquivo para aceitar a styled-prop e adicionar `padding-bottom` condicionalmente:

```ts
const SheetContainer = styled.div<{ $hasCampaignButton?: boolean }>`
  container-type: inline-size;
  max-width: 940px;
  margin: 0 auto;
  color: white;
  background-color: black;
  position: relative;
  ${({ $hasCampaignButton }) => $hasCampaignButton && "padding-bottom: 103px;"}
`;
```

- [ ] **Step 5.5: Passar a styled-prop e renderizar o botão**

No JSX, atualizar a abertura de `<SheetContainer>` para:

```tsx
<SheetContainer $hasCampaignButton={sheetMode.headerMode === "view" && !!onCampaignClick}>
```

Ao final de `<SheetContainer>`, após `<ProficienciesSection>` e antes do fechamento `</SheetContainer>`, adicionar:

```tsx
{sheetMode.headerMode === "view" && onCampaignClick && (
  <SheetCampaignButton
    label={hasCampaign ? "Ver Campanha" : "Procurar Campanhas"}
    onClick={onCampaignClick}
  />
)}
```

- [ ] **Step 5.6: Verificar compilação**

```bash
npm run build
```

Esperado: sem erros.

- [ ] **Step 5.7: Commit**

```bash
git add src/features/sheet/CharacterSheetTemplate.tsx
git commit -m "feat: render SheetCampaignButton in CharacterSheetTemplate view mode"
```

---

## Task 6: Atualizar `CharacterSheetPage`

**Files:**
- Modify: `src/pages/CharacterSheetPage.tsx`

- [ ] **Step 6.1: Adicionar `useNavigate` e lógica de navegação**

Substituir o conteúdo de `src/pages/CharacterSheetPage.tsx` por:

```tsx
import { Navigate, useParams, useNavigate } from "react-router-dom";
import CharacterSheetTemplate from "../features/sheet/CharacterSheetTemplate";
import useToken from "../hooks/useToken";
import type { SheetMode } from "../features/sheet/types/sheetMode";
import { useCharacterSheet } from "../hooks/useCharacterSheet";

function CharacterSheetPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useToken();
  const navigate = useNavigate();

  const sheetMode: SheetMode = {
    headerMode: "view",
    profileMode: "view",
    diagramsMode: "view",
    proficiencyMode: "view",
    skillsMode: "view",
  };

  const { data: charSheet, isLoading, error } = useCharacterSheet(token, id);

  if (!token || !id) {
    return <Navigate to="/" replace />;
  }

  const handleCampaignClick = () => {
    if (charSheet?.campaignUuid) {
      navigate(`/campaigns/${charSheet.campaignUuid}`);
    } else {
      navigate("/campaigns/public", { state: { sheetId: id } });
    }
  };

  return (
    <CharacterSheetTemplate
      sheetMode={sheetMode}
      data={{
        charSheet,
        isLoading,
        error: error ? error.message : null,
        onCampaignClick: charSheet ? handleCampaignClick : undefined,
        hasCampaign: !!charSheet?.campaignUuid,
      }}
    />
  );
}

export default CharacterSheetPage;
```

- [ ] **Step 6.2: Verificar compilação**

```bash
npm run build
```

Esperado: sem erros.

- [ ] **Step 6.3: Testar manualmente**

Iniciar `npm run dev` e navegar para uma ficha existente (`/charactersheet/:id`). Verificar:
- O botão aparece ao final da página (inline, largura total, fundo verde)
- Ao rolar a página para cima, o botão muda para modo flutuante (pílula) no **canto inferior direito**
- Ao chegar ao final da página, volta ao modo inline
- Se a ficha tem `campaignUuid`: clicar navega para `/campaigns/:campaignUuid`
- Se a ficha não tem `campaignUuid`: clicar navega para `/campaigns/public`
- Na `CreateCharacterSheetPage`, o botão **não** aparece

- [ ] **Step 6.4: Commit**

```bash
git add src/pages/CharacterSheetPage.tsx
git commit -m "feat: add campaign navigation button to CharacterSheetPage"
```

---

## Task 7: Criar `PublicCampaignsPage`

**Files:**
- Create: `src/pages/PublicCampaignsPage.tsx`

- [ ] **Step 7.1: Criar o arquivo**

Criar `src/pages/PublicCampaignsPage.tsx`:

```tsx
import { Navigate, useLocation } from "react-router-dom";
import useToken from "../hooks/useToken";
import { usePublicCampaigns } from "../hooks/usePublicCampaigns";
import CampaignCard from "../components/atoms/CampaignCard";
import PageHeader from "../components/atoms/PageHeader";
import PageTitle from "../components/ions/PageTitle";
import { LoadingContainer, ErrorContainer } from "../components/atoms/PageStates";
import worldMap from "../assets/images/worldmap.png";
import styled from "styled-components";

function PublicCampaignsPage() {
  const { token } = useToken();
  const location = useLocation();
  const sheetId = (location.state as { sheetId?: string } | null)?.sheetId;
  const backTo = sheetId ? `/charactersheet/${sheetId}` : "/charactersheets";

  const { data: campaigns, isLoading, error } = usePublicCampaigns(token);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return <LoadingContainer>Carregando campanhas...</LoadingContainer>;
  }

  if (error) {
    return (
      <ErrorContainer>
        Falha ao carregar campanhas. Tente novamente mais tarde.
      </ErrorContainer>
    );
  }

  return (
    <StyledPublicCampaignsPage>
      <PageHeader to={backTo} backgroundColor="#08491f" />
      <PageBody>
        <PageTitle>CAMPANHAS PÚBLICAS</PageTitle>

        {(campaigns ?? []).length === 0 ? (
          <EmptyState>
            <EmptyMessage>Nenhuma campanha pública disponível.</EmptyMessage>
          </EmptyState>
        ) : (
          <>
            {(campaigns ?? []).map((campaign) => (
              <CampaignCard
                key={campaign.uuid}
                campaign={campaign}
                to={`/campaigns/${campaign.uuid}`}
                nextGameScheduledAt={campaign.nextGameScheduledAt}
              />
            ))}
          </>
        )}
      </PageBody>
    </StyledPublicCampaignsPage>
  );
}

export default PublicCampaignsPage;

const StyledPublicCampaignsPage = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background-image: url(${worldMap});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
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

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
`;

const EmptyMessage = styled.p`
  color: #9f9f9f;
  font-size: 20px;
  margin-bottom: 20px;
`;
```

- [ ] **Step 7.2: Verificar compilação**

```bash
npm run build
```

Esperado: sem erros. (A rota ainda não existe — será adicionada na Task 8.)

- [ ] **Step 7.3: Commit**

```bash
git add src/pages/PublicCampaignsPage.tsx
git commit -m "feat: add PublicCampaignsPage with next game date display"
```

---

## Task 8: Registrar rota em `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 8.1: Adicionar import e rota**

Em `src/App.tsx`, adicionar o import:

```ts
import PublicCampaignsPage from "./pages/PublicCampaignsPage";
```

Adicionar a rota **antes** de `<Route path="/campaigns/:id" ...>` (ordem obrigatória para evitar que `/campaigns/public` seja capturado como `:id`):

```tsx
<Route path="/campaigns/public" element={<PublicCampaignsPage />} />
<Route path="/campaigns/:id" element={<CampaignPage />} />
```

- [ ] **Step 8.2: Verificar compilação e lint**

```bash
npm run build && npm run lint
```

Esperado: sem erros.

- [ ] **Step 8.3: Testar o fluxo completo**

Iniciar `npm run dev` e verificar:

1. **Ficha com campanha:** Abrir `/charactersheet/:id` de uma ficha vinculada → botão mostra "Ver Campanha" → clique navega para a `CampaignPage` da campanha associada.
2. **Ficha sem campanha:** Abrir `/charactersheet/:id` de uma ficha sem campanha → botão mostra "Procurar Campanhas" → clique navega para `/campaigns/public`.
3. **PublicCampaignsPage:** Cards exibem "Partida agendada para: DD/MM/YYYY (em X dias)" / "(amanhã)" / "(hoje)" ou "Sem partidas agendadas". Clique no card navega para a `CampaignPage`.
4. **Botão de voltar:** `PageHeader` na `PublicCampaignsPage` volta para `/charactersheet/:sheetId` quando chegou via ficha, ou `/charactersheets` como fallback.
5. **Comportamento adaptativo:** Em `/charactersheet/:id`, rolar a página para cima faz o botão flutuar no canto inferior direito como pílula verde; chegar ao fim da página o devolve como card inline.
6. **CreateCharacterSheetPage:** Nenhum botão de campanha aparece.

- [ ] **Step 8.4: Commit final**

```bash
git add src/App.tsx
git commit -m "feat: register /campaigns/public route for PublicCampaignsPage"
```
