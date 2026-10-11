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
`;

const Trailing = styled.div`
  position: absolute;
  top: 50%;
  right: min(24px, 3vw);
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
`;
