# Inventário da fronteira HTTP/WS

> Produzido na Fase 7 (Cobertura da fronteira HTTP), quando as Tasks 1-3 cobriram com
> testes todo o wire format que o frontend trocava com o backend Go — na época, um
> formato snake_case convertido para camelCase por duas funções genéricas
> (`objToSnakeCase`/`objToCamelCase`, `src/utils/caseConverter.ts`). A Fase 8 eliminou
> essa conversão: o backend passou a serializar em camelCase nativamente (tags `json`
> reescritas em `internal/app/**`, sem tocar `internal/domain/**` — a armadilha do
> JSONB), e o frontend simplesmente parou de converter. Este documento foi reescrito ao
> final da Fase 8 para descrever **como a fronteira funciona hoje**: é a referência de
> leitura para quem for revisar essa fronteira depois, não mais um roteiro de migração.
>
> Fontes: auditoria de mocks/fixtures (Task 1, Fase 7), testes de `src/services/*`
> (Fase 7, reajustados na Fase 8 para o payload camelCase) e testes de
> `src/hooks/useLobbyWs.ts`/`useMatchWs.ts` (Task 3, Fase 7) — todos em
> `System_X_System_React/.superpowers/sdd/2026-08-09-fase-7-cobertura-fronteira-http/`
> e `2026-08-09-fase-8-wire-camelcase/`.
> Toda linha das tabelas abaixo foi reconferida contra o struct Go real (branch
> `main` do backend, pós-Fase 8) e contra o código atual de `src/services/*.ts` e
> `src/hooks/use*Ws.ts` no momento desta reescrita (2026-08).

## 1. Tabela de endpoints REST

Legenda da coluna **Estado**: "passthrough" significa que o front lê/escreve a chave
exatamente como o backend a serializa, sem transformação nenhuma — nem case, nem
renomeação. Números entre colchetes `[1]`, `[2]`... remetem à lista de achados ao
final da tabela — bugs de produção reais, a maioria estrutural/de lógica (não de case),
que a migração de case da Fase 8 não corrigiu porque não são bugs de case.

### mapsService.ts (8 métodos)

| Método | Path | Chave do envelope | Struct Go (arquivo) | Estado |
|---|---|---|---|---|
| POST | `/campaigns/:campaignId/maps` | `map` | `CreateMapResponseBody` (`internal/app/api/map/create_map.go`) | passthrough |
| GET | `/campaigns/:campaignId/maps` | `maps` | `ListMapsResponseBody` (`internal/app/api/map/list_maps.go`) | passthrough; lê `.maps ?? []` |
| GET | `/maps/:mapId` | `map` | `GetMapResponseBody` (`internal/app/api/map/get_map.go`) | passthrough |
| PUT | `/maps/:mapId` | — (204, sem corpo) | `UpdateMapResponse` (`internal/app/api/map/update_map.go`) | resolve `undefined` |
| DELETE | `/maps/:mapId` | — (204) | `DeleteMapResponse` (`internal/app/api/map/delete_map.go`) | resolve `undefined` |
| POST | `/matches/:matchUuid/map` | `matchMap` | `AttachMatchMapResponseBody` (`internal/app/api/matchmap/attach.go`) | passthrough; body `{ mapUuid }` |
| GET | `/matches/:matchUuid/map` | `matchMap` (200) / sem corpo (204) | `GetMatchMapResponseBody` (`internal/app/api/matchmap/get.go`) | passthrough; 204 → `null`; **erro de rede sem `response.status` também vira `null`** [1] |
| DELETE | `/matches/:matchUuid/map` | — (sem Body no struct) | `DetachMatchMapResponse` (`internal/app/api/matchmap/detach.go`) | resolve `undefined` |

`fogMode` do domínio (`TacticalMap.FogMode`) continua nunca sendo serializado por
`MapResponse` (`internal/app/api/map/map_response.go` — sem campo `fogMode`) —
`getMap`/`listMaps`/`createMap` sempre devolvem `fogMode: undefined` no front; já era um
débito conhecido antes da Fase 8 e continua tratado defensivamente (`GamePage.tsx` faz
`map.fogMode ?? "explored"`). Não é um bug de case; a Fase 8 não mexeu nisso.

### characterSheetsService.ts (9 métodos)

