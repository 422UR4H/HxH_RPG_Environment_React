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

---

## Rodada 4 — pedido do dono do produto (2026-10-24)

O site vai ser apresentado na banca do TCC do designer do projeto. Três pedidos:

1. As mensagens de erro do login (servidor fora, credenciais erradas…) são pequenas e não se alinham às margens dos campos e do botão.
2. A logo nova parece menor e menos centrada na vertical que a antiga.
3. O professor achou o botão "voltar" do header **embaçado** em repouso e nítido no hover.

### Medidas (Chrome headless, 1536×864)

**Erro nas telas de entrada.** Hoje é o `InlineFeedback` genérico:
- Texto: 13 px, `line-height` 13 px.
- Borda: 1 px, cantos de 5 px.
- Cor: vermelho `danger` `#e74c3c`, com contraste 3,8:1 sobre branco, abaixo do AA de 4,5:1.

A largura acompanha o texto: 179 px com "E-mail ou senha incorretos." e 475 px com a mensagem de conexão. Os campos e o botão têm 429 px, então a mensagem longa passa 23 px de cada lado. Os campos usam:
- borda de 4 px `redInputError` `#b91a40`, com contraste 6,4:1;
- 14 px de padding;
- texto de 27 px em negrito.

**Logo.**
- Header de 102 px com `padding-bottom: 0.4vw` (6 px). A logo ficava com o topo em 10,6 px e o centro em 47,9, ou seja, 3 px acima do centro.
- A antiga (180×77,7) ocupava o arquivo inteiro e também ficava 3 px acima.
- Centro de massa visual, medido sobre o verde do header: 49,4% da altura na antiga e **45,7%** na nova. O "SYSTEM" branco no alto pesa mais que o reflexo laranja embaixo.
- Por isso a nova parecia uns 6 px acima do centro, o dobro da antiga. Ela também era 3 px mais baixa (74,6 px contra 77,7).

**Seta.** Fica em `top/left: min(10px, 1.6vw)`. Em densidade 1,25× isso dá 12,5 pixels físicos, e em 1,75× dá 17,5. A imagem do SVG é desenhada a meio pixel e sai borrada. O hover (`scale(1.05)`) a redesenha alinhada, e por isso parece nítida.

Nitidez medida pelo desvio do Laplaciano (maior = mais nítido):

| densidade | hoje | 12 px | hover de hoje | camada GPU | SVG inline |
|---|---|---|---|---|---|
| 1 | 57,3 | 57,3 | 59,2 | 57,3 | 57,2 |
| 1,25 | 30,5 | **47,9** | 36,7 | 30,5 | 30,5 |
| 1,5 | 42,9 | 42,9 | 36,3 | 42,9 | 43,1 |
| 1,75 | 24,9 | **40,3** | 30,0 | 24,9 | 24,9 |
| 2 | 39,3 | 39,3 | 40,9 | 39,3 | 38,6 |

### Decisões

- **Grade do header: 102 = 12 + 78 + 12.**
  - A logo e a seta ficam com 78 px de altura e 12 px de respiro em cima e embaixo, centradas no mesmo eixo.
  - 12 é múltiplo de 4, então cai em pixel físico inteiro nas densidades 1; 1,25; 1,5; 1,75 e 2.
  - Abaixo de 671 px tudo escala junto com o header (`15.2vw`): respiro `1.8vw`, logo `28vw`, seta `20.3vw`.
- **Logo:** `min(188px, 28vw)`, que dá 77,9 px de altura, igual à antiga.
  - Logos de proporções diferentes se igualam pela altura, não pela largura.
  - O `padding-bottom` sai, e a caixa fica no centro exato.
  - O centro de massa cai em 47,6 px, praticamente onde ficava o da logo antiga (47,5), que era a referência de "centrado" do dono do produto.
- **Seta:**
  - `top/left: min(12px, 1.8vw)` e largura `min(136px, 20.3vw)`, que dá 78,7 px de altura.
  - O `alt` passa a ser "Voltar", já que a interface é em português.
  - O hover continua o mesmo.
- **Erro das telas de entrada:** um componente próprio, `SignFormError`, usado pelo login e pelo cadastro. O `InlineFeedback` continua igual para as outras 2 páginas que o usam.
  - Mesma coluna dos campos: 429 px, e 100% abaixo de 580 px, como `BaseInput`/`BaseButton`.
  - O texto começa no mesmo recuo do texto digitado. Faixa de 4 px + padding de 14 px = borda de 4 px + padding de 14 px do campo.
  - Faixa à esquerda de 4 px na cor dos campos, `redInputError`. Uma borda completa de 4 px o faria parecer um terceiro campo.
  - Fundo com a mesma cor a 8% (`14`) e cantos retos como os campos.
  - Tipografia: 18 px semibold (600), `line-height` 1,35. Fica um degrau abaixo do link (20 px, 600) na escala 27 → 20 → 18, e não abaixo de 16 px.
  - Contraste de 5,6:1 sobre o fundo tingido (AA).
  - `role="alert"`, para o leitor de tela anunciar o erro.

