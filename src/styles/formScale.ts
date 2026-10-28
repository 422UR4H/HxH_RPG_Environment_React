import { css } from "styled-components";

/**
 * Escala de texto dos formulários em tela estreita (HIER-01).
 *
 * O título do formulário (`PageTitle`) encolhe com a JANELA (`min(40px, 6.8vw)`), então o limiar
 * é medido na janela também: abaixo de 456px o título cai para menos de 31px e o rótulo de 26px
 * deixava de ser menor que ele. Acima disso os valores são os de sempre (rótulo 26, campo 24).
 * Campo nunca abaixo de 16px: menos que isso o iOS dá zoom ao focar.
 */
export const narrowForm = "@media (max-width: 455px)";

export const NARROW_LABEL_SIZE = 18;
export const NARROW_FIELD_SIZE = 16;

/** Tamanho do texto digitado num campo: 24px, 16px em tela estreita. */
export const fieldFontSize = css`
  font-size: 24px;

  ${narrowForm} {
    font-size: ${NARROW_FIELD_SIZE}px;
  }
`;
