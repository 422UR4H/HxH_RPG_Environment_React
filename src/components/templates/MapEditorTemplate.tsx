import type { ReactNode } from "react";
import styled from "styled-components";
import PageHeader from "../atoms/PageHeader";
import { colors, fonts } from "../../styles/tokens";

type Props = {
  sidebar: ReactNode;
  children: ReactNode;
  headerColor?: string;
  hideBack?: boolean;
};

export default function MapEditorTemplate({
  sidebar,
  children,
  headerColor = colors.brandPrimary,
  hideBack = false,
}: Props) {
  return (
    <PageContainer>
      <PageHeader backgroundColor={headerColor} showBack={!hideBack} />
      <PageBody>
        <Sidebar>{sidebar}</Sidebar>
        <CanvasArea>{children}</CanvasArea>
      </PageBody>
    </PageContainer>
  );
}

const PageContainer = styled.div`
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
`;

const PageBody = styled.main`
  display: flex;
  min-height: 0;
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};

  @media (max-width: 749px) {
    flex-direction: column;
  }
`;

const Sidebar = styled.div`
  width: 320px;
  flex-shrink: 0;
  background-color: ${colors.surfaceSidebar};
  overflow-y: auto;

  @media (max-width: 749px) {
    width: 100%;
    order: 2;
    flex: 3;
    min-height: 0;
    overflow: hidden;
  }
`;

const CanvasArea = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;

  @media (max-width: 749px) {
    order: 1;
    flex: 2;
    height: auto;
  }
`;
