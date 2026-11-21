# Plano — o tom de referência de cada família de cor se chama "base" (não "brand")

**Objetivo:** alinhar o vocabulário do código ao do documento de cores do TCC. O designer decidiu que
o tom de referência de cada família da `palette` (`red800`, `green700`, `gold700`, `blue700`) se chama
**base**, e as variações ligadas a ele, **escuro** e **claro**. "Brand"/"marca" não nomeiam mais
tons de cor.

**Escopo:** só comentários e documentação. Nenhum valor, nome de token ou comportamento muda.

## Global Constraints

- Só comentários e texto de documentação mudam. Nenhum hex, nenhum nome de token, nenhuma linha de código.
- **Não** renomear o grupo semântico `brand` nem os tokens `brandPrimary`/`brandAccent`: são o nome do
  *papel* da cor, usados em ~60 arquivos, e ficam como estão. Ficam também a linha 5 de `tokens.ts`
  (lista dos grupos), o comentário `// brand` que abre o grupo semântico em `colors` e a lista
  "Grupo fechado de prefixos" do `src/styles/CLAUDE.md`.
- Comentários em português (convenção do repo).
- Não tocar em `docs/superpowers/plans/` e `docs/superpowers/specs/` antigos: são histórico.

## Task 1: trocar "brand" por "base" nos comentários da palette e no CLAUDE.md de estilos

**Arquivos:** `src/styles/tokens.ts`, `src/styles/CLAUDE.md`

### `src/styles/tokens.ts` — substituições exatas (texto antigo → texto novo)

1. `  // verdes: 4 variações (escuro do cabeçalho, brand, intermediário, saturado)`
   → `  // verdes: 4 variações (escuro do cabeçalho, base, intermediário, saturado)`
2. `  green700: "#107135", // brand` → `  green700: "#107135", // base`
3. `  red800: "#ba1a3e", // brand` → `  red800: "#ba1a3e", // base`
4. `  gold700: "#dba306", // brand` → `  gold700: "#dba306", // base`
5. `  blue700: "#2e5397", // brand` → `  blue700: "#2e5397", // base`
6. `  blue600: "#4b70a4", // brand claro (degradê do login)` → `  blue600: "#4b70a4", // claro (degradê do login)`
7. No comentário de `actionDestructive`: `nunca o vermelho do brand (é o da peça)` → `nunca o vermelho base (é o da peça)`

### `src/styles/CLAUDE.md` — substituições exatas

1. `- cores **esquemáticas** (HP, SP, EXP, status, mapa) reaproveitavam as cores do **brand**, então mexer`
   → `- cores **esquemáticas** (HP, SP, EXP, status, mapa) reaproveitavam os tons **base** das famílias, então mexer`
2. `**Vermelho do brand (`red800`) não vai em elemento clicável.** É a cor da peça (emblema do avatar); botão`
   → `**Vermelho base (`red800`) não vai em elemento clicável.** É a cor da peça (emblema do avatar); botão`
3. `na mesma cor misturaria marca com perigo. Botões destrutivos usam o intermediário (`red700`); só texto`
   → `na mesma cor confundiria a peça com perigo. Botões destrutivos usam o intermediário (`red700`); só texto`
4. Logo depois da tabela de camadas (a linha que começa com `| \`colors\` |`), uma linha em branco e este
   parágrafo novo:

   `**Nome dos tons:** o tom de referência de cada família (\`red800\`, \`green700\`, \`gold700\`, \`blue700\`) é a **base**; os vizinhos dele são **escuro** e **claro** (\`green900\`, \`blue600\`). É o vocabulário do documento de cores do designer: "brand"/"marca" não nomeiam tom de cor (o grupo semântico \`brand\` continua sendo o nome de um papel).`

**Verificação:** `git diff` só com linhas de comentário/markdown; `npx tsc -p tsconfig.app.json --noEmit`
(ou o tsconfig que o `npm run build` usa) passa; `npx vitest run src/styles` passa;
`grep -n "brand" src/styles/tokens.ts` mostra só a linha 5 e o `// brand` do grupo semântico, além
dos nomes `brandPrimary`/`brandAccent`.

**Commit:** `docs(styles): tom de referência da paleta se chama base, não brand`

## Task 2: os três "marca" que sobraram nomeando cor

Achados na revisão da Task 1 (fora da lista original). Mesmas Global Constraints: só comentário/markdown.

**Arquivos:** `src/styles/tokens.ts`, `src/styles/ResetStyle.ts`, `src/components/CLAUDE.md`

Substituições exatas (texto antigo → texto novo):

1. `src/styles/tokens.ts`, comentário de `actionConfirm`: `(o verde da marca some ali)` → `(o verde base some ali)`
2. `src/styles/ResetStyle.ts`: `/* Controles nativos na cor da marca. */` → `/* Controles nativos no verde dos botões (brandAccent). */`
3. `src/components/CLAUDE.md`: `` `PageHeader` (cor de marca)`` → `` `PageHeader` (cabeçalho verde)``

**Verificação:** `git grep -n -i "da marca\|de marca" -- src` não acha mais nada; `npx tsc -p tsconfig.app.json --noEmit` e `npx vitest run src/styles` passam.

**Commit:** `docs(styles): tira "marca" dos comentários que nomeiam cor`