### Task 6: erro das telas de entrada, grade do header e seta nítida

**Arquivos:**
- novo `src/components/atoms/SignFormError.tsx`
- `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`
- `src/pages/__tests__/LoginPage.test.tsx`, `src/pages/__tests__/RegisterPage.test.tsx`
- `src/components/atoms/PageHeader.tsx`, `src/components/atoms/LogoButton.tsx`, `src/components/ions/BackButton.tsx`

1. **Testes primeiro.**
   - Em `LoginPage.test.tsx`, no teste "mostra mensagem amigável no 401, sem o texto cru do backend", acrescente depois do `findByText`:
     ```tsx
     expect(screen.getByRole("alert")).toHaveTextContent("E-mail ou senha incorretos.");
     ```
   - Em `RegisterPage.test.tsx`, no teste "traduz o 409 de e-mail já cadastrado", acrescente depois do `findByText`:
     ```tsx
     expect(screen.getByRole("alert")).toHaveTextContent("Já existe uma conta com esse e-mail.");
     ```

   Rode os dois arquivos: os dois testes devem falhar, porque hoje não há `role="alert"`.

2. **Novo `src/components/atoms/SignFormError.tsx`** (exatamente):
   ```tsx
   import styled from "styled-components";
   import { colors, fonts } from "../../styles/tokens";

   interface SignFormErrorProps {
     message: string;
   }

   // Erro das telas de entrada. Ocupa a coluna dos campos e do botão (429 px; 100% abaixo de 580 px,
   // como BaseInput/BaseButton) e começa o texto no recuo do texto digitado: faixa de 4 px + 14 px de
   // padding = borda de 4 px + 14 px de padding do campo. Faixa, não borda inteira: senão parece um campo.
   export default function SignFormError({ message }: SignFormErrorProps) {
     return <StyledSignFormError role="alert">{message}</StyledSignFormError>;
   }

   const StyledSignFormError = styled.div`
     box-sizing: border-box;
     width: 429px;
     padding: 10px 14px;
     border-left: 4px solid ${colors.redInputError};
     background-color: ${colors.redInputError}14;

     font-family: ${fonts.sans};
     font-size: min(18px, 4.6vw);
     font-weight: 600;
     line-height: 1.35;
     text-align: left;
     color: ${colors.redInputError};

     @media (max-width: 580px) {
       width: 100%;
     }
   `;
   ```

3. **`LoginPage.tsx` e `RegisterPage.tsx`:** troque o import do `InlineFeedback` por
   `import SignFormError from "../components/atoms/SignFormError";` e a linha
   `{error && <InlineFeedback message={error} variant="error" onDismiss={() => setError(null)} />}` por
   `{error && <SignFormError message={error} />}`. Não mexa em mais nada nessas páginas.

4. **`PageHeader.tsx`:** em `StyledPageHeader`, apague a linha `padding-bottom: 0.4vw;` e ponha logo acima de `height:` o comentário:
   ```tsx
     // 102 = 12 + 78 + 12: logo e seta com 78 px de altura, centradas no mesmo eixo.
     // Sem padding embaixo: o 0.4vw antigo subia a logo 3 px.
   ```

5. **`LogoButton.tsx`:** em `img`, troque `width: min(180px, 28vw);` por `width: min(188px, 28vw);` e ponha logo acima o comentário
   `/* 188 px → 78 px de altura, a da logo antiga: logos de proporção diferente se igualam pela altura. */`.
   Deixe as linhas comentadas que já existem.

6. **`BackButton.tsx`:**
   - Em `StyledBackButton`, troque `left: min(10px, 1.6vw);` por `left: min(12px, 1.8vw);` e `top: min(10px, 1.6vw);` por `top: min(12px, 1.8vw);`. Logo acima do `left:` ponha:
     ```tsx
       /* 12 px é múltiplo de 4: pixel físico inteiro nas densidades 1; 1,25; 1,5; 1,75 e 2.
          Com 10 px a seta caía em meio pixel em 1,25 e 1,75 e saía borrada (o hover a redesenhava nítida). */
     ```
   - Em `Arrow`, troque `width: min(140px, 20vw);` por `width: min(136px, 20.3vw);` e ponha acima `/* 136 px → 78,7 px de altura, a mesma da logo (grade do header). */`.
   - No JSX, `alt="Back"` passa a ser `alt="Voltar"`.

