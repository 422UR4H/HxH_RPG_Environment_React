# Pages

## Erros de API

O campo de erro do backend é `data.detail`, não `data.message`.

```tsx
onError: (err: any) => {
  console.error("[NomeDaPágina]", err.response?.data); // técnico → dev
  const detail: string = err.response?.data?.detail ?? "";
  setError(friendlyMessages[detail] || "Mensagem genérica em português.");
},
```

Mapeie os erros de validação esperados para mensagens em português. O que não estiver no mapa cai no fallback genérico.

## Dados assíncronos no formulário

Se o formulário depende de dados de uma query, bloqueie a renderização até eles chegarem (use o padrão loading guard):

```tsx
const { data: campaign, isLoading } = useCampaignDetails(token, id);
if (isLoading || !campaign) return <LoadingSpinner />;
// Aqui os dados estão garantidos — sem useEffect, sem undefined inicial
```

Evite inicializar campos do formulário com placeholder e corrigir depois com `useEffect`. Use o loading guard.
