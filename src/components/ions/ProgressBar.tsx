import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";

interface ProgressBarProps {
  current: number;
  max: number;
  min?: number;
  // label?: string;
  color: string;
  backgroundColor?: string;
}

export default function ProgressBar({
  current,
  max,
  min = 0,
  // label = "",
  color,
  backgroundColor = colors.surfaceControl,
}: ProgressBarProps) {
  const range = max - min;
  const percentage =
    range > 0 ? Math.min(Math.max(((current - min) / range) * 100, 0), 100) : 0;

  return (
    <ProgressBarContainer>
      <BarBackground
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={min}
        aria-valuemax={max}
        $backgroundColor={backgroundColor}
      >
        <BarFill data-testid="progress-fill" $percentage={percentage} $color={color} />
        <Label>
          {current}/{max}
        </Label>
      </BarBackground>
    </ProgressBarContainer>
  );
}

const ProgressBarContainer = styled.div`
  width: 100%;
  border: min(0.6cqi, 3px) solid ${colors.textOnLight};
`;

const BarBackground = styled.div<{
  $backgroundColor: string;
}>`
  width: 100%;
  background-color: ${({ $backgroundColor }) => $backgroundColor};
  /* border-radius: 4px; */
  overflow: hidden;
  position: relative;
`;

// Só a cor: o texto mora fora dela, senão some junto com o preenchimento em 0%.
const BarFill = styled.div<{
  $percentage: number;
  $color: string;
}>`
  position: absolute;
  inset: 0;
  width: ${({ $percentage }) => $percentage}%;
  height: 100%;
  background-color: ${({ $color }) => $color};
  transition: width 0.3s ease;
`;

// Número fixo à direita, branco com contorno nítido (legível sobre preenchimento e trilha).
// A etiqueta segue em fluxo: a altura da barra continua vindo dela.
const Label = styled.span`
  display: block;
  position: relative;
  padding-right: 8px;
  white-space: nowrap;
  text-align: right;

  font-family: ${fonts.display};
  font-size: 3.8cqi;
  font-weight: 600;
  color: ${colors.textPrimary};
  text-shadow:
    1px 0 0 ${colors.textOnLight},
    -1px 0 0 ${colors.textOnLight},
    0 1px 0 ${colors.textOnLight},
    0 -1px 0 ${colors.textOnLight};
  padding-top: 1px;
`;