| Método | Path | Chave do envelope | Struct Go (arquivo) | Estado |
|---|---|---|---|---|
| GET | `/charactersheets` | `characterSheets` | `ListCharacterSheetsBody` (`internal/app/api/sheet/list_character_sheets.go`) | passthrough; lê `.characterSheets ?? []` |
| GET | `/charactersheets/:id?include=submission` | `characterSheet` | `GetCharacterSheetResponseBody` (`internal/app/api/sheet/get_character_sheet.go`) | passthrough; ver normalização abaixo |
| POST | `/submissions/charactersheets/submit` | — (sem Body) | `SubmitCharacterSheetResponse` (`internal/app/api/submission/submit_character_sheet.go`) | passthrough; body `{ sheetUuid, campaignUuid }` |
| POST | `/submissions/:sheetUuid/accept` | — (sem Body) | `AcceptSheetSubmissionResponse` (`internal/app/api/submission/accept_sheet_submission.go`) | body `{}` literal |
| POST | `/submissions/:sheetUuid/reject` | — (sem Body) | `RejectSheetSubmissionResponse` (`internal/app/api/submission/reject_sheet_submission.go`) | body `{}` literal |
| POST | `/charactersheets` | `characterSheet` (só `.uuid` é lido) | `CreateCharacterSheetResponseBody` (`internal/app/api/sheet/create_character_sheet.go`) | body montado à mão diretamente em camelCase |
| DELETE | `/charactersheets/:uuid` | — (204) | `DeleteCharacterSheetResponse` (`internal/app/api/sheet/delete_character_sheet.go`) | resolve `undefined` |
| PATCH | `/charactersheets/:uuid` | `characterSheet` | `UpdateCharacterSheetResponseBody` (`internal/app/api/sheet/update_character_sheet.go`) | mesmo padrão de `createCharacterSheet`; ver normalização abaixo |
| PATCH | `/charactersheets/:sheetUuid/profile` | — (204) | `PatchCharacterSheetProfileResponse` (`internal/app/api/sheet/patch_character_sheet_profile.go`) | body `{ avatarUrl, coverUrl, briefDescription }` direto |

**Normalização de enum-keyed maps:** `getCharacterSheetDetails` e `updateCharacterSheet`
passam a resposta por `normalizeSheetEnumKeyedMaps` (definida em
`characterSheetsService.ts`) antes de devolvê-la — lowercasing da primeira letra das
chaves de `abilities`, `physicalAttributes`, `mentalAttributes`, `spiritualAttributes`,
`physicalSkills`, `mentalSkills`, `spiritualSkills`, `principles`, `categories` e
`commonProficiencies` via `src/utils/lowercaseFirstKeys.ts`. Ver `## API boundary` em
`CLAUDE.md` e o cabeçalho de `lowercaseFirstKeys.ts` para o porquê: essas chaves são
valores de enum Go (`String()`, ex. `"Resistance"`), não nomes de campo de struct, então
a migração de tags da Fase 8 não as alcança. `status` fica de fora (já vem em minúsculo
do servidor) e `jointProficiencies` fica de fora (chaves são nomes livres definidos pelo
mestre, não valores de enum).

Do lado do **request**, `createCharacterSheet`/`updateCharacterSheet` fazem o inverso em
`skillsExps`/`proficienciesExps`/`attributePoints`: capitalizam a primeira letra da
chave (`name.charAt(0).toUpperCase() + name.slice(1)`) para bater com o enum Go que o
backend espera do lado do request — mesmo domínio de mismatch da normalização acima,
espelhado na direção contrária, dentro do próprio service.

A antiga inconsistência de ordem "lê a chave crua antes de converter" não existe mais:
como não há mais conversão de case nenhuma, ler `data.characterSheet` é só acesso direto
de propriedade — não há ordem para errar.

### matchService.ts (9 métodos)

| Método | Path | Chave do envelope | Struct Go (arquivo) | Estado |
|---|---|---|---|---|
| POST | `/matches` | `match` | `CreateMatchResponseBody` (`internal/app/api/match/create_match.go`) | passthrough |
| GET | `/matches/:id` | `match` | `GetMatchResponseBody` (`internal/app/api/match/get_match.go`) | passthrough |
| GET | `/matches/:id/enrollments` | `enrollments` | `ListMatchEnrollmentsResponseBody` (`internal/app/api/match/list_match_enrollments.go`) | passthrough |
| GET | `/matches/:id/participants` | `participants` | `GetMatchParticipantsResponseBody` (`internal/app/api/match/get_match_participants.go`) | passthrough |
| POST | `/enrollments/:id/accept` | — (sem Body) | `AcceptEnrollmentResponse` (`internal/app/api/enrollment/accept_enrollment.go`) | body `{}` literal |
| POST | `/enrollments/:id/reject` | — (sem Body) | `RejectEnrollmentResponse` (`internal/app/api/enrollment/reject_enrollment.go`) | body `{}` literal |
| PATCH | `/matches/:id` | `match` | `UpdateMatchResponseBody` (`internal/app/api/match/update_match.go`) | passthrough |
| DELETE | `/matches/:id` | — (204) | `DeleteMatchResponse` (`internal/app/api/match/delete_match.go`) | resolve `undefined` |
| POST | `/enrollments/charactersheets/enroll` | — (sem Body) | `EnrollCharacterResponse` (`internal/app/api/enrollment/enroll_character_sheet.go`) | passthrough; body `{ sheetUuid, matchUuid }` |

