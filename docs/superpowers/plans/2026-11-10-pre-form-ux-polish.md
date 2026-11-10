# Polimento antes do formulário de usuários (2026-11-10)

Última rodada antes de enviar o site a usuários de teste (TCC do designer). Meta: **zero atrito no
primeiro contato**. Problemas achados pelo designer + causas raiz achadas no levantamento.

Não mexer: `/game` (GameMasterPage/GamePlayerPage/GamePage, sessão paralela `feat/story-clock`) e a
camada do mapa tático (`src/features/tactical-map/`, sessão paralela de mapa).

Regras do repo que todo task segue: código/identificadores/títulos de teste em **inglês**; UI e
comentários em **português**. Cor só via `src/styles/tokens.ts` (`colors`/`alpha`); palette nova é
decisão do designer — **reutilize tokens existentes**. `import type` para tipos. Leia
`src/components/CLAUDE.md` (zona pixel-tuned: não normalizar `CharacterSheetHeader.tsx` nem os
diagramas) e `src/pages/CLAUDE.md`. `npm run lint`, `npm run test`, `npm run build` verdes ao fim de
cada task. Commit por task.

---

## Task 1 — Backend: limites contam caracteres; relógio do servidor em UTC

Repo `System_X_System/`, branch `fix/text-limits-runes-utc` a partir de `main`.

**Causa 1.** As validações de tamanho usam `len(s)` (bytes UTF-8). "Missão" vale 7. As colunas são
`VARCHAR(n)`, que o Postgres conta em caracteres. Troque por `utf8.RuneCountInString` em:
- `internal/application/campaign/create_campaign.go` e `update_campaign.go` (name 5–32, brief 255, callLink 255)
- `internal/application/match/create_match.go` e `update_match.go` (title 5–32, brief 255)
- `internal/domain/entity/character_sheet/sheet/character_profile.go` (nick 3–10, fullname 6–32, brief 255)
- `internal/application/scenario/create_scenario.go` (name 5–32, brief 64)
- `internal/application/auth/register.go`: **só o nick** (3–20). E-mail e senha continuam em bytes.
- `internal/domain/map/service/map_validator.go` (name ≥ 3).
Teste por regra: um caso com acento no limite exato (ex.: título de 32 caracteres com "ã") passa;
33 caracteres falha.

**Causa 2.** As colunas de data/hora da partida são `TIMESTAMP` (sem fuso). O pgx grava o relógio
de parede do `time.Time` na zona dele e lê de volta como UTC. `time.Now()` numa máquina em
America/Sao_Paulo grava 15:00 BRT, que é lido como 15:00Z. No Render (UTC) isso não acontece, mas o
dev local diverge. Correção na raiz: no início do `main` de `cmd/api`, `cmd/game` e `cmd/devseed`,
`time.Local = time.UTC`, com comentário em PT explicando o porquê. Não altere migrations.

**Contrato.** Em `docs/dev/api/match.md`, `campaign.md` e `character-sheet.md`: os limites são
"caracteres" (não bytes). Em `match.md`: `gameScheduledAt` é um instante real em RFC 3339 (o front
envia em UTC com `Z`); a resposta vem em UTC (`Z`). `gameStartAt` idem. Registre em
`docs/documentation-map.yaml` se a entrada não existir.

`go vet ./...`, `go test ./...` e `golangci-lint run` verdes.

---

## F — Frontend: branch `fix/pre-form-ux-polish` a partir de `main` (repo `System_X_System_React/`)

### Task 2 — Data/hora da sessão é um instante real

Causa: `CreateMatchPage` e `EditMatchPage` enviam `` `${local}:00Z` ``. 15:00 em Brasília vira
15:00Z = 12:00 BRT, e o back recusa com "no passado" qualquer horário nas próximas 3 horas. A
exibição lê os dígitos da string, então "Iniciada em" (carimbado pelo servidor em UTC) aparece 3h
adiantada no site online.

Em `src/utils/date.ts`, separar os dois tipos de data, com comentário:
- **Data da história** (no universo do jogo, só dia): continua lida pelos dígitos. Não mexer.
- **Instante real** (`gameScheduledAt`, `gameStartAt`, `gameEndAt`, `nextGameScheduledAt`): passa por `Date`.
  Novas funções: `localInputToInstant("2026-11-10T15:00") → "2026-11-10T18:00:00.000Z"`
  (`new Date(value).toISOString()`); `instantToLocalInput(iso)` (usa `toLocalDateTimeInputValue(new Date(iso))`);
  `formatInstantDateTimeBR(iso)` → `"10/11/2026 às 15:00"` no fuso local; `formatInstantDateBR(iso)`;
  `daysFromTodayInstant(iso)` (dia local do instante).
