import { useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { colors } from "../../styles/tokens";

type Tab = { id: string; label: string };

interface PageTabNavProps {
  tabs: Tab[];
}

export default function PageTabNav({ tabs }: PageTabNavProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  if (tabs.length <= 1) return null;

  const activeTab = searchParams.get("tab") ?? tabs[0].id;

  return (
    <Nav>
      {tabs.map((tab) => (
        <TabButton
          key={tab.id}
          $active={activeTab === tab.id}
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
  padding: 0 20px;
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s;
  position: relative;
  /* A ativa desce 3px sobre a borda do painel; a inativa fica 4px mais baixa, apoiada no traço. */
  margin-bottom: ${({ $active }) => ($active ? "-3px" : "0")};
  margin-top: ${({ $active }) => ($active ? "0" : "4px")};
  min-height: ${({ $active }) => ($active ? "44px" : "40px")};
  z-index: ${({ $active }) => ($active ? 2 : 0)};

  &:hover {
    color: ${colors.textPrimary};
    background: ${({ $active }) =>
      $active ? colors.surfaceTabPanel : colors.surfaceTabInactiveHover};
  }
`;
