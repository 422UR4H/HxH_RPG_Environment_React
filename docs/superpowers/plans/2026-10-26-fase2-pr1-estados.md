# Estados de espera e erro (PR 1 da fase 2) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** trocar os estados de carregando e erro de página inteira por um componente único e desenhado, acabar com os carregamentos eternos e fazer o app aguentar o servidor dormindo do sistema online.

**Architecture:** um módulo de template (`PageState`) com três componentes (carregando, erro, não encontrado) e duas famílias de fundo (`world`, `sheet`). Um serviço de aquecimento dispara em segundo plano a cada troca de rota, com intervalo mínimo entre disparos. Uma política de reconexão por tempo, pura e testada, é usada pelos dois hooks de socket.

**Tech Stack:** React 19, TypeScript strict (`verbatimModuleSyntax`), styled-components, React Query v5, react-router 6, Vitest + Testing Library + MSW.

**Spec:** `docs/superpowers/specs/2026-10-26-front-fase2-auditoria-tcc-design.md`, seção “PR 1”. Ids dos achados em `docs/audits/2026-10-auditoria-tcc.md`. Maquetes aprovadas em `docs/audits/2026-10-auditoria-tcc/fase2/est-*.webp`.

## Global Constraints

- Cor só por token de `src/styles/tokens.ts`. Token semântico novo aponta para cor que já existe na `palette` e leva um comentário com o papel (`src/styles/CLAUDE.md`). O teste `noRawColors` cobra.
- `import type` para tipos; sem `any`; erros de API via `isApiError` (`src/services/httpClient.ts`) e `getApiErrorDetail`.
- Textos e comentários em português. Reticência é o caractere `…`, nunca três pontos (TXT-05).
- Antes de cada commit: `npm run typecheck && npm run lint && npm test` passando (lint com zero warning).
- Git: só `git add` dos arquivos da tarefa e `git commit`, no branch `fix/ux-estados`. Nada de `stash`, `checkout`, `reset`, `rebase` ou `push`. Mensagem no estilo do repo (`fix(ui): …`, em português), terminando com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Não suba, mate nem reinicie servidores. Não rode `dev-checkout.sh`. Não mexa nas worktrees `end-match` (sessão paralela).
- Não toque na zona pixel-tuned (`CharacterSheetHeader.tsx`, `MentalsDiagram.tsx`, `PhysicalsDiagram.tsx`, `NenPrinciplesDiagram.tsx`).
- Onde a spec diz “pergunte”, **pare e reporte** ao coordenador em vez de escolher.
- Textos fixados por este plano (use exatamente):
  - `SERVER_WAKING_HINT` = `O servidor está acordando. Isso pode levar até um minuto.`
  - `GAME_SERVER_WAKING` = `Acordando o servidor da mesa… pode levar até um minuto.`
  - `GAME_SERVER_UNREACHABLE` = `Não foi possível conectar ao servidor da mesa.`
  - Botão de repetir: `Tentar de novo`. Mensagem padrão de erro: `Verifique a conexão e tente de novo.`
  - 404 de rota: título `Página não encontrada`, mensagem `O endereço pode estar errado, ou a página saiu do ar.`, ação `Ir para o início`.

## Review Focus

1. **Query desligada sem token ou sem id** (React Query v5 deixa `isPending` verdadeiro para sempre): toda página tem que redirecionar ou mostrar um estado com saída, nunca “Carregando…” eterno. Testes nas tarefas 2 e 3.
2. **404 × outros erros:** um recurso inexistente mostra “… não encontrada” com o caminho de volta, nunca “Tentar de novo” (repetir daria o mesmo 404). Testes nas tarefas 3 e 4.
3. **“Tentar de novo” refaz a requisição de verdade** e sai do estado de erro quando ela passa. Teste na tarefa 2.
4. **Conexão que volta zera a janela:** depois de uma reconexão bem-sucedida, uma queda horas depois ganha uma janela nova de 3 min, em vez de herdar a contagem antiga. Testes nas tarefas 7, 8 e 9.
5. **Códigos especiais do socket não viram “acordando”:** `4001`/`lobby_not_open`, `connection_replaced`, expulsão, lobby encerrado, sala do mestre fechada (`waiting`) e fechamento normal (1000/1001) mantêm o comportamento de hoje. Testes nas tarefas 8 e 9.

---

