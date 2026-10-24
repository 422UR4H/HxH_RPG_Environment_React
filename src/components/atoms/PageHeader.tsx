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
      <LogoSlot>
        <LogoButton />
      </LogoSlot>
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
  // 102 = 12 + 78 + 12: logo e seta com 78 px de altura, centradas no mesmo eixo.
  // Sem padding embaixo: o 0.4vw antigo subia a logo 3 px.
  height: min(102px, 15.2vw);
`;

// O #root rola: com a barra de rolagem o header perde a largura da barra e o centro dele
// desce metade dela. O deslocamento relativo leva a logo ao centro da janela (zero sem barra).
// Não usar padding/margem com % no header: templates em grid dimensionam a coluna com ele.
// display: flex evita o espaço de linha do inline-block da logo, que mudaria a altura do wrapper.
const LogoSlot = styled.div`
  display: flex;
  position: relative;
  left: calc(50vw - 50%);
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
