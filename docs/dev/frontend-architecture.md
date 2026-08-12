# Arquitetura do frontend

> Visão geral para quem chega no projeto — ou volta a ele depois de um tempo fora.
> Este documento não substitui os `CLAUDE.md` espalhados pelo repo; ele é o ponto de
> entrada que aponta para eles. Se uma seção aqui e o `CLAUDE.md` mais específico
> divergirem, o `CLAUDE.md` específico está certo — atualize este arquivo para
> apontar pra lá.

## Visão geral: de onde vêm os dados até a tela

```
pages/  →  features/<feature>/  ↘
                                   components/{ions,atoms,molecules,organisms,templates}
hooks/ (React Query)  →  services/ (Axios, fronteira HTTP)  →  backend Go
```

- **`src/pages/`** — uma página por rota. Buscam dados via hooks e compõem
  templates + organisms. Objetivo: "thin orchestrators", sem styled-components
  de layout próprio nem lógica de negócio pesada — mas isso é uma meta, não um
  fato consumado; várias páginas (`HomePage`, `CampaignPage`, `GamePage`,
  `LobbyPage`, `EditMapPage`) ainda definem styled-components próprios. Ver
  `src/pages/CLAUDE.md` para o padrão de erro de API e o loading guard usado em
  formulários que dependem de query.
- **`src/features/<feature>/`** — UI e lógica específicas de uma única feature
  (`campaign`, `match`, `sheet`, `tactical-map`). Se um componente daqui passa a
  ser importado por uma 2ª feature, ele deve ser promovido para `components/` —
  não duplicado.
- **`src/components/`** — o UI Kit compartilhado, em 5 camadas Atomic Design
  (`ions` → `atoms` → `molecules` → `organisms` → `templates`). **Leia
  `src/components/CLAUDE.md` inteiro** antes de adicionar ou mover componente
  — ele documenta a regra `components/` vs `features/`, a regra de migração
  ("promote, don't duplicate", com o exemplo real de `CharacterSidebarItem` e
  `AdaptiveActionButton`), o que cada camada contém, os templates disponíveis e
  os tokens de design.
- **`src/hooks/`** — React Query por cima de `src/services/`. Ver seção seguinte.
- **`src/services/`** — a fronteira HTTP. Chamadas Axios cruas, sem lógica de UI.

## Como os dados entram: hooks + services

Todo hook de leitura em `src/hooks/` segue o mesmo padrão. Exemplo real,
`src/hooks/useMatchDetails.ts`:

```ts
export function useMatchDetails(token: string | null, matchId?: string) {
  return useQuery<Match>({
    queryKey: ["matchDetails", token, matchId],
    queryFn: () => matchService.getMatchDetails(token!, matchId!),
    enabled: !!token && !!matchId,
    retry: 1,
  });
}
```

Três invariantes que valem para (praticamente) todo hook do diretório:

1. **`queryKey` inclui `token` e o id do recurso** — assim o cache invalida
   sozinho em logout/troca de sessão/troca de recurso.
2. **`enabled: !!token`** (e `&& !!id` quando o hook depende de um id) — a query
   não dispara sem os pré-requisitos.
3. **`retry: 1`** — em todo hook, e é também o default global em `main.tsx`.

React Query é só para estado de servidor. Estado de UI local continua em
`useState`/context.

### `src/services/`: sem conversão de case

Backend e frontend falam **camelCase dos dois lados** desde a Fase 8
(2026-08) — o backend Go reescreveu as tags `json` de `internal/app/**` para
camelCase; o frontend simplesmente parou de converter. `src/utils/caseConverter.ts`
(as antigas `objToSnakeCase`/`objToCamelCase`) foi deletado e **não existe
mais** — não reintroduza um conversor genérico.

Um service típico é um passthrough direto, sem tradução nenhuma. Exemplo real,
`src/services/matchService.ts`:

```ts
getMatchDetails: (token: string, matchId: string): Promise<Match> =>
  httpClient
    .get<{ match: Match }>(`/matches/${matchId}`, config(token))
    .then(({ data }) => data.match),
```

Não há DTO por endpoint nem camada de mapeamento — `src/types/` declara o
shape 1:1 do que o wire manda, e o service lê `data.<chave>` direto.

Para o mapa completo endpoint ↔ struct Go ↔ type do front ↔ service, com
achados de bugs estruturais reais (não de case) encontrados na auditoria, veja
**`docs/dev/http-boundary-inventory.md`**.

**Uma exceção pontual:** `src/utils/lowercaseFirstKeys.ts`, usada por
`characterSheetsService.ts`/`characterClassesService.ts`, faz lowercase da
primeira letra das chaves de um punhado de mapas de resposta (`abilities`,
`physicalAttributes`, `commonProficiencies` etc.). Essas chaves são valores de
enum Go via `String()` (ex.: `"Resistance"`), não nomes de campo de struct —
a migração de tags da Fase 8 não tinha como alcançá-las, porque não são
schema, são valor de runtime. Não é uma reencarnação do conversor genérico:
é deliberadamente estreita (só chaves de topo do `Record` recebido, sem
recursão) e vive nos dois pontos exatos da fronteira onde esse mismatch
acontece. Leia o cabeçalho do próprio arquivo antes de mexer nele.

