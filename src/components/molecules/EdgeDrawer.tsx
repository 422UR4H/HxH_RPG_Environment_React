import { type ReactNode, useEffect } from "react";
import styled, { css, keyframes } from "styled-components";
import CloseButton from "../ions/CloseButton";
import { colors } from "../../styles/tokens";
import { bottomBarSpace } from "../../styles/bottomBar";

export const EDGE_TAB_WIDTH = 32;
const EDGE_TAB_HEIGHT = 110;

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
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <>
      <EdgeTab $side={side} onClick={onOpen}>{label}</EdgeTab>

      {open && <Backdrop onClick={onClose} />}

      {open && (
        <Panel $side={side} $width={width}>
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

const Backdrop = styled.div`
  position: absolute;
  inset: 0;
  background-color: ${colors.overlay};
  z-index: 200;
`;

const Panel = styled.div<{ $side: "left" | "right"; $width: number }>`
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

  ${({ $side }) =>
    $side === "left"
      ? css`
          left: 0;
          animation: ${slideInFromLeft} 250ms ease;
        `
      : css`
          right: 0;
          animation: ${slideInFromRight} 250ms ease;
        `}
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
`;

const XIcon = styled(CloseButton)`
  width: 36px;
  height: 36px;
  opacity: 1;
`;
