import { type ReactNode } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";

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
  width: 400px;
  background-color: ${colors.surfaceSidebar};
  padding: 20px;
  position: relative;
  overflow-y: auto;
  flex-shrink: 0;
`;

const SidebarTitle = styled.h2`
  font-family: ${fonts.sans};
  font-weight: 700;
  font-size: 32px;
  text-align: center;
  color: ${colors.textPrimary};
  margin-bottom: 20px;
  border-bottom: 1px solid ${colors.borderDivider};
  padding-bottom: 10px;
`;

const RulesContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const SidebarFooter = styled.div`
  font-family: ${fonts.sans};
  font-weight: 300;
  margin-top: 30px;
  font-size: 18px;
  color: ${colors.textPrimary};
  font-style: italic;
  text-align: center;
`;
