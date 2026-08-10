# Inventário da fronteira HTTP/WS

> Produzido na Fase 7 (Cobertura da fronteira HTTP), depois de as Tasks 1-3 cobrirem com
> testes todo o wire format que o frontend troca com o backend Go. Este documento é o mapa
> que a **Fase 8** (unificação do wire format para camelCase via DTOs) vai seguir, e a
> referência de leitura para quem for revisar essa fronteira depois.
>
> Fontes: auditoria de mocks/fixtures (Task 1), testes de `src/services/*` (Tasks 2a-2d) e
> testes de `src/hooks/useLobbyWs.ts`/`useMatchWs.ts` (Task 3) — todos em
> `System_X_System_React/.superpowers/sdd/2026-08-09-fase-7-cobertura-fronteira-http/`.
> Toda linha das tabelas abaixo foi conferida contra o struct Go real no momento da escrita
> deste documento (2026-08).

## 1. Tabela de endpoints REST

Legenda da coluna **Converte?**: `req` é o corpo enviado pelo front; `res` é a resposta lida
pelo front. "cru" significa que o front lê a chave sem passar por `objToCamelCase`/
`objToSnakeCase`. Números entre colchetes `[1]`, `[2]`... remetem à lista de achados ao final
da tabela — são bugs de produção reais encontrados nas Tasks 1-2, não corrigidos (fora do
escopo desta fase).

### mapsService.ts (8 métodos)

| Método | Path | Chave do envelope | Struct Go (arquivo) | Converte? |
|---|---|---|---|---|
| POST | `/campaigns/:campaign_id/maps` | `map` | `CreateMapResponseBody` (`internal/app/api/map/create_map.go`) | req `objToSnakeCase` · res `objToCamelCase` |
| GET | `/campaigns/:campaign_id/maps` | `maps` | `ListMapsResponseBody` (`internal/app/api/map/list_maps.go`) | res `objToCamelCase` no envelope inteiro, depois lê `.maps ?? []` |
| GET | `/maps/:map_id` | `map` | `GetMapResponseBody` (`internal/app/api/map/get_map.go`) | res `objToCamelCase` |
| PUT | `/maps/:map_id` | — (204, sem corpo) | `UpdateMapResponse` (`internal/app/api/map/update_map.go`) | req `objToSnakeCase` · res resolve `undefined` |
| DELETE | `/maps/:map_id` | — (204) | `DeleteMapResponse` (`internal/app/api/map/delete_map.go`) | res resolve `undefined` |
| POST | `/matches/:match_uuid/map` | `match_map` | `AttachMatchMapResponseBody` (`internal/app/api/matchmap/attach.go`) | req `objToSnakeCase({mapUuid})` → `{map_uuid}` · res `objToCamelCase` |
| GET | `/matches/:match_uuid/map` | `match_map` (200) / sem corpo (204) | `GetMatchMapResponseBody` (`internal/app/api/matchmap/get.go`) | res `objToCamelCase`; 204 → `null`; **erro de rede sem `response.status` também vira `null`** [1] |
| DELETE | `/matches/:match_uuid/map` | — (sem Body no struct) | `DetachMatchMapResponse` (`internal/app/api/matchmap/detach.go`) | res resolve `undefined` |

`fog_mode` do domínio (`TacticalMap.FogMode`) nunca é serializado por `MapResponse`
(`internal/app/api/map/map_response.go`) — `getMap`/`listMaps`/`createMap` sempre devolvem
`fogMode: undefined` no front; já é um débito conhecido e tratado defensivamente
(`GamePage.tsx` faz `map.fogMode ?? "explored"`).

### characterSheetsService.ts (9 métodos)