### Task 1: Tokens e o componente de estado de página

**Files:**
- Modify: `src/styles/tokens.ts` (grupo `feedback`)
- Create: `src/hooks/useDelayedFlag.ts`
- Test: `src/hooks/__tests__/useDelayedFlag.test.ts`
- Create: `src/components/templates/PageState.tsx` (e `PageState.styles.ts` se os estilos passarem de ~150 linhas)
- Create: `src/services/serverWake.ts`, só com as constantes de texto por enquanto (a tarefa 6 acrescenta a função)

**Interfaces:**
- Produces:
  - `colors.feedbackProgress` → `palette.green500` (“indicador de carregamento”) e `colors.feedbackDangerText` → `palette.red500` (“título de erro sobre fundo escuro”).
  - `useDelayedFlag(ms: number): boolean`: `false` até passar `ms` desde a montagem e `true` depois. Limpa o timer ao desmontar.
  - Em `src/services/serverWake.ts`: `export const SERVER_WAKING_HINT`, `GAME_SERVER_WAKING` e `GAME_SERVER_UNREACHABLE` (textos das Global Constraints).
  - Em `src/components/templates/PageState.tsx`:
    - `export type PageBackdrop = "world" | "sheet";`
    - `export type PageStateLink = { label: string; to: string };`
    - `export function PageLoading(props: { label: string; backdrop?: PageBackdrop; headerColor?: string }): JSX.Element`
    - `export function PageError(props: { title: string; message?: string; onRetry?: () => void; back?: PageStateLink; backdrop?: PageBackdrop; headerColor?: string }): JSX.Element`
    - `export function PageNotFound(props: { title: string; message?: string; back: PageStateLink; backdrop?: PageBackdrop; headerColor?: string }): JSX.Element`
    - O `backdrop` padrão é `"world"`. Com `headerColor`, a moldura é sempre o `PageHeader` naquela cor (a página que tem cabeçalho não o perde no estado); sem ele, vale a moldura da família.

- [ ] **Step 1: Teste do `useDelayedFlag`** — `it("fica falso antes do prazo e verdadeiro depois")`: com `vi.useFakeTimers()`, `renderHook(() => useDelayedFlag(3000))`; o valor é `false`; `act(() => vi.advanceTimersByTime(2999))` e ainda `false`; avança 1 ms e fica `true`. `it("não dispara depois de desmontar")`: desmonta antes do prazo, avança 5000 ms e não há aviso de update em componente desmontado (`vi.spyOn(console, "error")` sem chamadas).
- [ ] **Step 2:** `npx vitest run src/hooks/__tests__/useDelayedFlag.test.ts` falha (módulo inexistente).
- [ ] **Step 3: Implemente `useDelayedFlag`**, os dois tokens e as constantes de `serverWake.ts`.
- [ ] **Step 4:** o teste passa.
- [ ] **Step 5: Implemente `PageState.tsx`**, conforme a spec (PR 1, “Componente de estado de página”) e os valores de “Maquetes aprovadas”:
  - **Casca.** Ocupa a viewport (`min-height: 100dvh`), em coluna, com `font-family: ${fonts.sans}`.
  - **Moldura.** Na família `world`, `PageHeader` com `backgroundColor={colors.brandPrimary}`; na `sheet`, só o `BackButton` fixo.
  - **Palco.** O fundo da família (`worldmap.png` ou `space.png`, `cover`, centrado) sobre a cor de base (`colors.surfaceSidebar` no `world`, `colors.surfaceHeaderDark` no `sheet`). A cor de base fica por baixo, para o texto continuar legível se a imagem falhar.
  - **Cartão.** No `world`, fundo `alpha(colors.surfaceSidebar, 0.94)` com borda `colors.borderInput`; no `sheet`, `alpha(colors.surfaceHeaderDark, 0.72)` com borda `colors.surfaceControl`.
  - **Indicador.** Arco `colors.feedbackProgress` sobre trilha `colors.overlayHighlight`, girando. Com `prefers-reduced-motion: reduce`, não gira.
  - **`PageLoading`.** Mostra `label` e, quando `useDelayedFlag(3000)` vira verdadeiro, a linha `SERVER_WAKING_HINT`. O cartão tem `role="status"` e `aria-live="polite"`.
  - **`PageError`.** Ícone SVG inline (círculo com `!`, traço `colors.feedbackDangerText`, `aria-hidden`), título em `<h1>` na cor `colors.feedbackDangerText`, a mensagem (padrão: `Verifique a conexão e tente de novo.`) em `colors.textMuted`, “Tentar de novo” (botão principal `colors.brandAccent` com texto `colors.textPrimary`, só quando há `onRetry`) e o `back` (`<Link>` com estilo de botão secundário com contorno `alpha(colors.textPrimary, 0.45)`). O cartão tem `role="alert"`.
  - **`PageNotFound`.** Título em `<h1>`, na cor `colors.textPrimary`, a mensagem e o `back` como ação principal.
  - **Ações.** Lado a lado, cada uma tem a largura do próprio texto. Abaixo de 480 px empilham, as duas com largura total e a principal em cima.
