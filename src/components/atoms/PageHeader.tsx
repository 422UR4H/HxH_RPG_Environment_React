import styled from "styled-components";
import BackButton from "../ions/BackButton";
import LogoButton from "./LogoButton";
import { colors } from "../../styles/tokens";

interface PageHeaderProps {
  backgroundColor?: string;
  showBack?: boolean;
}

export default function PageHeader({ backgroundColor, showBack = true }: PageHeaderProps) {
  return (
    <StyledPageHeader $backgroundColor={backgroundColor}>
      {showBack && <BackButton />}
      <LogoButton />
    </StyledPageHeader>
  );
}

const StyledPageHeader = styled.div<{ $backgroundColor?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  background-color: ${({ $backgroundColor }) => $backgroundColor || colors.surfaceHeaderDefault};
  width: 100%;
  height: min(102px, 15.2vw);
  padding-bottom: 0.4vw;
`;
