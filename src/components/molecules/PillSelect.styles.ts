import styled, { css, keyframes } from "styled-components";
import { colors } from "../../styles/tokens";

export const PILL_SELECT_DURATION = "160ms";
const EASING = "ease";

type Side = "below" | "above";

// O consumidor estiliza a pílula (`styled(PillSelect)`); aqui só o que o componente precisa.
// `&&` garante que o estado aberto vença o estilo do consumidor, qualquer que seja a ordem.
export const Trigger = styled.div<{ $side: Side }>`
  display: inline-grid;
  box-sizing: border-box;
  text-align: left;
  line-height: normal; /* o <select> nativo usa a altura de linha normal da fonte */
  white-space: nowrap;
  user-select: none;
  -webkit-user-select: none;

  /* Aberto: a lista continua a pílula, então o lado dela fica reto e sem borda própria. */
  &&[data-state="open"],
  &&[data-state="closing"] {
    filter: none;
    box-shadow: none;
    transition:
      border-radius ${PILL_SELECT_DURATION} ${EASING},
      border-color ${PILL_SELECT_DURATION} ${EASING};
  }
  &&[data-state="open"] {
    border-color: ${colors.textPrimary};
    ${({ $side }) =>
      $side === "below"
        ? css`
            border-bottom-color: transparent;
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
          `
        : css`
            border-top-color: transparent;
            border-top-left-radius: 0;
            border-top-right-radius: 0;
          `}
  }

  @media (prefers-reduced-motion: reduce) {
    &&[data-state="open"],
    &&[data-state="closing"] {
      transition: none;
    }
  }
`;

// Todos os rótulos empilhados na mesma célula: a largura fechada é a da opção mais longa,
// como no <select> nativo. O texto vem de `data-label` (não entra no DOM de texto nem no leitor).
export const Value = styled.span`
  grid-area: 1 / 1;
`;

export const Sizer = styled.span`
  grid-area: 1 / 1;
  visibility: hidden;
  height: 0;
  overflow: hidden;

  &::before {
    content: attr(data-label);
  }
`;

const unroll = (side: Side) => keyframes`
  from { clip-path: inset(${side === "below" ? "0 0 100% 0" : "100% 0 0 0"}); }
  to   { clip-path: inset(0 0 0 0); }
`;

const roll = (side: Side) => keyframes`
  from { clip-path: inset(0 0 0 0); }
  to   { clip-path: inset(${side === "below" ? "0 0 100% 0" : "100% 0 0 0"}); }
`;

interface ListProps {
  $side: Side;
  $placed: boolean;
  $closing: boolean;
}

// As medidas da pílula chegam por variáveis CSS (lidas do gatilho): a lista vive no body,
// fora do container query (cqi) onde a pílula calcula tamanhos.
export const List = styled.div<ListProps>`
  position: fixed;
  z-index: 1000; /* mesma camada do Popover do DateField: acima de toda a página */
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  background-color: var(--pill-bg);
  color: var(--pill-fg);
  font-family: var(--pill-font-family);
  font-size: var(--pill-font-size);
  font-weight: var(--pill-font-weight);
  border: var(--pill-border-width) solid ${colors.textPrimary};
  ${({ $side }) =>
    $side === "below"
      ? css`
          border-top: 1px solid ${colors.overlayHighlight};
          border-radius: 0 0 var(--pill-radius) var(--pill-radius);
        `
      : css`
          border-bottom: 1px solid ${colors.overlayHighlight};
          border-radius: var(--pill-radius) var(--pill-radius) 0 0;
        `}
  visibility: ${({ $placed }) => ($placed ? "visible" : "hidden")};
  ${({ $placed, $closing, $side }) =>
    $placed &&
    css`
      animation: ${$closing ? roll($side) : unroll($side)} ${PILL_SELECT_DURATION} ${EASING} both;
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const Option = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-height: 44px;
  padding: 0 var(--pill-padding-right) 0 var(--pill-padding-left);
  white-space: nowrap;
  cursor: pointer;

  &[data-active="true"] {
    background-color: ${colors.overlayHighlight};
  }
  &[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const Check = styled.span`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: var(--pill-padding-right);
  display: flex;
  align-items: center;
  justify-content: center;
`;