- [ ] **Step 6:** `npm run typecheck && npm run lint` passam.
- [ ] **Step 7: Commit** — `fix(ui): componente único para os estados de página (carregando, erro, não encontrado)`.

### Task 2: Listas (campanhas, públicas, personagens) e o template de lista

**Files:**
- Modify: `src/components/templates/ListPageTemplate.tsx`
- Modify: `src/pages/CampaignsPage.tsx`, `src/pages/PublicCampaignsPage.tsx`, `src/pages/CharacterSheetsPage.tsx`
- Test: `src/pages/__tests__/CampaignsPage.test.tsx`, `PublicCampaignsPage.test.tsx`, `CharacterSheetsPage.test.tsx`

**Interfaces:**
- Consumes: `PageLoading`, `PageError` e `PageBackdrop` (tarefa 1).
- Produces: `ListPageTemplate` ganha `onRetry?: () => void`, `backdrop?: PageBackdrop` e `errorBack?: PageStateLink`. O `errorLabel` vira o título do erro, e o `headerColor` que ele já recebe é repassado aos estados.

- [ ] **Step 1: Ajuste os testes**, com os textos novos:
  - **`CampaignsPage`**:
    - carregando mostra `Carregando campanhas…` (com `…`);
    - erro mostra `Não foi possível carregar as campanhas`;
    - `it("Tentar de novo refaz a busca")`: o handler MSW responde 500 na primeira chamada e a lista na segunda; clicar “Tentar de novo” mostra o card da campanha, e o handler foi chamado 2 vezes;
    - `it("sem token redireciona para o login")`: `renderWithProviders(..., { token: null })` com uma rota `/` que renderiza “login”; espera ver “login”.
  - **`PublicCampaignsPage`**: `Carregando campanhas públicas…` e `Não foi possível carregar as campanhas públicas`.
  - **`CharacterSheetsPage`**: `Carregando personagens…` e `Não foi possível carregar os personagens`.
- [ ] **Step 2:** os testes alterados falham.
- [ ] **Step 3: Implemente.**
  - O `ListPageTemplate` usa `PageLoading`/`PageError`, repassando `onRetry`, `backdrop` e `errorBack` (padrão `{ label: "Voltar para o início", to: "/home" }`).
  - Cada página passa `refetch` do próprio hook como `onRetry`, os rótulos da Step 1 e o `backdrop`: `sheet` na `CharacterSheetsPage`, `world` nas outras.
  - `CampaignsPage` ganha o guarda `if (!token) return <Navigate to="/" replace />`, antes de qualquer outro.
- [ ] **Step 4:** os testes das três páginas passam.
- [ ] **Step 5: Commit** — `fix(ui): listas com estado de carregando e erro desenhado e "Tentar de novo"`.

### Task 3: Páginas de detalhe e de formulário que carregam dados

**Files:**
- Modify: `src/pages/CampaignPage.tsx`, `MatchPage.tsx`, `EditCampaignPage.tsx`, `EditMatchPage.tsx`, `CreateMatchPage.tsx`, `CreateCampaignPage.tsx`, `CreateMapPage.tsx`
- Test: `src/pages/__tests__/CampaignPage.test.tsx`, `MatchPage.test.tsx`, `CreateMatchPage.test.tsx`, `CreateCampaignPage.test.tsx`, `CreateMapPage.test.tsx` (crie casos novos onde o arquivo não cobre)

**Interfaces:**
- Consumes: `PageLoading`, `PageError` e `PageNotFound` (tarefa 1); `isApiError(err, 404)`.