Use-as em: CreateMatchPage/EditMatchPage (envio e carga do valor), `MatchHeaderSection`
("Agendada para", "Iniciada em", tooltip), `CampaignCard.formatNextGame`. Use `grep -rn "gameStartAt\|gameEndAt\|ScheduledAt"`
para não esquecer nenhum lugar fora de `/game`. Testes unitários com `TZ` fixo: o vitest roda no fuso
da máquina. Use `process.env.TZ = "America/Sao_Paulo"` no setup do arquivo, ou asserções que não
dependam do fuso.

### Task 3 — Validação no próprio campo, sem surpresa ao enviar

Hoje: os erros só aparecem ao clicar em "Criar", num banner **no topo** da página, que o usuário não
vê porque está no rodapé. Novo comportamento, igual em todos os formulários de criação/edição:

1. **Limite máximo**: o campo tem `maxLength`, então não dá para digitar além. Ao atingir o
   limite, aparece abaixo do campo uma nota neutra: "Limite de 32 caracteres atingido." Ela some
   quando o texto fica abaixo do limite.
2. **Mínimo / obrigatório / formato**: erro em vermelho abaixo do campo, mostrado no `blur` (campo
   tocado) e também no envio. Exemplos: "O título deve ter pelo menos 5 caracteres.", "Campo
   obrigatório." Some assim que o valor fica válido (revalida no `change` depois de tocado).
3. **Datas**: erro **imediato** no `change`. Sessão no passado: "Escolha um horário a partir de
   agora." Mais de 1 ano: "A sessão deve ser nos próximos 12 meses." Data da história fora da
   campanha: as mensagens já existentes em `matchErrorMessages.ts`. Passe `min`/`max` ao `DateField`
   para o calendário já desabilitar os dias inválidos (a sessão tem `min` = hoje e `max` = hoje + 1 ano).
4. **Envio com erro**: não chama a API. Marca todos como tocados, rola até o primeiro campo
   inválido e o foca (`scrollIntoView({ block: "center" })` + `focus()`).
5. **Erro do servidor** (o que não dá para prever no front): o banner sai do topo e vai para **logo
   acima dos botões** no `CreateFormTemplate`, rolando para a vista quando aparece.

Peças, na camada certa:
- `FormField` (molecule) ganha `error?: string | null` e `notice?: string | null`. O texto vai
  abaixo do campo (`id="${htmlFor}-error"` / `-notice`). O erro tem `role="alert"`, a nota tem
  `role="status"`. O campo recebe `aria-invalid` e `aria-describedby`. Cores: erro com
  `colors.feedbackDangerText` (ou o token de perigo legível sobre o marrom já usado no
  `SignFormError` dark). A nota é neutra (`colors.textMuted`/`textPrimary`).
- `src/constants/fieldLimits.ts`: limites espelhando o back (Task 1), um objeto por entidade (match,
  campaign, sheet, user, map), contados em caracteres (`[...s].length`).
- Um hook pequeno, ex.: `src/hooks/useFieldValidation.ts`, recebe as regras por campo e devolve
  `errorFor(name)`, `noticeFor(name)`, `touch(name)`, `validateAll()` (que devolve o primeiro campo
  inválido). Sem biblioteca nova.
- Substitui `missingRequiredMessage` nesses formulários. Mantenha `incompleteInputMessage` só se
  ainda tiver uso; senão, remova junto com os testes dele.

Aplicar em: `CreateMatchPage`, `EditMatchPage`, `CreateCampaignPage`, `EditCampaignPage`. Os
campos e os limites estão em `src/constants/fieldLimits.ts`. `callLink` é opcional com no máximo
255 caracteres. Na campanha, confira as regras de data em `EditCampaignPage` (história corrente
não pode regredir nem ficar antes do início; veja os erros em `internal/application/campaign/error.go`
no back) e mostre os erros dela no campo também. Testes de página: erro inline aparece, envio não
chama a API, nota de limite aparece no máximo, erro do servidor aparece acima dos botões.

Login e cadastro (`SignField`) já têm erro por campo. Só alinhe a contagem do nick do cadastro a
caracteres (Task 1); e-mail e senha seguem em bytes.

### Task 4 — Ficha de personagem (criar/editar) e NPC

- `ProfileInputs.tsx`: o nome completo ganha `maxLength={32}` e a descrição breve
  `maxLength={255}`, com a mesma nota de limite. Não use `FormField` se o layout da ficha não
  comportar: um texto pequeno abaixo do campo, no estilo da ficha, basta. Mínimo do nome completo (6)
  no blur. Idade: não aceita negativo nem vazio que vire 20 escondido. Hoje
  `value={profile?.age || defaultAge}` mostra 20 quando o estado é 0. O campo deve mostrar o valor
  real, com `min={1}` e erro inline se for menor que 1.
- Nickname (`CharacterSheetHeader.tsx`, zona pixel-tuned): já tem `maxLength={10}`. **Não altere o
  layout.** No máximo, um `title`/tooltip; o erro de mínimo continua no resumo ao enviar.
