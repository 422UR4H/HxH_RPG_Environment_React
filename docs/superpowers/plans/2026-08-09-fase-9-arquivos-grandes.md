# Fase 9 — `MatchPage`, datas e as últimas pontas

> **Para quem implementa:** execute tarefa por tarefa, na ordem.
> Última fase do refactor. Ao terminar, rode os critérios de aceite do spec (§5).

**Spec de referência (leia D8 e §2):**
`docs/superpowers/specs/2026-08-09-mvp-debt-closeout-design.md`

**Pré-requisito:** Fase 8 mergeada (os dois PRs).

**Branch:** `refactor/fase-9-arquivos-grandes`

---

## Task 1 — `utils/date.ts`

Manipulação de data por `split("T")` aparece em **7 lugares**, com 5 formas diferentes:

| Arquivo | Linha | O que faz |
|---|---|---|
| `pages/MatchPage.tsx` | 41 | ISO → `dd/mm/aaaa` |
| `pages/MatchPage.tsx` | 46 | ISO → data + hora |
| `pages/CampaignPage.tsx` | 206 | pega só a parte de data |
| `pages/CreateMatchPage.tsx` | 40 | hoje, para `<input type="date">` |
| `pages/CreateCampaignPage.tsx` | 35 | idem |
| `features/sheet/ProfileInputs.tsx` | 45 | ISO → valor de input |
| `features/sheet/ProfileDetails.tsx` | 39 | ISO → exibição |

### 1.1 Teste primeiro

**Crie** `src/utils/__tests__/date.test.ts` (o diretório já existe desde a Fase 6).

Cubra, para cada função:
- ISO completo com hora e timezone (`"2026-08-09T14:30:00Z"`);
- ISO só com data (`"2026-08-09"`);
- string vazia e `undefined`/`null` → devolve `""`, **sem lançar** (várias das origens são
  campos opcionais do backend);
- string malformada → `""`, sem lançar.

**Atenção ao fuso.** O código atual faz `split("T")` justamente para **não** passar por `new
Date()`, que converteria para o fuso local e poderia mudar o dia. Preserve esse comportamento —
`"2026-08-09T23:00:00Z"` tem que exibir `09/08/2026`, não `10/08`. **Escreva um teste explícito
para isso**, senão a próxima pessoa "melhora" usando `toLocaleDateString` e quebra em silêncio.

### 1.2 Implementar e aplicar

`src/utils/date.ts` com `formatDateBR`, `formatDateTimeBR` e `toDateInputValue`. Nomes descritivos
e um comentário explicando a decisão do fuso.

Substitua nos 7 pontos. **Preserve o formato exato de saída de cada um** — compare visualmente
antes e depois; se algum exibia `dd/mm/aaaa` e outro `aaaa-mm-dd`, são funções diferentes, não
force um formato só.

---

## Task 2 — Teste do `debounce`

`src/utils/debounce.ts` (17 linhas) não tem teste, e ele governa o `handleSet` do zundo — o
debounce de 400ms que agrupa mudanças contínuas num único passo de undo do editor de mapa. Se
ele quebrar, o undo fragmenta e ninguém percebe até usar.

**Crie** `src/utils/__tests__/debounce.test.ts`, com `vi.useFakeTimers()`:

1. Uma chamada → a função roda depois do delay, não antes.
2. Três chamadas dentro da janela → roda **uma** vez, com os argumentos da **última**.
3. Chamadas espaçadas além do delay → roda uma vez para cada.
4. Se houver `cancel`/`flush` na implementação, cubra.

---

## Task 3 — Quebrar `MatchPage`

717 linhas — o maior arquivo do codebase. Composição: 6 hooks de dados, 4 `useState`,
6 handlers, e **29 styled-components ocupando as linhas 448–717** (~270 linhas).

Tem **23 testes** em `pages/__tests__/MatchPage.test.tsx`. É a melhor rede de qualquer arquivo
grande do projeto — por isso ele é o candidato certo.

**Não tente descer de 717 para 200 num passo.** A ordem, em commits separados:

### 3.1 Extrair os styled-components

Para `src/pages/MatchPage.styles.ts`. São 270 linhas que não têm lógica nenhuma. Sozinho isso
leva o arquivo a ~450.

> Convenção nova: o projeto usa `styled-components` inline hoje. Se esta for a primeira
> extração para arquivo `.styles.ts`, **registre a convenção** em
> `src/components/CLAUDE.md` (uma frase: quando o bloco de styled passa de ~150 linhas, extrair
> para `<Componente>.styles.ts` ao lado). Sem isso vira exceção órfã.

Rode a suíte. Verde e sem mudança visual — é só mover.

### 3.2 Extrair as sub-seções

O JSX tem blocos identificáveis (lista de inscrições com aceitar/rejeitar, lista de
participantes, cabeçalho da partida, painel de mapa anexado). Extraia os que tiverem **mais de
~40 linhas de JSX** para `src/features/match/` — são de uma feature só, então **não** vão para
`components/` (regra do `src/components/CLAUDE.md`).

