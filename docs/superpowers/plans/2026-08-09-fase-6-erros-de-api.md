# Fase 6 — Erros de API padronizados

> **Para quem implementa:** execute tarefa por tarefa, na ordem.

**Spec de referência (leia D1, D2, D3 e D5):**
`docs/superpowers/specs/2026-08-09-mvp-debt-closeout-design.md`

**Branch (React):** `refactor/fase-6-erros-de-api`
**Branch (Go):** `fix/list-classes-json-tag` — PR separado, Task 5, minúsculo

---

## O bug que esta fase corrige

Quatro páginas leem `err.response?.data?.message`. O backend usa `huma.Error*`, que devolve
RFC7807: os campos são `type`, `title`, `status`, `detail`, `instance`, `errors`. **Não existe
`message`.** Então essas telas sempre caem no fallback genérico e a razão real do erro — "email
já cadastrado", "credenciais inválidas" — nunca chega ao usuário.

Não confie na existência do `WriteAuthError` (que usa `message`): ele só roda no middleware, nos
401 de rota protegida, e o interceptor do `httpClient` redireciona antes de qualquer página ver.

---

## Task 1 — `getApiErrorDetail`

### 1.1 Teste primeiro

**Crie** `src/utils/__tests__/apiError.test.ts` (o diretório `src/utils/__tests__/` ainda não
existe — crie).

```ts
describe("getApiErrorDetail", () => { … });
```

Casos:

1. Erro axios com `response.data.detail` → devolve o detail.
2. Erro axios com `response.data.detail` **vazio** (`""`) → devolve `null` (string vazia não é
   mensagem útil; quem chama aplica o fallback).
3. Erro axios sem `data` → `null`.
4. `response.data` sendo string em vez de objeto (backend pode devolver texto puro num 500 de
   proxy) → `null`, sem lançar.
5. Erro que não é do axios (`new Error("boom")`) → `null`.
6. `undefined` / `null` → `null`, sem lançar.
7. `response.data.errors` presente (lista de `ErrorDetail` do huma, usada em erro de validação)
   → **por ora, ignore-a e devolva o `detail`**. Escreva o teste afirmando isso, para que a
   decisão fique registrada; agregar `errors` é escopo futuro.

**Rode e veja falhar.**

### 1.2 Implementar

**Crie** `src/utils/apiError.ts`:

```ts
import axios from "axios";

/**
 * Extrai a mensagem específica de um erro da nossa API.
 *
 * O backend usa huma, que responde RFC7807 (problem+json): o campo com a explicação
 * daquela ocorrência é `detail`. Não existe `message` — quatro páginas liam esse campo
 * inexistente e por isso sempre mostravam o texto genérico ao usuário.
 *
 * Devolve `null` quando não há mensagem aproveitável, para o chamador aplicar o próprio
 * fallback com `??`.
 */
export function getApiErrorDetail(err: unknown): string | null { … }
```

Use `axios.isAxiosError(err)` — já é a técnica do `isApiError` em `services/httpClient.ts`.
Verifique que `response.data` é objeto antes de indexar. **Não use `any`**; esta fase existe
justamente para tirar `any` daqui.

**Rode e veja passar.**

---

## Task 2 — Aplicar nas 4 páginas quebradas

| Arquivo | Linha | Hoje |
|---|---|---|
| `pages/RegisterPage.tsx` | 39 | `alert(err.response?.data?.message \|\| "Erro ao criar conta")` |
| `pages/LoginPage.tsx` | 41 | `alert(err.response?.data?.message \|\| "Erro ao fazer login")` |
| `pages/CreateCampaignPage.tsx` | 51 | `setError(err.response?.data?.message \|\| "…")` |
| `pages/CreateMatchPage.tsx` | 74 | `.detail` primeiro, `.message` como fallback |

Em todas: `onError: (err: any)` vira `onError: (err: unknown)`, e o corpo usa
`getApiErrorDetail(err) ?? "<fallback existente>"`.

**Preserve os fallbacks exatos** que já existem — são o texto que o usuário vê quando o backend
não manda detail. Não reescreva as frases.

**`CreateMatchPage` tem um detalhe:** ele passa o detail por `getMatchValidationMessage(detail)`
antes de exibir. Preserve essa chamada; só troque a origem do `detail`:

```ts
const detail = getApiErrorDetail(err) ?? "";
setError(getMatchValidationMessage(detail) || "<fallback existente>");
```

Aproveite e **apague o `console.error("[CreateMatch]", …)` da linha 70** (D3).

---

## Task 3 — Trocar `alert()` por UI de verdade

`LoginPage` e `RegisterPage` usam `alert()` nativo em 4 pontos (2 de validação de campo vazio,
2 de erro da API). O resto do app usa `InlineFeedback` (`components/ions/InlineFeedback.tsx`),
cuja API é:

```ts
<InlineFeedback message="…" variant="success" | "error" | "info" autoDismissMs={3000} onDismiss={…} />
```

Em cada uma das duas páginas:

