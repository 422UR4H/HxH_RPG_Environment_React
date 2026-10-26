# Tokens de cor — `src/styles/`

Carrega quando alguém abre `tokens.ts`. Leia antes de tocar em cor.

## Por que duas camadas

O designer vai apresentar o produto e a identidade visual está aprovada: a base de cores precisa mudar
de lugar sem caçar uso espalhado. Dois problemas antigos motivaram a estrutura:

- cores **esquemáticas** (HP, SP, EXP, status, mapa) reaproveitavam as cores do **brand**, então mexer
  em uma mexia na outra;
- cada tarefa criava um token novo ou um hex solto, e as cores se espalharam.

| Camada | Onde | O que é | Quem usa |
|---|---|---|---|
| `palette` | `tokens.ts` | O **único** lugar com hex/rgba. Nome = matiz + intensidade (`green700`, `red800`, `neutral850`). | Só `src/styles/`. Componente não importa (um teste falha se importar). |
| `colors` | `tokens.ts` | Semântica. Nome = **papel**, com prefixo de um grupo fechado. Cada valor aponta para a `palette`. | Todos os componentes. |

**Papéis diferentes = tokens diferentes, mesmo quando a cor é a mesma.** O HP (`vitalHp`) e o botão de
excluir (`actionDestructive`) são tokens separados para o designer trocar um sem tocar no outro.

**Vermelho do brand (`red800`) não vai em elemento clicável.** É a cor da peça (emblema do avatar); botão
na mesma cor misturaria marca com perigo. Botões destrutivos usam o intermediário (`red700`); só texto
sobre painel escuro sobe ao saturado (`actionDestructiveText`), porque ali o contraste manda.

### Grupo fechado de prefixos

`brand` · `surface` · `text` · `border` · `action` · `feedback` · `status` · `vital` (HP, SP, EXP,
pontos: as esquemáticas da ficha) · `map` (mapa tático, inclusive as cores do Pixi) · `overlay` · `shadow`.

Prefixo novo não entra sem decisão do usuário: um grupo aberto vira a bagunça de antes.

### Nunca

- Token com **nome de componente** (`campaignCardBorder`): quando o componente muda, o nome mente e o
  token vira lixo. Nomeie pelo papel.
- Nome de **matiz** na camada semântica (`orange`, `brandBlue`): o nome deixa de valer no dia em que a
  cor mudar. Matiz só existe na `palette`.

## Fluxo para uma cor nova

1. **Já existe token semântico com esse significado?** Use-o, mesmo que a cor pareça um pouco errada.
   *Por quê:* trocar a cor é decisão de design; criar um token paralelo é como a bagunça volta. Se a cor
   parece errada, sinalize ao usuário em vez de contornar.
2. **O significado é novo, mas cabe num grupo?** Crie o token semântico apontando para uma cor que **já
   está** na `palette`, com um comentário dizendo o papel. *Por quê:* o número de cores do produto não
   cresce quando cresce o número de telas.
3. **Precisa de uma cor que não está na palette?** **Pare e pergunte.** *Por quê:* palette nova é
   decisão do designer (a identidade é aprovada); só ele sabe se uma cor parecida já resolve.

O teste `src/styles/__tests__/noRawColors.test.ts` aplica isso: falha com cor crua fora de
`src/styles/` e a mensagem aponta para este fluxo.

## Transparência, gradiente, Pixi

- **Transparência:** `alpha(colors.feedbackDanger, 0.2)`. Componentes **podem** chamar `alpha`: ele só
  recebe uma cor que já veio de um token, então a transparência continua com uma fonte só, e evita um
  token `rgba` por variação (o que explodiu o arquivo antes). Nunca rgba cru nem sufixo hex
  (`${colors.x}22`, que ainda quebra com cor que não seja hex).
- **Gradiente:** um token por gradiente em `gradients`, montado a partir da `palette`. Não crie um token
  por cor-stop.
- **Pixi:** o grupo `map` tem as cores do mapa. Converta com `toPixi(colors.mapX)` (`pixi.ts`); nunca
  `0xRRGGBB` no componente.

## Exceções (allowlist do teste)

- **Zona pixel-tuned** (`src/components/CLAUDE.md`): `CharacterSheetHeader`, `MentalsDiagram`,
  `PhysicalsDiagram`, `NenPrinciplesDiagram`. Valores ajustados à mão; não normalizar.
- **Cor de grade do mapa** (`defaultMap.ts`, `TacticalMapDemoPage.tsx`, `useActionComposerState.ts`):
  é **dado** persistido no backend, não tema da UI.

## Scrollbars — `scrollbar.ts`

Paleta `dark` (trilho quase preto, polegar `surfaceScrollThumbAccent`) é a global, aplicada no
`ResetStyle`. Telas de campanha/partida trocam para `earth` (marrons dos painéis) no container da página
com `${scopedScrollbar(scrollbarPalettes.earth)}` — hoje `CreateFormTemplate`, `DetailPageTemplate`,
`MapEditorTemplate`. Não escreva `::-webkit-scrollbar` à mão num componente; esconder a barra
(`scrollbar-width: none`) continua livre.

## Design System (espelho para o Claude Design)

Link: https://claude.ai/artifact/TxCRCJxNB6qX13WKxAjZRV (privado; compartilhe pelo menu Share). **O código é a fonte da verdade; o artifact é um espelho.** Regra: PR que
muda tokens atualiza o Design System também — senão o Claude Design passa a gerar telas com cor velha.
