import { type ReactNode, type RefObject } from "react";
import styled from "styled-components";
import { colors } from "../../styles/tokens";
import { dropTargetBackground, dropTargetBorderColor } from "../../styles/dropTarget";

interface CharactersSidebarProps<T> {
  title?: string;
  items: T[];
  renderItem: (item: T) => ReactNode;
  footer?: ReactNode;
  containerRef?: RefObject<HTMLDivElement | null>;
  /** Ocupa a largura toda do pai (a aba da mesa) em vez dos 300px da coluna fixa. */
  fluid?: boolean;
  /** Realça a coluna como alvo de soltura (a mesma cor do roster do lobby). */
  isDropTarget?: boolean;
}

export default function CharactersSidebar<T>({
  title = "PERSONAGENS",
  items,
  renderItem,
  footer,
  containerRef,
  fluid,
  isDropTarget,
}: CharactersSidebarProps<T>) {
  return (
    <SidebarContainer ref={containerRef} $fluid={fluid} $isDropTarget={!!isDropTarget}>
      <SidebarTitle>{title}</SidebarTitle>
      <CharactersList>
        {items.map((item) => renderItem(item))}
        {footer}
      </CharactersList>
    </SidebarContainer>
  );
}

const SidebarContainer = styled.aside<{ $fluid?: boolean; $isDropTarget: boolean }>`
  width: ${({ $fluid }) => ($fluid ? "100%" : "300px")};
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
  /* Borda por outline (recuado): acender não desloca nada. */
  outline: 2px solid ${({ $isDropTarget }) => dropTargetBorderColor($isDropTarget)};
  outline-offset: -2px;
  background-image: linear-gradient(
    ${({ $isDropTarget }) => dropTargetBackground($isDropTarget)},
    ${({ $isDropTarget }) => dropTargetBackground($isDropTarget)}
  );
  transition: outline-color 0.15s;
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

  /* Item encolhe em vez de passar da borda da coluna. */
  & > * {
    min-width: 0;
    max-width: 100%;
  }
`;
