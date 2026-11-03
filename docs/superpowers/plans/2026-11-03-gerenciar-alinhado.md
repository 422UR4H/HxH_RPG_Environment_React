# "Gerenciar" alinhado ao botão em qualquer tela — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** corrigir dois bugs visuais do menu "⚙ Gerenciar" (`PillMenu`, PR #98 já mergeado) que o dono do produto achou no celular e no tablet.

**Retorno do dono (03/11):** "A borda direita está 'quebrada' em relação ao botão e à caixa de opções. Ela não está alinhada, mas ao scrollar a página, aí ela alinha automaticamente. Além disso, quando a coluna central está pequena demais, como em telas pequenas, o botão/pílula Gerenciar diminui de tamanho junto com seu texto, mas a lista de opções continua do mesmo tamanho e, ao clicar no botão, a lista fica maior que o mesmo, gerando um desalinhamento. Este último pode ser corrigido reduzindo o tamanho do texto também, da mesma forma que o texto do botão diminui em telas pequenas. Alinhe este elemento."

## Diagnóstico (controlador, Chrome headless com DPR de aparelho, página de campanha do seed)

Lista × botão, medidos logo ao abrir e depois de um evento de rolagem:

| tela | botão (L–R) | lista ao abrir | lista após rolar |
|---|---|---|---|
| 1180×820 dpr2 | 340–513.27 | 340–**515** (`--list-width: 175px`) | igual |
| 390×844 dpr3 | 40–158.59 | 40–158.59 | 40–**181** (`141px`) |
| 360×740 dpr3 | 40–146.52 (fonte 13px) | 40–**169** (`129px`) | igual |
| 820×1180 dpr2 / 1366×768 | = botão | = botão | = botão |

**Causa raiz:** o modo `growToContent` (só do `PillMenu`, em `useAttachedList.ts`) mede a largura natural dos itens e usa `max(botão, conteúdo)`.
- Quando o conteúdo fica a menos de 2 px do botão, o `Math.ceil` empurra a lista 1–2 px além da borda direita: é a "borda quebrada" do tablet.
- A medida também não é estável entre o primeiro `place()` e os seguintes (390×844: cabe ao abrir, não cabe depois de rolar), então a mesma tela alterna entre alinhada e desalinhada conforme rola.
- Em botões estreitos (a pílula encolhe com `cqi`; os itens não, ficam em `min(1em, 17px)`), a lista cresce de propósito, e é o desalinhamento que o dono não quer.

## Decisão (controlador; o dono pediu o caminho)

- **A lista do `PillMenu` tem sempre exatamente a largura do botão**, como a do `PillSelect`. Remova o modo `growToContent` e tudo o que só existe por ele (`data-align`, `--list-width`, `--joint-width`, `--overhang-radius`, a máscara da junção, o crescer para a esquerda, o arredondar a largura para cima e os testes disso). O `PillSelect` não muda.
- **O texto dos itens encolhe para caber**, como o do botão: a fonte do item é a maior que cabe na largura do botão, limitada a `min(fonte da pílula, 17px)`.
  - "Caber" vale para o item mais largo ("🗑 Excluir" com o "?" de bloqueado): ícone, rótulo e "?" sem sobreposição, com o recuo da pílula dos dois lados.
  - Como a pílula muda de tamanho só com a largura da coluna, calcular ao abrir e no resize basta. **Rolar não pode mudar a fonte nem a largura** (a estabilidade é parte do pedido).
  - O layout do item deve ser todo em `em` (ícone, vão, "?"), para a largura escalar linearmente com a fonte. Assim uma medida numa fonte de referência dá a fonte que cabe (`f = f_ref × (largura útil / largura natural em f_ref)`), sem tentativa e erro. Arredonde a fonte **para baixo** (ex.: a 0.25 px), para nunca passar.
  - Piso de legibilidade: 10 px. Abaixo disso o rótulo quebra linha em vez de sobrepor (a regra de quebra que já existe fica).
  - A altura mínima de 44 px por item (alvo de toque) continua.
- Os cantos de 16 px do aberto (Task 7 do plano anterior) continuam; só deixa de existir o canto saliente.
- Medir sempre com os estilos da lista já aplicados (as variáveis copiadas da pílula). Nunca medir antes de o visual da pílula estar na lista: é uma causa possível da instabilidade de hoje.

## Global Constraints

- Código em inglês (identificadores, nomes de arquivo, títulos de teste); comentários e UI em português. Cor só por token.
- `PillSelect` idêntico: os testes atuais passam sem mudar o que afirmam. A opção que sair da peça compartilhada não pode alterar o caminho dele.
- "Gerenciar" fechado idêntico nos dois modos; aberto com cantos de 16 px (flutuante) / 8 px (encaixado) como hoje.
- Antes de cada commit: `npm run typecheck && npm run lint && npm test`. Git: branch `fix/gerenciar-alinhado`, worktree `.worktrees/gerenciar-alinhado`; só `git add` + `git commit`; mensagem em português com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Sem servidores.

---

### Task 1: lista sempre da largura do botão, texto que encolhe para caber

**Files:** `src/components/molecules/useAttachedList.ts`, `AttachedList.tsx`, `AttachedList.styles.ts`, `PillMenu.tsx` (+ estilos), `ManageButton.tsx` só se necessário, testes em `src/components/molecules/__tests__/`.

- [ ] Remover o `growToContent` e o que depende dele (ver Decisão).
- [ ] Fonte dos itens ajustada para caber (ver Decisão), calculada ao abrir e no resize, nunca na rolagem.
- [ ] Testes:
  - a lista nunca é mais larga que o botão;
  - a fonte cai quando o botão estreita e respeita o teto de 17 px e o piso de 10 px;
  - rolar com a lista aberta não muda a largura nem a fonte;
  - o `PillSelect` não recebe nada disso.
- [ ] typecheck + lint + test; commit `fix(ui): lista do Gerenciar sempre da largura do botão, texto encolhe para caber`.
