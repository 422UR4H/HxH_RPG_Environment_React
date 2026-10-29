import styled, { css, keyframes } from "styled-components";
import { colors } from "../../styles/tokens";
import { scopedScrollbar, scrollbarPalettes } from "../../styles/scrollbar";

export const PILL_SELECT_DURATION_MS = 160;
const DURATION = `${PILL_SELECT_DURATION_MS}ms`;
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

  /* Aberto (e enrolando): a lista continua a pílula, então o lado dela fica reto, sem
     transição, e a lista cobre a borda desse lado (os cantos retos casam com os dela). */
  &&[data-state="open"],
  &&[data-state="closing"] {
    filter: none;
    box-shadow: none;
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
  /* Lista já recolhida: a pílula volta a arredondar e a recuperar a cor da borda. */
  &&[data-state="settling"] {
    transition:
      border-radius ${DURATION} ${EASING},
      border-color ${DURATION} ${EASING};
  }

  @media (prefers-reduced-motion: reduce) {
    &&[data-state="settling"] {
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
  from { clip-path: inset(${side === "below" ? "0 0 100% 0" : "100% 0 0 0"}); opacity: 0.6; }
  to   { clip-path: inset(0 0 0 0); opacity: 1; }
`;

const roll = (side: Side) => keyframes`
  from { clip-path: inset(0 0 0 0); opacity: 1; }
  to   { clip-path: inset(${side === "below" ? "0 0 100% 0" : "100% 0 0 0"}); opacity: 0.6; }
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
  /* O lado da pílula não tem borda: a lista sobe sobre a borda da pílula e as laterais
     brancas seguem contínuas. A linha fina que separa o valor das opções é um sticky
     (fica fixa ao rolar), recuada para dentro das bordas. */
  ${({ $side }) =>
    $side === "below"
      ? css`
          border-top: 0;
          border-radius: 0 0 var(--pill-radius) var(--pill-radius);
          &::before {
            content: "";
            display: block;
            position: sticky;
            top: 0;
            z-index: 1;
            height: 1px;
            margin-bottom: -1px;
            background: ${colors.overlayHighlight};
          }
        `
      : css`
          border-bottom: 0;
          border-radius: var(--pill-radius) var(--pill-radius) 0 0;
          &::after {
            content: "";
            display: block;
            position: sticky;
            bottom: 0;
            z-index: 1;
            height: 1px;
            margin-top: -1px;
            background: ${colors.overlayHighlight};
          }
        `}
  ${scopedScrollbar(scrollbarPalettes.pill)}
  /* O polegar usa a borda transparente como respiro; sem isto o fundo passaria por baixo dela. */
  &::-webkit-scrollbar-thumb {
    background-clip: padding-box;
  }
  visibility: ${({ $placed }) => ($placed ? "visible" : "hidden")};
  ${({ $placed, $closing, $side }) =>
    $placed &&
    css`
      animation: ${$closing ? roll($side) : unroll($side)} ${DURATION} ${EASING} both;
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

// A coluna da direita (largura = padding da pílula, onde fica o chevron) é reservada ao ✓;
// se a lista rola, a barra de rolagem come essa coluna, não o texto.
const column = "calc(var(--pill-padding-right) - var(--list-scrollbar, 0px))";

export const Option = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-height: 44px;
  padding: 0 ${column} 0 var(--pill-padding-left);
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

export const Label = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Check = styled.span`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: ${column};
  display: flex;
  align-items: center;
  justify-content: center;
`;