| Método | Path | Chave do envelope | Struct Go (arquivo) | Converte? |
|---|---|---|---|---|
| GET | `/charactersheets` | `character_sheets` | `ListCharacterSheetsBody` (`internal/app/api/sheet/list_character_sheets.go`) | res `objToCamelCase` no envelope inteiro, depois `.characterSheets ?? []` |
| GET | `/charactersheets/:id?include=submission` | `character_sheet` | `GetCharacterSheetResponseBody` (`internal/app/api/sheet/get_character_sheet.go`) | res lê a chave crua `data.character_sheet` primeiro, **depois** `objToCamelCase` só no conteúdo |
| POST | `/submissions/charactersheets/submit` | — (sem Body) | `SubmitCharacterSheetResponse` (`internal/app/api/submission/submit_character_sheet.go`) | req `objToSnakeCase({sheetUuid, campaignUuid})` |
| POST | `/submissions/:sheetUuid/accept` | — (sem Body) | `AcceptSheetSubmissionResponse` (`internal/app/api/submission/accept_sheet_submission.go`) | req `{}` literal |
| POST | `/submissions/:sheetUuid/reject` | — (sem Body) | `RejectSheetSubmissionResponse` (`internal/app/api/submission/reject_sheet_submission.go`) | req `{}` literal |
| POST | `/charactersheets` | `character_sheet` (só `.uuid` é lido) | `CreateCharacterSheetResponseBody` (`internal/app/api/sheet/create_character_sheet.go`) | req: chaves top-level montadas à mão em snake_case + `objToSnakeCase` só em `profile` |
| DELETE | `/charactersheets/:uuid` | — (204) | `DeleteCharacterSheetResponse` (`internal/app/api/sheet/delete_character_sheet.go`) | res resolve `undefined` |
| PATCH | `/charactersheets/:uuid` | `character_sheet` | `UpdateCharacterSheetResponseBody` (`internal/app/api/sheet/update_character_sheet.go`) | req: mesmo padrão de `createCharacterSheet` · res lê chave crua, depois `objToCamelCase` |
| PATCH | `/charactersheets/:sheetUuid/profile` | — (204) | `PatchCharacterSheetProfileResponse` (`internal/app/api/sheet/patch_character_sheet_profile.go`) | req `objToSnakeCase` (testa `undefined` que some do JSON vs `null` que é enviado) |

`getCharacterSheetDetails` e `updateCharacterSheet` leem a chave `character_sheet` **antes**
de converter; `listCharacterSheets` converte **antes** de ler. Essa inconsistência de ordem é
inofensiva hoje só porque as duas chaves (`character_sheet` singular / `character_sheets`
plural) não colidem — mas é exatamente o tipo de acoplamento implícito que a Fase 8 remove.

### matchService.ts (9 métodos)

| Método | Path | Chave do envelope | Struct Go (arquivo) | Converte? |
|---|---|---|---|---|
| POST | `/matches` | `match` | `CreateMatchResponseBody` (`internal/app/api/match/create_match.go`) | req `objToSnakeCase` · res `objToCamelCase` |
| GET | `/matches/:id` | `match` | `GetMatchResponseBody` (`internal/app/api/match/get_match.go`) | res `objToCamelCase` |
| GET | `/matches/:id/enrollments` | `enrollments` | `ListMatchEnrollmentsResponseBody` (`internal/app/api/match/list_match_enrollments.go`) | res `objToCamelCase` |
| GET | `/matches/:id/participants` | `participants` | `GetMatchParticipantsResponseBody` (`internal/app/api/match/get_match_participants.go`) | res `objToCamelCase` |
| POST | `/enrollments/:id/accept` | — (sem Body) | `AcceptEnrollmentResponse` (`internal/app/api/enrollment/accept_enrollment.go`) | req `{}` literal |
| POST | `/enrollments/:id/reject` | — (sem Body) | `RejectEnrollmentResponse` (`internal/app/api/enrollment/reject_enrollment.go`) | req `{}` literal |
| PATCH | `/matches/:id` | `match` | `UpdateMatchResponseBody` (`internal/app/api/match/update_match.go`) | req `objToSnakeCase` · res `objToCamelCase` |
| DELETE | `/matches/:id` | — (204) | `DeleteMatchResponse` (`internal/app/api/match/delete_match.go`) | res resolve `undefined` |
| POST | `/enrollments/charactersheets/enroll` | — (sem Body) | `EnrollCharacterResponse` (`internal/app/api/enrollment/enroll_character_sheet.go`) | req `objToSnakeCase({sheetUuid, matchUuid})` |

