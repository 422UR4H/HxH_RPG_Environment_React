# Fase 8 — Wire format unificado em camelCase

> **A fase de maior risco de todo o refactor.** Leia a seção "A armadilha do JSONB" antes de
> tocar em qualquer tag. Ela descreve um modo de falha que **não gera erro nem log** — só dados
> zerados em silêncio.

**Spec de referência (leia D6, D7 e a §3 inteira):**
`docs/superpowers/specs/2026-08-09-mvp-debt-closeout-design.md`

**Pré-requisito obrigatório:** Fase 7 mergeada **e revisada**. Sem os testes de service, esta
fase não tem como ser verificada.

**Dois PRs, nesta ordem:**
1. **Backend** — branch `refactor/wire-camelcase-backend`. Merge primeiro.
2. **Frontend** — branch `refactor/wire-camelcase-frontend`. Só depois do backend estar na main.

Ordem invertida = front falando camel com um backend que ainda fala snake = tudo quebrado.

---

## O que esta fase faz

Hoje o backend fala snake_case, o frontend fala camelCase, e no meio há `caseConverter.ts` —
54 linhas recursivas, **sem um único teste**, aplicado de forma inconsistente (em dois pontos do
mesmo arquivo a conversão acontece em ordens diferentes, e o WS converte parte e lê parte cru).

Ao fim: **os dois lados falam camelCase e o conversor deixa de existir.**

> **Uma correção de premissa, para quem for implementar.** Não existe "conversão automática do
> Go" a ser removida. Campos exportados em Go são PascalCase, e o formato do wire vem da tag
> `json:"..."` — que foi escrita à mão, 286 vezes. Esta fase **reescreve tags**, não remove
> mágica. E snake_case em JSON não é errado: é convenção comum. O que estamos corrigindo é o
> *descasamento* mais um conversor sem rede, não uma escolha ruim de estilo.

---

## A armadilha do JSONB — leia isto duas vezes

**Nem toda tag `json:` do backend é formato de wire. Algumas são formato de armazenamento.**

`internal/domain/map/entity/grid.go` tem `json:"cell_size"`, e esse struct é serializado
**direto na coluna JSONB** `maps.grid` (`internal/gateway/pg/map/mapper.go`, via
`json.Marshal` / `json.Unmarshal`).

Se você trocar essa tag para `cellSize`:

- escritas novas gravam `cellSize`;
- **leituras de linhas já existentes devolvem zero** — `json.Unmarshal` não erra em campo
  ausente, ele deixa o zero value.

Todo mapa já salvo voltaria com `cellSize: 0`, `skewRatio: 0`, `lineStyle: ""`. Sem erro, sem
panic, sem log. Um grid de célula zero.

E não é só `maps`: o schema tem 13+ colunas JSONB, várias com arrays de objetos aninhados.

### A regra

| Onde | O que fazer |
|---|---|
| `internal/app/**` — **168 tags em 29 arquivos** | **mudar para camelCase** (são DTOs de API e tipos de mensagem WS: formato de entrega) |
| `internal/domain/**` — **15 tags em 7 arquivos** | **não tocar** (formato de armazenamento) |

Confirme a separação antes de começar:

```
grep -rhoE 'json:"[a-z0-9]+_[a-z0-9_]*"' --include=*.go internal/app/    | wc -l   # espera 168
grep -rhoE 'json:"[a-z0-9]+_[a-z0-9_]*"' --include=*.go internal/domain/ | wc -l   # espera 15
```

Se os números não baterem, **pare e reporte** — o terreno mudou desde 2026-08-09.

### A exceção que exige trabalho

Dois arquivos de `internal/app/` **vazam entity direto na resposta**, e por isso hoje entregam as
tags de armazenamento no wire:

- `internal/app/api/map/map_response.go` — `Walls []entity.WallSegment`, e `Bg`, `Pieces`,
  `Decorations`, `Items` como `any` (carregando entities).
