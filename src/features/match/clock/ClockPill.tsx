import { useRef } from "react";
import styled, { css, keyframes } from "styled-components";
import StopwatchIcon from "../../../components/ions/StopwatchIcon";
import { media } from "../../../styles/breakpoints";
import { alpha, colors } from "../../../styles/tokens";
import { CLOCK_PILL_HEIGHT, CLOCK_PILL_TOP, CLOCK_PILL_Z_INDEX } from "./clockLayout";
import { formatDateBR, formatTime } from "./storyTime";
import { ALERT_AT } from "./useStoryClock";
import type { StoryClockView } from "./useStoryClock";

const STRONG_EVERY_PULSES = 6;

/**
 * O relógio do mundo no topo do palco: cronômetro + hora (a data a partir do tablet). Com o
 * tempo real ligado, um ponto "ao vivo" respira para todos. Para o mestre (`interactive`) a
 * pílula é o botão do painel e a atenção escala (`data-phase`): pulso leve a cada 10 s, mais
 * forte a cada minuto, e de 5 min em diante um tom de alerta fixo com os pulsos por cima.
 * Um round que passa não avisa: a pílula só pisca de leve, para todos (spec §8.1).
 */
export default function ClockPill({
  clock,
  interactive,
  open = false,
  onToggle,
}: {
  clock: StoryClockView;
  interactive: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  const { now, running, phase, pulseKey, realElapsedSeconds, roundFlashKey } = clock;
  // O round que já estava no estado ao montar é velho: só pisca o que chega depois.
  const mountRoundKey = useRef(roundFlashKey);
  const roundFlash = roundFlashKey > 0 && roundFlashKey !== mountRoundKey.current;
  const time = now ? formatTime(now) : null;
  const date = now ? formatDateBR(now) : null;
  // O alerta não pisca nos segundos de pulso: depende do tempo decorrido, não só da fase.
  const alert = interactive && running && realElapsedSeconds >= ALERT_AT;
  const elapsedMin = interactive && running ? Math.floor(realElapsedSeconds / 60) : 0;

  const content = (
    <>
      {interactive && running && pulseKey > 0 && (
        <PulseRing
          key={pulseKey}
          data-testid="clock-pulse-ring"
          aria-hidden
          $strong={pulseKey % STRONG_EVERY_PULSES === 0}
          $alert={alert}
        />
      )}
      {roundFlash && <RoundFlash key={roundFlashKey} data-testid="clock-round-flash" data-round-flash={roundFlashKey} aria-hidden />}
      <Icon size={18} />
      {running && <LiveDot data-testid="clock-live-dot" aria-hidden />}
      {time ? <Time>{time}</Time> : <Unset>Hora a definir</Unset>}
      {date && <DateText>{date}</DateText>}
      {elapsedMin > 0 && <Elapsed>▶ {elapsedMin} min</Elapsed>}
    </>
  );

  if (interactive) {
    return (
      <PillButton
        type="button"
        aria-label="Relógio da história"
        aria-expanded={open}
        data-phase={phase}
        data-alert={alert || undefined}
        onClick={onToggle}
      >
        {content}
      </PillButton>
    );
  }
  return (
    <PillStatus
      role="status"
      aria-live="off"
      aria-label={`Relógio da história: ${date && time ? `${time}, ${date}` : "hora a definir"}`}
      title={date && time ? `${date} ${time}` : "Hora a definir"}
      data-phase={phase}
    >
      {content}
    </PillStatus>
  );
}

const breathe = keyframes`
  from { opacity: 1; }
  to { opacity: 0.35; }
`;

const ringSoft = keyframes`
  0% { opacity: 0.9; box-shadow: 0 0 0 0 ${alpha(colors.brandAccent, 0.55)}; }
  100% { opacity: 0; box-shadow: 0 0 0 8px ${alpha(colors.brandAccent, 0)}; }
`;

const ringStrong = keyframes`
  0% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 ${alpha(colors.brandAccent, 0.8)}; }
  35% { transform: scale(1.04); }
  100% { opacity: 0; transform: scale(1); box-shadow: 0 0 0 14px ${alpha(colors.brandAccent, 0)}; }
`;

const ringSoftAlert = keyframes`
  0% { opacity: 0.9; box-shadow: 0 0 0 0 ${alpha(colors.feedbackWarningBorder, 0.6)}; }
  100% { opacity: 0; box-shadow: 0 0 0 8px ${alpha(colors.feedbackWarningBorder, 0)}; }
`;

const ringStrongAlert = keyframes`
  0% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 ${alpha(colors.feedbackWarningBorder, 0.85)}; }
  35% { transform: scale(1.04); }
  100% { opacity: 0; transform: scale(1); box-shadow: 0 0 0 14px ${alpha(colors.feedbackWarningBorder, 0)}; }
`;

const pill = css`
  position: absolute;
  top: ${CLOCK_PILL_TOP}px;
  left: 50%;
  transform: translateX(-50%);
  z-index: ${CLOCK_PILL_Z_INDEX};
  box-sizing: border-box;
  height: ${CLOCK_PILL_HEIGHT}px;
  max-width: calc(100% - 16px);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px 0 12px;
  border-radius: 999px;
  border: 1px solid ${colors.overlayHighlight};
  background: ${colors.overlayMedium};
  color: ${colors.textPrimary};
  font: inherit;
  font-size: 14px;
  line-height: 1;
  white-space: nowrap;
  pointer-events: auto;
  transition: background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease;

  &[data-alert="true"] {
    border-color: ${colors.feedbackWarningBorder};
    box-shadow: 0 0 0 3px ${colors.feedbackWarningBg}, 0 0 12px ${alpha(colors.feedbackWarningBorder, 0.35)};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const PillButton = styled.button`
  ${pill}
  cursor: pointer;

  &:hover,
  &[aria-expanded="true"] {
    background: ${colors.overlayDark};
    border-color: ${colors.overlayLightStrong};
  }

  &[data-alert="true"]:hover,
  &[data-alert="true"][aria-expanded="true"] {
    border-color: ${colors.feedbackWarning};
  }
`;

const PillStatus = styled.div`
  ${pill}
  cursor: default;
  user-select: none;
`;

/** O anel do pulso: remontado a cada `pulseKey`, a animação recomeça sozinha. */
const PulseRing = styled.span<{ $strong: boolean; $alert: boolean }>`
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  border: ${({ $strong }) => ($strong ? 2 : 1)}px solid
    ${({ $alert }) => ($alert ? colors.feedbackWarningBorder : colors.brandAccent)};
  pointer-events: none;
  opacity: 0;
  animation: ${({ $strong, $alert }) =>
      $strong ? ($alert ? ringStrongAlert : ringStrong) : $alert ? ringSoftAlert : ringSoft}
    ${({ $strong }) => ($strong ? 900 : 600)}ms ease-out forwards;

  /* Sem movimento: o anel só acende no segundo do pulso e apaga no seguinte (degrau). */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: none;
    [data-phase="pulse"] > & {
      opacity: 0.7;
    }
    [data-phase="strongPulse"] > & {
      opacity: 1;
    }
  }
