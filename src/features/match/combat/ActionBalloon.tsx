import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { BalloonTone } from "./balloonText";

const BG: Record<BalloonTone, string> = {
  neutral: colors.surfaceInput,
  success: colors.brandAccent,
  failure: colors.dangerDark,
};

export type BalloonLine = { text: string; tone: BalloonTone };

/**
 * Balão de mangá: a ponta aponta para baixo, para a peça. Ancorado acima dela (spec §4.9).
 * Um balão por peça: quem tem mais de uma frase (o ator que também é alvo) empilha as linhas
 * no mesmo balão, cada uma na cor do seu tom. Com uma linha só, o balão inteiro toma o tom.
 */
export default function ActionBalloon({ lines }: { lines: BalloonLine[] }) {
  const tone: BalloonTone = lines.length === 1 ? lines[0].tone : "neutral";
  return (
    <Bubble role="status" $tone={tone}>
      {lines.map((l, i) => (
        <Line key={i} $tone={l.tone}>{l.text}</Line>
      ))}
    </Bubble>
  );
}

const Bubble = styled.div<{ $tone: BalloonTone }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 200px;
  margin-bottom: 6px; /* a ponta */
  padding: 4px;
  border-radius: 10px;
  border: 1px solid ${colors.borderInput};
  background: ${({ $tone }) => BG[$tone]};
  color: ${colors.textPrimary};
  font: 12px ${fonts.sans};
  text-align: center;
  overflow-wrap: anywhere;
  pointer-events: none;

  &::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 100%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: ${({ $tone }) => BG[$tone]};
  }
`;

const Line = styled.span<{ $tone: BalloonTone }>`
  padding: 0 4px;
  border-radius: 6px;
  background: ${({ $tone }) => BG[$tone]};
  font-family: ${fonts.sans};
`;
