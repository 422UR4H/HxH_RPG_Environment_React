# Delete Campaign — Front-end Design Spec

**Goal:** Implementar o fluxo de exclusão de campanha no front-end, seguindo o padrão existente de `MatchPage` / `ManageButton`.

**Architecture:** Três camadas — service → hook → página. `ManageButton` recebe `deleteDisabledReason` opcional para mostrar o motivo inline quando a exclusão está bloqueada. `MatchBottomActions` é extraído para `components/molecules/BottomActions` e reutilizado em ambas as páginas.

**Tech Stack:** React + TypeScript, @tanstack/react-query (useMutation), styled-components, axios, Vitest + MSW.

---

## API Contract

`DELETE /campaigns/{uuid}` — `docs/dev/api/campaign.md`

| Status | Situação |
|---|---|
| 204 | Campanha deletada |
| 400 | UUID inválido |
| 401 | Sem JWT |
| 403 | Usuário não é o master |
| 422 | Ao menos uma partida já foi iniciada |
| 500 | Erro interno |

---

## Arquivos

### Novos
- `src/hooks/useDeleteCampaign.ts`

### Modificados
- `src/components/molecules/BottomActions.tsx` ← renomeado/movido de `src/features/match/MatchBottomActions.tsx`
- `src/components/molecules/ManageButton.tsx` ← adicionar `deleteDisabledReason?: string`
- `src/services/campaignService.ts` ← adicionar `deleteCampaign`
- `src/features/match/MatchPage.tsx` ← atualizar import
- `src/pages/CampaignPage.tsx` ← integrar delete + reestruturar ActionsList
- `src/pages/__tests__/CampaignPage.test.tsx` ← adicionar testes

---

## Componentes

### `ManageButton` — prop adicional

```ts
interface ManageButtonProps {
  isFree: boolean;
  deleteDisabledReason?: string; // NEW
  isFloating: boolean;
  confirmMessage: string;
  onEdit: () => void;
  onDelete: () => void;
}
```

Lógica do menu:
- `isFree === true` → item "Excluir" ativo (comportamento atual)
- `!isFree && deleteDisabledReason` → item "Excluir" visível, desabilitado, com `deleteDisabledReason` em texto menor abaixo
- `!isFree && !deleteDisabledReason` → item "Excluir" oculto (backward-compat; `MatchPage` não quebra)

### `BottomActions` (extraído de `MatchBottomActions`)

Props idênticas ao atual `MatchBottomActions`. Apenas o nome e o caminho mudam:
- De: `src/features/match/MatchBottomActions.tsx`
- Para: `src/components/molecules/BottomActions.tsx`

`MatchPage` atualiza o import. Sem mudança de lógica.

---

## Service

```ts
deleteCampaign: (token: string, id: string): Promise<void> =>
  httpClient
    .delete(`/campaigns/${id}`, config(token))
    .then(() => undefined),
```

---

## Hook

```ts
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

---

## CampaignPage — mudanças

### Lógica nova

```ts
const hasStartedMatch = (campaign.matches ?? []).some(m => !!m.gameStartAt);

const { mutate: deleteCampaign } = useDeleteCampaign(token, id);

const [deleteError, setDeleteError] = useState<string | null>(null);

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
```

### Reestruturação do JSX

`AdaptiveActionButton "Criar Partida"` sai de dentro de `MatchesList` e vai para `BottomActions.primaryButton`.
`AdaptiveActionButton "Submeter Ficha"` e mensagens de erro do player migram para dentro de `ActionsList`.

```jsx
<MatchesList>
  {/* só os itens de partida */}
  {(campaign.matches ?? []).map((match) => <MatchItem ... />)}
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
      {/* nick conflict / submit errors */}
    </>
  ) : null}
</ActionsList>

{deleteError && <DeleteErrorMessage>{deleteError}</DeleteErrorMessage>}
```

`MatchesList` perde o `padding-bottom: 112px` (que vai para `ActionsList`).

---

## Testes (CampaignPage.test.tsx)

Novos casos no `describe("como Master")`:

| Teste | Ação | Expectativa |
|---|---|---|
| exibe "Gerenciar" para master | render como master | `getByText(/Gerenciar/i)` |
| não exibe "Gerenciar" para player | render como player | `queryByText(/Gerenciar/i)` null |
| delete com sucesso navega para /campaigns | mock DELETE 204 → clicar Gerenciar → Excluir → confirmar | `mockNavigate` chamado com `/campaigns` |
| delete 422 exibe mensagem de erro | mock DELETE 422 → confirmar delete | mensagem "partida iniciada" visível |
| delete com partida iniciada desabilita Excluir | campaign com match.gameStartAt → Gerenciar | item "Excluir" desabilitado + reason visível |
| "Criar Partida" em BottomActions chama navigate | clicar no botão | `mockNavigate` chamado |