`enrollments`/`participants` embutem `CharacterSheetWithVisibilityResponse`
(`internal/app/api/sheet/character_sheet_sumary_response.go`), com um bloco `private`
presente só quando quem pede é o master — o `Enrollment`/`Participant` do front também
convertem esse bloco aninhado normalmente via `objToCamelCase`.

### campaignService.ts (6 métodos)

| Método | Path | Chave do envelope | Struct Go (arquivo) | Converte? |
|---|---|---|---|---|
| GET | `/campaigns/:id` | `campaign` (tipo `any` no Go — polimórfico master/player) | `GetCampaignResponseBody` (`internal/app/api/campaign/get_campaign.go`) | res `objToCamelCase`; **tipo `CampaignMaster` fixo no front mesmo quando o Go devolve o shape de player, sem `pending_sheets`** [2] |
| GET | `/campaigns` | `campaigns` | `ListCampaignsResponseBody` (`internal/app/api/campaign/list_campaigns.go`) | res `objToCamelCase` no envelope inteiro, depois `.campaigns ?? []` |
| GET | `/public/campaigns` | `campaigns` | `ListPublicCampaignsResponseBody` (`internal/app/api/campaign/list_public_upcoming_campaigns.go`) | idem |
| POST | `/campaigns` | — (**flat**, sem chave `campaign`) | `CreateCampaignResponseBody` (`internal/app/api/campaign/create_campaign.go`) | req `objToSnakeCase`; **res lê `data.campaign`, que não existe → resolve `undefined`** [3] |
| DELETE | `/campaigns/:id` | — (204) | `DeleteCampaignResponse` (`internal/app/api/campaign/delete_campaign.go`) | res resolve `undefined` |
| PATCH | `/campaigns/:id` | `campaign` | `UpdateCampaignResponseBody` (`internal/app/api/campaign/update_campaign.go`) | req `objToSnakeCase` · res `objToCamelCase` (shape mais estreito que `CampaignMaster`, é `CampaignEditResult`) |

### authService.ts (2 métodos)

| Método | Path | Chave do envelope | Struct Go (arquivo) | Converte? |
|---|---|---|---|---|
| POST | `/auth/login` | — (flat, `{token, user}` direto no corpo) | `LoginResponseBody` (`internal/app/api/auth/response.go`) | req `objToSnakeCase` · **res devolvida crua, sem `objToCamelCase`** [4] |
| POST | `/auth/register` | — (**sem `Body` no struct Go — 201 sem JSON**) | `RegisterResponse` (`internal/app/api/auth/response.go`) | req `objToSnakeCase` · **res passa por `objToCamelCase`, mas não há `token`/`user` para converter** [5] |

### characterClassesService.ts (2 métodos)

| Método | Path | Chave do envelope | Struct Go (arquivo) | Converte? |
|---|---|---|---|---|
| GET | `/classes` | `CharacterClasses` (PascalCase **proposital**, tag explícita no Go) | `ListCharacterClassesBody` (`internal/app/api/sheet/list_classes.go`) | front lê a chave PascalCase direto, depois `objToCamelCase` item a item |
| GET | `/classes/:id` | Go serializa `CharacterClass` (PascalCase, **sem tag `json`** — usa o nome do campo Go) | `GetCharacterClassBody` (`internal/app/api/sheet/get_class.go`) | **front lê `data.character_class` (snake_case) — chave que nunca existe no wire → resolve `undefined`** [6] |

### uploadService.ts (3 métodos)

