# Pages

## Erros de API

O campo de erro do backend é `data.detail`, não `data.message`. A forma única de ler
isso é `getApiErrorDetail(err)` (`src/utils/apiError.ts`) — não acesse
`err.response?.data` direto, e não tipe o erro como `any` (é `unknown`).

```tsx
onError: (err: unknown) => {
  const detail = getApiErrorDetail(err);
  setError(friendlyMessages[detail ?? ""] || "Mensagem genérica em português.");
},
```

Mapeie os erros de validação esperados para mensagens em português. O que não estiver no mapa cai no fallback genérico. Ver `src/pages/EditCampaignPage.tsx` para um exemplo real combinando isso com `isApiError` para diferenciar por status code.

## Dados assíncronos no formulário

Se o formulário depende de dados de uma query, bloqueie a renderização até eles chegarem (use o padrão loading guard):

```tsx
const { data: campaign, isLoading } = useCampaignDetails(token, id);
if (isLoading || !campaign) return <LoadingSpinner />;
// Aqui os dados estão garantidos — sem useEffect, sem undefined inicial
```

Evite inicializar campos do formulário com placeholder e corrigir depois com `useEffect`. Use o loading guard.
