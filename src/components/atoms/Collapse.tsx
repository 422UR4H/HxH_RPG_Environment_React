import type { ReactNode } from "react";
import styled from "styled-components";

// Duração e curva compartilhadas: abrir e fechar usam exatamente a mesma transição.
export const COLLAPSE_DURATION = "0.28s";
export const COLLAPSE_EASING = "ease";

interface CollapseProps {
  open: boolean;
  id?: string;
  children: ReactNode;
}

/**
 * Painel que abre e fecha animando a altura nos dois sentidos, em qualquer navegador:
 * `grid-template-rows` vai de 0fr a 1fr (CSS padrão, sem `interpolate-size`).
 * O filho fica montado quando fechado; `inert` + `aria-hidden` (e `visibility: hidden`
 * ao fim da transição) impedem que o teclado e o leitor de tela entrem no conteúdo escondido.
 */
export default function Collapse({ open, id, children }: CollapseProps) {
  return (
    <Wrapper id={id} $open={open} aria-hidden={!open} inert={!open}>
      <Inner>{children}</Inner>
    </Wrapper>
  );
}

const Wrapper = styled.div<{ $open: boolean }>`
  display: grid;
  grid-template-rows: ${({ $open }) => ($open ? "1fr" : "0fr")};
  visibility: ${({ $open }) => ($open ? "visible" : "hidden")};
  transition:
    grid-template-rows ${COLLAPSE_DURATION} ${COLLAPSE_EASING},
    visibility 0s linear ${({ $open }) => ($open ? "0s" : COLLAPSE_DURATION)};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Inner = styled.div`
  min-height: 0;
  overflow: hidden;
`;
