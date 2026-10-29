import { css } from "styled-components";
import { alpha, colors } from "./tokens";

/* Efeito de hover dos controles só de ícone (Voltar, X de fechar, seta de expandir): o ícone
   cresce e acende com um halo dourado. Vive aqui para o botão "Voltar" e os ícones pequenos
   não divergirem. */

/* Transição do ícone. Quem usa o efeito põe isto na `transition` do próprio <img>: o efeito
   anima as propriedades `scale` e `filter`. Usa-se `scale` (e não `transform`) para compor com
   o `transform: rotate(...)` da seta de expandir sem perder a rotação. */
export const iconFxTransition = "scale 0.2s ease, filter 0.2s ease";

/* Halo dourado: só no hover. Duas camadas, um núcleo curto e uma luz mais larga. No foco
   quem sinaliza é o anel do botão; halo ali seria um segundo indicador. */
const halo = css`
  filter: drop-shadow(0 0 4px ${alpha(colors.actionHighlight, 0.9)}) drop-shadow(0 0 10px ${alpha(colors.actionHighlight, 0.5)});
`;

/**
 * CSS para o botão que hospeda o ícone (o <img> dentro dele reage). `scale` é o quanto o
 * ícone cresce: 1.05 num ícone grande (Voltar), 1.15 nos pequenos (até 40 px), onde 5% não se vê.
 */
export const iconButtonFx = (scale: number) => css`
  /* Hover só se há mouse ou touchpad: num aparelho só de toque ele fica preso depois do toque. */
  @media (any-hover: hover) {
    &:hover img {
      scale: ${scale};
      ${halo}
    }
  }
  /* Foco do teclado: só o zoom (o anel global sinaliza). */
  &:focus-visible img {
    scale: ${scale};
  }
  &:active img {
    scale: 0.98;
  }
`;
