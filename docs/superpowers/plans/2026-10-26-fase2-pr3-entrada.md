# Entrada: login, cadastro e sessão (PR 3 da fase 2) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** um campo de formulário claro e acessível no login e no cadastro, validação própria em português, e uma entrada que explica o que aconteceu (conta criada, sessão expirada, servidor acordando).

**Architecture:** uma molécula `SignField` (rótulo embutido na borda + campo + erro) substitui o ion `BaseInput`, que só o login e o cadastro usam. A validação é um módulo puro por formulário, com as mensagens compartilhadas com o mapa de erros do back. A sessão expirada passa por um aviso em `sessionStorage`, gravado pelo interceptor de 401 e pela leitura do `exp` do JWT ao abrir o app.

**Tech Stack:** React 19, TypeScript strict (`verbatimModuleSyntax`), styled-components 6, react-router 6, React Query v5, Vitest + Testing Library + MSW.

**Spec:** `docs/superpowers/specs/2026-10-26-front-fase2-auditoria-tcc-design.md`, seção “PR 3”. Ids em `docs/audits/2026-10-auditoria-tcc.md` (FOR-01 a FOR-05, COR-01, EST-04, PROD-02). Maquetes aprovadas: `docs/audits/2026-10-auditoria-tcc/fase2/login-neutra-foco.webp`, `login-neutra-erro.webp`, `login-azul-390.webp` (o azul do botão das maquetes não entra: o botão continua o laranja de hoje).

## Global Constraints

- **Língua:** identificadores e títulos de teste em **inglês**; texto de interface, asserções sobre ele, comentários e mensagens dos guardiões em português (`CLAUDE.md` do repo).
- Cor só por token (`src/styles/CLAUDE.md`); token novo aponta para cor que já está na `palette`, com comentário do papel. Cor fora da `palette`: pare e reporte.
- Antes de cada commit: `npm run typecheck && npm run lint && npm test` (lint sem warning). Git: só `git add` dos arquivos da tarefa e `git commit`, no branch `fix/ux-entrada`; nada de stash/checkout/reset/rebase/push. Mensagem em português terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Não suba nem mate servidores; não rode `dev-checkout.sh`; não mexa nas worktrees `end-match`.
- Zona pixel-tuned (`CharacterSheetHeader.tsx`, `MentalsDiagram.tsx`, `PhysicalsDiagram.tsx`, `NenPrinciplesDiagram.tsx`): só é permitido acrescentar um atributo `autoComplete` em JSX; nenhum CSS.
- D3: credencial errada no login dá **uma** mensagem só, sem dizer qual campo (`getLoginErrorMessage` já faz isso). D2: nunca texto cru do back ou do axios.
- **Regras do back (conferidas em `System_X_System/internal/application/auth/`):** nick 3–20, e-mail 12–64, senha 8–64, no cadastro e no login. O Go mede com `len()`, isto é, **bytes UTF-8** (um “ã” conta 2). A validação do front mede igual (`new TextEncoder().encode(s).length`), com um comentário dizendo por quê.
- Textos fixos (use exatamente):
  - Avisos: `Conta criada. Entre com seu e-mail e senha.` · `Sua sessão expirou. Entre de novo.`
  - Rótulos: `E-mail` · `Senha` · `Nick` · `Confirme a senha`
  - Erros de campo: os valores já existentes em `registerValidationMessages` (`src/features/auth/authErrorMessages.ts`), extraídos para constantes exportadas e reusados pelos dois lados: `Informe o e-mail.` · `E-mail inválido.` · `O e-mail deve ter entre 12 e 64 caracteres.` · `Informe um nick.` · `O nick deve ter entre 3 e 20 caracteres.` · `Informe a senha.` · `A senha deve ter pelo menos 8 caracteres.` · `A senha deve ter no máximo 64 caracteres.` · `Confirme a senha.` · `As senhas não coincidem.`
  - Espera do login: `SERVER_WAKING_HINT` de `src/services/serverWake.ts`, depois de 3000 ms.

## Decisões deste plano