`enrollments`/`participants` embutem `CharacterSheetWithVisibilityResponse`
(`internal/app/api/sheet/character_sheet_sumary_response.go`), com um bloco `private`
presente só quando quem pede é o master — sem transformação nenhuma, hoje como antes.

### campaignService.ts (6 métodos)

| Método | Path | Chave do envelope | Struct Go (arquivo) | Estado |
|---|---|---|---|---|
| GET | `/campaigns/:id` | `campaign` (tipo `any` no Go — polimórfico master/player) | `GetCampaignResponseBody` (`internal/app/api/campaign/get_campaign.go`) | passthrough; **tipo `CampaignMaster` fixo no front mesmo quando o Go devolve o shape de player, sem `pendingSheets`** [2] |
| GET | `/campaigns` | `campaigns` | `ListCampaignsResponseBody` (`internal/app/api/campaign/list_campaigns.go`) | passthrough; lê `.campaigns ?? []` |
| GET | `/public/campaigns` | `campaigns` | `ListPublicCampaignsResponseBody` (`internal/app/api/campaign/list_public_upcoming_campaigns.go`) | idem |
| POST | `/campaigns` | — (**flat**, sem chave `campaign`) | `CreateCampaignResponseBody` (`internal/app/api/campaign/create_campaign.go`) | body passthrough; **res lê `data.campaign`, que não existe → resolve `undefined`** [3] |
| DELETE | `/campaigns/:id` | — (204) | `DeleteCampaignResponse` (`internal/app/api/campaign/delete_campaign.go`) | resolve `undefined` |
| PATCH | `/campaigns/:id` | `campaign` | `UpdateCampaignResponseBody` (`internal/app/api/campaign/update_campaign.go`) | passthrough (shape mais estreito que `CampaignMaster`, é `CampaignEditResult`) |

### authService.ts (2 métodos)

| Método | Path | Chave do envelope | Struct Go (arquivo) | Estado |
|---|---|---|---|---|
| POST | `/auth/login` | — (flat, `{token, user}` direto no corpo) | `LoginResponseBody` (`internal/app/api/auth/response.go`) | passthrough — hoje é o mesmo padrão de todo o resto do sistema; ver achado `[4]` (moot) |
| POST | `/auth/register` | — (**sem `Body` no struct Go — 201 sem JSON**) | `RegisterResponse` (`internal/app/api/auth/response.go`) | passthrough; **o tipo declarado (`Promise<UserResponse>`) promete `token`/`user`, que nunca chegam** [5] |

### characterClassesService.ts (2 métodos)

| Método | Path | Chave do envelope | Struct Go (arquivo) | Estado |
|---|---|---|---|---|
| GET | `/classes` | `characterClasses` (camelCase — a antiga tag PascalCase proposital `CharacterClasses` foi migrada para camelCase junto com o resto na Fase 8; não é mais um caso especial) | `ListCharacterClassesBody` (`internal/app/api/sheet/list_classes.go`) | passthrough; item a item por `normalizeClassEnumKeyedMaps` (mesmo mecanismo de `lowercaseFirstKeys` descrito acima, aplicado a `abilities`/`attributes`/`skills`/`proficiencies`) |
| GET | `/classes/:id` | Go serializa `CharacterClass` — **campo sem tag `json` no struct, então usa o nome do campo Go literal (PascalCase)** | `GetCharacterClassBody` (`internal/app/api/sheet/get_class.go`) | **front lê `data.characterClass` (camelCase, correto pelo padrão do resto do sistema) — mas a chave real no wire é `CharacterClass` (maiúscula) → resolve `undefined` de qualquer forma** [6] |

### uploadService.ts (3 métodos)

| Método | Path | Chave do envelope | Struct Go (arquivo) | Estado |
|---|---|---|---|---|
| POST | `/upload/presigned-url` (avatar/cover) | — (flat) | `PresignedURLResponseBody` (`internal/app/api/upload/presigned_url.go`) | **service ainda escreve/lê snake_case (`file_type`, `sheet_uuid`, `upload_url`, `public_url`) — o backend migrou este struct para camelCase (`fileType`, `sheetUuid`, `uploadUrl`, `publicUrl`) e este service não foi tocado na Fase 8** [9] |
| POST | `/upload/presigned-url` (mapa) | idem | idem | idem [9] |
| PUT | URL pré-assinada (S3/R2, fora do backend) | — | — | sem relação com o backend Go |

### Interceptor global — `httpClient.ts`

Não é um endpoint, mas é parte da fronteira: em qualquer resposta `401`, o interceptor
Axios limpa `token`+`user` do `localStorage` e redireciona para `/` — **só se já havia um
`token` gravado antes** (proteção contra logout automático quando nunca houve sessão,
adicionada na Fase 6). Coberto em `httpClient.test.ts`. Nunca teve relação com
conversão de case — não foi afetado pela Fase 8.

