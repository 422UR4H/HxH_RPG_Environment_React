import type { ReactNode } from "react";
import styled from "styled-components";
import { colors } from "../../styles/tokens";
import PageTabNav from "./PageTabNav";

interface TabbedPanelProps {
  tabs: { id: string; label: string }[];
  /** Aba ativa já validada pela página (fonte única; a URL crua pode trazer lixo). */
  activeTab: string;
  children: ReactNode;
}

export default function TabbedPanel({ tabs, activeTab, children }: TabbedPanelProps) {
  const hasTabs = tabs.length > 1;

  return (
    <Wrapper>
      {hasTabs && <PageTabNav tabs={tabs} activeTab={activeTab} />}
      <Panel $hasTabs={hasTabs}>{children}</Panel>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
`;

const Panel = styled.div<{ $hasTabs: boolean }>`
  background: ${colors.surfaceTabPanel};
  border: 3px solid ${colors.borderTab};
  border-radius: ${({ $hasTabs }) => ($hasTabs ? "0 12px 12px 12px" : "12px")};
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const TabPanelHeading = styled.h2`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 700;
  color: ${colors.textPrimary};
`;

/** Linha de vazio/carregando dentro do painel; cabe um selo ao lado do texto. */
export const TabPanelEmpty = styled.p`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  /* Os 8 px mais os 12 px do painel devolvem os 20 px de respiro do antigo texto de vazio. */
  padding: 8px;
  font-size: 16px;
  color: ${colors.textMuted};
`;
