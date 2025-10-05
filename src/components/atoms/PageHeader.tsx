import styled from "styled-components";
import BackButton from "../ions/BackButton";
import LogoButton from "./LogoButton";

interface PageHeaderProps {
  to: string;
  backgroundColor?: string;
}

export default function PageHeader({ to, backgroundColor }: PageHeaderProps) {
  return (
    <StyledPageHeader $backgroundColor={backgroundColor}>
      <BackButton to={to} />
      <LogoButton />
    </StyledPageHeader>
  );
}

const StyledPageHeader = styled.div<{ $backgroundColor?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  background-color: ${({ $backgroundColor }) => $backgroundColor || "#252525"};
  width: 100%;
  height: min(102px, 15.2vw);
  padding-bottom: 0.4vw;
`;
