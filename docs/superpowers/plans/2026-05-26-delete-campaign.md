# Delete Campaign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o fluxo completo de exclusão de campanha no front-end — service, hook, componentes e testes.

**Architecture:** Três camadas — `campaignService.deleteCampaign` → `useDeleteCampaign` → `CampaignPage`. `MatchBottomActions` é extraído para `components/molecules/BottomActions` e reutilizado em `MatchPage` e `CampaignPage`. `ManageButton` recebe `deleteDisabledReason?: string` para exibir o motivo inline quando exclusão está bloqueada por partida iniciada.

**Tech Stack:** React + TypeScript, @tanstack/react-query `useMutation`, styled-components, axios, Vitest + MSW.

---

## File Map

| Arquivo | Ação |
|---|---|
| `src/services/campaignService.ts` | Modificar — adicionar `deleteCampaign` |
| `src/hooks/useDeleteCampaign.ts` | Criar |
| `src/components/molecules/ManageButton.tsx` | Modificar — adicionar `deleteDisabledReason?` |
| `src/components/molecules/BottomActions.tsx` | Criar (extraído de `MatchBottomActions`) |
| `src/features/match/MatchBottomActions.tsx` | Deletar após extração |
| `src/pages/MatchPage.tsx` | Modificar — atualizar import |
| `src/pages/CampaignPage.tsx` | Modificar — restructurar + integrar delete |
| `src/pages/__tests__/CampaignPage.test.tsx` | Modificar — adicionar 6 testes |

---

## Task 1: Service — `deleteCampaign`

**Files:**
- Modify: `src/services/campaignService.ts`

- [ ] **Step 1: Adicionar `deleteCampaign` ao objeto `campaignService`**

Abrir `src/services/campaignService.ts`. O arquivo atual termina assim (linha 37):
```ts
  createCampaign: (token: string, campaignData: object): Promise<CampaignMaster> =>
    httpClient
      .post<{ campaign: CampaignMaster }>(
        "/campaigns",
        objToSnakeCase(campaignData),
        config(token)
      )
      .then(({ data }) => objToCamelCase<CampaignMaster>(data.campaign)),
};
```

Substituir o fechamento `};` pelo novo método + fechamento:
```ts
  createCampaign: (token: string, campaignData: object): Promise<CampaignMaster> =>
    httpClient
      .post<{ campaign: CampaignMaster }>(
        "/campaigns",
        objToSnakeCase(campaignData),
        config(token)
      )
      .then(({ data }) => objToCamelCase<CampaignMaster>(data.campaign)),

  deleteCampaign: (token: string, id: string): Promise<void> =>
    httpClient
      .delete(`/campaigns/${id}`, config(token))
      .then(() => undefined),
};
```

- [ ] **Step 2: Verificar tipos**

```bash
cd /home/azzurah/Documentos/HxH_RPG_Environment_Project/System_X_System_Project/System_X_System_React
npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros de tipo.

- [ ] **Step 3: Commit**

```bash
git add src/services/campaignService.ts
git commit -m "feat(campaign): add deleteCampaign to campaignService

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Hook — `useDeleteCampaign`

**Files:**
- Create: `src/hooks/useDeleteCampaign.ts`

- [ ] **Step 1: Criar o hook**

Criar `src/hooks/useDeleteCampaign.ts` com o seguinte conteúdo completo:
```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { campaignService } from "../services/campaignService";

export function useDeleteCampaign(token: string | null, campaignId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => campaignService.deleteCampaign(token!, campaignId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", token] });
    },
  });
}
```

O `queryKey: ["campaigns", token]` corresponde à chave usada por `useCampaigns` (confirmar em `src/hooks/useCampaigns.ts`). `onSuccess` invalida a lista de campanhas, que será recarregada quando o usuário navegar para `/campaigns`.

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useDeleteCampaign.ts
git commit -m "feat(campaign): add useDeleteCampaign hook

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: `ManageButton` — prop `deleteDisabledReason`

**Files:**
- Modify: `src/components/molecules/ManageButton.tsx`

**Contexto de comportamento:**
- `isFree === true` → "Excluir" clicável (comportamento atual).
- `!isFree && deleteDisabledReason` → "Excluir" visível porém desabilitado (cursor not-allowed), com `deleteDisabledReason` como texto menor abaixo.
- `!isFree && !deleteDisabledReason` → "Excluir" oculto (backward-compat; `MatchPage` nunca passa `deleteDisabledReason`).

