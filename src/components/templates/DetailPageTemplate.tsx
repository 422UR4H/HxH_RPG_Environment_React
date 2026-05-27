// src/components/templates/DetailPageTemplate.tsx
import { type ReactNode, type RefObject, useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import PageHeader from "../atoms/PageHeader";
import CloseButton from "../ions/CloseButton";
import worldMap from "../../assets/images/worldmap.png";
import { colors, fonts } from "../../styles/tokens";
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
}: DetailPageTemplateProps) {
  const isRightCollapsed = useMediaQuery("(max-width: 1149px)");
  const isLeftCollapsed = useMediaQuery("(max-width: 608px)");

  const [isRightOpen, setIsRightOpen] = useState(false);
  const [isLeftOpen, setIsLeftOpen] = useState(false);

  const openRight = () => { setIsLeftOpen(false); setIsRightOpen(true); };
  const openLeft = () => { setIsRightOpen(false); setIsLeftOpen(true); };
  const closeAll = () => { setIsRightOpen(false); setIsLeftOpen(false); };

  const anyOpen = isRightOpen || isLeftOpen;

  useEffect(() => {
    if (!anyOpen) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") closeAll(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [anyOpen]);

  return (
    <PageContainer>
      <PageHeader backgroundColor={headerColor} />
      <PageBody>
        {!isLeftCollapsed && leftSidebar}
        <MainContentContainer ref={mainRef} $bgImage={bgImage}>
          {children}
        </MainContentContainer>
        {!isRightCollapsed && rightSidebar}

        {isLeftCollapsed && (
          <LeftEdgeTab onClick={openLeft}>{leftSidebarLabel}</LeftEdgeTab>
        )}
        {isRightCollapsed && rightSidebar && (
          <RightEdgeTab onClick={openRight}>{rightSidebarLabel}</RightEdgeTab>
        )}

        {anyOpen && <DrawerBackdrop onClick={closeAll} />}

        {isLeftCollapsed && isLeftOpen && (
          <LeftDrawerPanel>
            <DrawerCloseRow>
              <DrawerCloseButton onClick={closeAll} aria-label="Fechar">
                <CloseButton />
              </DrawerCloseButton>
            </DrawerCloseRow>
            <DrawerBody>{leftSidebar}</DrawerBody>
          </LeftDrawerPanel>
        )}

        {isRightCollapsed && isRightOpen && rightSidebar && (
          <RightDrawerPanel>
            <DrawerCloseRow>
              <DrawerCloseButton onClick={closeAll} aria-label="Fechar">
                <CloseButton />
              </DrawerCloseButton>
            </DrawerCloseRow>
            <DrawerBody>{rightSidebar}</DrawerBody>
          </RightDrawerPanel>
        )}
      </PageBody>
    </PageContainer>
  );
}

// ─── Animations ───────────────────────────────────────────────────────────────

const slideInFromLeft = keyframes`
  from { transform: translateX(-100%); }
  to   { transform: translateX(0); }
`;

const slideInFromRight = keyframes`
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const PageContainer = styled.div`
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
`;

const PageBody = styled.main`
  display: flex;
  color: ${colors.textPrimary};
  min-height: 0;
  overflow: hidden;
  position: relative;
`;

const MainContentContainer = styled.div<{ $bgImage: string }>`
  flex: 1;
  padding: 30px 30px 0px 30px;
  overflow-y: auto;

  background-image: url(${({ $bgImage }) => $bgImage});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
`;

// ─── Edge Tabs ────────────────────────────────────────────────────────────────

const EdgeTab = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 80px;
  background-color: ${colors.brandAccent};
  border: none;
  color: ${colors.textPrimary};
  writing-mode: vertical-lr;
  font-family: ${fonts.sans};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  z-index: 10;
  transition: filter 0.15s;
  padding: 0;

  &:hover {
    filter: brightness(1.15);
  }
`;

const LeftEdgeTab = styled(EdgeTab)`
  left: 0;
  border-radius: 0 6px 6px 0;
`;

const RightEdgeTab = styled(EdgeTab)`
  right: 0;
  border-radius: 6px 0 0 6px;
`;

// ─── Drawer ───────────────────────────────────────────────────────────────────

const DrawerBackdrop = styled.div`
  position: absolute;
  inset: 0;
  background-color: ${colors.overlay};
  z-index: 200;
`;

const DrawerPanel = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 201;
  background-color: ${colors.surfaceSidebar};
  display: flex;
  flex-direction: column;
`;

const LeftDrawerPanel = styled(DrawerPanel)`
  left: 0;
  width: 300px;
  animation: ${slideInFromLeft} 250ms ease;
`;

const RightDrawerPanel = styled(DrawerPanel)`
  right: 0;
  width: 400px;
  animation: ${slideInFromRight} 250ms ease;
`;

const DrawerCloseRow = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 12px 12px 0;
  flex-shrink: 0;
`;

const DrawerBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;

const DrawerCloseButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  line-height: 0;
`;
