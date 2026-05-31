import { useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";

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
  gap: 4px;
  border-bottom: 2px solid ${colors.borderDivider};
  margin-bottom: 24px;
`;

const TabButton = styled.button<{ $active: boolean }>`
  font-family: ${fonts.sans};
  font-size: 16px;
  font-weight: ${({ $active }) => ($active ? "700" : "400")};
  color: ${({ $active }) =>
    $active ? colors.textPrimary : colors.textPlaceholderStrong};
  background: none;
  border: none;
  border-bottom: 3px solid
    ${({ $active }) => ($active ? colors.brandAccent : "transparent")};
  padding: 10px 20px;
  margin-bottom: -2px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;

  &:hover {
    color: ${colors.textPrimary};
  }
`;
