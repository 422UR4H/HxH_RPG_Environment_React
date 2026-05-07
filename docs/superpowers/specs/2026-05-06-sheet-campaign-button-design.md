# Design: Botão de Campanha na Ficha de Personagem

**Data:** 2026-05-06  
**Escopo:** Acesso à campanha associada (ou listagem pública) a partir de qualquer ficha de personagem em modo de visualização.

---

## Visão Geral

Cada ficha de personagem em modo de visualização exibe um `SheetCampaignButton` adaptativo no canto inferior direito. O botão leva diretamente à campanha associada se a ficha tiver `campaignUuid`, ou à listagem pública de campanhas ordenada por próxima partida se não tiver.

---

## 1. Tipos

### `src/types/characterSheet.ts`
Adicionar campo à interface `CharacterSheet`:
```ts
campaignUuid?: string;
```
O backend já retorna `campaign_uuid` na resposta de `GET /charactersheets/:id`; o `objToCamelCase` converte automaticamente.

### `src/types/campaigns.ts`
Adicionar:
```ts
export interface PublicCampaignSummary extends CampaignSummary {
  nextGameScheduledAt: string | null;
}
```
`CampaignSummary` já existente não é alterada — compatibilidade total com `CampaignsPage`.

---

## 2. Serviço

### `src/services/campaignService.ts`
Novo método:
```ts
listPublicCampaigns: (token: string) =>
  httpClient
    .get<{ campaigns: PublicCampaignSummary[] }>('/public/campaigns', config(token))
    .then((response) => {
      const data = objToCamelCase<{ campaigns: PublicCampaignSummary[] }>(response.data);
      return { ...response, data: data.campaigns || [] };
    }),
```

---

## 3. Hook

### `src/hooks/usePublicCampaigns.ts` (novo)
```ts
usePublicCampaigns(token: string | null)
```
- `queryKey: ['publicCampaigns', token]`
- `enabled: !!token`
- `retry: 1`
- Retorna `PublicCampaignSummary[]`

---

## 4. CampaignCard

### `src/components/atoms/CampaignCard.tsx`
- Adiciona prop opcional `nextGameScheduledAt?: string | null`
- Quando `undefined`: nada renderizado (comportamento atual preservado — `CampaignsPage` não passa essa prop)
- Quando `null`: exibe `"Sem partidas agendadas"` no `MetaInfo`
- Quando string (ISO): calcula via função utilitária interna e exibe:
  - `"Partida agendada para: DD/MM/YYYY (hoje)"`
  - `"Partida agendada para: DD/MM/YYYY (amanhã)"`
  - `"Partida agendada para: DD/MM/YYYY (em X dias)"`

Função utilitária interna ao arquivo (não exportada):
```ts
function formatNextGame(dateStr: string): string
```
Calcula diff em dias entre hoje (zerado em hh:mm:ss) e a data da partida.

---

## 5. SheetCampaignButton

### `src/features/sheet/SheetCampaignButton.tsx` (novo)
Cópia adaptada do `AdaptativeActionButton` com as seguintes diferenças:

**Scroll:** Usa `window` em vez de `containerRef`. Escuta `window` scroll e `resize`. Calcula float com:
```ts
window.scrollY + window.innerHeight < document.documentElement.scrollHeight - 30
```

**Posicionamento quando floating:**
```css
position: fixed;
bottom: 20px;
right: 20px;
```
(Em vez de `left: 20px`)

**Props:**
```ts
interface SheetCampaignButtonProps {
  label: string;
  onClick: () => void;
}
```
Sem `type` ou `containerRef`.

**`ButtonWrapper`:** `position: absolute; bottom: 0; left: 0; width: 100%; height: 91px; z-index: 10`

---

## 6. CharacterSheetTemplate

### `src/features/sheet/CharacterSheetTemplate.tsx`

**Interface `Data`** ganha:
```ts
onCampaignClick?: () => void;
hasCampaign?: boolean;
```