- O erro de envio da ficha (`SubmitErrorText`, já ao lado dos botões): role para a vista quando
  aparecer.
- Mesmo tratamento em `CreateNpcPage` e `EditCharacterSheetPage`, que reutilizam os componentes da
  ficha.

### Task 5 — Barra de rolagem vermelha só na página

A paleta global `dark` (`src/styles/scrollbar.ts`) pinta **todo** elemento rolável com o polegar
vermelho (`surfaceScrollThumbAccent`). Nas textareas da ficha isso parece erro. A rolagem da página
(janela/`html`) continua vermelha. Os roláveis internos (textarea, listas e modais como
`BackgroundEditorModal`/`ImagePickerModal`) passam a um polegar neutro. Crie a paleta
`darkInner` com tokens neutros **existentes** (ex.: um cinza já usado). Se precisar de um token
semântico novo, ele aponta para uma cor que já está na `palette`. Siga `src/styles/CLAUDE.md`.
Atualize o comentário de `globalScrollbar`. Verifique no browser: a página da ficha com barra
vermelha e a textarea da descrição com barra neutra.

### Task 6 — Lobby fechado: sem piscar, aviso que não passa batido

Hoje o jogador clica "Entrar no Lobby", a página do lobby **renderiza inteira** enquanto o socket
conecta, o servidor fecha com `lobby_not_open` e o jogador volta à partida. Ali, um aviso discreto
(amarelo sobre marrom, `SignNotice` dark) fica no meio do cabeçalho. Ninguém lê.

1. `LobbyPage`: enquanto o jogador (não o mestre) nunca chegou a `connected`, mostre
   `PageLoading` ("Conectando ao lobby…", ou a mensagem de servidor acordando quando `waking`) no
   lugar do lobby. Use um ref "já conectou" para não trocar pelo loading numa reconexão no meio da
   sessão. Quem já conectou continua vendo o lobby com a barra de status atual.
2. `MatchPage`: ao voltar com `lobbyNotOpen`, abra um **diálogo** (molecule nova `InfoDialog`, irmã
   do `ConfirmDialog`, com o mesmo overlay e o mesmo visual, um botão "Entendi", Esc e clique fora
   fecham, foco no botão). Título: "O lobby ainda não foi aberto". Texto: "O mestre precisa abrir o
   lobby antes que os jogadores possam entrar. Aguarde o aviso do mestre e tente de novo." Ao
   fechar, limpe o `location.state` (`navigate(".", { replace: true, state: { ...rest } })`
   preservando `sheetId`), para o diálogo não voltar ao recarregar. Remova o `SignNotice` do
   `MatchHeaderSection` e a prop `lobbyNotOpen` dele.
3. Contraste dos avisos sobre fundo escuro em todo o site: `SignNotice` e `SignFormError` com
   `tone="dark"` passam de borda fina + tinta 16% a algo que salta da página: fundo mais
   opaco da própria cor (ex.: `alpha(..., 0.35)` sobre `overlayDark`), borda inteira de 2px na cor
   de destaque, fonte 18px. Confirme que o contraste do texto fica ≥ 4.5:1.

`feat/story-clock` (aberta) também mexe em `LobbyPage`/`MatchPage`/`MatchHeaderSection`: mudanças
pequenas e localizadas. Mantenha as suas também localizadas, para o rebase ser trivial.

### Task 7 — Telas de entrada e home

- `SignPagesTemplate`: o `Logo` sai de dentro do cartão branco e fica **acima** dele, direto sobre
  o fundo azul, com a **mesma largura do cartão** (`min(535px, 100%)`; abaixo de 480px, 100%). As
  nuvens (`RisingClouds`) continuam atrás. Login e cadastro, ambos usam o template. Ajuste o
  `Logo` (ion) para aceitar largura do pai sem quebrar os outros usos (`grep -rn "<Logo"`).
- `HomePage`/`NavigationCard`: `description` aceita `ReactNode`. Textos:
  - Personagens: "**Jogador**, entre aqui para criar e gerenciar suas fichas de personagem!"
  - Campanhas: "**Mestre**, entre aqui para criar e gerenciar suas campanhas e partidas!"
  "Jogador"/"Mestre" em `<strong>` com `font-weight: 700` e `colors.textPrimary` (o resto da
  descrição é `textMuted`). Atualize os testes que leem o texto antigo.

---

## Final — Verificação final (sessão principal)

Browser ponta a ponta (CLAUDE.md da raiz): criar partida com horário daqui a 1h (aceita), no
passado (barrado no campo), título no limite (nota). Criar campanha. Ficha: barra neutra na
textarea. Lobby fechado como jogador: loading e diálogo. Login/cadastro com logo fora do cartão.
Home com os textos. Varredura rápida das telas de criação/edição à procura de atrito do mesmo tipo.
