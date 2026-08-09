# Fase 7 — Cobertura da fronteira HTTP

> **Para quem implementa:** execute tarefa por tarefa, na ordem.
> Esta fase **não muda comportamento de produção**. Ela só cria a rede que a Fase 8 vai usar.

**Spec de referência (leia D4 e §4):**
`docs/superpowers/specs/2026-08-09-mvp-debt-closeout-design.md`

**Pré-requisito:** Fase 6 mergeada.

**Branch:** `test/fase-7-cobertura-fronteira-http`

> **Esta fase será revisada externamente antes da Fase 8 começar.** Ela *é* a rede de
> segurança; buraco aqui vira bug invisível lá. Prefira um teste a mais que um a menos.

---

## O problema

Nenhum dos services em `src/services/` tem teste próprio. Eles são cobertos de raspão pelos
integration tests de página — que passam por eles sem afirmar nada sobre a fronteira.

E os handlers do MSW **não são fiéis ao wire format**. Em `src/test/handlers.ts` convivem:

```ts
{ characterSheets: [...] }   // camelCase   ← o backend manda character_sheets
{ character_sheet: ... }     // snake_case  ← esse bate
{ CharacterClasses: [] }     // PascalCase  ← esse bate (struct sem tag json)
```

A causa está em `characterSheetsService.ts`, que converte em **duas ordens diferentes**:

```ts
objToCamelCase<T>(data).characterSheets      // linha 16: converte o envelope junto
objToCamelCase<T>(data.character_sheet)      // linhas 25 e 170: lê o envelope cru primeiro
```

Cada mock foi escrito para casar com o que aquele call site fazia. Os testes passam sem provar
que o front entende o que o backend manda.

**Enquanto isso for verdade, a Fase 8 não tem como ser verificada.**

---

## Princípio que rege esta fase

> **Os mocks descrevem o backend, não o frontend.**

Todo handler do MSW e toda fixture têm que reproduzir **exatamente** o que o servidor Go
serializa — inclusive as inconsistências (envelope PascalCase em `/classes`, snake em
`character_sheet`). Se um teste só passa quando o mock está no formato pós-conversão, o teste
está errado, não o mock.

A fonte da verdade é o código Go, nesta ordem:
1. `System_X_System/docs/dev/api/<feature>.md` — o contrato escrito.
2. Os structs `*Response` em `System_X_System/internal/app/api/` — a tag `json:` manda.
3. `System_X_System/internal/app/game/message.go` — para os payloads de WS.

Quando 1 e 2 divergirem, **2 é a verdade** e a divergência é achado: anote no PR.

---

## Task 1 — Auditar os mocks contra o backend

Antes de escrever teste, corrija o chão.

Para cada handler em `src/test/handlers.ts`, abra o struct de resposta correspondente no Go e
confirme a chave do envelope e o case dos campos internos. Monte uma tabela no corpo do PR:

| Endpoint | Envelope no mock | Envelope no Go | Bate? |
|---|---|---|---|
| `GET /charactersheets` | `characterSheets` | `character_sheets` | **não** |
| … | | | |

Corrija os que não batem — **no mock**, para o formato do Go. Isso vai quebrar testes que
dependiam do formato errado; corrija o *teste*, não volte o mock.

Faça o mesmo com as fixtures em `src/test/fixtures/` (`campaign.ts`, `sheet.ts`, `map.ts`,
`match.ts`, `user.ts`): os campos internos precisam estar no case que o backend manda.

> **Se uma fixture no formato correto quebrar muitos testes de página**, não afrouxe. Significa
> que o service estava lendo o campo errado e o teste estava cristalizando o erro — exatamente
> o que esta fase existe para encontrar. Anote cada caso no PR.

---

## Task 2 — Testes de service

**Crie** `src/services/__tests__/` com um arquivo por service.

Cobertura mínima por método público que faz I/O:

1. **Request:** o método chama a URL certa, com o verbo certo, e o **corpo no formato do wire**
   (snake_case hoje). Capture com um handler que grava `await request.json()`.
2. **Response:** dado um payload no formato do wire, o método devolve o objeto no formato que os
   types de `src/types/` declaram (camelCase). Asserte **campo a campo** nos que passam por
   conversão — é exatamente o que a Fase 8 vai mudar.
3. **Header de auth:** os que recebem `token` mandam `Authorization`.

Ordem de prioridade (faça nesta ordem; se o tempo apertar, os últimos podem ficar mais rasos):