`;

const roundGlow = keyframes`
  0% { opacity: 0; }
  30% { opacity: 1; }
  100% { opacity: 0; }
`;

const roundStep = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

/** O piscar do round: um clarão sutil, remontado a cada `roundFlashKey` (sem movimento). */
const RoundFlash = styled.span`
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: ${alpha(colors.textPrimary, 0.14)};
  pointer-events: none;
  opacity: 0;
  animation: ${roundGlow} 700ms ease-out forwards;

  /* Sem movimento: só um degrau de cor, que apaga de uma vez. */
  @media (prefers-reduced-motion: reduce) {
    animation: ${roundStep} 500ms steps(1, end) forwards;
  }
`;

const Icon = styled(StopwatchIcon)`
  flex-shrink: 0;
  color: ${colors.textMuted};
`;

const LiveDot = styled.span`
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${colors.statusOngoing};
  box-shadow: 0 0 6px ${alpha(colors.statusOngoing, 0.7)};
  animation: ${breathe} 1.4s ease-in-out infinite alternate;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Time = styled.span`
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
`;

const Unset = styled.span`
  font-style: italic;
  color: ${colors.textPlaceholderStrong};
`;

/** No celular a pílula mostra só a hora; a data fica no painel e no `title`. */
const DateText = styled.span`
  display: none;
  font-size: 12px;
  color: ${colors.textPlaceholderStrong};
  font-variant-numeric: tabular-nums;

  ${media.tabletUp} {
    display: inline;
  }
`;

const Elapsed = styled.span`
  padding-left: 8px;
  border-left: 1px solid ${colors.overlayHighlight};
  font-size: 12px;
  color: ${colors.textPlaceholderStrong};
  font-variant-numeric: tabular-nums;
`;