Cada extração é um commit. Rode a suíte a cada uma.

**Pare quando o arquivo estiver em ~250-300 linhas.** Ele orquestra 6 fontes de dados; abaixo
disso você começa a espalhar a orquestração, que é pior que concentrá-la.

### 3.3 O que não extrair

Os 6 hooks de dados e os 4 `useState` ficam. `MatchPage` é o orquestrador — é o trabalho dele.

---

## Task 4 — Os `any` que sobraram

Depois das Fases 6 e 8 devem restar ~9 erros de lint. Trate os que têm correção clara:

- **`hooks/useForm.ts:3`** — `T extends Record<string, any>`. Troque por
  `Record<string, unknown>` e ajuste o que o `tsc` apontar. Se `unknown` causar cascata nos
  consumidores, use `Record<string, string | number | boolean | null>` — o hook só lida com
  valores de `<input>`. **Escreva teste antes**: o hook não tem nenhum, e é usado em todos os
  formulários. Casos: estado inicial, `handleForm` atualiza pelo `name` do campo, `setForm`
  substitui.
- **`components/ions/BaseSelect.tsx:10-11`** — olhe o contexto; se for um genérico de opções,
  provavelmente vira `<T,>` em vez de `any`.
- **`types/characterClass.ts:32`** e **`types/characterSheet.ts:187`** — decida caso a caso. Se
  o tipo correto não for óbvio em 5 minutos, **deixe e anote no PR**. Tipo errado é pior que
  `any` honesto.

Os 2 `no-unused-expressions` em `MentalsDiagram:36` e `PhysicalsDiagram:54` estão na **zona
pixel-tuned** — não toque.

---

## Task 5 — Documentação de fechamento

O dono do projeto pediu explicitamente documentação que sirva de **aprendizado e referência**,
não só de registro. Produza:

**`docs/dev/frontend-architecture.md`** — visão geral do front para quem chega (ou para uma
sessão futura), em português, leitura humana:

- as camadas (`pages` → `features` → `components/{ions,atoms,molecules,organisms,templates}`) e
  a regra de quando algo vive em `components/` vs `features/`;
- como dados entram: React Query nos `hooks/`, `services/` na fronteira HTTP (e que **não há
  mais conversão de case** — aponte para `http-boundary-inventory.md`);
- como erros de API são tratados (`getApiErrorDetail`, uma forma só);
- o que é a zona pixel-tuned e por que não se mexe nela;
- a camada Pixi do mapa tático: onde vive, e que **não tem cobertura de teste** — mudança ali
  exige verificação visual;
- como rodar teste, lint e build.

Linke a partir do `CLAUDE.md` da raiz do repo React, com uma linha.

---

## Verificação final do refactor inteiro

Rode os critérios de aceite do spec (§5) e reporte cada um:

1. `npx tsc -b` — limpo.
2. `npm run lint` — **≤ 5 erros** em `src/`.
3. `npm test` — verde, muito acima dos 402 do baseline de 2026-08-09.
4. `go vet ./...` e `go test ./...` — verdes.
5. `src/utils/caseConverter.ts` não existe.
6. `grep -rn "data\.message\|alert(\|console\." src/ --include=*.ts --include=*.tsx | grep -v __tests__ | grep -v "/test/"` → vazio.
7. Nenhum `any` em struct de resposta Go.
8. Nenhum arquivo de produção em `src/` acima de ~450 linhas, salvo a zona pixel-tuned
   (`PhysicalsDiagram` 527, `CharacterSheetHeader` 489) e `CharacterSheetTemplate` (493).

---

## Entrega

1. `./dev-checkout.sh refactor/fase-9-arquivos-grandes`.
2. **Verificação visual:** a página de partida inteira (cabeçalho, datas exibidas, inscrições —
   aceitar e rejeitar, participantes, anexar e desanexar mapa, entrar no lobby), mais uma tela
   de ficha (as datas de `ProfileInputs`/`ProfileDetails` mudaram) e os dois formulários de
   criação (campo de data preenchido com hoje).
   **Confira as datas com atenção** — o erro característico da Task 1 é o dia mudar em ±1 por
   causa de fuso.
3. Abrir o PR.

**Título:** `refactor(front): quebrar MatchPage, unificar datas e fechar débito do MVP`

No corpo: os 8 critérios de aceite com o resultado de cada um.

---

## O que NÃO fazer

- **Não** toque em `CharacterSheetHeader` nem em `PhysicalsDiagram`. Avaliado no spec (§2): não
  há melhoria estrutural sem mexer no ajuste manual de pixel.
- **Não** troque `split("T")` por `new Date()` "para ficar mais correto". O `split` existe para
  evitar conversão de fuso.
- **Não** quebre `LobbyPage` (448), `CampaignPage` (440) nem `GamePage` (429) nesta fase. Estão
  no limite, têm teste, e não há problema conhecido neles. Se sobrar fôlego, são candidatos a um
  PR próprio depois — não escopo daqui.
- **Não** force um tipo em `types/` só para calar o lint.
