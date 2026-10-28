import { css } from "styled-components";

// Altura da barra de botões da coluna central (BottomActions/AdaptiveActionButton) e o quanto ela
// sobe do rodapé. Definidas uma vez no corpo da página para a barra, o respiro do fim da lista e
// as abas laterais lerem o mesmo número. Se a barra mudar de altura, mude aqui.
export const bottomBarVars = css`
  --bottom-bar-height: 91px;
  --bottom-bar-offset: 22px;

  @media (max-width: 440px) {
    --bottom-bar-height: 70px;
  }
`;

/** Espaço que a barra ocupa no rodapé da coluna: altura + distância do fundo. */
export const bottomBarSpace = "calc(var(--bottom-bar-height, 91px) + var(--bottom-bar-offset, 22px))";

/** Respiro no fim da lista: a barra inteira mais 24 px, para o último card nunca ficar escondido. */
export const bottomBarReserve = `calc(${bottomBarSpace} + 24px)`;

/** Elevação dos botões flutuantes (CON-06). No fundo escuro sombra preta quase não aparece:
 *  quem separa é o aro claro e o brilho de 1 px no topo, com uma sombra mais larga. */
export const floatingElevation = (shadow: string, outline: string, highlight: string) =>
  `0 3px 6px ${shadow}, 0 16px 40px ${shadow}, 0 0 0 1px ${outline}, inset 0 1px 0 ${highlight}`;

/** Folga mínima entre o fim do conteúdo e o último item para o botão flutuante (20 px do fundo +
 *  72 px de altura, mais 4 px de folga) não cobrir o card: a barra só encaixa a 30 px do fim, e até lá ela flutua. */
const floatingClearance = "128px";

/** Fim de lista em que a barra encaixada fica a exatamente `gap` do último item (o gap da própria
 *  lista). O fim do conteúdo fica sempre a `floatingClearance` do último item; quem se ajusta é o
 *  `bottom` da barra encaixada (via `--bottom-bar-offset`), então o desenho encaixado não muda. */
export const dockedBarAfterGap = (gap: string) => `
  --bottom-bar-offset: calc(${floatingClearance} - var(--bottom-bar-height, 91px) - ${gap});
  padding-bottom: ${floatingClearance};
`;
