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

/** O flutuante fica a 20 px do fundo da janela; a faixa encaixada sobe `--bottom-bar-offset` (22 px).
 *  Esta margem (negativa) desce a pílula encaixada a diferença, para ela assentar onde o flutuante
 *  estava e não "pular" ao encaixar. Derivada da mesma variável: se a faixa mudar, acompanha. */
export const dockedPillNudge = "calc(20px - var(--bottom-bar-offset, 22px))";

/** Respiro no fim da lista: a barra inteira mais 24 px, para o último card nunca ficar escondido. */
export const bottomBarReserve = `calc(${bottomBarSpace} + 24px)`;

/** Elevação dos botões flutuantes (CON-06). No fundo escuro sombra preta quase não aparece:
 *  quem separa é o aro claro e o brilho de 1 px no topo, com uma sombra mais larga. */
export const floatingElevation = (shadow: string, outline: string, highlight: string) =>
  `0 3px 6px ${shadow}, 0 16px 40px ${shadow}, 0 0 0 1px ${outline}, inset 0 1px 0 ${highlight}`;
