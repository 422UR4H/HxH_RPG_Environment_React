# Motor da ficha (`engine/`)

Repete no front a montagem da ficha do back (Go), para a prévia ao vivo na criação/edição.
O back continua sendo a fonte da verdade: o front envia só os valores-chave e o back recalcula.
Plano e decisões: `docs/superpowers/plans/2026-11-01-sheet-live-preview.md`.

## Contrato

`computeSheet(classe, definition, input)` recebe **o mesmo envio** do POST/PATCH de ficha
(`SheetInput`, montado por `utils/sheetInput.ts`) e a `definition` da classe (`GET /classes`),
e devolve **o mesmo JSON** que o back responde (`SheetWire`, chaves como enums Go). A UI passa
o resultado pelo mesmo normalizador do `GET /charactersheets/:id`.

Não valida a distribuição (pontos parciais são calculados como estão); a validação da soma fica
em `utils/validateCharacterSheet.ts` e no back.

## Regras

- **Autocontido.** Só importa arquivos da própria pasta (`./…`) — nem React, nem `types/`, nem
  services. O teste `__tests__/boundary.test.ts` falha se alguém importar de fora. Isso é o que
  permite extrair a pasta como biblioteca depois.
- **Espelho do Go, arquivo por pacote.** `experience`, `ability`, `attribute`, `skill`,
  `proficiency`, `spiritual`, `status`, `buildSheet` (factory + `Wrap` + `AssembleCharacterSheet`),
  `toWire` (`NewCharacterSheetResponse`). Mudou no Go → mude no arquivo correspondente.
- **Copie os detalhes, não os "conserte":** `int(...)` do Go é `Math.trunc`; a `UpgradeCascade` é
  mutável (o atributo intermediário divide o exp e quem vem depois recebe o valor dividido);
  `ProficiencyManager.get` procura antes nas conjuntas. Parecem bugs, mas são o comportamento do
  back — e o teste de paridade quebra se divergirem.

## Paridade (golden files do back)

`__fixtures__/sheet_parity.json` é gerado pelo back
(`internal/app/api/sheet/sheet_parity_test.go` no repo HxH_RPG_System) e **não se edita à mão**.
`__tests__/parity.test.ts` roda o motor em todos os casos e compara com a resposta do Go.

Quando o back mudar uma regra da ficha:

1. No back: `go test ./internal/app/api/sheet/ -run TestSheetParityFixtures -update`
2. No front (repos lado a lado): `npm run sync:sheet-fixtures` (ou `-- <caminho do back>`)
3. `npm run test` — se falhar, ajuste o motor até passar.

Fora do recorte (o back ainda não usa na montagem; o motor recusa ou ignora): `JointSkills` (o
teste do back falha se uma classe passar a ter), hexágono Nen/percentuais de categoria, talento
com exp, buffs.
