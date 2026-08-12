# Fase 10 — Fechamento: bug de update parcial e pontas soltas

> Última fase. Três itens independentes, dois deles pequenos. Pode ser um PR por item ou
> agrupado por repo — mas o item 1 muda comportamento e merece verificação visual própria.

**Spec de referência:** `docs/superpowers/specs/2026-08-09-mvp-debt-closeout-design.md`

**Contexto:** as Fases 6 a 9 fecharam. Esta trata do que a auditoria da reescrita de
`character-sheet.md` (Fase 8) desenterrou, mais duas pontas que a varredura final encontrou.

---

## Item 1 — `PATCH /charactersheets/{uuid}/profile` apaga campos *(bug vivo, perda de dados)*

**Branches:** `fix/profile-partial-update` nos **dois** repos. Backend primeiro.

### O defeito

`internal/gateway/pg/sheet/update_character_sheet_profile.go`:

```sql
UPDATE character_profiles cp
SET avatar_url = $1, cover_url = $2, brief_description = $3, updated_at = $4
```

Os três campos são escritos **incondicionalmente**. Os parâmetros vêm de `*string` do handler;
um ponteiro `nil` vira `NULL` no Postgres e **apaga a coluna**.

**E está vivo.** `EditCharacterSheetPage.tsx:210`, `CreateCharacterSheetPage.tsx:100` e
`CreateNpcPage.tsx:106` fazem:

```ts
resolvedAvatarUrl ?? null,   // undefined quando o usuário não mexeu no avatar
resolvedCoverUrl  ?? null,
```

Ou seja: **o usuário troca só a capa e o avatar do personagem é apagado do banco.** E vice-versa.

### 1.1 Backend — update parcial de verdade

```sql
SET avatar_url        = COALESCE($1, cp.avatar_url),
    cover_url         = COALESCE($2, cp.cover_url),
    brief_description = COALESCE($3, cp.brief_description),
    updated_at        = $4
```

**Trade-off a registrar em comentário no próprio arquivo:** com `COALESCE`, este endpoint deixa
de conseguir **limpar** um campo (mandar `null` passa a significar "não mexe"). Isso é aceitável
porque não existe UI de "remover avatar" — mas se um dia existir, vai precisar de um sentinela
(string vazia) ou de endpoint próprio. Escreva isso no código, não só aqui.

Go não distingue campo omitido de `null` explícito num `*string` — os dois chegam `nil`. Então
`COALESCE` é a semântica correta e a única implementável sem trocar o tipo por
`json.RawMessage` ou um wrapper de "presença", complexidade que este endpoint não justifica.

**Teste antes da correção.** Há `patch_character_sheet_profile_test.go` no handler, mas o bug
é do repositório. Adicione teste de integração (tag `integration`, padrão de
`internal/gateway/pg/sheet/sheet_integration_test.go`):

1. Perfil com avatar **e** capa preenchidos → PATCH só com `avatarUrl` → a capa **continua lá**.
2. Idem invertido.
3. PATCH com os três → os três atualizam.
4. PATCH com todos `nil` → nada muda (nenhuma coluna zerada).

Rode e **veja o teste 1 falhar** antes de aplicar o `COALESCE`. Se ele passar de primeira, o
diagnóstico está errado — pare e reporte.

### 1.2 Frontend — parar de mandar `null` para o que não mudou

Nos três call sites, troque `resolvedX ?? null` por `resolvedX` (deixa `undefined`, que o
`JSON.stringify` omite do corpo). Com o `COALESCE` no lugar, campo ausente = "não mexe".

`briefDescription` hoje vai sempre como `charSheet.profile.briefDescription ?? null`. Mantenha
enviando o valor atual — é o campo que o formulário de fato edita.

Atualize os testes de service em `characterSheetsService.test.ts` (há um caso em ~885 que manda
os três `null`): agora precisa haver caso afirmando que campo não passado **não aparece** no
corpo da requisição.

### 1.3 Documentação

`docs/dev/api/character-sheet.md` tem um bloco `> ⚠️ Atenção — este endpoint NÃO faz partial
update de verdade`, escrito na Fase 8. **Reescreva-o**: passa a fazer partial update de
verdade, e registre a limitação nova (não dá para limpar campo). Um aviso desatualizado é pior
que nenhum.

---

## Item 2 — `fog_smoke_test.go` ficou com tag do wire antigo

**Repo:** Go. **Branch:** pode ir junto do item 1.

`internal/app/game/fog_smoke_test.go:51`:

```go
CharacterID string `json:"character_id"`
```

O wire virou camelCase na Fase 8 (`characterId`), mas este arquivo está atrás de
`//go:build smoke` — não roda em `go test ./...` e o compilador nem o olha, então a migração
passou por cima dele.