### Achados referenciados na tabela (bugs de produção reais)

Nenhum destes é um bug de case — são bugs estruturais/de lógica que a migração da Fase 8
não tinha como corrigir (ela só trocou `snake_case` por `camelCase`, não corrigiu
envelopes ausentes ou tipos incorretos). Continuam presentes hoje, salvo indicação em
contrário.

1. **`getMatchMap`** (ainda presente): qualquer erro de rede sem `err.response.status`
   (ex.: falha de conexão) é tratado como "sem mapa anexado" (`null`), igual a um 204 —
   pode mascarar falha real.
2. **`getCampaignDetails`** (ainda presente): o Go devolve `CampaignPlayerResponse` (sem
   `pendingSheets`) para quem não é master, mas o front tipa o retorno sempre como
   `CampaignMaster` (que exige `pendingSheets`) — em runtime, para um player,
   `pendingSheets` é `undefined`.
3. **`createCampaign`** (ainda presente): `CreateCampaignResponseBody` continua sem
   envelope `campaign` — os campos ficam soltos no topo do corpo.
   `campaignService.createCampaign` lê `data.campaign`, que nunca existe, e resolve
   `undefined`.
4. **`signIn`** (resolvido/moot): antes da Fase 8, `signIn` não rodava
   `objToCamelCase` na resposta enquanto `signUp` rodava — uma inconsistência de
   mecanismo. Esse mecanismo não existe mais em lugar nenhum do código: `signIn` hoje é
   um passthrough limpo, exatamente como qualquer outro service. Deixou de ser uma
   inconsistência porque a coisa com a qual ele era inconsistente foi removida.
5. **`signUp`** (ainda presente, reframed): `RegisterResponse` no Go continua sem `Body`
   — é um 201 sem JSON. O tipo declarado (`Promise<UserResponse>`) continua prometendo
   `token`/`user`, que nunca chegam nessa resposta.
6. **`getCharacterClassDetails`** (parcialmente resolvido, bug diferente e mais estreito
   agora): o bug do PRÓPRIO frontend — ler `data.character_class` (chave que nunca
   existiu) — foi corrigido na Task 6 da Fase 8; o service agora lê `data.characterClass`,
   que é o nome correto pela convenção do resto do sistema. Só que o backend real
   (`GetCharacterClassBody.CharacterClass CharacterClassResponse`,
   `internal/app/api/sheet/get_class.go`) não tem tag `json` nesse campo — Go usa o nome
   literal do campo, `CharacterClass` (C maiúsculo), não `characterClass`. Então
   `getCharacterClassDetails` continua quebrado, mas agora por um bug do **backend**, não
   do frontend. Sem call sites em produção hoje (`grep -rn getCharacterClassDetails src`
   só encontra a própria definição do service) — dormente, não bloqueia nenhuma feature
   viva.

> A numeração pula de `6` para `9`: `7` e `8` são os achados da tabela WS (seção 2,
> abaixo) — a sequência é global entre as duas tabelas, na ordem em que cada achado foi
> descoberto, não reiniciada por seção.

9. **`uploadService.getPresignedUrl`/`getPresignedUrlForMap`** (novo, encontrado ao
   reconferir este documento no fechamento da Fase 8, fora do escopo original da Task 7):
   o commit que reescreveu as tags do backend para camelCase
   (`refactor(api): tags de DTO para camelCase (internal/app/**)`, branch `main` do
   backend) também converteu `PresignedURLRequestBody`/`PresignedURLResponseBody`
   (`internal/app/api/upload/presigned_url.go`) para `fileType`/`sheetUuid`/`mapUuid`/
   `uploadUrl`/`publicUrl`. `uploadService.ts` não foi atualizado: ele ainda monta o
   corpo do request em snake_case (`file_type`, `sheet_uuid`, `map_uuid`) e lê a resposta
   em snake_case (`data.upload_url`, `data.public_url`) — travado assim pelo teste da
   Fase 7 (`uploadService.test.ts`, que documenta isso no próprio comentário de cabeçalho
   como comportamento esperado). Como `encoding/json` no Go não casa `file_type` com uma
   tag `fileType` (o underscore quebra o fallback case-insensitive), o request atual
   provavelmente falha a bind no backend (`FileType` chega vazio, cai no `default` do
   switch e retorna 422) e a resposta seria lida como `undefined` mesmo se o request
   passasse. Este é um gap real deixado pela Fase 8, não coberto pela Task 7 original —
   avatar/cover/capa de mapa via upload direto pode estar quebrado em produção hoje.
   Vale abrir como item separado, não como parte deste documento de referência.

---

## 2. Tabela de mensagens WS