- [ ] **Step 1: Adicionar `deleteDisabledReason` à interface**

No início do arquivo, substituir:
```ts
interface ManageButtonProps {
  isFree: boolean;
  isFloating: boolean;
  confirmMessage: string;
  onEdit: () => void;
  onDelete: () => void;
}
```
por:
```ts
interface ManageButtonProps {
  isFree: boolean;
  deleteDisabledReason?: string;
  isFloating: boolean;
  confirmMessage: string;
  onEdit: () => void;
  onDelete: () => void;
}
```

- [ ] **Step 2: Desestruturar a nova prop na função**

Substituir:
```ts
export default function ManageButton({
  isFree,
  isFloating,
  confirmMessage,
  onEdit,
  onDelete,
}: ManageButtonProps) {
```
por:
```ts
export default function ManageButton({
  isFree,
  deleteDisabledReason,
  isFloating,
  confirmMessage,
  onEdit,
  onDelete,
}: ManageButtonProps) {
```

- [ ] **Step 3: Substituir lógica de renderização do item "Excluir" no Menu**

No JSX, dentro de `<Menu>`, substituir:
```tsx
            {isFree && (
              <MenuItemDanger onClick={handleDelete}>🗑&nbsp; Excluir</MenuItemDanger>
            )}
```
por:
```tsx
            {isFree ? (
              <MenuItemDanger onClick={handleDelete}>🗑&nbsp; Excluir</MenuItemDanger>
            ) : deleteDisabledReason ? (
              <MenuItemDangerDisabled>
                🗑&nbsp; Excluir
                <DisabledReason>{deleteDisabledReason}</DisabledReason>
              </MenuItemDangerDisabled>
            ) : null}
```

- [ ] **Step 4: Adicionar novos styled-components no final do arquivo**

Após `const MenuItemDanger = styled(MenuItem)` ... `};`, adicionar:
```ts
const MenuItemDangerDisabled = styled(MenuItem)`
  color: ${colors.textDisabled};
  padding: 16px 0 16px 18px;
  cursor: not-allowed;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
`;

const DisabledReason = styled.span`
  font-size: 12px;
  font-weight: 400;
  color: ${colors.textDisabled};
`;
```

- [ ] **Step 5: Verificar tipos e rodar testes existentes**

```bash
npx tsc --noEmit 2>&1 | head -20
npm test -- --reporter=verbose 2>&1 | tail -20
```

Esperado: sem erros de tipo, testes existentes passando.

- [ ] **Step 6: Commit**

```bash
git add src/components/molecules/ManageButton.tsx
git commit -m "feat(campaign): add deleteDisabledReason to ManageButton

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: Extrair `BottomActions` e atualizar `MatchPage`

**Files:**
- Create: `src/components/molecules/BottomActions.tsx`
- Modify: `src/pages/MatchPage.tsx`
- Delete: `src/features/match/MatchBottomActions.tsx`

O conteúdo de `BottomActions.tsx` é idêntico ao de `MatchBottomActions.tsx` exceto:
1. Nome do componente e da interface.
2. Imports ajustados para o novo caminho (`src/components/molecules/`).
3. Interface `manage` inclui `deleteDisabledReason?: string` (necessário para `CampaignPage`).

- [ ] **Step 1: Criar `src/components/molecules/BottomActions.tsx`**

Conteúdo completo do novo arquivo:
```tsx
import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import ManageButton from "./ManageButton";
import PlusIcon from "../ions/PlusIcon";
import styled from "styled-components";
import { colors } from "../../styles/tokens";

interface BottomActionsProps {
  containerRef: RefObject<HTMLDivElement | null>;
  contentChangeSignal?: unknown;
  manage?: {
    isFree: boolean;
    deleteDisabledReason?: string;
    onEdit: () => void;
    onDelete: () => void;
    confirmMessage: string;
  };
  primaryButton?: {
    label: string;
    onClick: () => void;
  };
}

