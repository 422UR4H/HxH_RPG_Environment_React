import type { ReactNode } from "react";
import styled from "styled-components";
import BackButton from "../ions/BackButton";
import LogoButton from "./LogoButton";
import { colors } from "../../styles/tokens";

interface PageHeaderProps {
  backgroundColor?: string;
  showBack?: boolean;
  /** Slot à direita do logo (ações da página, ex.: sair). */
  trailing?: ReactNode;
}

export default function PageHeader({
  backgroundColor,
  showBack = true,
  trailing,
}: PageHeaderProps) {
  return (
    <StyledPageHeader $backgroundColor={backgroundColor}>
      {showBack && <BackButton />}
      <LogoButton />
      {trailing && <Trailing>{trailing}</Trailing>}
    </StyledPageHeader>
  );
}

const StyledPageHeader = styled.div<{ $backgroundColor?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;

  background-color: ${({ $backgroundColor }) => $backgroundColor || colors.surfaceHeaderDefault};
  width: 100%;
  height: min(102px, 15.2vw);
  padding-bottom: 0.4vw;
  /* O #root rola: com a barra de rolagem o header perde a largura da barra e o centro
     desceria pela metade dela. Este padding é essa largura (0 sem barra) e devolve o
     centro do conteúdo ao centro da janela. */
  padding-left: calc(100vw - 100%);
`;

// Centrado sem transform: um transform aqui viraria o bloco de contenção de filhos
// position: fixed (a bolha do Tooltip) e os jogaria para fora da tela.
const Trailing = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  right: min(24px, 3vw);
  display: flex;
  align-items: center;
  gap: 12px;
`;
