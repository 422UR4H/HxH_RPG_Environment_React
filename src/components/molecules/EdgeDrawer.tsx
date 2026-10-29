import { type ReactNode, useEffect, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import CloseButton from "../ions/CloseButton";
import { colors } from "../../styles/tokens";
import { iconButtonFx } from "../../styles/iconButtonFx";
import { bottomBarSpace } from "../../styles/bottomBar";
import { prefersReducedMotion } from "../../utils/prefersReducedMotion";

export const EDGE_TAB_WIDTH = 32;
/** Largura da área de toque da aba (a aba desenhada + 12 px invisíveis); o conteúdo reserva isso. */
export const EDGE_TAB_HIT = 44;
const EDGE_TAB_HEIGHT = 110;

const DRAWER_DURATION = "250ms";
const DRAWER_EASING = "ease";

interface EdgeDrawerProps {
  side: "left" | "right";
  label: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  width: number;
  children: ReactNode;
}

// Posicionada em relação ao ancestral com `position: relative` (o corpo da página).
export default function EdgeDrawer({
  side,
  label,
  open,
  onOpen,
  onClose,
  width,
  children,
}: EdgeDrawerProps) {
  // Fechando: o painel continua montado até a animação de saída terminar.
  const [prevOpen, setPrevOpen] = useState(open);
  const [closing, setClosing] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    setClosing(!open && !prefersReducedMotion());
  }
  const mounted = open || closing;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <>
      <EdgeTab $side={side} onClick={onOpen}>{label}</EdgeTab>

      {mounted && <Backdrop $closing={closing} onClick={onClose} />}

      {mounted && (
        <Panel
          $side={side}
          $width={width}
          $closing={closing}
          inert={closing}
          aria-hidden={closing || undefined}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget && closing) setClosing(false);
          }}
        >
          <CloseX $side={side} onClick={onClose} aria-label="Fechar">
            <XIcon />
          </CloseX>
          <Body>{children}</Body>
        </Panel>
      )}
    </>
  );
}

const slideInFromLeft = keyframes`
  from { transform: translateX(-100%); }
  to   { transform: translateX(0); }
`;

const slideInFromRight = keyframes`
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to   { opacity: 0; }
`;

const slideOutToLeft = keyframes`
  from { transform: translateX(0); }
  to   { transform: translateX(-100%); }
`;

const slideOutToRight = keyframes`
  from { transform: translateX(0); }
  to   { transform: translateX(100%); }
`;

const EdgeTab = styled.button<{ $side: "left" | "right" }>`
  position: absolute;
  /* No meio da tela, mas nunca abaixo do topo da barra de botões verdes: sobe só o necessário. */
  top: max(${EDGE_TAB_HEIGHT / 2}px, min(50%, calc(100% - ${bottomBarSpace} - ${EDGE_TAB_HEIGHT / 2}px)));
  transform: translateY(-50%);
  width: ${EDGE_TAB_WIDTH}px;
  height: ${EDGE_TAB_HEIGHT}px;
  background-color: ${colors.brandAccent};
  border: none;
  color: ${colors.textPrimary};
  writing-mode: vertical-lr;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.5px;
  cursor: pointer;
  z-index: 10;
  transition: filter 0.15s;
  padding: 0;

  &:hover {
    filter: brightness(1.15);
  }

  /* Área de toque de 44 px sem mudar o desenho: 12 px invisíveis para dentro da tela. */
  &::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    width: 12px;
    ${({ $side }) => ($side === "left" ? "left: 100%;" : "right: 100%;")}
  }

  ${({ $side }) =>
    $side === "left"
      ? css`
          left: 0;
          border-radius: 0 6px 6px 0;
        `
      : css`
          right: 0;
          border-radius: 6px 0 0 6px;
        `}
`;

const Backdrop = styled.div<{ $closing: boolean }>`
  position: absolute;
  inset: 0;
  background-color: ${colors.overlay};
  z-index: 200;
  animation: ${({ $closing }) => ($closing ? fadeOut : fadeIn)} ${DRAWER_DURATION} ${DRAWER_EASING} forwards;
  pointer-events: ${({ $closing }) => ($closing ? "none" : "auto")};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Panel = styled.div<{ $side: "left" | "right"; $width: number; $closing: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 201;
  background-color: ${colors.surfaceSidebar};
  display: flex;
  flex-direction: column;
  overflow: visible;
  width: ${({ $width }) => $width}px;
  max-width: 100%;

  ${({ $side }) => ($side === "left" ? "left: 0;" : "right: 0;")}
  animation: ${({ $side, $closing }) =>
      $closing
        ? $side === "left" ? slideOutToLeft : slideOutToRight
        : $side === "left" ? slideInFromLeft : slideInFromRight}
    ${DRAWER_DURATION} ${DRAWER_EASING} forwards;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;

// X fora do fluxo do flex, vazando 10px para cima — imita o X da logo HxH.
// Na esquerda vaza também para a direita; na direita não dá para vazar além da tela.
const CloseX = styled.button<{ $side: "left" | "right" }>`
  position: absolute;
  z-index: 202;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  line-height: 0;
  top: -10px;
  right: ${({ $side }) => ($side === "left" ? "-8px" : "8px")};
  ${iconButtonFx(1.15)}
`;

const XIcon = styled(CloseButton)`
  width: 36px;
  height: 36px;
  opacity: 1;
`;
