# Prévia ao vivo da ficha (criação e edição) — plano e handoff

Data: 2026-11-01. Branch nos dois repositórios: `claude/focused-turing-gynzoh`.

## Objetivo

Na criação e na edição (modo "full") da ficha, o jogador vê a ficha **exatamente** como o back
vai calculá-la a partir do que ele está prestes a enviar: poder dos atributos, valores das
perícias, princípios, nível do personagem e barras de vida/estamina/aura, atualizados a cada
ponto distribuído, proficiência escolhida ou classe trocada.

O back continua sendo a fonte da verdade: o front envia só os valores-chave (classe,
`skillsExps`, `proficienciesExps`, `attributePoints`) e o back monta e valida tudo. O front
apenas **repete** o cálculo para mostrar a prévia.

Fora de escopo: regras de batalha no front; distribuição de perícias (`skillPoints`) — nenhuma
classe usa hoje. Quando existir, a tela envia `skillsExps` e o motor já os aplica.

## Decisões (dono do produto, 2026-11-01)

- Duas implementações (Go no back, TS no front), não endpoint de prévia nem WASM.
- O motor TS fica desacoplado do app, para poder virar biblioteca depois.
- Corrigir o bug do `PhysicalsDiagram` (pontos disponíveis calculados só na montagem).

## Desenho

### Contrato: "o mesmo request, a mesma resposta"

O motor TS recebe **a mesma entrada** que o caso de uso de criação do back recebe e devolve **o
mesmo JSON** (formato wire) que `NewCharacterSheetResponse` produz. A UI passa esse JSON pelo
mesmo normalizador usado no `GET /charactersheets/:id`. Assim a prévia e a ficha salva usam o
mesmo caminho de exibição.

- Entrada da classe: o `GET /classes` passa a expor `definition` — os dados brutos de montagem
  da classe (`skillsExps`, `attributesExps`, `proficienciesExps`, `jointProficiencies`,
  `jointProfExps`), com as chaves como enums Go (`"Vitality"`, `"Sword"`). Sem isso o front teria
  que adivinhar o estado de partida a partir de valores já calculados.
- Entrada do jogador: o payload de criação/edição, montado por **uma** função pura
  (`buildSheetInput`) usada pelo service (POST/PATCH) e pela prévia.

### Paridade garantida por fixtures geradas pelo Go (golden files)

- Back: `internal/app/api/sheet/sheet_parity_test.go` monta, para cada classe e alguns cenários
  de escolha, a ficha pelo mesmo caminho do caso de uso (`charactersheet.AssembleCharacterSheet`)
  e grava `internal/app/api/sheet/testdata/sheet_parity.json` com `{classes, cases[{input,
  expected}], expTables}`. Sem `-update`, o teste **falha se o arquivo estiver desatualizado** —
  mudar uma fórmula no back obriga a regenerar.
  - Regenerar: `go test ./internal/app/api/sheet/ -run TestSheetParityFixtures -update`
- Front: cópia em `src/features/sheet/engine/__fixtures__/sheet_parity.json`; o teste
  `engine/__tests__/parity.test.ts` roda o motor em todos os casos e compara com `expected`.
  - Sincronizar (com os dois repos lado a lado): `npm run sync:sheet-fixtures`
  - Por que cópia e não buscar do outro repo na CI: o repo do back é privado e a cópia
  versionada mantém os testes do front determinísticos e offline. O custo é lembrar de
  sincronizar — o `AGENTS.md` do back e o `CLAUDE.md` do motor registram isso.

### Motor TS (`src/features/sheet/engine/`)

Autocontido: não importa nada fora da pasta (nem React, nem `types/`, nem services). Espelha os
pacotes Go (experience, ability, attribute, skill, proficiency, spiritual, status, factory) com
os mesmos nomes de conceito, para que uma mudança no Go tenha um lugar óbvio no TS.

Pontos de atenção copiados à risca do Go:
- `int(float)` do Go trunca → `Math.trunc`; divisão inteira → `Math.trunc(a / b)`.
- A cascata (`UpgradeCascade`) é **mutável**: o atributo intermediário (força etc.) reduz o exp
  repassado (`SetExp`) e quem vem depois na cadeia recebe o valor reduzido.
- `Proficiency.Get` procura antes nas proficiências conjuntas: uma arma contida numa conjunta
  recebe o exp na conjunta.
- Barras: `current` acompanha `max` enquanto estiverem iguais (sempre, na montagem).
- Tabela de exp: `Math.pow(Math.E, x)` como `math.Pow(math.E, x)`; a fixture traz as tabelas do
  Go para detectar diferença de ponto flutuante.

### Integração na UI

- `useLiveSheet` (ou função pura equivalente) recalcula a ficha exibida a partir de
  `charSheet` (estado da página) + classe selecionada, a cada mudança.
- `PhysicalsDiagram`/`MentalsDiagram`: pontos disponíveis = nível da habilidade − pontos gastos,
  derivados a cada render (sem `useState`).
- Proficiência: trocar a arma de um slot não muda o total de exp (cada slot tem exp fixo), então
  não muda o nível de Físicos. Preencher/esvaziar um slot muda — ver "Regras a confirmar".

## Regras a confirmar com o dono do produto

(preenchidas ao longo da implementação; ver seção final do relatório da sessão)

## Status / checklist de continuação

- [ ] Back: `definition` no `CharacterClassResponse` + teste
- [ ] Back: `AssembleCharacterSheet` (create e update usam) + teste
- [ ] Back: gerador/verificador de fixtures + `testdata/sheet_parity.json`
- [ ] Back: docs (EN + PT-BR) + `AGENTS.md`
- [ ] Front: motor TS + teste de paridade + script de sync
- [ ] Front: `buildSheetInput` compartilhado pelo service e pela prévia
- [ ] Front: prévia ao vivo na criação/edição + correção do `PhysicalsDiagram`
- [ ] `npm run build`, `npm run lint`, `npm run test`; `go vet ./...`, `go test ./...`
