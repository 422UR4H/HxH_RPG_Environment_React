import { type ReactNode } from "react";
import styled from "styled-components";

interface RulesSidebarProps {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function RulesSidebar({
  title = "REGRAS",
  children,
  footer,
}: RulesSidebarProps) {
  return (
    <SidebarContainer>
      <SidebarTitle>{title}</SidebarTitle>
      <RulesContent>{children}</RulesContent>
      {footer && <SidebarFooter>{footer}</SidebarFooter>}
    </SidebarContainer>
  );
}

const SidebarContainer = styled.aside`
  width: 300px;
  background-color: #2d2215;
  padding: 20px;
  position: relative;
  overflow-y: auto;
  flex-shrink: 0;
`;

const SidebarTitle = styled.h2`
  font-family: "Roboto", sans-serif;
  font-weight: 700;
  font-size: 32px;
  text-align: center;
  color: white;
  margin-bottom: 20px;
  border-bottom: 1px solid #696969;
  padding-bottom: 10px;
`;

const RulesContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const SidebarFooter = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: 300;
  margin-top: 30px;
  font-size: 18px;
  color: white;
  font-style: italic;
  text-align: center;
`;
