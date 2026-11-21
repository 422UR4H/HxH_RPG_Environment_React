# Pages

## Erros de API

O campo de erro do backend é `data.detail`, não `data.message`. A forma única de ler
isso é `getApiErrorDetail(err)` (`src/utils/apiError.ts`) — não acesse
`err.response?.data` direto, e não tipe o erro como `any` (é `unknown`).

```tsx
onError: (err: unknown) => {
  setError(getApiErrorDetail(err) ?? "Fallback em português.");
},
```

O `detail` do backend já é a frase de tela, em português (back PR #115): mostre-o como veio,
sem dicionário de tradução no front. O fallback em português só vale para quando não há
`detail` (rede caiu, resposta sem corpo). Nunca compare o texto do `detail` para decidir
comportamento — use o status com `isApiError(err, status)`.

## Dados assíncronos no formulário

Se o formulário depende de dados de uma query, bloqueie a renderização até eles chegarem. Ordem dos guards (depois do último hook): token → erro → carregando → dado ausente.

```tsx
if (!token) return <Navigate to="/" replace />;
if (isError) {
  return isApiError(error, 404)
    ? <PageNotFound title="Campanha não encontrada" back={back} />
    : <PageError title="Não foi possível carregar a campanha" onRetry={() => void refetch()} back={back} />;
}
if (isPending) return <PageLoading label="Carregando campanha…" />;
if (!campaign) return <PageNotFound title="Campanha não encontrada" back={back} />;
// Aqui os dados estão garantidos — sem useEffect, sem undefined inicial
```

O erro vem **antes** do carregando: `isLoading || !campaign` mostra spinner para sempre quando a query falha. No React Query v5 uma query desligada (`enabled: false`) fica `isPending` para sempre, por isso o guard de token/id vem primeiro. Componentes em `src/components/templates/PageState.tsx` (famílias `world`/`sheet`).

Evite inicializar campos do formulário com placeholder e corrigir depois com `useEffect`. Use os guards acima.