7. Rode os testes do passo 1 (agora passam), `npm run typecheck`, `npm run lint` e `npm test`.

Commit: `fix(ui): erro das telas de entrada na coluna dos campos, header centrado e seta nítida`.

## Rodada 5 — hover sem "falsa nitidez", camada própria da seta e foco pelo teclado (2026-10-25)

Pedido do dono do produto:
- O meio pixel da rodada 4 é real, mas ele não o enxergou no navegador dele em tamanho real (só no print ampliado). Suspeita que o `brightness` do hover dá a sensação de "ficar mais nítido".
- Quer a seta numa camada própria, para o borrão não voltar.
- Quer seta e logo alcançáveis pelo Tab, com o estado de hover marcando o foco, sem regredir nada.

### Medidas (Chrome headless, header verde de `/campaigns/new`, 1536 px)

**Seta em densidade 1, a tela do dono do produto.** Cada parte do hover foi aplicada como estilo fixo. A nitidez é o desvio do Laplaciano, ou seja, o contraste das bordas. "Estourados" são pixels que viraram branco puro.

| estado | nitidez | estourados |
|---|---|---|
| repouso | 63,6 | 0 |
| hover de hoje (zoom 1,05 + brilho 1,1) | 68,0 (+7%) | 191 |
| só o zoom 1,05 | 62,9 (−1%) | 0 |
| só o brilho 1,1 | 68,4 (+8%) | 162 |
| só o brilho 1,25 | 73,6 (+16%) | 259 |

- Quem dá a sensação de nitidez é o brilho. O `brightness()` multiplica as cores: o claro sobe e o escuro fica, então o contraste das bordas aumenta, e o olho lê isso como foco.
- O brilho também estoura o degradê dourado da borda.
- Com 1,25 seria o dobro nas duas coisas.

**Duas setas fixas lado a lado.** O Chrome as juntou numa camada só de 298×81. A camada começava no y=10 da cópia e borrava a seta corrigida também: 42 em vez de 55,6 a 1,25×. Com `will-change: transform` cada uma ganha a sua camada e os números voltam. A seta real hoje está sozinha numa camada de 136×79; a blindagem impede que outro elemento fixo a arraste.

**Halo testado.** Um `drop-shadow` dourado de 8 px em volta da seta fica limpo. Na logo, qualquer halo vaza para os vãos entre as letras, mesmo com 4 px a 60%: os vãos ficam oliva sobre o verde e viram uma placa dourada sobre o preto.

**Anel de foco.** Um anel de 2 px `#d4af37` com 5 px de folga e cantos de 6 px é bem visível sobre `#252525`, preto e o verde dos templates. Cabe nos 102 px do header.

### Decisões

- **Sem `brightness()` no hover** da seta e da logo.
- **Seta:** o hover e o foco continuam com o zoom de 1,05 e ganham um **halo dourado** (`drop-shadow(0 0 8px <token>cc)`). A seta "acende" por luz em volta, e os pixels dela ficam idênticos, então o repouso não parece uma versão pior.
- **Logo:** o hover e o foco ficam só com o zoom de 1,05, porque o halo sujaria os vãos.
- **Foco pelo teclado (`:focus-visible`):** o mesmo visual do hover mais o **anel dourado** nos dois.
  - O anel é o que garante que o foco seja visível também na logo, onde o hover é só o zoom.
  - O anel é um `outline` de verdade, que o modo de alto contraste do sistema preserva (filtros e sombras somem nesse modo).
  - O clique com o mouse não mostra o anel (heurística do `:focus-visible`).
- **Semântica:**
  - A seta vira `<button type="button">`. É uma ação (voltar no histórico), e `type="button"` impede que ela envie um formulário em volta.
  - A logo vira `<Link to="/">`, porque leva a um endereço. Ganha Ctrl/Cmd+clique e botão do meio para nova aba.
  - O clique simples continua passando pela trava de navegação (`confirmNavigation`) antes de navegar.
- **Camada própria da seta:** `will-change: transform` no botão, com comentário breve.
- **Token novo `controlHighlight`** (`#d4af37`, mesmo valor de `goldExp` com nome de uso, como `statusLeft`/`grayMid`). Isso é uma **exceção explícita** à restrição global 1, aprovada pelo controlador. Ele entra na seção "gold / warning", que a sessão paralela não edita.
- `transition: all` passa a listar só o que anima (`transform`, `filter`).

