import { useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { colors } from "../../styles/tokens";

type Tab = { id: string; label: string };

interface PageTabNavProps {
  tabs: Tab[];
  activeTab: string;
}

export default function PageTabNav({ tabs, activeTab }: PageTabNavProps) {
  const [, setSearchParams] = useSearchParams();

  return (
    <Nav aria-label="Seções">
      {tabs.map((tab) => (
        <TabButton
          key={tab.id}
          $active={activeTab === tab.id}
          aria-current={activeTab === tab.id ? "true" : undefined}
          onClick={() => setSearchParams({ tab: tab.id }, { replace: true })}
        >
          {tab.label}
        </TabButton>
      ))}
    </Nav>
  );
}

const Nav = styled.nav`
  display: flex;
  gap: 6px;
  /* Sobe sobre o painel para a aba ativa cobrir o traço de cima dele. */
  position: relative;
  z-index: 1;
`;

const TabButton = styled.button<{ $active: boolean }>`
  font-size: 16px;
  font-weight: 700;
  color: ${({ $active }) => ($active ? colors.textPrimary : colors.textMuted)};
  background: ${({ $active }) =>
    $active ? colors.surfaceTabPanel : colors.surfaceTabInactive};
  border: 3px solid ${colors.borderTab};
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  padding: 0 20px ${({ $active }) => ($active ? "3px" : "0")};
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s;
  position: relative;
  /* A ativa desce 3px sobre a borda do painel; a inativa fica 4px mais baixa, apoiada no traço. */
  margin-bottom: ${({ $active }) => ($active ? "-3px" : "0")};
  margin-top: ${({ $active }) => ($active ? "0" : "4px")};
  /* A altura da aba inativa define a linha da barra; a ativa estica junto e ainda avança 3px sobre o painel. */
  min-height: ${({ $active }) => ($active ? "auto" : "44px")};
  z-index: ${({ $active }) => ($active ? 2 : 0)};

  &:hover {
    color: ${colors.textPrimary};
    background: ${({ $active }) =>
      $active ? colors.surfaceTabPanel : colors.surfaceTabInactiveHover};
  }
`;