export default function BottomActions({
  containerRef,
  contentChangeSignal,
  manage,
  primaryButton,
}: BottomActionsProps) {
  const [isFloating, setIsFloating] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const debouncedScroll = useDebounce(scrollPosition, 50);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const checkScroll = () => setScrollPosition(el.scrollTop);
    checkScroll();
    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [containerRef]);

  useEffect(() => {
    if (contentChangeSignal === undefined) return;
    const timers = [50, 150, 300, 500].map((t) =>
      setTimeout(() => {
        const el = containerRef.current;
        if (!el) return;
        setScrollPosition(el.scrollTop);
        setIsFloating(el.scrollTop + el.clientHeight < el.scrollHeight - 30);
      }, t),
    );
    return () => timers.forEach(clearTimeout);
  }, [contentChangeSignal, containerRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setIsFloating(debouncedScroll + el.clientHeight < el.scrollHeight - 30);
  }, [debouncedScroll, containerRef]);

  if (isFloating) {
    return (
      <FloatingWrapper>
        <FloatingGroup>
          {manage && <ManageButton {...manage} isFloating={true} />}
          {primaryButton && (
            <FloatingPrimary onClick={primaryButton.onClick}>
              <PlusIcon />
              <span>{primaryButton.label}</span>
            </FloatingPrimary>
          )}
        </FloatingGroup>
      </FloatingWrapper>
    );
  }

  return (
    <AnchoredWrapper>
      {manage && <ManageButton {...manage} isFloating={false} />}
      {primaryButton && (
        <PrimaryButton onClick={primaryButton.onClick}>
          <PlusIcon />
          <span>{primaryButton.label}</span>
        </PrimaryButton>
      )}
    </AnchoredWrapper>
  );
}

const FloatingWrapper = styled.div`
  container-type: inline-size;
`;

const FloatingGroup = styled.div`
  position: fixed;
  bottom: 20px;
  left: 340px;
  z-index: 10;
  display: flex;
  gap: 12px;
  align-items: center;
`;

const FloatingPrimary = styled.button`
  border: none;
  border-radius: 50px;
  padding: 15px 30px 15px 26px;
  background-color: ${colors.brandAccent};
  color: ${colors.textPrimary};
  font-family: "Roboto", sans-serif;
  font-size: 26px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  box-shadow: 0 4px 10px ${colors.shadowSoft};
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-5px);
    filter: brightness(1.1);
    box-shadow: 0 8px 15px ${colors.shadowStrong};
  }
  &:active {
    transform: scale(0.98);
  }
`;

const AnchoredWrapper = styled.div`
  container-type: inline-size;
  position: absolute;
  bottom: 22px;
  left: 0;
  z-index: 10;
  height: 91px;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 20px;

  @media (max-width: 609px) {
    gap: 15px;
  }

  @media (max-width: 440px) {
    height: 70px;
  }
`;

const PrimaryButton = styled.button`
  flex: 1;
  height: 100%;
  border: none;
  border-radius: 8px;
  background-color: ${colors.brandAccent};
  color: ${colors.textPrimary};
  font-family: "Roboto", sans-serif;
  font-size: min(26px, 5cqi);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: min(15px, 2cqi);
  cursor: pointer;
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-5px);
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
  }
`;
```

- [ ] **Step 2: Atualizar import em `src/pages/MatchPage.tsx`**

Substituir:
```ts
import MatchBottomActions from "../features/match/MatchBottomActions";
```
por:
```ts
import BottomActions from "../components/molecules/BottomActions";
```

Depois, no JSX de `MatchPage`, substituir todas as ocorrências de `<MatchBottomActions` por `<BottomActions` e `</MatchBottomActions>` por `</BottomActions>` (se houver closing tag — neste caso é self-closing, então só o nome de abertura).

Verificar: o `manage` passado em `MatchPage` usa `isFree: true` sem `deleteDisabledReason`, o que é compatível com a interface de `BottomActions` (campo opcional).

- [ ] **Step 3: Deletar `src/features/match/MatchBottomActions.tsx`**

```bash
git rm src/features/match/MatchBottomActions.tsx
```

- [ ] **Step 4: Verificar tipos e rodar testes**

```bash
npx tsc --noEmit 2>&1 | head -20
npm test -- --reporter=verbose 2>&1 | tail -30
```

Esperado: sem erros de tipo. Testes de `MatchPage.test.tsx` e todos os outros continuam passando.

- [ ] **Step 5: Commit**

```bash
git add src/components/molecules/BottomActions.tsx src/pages/MatchPage.tsx
git commit -m "refactor: extract MatchBottomActions to components/molecules/BottomActions

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: `CampaignPage` — testes + reestruturação