Escopo: as mensagens que `useLobbyWs.ts` e `useMatchWs.ts` efetivamente tratam hoje (a
cobertura da Task 3, Fase 7). `message.go` define bem mais tipos (`turn_opened`,
`round_closed`, `action_enqueued`, `resolution_updated`, `scene_changed`,
`chat_message`, `error`, `master_action_enqueued`, `attach_reaction`,
`open_next_action`, `pull_action`, `change_scene`) que nenhum hook do front consome
ainda — são o sistema de turnos/cenas, pendente de UI (ver "Known Issues" do
`AGENTS.md` do backend). Ficam fora da tabela porque não há fronteira ativa para
auditar.

| Tipo | Direção | Struct em `message.go` | Hook | Estado |
|---|---|---|---|---|
| `start_match` | cliente→servidor | sem payload | `useLobbyWs` (`sendStartMatch`) | n/a |
| `cancel_lobby` | cliente→servidor | sem payload | `useLobbyWs` (`sendCancelLobby`) | n/a |
| `kick_player` | cliente→servidor | `KickPlayerPayload{playerUuid}` | `useLobbyWs` (`sendKick`) | passthrough; `{ playerUuid }` literal |
| `piece_moved` | cliente→servidor | `PieceMovedPayload` | `useLobbyWs` (`sendPieceMoved`) | passthrough; `characterId`/`visible`/`z` só aparecem na chave quando não-nulos (`...(x != null && {...})`) |
| `piece_removed` | cliente→servidor | `PieceRemovedPayload{pieceId}` | `useLobbyWs` (`sendPieceRemoved`) | passthrough |
| `map_state_sync` | cliente→servidor (master, ao entrar na *lobby*) | `MapStateSyncPayload{pieces, walls, grid}` | `useLobbyWs` (`sendLobbySync`) | passthrough; pieces sempre inclui `characterId`; grid reduzido à mão a `{ cellSize }` |
| `map_state_sync` | cliente→servidor (master, dentro da *partida*) | idem | `useMatchWs` (`sendBoardSync`) | passthrough; pieces via `toPiecePayload` (à mão); walls e grid repassados como estão |
| `enqueue_action` | cliente→servidor | `ActionPayload` | `useMatchWs` (`sendAction`) | passthrough; chamador já monta em camelCase |
| `enqueue_master_action` | cliente→servidor | `MasterActionPayload` | `useMatchWs` (`sendMasterAction`) | passthrough |
| `room_state` | servidor→cliente | `RoomStatePayload{matchUuid, state, players:[PlayerInfo]}` | `useLobbyWs` | passthrough; lê `isMaster`/`isOnline` direto, monta `LobbyParticipant` à mão |
| `player_joined` / `master_joined` | servidor→cliente | `PlayerPayload{uuid, nickname}` | `useLobbyWs` | lê `p.isMaster`/`p.isOnline` — **mas o Go só envia `uuid`/`nickname` nesse evento; `isMaster`/`isOnline` continuam não existindo no payload real** [7] |
| `player_left` / `master_left` | servidor→cliente | `PlayerPayload{uuid, nickname}` | `useLobbyWs` | lê só `p.uuid` |
| `player_kicked` | servidor→cliente | `PlayerKickedPayload{uuid, nickname, reason}` | `useLobbyWs` | lê só `payload.uuid` (compara com o próprio `userUuid`) |
| `lobby_not_open` | servidor→cliente | sem payload (sinal real é o WS close code `4001`) | `useLobbyWs` | n/a |
| `lobby_closed` | servidor→cliente | sem payload | `useLobbyWs` | n/a |
| `match_started` | servidor→cliente | sem payload | `useLobbyWs` | n/a |
| `piece_moved` (eco) | servidor→cliente | `PieceMovedPayload` | `useLobbyWs` | passthrough; lê `pieceId`, `slot.*`, `characterId`, `visible`, `z ?? 0`, monta `SlotCoord` à mão |
| `piece_removed` (eco) | servidor→cliente | `PieceRemovedPayload{pieceId}` | `useLobbyWs` | passthrough |
| `map_full_state` (variante lobby) | servidor→cliente | `MapFullStatePayload` | `useLobbyWs` | só lê `.pieces`, ignora `walls`/`visiblePolygons`/`fogMode`; **descarta silenciosamente qualquer peça sem `characterId`** [8] |
| `wall_state_changed` | servidor→cliente | `WallStateChangedPayload{wallId, open, locked}` | `useMatchWs` | passthrough |
| `wall_hp_changed` | servidor→cliente | `WallHpChangedPayload{wallId, hp, maxHp, destroyed}` | `useMatchWs` | passthrough |
| `map_full_state` (variante partida) | servidor→cliente | `MapFullStatePayload` | `useMatchWs` | pieces via `fromPiecePayload` (à mão); walls repassadas como estão; `visiblePolygons` via `parsePolys` (mapeamento posicional `{x,y}` → `[x,y]`, não é case conversion); `fogMode` lido direto e normalizado para `"live"`/`"explored"` |
| `visibility_updated` | servidor→cliente | `VisibilityUpdatedPayload{visiblePolygons}` | `useMatchWs` | `parsePolys`, mesmo mapeamento posicional acima |
| `wall_revealed` | servidor→cliente | `WallRevealedPayload{wall}` | `useMatchWs` | passthrough |

