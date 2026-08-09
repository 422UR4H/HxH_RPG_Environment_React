# Fechamento de débito para o MVP — Spec de Design

> **Status:** aprovado em 2026-08-09. Cobre as Fases 6 a 9.
> Continuação de `2026-08-06-tactical-map-refactor-design.md` (Fases 1–5, concluídas).
> Cada fase = uma sessão + um PR (a Fase 8 são dois, um por repo).

**Contexto:** o refactor do mapa tático fechou (5 fases, 402 testes, zero lint na superfície
do mapa). Esta segunda parte fecha o que a varredura geral do frontend encontrou **fora** do
mapa, com o mesmo objetivo: MVP sem débito técnico conhecido.

**Baseline em 2026-08-09:** `tsc -b` limpo, **402 testes**, 19 erros de lint em `src/`,
22.424 linhas de produção / 6.286 de teste.

---

## 1. Achados

### D1 — Quatro páginas leem um campo de erro que não existe *(bug, voltado ao usuário)*

`RegisterPage:39`, `LoginPage:41`, `CreateCampaignPage:51` e `CreateMatchPage:74` fazem
`err.response?.data?.message`. Os handlers usam `huma.Error400/401/409/422`, que devolve
RFC7807 — o campo é **`detail`**. O `ErrorModel` do huma tem `type`, `title`, `status`,
`detail`, `instance`, `errors`. **Não tem `message`.**

Efeito: quando o backend diz "email já cadastrado" ou "credenciais inválidas", o usuário lê
"Erro ao criar conta" / "Erro ao fazer login". O motivo real nunca chega — nas duas primeiras
telas do produto.

Existe um `WriteAuthError` no backend que **usa** `message`, mas só roda no middleware, nos 401
de rota protegida — e esses o interceptor do `httpClient` engole com redirect antes de qualquer
página ver. Não salva nenhum dos quatro casos.

Hoje o codebase tem **três formas** de ler erro de API: `data.message`, `data.detail`, e
`(err as {...}).response?.data?.detail` com narrowing (a única correta, no `TacticalMapEditor`).

### D2 — `alert()` nativo em produção

`LoginPage` e `RegisterPage`, 4 ocorrências. O resto do app usa `InlineFeedback`
(`components/ions/`) ou texto de erro inline.

### D3 — `console.error` residual

`CreateMatchPage:70`, `CreateNpcPage:118`, `CreateCharacterSheetPage:112`.

### D4 — A fronteira HTTP não tem teste próprio, e os mocks não são fiéis

Nenhum dos 6 services em `src/services/` tem teste. Eles são cobertos só de raspão pelos
integration tests de página.

Pior: os handlers do MSW **não reproduzem fielmente o wire format**. Em `handlers.ts`
convivem três convenções de envelope:

```ts
{ characterSheets: [...] }   // camelCase   ← mas o backend manda character_sheets
{ character_sheet: ... }     // snake_case  ← esse bate
{ CharacterClasses: [] }     // PascalCase  ← esse também bate (ver D5)
```

A causa é `characterSheetsService.ts`, que aplica a conversão em **duas ordens diferentes** no
mesmo arquivo:

```ts
objToCamelCase<T>(data).characterSheets        // linha 16: converte o envelope junto
objToCamelCase<T>(data.character_sheet)        // linhas 25 e 170: lê o envelope cru primeiro
```

Cada handler do MSW foi escrito para casar com o que aquele call site fazia. Ou seja: os testes
passam, mas não provam que o front entende o que o backend manda.

### D5 — Um struct de resposta sem tag `json`

`internal/app/api/sheet/list_classes.go:14` — `CharacterClasses []CharacterClassResponse`, sem
tag. Go serializa pelo nome do campo, em **PascalCase**. É o único endpoint da API assim.

### D6 — A conversão snake↔camel está aplicada de forma inconsistente