### Task 7: hover com halo, camada própria da seta e foco pelo teclado

**Arquivos:**
- `src/styles/tokens.ts` (só uma linha nova)
- `src/components/ions/BackButton.tsx`
- `src/components/atoms/LogoButton.tsx`
- novo `src/components/atoms/__tests__/PageHeader.test.tsx`

1. **Testes primeiro.** Crie `src/components/atoms/__tests__/PageHeader.test.tsx` (exatamente):
   ```tsx
   import { describe, it, expect } from "vitest";
   import { screen, waitFor } from "@testing-library/react";
   import userEvent from "@testing-library/user-event";
   import { useLocation } from "react-router-dom";
   import { renderWithProviders } from "../../../test/render";
   import PageHeader from "../PageHeader";

   function Pathname() {
     return <span data-testid="pathname">{useLocation().pathname}</span>;
   }

   describe("PageHeader — seta e logo", () => {
     it("a seta é um botão 'Voltar' que não envia formulário", () => {
       renderWithProviders(<PageHeader />);
       expect(screen.getByRole("button", { name: "Voltar" })).toHaveAttribute("type", "button");
     });

     it("a logo é um link para o início", () => {
       renderWithProviders(<PageHeader />);
       expect(screen.getByRole("link", { name: "System X System" })).toHaveAttribute("href", "/");
     });

     it("o Tab passa pela seta e depois pela logo", async () => {
       const user = userEvent.setup();
       renderWithProviders(<PageHeader />);
       await user.tab();
       expect(screen.getByRole("button", { name: "Voltar" })).toHaveFocus();
       await user.tab();
       expect(screen.getByRole("link", { name: "System X System" })).toHaveFocus();
     });

     it("o clique simples na logo navega para o início", async () => {
       const user = userEvent.setup();
       renderWithProviders(
         <>
           <PageHeader />
           <Pathname />
         </>,
         { route: "/campaigns" },
       );
       await user.click(screen.getByRole("link", { name: "System X System" }));
       await waitFor(() => expect(screen.getByTestId("pathname").textContent).toBe("/"));
     });
   });
   ```
   Rode só esse arquivo. Os três primeiros devem falhar, porque hoje a seta e a logo são `div`. O quarto pode passar já hoje; ele protege o comportamento.

2. **`src/styles/tokens.ts`:** logo depois da linha `  goldStar: "#f0c040", // rating star`, acrescente **só** esta linha, sem mexer em mais nada do arquivo:
   ```ts
     controlHighlight: "#d4af37", // controles do header (seta, logo): halo do hover e anel de foco; mesmo valor de goldExp, nome semântico
   ```

3. **`src/components/ions/BackButton.tsx`** (arquivo inteiro, exatamente):
   ```tsx
   import { useNavigate } from "react-router-dom";
   import styled from "styled-components";
   // import backArrow from "../../assets/icons/setavoltarsemponta.svg"
   import backArrow from "../../assets/icons/setavoltarcomponta.svg";
   import { useNavGuard } from "../../contexts/NavGuardContext";
   import { colors } from "../../styles/tokens";

   export default function BackButton() {
     const navigate = useNavigate();
     const { confirmNavigation } = useNavGuard();

     const handleClick = async () => {
       if (await confirmNavigation()) navigate(-1);
     };

     return (
       <StyledBackButton type="button" onClick={handleClick}>
         <Arrow src={backArrow} alt="Voltar" />
       </StyledBackButton>
     );
   }

   const StyledBackButton = styled.button`
     position: fixed;
     z-index: 10;
     /* 12 px é múltiplo de 4: pixel físico inteiro nas densidades 1; 1,25; 1,5; 1,75 e 2.
        Com 10 px a seta caía em meio pixel em 1,25 e 1,75 e saía borrada. */
     left: min(12px, 1.8vw);
     top: min(12px, 1.8vw);
     /* Camada própria: sem ela o Chrome pode juntar a seta a outro elemento fixo numa camada
        que comece em meio pixel, e o borrão volta. */
     will-change: transform;

     display: block;
     width: fit-content;
     height: fit-content;
     padding: 0;
     margin: 0;
     border: none;
     border-radius: 6px;
     background: none;
     cursor: pointer;

     &:focus-visible {
       outline: 2px solid ${colors.controlHighlight};
       outline-offset: 5px;
     }

     /* Acende com um halo em volta, sem mexer nos pixels da seta: o brightness() antigo
        aumentava o contraste das bordas e dava a impressão de ficar mais nítida. */
     &:hover > img,
     &:focus-visible > img {
       transform: scale(1.05);
       filter: drop-shadow(0 0 8px ${colors.controlHighlight}cc);
     }
     &:active > img {
       transform: scale(0.98);
     }
   `;

   const Arrow = styled.img`
     /* 136 px → 78,7 px de altura, a mesma da logo (grade do header). */
     width: min(136px, 20.3vw);
     height: auto;
     display: block;
     object-fit: contain;
     border: none;
     outline: none;

     transition:
       transform 0.2s ease,
       filter 0.2s ease;
   `;
   ```

