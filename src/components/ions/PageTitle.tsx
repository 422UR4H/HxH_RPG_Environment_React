import styled from "styled-components";

interface PageTitleProps {
  children: React.ReactNode;
}

export default function PageTitle({ children }: PageTitleProps) {
  return <StyledPageTitle>{children}</StyledPageTitle>;
}

const StyledPageTitle = styled.h1`
  font-family: "Oswald", sans-serif;
  font-size: 46px;
  color: #ffa216;
  margin: 0;
`;