| Método | Path | Chave do envelope | Struct Go (arquivo) | Converte? |
|---|---|---|---|---|
| POST | `/upload/presigned-url` (avatar/cover) | — (flat, `{upload_url, public_url}`) | `PresignedURLResponseBody` (`internal/app/api/upload/presigned_url.go`) | req literal já em snake_case · res: renomeação manual campo a campo (`data.upload_url` → `uploadUrl`), não usa `objToCamelCase` |
| POST | `/upload/presigned-url` (mapa) | idem | idem | idem |
| PUT | URL pré-assinada (S3/R2, fora do backend) | — | — | sem conversão — não é tráfego com o backend Go |

### Interceptor global — `httpClient.ts`

Não é um endpoint, mas é parte da fronteira: em qualquer resposta `401`, o interceptor
Axios limpa `token`+`user` do `localStorage` e redireciona para `/` — **só se já havia um
`token` gravado antes** (proteção contra logout automático quando nunca houve sessão,
adicionada na Fase 6). Coberto em `httpClient.test.ts`, sem relação com case conversion.

### Achados referenciados na tabela (bugs de produção reais, não corrigidos)

1. `getMatchMap`: qualquer erro de rede sem `err.response.status` (ex.: falha de conexão)
   é tratado como "sem mapa anexado" (`null`), igual a um 204 — pode mascarar falha real.
2. `getCampaignDetails`: o Go devolve `CampaignPlayerResponse` (sem `pending_sheets`) para
   quem não é master, mas o front tipa o retorno sempre como `CampaignMaster` (que exige
   `pendingSheets`) — em runtime, para um player, `pendingSheets` é `undefined`.
3. `createCampaign`: `CreateCampaignResponseBody` não tem envelope `campaign` — os campos
   ficam soltos no topo do corpo. `campaignService.createCampaign` lê `data.campaign`, que
   nunca existe, e resolve `undefined`.
4. `signIn`: não roda `objToCamelCase` na resposta (`signUp` roda). Hoje inofensivo porque
   `UserResponse` só tem campos de uma palavra.
5. `signUp`: `RegisterResponse` no Go não tem `Body` — é um 201 sem JSON. O tipo declarado
   (`Promise<UserResponse>`) promete `token`/`user`, que nunca chegam.
6. `getCharacterClassDetails`: o Go serializa `CharacterClass` (PascalCase, sem tag) mas o
   service lê `data.character_class` — chave que não existe no wire real. Mesma classe de
   bug que já tinha sido corrigida em `listCharacterClasses` (commit `521ae13`), mas ainda
   presente aqui.

---

## 2. Tabela de mensagens WS

Escopo: as mensagens que `useLobbyWs.ts` e `useMatchWs.ts` efetivamente tratam hoje (a
cobertura da Task 3). `message.go` define bem mais tipos (`turn_opened`, `round_closed`,
`action_enqueued`, `resolution_updated`, `scene_changed`, `chat_message`, `error`,
`master_action_enqueued`, `attach_reaction`, `open_next_action`, `pull_action`,
`change_scene`) que nenhum hook do front consome ainda — são o sistema de turnos/cenas,
pendente de UI (ver "Known Issues" do `AGENTS.md` do backend). Ficam fora da tabela porque
não há fronteira ativa para auditar.

