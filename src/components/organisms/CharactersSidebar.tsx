import { type ReactNode, type RefObject } from "react";
import styled from "styled-components";
import { colors } from "../../styles/tokens";

interface CharactersSidebarProps<T> {
  title?: string;
  items: T[];
  renderItem: (item: T) => ReactNode;
  footer?: ReactNode;
  containerRef?: RefObject<HTMLDivElement | null>;
  /** Ocupa a largura toda do pai (a aba da mesa) em vez dos 300px da coluna fixa. */
  fluid?: boolean;
}

export default function CharactersSidebar<T>({
  title = "PERSONAGENS",
  items,
  renderItem,
  footer,
  containerRef,
  fluid,
}: CharactersSidebarProps<T>) {
  return (
    <SidebarContainer ref={containerRef} $fluid={fluid}>
      <SidebarTitle>{title}</SidebarTitle>
      <CharactersList>
        {items.map((item) => renderItem(item))}
        {footer}
      </CharactersList>
    </SidebarContainer>
  );
}

const SidebarContainer = styled.aside<{ $fluid?: boolean }>`
  width: ${({ $fluid }) => ($fluid ? "100%" : "300px")};
  background-color: ${colors.surfaceSidebar};
  padding: 20px;
  position: relative;
  overflow-y: auto;
  flex-shrink: 0;
`;

const SidebarTitle = styled.h2`
  font-weight: 700;
  font-size: 32px;
  text-align: center;
  color: ${colors.textPrimary};
  margin-bottom: 20px;
  border-bottom: 1px solid ${colors.borderDivider};
  padding-bottom: 10px;
`;

const CharactersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  padding-bottom: 103px;
`;
