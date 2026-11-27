// A aba "Partida" do painel do mestre: o que muda a partida inteira (cena, o que se revela,
// configurações da mesa, encerrar). Só o mestre a monta — a página é que decide.
import styled from "styled-components";
import ComingSoonBadge from "../../../components/ions/ComingSoonBadge";
import { colors } from "../../../styles/tokens";
import { EndMatchButton } from "./MasterControls";
import { PanelTitle } from "./panelStyles";
import { SmallButton } from "./MatchTopBar";

const REVEAL_OPTIONS = ["De todos os personagens de jogador, para todos", "De todos os NPCs"];

export default function MatchTabPanel({
  sceneLabel,
  onNewScene,
  canChangeScene,
  endMatchBlockedReason,
  onEndMatch,
}: {
  /** O mesmo texto que o header mostra (`sceneTitle`). */
  sceneLabel: string;
  onNewScene: () => void;
  canChangeScene: boolean;
  /** Por que não dá para encerrar agora (`endMatchBlockReason`); `null` = pode. */
  endMatchBlockedReason: string | null;
  onEndMatch: () => void;
}) {
  return (
    <Root>
      <Group>
        <PanelTitle>Cena</PanelTitle>
        <SceneName>{sceneLabel}</SceneName>
        <div>
          <SmallButton
            type="button"
            onClick={onNewScene}
            disabled={!canChangeScene}
            title={canChangeScene ? undefined : "Feche o turno antes de trocar de cena"}
          >
            Nova cena
          </SmallButton>
        </div>
      </Group>
      <Group>
        <TitleRow>
          <PanelTitle>Revelar barras de vida e stamina</PanelTitle>
          <ComingSoonBadge />
        </TitleRow>
        {REVEAL_OPTIONS.map((label) => (
          <CheckRow key={label}>
            <input type="checkbox" disabled />
            {label}
          </CheckRow>
        ))}
      </Group>
      <Group>
        <TitleRow>
          <PanelTitle>Configurações da mesa</PanelTitle>
          <ComingSoonBadge />
        </TitleRow>
      </Group>
      <Rule />
      <div>
        <EndMatchButton blockedReason={endMatchBlockedReason} onClick={onEndMatch} />
      </div>
    </Root>
  );
}

const Root = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px;
`;

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

const SceneName = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${colors.textPrimary};
`;

const CheckRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${colors.textDisabledOnDark};
`;

const Rule = styled.hr`
  width: 100%;
  margin: 0;
  border: none;
  border-top: 1px solid ${colors.borderInput};
`;