- [ ] **Step 1: Testes.**
  - **`CampaignPage`:**
    - `it("404 mostra 'Campanha não encontrada' com o caminho para a lista")`: a API responde 404; aparece o título, e o link `Ver campanhas` aponta para `/campaigns`. Não há “Tentar de novo”.
    - `it("500 mostra o erro com 'Tentar de novo'")`.
    - `it("sem token redireciona para o login")`.
  - **`MatchPage`:** o 404 mostra `Partida não encontrada`, com `Voltar para a campanha` → `/campaigns/:campaignId`; o 500 mostra `Não foi possível carregar a partida` e “Tentar de novo”.
  - **`CreateCampaignPage` e `CreateMapPage`:** sem token, redirecionam para o login.
  - **`CreateMatchPage`:** a falha ao carregar a campanha mostra `PageError` com “Tentar de novo”.
- [ ] **Step 2:** os testes novos falham.
- [ ] **Step 3: Implemente.**
  - **Ordem do guarda em todas essas páginas:** token → erro (404 com `PageNotFound`, o resto com `PageError` e `onRetry: refetch`) → carregando (`PageLoading`) → dado ausente (`PageNotFound`). O guarda de erro vem **antes** do de carregando.
  - **Rótulos:** `Carregando campanha…`, `Carregando partida…`, `Não foi possível carregar a campanha`, `Não foi possível carregar a partida`, `Campanha não encontrada` e `Partida não encontrada`.
  - **Caminhos de volta:** campanha → `Ver campanhas` (`/campaigns`); partida → `Voltar para a campanha` (`/campaigns/:campaignId`); formulários de editar → o mesmo da página que eles editam.
  - **Guardas novos:** `CampaignPage`, `CreateCampaignPage` e `CreateMapPage` ganham o guarda de token.
  - **Varredura:** confira toda página da lista de `src/pages` com `isPending` sobre query que pode estar desligada. Corrija também as que este plano não cita, e liste-as no relatório da tarefa.
- [ ] **Step 4:** os testes das páginas tocadas passam.
- [ ] **Step 5: Commit** — `fix(ui): detalhe e formulários com estados desenhados, 404 próprio e guarda de sessão`.

### Task 4: Ficha (família `sheet`)

**Files:**
- Modify: `src/features/sheet/CharacterSheetTemplate.tsx` (só o começo do render e o tipo de `data`; nada da zona pixel-tuned)
- Modify: `src/pages/CharacterSheetPage.tsx`, `EditCharacterSheetPage.tsx`, `CreateCharacterSheetPage.tsx`, `CreateNpcPage.tsx`
- Test: `src/pages/__tests__/CharacterSheetPage.test.tsx`, `CreateCharacterSheetPage.test.tsx`

**Interfaces:**
- Consumes: os três componentes da tarefa 1, com `backdrop="sheet"`.
- Produces: `data` do `CharacterSheetTemplate` ganha `onRetry?: () => void` e `notFound?: boolean`. `error` continua `string | null` e vira o título do erro.

- [ ] **Step 1: Testes.**
  - **`CharacterSheetPage`:** o 404 mostra `Ficha não encontrada`, com `Voltar para personagens` → `/charactersheets` e sem “Tentar de novo”; o 500 mostra `Não foi possível carregar a ficha` e “Tentar de novo”.
  - **`CreateCharacterSheetPage`:** a falha ao carregar as classes mostra `Não foi possível carregar as classes`, com “Tentar de novo”.
- [ ] **Step 2:** os testes falham.
- [ ] **Step 3: Implemente.**
  - **Fora da mesa** (`!sheetMode.embedded`), o template usa `PageLoading` (`Carregando ficha…`), `PageError` e `PageNotFound` com `backdrop="sheet"`.
  - **Embutido na mesa**, o estado continua compacto, dentro do painel. Os estilos locais `LoadingContainer`/`ErrorContainer` ficam só para esse caso, com o texto de erro em `colors.feedbackDangerText`.
  - **As páginas** passam `refetch` como `onRetry` e `notFound: isApiError(error, 404)`.
- [ ] **Step 4:** os testes da ficha e o `GamePlayerPage.test.tsx` (painel embutido) passam.
- [ ] **Step 5: Commit** — `fix(ui): ficha com estados no fundo do espaço e 404 próprio`.

### Task 5: Mesa, lobby, editor de mapa, rota 404 e Suspense

