import styled, { css, keyframes } from "styled-components";
import { colors } from "../../styles/tokens";
import { scopedScrollbar, scrollbarPalettes } from "../../styles/scrollbar";

/** Altura mínima de uma linha (px); também a reserva quando a linha ainda não tem layout. */
export const ATTACHED_ROW_MIN_HEIGHT = 44;
export const ATTACHED_LIST_DURATION_MS = 160;
const DURATION = `${ATTACHED_LIST_DURATION_MS}ms`;
const EASING = "ease";

type Side = "below" | "above";

/**
 * O que a pílula precisa para a lista continuá-la: a âncora e os estados aberto/fechando/assentando
 * (lido de `data-state`). `&&` garante que o estado aberto vença o estilo do consumidor, qualquer que
 * seja a ordem.
 */
export const attachedTrigger = css<{ $side: Side; $capOpenRadius?: boolean }>`
  /* A lista (portal) se prende a esta pílula por anchor positioning: o nome vem do componente. */
  anchor-name: var(--pill-anchor);

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
  ${({ $side, $capOpenRadius }) => {
    if (!$capOpenRadius) return "";
    // `maxOpenRadius`: os cantos externos (os do lado oposto à lista) diminuem até o raio aberto,
    // na mesma duração da lista. `&&&` vence o `&&` do consumidor (que zera a transição aberto).
    const outer = $side === "below" ? "top" : "bottom";
    return css`
      &&&[data-state="open"],
      &&&[data-state="closing"] {
        border-${outer}-left-radius: var(--attached-open-radius);
        border-${outer}-right-radius: var(--attached-open-radius);
      }
      @media (prefers-reduced-motion: no-preference) {
        &&&[data-state="open"] {
          transition:
            border-${outer}-left-radius ${DURATION} ${EASING},
            border-${outer}-right-radius ${DURATION} ${EASING};
        }
      }
    `;
  }}
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
  /** `growToContent`: a lista pode ser mais larga que a pílula. */
  $grow: boolean;
  $align: "start" | "end";
}

// Lista mais larga que a pílula (`growToContent`): ganha a borda do lado da pílula também, para o
// pedaço que sobra fechar com o canto arredondado; na junção essa borda é escondida por máscara e
// aparece a da própria pílula, como sem crescer. (A cor da máscara só vale pelo alfa: opaca.)
const grown = ({ $side, $align }: ListProps) => {
  const pillEdge = $side === "below" ? "top" : "bottom";
  const overhangCorner = `${pillEdge}-${$align === "start" ? "right" : "left"}`;
  const solid = colors.textPrimary;
  return css`
    width: var(--list-width, var(--fallback-width, auto));
    ${$align === "end" &&
    css`
      left: auto;
      right: var(--fallback-right, 0px);
    `}
    @supports (anchor-name: --a) and (top: anchor(bottom)) and (width: anchor-size(width)) {
      width: var(--list-width, anchor-size(width, var(--fallback-width, auto)));
      ${$align === "end" &&
      css`
        left: auto;
        right: anchor(right, var(--fallback-right, 0px));
      `}
    }
    border-${pillEdge}: var(--pill-border-width) solid ${colors.textPrimary};
    border-${overhangCorner}-radius: var(--overhang-radius, 0);
    mask-image:
      linear-gradient(${solid}, ${solid}),
      linear-gradient(
        to ${$align === "start" ? "right" : "left"},
        transparent var(--joint-width, 100%),
        ${solid} var(--joint-width, 100%)
      );
    mask-size:
      100% calc(100% - var(--pill-border-width)),
      100% var(--pill-border-width);
    mask-position: ${$side === "below" ? "bottom, top" : "top, bottom"};
    mask-repeat: no-repeat;
  `;
};

// As medidas da pílula chegam por variáveis CSS (lidas do gatilho): a lista vive no body,
// fora do container query (cqi) onde a pílula calcula tamanhos.
export const AttachedListBox = styled.div<ListProps>`
  position: fixed;
  /* Sem anchor positioning: posição calculada em JS (variáveis --fallback-*). */
  top: var(--fallback-top, 0);
  bottom: var(--fallback-bottom, auto);
  left: var(--fallback-left, 0);
  width: var(--fallback-width, auto);
  /* Com anchor positioning: o navegador move pílula e lista juntas no mesmo quadro, sem esperar
     o JS da rolagem. A lista sobe sobre a borda da pílula (--pill-border-width). */
  /* O segundo argumento de anchor()/anchor-size() é a reserva: se a âncora não for aceitável
     (ex.: select dentro de <dialog> na top layer), vale a geometria do JS em vez de "auto".
     Em top/bottom, a reserva soma a sobreposição da borda para que o calc() (que a subtrai) devolva
     exatamente o --fallback-* do ramo sem anchor. */
  @supports (anchor-name: --a) and (top: anchor(bottom)) and (width: anchor-size(width)) {
    position-anchor: var(--pill-anchor);
    left: anchor(left, var(--fallback-left, 0px));
    width: anchor-size(width, var(--fallback-width, auto));
    ${({ $side }) =>
      $side === "below"
        ? css`
            top: calc(
              anchor(bottom, calc(var(--fallback-top, 0px) + var(--pill-border-width))) -
                var(--pill-border-width)
            );
            bottom: auto;
          `
        : css`
            top: auto;
            bottom: calc(
              anchor(top, calc(var(--fallback-bottom, 0px) + var(--pill-border-width))) -
                var(--pill-border-width)
            );
          `}
  }
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
  ${(p) => p.$grow && grown(p)}
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
