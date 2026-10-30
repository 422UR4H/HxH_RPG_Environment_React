import { useId, type ReactNode } from "react";
import styled from "styled-components";
import { colors } from "../../styles/tokens";

interface RulesSidebarProps {
  title?: string;
  /** Ao lado do título, fora do heading (ex.: selo "Em breve"). */
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export default function RulesSidebar({
  title = "REGRAS",
  badge,
  children,
  footer,
}: RulesSidebarProps) {
  const titleId = useId();
  return (
    <SidebarContainer aria-labelledby={titleId}>
      <SidebarHeader>
        <SidebarTitle id={titleId}>{title}</SidebarTitle>
        {badge}
      </SidebarHeader>
      <RulesContent>{children}</RulesContent>
      {footer && <SidebarFooter>{footer}</SidebarFooter>}
    </SidebarContainer>
  );
}

const SidebarContainer = styled.aside`
  width: 400px;
  /* Dentro da gaveta, a largura útil é menor que a da coluna (a barra vertical come ~12 px):
     o teto de 100% faz a coluna caber sem rolagem horizontal. No desktop não muda nada. */
  max-width: 100%;
  background-color: ${colors.surfaceSidebar};
  padding: 20px;
  position: relative;
  overflow-y: auto;
  /* Coluna lateral nunca rola na horizontal; o conteúdo é que cabe. */
  overflow-x: hidden;
  flex-shrink: 0;
`;

const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
  border-bottom: 1px solid ${colors.borderDivider};
  padding-bottom: 10px;
`;

const SidebarTitle = styled.h2`
  font-weight: 700;
  font-size: 32px;
  text-align: center;
  color: ${colors.textPrimary};
`;

const RulesContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const SidebarFooter = styled.div`
  font-weight: 300;
  margin-top: 30px;
  font-size: 18px;
  color: ${colors.textPrimary};
  font-style: italic;
  text-align: center;
`;