### Achados referenciados na tabela WS (não corrigidos)

7. **`player_joined`/`master_joined` sem `isMaster`/`isOnline` reais** (ainda presente,
   nomes de campo atualizados para camelCase): o handler em `useLobbyWs.ts` lê
   `p.isMaster`/`p.isOnline` do payload — mas o Go monta esse evento com
   `PlayerPayload{uuid, nickname}` (`internal/app/game/room.go`,
   `broadcastPlayerJoined`/`broadcastPlayerLeft`), que continua sem esses dois campos
   (reconferido contra `message.go`/`room.go` na branch `main` pós-Fase 8). Na prática,
   `isMaster`/`isOnline` chegam como `undefined` (tratado como falsy) para qualquer
   participante que entra depois do `room_state` inicial — o `isOnline: true` hardcoded
   no corpo do handler de `useLobbyWs.ts` mascara metade do problema, mas `isMaster` fica
   errado até a próxima sincronização de `room_state`. Continua fora do escopo da Fase 8
   (bug estrutural de payload, não de case) — vale investigar/corrigir depois.
8. **`map_full_state` (lobby): peças sem `characterId` descartadas sem log** (ainda
   presente, comportamento inalterado, nome de campo atualizado): reconferido em
   `useLobbyWs.ts` (`if (!p.pieceId || !p.slot || !p.characterId) continue;`) — segue sem
   confirmação em nenhum lugar do código de que esse descarte é intencional.

---

## 3. Inconsistências encontradas na Task 1 (auditoria de mocks/fixtures, Fase 7)

Lista original da Task 1, preservada como registro histórico do que a auditoria
encontrou antes da Fase 8 — cada item mostra o formato encontrado (mock/doc) contra o
formato real (struct Go) **no momento em que foi escrito**. Itens que a Fase 8 resolveu
como efeito colateral da migração de case estão marcados explicitamente; a maioria não
foi tocada porque não eram bugs de case.

1. **`GET /charactersheets` — envelope errado no mock** (histórico, já corrigido na
   Fase 7): mock antigo usava `characterSheets` já camelCase, escondendo se o envelope
   real (`character_sheets`, na época) batia. Corrigido no mock ainda na Fase 7. Hoje o
   envelope real também é `characterSheets` (camelCase nativo, ver §1) — o mock não
   precisou de ajuste adicional na Fase 8.

2. **`CharacterSheetSummary.playerUUID`/`masterUUID`/`campaignUUID` nunca existiam em
   runtime** — **resolvido na Task 5-B (Fase 8):** `src/types/characterSheet.ts` agora
   declara `playerUuid`/`masterUuid`/`campaignUuid` (U maiúsculo único), batendo com o
   que o backend sempre serializou.

3. **`CharacterSheet` (frontend) divergia estruturalmente de `CharacterSheetResponse`
   (Go), não só em case:**
   - Go: `status: map[string]StatusResponse` (mapa) · Frontend: `status: {health,
     stamina}` (campos fixos) — batiam por coincidência de chave, não por design.
   - Go enviava `mental_skills`; `CharacterSheet` não tinha campo `mentalSkills` —
     perdido silenciosamente.
   - Go: `joint_proficiencies` era objeto (mapa nome→dados); frontend tipava
     `jointProficiencies: JointProficiency[]` (array) — incompatibilidade de forma.

4. **`CharacterSheetSummary.aura` obrigatório no type, mas o backend nunca enviava** —
   nem `CharacterPrivateSummaryResponse`/`CharacterBaseSummaryResponse` (usado por
   `GET /charactersheets`) nem `CharacterSheetResponse` (`GET /charactersheets/:id`,
   campo `Aura` comentado no código-fonte) tinham um campo `aura`.