4. **`src/components/atoms/LogoButton.tsx`** (arquivo inteiro, exatamente):
   ```tsx
   import type { MouseEvent } from "react";
   import { Link, useNavigate } from "react-router-dom";
   import styled from "styled-components";
   import Logo from "../ions/Logo";
   import { useNavGuard } from "../../contexts/NavGuardContext";
   import { colors } from "../../styles/tokens";

   export default function LogoButton() {
     const navigate = useNavigate();
     const { confirmNavigation } = useNavGuard();

     // Ctrl/Cmd/Shift/Alt+clique e botão do meio ficam com o navegador (nova aba): a página atual não sai.
     // O clique simples passa pela trava de navegação antes de sair.
     const handleClick = async (event: MouseEvent<HTMLAnchorElement>) => {
       if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
       event.preventDefault();
       if (await confirmNavigation()) navigate("/");
     };

     return (
       <StyledLogoButton to="/" onClick={handleClick}>
         <Logo />
       </StyledLogoButton>
     );
   }

   const StyledLogoButton = styled(Link)`
     display: block;
     width: fit-content;
     height: fit-content;
     border-radius: 6px;

     &:focus-visible {
       outline: 2px solid ${colors.controlHighlight};
       outline-offset: 5px;
     }

     img {
       /* width: min(200px, 28vw); */
       /* 188 px → 78 px de altura, a da logo antiga: logos de proporção diferente se igualam pela altura. */
       width: min(188px, 28vw);
       /* width: min(180px, 28%); */
       display: block;
       /* border: none;
       outline: none; */

       /* Só o zoom: o brightness() antigo dava a impressão de ficar mais nítida, e um halo aqui
          vazaria para os vãos entre as letras. */
       transition: transform 0.2s ease;
     }

     &:hover img,
     &:focus-visible img {
       transform: scale(1.05);
     }
     &:active img {
       transform: scale(0.98);
     }
   `;
   ```

5. Rode o teste do passo 1 (agora os quatro passam), `npm run typecheck`, `npm run lint` e `npm test`.
   - Se algum teste de página quebrar porque agora há um `button` ou `link` a mais na tela, pare e reporte. Não ajuste o teste por conta própria.

Commit: `fix(ui): hover com halo em vez de brilho, camada própria da seta e foco pelo teclado no header`.

### Rodada 5b — halo da seta adiado para aprovação do designer (2026-10-25)

O dono do produto gostou do halo, mas ele depende da aprovação do designer do projeto. O halo sai deste PR e a sessão paralela dos tokens o aplica depois da conversa com o designer.
- O hover e o foco da seta ficam só com o zoom de 1,05, igual à logo.
- Continuam sem `brightness()`, e o anel de foco dourado continua.
- O token `controlHighlight` fica, porque é usado pelo anel.
- Também ficam a posição em 12 px, a camada própria da seta e todo o resto da rodada 5.

### Task 8: tirar o halo da seta

Só `src/components/ions/BackButton.tsx`:
1. O comentário e o fragmento `lit`:
   ```tsx
   /* Acende com um halo em volta, sem mexer nos pixels da seta: o brightness() antigo
      aumentava o contraste das bordas e dava a impressão de ficar mais nítida. */
   const lit = css`
     transform: scale(1.05);
     filter: drop-shadow(0 0 8px ${colors.controlHighlight}cc);
   `;
   ```
   viram:
   ```tsx
   /* Estado aceso (hover e foco): só o zoom. Sem brightness(): ele aumentava o contraste
      das bordas e dava a impressão de a seta ficar mais nítida. */
   const lit = css`
     transform: scale(1.05);
   `;
   ```
2. No `Arrow`, a transição deixa de animar o `filter`:
   ```tsx
     transition:
       transform 0.2s ease,
       filter 0.2s ease;
   ```
   vira `  transition: transform 0.2s ease;`.

Commit: `fix(ui): seta do header sem halo até a aprovação do designer`.
