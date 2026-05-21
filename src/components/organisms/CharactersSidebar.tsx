import { type ReactNode, type RefObject } from "react";
import styled from "styled-components";

interface CharactersSidebarProps<T> {
  title?: string;
  items: T[];
  renderItem: (item: T) => ReactNode;
  footer?: ReactNode;
  containerRef?: RefObject<HTMLDivElement | null>;
}

export default function CharactersSidebar<T>({
  title = "PERSONAGENS",
  items,
  renderItem,
  footer,
  containerRef,
}: CharactersSidebarProps<T>) {
  return (
    <SidebarContainer ref={containerRef}>
      <SidebarTitle>{title}</SidebarTitle>
      <CharactersList>
        {items.map((item) => renderItem(item))}
        {footer}
      </CharactersList>
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

const CharactersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  padding-bottom: 103px;
`;