1. **Cor de erro do campo: `feedbackInputError` passa de `red800` para `red600`.** A spec pede `feedbackDanger` (red600) no erro; o token com esse papel (“borda de campo com erro, aviso de erro nas telas de login”) já existe e hoje aponta para o vermelho do brand, que a regra dos tokens tira de elementos interativos. Muda o valor do token, não a palette, e o `SignFormError` acompanha. red600 sobre branco: 4,9:1.
2. **Login valida só vazio e formato do e-mail, por campo.** Tamanho no login cai no servidor e volta como a mensagem única do D3: dizer “a senha tem no mínimo 8” no login revelaria regra sem ajudar quem esqueceu a senha. No cadastro, todas as regras, por campo.
3. **`SignField` substitui `BaseInput`** (promote, don't duplicate): o ion só existe para essas duas telas. `BaseInput.tsx` sai.
4. **Rótulo fixo na borda** (decisão delegada 3 da spec), `<label htmlFor>` de verdade; o placeholder sai.

## Review Focus

1. **Preenchimento automático do Chrome** pintando o campo de amarelo/azul e escondendo o rótulo: o `:-webkit-autofill` neutraliza. Só verificável no navegador real (o coordenador pede ao dono do produto no teste final).
2. **Vários 401 ao mesmo tempo** (a Home de uma campanha dispara várias queries): um redirecionamento só, e o aviso aparece uma vez. Teste na tarefa 3.
3. **Token vencido sem nenhuma requisição** (a Home): o app abre já no login com o aviso. Teste na tarefa 3.
4. **Login com credencial errada** (sem token): não grava aviso nem redireciona. Teste na tarefa 3.
5. **Nick com acento** perto do limite: o front recusa com a mesma conta de bytes do back, em vez de o back recusar depois. Teste na tarefa 2.

---

### Task 1: O campo `SignField` e o cartão (FOR-02, FOR-05, COR-01)

**Files:**
- Create: `src/components/molecules/SignField.tsx`
- Delete: `src/components/ions/BaseInput.tsx`
- Modify: `src/styles/tokens.ts` (grupo `border`; `feedbackInputError`), `src/components/templates/SignPagesTemplate.tsx`, `src/components/atoms/Form.tsx` (se o espaçamento morar nele), `src/components/atoms/SignFormError.tsx` (largura/recuo para casar com o campo novo), `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx` (trocar `BaseInput` por `SignField`, com os rótulos fixos)
- Test: `src/components/molecules/__tests__/SignField.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  interface SignFieldProps {
    name: string;
    label: string;
    type?: "text" | "email" | "password";
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    autoComplete: string;      // obrigatório: força quem usa a decidir
    maxLength?: number;
    error?: string | null;     // mensagem do campo; null/undefined = sem erro
  }
  export default function SignField(props: SignFieldProps): JSX.Element
  ```
  O `<input>` tem `id` derivado de `name` (`sign-${name}`), `aria-invalid` quando há erro e `aria-describedby` apontando para o id da mensagem (`sign-${name}-error`), que tem `role` nenhum (o anúncio vem do `aria-describedby` + foco; o erro geral do formulário continua no `SignFormError` com `role="alert"`).
- Token novo: `borderInputOnLight` → `palette.neutral400` (comentário: “borda de campo em repouso sobre fundo claro: login e cadastro”; 3,5:1 sobre o branco).

- [ ] **Step 1: Testes do `SignField`:** `"links the label to the input"` (`getByLabelText("E-mail")` devolve o input); `"passes autoComplete and maxLength through"`; `"marks the input invalid and describes it with the error"` (`aria-invalid="true"` e `aria-describedby` aponta para um elemento com o texto do erro); `"has no error description without an error"` (sem `aria-invalid`, sem `aria-describedby`).
- [ ] **Step 2: Rode e veja falhar** → FAIL (módulo não existe).
- [ ] **Step 3: Implemente o `SignField`** com os valores da spec: borda de 2 px `borderInputOnLight`, raio de 8 px, altura de 48 a 52 px, texto de 18 px/400 em `textOnLight`; rótulo de 14 px/600 fixo no canto superior esquerdo, sobre a borda, com fundo da cor do cartão cortando a linha. Foco (`:focus`, campo de texto tem foco próprio — o anel global não pega `input`): borda e rótulo em `actionHighlightOnLight` mais `box-shadow: 0 0 0 3px ${alpha(colors.actionHighlightOnLight, 0.35)}`. Erro: borda e rótulo em `feedbackInputError`, mensagem embaixo em 15 px/500 com o ícone de erro de 18 px que o `PageState` já usa (reuse o asset; se não couber, só o texto e diga). `:-webkit-autofill` (e `:autofill`): `-webkit-box-shadow: 0 0 0 1000px <cor do cartão> inset` e `-webkit-text-fill-color: <textOnLight>`, preservando o anel de foco (os dois `box-shadow` juntos no estado focado). Largura: a coluna de 429 px de hoje, 100% abaixo de 580 px.
- [ ] **Step 4: Cartão e espaçamento.** No `SignPagesTemplate`, o cartão mantém 16 px de margem lateral e raio de 16 px no celular, com padding de 24 × 20 px abaixo de 480 px (fim da faixa branca de ponta a ponta); os campos e o botão mantêm os cantos. O vão entre um campo e o seguinte é o **mesmo** que entre o último campo e o botão (inclua a mensagem de erro de campo dentro do bloco do campo, para o vão não mudar quando ela aparece).
- [ ] **Step 5: Tokens.** `borderInputOnLight` novo; `feedbackInputError` → `palette.red600` (decisão 1), comentário atualizado.
- [ ] **Step 6: Troque `BaseInput` por `SignField`** nas duas páginas, com rótulo, `autoComplete` (`email`, `current-password` no login; `email`, `username` no nick, `new-password` nas duas senhas do cadastro) e `maxLength` (64, 64, 20). Sem `placeholder`, sem `required`, sem `minLength`. Apague `BaseInput.tsx`. Ajuste os testes de página que buscavam pelo placeholder para buscar pelo rótulo.
- [ ] **Step 7: Rode** `npm run typecheck && npm run lint && npm test` → verde.
- [ ] **Step 8: Commit** — `feat(ui): campo do login e do cadastro com rótulo na borda e foco azul`.

### Task 2: Validação, cadastro concluído e preenchimento automático (FOR-01, FOR-03, FOR-04)

**Files:**
- Create: `src/features/auth/validateSignForms.ts`, `src/features/auth/__tests__/validateSignForms.test.ts`
- Create: `src/components/atoms/SignNotice.tsx` (aviso neutro sobre fundo claro)
- Modify: `src/features/auth/authErrorMessages.ts` (constantes exportadas), `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`, `src/components/atoms/Form.tsx` (`noValidate`)
- Modify (autocomplete desligado onde não faz sentido): os campos de nome em `CreateCampaignPage`, `EditCampaignPage`, `CreateMatchPage`, `EditMatchPage`, `CreateNpcPage`, a ficha (`CharacterSheetHeader.tsx`, só o atributo) e os campos de perfil da ficha (`ProfileInputs.tsx`). Liste no relatório cada campo e a decisão; em caso de dúvida num campo, reporte.
- Test: `src/pages/__tests__/LoginPage.test.tsx`, `src/pages/__tests__/RegisterPage.test.tsx`

**Interfaces:**
- Consumes: `SignField` (`error` prop) da tarefa 1.
- Produces:
  ```ts
  type FieldErrors<K extends string> = Partial<Record<K, string>>;
  export function validateLogin(form: { email: string; password: string }): FieldErrors<"email" | "password">;
  export function validateRegister(form: { email: string; nick: string; password: string; confirmPass: string }): FieldErrors<"email" | "nick" | "password" | "confirmPass">;
  export function byteLength(s: string): number;
  ```
  Formato do e-mail: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (o mesmo nível de exigência do `type="email"` que sai; o back tem a palavra final).
- `SignNotice({ message }: { message: string })`: faixa neutra (texto `textOnLight`, faixa lateral `actionHighlightOnLight`, fundo `alpha(actionHighlightOnLight, 0.08)`), no mesmo recuo do `SignFormError`, com `role="status"`.

- [ ] **Step 1: Testes do validador** (valores exatos dos Global Constraints): `"login: empty fields get their own messages"`; `"login: malformed email is rejected"`; `"login: password length is left to the server"` (senha de 3 caracteres → sem erro); `"register: email shorter than 12 bytes is rejected"`; `"register: nick counts UTF-8 bytes like the server"` (`"Joãozinho Silva Jr."` com 19 caracteres e 20 bytes passa; com mais um “ã” e 20 caracteres, 22 bytes, falha); `"register: password under 8 and over 64 are rejected"`; `"register: mismatched confirmation is rejected"`; `"valid forms return no errors"`.
- [ ] **Step 2: Rode e veja falhar.**
- [ ] **Step 3: Implemente** o validador e as constantes de mensagem (o mapa `registerValidationMessages` passa a usar as mesmas constantes).
- [ ] **Step 4: Páginas.** `noValidate` no `Form`. No submit, roda o validador; com erros, mostra cada um no seu `SignField` e foca o primeiro campo com erro; sem erros, chama a API. O erro do servidor continua no `SignFormError` embaixo dos campos. Editar um campo limpa o erro dele. Sai o “Preencha todos os campos!”.
- [ ] **Step 5: Cadastro concluído (FOR-01).** O cadastro navega com `navigate("/", { state: { registered: form.email } })`; o login lê `location.state`, preenche o e-mail e mostra `SignNotice` com `Conta criada. Entre com seu e-mail e senha.` acima dos campos.
- [ ] **Step 6: Testes de página.** Login: `"shows field errors without calling the API"` (vazio → `Informe o e-mail.` e `Informe a senha.`, nenhum request); `"keeps a single message for wrong credentials"` (401 → `E-mail ou senha incorretos.`, sem erro de campo); `"after sign-up, prefills the email and shows the notice"`. Cadastro: `"shows each field error under its field"`; `"navigates to login with the email after success"`.
- [ ] **Step 7: Autocomplete nos outros formulários** (lista em Files).
- [ ] **Step 8: Rode e commite** — `feat(auth): validação própria em português, aviso de conta criada e autocomplete`.

### Task 3: Sessão expirada e espera do login (EST-04, PROD-02)

**Files:**
- Create: `src/utils/jwt.ts`, `src/utils/__tests__/jwt.test.ts`
- Create: `src/features/auth/sessionNotice.ts` (a chave e as funções de gravar/ler-e-apagar)
- Modify: `src/services/httpClient.ts`, `src/contexts/TokenContext.tsx`, `src/pages/LoginPage.tsx`, `CLAUDE.md` do repo (seção Auth & session: a chave nova)
- Test: `src/services/__tests__/httpClient.test.ts`, `src/pages/__tests__/LoginPage.test.tsx`, um teste do `TokenProvider` (onde já houver, ou `src/contexts/__tests__/TokenContext.test.tsx`)

**Interfaces:**
- Produces:
  ```ts
  // src/utils/jwt.ts — sem biblioteca: base64url do payload, `exp` em segundos
  export function isJwtExpired(token: string, nowMs: number = Date.now()): boolean; // payload ilegível → true
  // src/features/auth/sessionNotice.ts
  export const SESSION_EXPIRED_KEY = "sessionExpired";
  export function markSessionExpired(): void;          // sessionStorage[KEY] = "1"
  export function consumeSessionExpired(): boolean;    // lê e apaga
  ```

- [ ] **Step 1: Testes.** `jwt.test.ts`: `"reads exp from the payload"`, `"treats a past exp as expired"`, `"treats an unreadable token as expired"`. `httpClient.test.ts`: `"a 401 with a stored token marks the session as expired and redirects once"` (dois 401 em paralelo → uma atribuição a `window.location.href`, aviso gravado); `"a 401 without a token (wrong credentials) marks nothing"`. `TokenProvider`: `"an expired stored token is dropped on start and marks the session as expired"` (token e user saem do `localStorage`, `token` nulo). Login: `"shows the expired-session notice once"` (com o aviso gravado: aparece `Sua sessão expirou. Entre de novo.`; remontado, não aparece de novo).
- [ ] **Step 2: Rode e veja falhar.**
- [ ] **Step 3: Implemente.** Interceptor: com 401 e token guardado, limpa as duas chaves de auth, `markSessionExpired()` e redireciona; uma flag de módulo impede um segundo redirecionamento enquanto o primeiro acontece (o segundo 401 já não acha token, mas a flag deixa isso explícito e testável). `TokenProvider`: na hidratação, token vencido → mesma limpeza + `markSessionExpired()`, estado nulo. Login: lê `consumeSessionExpired()` uma vez (inicializador do `useState`, apagando num efeito para sobreviver ao StrictMode) e mostra `SignNotice`.
- [ ] **Step 4: Espera do login (PROD-02).** Enquanto o login está pendente, um componente montado só nesse estado usa `useDelayedFlag(3000)` e mostra `SERVER_WAKING_HINT` embaixo do botão, em texto neutro sobre o cartão (não como erro). Teste: `"shows the waking hint after 3 s of pending login"` (timers falsos; antes de 3 s não aparece).
- [ ] **Step 5: `CLAUDE.md` do repo:** na seção do interceptor, a chave `sessionStorage["sessionExpired"]` e quem a grava (interceptor, `TokenProvider`) e quem a consome (login).
- [ ] **Step 6: Rode e commite** — `feat(auth): aviso de sessão expirada e espera do servidor no login`.

---

## Verificação final (coordenador)

- Navegador (headless, 1280 e 390 px): login e cadastro em repouso, foco por Tab (anel azul translúcido + borda azul), erro de campo, erro de credencial, aviso de conta criada (cadastro real com conta descartável local), sessão expirada (token com `exp` vencido injetado → abre `/home` → cai no login com o aviso), espera de 3 s (requisição de login pendurada via `Fetch`).
- Comparar com as maquetes `login-neutra-*` e `login-azul-390`.
- Não verificável no headless: o preenchimento automático real do Chrome → vai no PR como item para o dono do produto conferir.
- Design System: `borderInputOnLight` e o novo valor de `feedbackInputError`.