> **Resolvido na Task 5-B (Fase 8), reconferido nesta reescrita:** os itens 2, 3
> (parcial) e 4 foram corrigidos em `src/types/characterSheet.ts` —
> `CharacterSheetSummary` usa `playerUuid`/`masterUuid`/`campaignUuid` (item 2) e
> `aura?: StatusBar` opcional (item 4, ainda opcional hoje: `Aura` continua comentado em
> `character_sheet_sumary_response.go`); `CharacterSheet.jointProficiencies` agora é
> `Record<string, JointProficiency>` (item 3, segundo bullet, confirmado contra
> `map[string]JointProficiencyResponse` no Go real). `CharacterSheet.mentalSkills` foi
> adicionado como `Record<string, Skill>` (item 3, primeiro bullet) — **mas nenhuma UI da
> ficha o consome hoje**: existe `MentalsDiagram` para os *atributos* mentais, mas não há
> um grupo de perícias mentais equivalente a `PhysicalSkillsGroup`/
> `SpiritualSkillsGroup` (nem em `CharacterSheetTemplate.tsx` nem em
> `features/sheet/utils/distribute.ts`, cujo `getBaseSkillsForType` só cobre `"physical"
> | "spiritual"`). O campo foi tipado mesmo assim — para não descartar silenciosamente o
> que o backend envia — mas fica sem UI até que perícias mentais sejam um requisito real
> do jogo. O primeiro bullet do item 3 (`status` como mapa vs. campos fixos) segue como
> está: shape genuinamente diferente (confirmado ainda `map[string]StatusResponse` no Go
> real), fora do escopo de um rename de case/shape 1:1 — não é algo que a Fase 8 se
> propôs a resolver.

5. **`authService.signIn` não convertia a resposta; `signUp` convertia** — **resolvido
   (moot) na Fase 8:** o mecanismo de conversão em si (`objToCamelCase`) deixou de
   existir; hoje `signIn` é um passthrough limpo, igual a todo o resto do sistema. Ver
   achado `[4]` na tabela de endpoints acima.

6. **Teste com bug latente em `LobbyPage.test.tsx#setupHandlers`** (histórico, corrigido
   ainda na Fase 7): o setup espalhava a fixture camelCase (que contribuía `masterUuid`)
   e *também* adicionava `master_uuid` separado no mesmo objeto literal. Só "funcionava"
   por ordem de iteração de `for...in` na hora de rodar `objToCamelCase` — não por
   intenção. Reescrito para uma fixture única sem chaves duplicadas. Não há mais
   `objToCamelCase` para essa ambiguidade acontecer de novo.

7. **Mocks de enrollment/participant em `MatchPage.test.tsx` cristalizavam o formato
   errado** (histórico, corrigido ainda na Fase 7): o mock da sidebar montava
   `characterSheet`, `nickName`, `createdAt`, `joinedAt`, `leftAt` em camelCase — quando
   o Go da época (`EnrollmentResponse`, `ParticipantResponse`) enviava `character_sheet`,
   `nick_name`, `created_at`, `joined_at`, `left_at`. Corrigido para snake_case na Fase 7
   (para o teste continuar provando a conversão); na Fase 8 o Go passou a enviar
   exatamente essas chaves em camelCase nativamente, então o mock atual (reajustado junto
   com o resto da suíte na Fase 8) volta a ser camelCase — só que agora é o formato real,
   não um no-op de conversão.

