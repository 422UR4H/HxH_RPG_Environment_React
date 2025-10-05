import styled from "styled-components";

interface PageTitleProps {
  children: React.ReactNode;
}

export default function PageTitle({ children }: PageTitleProps) {
  return <StyledPageTitle>{children}</StyledPageTitle>;
}

const StyledPageTitle = styled.h1`
  font-family: "Roboto", sans-serif;
  font-weight: 900;
  font-size: 46px;
  /* text-align: center; */
  color: white;
  margin: 0;
  font-size: min(40px, 6.8vw);
`;