**Files:**
- Modify: `src/pages/GamePage.tsx`, `LobbyPage.tsx` (só o guarda de carregamento e erro), `EditMapPage.tsx`, `src/App.tsx`
- Create: `src/pages/NotFoundPage.tsx`
- Test: `src/pages/__tests__/GamePage.test.tsx`, `LobbyPage.test.tsx`, `EditMapPage.test.tsx`; um `src/pages/__tests__/NotFoundPage.test.tsx` novo

- [ ] **Step 1: Testes.**
  - **`GamePage`:** a API da partida responde 500 e aparece `Não foi possível carregar a partida`, nunca “Carregando partida…” para sempre; o 404 mostra `Partida não encontrada`.
  - **`EditMapPage`:** a API do mapa responde 500 e aparece `Não foi possível carregar o mapa`.
  - **`NotFoundPage`:** renderiza `Página não encontrada`, e `Ir para o início` aponta para `/home` com token e para `/` sem token.
- [ ] **Step 2:** os testes falham.
- [ ] **Step 3: Implemente.**
  - **`GamePage`, `LobbyPage` e `EditMapPage`** tratam erro antes do carregando. Usam a família `world` e voltam para a página da partida (`/campaigns/:campaignId/matches/:matchId`) ou da campanha. Rótulos de carregando: `Carregando partida…`, `Carregando lobby…` e `Carregando mapa…`.
  - **`App.tsx`:** todo `Suspense` usa `<PageLoading label="Carregando…" />`, inclusive o da demo, e há uma `<Route path="*" element={<NotFoundPage />} />`.
  - **`NotFoundPage`:** usa `PageNotFound` com os textos das Global Constraints.
- [ ] **Step 4:** os testes passam.
- [ ] **Step 5:** se `src/components/atoms/PageStates.tsx` não tiver mais nenhum import (`grep -rn "atoms/PageStates" src`), apague o arquivo.
- [ ] **Step 6: Commit** — `fix(ui): mesa, lobby e editor sem carregando eterno; rota 404; Suspense em português`.

### Task 6: Acordar os servidores cedo

**Files:**
- Modify: `src/services/serverWake.ts`
- Test: `src/services/__tests__/serverWake.test.ts`
- Modify: `src/App.tsx` (um componente `ServerWarmUp` dentro do `BrowserRouter`)

**Interfaces:**
- Produces:
  - `gameHttpOrigin(wsUrl: string | undefined): string | null`: `ws://localhost:8081` → `http://localhost:8081`; `wss://x.onrender.com/ws` → `https://x.onrender.com`; vazio ou inválido → `null`.
  - `warmUpServers(now?: number): void`: dispara `fetch(`${apiUrl}/readiness`, { mode: "no-cors" })` e `fetch(`${gameOrigin}/health`, { mode: "no-cors" })`, os dois sem `await` e com a rejeição engolida. Não faz nada se o último disparo foi há menos de `WARM_UP_INTERVAL_MS = 300_000`, contados num estado de módulo (por aba). A `apiUrl` sai da mesma fonte do `httpClient` (exporte a constante de lá, sem duplicá-la).
  - `resetWarmUpForTests(): void`.

- [ ] **Step 1: Testes.**
  - `gameHttpOrigin`: os três casos acima.
  - `warmUpServers` chama `fetch` duas vezes, com `mode: "no-cors"`, nas URLs certas.
  - Uma segunda chamada 299 999 ms depois não chama `fetch`; uma chamada 300 000 ms depois chama de novo.
  - `fetch` que rejeita não lança nem gera rejeição não tratada.
- [ ] **Step 2:** os testes falham.
- [ ] **Step 3: Implemente.** Implemente `serverWake.ts` e o `ServerWarmUp`, que chama `warmUpServers()` num `useEffect` dependente de `location.pathname` (`useLocation`) e renderiza `null`. Ele fica dentro do `BrowserRouter`, antes das `Routes`, e cobre a abertura do app e cada navegação.
- [ ] **Step 4:** os testes passam, e a suíte inteira também (o `ServerWarmUp` não pode quebrar os testes de página: com MSW, `fetch` para rota sem handler não pode falhar o teste; se falhar, injete o `fetch` ou desligue o aquecimento quando `import.meta.env.MODE === "test"`, e registre a escolha).
- [ ] **Step 5: Commit** — `fix(ui): acordar API e servidor do jogo em segundo plano ao navegar`.

