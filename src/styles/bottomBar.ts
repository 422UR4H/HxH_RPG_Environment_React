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

/** Sombra funda + contorno de 1 px dos botões flutuantes (CON-06). */
export const floatingElevation = (shadow: string, outline: string) =>
  `0 6px 18px ${shadow}, 0 0 0 1px ${outline}`;