- `internal/app/api/matchmap/response.go` — mesmo padrão.

**Estes são os únicos pontos da API que vazam entity** — todo o resto já tem DTO próprio.
Resolver isso é a Task 2, e resolve de quebra o D7 do spec (os `any` sem schema no OpenAPI).

---

# PR 1 — Backend

## Task 1 — Tags de DTO para camelCase

Reescreva as 168 tags de `internal/app/**` de `snake_case` para `camelCase`
(`json:"cell_size"` → `json:"cellSize"`).

Inclui `internal/app/game/message.go` (102 das 168) — é tipo de entrega, muda junto.

Um `sed` resolve a mecânica, mas **revise o diff tag a tag** antes de commitar. Casos que um
`sed` ingênuo erra:

- tags com opção: `json:"avatar_url,omitempty"` → `json:"avatarUrl,omitempty"` (a vírgula e o
  que vem depois têm que sobreviver);
- tags com dígito: `json:"point_2"` → `json:"point2"`, não `json:"point2"` vs `json:"point_2"` —
  decida e seja consistente. **Procure por elas antes** com
  `grep -rhoE 'json:"[a-z]+_[0-9]' --include=*.go internal/app/`;
- nada em `internal/domain/` pode aparecer no diff.

**Um caso especial:** `internal/app/api/sheet/list_classes.go` tem
`json:"CharacterClasses"` (PascalCase, tornado explícito na Fase 6). Passa a
`json:"characterClasses"`. Apague o comentário que a Fase 6 deixou apontando para cá.

## Task 2 — Fechar o vazamento de entity

Em `map_response.go`, substitua os campos que hoje são `any` / entity por DTOs próprios, no
mesmo estilo do `GridShapeResponse` que já existe ali:

```go
type WallSegmentResponse struct { … `json:"…"` }   // camelCase
type PieceResponse        struct { … }
type BgImageResponse      struct { … }
type DecorationResponse   struct { … }
type MapItemResponse      struct { … }
```

E funções `toWallSegmentResponse(entity.WallSegment) WallSegmentResponse` etc., chamadas em
`toMapResponse`.

**Preserve o tratamento de nil que já existe** — `toMapResponse` converte `nil` em slice vazia
para `pieces`, `walls`, `decorations` e `items`, para o JSON sair `[]` e não `null`. O front
conta com isso.

Faça o mesmo em `matchmap/response.go`.

**Ao terminar:** `grep -rn "any \`json" internal/app/api/` → vazio, e nenhum
`entity.` em struct de resposta.

## Task 3 — Requests também

Os structs de **entrada** (`*Input` / `*Body` de create/update) também têm tags snake. Mudam
igual. O front vai mandar camel.

Confira que `map_validator.go` e os use cases não dependem do nome da tag em lugar nenhum
(não devem — validação é sobre o valor).

## Task 4 — Testes e contratos

- **13 arquivos de teste** assertam JSON snake_case. Atualize. `go test ./...` verde, com a
  **mesma contagem** de antes — nenhum teste some.
- **7 contratos** em `docs/dev/api/`: `maps.md`, `match-maps.md` e os outros. Atualize todo
  exemplo de request/response. O contrato é a fonte da verdade para o front; contrato errado
  aqui vira bug lá.

  > **`character-sheet.md` é caso à parte — leia antes de estimar.** A auditoria da Fase 7
  > (`docs/dev/http-boundary-inventory.md` §3, item 8) encontrou que essa doc **já diverge
  > fortemente** do `CharacterSheetResponse` real, muito além de case: falta o envelope
  > `{ "character_sheet": … }`, usa `user_uuid` onde o Go usa `player_uuid`, tem campos de
  > perfil soltos na raiz quando o Go os aninha em `profile`, e lista `skills_exps` /
  > `proficiencies_exps` / `categories` como booleano — nenhum dos três existe no struct atual.
  >
  > Ou seja: aqui não dá para "trocar o case dos exemplos". A doc precisa ser **reescrita a
  > partir do struct Go**. Trate como task própria e reserve tempo. Se ficar grande demais para
  > caber neste PR, **abra um PR separado só para ela** e registre a pendência — o que não pode
  > é atualizar só o case e deixar o resto mentindo.