Consequência: o campo decodifica vazio, a busca da linha 196
(`if p.CharacterID == sheetUUID.String()`) nunca casa, e o teste morre em
`t.Fatal("FAIL: player cannot see their own character's piece")` — apontando para a lógica de
fog, que está certa. Uma hora alguém vai perder tempo sério nisso.

**Correção:** `json:"characterId"`. Confira o arquivo inteiro por outras tags snake antes de
fechar.

**Verificação:** `go vet -tags smoke ./...` limpo, e rode o smoke test de fato se houver banco
disponível. Se não houver, registre no PR que a correção foi verificada só por inspeção — e
diga por quê.

> **Lição para o futuro:** `go vet ./...` e `go test ./...` **não enxergam** código atrás de
> build tag. Existem 12 arquivos assim neste repo (`smoke` e `integration`). Qualquer migração
> ampla precisa rodar `go vet -tags smoke -tags integration ./...` também. Vale acrescentar
> isso ao `AGENTS.md`, na seção de Testing.

---

## Item 3 — Fase 1-B nunca foi executada

**Repo:** Go. **Branch:** `docs/fog-mode-pendencia-config-partida` — já existe, já tem o plano
commitado e pushado desde 2026-08-08.

Plano: `System_X_System/docs/superpowers/plans/2026-08-06-fog-mode-pendente-config-partida.md`.

São 3 edições de comentário (`room.go` ×2, `map.go` ×1) e uma nota no `AGENTS.md`. **Zero linha
executável.** Continue na branch que já existe.

Confirme que segue pendente antes de começar:
```
grep -c "PENDENTE de configurações de partida" internal/app/game/room.go   # 0 = pendente
```

---

## Item 4 — Uma asserção de data que falta *(pequeno, React)*

A Fase 9 consolidou 7 formas de parsing de data em `utils/date.ts`, com teste unitário forte —
inclusive do caso de shift de fuso. Mas **nenhum teste de página assere uma data renderizada**:
`MatchPage.test.tsx` (23 casos) não verifica que a tela mostra `09/08/2026`.

Ou seja: o util está provado e os call sites foram conferidos manualmente, mas a *integração*
entre os dois não tem rede. Se alguém trocar `formatDateBR` por `formatDateTimeBR` num call
site, a suíte continua verde.

**Acrescente a `MatchPage.test.tsx`:** um caso que renderiza a página com uma fixture de data
conhecida e assere o texto formatado na tela — tanto o `formatDateBR` (datas de história)
quanto o `formatDateTimeBR` (agendamento, com o ` às `).

Use uma data que **exponha o fuso**: `"2026-08-09T23:00:00Z"` deve renderizar `09/08/2026`, não
`10/08`. É o caso que só quebra em certas horas do dia — por isso teste é melhor evidência que
olhar a tela.

---

## Verificação de fechamento

Com os três itens e a Fase 9 mergeados, o refactor inteiro está fechado. Rode e reporte:

**Frontend:**
```
npx tsc -b                 # limpo
npm test                   # verde, ~560 testes
npx eslint src             # 2 erros, ambos na zona pixel-tuned (MentalsDiagram, PhysicalsDiagram)
```

**Backend:**
```
go vet ./...                                    # limpo
go vet -tags smoke ./... && go vet -tags integration ./...
go test ./...                                   # verde, 1231+
```

**Contratos:**
```
grep -rhoE 'json:"[a-z0-9]+_' --include=*.go internal/app/    # 0
grep -rn 'any `json' internal/app/api/                        # 0
```

---

## Verificação visual (item 1)

O bug é de perda de dados silenciosa, então o roteiro precisa provar que o dado **sobrevive**:

1. Abrir uma ficha que tenha **avatar e capa** preenchidos.
2. Editar e trocar **só a capa**. Salvar.
3. Recarregar a página → **o avatar continua lá**. (Hoje ele some.)
4. Repetir trocando só o avatar → a capa continua.
5. Trocar os dois de uma vez → os dois atualizam.
6. Editar só a descrição → avatar e capa intactos.

---

## O que NÃO fazer

- **Não** troque `*string` por wrapper de presença (`Optional[T]`, `json.RawMessage`) para
  distinguir omitido de `null`. `COALESCE` resolve o caso real com muito menos superfície.
- **Não** mexa nas tags de `internal/domain/**` — continua valendo a armadilha do JSONB
  (spec da Fase 8, §"A armadilha do JSONB").
- **Não** tente zerar os 2 erros de lint restantes: `MentalsDiagram:36` e `PhysicalsDiagram:54`
  estão na zona pixel-tuned.