| Tipo | Direção | Struct em `message.go` | Hook | Converte / lê cru? |
|---|---|---|---|---|
| `start_match` | cliente→servidor | sem payload | `useLobbyWs` (`sendStartMatch`) | n/a |
| `cancel_lobby` | cliente→servidor | sem payload | `useLobbyWs` (`sendCancelLobby`) | n/a |
| `kick_player` | cliente→servidor | `KickPlayerPayload{player_uuid}` | `useLobbyWs` (`sendKick`) | literal escrito à mão em snake_case |
| `piece_moved` | cliente→servidor | `PieceMovedPayload` | `useLobbyWs` (`sendPieceMoved`) | literal à mão; `character_id`/`visible`/`z` só aparecem na chave quando não-nulos (`...(x != null && {...})`) |
| `piece_removed` | cliente→servidor | `PieceRemovedPayload{piece_id}` | `useLobbyWs` (`sendPieceRemoved`) | literal à mão |
| `map_state_sync` | cliente→servidor (master, ao entrar na *lobby*) | `MapStateSyncPayload{pieces, walls, grid}` | `useLobbyWs` (`sendLobbySync`) | pieces à mão (sempre inclui `character_id`); walls via `objToSnakeCase`; grid reduzido à mão a `{cell_size}` |
| `map_state_sync` | cliente→servidor (master, dentro da *partida*) | idem | `useMatchWs` (`sendBoardSync`) | pieces à mão (`toPiecePayload`); walls e grid via `objToSnakeCase` completo |
| `enqueue_action` | cliente→servidor | `ActionPayload` | `useMatchWs` (`sendAction`) | payload repassado byte a byte, sem transformação (chamador já monta em snake_case) |
| `enqueue_master_action` | cliente→servidor | `MasterActionPayload` | `useMatchWs` (`sendMasterAction`) | idem, sem transformação |
| `room_state` | servidor→cliente | `RoomStatePayload{match_uuid, state, players:[PlayerInfo]}` | `useLobbyWs` | lê `is_master`/`is_online` crus por campo, monta `LobbyParticipant` à mão |
| `player_joined` / `master_joined` | servidor→cliente | `PlayerPayload{uuid, nickname}` | `useLobbyWs` | lê `p.is_master`/`p.is_online` crus — **mas o Go só envia `uuid`/`nickname` nesse evento; `is_master`/`is_online` não existem no payload real** [7] |
| `player_left` / `master_left` | servidor→cliente | `PlayerPayload{uuid, nickname}` | `useLobbyWs` | lê só `p.uuid` cru |
| `player_kicked` | servidor→cliente | `PlayerKickedPayload{uuid, nickname, reason}` | `useLobbyWs` | lê só `payload.uuid` cru (compara com o próprio `userUuid`) |
| `lobby_not_open` | servidor→cliente | sem payload (sinal real é o WS close code `4001`) | `useLobbyWs` | n/a |
| `lobby_closed` | servidor→cliente | sem payload | `useLobbyWs` | n/a |
| `match_started` | servidor→cliente | sem payload | `useLobbyWs` | n/a |
| `piece_moved` (eco) | servidor→cliente | `PieceMovedPayload` | `useLobbyWs` | lê campos crus (`piece_id`, `slot.*`, `character_id`, `visible`, `z ?? 0`), monta `SlotCoord` à mão |
| `piece_removed` (eco) | servidor→cliente | `PieceRemovedPayload{piece_id}` | `useLobbyWs` | lê cru |
| `map_full_state` (variante lobby) | servidor→cliente | `MapFullStatePayload` | `useLobbyWs` | só lê `.pieces`, ignora `walls`/`visible_polygons`/`fog_mode`; **descarta silenciosamente qualquer peça sem `character_id`** [8] |
| `wall_state_changed` | servidor→cliente | `WallStateChangedPayload{wall_id, open, locked}` | `useMatchWs` | lê cru |
| `wall_hp_changed` | servidor→cliente | `WallHpChangedPayload{wall_id, hp, max_hp, destroyed}` | `useMatchWs` | lê cru |
| `map_full_state` (variante partida) | servidor→cliente | `MapFullStatePayload` | `useMatchWs` | pieces via `fromPiecePayload` (à mão); walls via `objToCamelCase` item a item; `visible_polygons` via `parsePolys` (mapeamento posicional `{x,y}` → `[x,y]`, não é case conversion); `fog_mode` lido cru e normalizado para `"live"`/`"explored"` |
| `visibility_updated` | servidor→cliente | `VisibilityUpdatedPayload{visible_polygons}` | `useMatchWs` | `parsePolys`, mesmo mapeamento posicional acima |
| `wall_revealed` | servidor→cliente | `WallRevealedPayload{wall}` | `useMatchWs` | `wall` via `objToCamelCase` |

