import { useState } from "react";
import type { ReactNode } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";

export type AsideTab = "historico" | "personagens";

/**
 * Burro (R6/I2): duas abas fixas — Histórico (padrão, §5.3/§10 do spec) e Personagens.
 * Nenhum `isMaster` aqui: a página escolhe o que renderizar em cada slot.
 */
export default function AsideTabs({
  defaultTab,
  historico,
  personagens,
}: {
  defaultTab: AsideTab;
  historico: ReactNode;
  personagens: ReactNode;
}) {
  const [tab, setTab] = useState<AsideTab>(defaultTab);

  return (
    <Wrapper>
      <TabList>
        <TabButton
          type="button"
          aria-pressed={tab === "historico"}
          onClick={() => setTab("historico")}
        >
          Histórico
        </TabButton>
        <TabButton
          type="button"
          aria-pressed={tab === "personagens"}
          onClick={() => setTab("personagens")}
        >
          Personagens
        </TabButton>
      </TabList>
      <Content>{tab === "historico" ? historico : personagens}</Content>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

const TabList = styled.div`
  display: flex;
  flex-shrink: 0;
`;

const TabButton = styled.button`
  flex: 1;
  background: transparent;
  color: ${colors.textPlaceholderStrong};
  font-family: ${fonts.sans};
  font-size: 13px;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 10px 8px;
  cursor: pointer;

  &[aria-pressed="true"] {
    color: ${colors.textPrimary};
    border-bottom-color: ${colors.brandAccent};
  }
`;

const Content = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;