- Se houver doc de WS descrevendo `message.go`, atualize também.

## Verificação (backend)

1. `go build ./...`, `go vet ./...` — limpos.
2. `go test ./...` — verde, **mesma contagem** (1228+ conforme o baseline atual).
3. `grep -rhoE 'json:"[a-z0-9]+_' --include=*.go internal/app/` → **vazio**.
4. `grep -rhoE 'json:"[a-z0-9]+_' --include=*.go internal/domain/` → **15**, inalterado.
5. **Prova de que o JSONB não quebrou** — esta é a verificação que não pode ser pulada:
   suba o servidor contra o banco de dev, abra um mapa **salvo antes desta mudança**, e
   confirme que `cell_size`, `rows`, `cols` e as paredes voltam com os valores certos. Se
   voltarem zerados, a Task 1 vazou para `internal/domain/`.

---

# PR 2 — Frontend

Só comece com o PR 1 mergeado.

## Task 5 — Deletar o conversor

1. Remova as 54 chamadas de `objToCamelCase` / `objToSnakeCase` em `src/services/` e
   `src/hooks/useLobbyWs.ts` / `useMatchWs.ts`. O corpo passa direto:
   `httpClient.post("/maps", data, config(token))`, e a resposta é lida como vem.
2. **Delete `src/utils/caseConverter.ts`.**
3. Em `useMatchWs.ts`, o tipo da linha ~35 com o comentário *"A piece exactly as the game server
   serializes it (flat, snake_case)"* deixa de fazer sentido: o servidor agora serializa camel.
   Unifique com o type de domínio de `src/types/` se forem equivalentes; se não forem, corrija o
   comentário para descrever a diferença real.
4. Os campos lidos crus em snake (`.character_id`, `.fog_mode`, `.max_hp`, `.piece_id`,
   `.visible_polygons`, `.wall_id`) passam a camel. A Fase 7 deixou teste em cada um.

## Task 5-B — Três divergências de type que a Fase 7 desenterrou

`docs/dev/http-boundary-inventory.md` §3 registra divergências entre os types do front e os
structs do Go que **não são de case** — o conversor as escondia. Com ele fora, elas ficam
visíveis (ou continuam invisíveis, o que é pior). Trate as três:

1. **`mental_skills` é enviado pelo Go e o front não tem `mentalSkills`** — o campo é
   descartado silenciosamente hoje. Acrescente ao type `CharacterSheet` se a ficha usa
   habilidades mentais; se não usar, **documente no inventário por que é ignorado de
   propósito**. Campo que chega e some sem registro é o pior dos dois mundos.
2. **`joint_proficiencies` é objeto (mapa nome→dados) no Go e está tipado como array no
   front.** Incompatibilidade de forma, não de case — o conversor nunca consertou isso.
   Corrija o type para espelhar o Go.
3. **`aura` é obrigatório no type `CharacterSheetSummary` e o backend nunca envia.** Torne
   opcional ou remova. Campo obrigatório que nunca chega é `undefined` mentindo ser `number`.

Também: os types declaram `playerUUID`/`masterUUID`/`campaignUUID` (UUID em maiúsculas), mas a
conversão real produzia `playerUuid`. Depois da Fase 8 o Go passa a mandar `playerUuid` —
alinhe os types com **uma** convenção (`Uuid`, como o resto do projeto) e não deixe as duas.

**Cada um desses precisa de teste** antes da correção — os testes de service da Fase 7 são o
lugar.

## Task 6 — Envelopes

Os nomes de envelope mudam junto (`character_sheet` → `characterSheet`,
`CharacterClasses` → `characterClasses`, `match_map` → `matchMap`). Atualize os services **e**
os handlers/fixtures do MSW.

