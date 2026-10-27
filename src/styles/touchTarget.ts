import { css } from "styled-components";

/**
 * Área de toque de 44 px (A11Y-02) só quando o ponteiro é grosso (dedo, caneta): no mouse o
 * desenho segue o mesmo. Por `pointer: coarse`, e não por largura — é o toque que pede o tamanho.
 */
export const touchTarget = css`
  @media (pointer: coarse) {
    min-height: 44px;
  }
`;
