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
  /** Ocupa a largura toda do pai (a aba da mesa) em vez dos 280px da coluna fixa. */
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
  width: ${({ $fluid }) => ($fluid ? "100%" : "280px")};
  /* Dentro da gaveta, a largura útil é menor que a da coluna (a barra vertical come ~12 px):
     o teto de 100% faz a coluna caber sem rolagem horizontal. No desktop não muda nada. */
  max-width: 100%;
  background-color: ${colors.surfaceSidebar};
  padding: 20px 8px;
  /* As duas laterais de 8 px pintadas por sombra interna: borda mudaria a largura útil e o
     background-image já é do realce de alvo de soltura. */
  box-shadow:
    inset 8px 0 0 ${colors.surfaceSidebarGutter},
    inset -8px 0 0 ${colors.surfaceSidebarGutter};
  position: relative;
  /* O título escala pela largura da coluna (200 ou 280). */
  container-type: inline-size;
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
  /* 32 px a 280 (264 úteis × 12,13% = 32); a 200 cai para ~22 e cabe. */
  font-size: min(32px, 12.13cqi);
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