**Files:**
- Modify: `src/pages/__tests__/CampaignPage.test.tsx`
- Modify: `src/pages/CampaignPage.tsx`

**Contexto das mudanças em `CampaignPage`:**
- `AdaptiveActionButton "Criar Partida"` sai de dentro de `<MatchesList>` e vai para `<BottomActions primaryButton>`.
- `AdaptiveActionButton "Submeter Ficha"` e mensagens de erro do player migram de dentro de `<MatchesList>` para dentro de `<ActionsList>`.
- `<MatchesList>` perde `padding-bottom: 112px` (vai para `<ActionsList>`).
- Novo bloco master: `<BottomActions manage={...} primaryButton={...} />`.
- Erro de delete exibido abaixo de `ActionsList` via `<DeleteErrorMessage>`.

- [ ] **Step 1: Adicionar 6 testes que devem FALHAR inicialmente**

Abrir `src/pages/__tests__/CampaignPage.test.tsx`. No topo do arquivo, as importações existentes já incluem `http`, `HttpResponse`, `screen`, `waitFor`, `userEvent`, `server`, `renderWithProviders`, `campaignFixture`, `campaignAsMaster`, `masterUserFixture`, `userFixture`, `CampaignPage`. Estas são suficientes.

Adicionar um novo `describe("delete campanha")` ao final do arquivo (antes do fechamento do `describe("CampaignPage")`):

```ts
  describe("delete campanha", () => {
    it("exibe 'Gerenciar' para master", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ campaign: campaignAsMaster(masterUserFixture.user.uuid) }),
        ),
      );
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });
      expect(await screen.findByText(/Gerenciar/i)).toBeInTheDocument();
    });

    it("não exibe 'Gerenciar' para player", async () => {
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: userFixture,
      });
      expect(await screen.findByText(campaignFixture.name.toUpperCase())).toBeInTheDocument();
      expect(screen.queryByText(/Gerenciar/i)).not.toBeInTheDocument();
    });

    it("delete com sucesso navega para /campaigns", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ campaign: campaignAsMaster(masterUserFixture.user.uuid) }),
        ),
        http.delete(`${baseUrl}/campaigns/:id`, () =>
          new HttpResponse(null, { status: 204 }),
        ),
      );
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });
      const user = userEvent.setup();
      await user.click(await screen.findByText(/Gerenciar/i));
      await user.click(screen.getByText(/Excluir/i));
      await user.click(await screen.findByRole("button", { name: "Excluir" }));
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/campaigns");
      });
    });

    it("delete 422 exibe mensagem 'partida iniciada'", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ campaign: campaignAsMaster(masterUserFixture.user.uuid) }),
        ),
        http.delete(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ error: "has started match" }, { status: 422 }),
        ),
      );
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });
      const user = userEvent.setup();
      await user.click(await screen.findByText(/Gerenciar/i));
      await user.click(screen.getByText(/Excluir/i));
      await user.click(await screen.findByRole("button", { name: "Excluir" }));
      expect(
        await screen.findByText(/partida iniciada e não pode ser deletada/i),
      ).toBeInTheDocument();
    });

    it("campanha com partida iniciada exibe 'Excluir' desabilitado com motivo", async () => {
      const campaignWithStartedMatch = {
        ...campaignAsMaster(masterUserFixture.user.uuid),
        matches: [
          {
            uuid: "match-started",
            campaignUuid: "campaign-1",
            masterUuid: masterUserFixture.user.uuid,
            title: "Partida Iniciada",
            briefInitialDescription: "Brief",
            description: "Desc",
            isPublic: true,
            gameScheduledAt: "2025-01-01T10:00:00Z",
            gameStartAt: "2025-01-01T10:05:00Z",
            storyStartAt: "2025-01-01",
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
        ],
      };
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ campaign: campaignWithStartedMatch }),
        ),
      );
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });
      const user = userEvent.setup();
      await user.click(await screen.findByText(/Gerenciar/i));
      expect(await screen.findByText(/Partida iniciada existente/i)).toBeInTheDocument();
    });

    it("'Criar Partida' em BottomActions chama navigate", async () => {
      server.use(
        http.get(`${baseUrl}/campaigns/:id`, () =>
          HttpResponse.json({ campaign: campaignAsMaster(masterUserFixture.user.uuid) }),
        ),
      );
      renderWithProviders(<CampaignPage />, {
        route: "/campaigns/campaign-1",
        path: "/campaigns/:id",
        user: masterUserFixture,
      });
      const user = userEvent.setup();
      await user.click(await screen.findByRole("button", { name: /Criar Partida/i }));
      expect(mockNavigate).toHaveBeenCalledWith("/campaigns/campaign-1/matches/new");
    });
  });
```