### Achados referenciados na tabela WS (não corrigidos)

7. **Novo, encontrado ao cruzar `message.go`/`room.go` para este documento** (fora das
   Tasks 1-3): o handler de `player_joined`/`master_joined` em `useLobbyWs.ts` lê
   `p.is_master`/`p.is_online` do payload — mas o Go monta esse evento com
   `PlayerPayload{uuid, nickname}` (`internal/app/game/room.go`), que não tem esses dois
   campos. Na prática, `isMaster`/`isOnline` chegam como `undefined` (tratado como falsy)
   para qualquer participante que entra depois do `room_state` inicial — o `isOnline: true`
   hardcoded no corpo do handler mascara a metade do problema, mas `isMaster` fica errado
   até a próxima sincronização de `room_state`. Vale investigar/corrigir na Fase 8, junto
   com a padronização do resto da fronteira.
8. `map_full_state` (lobby): peças sem `character_id` são descartadas sem log — já
   documentado como teste na Task 3, comportamento não confirmado como intencional em
   nenhum lugar do código.

---

## 3. Inconsistências encontradas na Task 1 (auditoria de mocks/fixtures)

Lista original da Task 1, no formato descrito no relatório da task — cada item mostra o
formato encontrado (mock/doc) contra o formato real (struct Go).

1. **`GET /charactersheets` — envelope errado no mock.** Mock antigo usava `characterSheets`
   (já camelCase); o Go real (`ListCharacterSheetsBody`) serializa `character_sheets`. Como
   o service roda a resposta inteira por `objToCamelCase()` antes de ler `.characterSheets`,
   um mock já-camelCase tornava essa conversão um no-op — o teste passava mesmo que o
   envelope real mudasse de nome. Corrigido no mock.

2. **`CharacterSheetSummary.playerUUID`/`masterUUID`/`campaignUUID` nunca existem em
   runtime.** O type do frontend declara essas três chaves com "UUID" em maiúsculo duplo;
   `snakeToCamel("player_uuid")` real produz `playerUuid` (U maiúsculo único), igual a todo
   outro type do projeto. Inofensivo hoje porque nada lê esses campos — mas silenciosamente
   `undefined` se algum dia forem usados.

3. **`CharacterSheet` (frontend) diverge estruturalmente de `CharacterSheetResponse` (Go),
   não só em case:**
   - Go: `status: map[string]StatusResponse` (mapa) · Frontend: `status: {health, stamina}`
     (campos fixos) — batem por coincidência de chave, não por design.
   - Go envia `mental_skills`; `CharacterSheet` não tem campo `mentalSkills` — perdido
     silenciosamente na conversão.
   - Go: `joint_proficiencies` é objeto (mapa nome→dados); frontend tipa
     `jointProficiencies: JointProficiency[]` (array) — incompatibilidade de forma.

4. **`CharacterSheetSummary.aura` obrigatório no type, mas o backend nunca envia** — nem
   `CharacterPrivateSummaryResponse`/`CharacterBaseSummaryResponse` (usado por
   `GET /charactersheets`) nem `CharacterSheetResponse` (`GET /charactersheets/:id`, campo
   `Aura` comentado no código-fonte) têm um campo `aura`.