**Renderização condicional:** O `SheetCampaignButton` só é renderizado quando `sheetMode.headerMode === 'view'` e `onCampaignClick` está definido.

**Label do botão:** determinado pela prop `hasCampaign`:
- `true` → `"Ver Campanha"`
- `false` → `"Procurar Campanhas"`

**`SheetContainer`:** Ganha styled-prop `$hasCampaignButton?: boolean`:
```css
${({ $hasCampaignButton }) => $hasCampaignButton && 'padding-bottom: 103px;'}
```
Segue o mesmo padrão de `CharactersList` (`padding-bottom: 103px`) e `MatchesList` (`padding-bottom: 112px`), onde o `ButtonWrapper` tem `height: 91px` e `position: absolute; bottom: 0`.

---

## 7. CharacterSheetPage

### `src/pages/CharacterSheetPage.tsx`

Determina navegação com base em `charSheet?.campaignUuid` após carregamento:
- Truthy → `navigate('/campaigns/${campaignUuid}')`
- Falsy → `navigate('/campaigns/public', { state: { sheetId: id } })`

Passa ao template:
```ts
onCampaignClick={charSheet ? handleCampaignClick : undefined}
hasCampaign={!!charSheet?.campaignUuid}
```
O botão só aparece quando a ficha já carregou (evita flash).

---

## 8. PublicCampaignsPage

### `src/pages/PublicCampaignsPage.tsx` (novo)

**Rota:** `/campaigns/public` — adicionada **antes** de `/campaigns/:id` no `App.tsx`.

**Dados:** `usePublicCampaigns(token)`

**Ordenação:** A API já retorna as campanhas ordenadas (próxima partida primeiro, sem partida ao final). Sem ordenação client-side.

**Cards:** `CampaignCard` com `nextGameScheduledAt` passado. Clique navega para `/campaigns/${uuid}`.

**Navegação de volta:** Lê `useLocation().state?.sheetId`:
- Se presente → `PageHeader to={'/charactersheet/${sheetId}'}`
- Fallback → `PageHeader to="/charactersheets"`

**Visual:** Background `worldMap`, mesmo estilo da `CampaignsPage`. Título `"CAMPANHAS PÚBLICAS"`. Sem botão de criação.

**Auth guard:** `if (!token) return <Navigate to="/" replace />`

---

## 9. Roteamento

### `src/App.tsx`
Adicionar antes de `<Route path="/campaigns/:id" ...>`:
```tsx
<Route path="/campaigns/public" element={<PublicCampaignsPage />} />
```

---

## Fluxo Completo

```
CharacterSheetPage (/charactersheet/:id)
  → SheetCampaignButton clicado
    → campaignUuid presente → CampaignPage (/campaigns/:campaignId)
    → campaignUuid ausente  → PublicCampaignsPage (/campaigns/public)
                                → CampaignCard clicado → CampaignPage (/campaigns/:id)
                                → PageHeader back → CharacterSheetPage (/charactersheet/:sheetId)
```

---

## Arquivos Afetados

| Arquivo | Tipo de mudança |
|---|---|
| `src/types/characterSheet.ts` | Campo novo em `CharacterSheet` |
| `src/types/campaigns.ts` | Interface nova `PublicCampaignSummary` |
| `src/services/campaignService.ts` | Método novo `listPublicCampaigns` |
| `src/hooks/usePublicCampaigns.ts` | Arquivo novo |
| `src/components/atoms/CampaignCard.tsx` | Prop opcional nova + formatação |
| `src/features/sheet/SheetCampaignButton.tsx` | Arquivo novo (cópia adaptada) |
| `src/features/sheet/CharacterSheetTemplate.tsx` | Props novas + botão condicional |
| `src/pages/CharacterSheetPage.tsx` | Lógica de navegação + props ao template |
| `src/pages/PublicCampaignsPage.tsx` | Arquivo novo |
| `src/App.tsx` | Rota nova |