- [ ] **Step 2: Rodar testes para confirmar que os 6 novos FALHAM**

```bash
npm test -- --reporter=verbose src/pages/__tests__/CampaignPage.test.tsx 2>&1 | tail -30
```

Esperado: 6 falhas nos testes do `describe("delete campanha")`. Os outros testes continuam passando. Se um dos novos testes PASSAR sem implementação, revisar a lógica.

- [ ] **Step 3: Implementar as mudanças em `CampaignPage.tsx`**

Substituir o conteúdo completo de `src/pages/CampaignPage.tsx`:

```tsx
import { useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import { useCampaignDetails } from "../hooks/useCampaignDetails";
import { useSubmitCharacterSheet } from "../hooks/useSubmitCharacterSheet";
import { useDeleteCampaign } from "../hooks/useDeleteCampaign";
import type { CharacterPrivateSummary } from "../types/campaign";
import styled from "styled-components";
import { colors, fonts } from "../styles/tokens";
import CharacterSidebarItem from "../components/molecules/CharacterSidebarItem";
import MatchItem from "../features/campaign/MatchItem";
import AdaptiveActionButton from "../components/molecules/AdaptiveActionButton";
import BottomActions from "../components/molecules/BottomActions";
import { getSortedCharacters } from "../features/campaign/utils/characterUtils";
import { LoadingContainer, ErrorContainer } from "../components/atoms/PageStates";
import ExpandableText from "../components/molecules/ExpandableText";
import ConfirmDialog from "../components/molecules/ConfirmDialog";
import DetailPageTemplate from "../components/templates/DetailPageTemplate";
import CharactersSidebar from "../components/organisms/CharactersSidebar";
import RulesSidebar from "../components/organisms/RulesSidebar";
import RuleSection from "../components/molecules/RuleSection";
import { isApiError } from "../services/httpClient";

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useToken();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const sheetId = (location.state as { sheetId?: string; sheetNick?: string } | null)?.sheetId;
  const sheetNick = (location.state as { sheetId?: string; sheetNick?: string } | null)?.sheetNick;

  const [descriptionSignal, setDescriptionSignal] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [nickConflictError, setNickConflictError] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const { data: campaign, isPending, isError } = useCampaignDetails(token, id);
  const {
    mutate: submitSheet,
    isPending: submitPending,
    isSuccess: submitted,
    isError: submitFailed,
    error: submitError,
  } = useSubmitCharacterSheet(token, id);
  const { mutate: deleteCampaign } = useDeleteCampaign(token, id);

  const isMaster = campaign?.masterUuid === user?.uuid;
  const hasStartedMatch = (campaign?.matches ?? []).some((m) => !!m.gameStartAt);

  const playerSheetId = campaign?.characterSheets.find(
    (s) => s.playerUuid === user?.uuid
  )?.uuid;

  const handleSubmitSheet = () => {
    if (!sheetId || !campaign) return;
    submitSheet({ sheetUuid: sheetId, campaignUuid: campaign.uuid });
  };

  const handleRequestSubmit = () => {
    if (sheetNick && campaign) {
      const nickTaken = campaign.characterSheets.some(
        (s) => s.nickName === sheetNick
      );
      if (nickTaken) {
        setNickConflictError(true);
        return;
      }
    }
    setNickConflictError(false);
    setShowSubmitConfirm(true);
  };

  const handleEdit = () => navigate(`/campaigns/${id}/edit`);

  const handleDelete = () => {
    setDeleteError(null);
    deleteCampaign(undefined, {
      onSuccess: () => navigate("/campaigns"),
      onError: (error) => {
        setDeleteError(
          isApiError(error, 422)
            ? "Esta campanha possui ao menos uma partida iniciada e não pode ser deletada."
            : "Erro ao deletar campanha. Tente novamente."
        );
      },
    });
  };

  const handleCreateNpc = () => navigate(`/campaigns/${id}/npcs/new`);
  const handleCreateMatch = () => navigate(`/campaigns/${id}/matches/new`);

  let sortedSheets: (CharacterPrivateSummary & { isPending?: boolean })[] = [];
  if (campaign) {
    const ownPending = !isMaster && campaign.myPendingSheet ? [campaign.myPendingSheet] : [];
    const pendingSheets = isMaster ? campaign.pendingSheets : ownPending;
    sortedSheets = getSortedCharacters(campaign.characterSheets, pendingSheets);
  }

  if (isPending) {
    return <LoadingContainer>Carregando campanha...</LoadingContainer>;
  }
  if (isError) {
    return <ErrorContainer>Falha ao carregar detalhes da campanha.</ErrorContainer>;
  }
  if (!campaign) {
    return <ErrorContainer>Campanha não encontrada</ErrorContainer>;
  }

  return (
    <>
      <DetailPageTemplate
        mainRef={mainContentRef}
        leftSidebar={
          <CharactersSidebar
            containerRef={sidebarRef}
            items={sortedSheets}
            renderItem={(character) => (
              <CharacterSidebarItem
                key={character.uuid}
                character={character}
                isMaster={!!isMaster}
                isOwn={character.playerUuid === user?.uuid}
                onClick={() =>
                  navigate(`/charactersheet/${character.uuid}`, {
                    state: { isPending: !!character.isPending, campaignId: id },
                  })
                }
              />
            )}
            footer={
              isMaster && (
                <AdaptiveActionButton
                  label="Criar NPC"
                  type="character"
                  onClick={handleCreateNpc}
                  containerRef={sidebarRef}
                  contentChangeSignal={descriptionSignal}
                />
              )
            }
          />
        }
        rightSidebar={
          <RulesSidebar>
            <RuleSection title="Configurações Gerais">
              As regras da campanha serão configuradas aqui.
            </RuleSection>
            <RuleSection title="Sistema de Combate">
              Configure o sistema de combate da sua campanha.
            </RuleSection>
            <RuleSection title="Progressão de Personagens">
              Define como os personagens evoluem durante a campanha.
            </RuleSection>
            <RuleSection title="Nen & Habilidades">
              Configure as regras para uso e desenvolvimento de Nen.
            </RuleSection>
          </RulesSidebar>
        }
      >
        <CampaignHeader>
          <CampaignTitle>{campaign.name.toUpperCase()}</CampaignTitle>
          <CampaignDate>
            Data Atual:{" "}
            {(() => {
              if (!campaign.storyCurrentAt) return "Data não disponível";
              const [date] = campaign.storyCurrentAt.split("T");
              const [year, month, day] = date.split("-");
              return `${day}/${month}/${year}`;
            })()}
          </CampaignDate>
        </CampaignHeader>

        <CampaignBriefDescription>
          {campaign.briefInitialDescription}
        </CampaignBriefDescription>

        <ExpandableText onToggle={() => setDescriptionSignal((s) => !s)}>
          {campaign.description}
        </ExpandableText>

        <CampaignDate>
          Início:{" "}
          {(() => {
            const [year, month, day] = campaign.storyStartAt.split("-");
            return `${day}/${month}/${year}`;
          })()}
        </CampaignDate>

        <MatchesList>
          {(campaign.matches ?? []).map((match) => (
            <MatchItem
              key={match.uuid}
              match={match}
              onClick={() =>
                navigate(`/campaigns/${campaign.uuid}/matches/${match.uuid}`, {
                  state: { sheetId: playerSheetId },
                })
              }
            />
          ))}
        </MatchesList>

        <ActionsList>
          {isMaster ? (
            <BottomActions
              containerRef={mainContentRef}
              contentChangeSignal={descriptionSignal}
              manage={{
                isFree: !hasStartedMatch,
                deleteDisabledReason: hasStartedMatch
                  ? "Partida iniciada existente"
                  : undefined,
                onEdit: handleEdit,
                onDelete: handleDelete,
                confirmMessage:
                  "Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita.",
              }}
              primaryButton={{ label: "Criar Partida", onClick: handleCreateMatch }}
            />
          ) : !submitted && sheetId ? (
            <>
              <AdaptiveActionButton
                label={submitPending ? "Submetendo..." : "Submeter Ficha"}
                type="match"
                onClick={submitPending ? () => {} : handleRequestSubmit}
                containerRef={mainContentRef}
                contentChangeSignal={descriptionSignal}
              />
              {nickConflictError && (
                <NickConflictMessage>
                  Já existe um personagem com o nick &quot;{sheetNick}&quot; nesta campanha. Escolha outro nick antes de submeter.
                </NickConflictMessage>
              )}
              {submitFailed && !nickConflictError && (
                <NickConflictMessage>
                  {isApiError(submitError, 409)
                    ? `Já existe um personagem com o nick "${sheetNick}" nesta campanha. Escolha outro nick antes de submeter.`
                    : "Erro ao submeter ficha. Tente novamente."}
                </NickConflictMessage>
              )}
            </>
          ) : null}
        </ActionsList>

        {deleteError && <DeleteErrorMessage>{deleteError}</DeleteErrorMessage>}
      </DetailPageTemplate>

      {showSubmitConfirm && (
        <ConfirmDialog
          message="Tem certeza que deseja submeter esta ficha para a campanha? Esta ação não pode ser desfeita."
          confirmLabel="Submeter"
          onConfirm={() => {
            setShowSubmitConfirm(false);
            handleSubmitSheet();
          }}
          onCancel={() => setShowSubmitConfirm(false)}
        />
      )}
    </>
  );
}

const CampaignHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 40px;
  margin-bottom: 20px;
`;