### Datas: nunca `new Date()` em cima de string do wire

O backend manda datas ISO (`"2026-08-09T14:30:00Z"` ou `"2026-08-09"`) já no
dia que o usuário deve ver. `new Date(iso)` converte para o timezone local do
navegador, o que pode **deslocar o dia** — `"2026-08-09T23:00:00Z"` vira 10/08
em timezones à frente de UTC. `src/utils/date.ts` centraliza a formatação
lendo os dígitos direto da string (`formatDateBR`, `formatDateTimeBR`,
`toDateInputValue`, `toDateTimeLocalValue`); nenhuma delas passa por `Date`.
Essa regra só vive hoje como comentário no topo do arquivo — é fácil alguém
"melhorar" um desses call sites trocando por `toLocaleDateString` e quebrar em
silêncio (sem erro de tipo, sem teste falhando fora do timezone de quem
escreveu). Antes de tocar em `date.ts`, leia o comentário do arquivo inteiro.

## Como erros de API são tratados

O backend usa huma, que responde no formato RFC7807 (`problem+json`): o campo
com a mensagem específica do erro é `detail` — não existe `data.message`.
`src/utils/apiError.ts` exporta `getApiErrorDetail(err)`, que:

- confirma que é um erro Axios e que há `response`;
- confirma que `response.data` é um objeto e que `detail` é uma string não-vazia;
- devolve essa string, ou `null` quando não há mensagem aproveitável — para o
  chamador aplicar o próprio fallback com `??`.

É a forma única de ler erro de API no front hoje — 7 call sites hoje, quase
todos em páginas (+ `TacticalMapEditor`, em `src/features/tactical-map/`),
todos no mesmo formato:

```tsx
// src/pages/LoginPage.tsx:45
setError(getApiErrorDetail(err) ?? "Erro ao fazer login");
```

```tsx
// src/pages/EditCampaignPage.tsx:38-39
if (isApiError(err, 422)) {
  const detail = getApiErrorDetail(err);
  return getCampaignValidationMessage(detail ?? "") || "Dados inválidos. ...";
}
```

Páginas que precisam de mensagens específicas por código de erro (403, 404,
422 etc.) combinam `getApiErrorDetail` com verificações de status
(`isApiError`) e mapeiam o `detail` para uma mensagem amigável em português —
ver `src/pages/CLAUDE.md` para o padrão de página completo, incluindo o
loading guard para formulários dependentes de query.

## Zona pixel-tuned — não mexer sem motivo

Um punhado de arquivos tem valores de CSS ajustados **na mão, pixel a pixel**,
para compensar SVGs geometricamente imperfeitos (bordas vazias, falta de
centralização):

- `src/components/molecules/CharacterSheetHeader.tsx`
- `src/features/sheet/MentalsDiagram.tsx`
- `src/features/sheet/PhysicalsDiagram.tsx`
- `src/features/sheet/NenPrinciplesDiagram.tsx`

Substituir esses valores por tokens, padronizar padding ou "limpar" números
que parecem arbitrários **quebra o alinhamento visual** — eles não são
arbitrários, são a compensação para o SVG específico. Lista completa e
racional em `src/components/CLAUDE.md` (seção "Zona pixel-tuned"); consulte
lá antes de tocar em qualquer um desses arquivos.

## A camada Pixi do mapa tático: sem cobertura de teste

Toda a pilha Pixi do mapa tático vive em `src/features/tactical-map/`
(`TacticalMapStage`, `MapHandlesLayer`, `WallsLayer`, `PieceSprite` e o resto).

`src/test/setup.ts` mocka `@pixi/react` (todo componente Pixi vira uma
`<div>`) e `ResizeObserver` com dimensão zero — então essa camada inteira
**não é coberta por teste automatizado**. Mudança ali exige **verificação
visual no browser**, não só passar `npm test`.

## Rodando o projeto

```bash
npm run dev            # Vite dev server (HMR)
npm run build           # tsc -b && vite build — erro de TS quebra o build
npm run lint             # eslint .
npm test                # vitest run — suíte completa
npm run test:watch       # vitest em watch
npm run test:coverage    # vitest run --coverage
npm run preview          # serve o build de produção localmente
```

## Onde ir a partir daqui

- `src/components/CLAUDE.md` — arquitetura completa do UI Kit (5 camadas,
  regra `components/` vs `features/`, tokens, zona pixel-tuned).
- `src/pages/CLAUDE.md` — padrão de erro de API e loading guard em formulário.
- `src/features/sheet/CLAUDE.md` — convenções específicas da ficha de
  personagem (factories, distribute utils, `SheetMode`).
- `docs/dev/tactical-map/` — a pilha Pixi do mapa tático em detalhe
  (`overview`, `pixi-stack`, `coordinates`, `state-management`,
  `sync-and-delta`, `testing`).
- `docs/dev/http-boundary-inventory.md` — mapa completo endpoint ↔ struct Go
  ↔ type do front ↔ service, com os bugs estruturais conhecidos da fronteira.
- `CLAUDE.md` (raiz deste repo) — auth/sessão, convenções de TypeScript,
  styling, e o resto que não cabe aqui.
