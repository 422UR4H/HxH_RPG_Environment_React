import styled from "styled-components";
import { colors } from "../../styles/tokens";
import Tooltip from "../ions/Tooltip";

interface CharacterExpBarProps {
  currExp: number;
  maxExp: number;
  level?: number;
  /** Esconde as etiquetas à direita e as mostra num tooltip (criação/edição, onde colidem com o select). */
  labelsInTooltip?: boolean;
}

export default function CharacterExpBar({ currExp, maxExp, level, labelsInTooltip = false }: CharacterExpBarProps) {
  const percentage = maxExp > 0 ? Math.min((currExp / maxExp) * 100, 100) : 0;

  const bar = (
    <BarBorder>
      <BarBackground>
        <BarFill $percentage={percentage} />
      </BarBackground>
    </BarBorder>
  );

  if (labelsInTooltip) {
    const expText = `${currExp} / ${maxExp}`;
    const label = level !== undefined ? `Lv ${level} · ${expText}` : expText;
    return (
      <Container>
        <Tooltip label={label} placement="bottom" stretch>
          <BarBorder
            role="progressbar"
            tabIndex={0}
            aria-valuenow={currExp}
            aria-valuemin={0}
            aria-valuemax={maxExp}
            aria-label="Experiência"
          >
            <BarBackground>
              <BarFill $percentage={percentage} />
            </BarBackground>
          </BarBorder>
        </Tooltip>
      </Container>
    );
  }

  return (
    <Container>
      <RightLabels>
        {level !== undefined && <LvLabel>Lv {level}</LvLabel>}
        {maxExp > 0 && <ExpLabel>{currExp} / {maxExp}</ExpLabel>}
      </RightLabels>
      {bar}
    </Container>
  );
}

const Container = styled.div`
  position: relative;
  width: 100%;
`;

const sharedLabelStyles = `
  color: ${colors.textPrimary};
  font-size: 3cqi;
  font-weight: 600;
  text-shadow: 1px 1px 4px ${colors.shadowText};
  white-space: nowrap;

  @container (max-width: 609px) {
    font-size: 4cqi;
  }
  /* Piso de 10 px (e não os 11 do plano: com 11 a classe encostava no Lv), só em card de
     220 px ou mais. No card do lobby (cerca de 180 px) qualquer piso cobre o fim da classe:
     ali o tamanho fica como estava, pendente do designer. */
  @container (min-width: 220px) and (max-width: 609px) {
    font-size: max(4cqi, 10px);
  }
`;

const RightLabels = styled.div`
  position: absolute;
  bottom: calc(100% + 2px);
  right: 12px;
  display: flex;
  align-items: baseline;
  gap: 6px;
  pointer-events: none;
  z-index: 10;

  @container (max-width: 609px) {
    right: 3%;
  }
`;

const LvLabel = styled.span`
  ${sharedLabelStyles}
  font-size: 4cqi;
  margin-right: 2cqi;

  /* Mesmo piso e mesma faixa do número da EXP (ver sharedLabelStyles). */
  @container (min-width: 220px) {
    font-size: max(4cqi, 10px);
  }
`;

const ExpLabel = styled.span`
  ${sharedLabelStyles}
`;

const BarBorder = styled.div`
  width: 100%;
  border: 3px solid ${colors.textOnLight};

  @container (max-width: 609px) {
    border-width: 0.6cqi;
  }
`;

const BarBackground = styled.div`
  width: 100%;
  height: 1.3cqi;
  background-color: ${colors.surfaceControl};
  overflow: hidden;
`;

const BarFill = styled.div<{ $percentage: number }>`
  width: ${({ $percentage }) => $percentage}%;
  height: 100%;
  background-color: ${colors.vitalExp};
  transition: width 0.3s ease;
`;
