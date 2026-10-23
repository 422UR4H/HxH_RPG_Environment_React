# Plano: logo do header no mesmo lugar, mensagens de erro amigáveis e bolinhas de carregamento (2026-10-23)

Origem: três queixas do dono do produto. Sem spec: as causas foram medidas no navegador pelo controlador e as
decisões estão neste plano (seção "Decisões").

## Contexto global

- Repo: `System_X_System_React/`, branch `fix/ux-logo-errors-loading`, worktree
  `.worktrees/ux-polish` (base `origin/main` 2653b3c). Trabalhe **só** dentro desta worktree. O checkout
  principal tem trabalho não commitado de outra sessão: não leia, não edite, não rode nada lá.
- Leia `CLAUDE.md` do repo, `src/components/CLAUDE.md` e `src/pages/CLAUDE.md` antes de mexer.
- Testes de página seguem `src/pages/__tests__/` (MSW, `renderWithProviders` de `src/test/render.tsx`,
  `server` de `src/test/server.ts`, API em `http://localhost:5000`).

## Restrições globais (valem para toda tarefa)

1. TypeScript strict, `verbatimModuleSyntax` (`import type` para tipos), `styled-components` só, cores só
   por token de `src/styles/tokens.ts` (não crie nem renomeie token). Não tocar a zona pixel-tuned.
2. Textos de UI e comentários em **português**. Comentário só para o porquê não óbvio.
3. Antes de commitar: `npm run typecheck && npm run lint && npm test` (lint é `--max-warnings 0`).
4. Git: só `git add` dos seus arquivos + `git commit`. Nada de `stash`, `checkout`, `reset`, `rebase`, `push`.
   Mensagem no estilo do repo (`fix(ui): …`, em português), terminando com a linha
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
5. Não suba, mate nem reinicie servidores. Não rode `dev-checkout.sh`.
6. Em `src/components/ions/BaseButton.tsx` **não altere o bloco `&:disabled { … }`** (outra sessão mexe
   nele em paralelo; tocar ali gera conflito de merge).

## Causas medidas (navegador, 1536 px de largura)

- **Logo**: o `#root` é quem rola (`ResetStyle.ts`), com barra de 12 px. Nas páginas cujo conteúdo rola
  (`/charactersheets`, `/campaigns`) o `#root` mostra a barra, o `PageHeader` fica com 1524 px e o centro da
  logo cai em x=762; nas demais (home, formulários, detalhe, editor de mapa) o header tem 1536 px e a logo
  fica em x=768. Topo (9,1 px) e largura (180 px) são iguais em todas. O `BackButton` é `position: fixed` e
  não influencia.
- **Mensagens**: `LoginPage`, `RegisterPage` e `CreateCampaignPage` mostram `getApiErrorDetail(err)` cru
  (ex.: `validation error: access denied`). `CharacterSheetPage`, `CreateCharacterSheetPage` e
  `CreateNpcPage` mostram `error.message` do axios (ex.: `Request failed with status code 500`).
- **Bolinhas**: em `ButtonSubmit.tsx`, a regra `&::before, &::after, & { … }` aplica ao **próprio
  container** `width: 10px; height: 10px; display: inline-block` e a animação de `scale`. As bolinhas
  `::before`/`::after` (10 px + 5 px de margem de cada lado) não cabem lado a lado numa caixa de 10 px,
  quebram linha e descem para fora do botão; e o `scale` do container encolhe as três juntas.

## Decisões

- D1. A logo fica no **centro da janela** em toda página com `PageHeader`, com ou sem barra de rolagem.
- D2. Mensagem de erro para o usuário nunca exibe o texto cru do backend nem do axios: sempre português, com
  fallback genérico em português para o que não está mapeado.
- D3. Login com credencial errada não diz qual campo errou (padrão de segurança): uma mensagem só.
- D4. Os erros do WebSocket da mesa (`combatErrorMessages.ts`) ficam fora: lá mostrar a mensagem de domínio
  do servidor é decisão documentada no próprio arquivo.

---

### Task 1: logo no centro da janela em toda página

**Arquivo:** `src/components/atoms/PageHeader.tsx` (só ele).

Envolva o `<LogoButton />` num `LogoSlot` (styled div) com `position: relative; left: calc(50vw - 50%);` e
um comentário curto do porquê (o `#root` rola; com a barra o header encolhe e o centro dele anda metade da
barra; o deslocamento leva a logo do centro do header para o centro da janela, e é zero sem barra).