1. Adicione `const [error, setError] = useState<string | null>(null);`
2. Substitua os 4 `alert(...)` por `setError(...)`.
3. Renderize `{error && <InlineFeedback message={error} variant="error" onDismiss={() => setError(null)} />}`
   dentro do formulário, **acima do botão de submit** — é onde `CreateCampaignPage` e
   `CreateMatchPage` já põem o erro deles. Olhe uma dessas duas antes de escrever, para o
   posicionamento ficar consistente.
4. Limpe o erro (`setError(null)`) no início de cada tentativa de submit, senão a mensagem
   anterior fica na tela durante a nova requisição.

**Não** adicione `autoDismissMs` aqui: erro de login precisa ficar até o usuário agir. O
auto-dismiss existe para mensagens de sucesso.

Se as duas páginas usarem `SignPagesTemplate` e ele não tiver slot para isso, renderize dentro
do `<form>` mesmo — **não** altere o template nesta fase.

---

## Task 4 — Varrer o resto do `console.`

Apague:

- `pages/CreateNpcPage.tsx:118` — `console.error("Falha ao criar NPC:", err)`
- `pages/CreateCharacterSheetPage.tsx:112` — `console.error("Falha ao criar ficha:", err)`

**Antes de apagar, olhe o bloco `catch` de cada um.** Se o `console.error` for a *única* coisa
que acontece com o erro, o usuário não está sendo avisado de nada — nesse caso, troque por
`setError(getApiErrorDetail(err) ?? "<mensagem adequada>")` seguindo o padrão da Task 3, em vez
de simplesmente remover. Silenciar um erro é pior que logá-lo.

Confirme no fim: `grep -rn "console\." src/ --include=*.tsx --include=*.ts | grep -v __tests__ | grep -v "/test/"` → vazio.

---

## Task 5 — Go: a tag `json` que falta *(PR separado, repo do backend)*

`internal/app/api/sheet/list_classes.go:14`:

```go
type ListCharacterClassesBody struct {
	CharacterClasses []CharacterClassResponse    // ← sem tag
}
```

Sem tag, Go serializa pelo nome do campo: `"CharacterClasses"`, em PascalCase. É o **único**
endpoint da API assim — todos os outros envelopes são snake ou camel.

Adicione a tag explícita, mantendo **exatamente** o nome que já vai no wire hoje:

```go
	CharacterClasses []CharacterClassResponse `json:"CharacterClasses"`
```

> **Sim, a tag fica em PascalCase de propósito.** O objetivo desta task é tornar o formato
> **explícito**, não mudá-lo — mudar o nome agora quebraria `characterClassesService.ts` e o
> handler do MSW. A padronização para camelCase acontece na **Fase 8**, junto com todo o resto
> do wire. Fazer aqui criaria uma quebra isolada, difícil de rastrear.

Acrescente um comentário de uma linha acima dizendo isso, para a Fase 8 encontrar.

**Verificação:** `go build ./...`, `go vet ./...`, `go test ./...` — verde, com a **mesma**
contagem de testes de antes (nada de comportamento muda; a serialização é byte-idêntica).

Confirme a identidade de fato, não por dedução:
```
go test ./internal/app/api/sheet/... -run Class -v
```

---

## Verificação (React)

1. `npx tsc -b` — limpo.
2. `npm run lint` — os erros em `src/` caem de **19 para 13**: somem os 6
   `no-explicit-any` de `CreateCampaignPage`, `CreateMatchPage`, `EditCampaignPage`,
   `EditMatchPage`, `LoginPage`, `RegisterPage`.

   > `EditCampaignPage:38` e `EditMatchPage:37` também têm `onError: (err: any)` e já leem
   > `.detail` (não estão quebrados). **Converta os dois também** para `unknown` +
   > `getApiErrorDetail` — é o mesmo padrão, e é o que faz o número fechar em 13.
3. `npm test` — verde, com ~7 testes a mais.
4. `grep -rn "data?\.message\|data\.message" src/ | grep -v __tests__` → **vazio**.
5. `grep -rn "alert(" src/ --include=*.tsx | grep -v __tests__` → **vazio**.

---

## Entrega

1. `./dev-checkout.sh refactor/fase-6-erros-de-api`.
2. **Verificação visual** — esta fase muda o que o usuário lê quando algo dá errado, então o
   roteiro é provocar erro de propósito:
   - **Login** com senha errada → a mensagem específica do backend aparece **inline** (não em
     `alert`), e não o texto genérico.
   - **Login** com campo vazio → mensagem de validação inline.
   - **Cadastro** com email já existente → mensagem específica inline.
   - **Criar campanha** com dado inválido → mensagem específica.
   - Uma ação que dá certo → nenhuma mensagem de erro fica pendurada na tela.
3. Abrir os dois PRs (React e Go) com cross-link.

**Títulos:**
- React: `fix(api): ler detail (RFC7807) em vez de message inexistente`
- Go: `chore(api): tag json explícita em ListCharacterClassesBody`

---

## O que NÃO fazer

- **Não** mexa em `caseConverter.ts` nem nos services — é a Fase 8.
- **Não** mude o nome do envelope `CharacterClasses` — Fase 8.
- **Não** tipe os `any` de `useForm`, `BaseSelect` ou `types/` — não são erro de API e cada um
  pede uma decisão própria de tipagem.
- **Não** altere `SignPagesTemplate` para acomodar o `InlineFeedback`.
