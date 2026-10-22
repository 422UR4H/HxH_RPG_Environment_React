// src/components/templates/DetailPageTemplate.tsx
import { type ReactNode, type RefObject, useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import PageHeader from "../atoms/PageHeader";
import EdgeDrawer from "../molecules/EdgeDrawer";
import worldMap from "../../assets/images/worldmap.png";
import { colors } from "../../styles/tokens";
import { scopedScrollbar, scrollbarPalettes } from "../../styles/scrollbar";
import useMediaQuery from "../../hooks/useMediaQuery";

interface DetailPageTemplateProps {
  headerColor?: string;
  bgImage?: string;
  mainRef?: RefObject<HTMLDivElement | null>;
  leftSidebar: ReactNode;
  leftSidebarLabel?: string;
  rightSidebar?: ReactNode;
  rightSidebarLabel?: string;
  children: ReactNode;
  hideBack?: boolean;
}

export default function DetailPageTemplate({
  headerColor = colors.brandPrimary,
  bgImage = worldMap,
  mainRef,
  leftSidebar,
  leftSidebarLabel = "PERSONAGENS",
  rightSidebar,
  rightSidebarLabel = "REGRAS",
  children,
  hideBack = false,
}: DetailPageTemplateProps) {
  const isRightCollapsed = useMediaQuery("(max-width: 1149px)");
  const isLeftCollapsed = useMediaQuery("(max-width: 749px)");

  const [isRightOpen, setIsRightOpen] = useState(false);
  const [isLeftOpen, setIsLeftOpen] = useState(false);

  const openRight = () => { setIsLeftOpen(false); setIsRightOpen(true); };
  const openLeft = () => { setIsRightOpen(false); setIsLeftOpen(true); };
  const closeLeft = useCallback(() => setIsLeftOpen(false), []);
  const closeRight = useCallback(() => setIsRightOpen(false), []);

  useEffect(() => {
    if (!isLeftCollapsed) setIsLeftOpen(false);
    if (!isRightCollapsed) setIsRightOpen(false);
  }, [isLeftCollapsed, isRightCollapsed]);

  return (
    <PageContainer>
      <PageHeader backgroundColor={headerColor} showBack={!hideBack} />
      <PageBody>
        {!isLeftCollapsed && leftSidebar}
        <MainContentContainer ref={mainRef} $bgImage={bgImage}>
          {children}
        </MainContentContainer>
        {!isRightCollapsed && rightSidebar}

        {isLeftCollapsed && (
          <EdgeDrawer
            side="left"
            label={leftSidebarLabel}
            open={isLeftOpen}
            onOpen={openLeft}
            onClose={closeLeft}
            width={300}
          >
            {leftSidebar}
          </EdgeDrawer>
        )}
        {isRightCollapsed && rightSidebar && (
          <EdgeDrawer
            side="right"
            label={rightSidebarLabel}
            open={isRightOpen}
            onOpen={openRight}
            onClose={closeRight}
            width={400}
          >
            {rightSidebar}
          </EdgeDrawer>
        )}
      </PageBody>
    </PageContainer>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

const PageContainer = styled.div`
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;

  ${scopedScrollbar(scrollbarPalettes.earth)}
`;

const PageBody = styled.main`
  display: flex;
  color: ${colors.textPrimary};
  min-height: 0;
  min-width: 0;
  width: 100%;
  overflow: visible;
  position: relative;
`;

const MainContentContainer = styled.div<{ $bgImage: string }>`
  flex: 1;
  min-width: 0;
  padding: 30px 30px 0px 30px;
  overflow-y: auto;

  background-image: url(${({ $bgImage }) => $bgImage});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
`;