const CampaignTitle = styled.h1`
  font-family: ${fonts.sans};
  font-size: 42px;
  font-weight: 900;
  color: ${colors.textPrimary};
`;

const CampaignDate = styled.div`
  font-family: ${fonts.sans};
  font-weight: 400;
  text-align: right;
  color: ${colors.textPrimary};
  font-size: 18px;
  line-height: 1.5;
`;

const CampaignBriefDescription = styled.p`
  font-family: ${fonts.sans};
  font-weight: 400;
  font-size: 26px;
  line-height: 1.5;
  margin-bottom: 20px;
  color: ${colors.textPrimary};
  font-style: italic;
`;

const MatchesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
`;

const ActionsList = styled.div`
  position: relative;
  padding-bottom: 112px;
`;

const NickConflictMessage = styled.p`
  font-family: ${fonts.sans};
  font-size: max(2.6cqi, 12px);
  line-height: 1.2;
  color: ${colors.accentDanger};
  background: ${colors.overlaySoft};
  border-left: 3px solid ${colors.accentDanger};
  padding: 10px 14px;
  border-radius: 0 8px 8px 0;
  white-space: pre-line;

  @media (max-width: 609px) {
    margin: 12px 20px 0;
  }
`;

const DeleteErrorMessage = styled.p`
  font-family: ${fonts.sans};
  font-size: max(2.6cqi, 12px);
  line-height: 1.2;
  color: ${colors.accentDanger};
  background: ${colors.overlaySoft};
  border-left: 3px solid ${colors.accentDanger};
  padding: 10px 14px;
  border-radius: 0 8px 8px 0;
  white-space: pre-line;
  margin-top: 8px;
`;
```

- [ ] **Step 4: Rodar testes para confirmar que os 6 novos PASSAM**

```bash
npm test -- --reporter=verbose src/pages/__tests__/CampaignPage.test.tsx 2>&1 | tail -40
```

Esperado: todos os testes no arquivo passando, incluindo os 6 novos de `describe("delete campanha")`. Se algum falhar, corrigir antes de continuar.

- [ ] **Step 5: Rodar a suite completa**

```bash
npm test -- --reporter=verbose 2>&1 | tail -30
```

Esperado: todos os testes do projeto passando. Testes de `MatchPage.test.tsx` e os demais não devem ter regressões.

- [ ] **Step 6: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/pages/__tests__/CampaignPage.test.tsx src/pages/CampaignPage.tsx
git commit -m "feat(campaign): implement delete campaign flow in CampaignPage

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