> **Resolvido na Task 5-B (Fase 8):** os itens 2, 3 (parcial) e 4 foram corrigidos em
> `src/types/characterSheet.ts` — `CharacterSheetSummary` agora usa `playerUuid`/`masterUuid`/
> `campaignUuid` (item 2) e `aura?: StatusBar` opcional (item 4); `CharacterSheet.
> jointProficiencies` agora é `Record<string, JointProficiency>` (item 3, segundo bullet).
> `CharacterSheet.mentalSkills` foi adicionado como `Record<string, Skill>` (item 3, primeiro
> bullet) — **mas nenhuma UI da ficha o consome hoje**: existe `MentalsDiagram` para os
> *atributos* mentais, mas não há um grupo de perícias mentais equivalente a
> `PhysicalSkillsGroup`/`SpiritualSkillsGroup` (nem em `CharacterSheetTemplate.tsx` nem em
> `features/sheet/utils/distribute.ts`, cujo `getBaseSkillsForType` só cobre `"physical" |
> "spiritual"`). O campo foi tipado mesmo assim — para não descartar silenciosamente o que o
> backend envia — mas fica sem UI até que perícias mentais sejam um requisito real do jogo.
> O primeiro bullet do item 3 (`status` como mapa vs. campos fixos) segue como está: shape
> genuinamente diferente, fora do escopo de um rename de case/shape 1:1.

5. **`authService.signIn` não converte a resposta; `signUp` converte.** Ver achado `[4]` na
   tabela de endpoints acima — mesmo achado, catalogado aqui como inconsistência de
   contrato porque foi descoberto na auditoria de mocks da Task 1.

6. **Teste com bug latente em `LobbyPage.test.tsx#setupHandlers`** (corrigido): o setup
   espalhava a fixture camelCase (que contribuía `masterUuid`) e *também* adicionava
   `master_uuid` separado no mesmo objeto literal. Só "funcionava" por ordem de iteração de
   `for...in` na hora de rodar `objToCamelCase` — não por intenção. Reescrito para uma
   fixture única sem chaves duplicadas.

7. **Mocks de enrollment/participant em `MatchPage.test.tsx` cristalizavam o formato
   errado.** O mock da sidebar montava `characterSheet`, `nickName`, `createdAt`,
   `joinedAt`, `leftAt` em camelCase — quando o Go (`EnrollmentResponse`,
   `ParticipantResponse`) envia `character_sheet`, `nick_name`, `created_at`, `joined_at`,
   `left_at`. Como o service converte a resposta inteira, o mock já-camelCase tornava a
   conversão um no-op, escondendo se o pipeline real funciona. Corrigido para snake_case.

8. **`docs/dev/api/character-sheet.md` diverge fortemente do `CharacterSheetResponse`
   real**, no mesmo endpoint do item 3:
   - A doc não tem envelope; o Go real embrulha tudo em `{ "character_sheet": {...} }`.
   - A doc usa `user_uuid`; o Go usa `player_uuid`.
   - A doc tem `nickname`/`fullname`/`alignment`/`description`/`brief_description`/
     `birthday`/`age` soltos na raiz; no Go real esses campos vivem aninhados em `profile`.
   - A doc tem `skills_exps`, `proficiencies_exps` e `categories` como booleano — nenhum
     desses existe no struct atual. O Go real tem `abilities`, `physical_attributes`,
     `mental_attributes`, `spiritual_attributes`, `physical_skills`, `mental_skills`,
     `spiritual_skills`, `principles`, `categories` (mapa de `CategoryResponse`, não
     booleano), `common_proficiencies`, `joint_proficiencies`, `character_exp`, `talent` e
     `status` — nada disso aparece na doc.

   Provavelmente o maior gap doc-vs-código encontrado em toda a auditoria. A doc em si não
   foi tocada (fora do escopo da Fase 7); fica registrado aqui como pendência para quem for
   atualizar `character-sheet.md`.

---

## 4. O que é essa fronteira, e o que a Fase 8 vai fazer

### O problema, em uma frase

O backend é escrito em Go e fala `snake_case` (é a convenção idiomática de JSON no
ecossistema Go). O frontend é escrito em TypeScript/React e fala `camelCase` (é a convenção
idiomática de JavaScript). Toda vez que um dado atravessa essa fronteira — uma resposta REST,
uma mensagem WebSocket — alguém precisa traduzir entre os dois estilos. Hoje, essa tradução é
feita por duas funções genéricas em `src/utils/caseConverter.ts`: `objToSnakeCase` (usada
quando o front manda dados pro backend) e `objToCamelCase` (usada quando o front lê dados do
backend). Elas percorrem o objeto recursivamente e renomeiam toda chave que encontram.

