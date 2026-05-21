import { type ReactNode, type RefObject } from "react";
import styled from "styled-components";
import PageHeader from "../atoms/PageHeader";
import worldMap from "../../assets/images/worldmap.png";

interface DetailPageTemplateProps {
  headerColor?: string;
  bgImage?: string;
  mainRef?: RefObject<HTMLDivElement | null>;
  leftSidebar: ReactNode;
  rightSidebar?: ReactNode;
  children: ReactNode;
}

export default function DetailPageTemplate({
  headerColor = "#08491f",
  bgImage = worldMap,
  mainRef,
  leftSidebar,
  rightSidebar,
  children,
}: DetailPageTemplateProps) {
  return (
    <PageContainer>
      <PageHeader backgroundColor={headerColor} />
      <PageBody>
        {leftSidebar}
        <MainContentContainer ref={mainRef} $bgImage={bgImage}>
          {children}
        </MainContentContainer>
        {rightSidebar}
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
  color: white;
  min-height: 0;
  overflow: hidden;
`;

const MainContentContainer = styled.div<{ $bgImage: string }>`
  flex: 1;
  padding: 30px 30px 20px 30px;
  overflow-y: auto;

  /* world map */
  background-image: url(${({ $bgImage }) => $bgImage});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed; /* fixes the background during scrolling */
`;
