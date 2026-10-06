import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { BalloonTone } from "./balloonText";

const BG: Record<BalloonTone, string> = {
  neutral: colors.surfaceInput,
  success: colors.brandAccent,
  failure: colors.dangerDark,
};

/** Balão de mangá: a ponta aponta para baixo, para a peça. Ancorado acima dela (spec §4.9). */
export default function ActionBalloon({ text, tone }: { text: string; tone: BalloonTone }) {
  return <Bubble role="status" $tone={tone}>{text}</Bubble>;
}

const Bubble = styled.div<{ $tone: BalloonTone }>`
  position: relative;
  max-width: 200px;
  margin-bottom: 6px; /* a ponta */
  padding: 4px 8px;
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