Por que funciona: o `%` de `left` num elemento relativo é a largura da caixa de conteúdo do pai (o header,
que começa em x=0), então `50vw - 50%` é "centro da janela − centro do header": 6 px com a barra de 12 px,
0 sem ela. Deslocamento relativo não entra no cálculo de tamanho de ninguém. `Trailing` (absoluto, `right`)
e `BackButton` (fixed) não mudam. Nada vertical muda.

> Primeira tentativa descartada (medida no navegador): `padding-left: calc(100vw - 100%)` no header. Nos
> templates com `display: grid` (`CreateFormTemplate`, `DetailPageTemplate`, `MapEditorTemplate`) o grid
> dimensiona a coluna tratando o `100%` como zero: o padding conta 100vw, a coluna vai a 1716 px e a logo
> para x=858. Não use padding/margem com `%` no header.

Sem teste automatizado (jsdom não faz layout); o controlador mede no navegador. Rode typecheck + lint + test
e commite: `fix(ui): logo do header no centro da janela com ou sem barra de rolagem`.

### Task 2: mensagens de erro amigáveis

**Arquivos:** `src/utils/apiError.ts`, `src/utils/__tests__/apiError.test.ts`,
`src/features/auth/authErrorMessages.ts` (novo), `src/features/campaign/campaignErrorMessages.ts`,
`src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`, `src/pages/CreateCampaignPage.tsx`,
`src/pages/CharacterSheetPage.tsx`, `src/pages/CreateCharacterSheetPage.tsx`, `src/pages/CreateNpcPage.tsx`,
testes de página (novos `LoginPage.test.tsx` e `RegisterPage.test.tsx`; ajustes em
`CreateCampaignPage.test.tsx` e `CharacterSheetPage.test.tsx`).

1. Em `src/utils/apiError.ts`, exporte:
   - `CONNECTION_ERROR_MESSAGE = "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente."`
   - `isConnectionError(err: unknown): boolean` — `true` quando é erro do axios **sem** `response` (rede
     caiu, servidor fora). Teste em `apiError.test.ts`.
2. Novo `src/features/auth/authErrorMessages.ts` com duas funções puras que recebem `err: unknown` e
   devolvem `string`:
   - `getLoginErrorMessage(err)`: conexão → `CONNECTION_ERROR_MESSAGE`; status 401 ou 422 →
     `"E-mail ou senha incorretos."` (o 422 do login é e-mail fora de 12–64 caracteres ou senha fora de
     8–64: nenhuma conta existe assim, então é a mesma resposta — D3); status 400 →
     `"Preencha o e-mail e a senha."`; qualquer outro → `"Não foi possível entrar agora. Tente novamente em instantes."`
     Use `isApiError` de `src/services/httpClient.ts` para o status.
   - `getRegisterErrorMessage(err)`: conexão → `CONNECTION_ERROR_MESSAGE`; senão mapeia o `detail` exato
     (via `getApiErrorDetail`) por esta tabela; o que não estiver nela →
     `"Não foi possível criar a conta. Tente novamente."`

     | `detail` do backend | mensagem |
     |---|---|
     | `validation error: nickname is required` | `Informe um nick.` |
     | `validation error: nickname must be between 3 and 20 characters` | `O nick deve ter entre 3 e 20 caracteres.` |
     | `validation error: nickname already exists` | `Esse nick já está em uso. Escolha outro.` |
     | `validation error: email is required` | `Informe o e-mail.` |
     | `validation error: invalid email format` | `E-mail inválido.` |
     | `validation error: email must be between 12 and 64 characters` | `O e-mail deve ter entre 12 e 64 caracteres.` |
     | `validation error: email already exists` | `Já existe uma conta com esse e-mail.` |
     | `validation error: password is required` | `Informe a senha.` |
     | `validation error: confirm password is required` | `Confirme a senha.` |
     | `validation error: password must be longer than 8 characters` | `A senha deve ter pelo menos 8 caracteres.` |
     | `validation error: password is too long` | `A senha deve ter no máximo 64 caracteres.` |
     | `validation error: passwords mismatch` | `As senhas não coincidem.` |

     (Fonte: `System_X_System/internal/domain/entity/user/error.go`; o prefixo vem de
     `domain.NewValidationError`. Mesmo formato de chave de `campaignErrorMessages.ts`.)
3. `LoginPage` e `RegisterPage`: `onError` usa a função correspondente. Não mude mais nada nessas páginas.
4. `campaignErrorMessages.ts`: acrescente duas entradas ao mapa:
   `"validation error: user cannot have more than 10 campaigns"` → `"Você atingiu o limite de 10 campanhas."` e
   `"validation error: story start date cannot be empty"` → `"Informe a data de início da história."`.
   `CreateCampaignPage` `onError`: conexão → `CONNECTION_ERROR_MESSAGE`; senão
   `getCampaignValidationMessage(detail ?? "")`; senão o fallback que já existe
   (`"Erro ao criar campanha. Tente novamente."`). Nunca o `detail` cru.
