import styled from "styled-components";
import { colors } from "../../styles/tokens";

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
        {/* Camada clara: lida sobre a trilha escura (o que não está preenchido). */}
        <TrackClip $percentage={percentage}>
          <Label $percentage={percentage} $tone="onTrack">
            {current}/{max}
          </Label>
        </TrackClip>
        {/* Camada escura: a MESMA etiqueta, recortada na área preenchida. As duas juntas
            fazem o texto trocar de cor exatamente na borda do preenchimento. */}
        <FillClip $percentage={percentage} aria-hidden>
          <Label $percentage={percentage} $tone="onFill">
            {current}/{max}
          </Label>
        </FillClip>
      </BarBackground>
    </ProgressBarContainer>
  );
}

const ProgressBarContainer = styled.div`
  width: 100%;
  border: min(0.6cqi, 3px) solid ${colors.textOnLight};
`;

// const Label = styled.span`
//   font-family: "Oswald", sans-serif;
//   font-size: 14px;
//   color: white;
//   display: block;
//   margin-bottom: 4px;
// `;

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

// Complementar ao FillClip: a camada clara só aparece na parte NÃO preenchida, para não
// deixar halo claro de antialiasing sob os glifos escuros. O recorte fica no wrapper
// (no próprio Label ele andaria junto com o translateX) e o wrapper segue em fluxo,
// então a altura da barra continua vindo da etiqueta.
const TrackClip = styled.div<{ $percentage: number }>`
  position: relative;
  clip-path: inset(0 0 0 ${({ $percentage }) => $percentage}%);
  transition: clip-path 0.3s ease;
`;

const FillClip = styled.div<{ $percentage: number }>`
  position: absolute;
  inset: 0;
  clip-path: inset(0 ${({ $percentage }) => 100 - $percentage}% 0 0);
  transition: clip-path 0.3s ease;
  pointer-events: none;
`;

// A etiqueta acompanha o fim do preenchimento; o mínimo de 7ch + padding evita que
// "0/32" vaze pela esquerda da barra quando o valor é baixo. A clara fica em fluxo
// (define a altura da barra); a escura é absoluta dentro do recorte.
const Label = styled.span<{ $percentage: number; $tone: "onTrack" | "onFill" }>`
  display: block;
  width: max-content;
  position: ${({ $tone }) => ($tone === "onFill" ? "absolute" : "relative")};
  top: 0;
  left: max(${({ $percentage }) => $percentage}%, calc(7ch + 8px));
  transform: translateX(-100%);
  padding-right: 8px;
  white-space: nowrap;
  transition: left 0.3s ease;

  font-family: "Oswald", sans-serif;
  font-size: 3.8cqi;
  font-weight: 600;
  color: ${({ $tone }) =>
    $tone === "onFill" ? colors.textOnLight : colors.textPrimary};
  padding-top: 1px;
`;
