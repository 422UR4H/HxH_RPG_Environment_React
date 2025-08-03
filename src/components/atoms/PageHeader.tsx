import styled from "styled-components";
import BackButton from "../ions/BackButton";
import LogoButton from "../ions/LogoButton";

interface PageHeaderProps {
  to: string;
}

export default function PageHeader({ to }: PageHeaderProps) {
  return (
    <StyledPageHeader>
      <BackButton to={to} />
      <LogoButton />
    </StyledPageHeader>
  );
}

const StyledPageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  background-color: #252525;
  width: 100%;
  height: min(102px, 15.2vw);
  padding-bottom: 0.4vw;
`;