5. `CharacterSheetPage`: em vez de `error.message`, 404 → `"Ficha não encontrada."`; outro →
   `"Não foi possível carregar a ficha. Tente novamente mais tarde."`.
   `CreateCharacterSheetPage` e `CreateNpcPage` (o `error` é da query de classes): →
   `"Não foi possível carregar as classes de personagem. Tente novamente mais tarde."`.
6. Testes de página (comportamento visível, não implementação):
   - `LoginPage.test.tsx` (novo): 401 com `detail: "validation error: access denied"` → aparece
     `E-mail ou senha incorretos.` e **não** aparece `access denied`; falha de rede (`HttpResponse.error()`)
     → aparece a mensagem de conexão.
   - `RegisterPage.test.tsx` (novo): 409 `validation error: email already exists` → mensagem da tabela;
     422 com `detail` desconhecido → fallback, sem o texto cru.
   - `CreateCampaignPage.test.tsx`: o teste "mostra erro quando API retorna falha no submit" hoje espera o
     texto cru `Server explodiu` — mudança de comportamento pedida: passe a esperar o fallback em português
     e que `Server explodiu` **não** apareça. Acrescente um caso do 403 de limite de campanhas.
   - `CharacterSheetPage.test.tsx`: falha 500 ao carregar → mensagem em português, sem `Request failed`.
     Se for simples, um 404 → `Ficha não encontrada.`.

Commit: `fix(ui): mensagens de erro em português e sem texto técnico do servidor`.

### Task 3: bolinhas de carregamento do botão

**Arquivos:** `src/components/atoms/ButtonSubmit.tsx`, `src/components/ions/BaseButton.tsx` (só os blocos
`&:hover` e `&:active` — restrição 6), e o `LoginPage.test.tsx` da Task 2.

1. `ButtonSubmit`: troque o `LoadingDots` de pseudo-elementos por um container com **três `<span>` reais**:
   container `display: inline-flex; align-items: center; gap: 8px;` com `role="status"` e
   `aria-label="Carregando"`; cada bolinha `width: 10px; height: 10px; border-radius: 50%;` cor
   `colors.textOnLight` (a mesma do texto "Log In", para o botão não mudar de cara ao carregar)
   e a mesma `keyframes` de `scale` (0 → 1 → 0, 1.4s, `infinite ease-in-out both`), com atrasos
   `-0.32s`, `-0.16s` e `0s` (efeito onda). A animação vai **só** nas bolinhas, nunca no container. O botão
   não pode mudar de altura nem de largura entre "Log In" e carregando. Remova o bloco comentado do
   `react-loader-spinner` e o `TODO` dele (resolvido por esta troca).
2. `BaseButton`: `&:hover` e `&:active` passam a valer só quando habilitado (`&:hover:not(:disabled)`,
   `&:active:not(:disabled)`). Hoje, ao clicar, o mouse continua sobre o botão: ele fica levantado 5 px e
   mais claro durante todo o carregamento, parecendo clicável.
3. Teste em `LoginPage.test.tsx`: com a resposta do login segurada (handler MSW que só resolve depois que o
   teste verifica — ex.: uma promise controlada pelo teste), o botão fica desabilitado e mostra
   `getByRole("status", { name: "Carregando" })`; depois que resolve com erro, o texto `Log In` volta.

Commit: `fix(ui): bolinhas de carregamento lado a lado dentro do botão`.

## Verificação do controlador (navegador, depois das três tasks)

- Logo: medir o centro da logo em `/home`, `/charactersheets`, `/campaigns`, `/campaigns/public`,
  `/campaigns/new`, detalhe/edição de campanha e partida, criar/editar mapa — todos com o mesmo x (centro da
  janela) e o mesmo topo; repetir em largura de celular.
- Login com senha errada: mensagem em português; bolinhas lado a lado, centradas, dentro do botão.

## Rodada 2 (pedido do dono do produto depois do PR #80)

Tasks 1–3 estão entregues e revisadas. O dono do produto pediu os textos das telas de entrada em
português e o fim da mãozinha do mouse no botão desabilitado. A restrição 6 (não tocar no `&:disabled`
do `BaseButton`) foi liberada por ele: a outra sessão só troca cores de tokens.

### Task 4: telas de entrada em português e cursor do botão desabilitado

**Arquivos:** `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`, `src/components/ions/BaseButton.tsx`,
`src/pages/__tests__/LoginPage.test.tsx`, `src/pages/__tests__/RegisterPage.test.tsx`.