8. **`docs/dev/api/character-sheet.md` divergia fortemente do `CharacterSheetResponse`
   real** — **resolvido no PR #60 do backend** (`docs(api): reescrever
   character-sheet.md a partir do struct Go real`, branch `main`): a doc foi totalmente
   reescrita a partir do struct real, já em camelCase, com o envelope
   `{ "characterSheet": {...} } ` documentado corretamente, `profile` aninhado como no
   struct, e a lista completa de seções (`abilities`, `physicalAttributes`,
   `mentalAttributes`, `spiritualAttributes`, `physicalSkills`, `mentalSkills`,
   `spiritualSkills`, `principles`, `categories`, `commonProficiencies`,
   `jointProficiencies`, `characterExp`, `talent`, `status`) presente. Não foi
   reauditada linha a linha nesta reescrita — a conferência foi por amostragem no
   cabeçalho do documento — mas o gap que motivou este achado não existe mais.

---

## 4. Como essa fronteira funciona hoje, e o que a Fase 8 fez

### O problema que existia, em uma frase

O backend é escrito em Go e falava `snake_case` (convenção idiomática de JSON no
ecossistema Go). O frontend é escrito em TypeScript/React e fala `camelCase` (convenção
idiomática de JavaScript). Toda vez que um dado atravessava essa fronteira — uma
resposta REST, uma mensagem WebSocket — alguém precisava traduzir entre os dois
estilos. Antes da Fase 8, essa tradução era feita por duas funções genéricas em
`src/utils/caseConverter.ts`: `objToSnakeCase` (usada quando o front mandava dados pro
backend) e `objToCamelCase` (usada quando o front lia dados do backend). Elas
percorriam o objeto recursivamente e renomeavam toda chave que encontrassem.

Isso funcionava, mas tinha um problema estrutural: essas funções não sabiam nada sobre
o formato esperado. Convertiam qualquer chave que aparecesse, de qualquer objeto, sem
checar se o resultado batia com o tipo TypeScript declarado. Se o backend renomeasse um
campo, removesse um campo, ou (como os achados acima documentam) simplesmente
esquecesse de embrulhar a resposta no envelope esperado, `objToCamelCase` não
reclamava — ela convertia o que existia e ignorava o resto. O TypeScript também não
ajudava: o tipo de retorno de cada método de service era uma promessa
(`Promise<CampaignMaster>`, por exemplo) que o compilador aceitava de olhos fechados,
sem checar se o valor que realmente chegava em runtime batia com essa promessa.

### O que a Fase 8 fez de fato

A ideia inicial cogitada para a Fase 8 era trocar a conversão genérica por DTOs
explícitos por endpoint — uma função de mapeamento escrita à mão para cada resposta.
**Não foi esse o caminho tomado.** A abordagem real foi mais direta: o backend
reescreveu suas próprias tags `json` de `internal/app/**` (DTOs REST e mensagens WS de
`internal/app/game/message.go`) de snake_case para camelCase — sem tocar
`internal/domain/**`, que é o formato de storage/JSONB e onde uma migração de
renomeação teria custo alto e risco de falha silenciosa (13+ colunas com arrays
aninhados; avaliado e rejeitado, ver a spec da Fase 8 §3). Com o backend já falando
camelCase nativamente na fronteira HTTP/WS, `caseConverter.ts` parou de ter função
alguma — e foi deletado. Não há DTO por endpoint; os services continuam lendo o corpo da
resposta praticamente como chegam (`data.campaign`, `data.characterSheet`, etc.),
só que agora essa leitura é um passthrough real, não uma tradução.

O raciocínio pedagógico por trás da mudança continua válido, e foi o que motivou a
decisão: um conversor genérico esconde bugs de contrato atrás de uma operação que
"sempre funciona" (converte o que existir, ignora o resto), e o TypeScript não verifica
em runtime se o shape prometido bate com o shape real. Migrar o formato do próprio
backend elimina a etapa de tradução inteira — não move o problema para uma nova camada
de DTOs, tira a camada. O preço é que um mismatch de contrato (como o achado `[9]`,
`uploadService.ts`, descoberto só ao reconferir este documento) já não tem uma função
genérica "salvando" a leitura com uma conversão que ao menos não quebra sintaticamente —
ele simplesmente lê `undefined` de uma chave que nunca existiu, exatamente como os
achados `[3]` e `[6]` sempre fizeram para os bugs que já eram estruturais antes da
Fase 8.

### Achados: o que a Fase 8 encontrou e corrigiu vs. encontrou e deixou como débito documentado

Os achados numerados nas seções 1 e 2 acima (`[1]` a `[9]` e `[7]`-`[8]`) não são mais
"o que a Fase 8 vai encontrar pela frente" — são o resultado dessa reconferência,
feita depois que a Fase 8 já estava commitada:

- **Corrigidos como efeito colateral da migração de case ou por tasks dedicadas da
  Fase 8:** achados 2, 3 (parcial) e 4 da seção 3 (`playerUuid`/`masterUuid`/
  `campaignUuid`, `aura` opcional, `jointProficiencies` como mapa — Task 5-B);
  `getCharacterClassDetails` deixou de ter o bug do PRÓPRIO frontend (achado `[6]`,
  Task 6); o achado `[4]` (`signIn`) deixou de fazer sentido porque o mecanismo que o
  causava não existe mais; `docs/dev/api/character-sheet.md` (achado 8 da seção 3) foi
  reescrito do zero no backend.
- **Continuam presentes, porque são bugs estruturais/de lógica que uma migração de case
  não tinha como tocar:** `[1]` (`getMatchMap` mascara erro de rede), `[2]`
  (`getCampaignDetails` tipado errado para players), `[3]` (`createCampaign` sem
  envelope), `[5]` (`signUp` promete um shape que o backend não envia), `[7]` (WS
  `player_joined`/`master_joined` sem `isMaster`/`isOnline` reais), `[8]` (`map_full_state`
  descarta peças sem `characterId` silenciosamente), e o primeiro bullet do item 3 da
  seção 3 (`status` como mapa vs. campos fixos).
- **Novo, descoberto só nesta reescrita, fora do escopo da Task 7 original:** `[9]`
  (`uploadService.ts` continua em snake_case enquanto o backend real já fala camelCase
  no mesmo endpoint) — um gap que a migração de case deveria ter fechado e não fechou.
  Registrado aqui para virar um item de trabalho separado, não corrigido neste documento
  (este é só o inventário).

Os testes que a Fase 7 deixou (`src/services/__tests__/*.test.ts` e
`src/hooks/__tests__/use*Ws.test.ts`), reajustados na Fase 8 para o payload camelCase,
continuam testando o *resultado* de cada método de service — não um mecanismo de
conversão, porque não há mais mecanismo nenhum para testar. Se o backend renomear um
campo outra vez, esses testes devem quebrar; é exatamente esse tipo de sinal que a
suíte foi construída para dar.
