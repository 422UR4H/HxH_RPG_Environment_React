import styled, { css } from "styled-components";
import { colors } from "../../styles/tokens";
import { ATTACHED_ROW_MIN_HEIGHT, attachedTrigger } from "./AttachedList.styles";

/** Seta (chevron) da pílula fechada, usada como `background-image` por quem estiliza o `PillSelect` e o `DateField`. */
export const PILL_CHEVRON = `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`;

/**
 * O desenho da pílula verde do site (cor, borda, seta, foco, hover) sem tamanhos: quem estiliza
 * o `PillSelect` acrescenta `border-width`, raio, padding e posição/tamanho da seta na sua unidade
 * (`cqi` na ficha, px fora dela).
 */
export const pillLook = css`
  font-weight: 600;
  color: ${colors.textPrimary};
  background-color: ${colors.brandAccent};
  border-style: solid;
  border-color: ${colors.brandAccent};
  cursor: pointer;
  background-image: ${PILL_CHEVRON};
  background-repeat: no-repeat;

  /* Fora do anel global (como os campos de texto): o foco é a borda branca. */
  &:active,
  &:focus {
    outline: none;
    border-color: ${colors.textPrimary};
  }
  &:hover {
    filter: brightness(1.1);
  }
`;

// O consumidor estiliza a pílula (`styled(PillSelect)`); aqui só o que o componente precisa.
export const Trigger = styled.div<{ $side: "below" | "above" }>`
  display: inline-grid;
  box-sizing: border-box;
  text-align: left;
  line-height: normal; /* o <select> nativo usa a altura de linha normal da fonte */
  white-space: nowrap;
  user-select: none;
  -webkit-user-select: none;
  ${attachedTrigger}
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

// A coluna da direita (largura = padding da pílula, onde fica o chevron) é reservada ao ✓;
// se a lista rola, a barra de rolagem come essa coluna, não o texto.
const column = "calc(var(--pill-padding-right) - var(--list-scrollbar, 0px))";

export const Option = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-height: ${ATTACHED_ROW_MIN_HEIGHT}px;
  padding: 4px ${column} 4px var(--pill-padding-left);
  cursor: pointer;

  &[data-active="true"] {
    background-color: ${colors.overlayHighlight};
  }
  &[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// O texto da opção nunca é escondido: quebra em espaços e entre as palavras do CamelCase (<wbr>).
export const Label = styled.span`
  min-width: 0;
  white-space: normal;
  overflow-wrap: normal;
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