Isso funciona, mas tem um problema estrutural: essas funções não sabem nada sobre o formato
esperado. Elas convertem qualquer chave que aparecer, de qualquer objeto, sem checar se o
resultado bate com o tipo TypeScript declarado. Se o backend renomear um campo, remover um
campo, ou (como vimos em vários achados acima) simplesmente esquecer de embrulhar a resposta
no envelope esperado, `objToCamelCase` não vai reclamar — ela converte o que existe e ignora o
resto. O TypeScript também não ajuda aqui: o tipo de retorno de cada método de service é uma
promessa (`Promise<CampaignMaster>`, por exemplo) que o compilador aceita de olhos fechados,
sem checar se o valor que realmente chega em runtime bate com essa promessa.

### Por que isso importa na prática

Os achados listados nas seções 1 e 3 acima são consequência direta desse desenho. Nenhum
deles é um bug sutil de lógica de negócio — são, quase todos, uma função lendo uma chave que
não existe (`data.campaign` quando a resposta não tem essa chave; `data.character_class`
quando o backend manda `CharacterClass`) ou uma conversão que roda na ordem errada. Esse tipo
de erro é exatamente o que um compilador pega de graça **se** o formato de cada resposta
estiver descrito de forma explícita — e é exatamente o que passa despercebido quando a
"tradução" é uma função genérica que converte qualquer coisa que reconhecer.

A Fase 7 (esta fase) não mudou nenhum desses comportamentos — o objetivo aqui era só
**provar**, com teste, exatamente o que cada service e cada hook fazem hoje, para que
ninguém precise adivinhar durante a Fase 8. Cada teste novo trava o comportamento atual (bom
ou ruim) contra o struct Go real, não contra o que o frontend *deveria* fazer.

### O que a Fase 8 vai fazer

A ideia da Fase 8 é trocar a conversão genérica por **DTOs explícitos**: para cada endpoint
REST e cada mensagem WS, uma função de mapeamento escrita à mão, que lê exatamente os campos
que o backend promete enviar (nem mais, nem menos) e monta o objeto TypeScript com o shape
que o resto do app espera. Se o backend renomear um campo, essa função para de compilar (ou
o campo vira `undefined` de forma óbvia, não escondido dentro de uma resposta que parece
correta). `caseConverter.ts` inteiro deixa de ser necessário e é removido — a "tradução"
snake↔camel passa a acontecer campo a campo, dentro de cada DTO, no mesmo lugar onde já se lê
o struct Go como referência.

Esse documento é o roteiro dessa migração: a tabela de endpoints (seção 1) diz, para cada
método de service, qual é o envelope real, qual struct Go ler como fonte da verdade, e se a
conversão de hoje é confiável ou esconde um bug. A tabela de mensagens WS (seção 2) faz o
mesmo para o lado de tempo real. Os achados nas duas tabelas (marcados com `[1]` a `[8]` e
`[7]`) são a lista de comportamentos que a Fase 8 vai encontrar pela frente e vai precisar
decidir, caso a caso, se corrige ou se preserva de propósito (o caso do `CharacterClasses` em
PascalCase, por exemplo, já está marcado como débito conhecido no próprio código Go — não é
um bug, é uma decisão adiada).

Os testes que a Fase 7 deixou (nos arquivos `src/services/__tests__/*.test.ts` e
`src/hooks/__tests__/use*Ws.test.ts`) continuam válidos depois da Fase 8: eles testam o
*resultado* de cada método de service (o objeto camelCase final), não o mecanismo interno
(`objToCamelCase`). Trocar o mecanismo por DTOs explícitos não deveria quebrar nenhum desses
testes — se quebrar algum, é sinal de que o comportamento mudou, e é exatamente esse tipo de
sinal que a suíte de testes foi construída para dar.