O `characterSheetsService.ts` tinha duas ordens de conversão (D4) — com o conversor fora, some a
ambiguidade. Confirme que os três call sites (linhas ~16, ~25, ~170) ficaram com a mesma forma.

## Task 7 — Atualizar a documentação

- `CLAUDE.md` da raiz de `System_X_System_React`: a seção **"API boundary: snake_case ⇄
  camelCase"** descreve um mundo que deixou de existir. Reescreva: os dois lados falam
  camelCase, não há conversão na fronteira.
- `CLAUDE.md` da raiz de `System_X_System_Project`: o invariante
  *"snake_case ↔ camelCase na fronteira HTTP via `src/utils/caseConverter.ts`"` sai.
- `.claude/rules/api-contract-consumer.md`: as linhas sobre `objToSnakeCase`/`objToCamelCase`
  saem.
- `docs/dev/http-boundary-inventory.md` (criado na Fase 7): atualize para o estado final. Ele
  vira a referência de como a fronteira funciona hoje.

**Deixar qualquer um desses desatualizado é pior que não ter escrito** — uma sessão futura vai
seguir a instrução velha e reintroduzir a conversão.

## Verificação (frontend)

1. `npx tsc -b` — limpo.
2. `npm run lint` — **9 erros** em `src/` (os 13 da Fase 6 menos os 4 `no-explicit-any` de
   `caseConverter.ts`, que sumiu com o arquivo).
3. `npm test` — verde. Os testes de service da Fase 7 são o juiz: eles assertam campo a campo, e
   agora com o payload camel.
4. `grep -rn "caseConverter\|objToCamelCase\|objToSnakeCase" src/` → **vazio**.
5. `grep -rnE '\.[a-z]+_[a-z_]+' src/hooks/useMatchWs.ts src/hooks/useLobbyWs.ts` → **vazio**.

---

## Entrega

1. `./dev-checkout.sh` na branch do front, **com o backend na branch nova rodando**.
   Copie o `.env` se usar worktree, senão o WS do lobby não conecta.
2. **Verificação visual — a mais ampla do refactor.** Todo payload do sistema mudou de formato,
   e o modo de falha é campo virando `undefined`, que muitas vezes só aparece como campo vazio
   na tela. Roteiro:
   - **Auth:** login e cadastro.
   - **Campanhas:** listar, abrir, criar, editar.
   - **Fichas:** listar, abrir uma ficha completa (é o payload mais aninhado do sistema —
     confira atributos, perícias, proficiências e o perfil), criar, editar.
   - **Partidas:** criar, abrir, inscrever ficha, aceitar inscrição.
   - **Mapas:** listar, **abrir um mapa salvo antes desta mudança** (grade com o tamanho certo?
     paredes no lugar? peças?), editar, salvar, recarregar.
   - **Lobby:** conectar (o WS sobe?), mestre move peça, jogador coloca a própria peça.
   - **Partida ao vivo:** fog aparece, paredes lembradas esmaecidas, clicar em porta.
3. Abrir os dois PRs com cross-link.

**Títulos:**
- Go: `refactor(api): wire format em camelCase e DTOs para os entities vazados`
- React: `refactor(http): remover conversão snake↔camel da fronteira`

---

## O que NÃO fazer

- **Não** toque nas tags de `internal/domain/**`. É a armadilha do JSONB.
- **Não** faça migração SQL de renomeação de chave em JSONB. Foi avaliado e rejeitado (spec §3):
  13+ colunas com arrays aninhados, e o modo de falha é silencioso.
- **Não** faça os dois PRs em paralelo nem mergeie o front primeiro.
- **Não** aproveite para mudar nome de campo além do case (`brief_description` → `briefDescription`,
  **não** → `description`). Renomear semanticamente é outra decisão, e misturada aqui fica
  impossível de auditar.
- **Não** deixe `caseConverter.ts` "por precaução". Ou a fase terminou, ou não terminou.