54 chamadas de `objToCamelCase`/`objToSnakeCase` em 6 services, mais o WS. E o WS é híbrido:
`useMatchWs.ts` converte algumas coisas (`objToCamelCase(w)` para paredes) e lê outras cruas em
snake (`.character_id`, `.fog_mode`, `.max_hp`, `.piece_id`, `.visible_polygons`, `.wall_id`).
`useMatchWs.ts:35` chega a declarar um tipo com o comentário *"A piece exactly as the game server
serializes it (flat, snake_case)"* — um tipo que existe só para espelhar o formato do wire.

`caseConverter.ts` (54 linhas, recursivo, **zero teste**) é o núcleo disso. Armadilha latente:
`Date`, `File`, `Map` e `Set` caem no ramo `for...in` e viram `{}` em silêncio. Hoje não está
vivo — todos os campos de data nos types são `string` e uploads usam presigned URL direto pro
R2 — mas nada impede a próxima feature de acionar.

> **Correção a uma premissa.** A ideia de que "o Go já usa camelCase e a conversão é
> desnecessária" não se sustenta como descrito. Campos exportados em Go são **PascalCase**
> (`CampaignID`, `CellSize`), e o formato do wire não vem do nome do campo — vem da tag
> `json:"..."`. Alguém escreveu `json:"campaign_id"` **286 vezes** (184 em `internal/`, 102 em
> `app/game/message.go`). Não há conversão automática a remover: o backend foi escrito
> deliberadamente para falar snake_case.
>
> Isso **não invalida a conclusão** — só o caminho. snake_case em JSON não é errado (é a
> convenção de boa parte do ecossistema REST); camelCase também não é. O custo real não é a
> escolha, é o *descasamento* somado a um conversor feito à mão, sem teste, aplicado de forma
> inconsistente. Unificar em camelCase é a decisão certa aqui: consumidor único, front em TS, e
> o conversor é código carregado sem rede.

### D7 — `MapResponse` vaza entities e usa `any`

`internal/app/api/map/map_response.go`: `Bg`, `Pieces`, `Decorations`, `Items` são `any`, e
`Walls` é `[]entity.WallSegment` — o entity de domínio direto na resposta. O schema OpenAPI
desses campos sai vazio. (Era o C2 do spec anterior.) `matchmap/response.go` tem o mesmo
vazamento. **É o único ponto da API que vaza entity** — todo o resto já tem DTO próprio.

### D8 — Arquivos grandes fora do mapa

| Arquivo | Linhas | Leitura |
|---|---|---|
| `pages/MatchPage.tsx` | **717** | maior do codebase; 270 linhas são 29 styled-components → ~440 de lógica |
| `features/sheet/PhysicalsDiagram.tsx` | 527 | **pixel-tuned — não tocar** |
| `features/sheet/CharacterSheetTemplate.tsx` | 493 | container queries intensivas |
| `components/molecules/CharacterSheetHeader.tsx` | 489 | **pixel-tuned — não tocar**, ver §2 |
| `components/molecules/BgImagePanel.tsx` | 485 | candidato |
| `pages/LobbyPage.tsx` / `CampaignPage.tsx` / `GamePage.tsx` | 448 / 440 / 429 | candidatos |

---

## 2. Decisões explícitas de NÃO fazer

**`CharacterSheetHeader` e `PhysicalsDiagram` ficam como estão.** São zona pixel-tuned
(`src/components/CLAUDE.md`): valores de CSS ajustados na mão para compensar SVGs
geometricamente imperfeitos. Avaliado e **não há melhoria estrutural disponível sem mexer no
ajuste**. As 489 linhas do header são 24 styled-components com 54 valores tunados — é o que o
arquivo é, não um defeito. As três wrappers de barra (`27.9cqi` / `25.2cqi` / `17.5cqi`)
poderiam virar uma com prop, mas isso moveria os números para o JSX e o nome
`CharacterExpBarWrapper` deixaria de documentar qual barra tem qual offset. Perda líquida.

**O banco não muda na Fase 8.** Ver §3.

---

## 3. Fase 8 — por que via DTO e não trocando as tags dos entities

O caminho ingênuo para unificar o wire seria reescrever as 286 tags `json:` para camelCase.
**Isso corromperia os dados existentes em silêncio.**