1. Textos (troca exata, nada mais nesses componentes):

   | Tela | Hoje | Passa a ser |
   |---|---|---|
   | Login, botão | `Log In` | `Entrar` |
   | Login, link para `/sign-up` | `First time? Create an account!` | `Primeira vez? Crie sua conta!` |
   | Login e cadastro, placeholder do campo `password` | `password` | `senha` |
   | Cadastro, placeholder do campo `confirmPass` | `confirm password` | `confirme a senha` |
   | Cadastro, botão | `Sign Up` | `Criar conta` |
   | Cadastro, link para `/` | `Switch back to log in` | `Já tem conta? Entre por aqui!` |

   Ficam como estão: os placeholders `e-mail` e `nick` (as mensagens de erro já chamam o campo de "nick").
   Minúsculas nos placeholders seguem o estilo atual da tela.
2. `BaseButton`: dentro do bloco `&:disabled`, acrescente `cursor: default;` como **última** linha do bloco,
   depois de `align-items: center;`. Não mexa nas outras linhas do bloco: a outra sessão remove o
   `background-color` dele, e uma linha nova longe dali não gera conflito no merge. Motivo: a mãozinha diz
   "dá para clicar"; o botão só fica desabilitado enquanto carrega, então a seta comum é o certo
   (`not-allowed` daria a ideia de ação proibida, que não é o caso).
3. Testes: atualize os seletores de `LoginPage.test.tsx` e `RegisterPage.test.tsx` para os textos novos
   (`getByPlaceholderText("senha")`, `getByPlaceholderText("confirme a senha")`, botão `Entrar` /
   `Criar conta`). No teste de carregamento do login, o texto que some e volta passa a ser `Entrar`.
   Não há teste de cursor (jsdom não aplica o CSS do styled-components de forma confiável); o controlador
   confere no navegador.

Commit: `fix(ui): telas de entrada em português e seta no botão desabilitado`.

## Rodada 3: logo do System X System em todo lugar

O dono do produto adicionou `src/assets/images/sxs-logo.svg` (vetorial puro: sem script, texto, imagem
embutida nem link externo; viewBox 801.31×332.17, proporção 2,41 contra 2,32 da `hxh-logo.avif`) e pediu
para ela substituir a logo atual **em todos os lugares**: o header (`PageHeader` → `LogoButton` → `Logo`) e as
telas de login e cadastro (`SignPagesTemplate` → `Logo`). Os dois passam pelo ion `Logo`, então a troca é nele.
O ícone da aba (`/vite.svg`) não é a logo e fica fora: uma logo larga não cabe num favicon quadrado.

### Task 5: logo do System X System no header e nas telas de entrada

**Arquivos:** `src/assets/images/sxs-logo.svg` (já copiado na worktree pelo controlador, só adicionar ao
commit), `src/components/ions/Logo.tsx`, remover `src/assets/images/hxh-logo.avif` (fica sem uso), novo
`src/components/ions/__tests__/Logo.test.tsx`. `LogoButton.tsx`, `SignPagesTemplate.tsx` e `PageHeader.tsx`
ficam **como estão na main** (sem diff).

1. `Logo.tsx`: troque o import por `import sxsLogo from "../../assets/images/sxs-logo.svg";` e o elemento por
   `<StyledLogo src={sxsLogo} alt="System X System" />`. O `StyledLogo` não muda: cada lugar mantém a
   largura de hoje (header `min(180px, 28vw)` pelo `LogoButton`; telas de entrada 60%), e a altura sai da
   proporção do SVG.
2. `git rm src/assets/images/hxh-logo.avif` (único import dela era o `Logo.tsx`; o histórico guarda o arquivo).
3. Teste novo `src/components/ions/__tests__/Logo.test.tsx`:
   ```tsx
   import { describe, it, expect } from "vitest";
   import { screen } from "@testing-library/react";
   import { renderWithProviders } from "../../../test/render";
   import LogoButton from "../../atoms/LogoButton";
   import SignPagesTemplate from "../../templates/SignPagesTemplate";

   describe("Logo", () => {
     it("mostra a logo do System X System no header e nas telas de entrada", () => {
       renderWithProviders(
         <>
           <LogoButton />
           <SignPagesTemplate>
             <div />
           </SignPagesTemplate>
         </>,
       );
       const logos = screen.getAllByAltText("System X System");
       expect(logos).toHaveLength(2);
       for (const logo of logos) expect(logo.getAttribute("src")).toMatch(/sxs-logo\.svg/);
     });
   });
   ```
   Rode-o antes da troca (deve falhar) e depois (deve passar).

Commit: `feat(ui): logo do System X System no header e nas telas de entrada`.
