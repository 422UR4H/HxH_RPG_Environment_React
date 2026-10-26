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

Se o formulário depende de dados de uma query, bloqueie a renderização até eles chegarem. Ordem dos guards (depois do último hook): token → erro → carregando → dado ausente.

```tsx
if (!token) return <Navigate to="/" replace />;
if (isError) {
  return isApiError(error, 404)
    ? <PageNotFound title="Campanha não encontrada" back={back} />
    : <PageError title="Não foi possível carregar a campanha" onRetry={() => void refetch()} back={back} />;
}
if (isPending) return <PageLoading />;
if (!campaign) return <PageNotFound title="Campanha não encontrada" back={back} />;
// Aqui os dados estão garantidos — sem useEffect, sem undefined inicial
```

O erro vem **antes** do carregando: `isLoading || !campaign` mostra spinner para sempre quando a query falha. No React Query v5 uma query desligada (`enabled: false`) fica `isPending` para sempre, por isso o guard de token/id vem primeiro. Componentes em `src/components/templates/PageState.tsx` (famílias `world`/`sheet`).

Evite inicializar campos do formulário com placeholder e corrigir depois com `useEffect`. Use os guards acima.