### Task 7: Política de reconexão por tempo

**Files:**
- Create: `src/hooks/reconnectPolicy.ts`
- Test: `src/hooks/__tests__/reconnectPolicy.test.ts`

**Interfaces:**
- Produces:
  - `RECONNECT_WINDOW_MS = 180_000`, `RECONNECT_BASE_DELAY_MS = 500` e `RECONNECT_MAX_DELAY_MS = 5_000`.
  - `createReconnectPolicy(): { nextDelay(now: number): number | null; reset(): void; }`.
  - `nextDelay` registra uma falha. A primeira marca o início da janela. Ela devolve a espera até a próxima tentativa, `min(BASE × 2^n, MAX)` com `n` = falhas anteriores na janela (500, 1000, 2000, 4000, 5000, 5000…), ou `null` quando `now − início ≥ WINDOW` (desistir). `reset()` apaga a janela (chame quando a conexão provar que está viva).

- [ ] **Step 1: Testes.**
  - A sequência de esperas é 500, 1000, 2000, 4000, 5000, 5000.
  - `null` aos 180 000 ms do início, e não antes (179 999 ainda devolve uma espera).
  - Depois de `reset()`, a próxima falha começa uma janela nova e volta a 500.
- [ ] **Step 2:** falham.
- [ ] **Step 3:** implemente.
- [ ] **Step 4:** passam.
- [ ] **Step 5: Commit** — `feat(ws): política de reconexão por tempo, compartilhada pelo lobby e pela mesa`.

### Task 8: `useLobbyWs` com a política nova

**Files:**
- Modify: `src/hooks/useLobbyWs.ts`
- Modify: `src/features/match/combat/boardWaitMessage.ts`
- Test: `src/hooks/__tests__/useLobbyWs.test.ts`, `src/features/match/combat/__tests__/` (o teste do `boardWaitMessage`, se existir; senão, crie)

**Interfaces:**
- Consumes: `createReconnectPolicy` (tarefa 7).
- Produces:
  - `WsStatus` passa a ser `"connecting" | "connected" | "waking" | "unreachable" | "lobby_not_open" | "kicked" | "lobby_closed" | "replaced"`. Saem `disconnected`, `throttled` e `error`.
  - O hook devolve também `reconnect: () => void`, que zera a política e abre uma conexão nova a partir de `unreachable`.
  - `boardWaitMessage`: `waking` → `{ text: GAME_SERVER_WAKING, tone: "muted" }`; o conjunto “sem conexão” passa a ser `unreachable`, `disconnected` (da mesa), `replaced`, `kicked` e `lobby_closed`.

- [ ] **Step 1: Testes** (substitua o “throttled after 5 reconnects”):
  - Um fechamento 1006 depois de aberto leva a `waking` e a uma nova tentativa em 500 ms.
  - Falhas seguidas por 180 s levam a `unreachable` e param de criar sockets.
  - `it("uma mensagem recebida zera a janela")`: conecta, recebe uma mensagem, cai, e falha por 179 s; depois reconecta, recebe uma mensagem, cai de novo e volta a esperar 500 ms.
  - `reconnect()` a partir de `unreachable` cria um socket novo, com o status `connecting`.
  - Os casos especiais seguem iguais: fechamento `4001` → `lobby_not_open`; mensagem de expulsão → `kicked`; `lobby_closed`; `connection_replaced` → `replaced`. Nenhum deles agenda reconexão.
  - O `onerror` sozinho não muda o status (quem decide é o `onclose`).
  - No `boardWaitMessage`, `waking` → o texto `GAME_SERVER_WAKING`.
- [ ] **Step 2:** falham.
- [ ] **Step 3: Implemente.**
  - A política é criada por efeito de conexão e zerada na primeira mensagem recebida de cada socket.
  - Em cada fechamento inesperado: `nextDelay(Date.now())`. Com espera, o status vai para `waking` e agenda `connect`; com `null`, vai para `unreachable`.
  - `reconnect` usa um nonce no array de dependências do efeito, como o `useMatchWs` já faz.
- [ ] **Step 4:** passam.
- [ ] **Step 5: Commit** — `fix(lobby): reconexão paciente com o servidor acordando, sem "muitas tentativas"`.

### Task 9: `useMatchWs` com a política nova, e a barra da mesa

