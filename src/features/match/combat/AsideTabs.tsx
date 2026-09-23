import { useState } from "react";
import type { ReactNode } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";

export type AsideTab = "historico" | "personagens";

/**
 * Burro (R6/I2): duas abas fixas — Histórico (padrão, §5.3/§10 do spec) e Personagens.
 * Nenhum `isMaster` aqui: a página escolhe o que renderizar em cada slot.
 *
 * Modo controlado opcional (`tab`/`onTabChange`): o mestre usa para forçar a aba para
 * Personagens quando o jogador clica numa peça de terceiro para inspecionar (§7.3) —
 * sem isso a única forma de trocar de aba seria o próprio clique nela. Sem os dois
 * props a aba continua não-controlada, como na Tarefa 12.
 */
export default function AsideTabs({
  defaultTab,
  tab: controlledTab,
  onTabChange,
  historico,
  personagens,
}: {
  defaultTab: AsideTab;
  tab?: AsideTab;
  onTabChange?: (tab: AsideTab) => void;
  historico: ReactNode;
  personagens: ReactNode;
}) {
  const [internalTab, setInternalTab] = useState<AsideTab>(defaultTab);
  const tab = controlledTab ?? internalTab;

  function selectTab(next: AsideTab) {
    if (onTabChange) onTabChange(next);
    else setInternalTab(next);
  }

  return (
    <Wrapper>
      <TabList>
        <TabButton
          type="button"
          aria-pressed={tab === "historico"}
          onClick={() => selectTab("historico")}
        >
          Histórico
        </TabButton>
        <TabButton
          type="button"
          aria-pressed={tab === "personagens"}
          onClick={() => selectTab("personagens")}
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
