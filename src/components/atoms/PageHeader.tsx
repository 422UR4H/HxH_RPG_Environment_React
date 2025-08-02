import styled from "styled-components";
import PageTitle from "../ions/PageTitle";
import BackButton from "../ions/BackButton";

interface PageHeaderProps {
  title: string;
  to: string;
}

export default function PageHeader({ title, to }: PageHeaderProps) {
  return (
    <StyledPageHeader>
      <BackButton to={to} />
      <PageTitle>{title}</PageTitle>
    </StyledPageHeader>
  );
}

const StyledPageHeader = styled.div`
  display: flex;
  flex-direction: column;
  /* padding: 0 30px; */
  padding: 0 68px;
  margin-bottom: 30px;

  margin-top: 30px;
  @media (orientation: landscape) {
    margin-top: 0;
  }
`;