| Service | Métodos | Por quê primeiro |
|---|---|---|
| `mapsService.ts` | 22 | payload mais aninhado do sistema (grid, bg, pieces, walls) — é onde a Fase 8 mais arrisca |
| `characterSheetsService.ts` | 42 | é o que tem as duas ordens de conversão (D4) |
| `matchService.ts` | 16 | |
| `campaignService.ts` | 8 | |
| `authService.ts` | 2 | pequeno, mas é login/cadastro |
| `characterClassesService.ts` | 2 | o envelope PascalCase mora aqui |
| `uploadService.ts` | 19 | **não passa por conversão** — cobrir só o básico |

**Não teste `httpClient.ts` inteiro**, mas **teste o interceptor 401**: que ele limpa as duas
chaves de `localStorage` (`token` e `user`). Isso é invariante documentada no `CLAUDE.md` da
raiz e não tem teste. Mocke `window.location` para não redirecionar de verdade.

---

## Task 3 — Congelar o formato do WS

`useLobbyWs.ts` e `useMatchWs.ts` já têm teste (`hooks/__tests__/`), mas a Fase 8 muda o
formato das mensagens. Reforce antes.

Para **cada tipo de mensagem** que os dois hooks enviam ou recebem, garanta um caso que asserte
o payload no formato do wire. Enumere os tipos a partir de
`System_X_System/internal/app/game/message.go` (102 tags `json:`) — não a partir do que o teste
já cobre, senão você só reforça o que já estava coberto.

Atenção especial ao que hoje é lido **cru em snake_case** nos hooks:
`.character_id`, `.fog_mode`, `.max_hp`, `.piece_id`, `.visible_polygons`, `.wall_id`.
Cada um desses precisa de um teste que falharia se o campo mudasse de nome — são precisamente os
que a Fase 8 vai renomear.

`useMatchWs.ts:35` declara um tipo com o comentário *"A piece exactly as the game server
serializes it (flat, snake_case)"*. **Não mexa nele agora** — só garanta que há teste
exercitando o caminho que o consome.

---

## Task 4 — Inventário do que a Fase 8 vai tocar

Produza `docs/dev/http-boundary-inventory.md` — este documento é entregável da fase, não
rascunho. Ele é o mapa que a Fase 8 vai seguir e a referência de aprendizado que o dono do
projeto pediu.

Conteúdo:

1. **Tabela de endpoints**: método, path, chave do envelope, arquivo Go do struct de resposta,
   service do front que consome, e se hoje passa por `objToCamelCase`/`objToSnakeCase`.
2. **Tabela de mensagens WS**: tipo, direção (cliente→servidor / servidor→cliente), struct em
   `message.go`, hook que consome, e se hoje converte ou lê cru.
3. **Lista das inconsistências encontradas** na Task 1, com o formato real de cada uma.
4. **Uma seção curta explicando o desenho**, em português, para leitura humana: o que é a
   fronteira HTTP, por que hoje existe conversão de case, e o que a Fase 8 vai fazer. Duas ou
   três páginas de tela, sem jargão desnecessário.

Registre o arquivo em `System_X_System/docs/documentation-map.yaml` se houver entrada aplicável.

---

## Verificação

1. `npx tsc -b` — limpo.
2. `npm run lint` — **13 erros** em `src/` (o número que a Fase 6 deixou). Esta fase não muda
   código de produção, então não pode mexer nesse número.
3. `npm test` — verde, com **bem mais** testes que os ~409 que a Fase 6 deixou. Esta é a fase
   que mais adiciona teste do refactor inteiro.
4. `git diff --stat main -- src/services src/hooks src/features src/pages src/components` —
   deve mostrar **zero mudança em arquivo de produção** fora de `src/test/`. Se algum arquivo de
   produção mudou, ou você corrigiu um bug (legítimo — destaque no PR) ou saiu do escopo.

---

## Entrega

1. `./dev-checkout.sh test/fase-7-cobertura-fronteira-http`.
2. **Sem verificação visual** — nada de produção mudou. Registre isso no corpo do PR, com a
   saída de `npm test`, como a evidência equivalente prevista no `CLAUDE.md` da raiz.
3. Abrir o PR.

**Título:** `test(http): cobrir a fronteira HTTP e corrigir fidelidade dos mocks`

No corpo: a tabela da Task 1, a contagem de testes antes/depois, e a lista de divergências
contrato-vs-código encontradas.

---

## O que NÃO fazer

- **Não** mude nenhum service, hook ou página para "facilitar o teste". Se algo estiver difícil
  de testar, teste como está e anote — a Fase 8 conserta.
- **Não** delete nem teste `caseConverter.ts`. Ele vai ser **removido** na Fase 8; teste nele é
  trabalho jogado fora. O que protege a Fase 8 é o teste de *service*, que continua valendo
  depois que a conversão sumir.
- **Não** ajuste um mock de volta ao formato errado para um teste passar.
