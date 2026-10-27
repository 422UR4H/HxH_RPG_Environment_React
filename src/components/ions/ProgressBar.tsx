import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";

interface ProgressBarProps {
  current: number;
  max: number;
  min?: number;
  // label?: string;
  color: string;
  // Tom escuro que fica sob o número, à direita; sem ele o preenchimento é a cor lisa.
  deepColor?: string;
  backgroundColor?: string;
}

export default function ProgressBar({
  current,
  max,
  min = 0,
  // label = "",
  color,
  deepColor,
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
        <BarFill data-testid="progress-fill" $percentage={percentage} $color={color} $deepColor={deepColor} />
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
// O preenchimento ocupa a largura toda e é recortado no valor: assim o tom escuro do degradê
// fica sempre sob o número (à direita) e só aparece onde há preenchimento.
// font-size igual ao da etiqueta, para o `em` do degradê medir o número.
const BarFill = styled.div<{
  $percentage: number;
  $color: string;
  $deepColor?: string;
}>`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  font-size: 3.8cqi;
  background: ${({ $color, $deepColor }) =>
    $deepColor
      ? `linear-gradient(to right, ${$color} calc(100% - 8em), ${$deepColor} calc(100% - 4em))`
      : $color};
  clip-path: inset(0 ${({ $percentage }) => 100 - $percentage}% 0 0);
  transition: clip-path 0.3s ease;
`;

// Número fixo à direita, branco com sombra suave (legível sobre preenchimento e trilha).
// A etiqueta segue em fluxo: a altura da barra continua vindo dela.
const Label = styled.span`
  display: block;
  position: relative; /* pinta a etiqueta acima do preenchimento, que é absoluto */
  padding-right: 8px;
  white-space: nowrap;
  text-align: right;

  font-family: ${fonts.display};
  /* Sem piso: a etiqueta define a altura da barra, e um piso a deixaria mais alta que o card
     comporta. A legibilidade vem do branco com contorno. */
  font-size: 3.8cqi;
  font-weight: 600;
  color: ${colors.textPrimary};
  text-shadow: 0 0 2px ${colors.shadowText};
  padding-top: 1px;

  /* Algarismos no meio da barra; a altura continua 1lh + 1px (o card não muda de tamanho). */
  @supports (text-box: trim-both cap alphabetic) {
    text-box: trim-both cap alphabetic;
    padding-top: calc((1lh + 1px - 1cap) / 2);
    padding-bottom: calc((1lh + 1px - 1cap) / 2);
  }
`;