**Files:**
- Modify: `src/hooks/useMatchWs.ts`, `src/features/match/combat/MatchTopBar.tsx`
- Test: `src/hooks/__tests__/useMatchWs.test.ts`; os testes da `MatchTopBar` ou de página que leem o status (`GameMasterPage.test.tsx`, `GamePlayerPage.test.tsx`)

**Interfaces:**
- Consumes: `createReconnectPolicy` (tarefa 7).
- Produces:
  - `MatchWsStatus` ganha `"waking"`.
  - Na `MatchTopBar`: `STATUS_LABELS.waking = "Acordando o servidor…"`, com o `title` do status (o tooltip) valendo `GAME_SERVER_WAKING`, e `STATUS_COLORS.waking = colors.feedbackWarning`.

- [ ] **Step 1: Testes.**
  - Um fechamento 1006 vai para `waking` e tenta de novo em 500 ms.
  - Falhas por 180 s vão para `disconnected`, e o `reconnect()` reabre.
  - Uma mensagem recebida zera a janela.
  - Seguem iguais: `waiting` (sala do mestre fechada: tenta a cada `WAITING_RETRY_MS`, sem gastar a janela), `replaced`, 1000/1001 → `disconnected` direto e o fechamento por silêncio.
  - Na barra, `waking` mostra `Acordando o servidor…`.
- [ ] **Step 2:** falham.
- [ ] **Step 3: Implemente.** Troque `attempts`/`MAX_RECONNECTS` pela política, e mantenha intacta toda a lógica de `roomNotOpen`, `replaced`, silêncio e StrictMode já comentada no arquivo.
- [ ] **Step 4:** passam, e a suíte inteira também.
- [ ] **Step 5: Commit** — `fix(mesa): reconexão paciente com o servidor acordando`.

### Task 10: Tela do lobby

**Files:**
- Modify: `src/pages/LobbyPage.tsx`
- Test: `src/pages/__tests__/LobbyPage.test.tsx`

**Interfaces:**
- Consumes: os status e o `reconnect` da tarefa 8; `GAME_SERVER_WAKING` e `GAME_SERVER_UNREACHABLE`.

- [ ] **Step 1: Testes.**
  - `waking` mostra `GAME_SERVER_WAKING`.
  - `unreachable` mostra `GAME_SERVER_UNREACHABLE` e um botão `Tentar de novo`, que chama `reconnect`.
  - Sem `connected`, os botões `Iniciar Partida` e `Cancelar Lobby` estão desativados; com `connected`, ativos.
  - O texto `Muitas tentativas` não aparece em lugar nenhum.
- [ ] **Step 2:** falham.
- [ ] **Step 3: Implemente.**
  - Mapa de mensagens novo: `connecting` → `Conectando ao lobby…`, `waking`, `unreachable` e os casos especiais com os textos atuais (com `…`).
  - `ERROR_STATUSES` passa a ser `unreachable`, `lobby_not_open`, `kicked`, `lobby_closed` e `replaced`.
  - O “Tentar de novo” fica dentro da barra de status.
  - `disabled` nos dois botões do mestre quando `status !== "connected"`.
- [ ] **Step 4:** passam; `npm run typecheck && npm run lint && npm test && npm run build` passam.
- [ ] **Step 5: Commit** — `fix(lobby): mensagens de conexão claras e ações do mestre só com a sala conectada`.

### Task 11: Verificação no navegador e PR (coordenador)

Não é tarefa de subagente: o coordenador faz.
- [ ] Sobe o front na 5173 (back e game locais já estão de pé) e, no headless com o token de teste injetado:
  - estados forçados por `Fetch` (500, 404 e requisição pendurada por mais de 3 s) em campanhas, campanha, partida, ficha e lista de fichas, a 1280 e 390 px, conferindo com as maquetes `est-*`;
  - a rota 404;
  - lobby e mesa com o construtor `WebSocket` apontado para uma porta fechada, conferindo `waking` → `unreachable`/`disconnected` e o “Tentar de novo”.
- [ ] Commita os documentos da auditoria (`docs/audits/`, a spec e este plano) num commit `docs(audits): …`.
- [ ] Abre o PR pela seção “Entrega” do `CLAUDE.md` da raiz, dizendo o que foi verificado e o que não foi. A validação online com o servidor dormindo de verdade fica para depois do merge, com o dono do produto logado.
- [ ] Mata os servidores que subiu.