`entity.GridShape` tem `json:"cell_size"` e é serializado **direto na coluna JSONB**
`maps.grid` (`internal/gateway/pg/map/mapper.go`, `json.Marshal`/`json.Unmarshal`). Trocar a tag
para `cellSize` faria:

- escritas novas gravarem `cellSize`;
- **leituras de linhas antigas devolverem zero**, porque `json.Unmarshal` não erra em campo
  ausente — ele deixa o zero value.

Resultado: todo mapa já salvo voltaria com `cellSize: 0`, `skewRatio: 0`, `lineStyle: ""`. Sem
erro, sem panic, sem log. Um grid de célula zero.

E não é só `maps`: há 13+ colunas JSONB no schema (`maps.grid/bg/pieces/walls/decorations/items`,
memórias de fog, e as colunas de ação da ficha), várias com arrays de objetos aninhados. Uma
migração SQL de renomeação de chave sobre isso é grande e fácil de errar pela metade.

**A saída correta é separar o que já deveria estar separado:** o formato de *armazenamento*
(tags dos entities, snake, no JSONB) não é o formato de *entrega* (tags dos DTOs de API, que
passam a ser camel). O projeto já segue esse padrão em quase toda a API — só `map_response.go` e
`matchmap/response.go` vazam entity (D7). Fechar esses dois vazamentos resolve D7 **e** destrava
a Fase 8 sem tocar no banco.

Então a Fase 8 é: **as tags dos entities não mudam. As tags dos DTOs de API e do
`app/game/message.go` (que já é tipo de entrega) mudam para camelCase.**

---

## 4. Faseamento

| Fase | Repo | Conteúdo | Risco |
|---|---|---|---|
| **6** | React (+Go pequeno) | Erros de API padronizados (D1, D2, D3, D5) | baixo |
| **7** | React | Cobertura da fronteira HTTP + fidelidade do MSW (D4) | baixo — **rede da Fase 8** |
| **8** | Go **e** React | Wire em camelCase via DTO; deletar `caseConverter` (D6, D7) | **alto** |
| **9** | React | `MatchPage` e últimos arquivos grandes (D8) | médio |

**Fase 7 é pré-requisito obrigatório da Fase 8.** A Fase 8 muda o formato de todo payload da
API e do WS; sem teste de service que asserte o wire real, um campo que passa a chegar
`undefined` só aparece no browser, em alguma tela que ninguém abriu.

**Fase 1-B** (backend, documentar `fog_mode`) segue pendente — plano já commitado em
`docs/fog-mode-pendencia-config-partida`. Encaixar em qualquer intervalo.

### Cadência de revisão recomendada

O Sonnet implementa e revisa (subagent-driven-development) as Fases 6, 7 e 9 fim a fim.

**A Fase 7 precisa de revisão externa antes da Fase 8 começar.** Ela *é* a rede de segurança; se
a rede tiver buraco, a Fase 8 cai por ele e ninguém percebe. Revisar a rede é mais barato que
depurar a queda.

**A Fase 8 precisa de revisão antes do merge** — é cross-repo, muda o contrato, e o modo de
falha característico (campo virando `undefined`) não estoura em teste unitário.

As Fases 6 e 9 podem ir direto, com revisão final no fim de tudo.

---

## 5. Critérios de aceite

Ao fim da Fase 9:

- [ ] `npm run build` e `npm run lint` — lint com **≤ 5** erros em `src/` (dos 19 atuais, 6 caem
      na Fase 6 e 4 na Fase 8; os restantes são `no-explicit-any` em `useForm`, `BaseSelect`,
      `types/` e 2 `no-unused-expressions` na zona pixel-tuned).
- [ ] `npm test` verde, com contagem bem acima dos 402 do baseline.
- [ ] `go vet ./...` e `go test ./...` verdes.
- [ ] `src/utils/caseConverter.ts` **não existe mais**.
- [ ] Zero ocorrência de `data.message`, `alert(` e `console.` em `src/` (fora de teste).
- [ ] Uma única forma de ler erro de API em todo o front.
- [ ] Nenhum `any` em struct de resposta da API Go.
- [ ] Os 7 contratos em `docs/dev/api/` refletindo o wire novo.
