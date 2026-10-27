import styled, { css } from "styled-components";
import type { ReactNode } from "react";
import { colors } from "../../styles/tokens";

export type BadgeTone =
  | "scheduled"
  | "ongoing"
  | "ended"
  | "pending"
  | "danger"
  | "muted"
  | "comingSoon";

type BadgeSize = "sm" | "md";

interface BadgeProps {
  tone: BadgeTone;
  size?: BadgeSize;
  uppercase?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Selo de status. O texto é aparado até as alturas de maiúscula/linha de base
 * (`text-box`), então fica centralizado na vertical mesmo sem descendentes.
 */
export default function Badge({ tone, size = "md", uppercase = true, className, children }: BadgeProps) {
  return (
    <Root $tone={tone} $size={size} $uppercase={uppercase} className={className}>
      {children}
    </Root>
  );
}

const tones: Record<BadgeTone, ReturnType<typeof css>> = {
  scheduled: css`background-color: ${colors.statusScheduled}; color: ${colors.textPrimary};`,
  ongoing: css`background-color: ${colors.statusOngoing}; color: ${colors.textPrimary};`,
  ended: css`background-color: ${colors.statusEnded}; color: ${colors.textPrimary};`,
  pending: css`background-color: ${colors.statusPending}; color: ${colors.textPrimary};`,
  danger: css`background-color: ${colors.feedbackDanger}; color: ${colors.textPrimary};`,
  muted: css`background-color: ${colors.statusLeft}; color: ${colors.textDisabled};`,
  comingSoon: css`
    border: 1px solid ${colors.statusComingSoon};
    color: ${colors.statusComingSoon};
  `,
};

/**
 * Cada tamanho guarda o padding vertical de antes (`pad`). Com o texto aparado,
 * a altura externa se mantém somando ao padding o que o aparo tirou:
 * (1em - 1cap) / 2 por lado, já que a linha tem line-height 1.
 */
const sizes: Record<BadgeSize, { fontSize: number; radius: string; padY: number; padX: number; tracking: string }> = {
  sm: { fontSize: 12, radius: "4px", padY: 2, padX: 8, tracking: "0" },
  md: { fontSize: 13, radius: "20px", padY: 4, padX: 12, tracking: "0.08em" },
};

const Root = styled.span<{ $tone: BadgeTone; $size: BadgeSize; $uppercase: boolean }>`
  display: inline-block;
  box-sizing: border-box;
  font-size: ${({ $size }) => sizes[$size].fontSize}px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  border-radius: ${({ $size }) => sizes[$size].radius};
  padding: ${({ $size }) => `${sizes[$size].padY}px ${sizes[$size].padX}px`};
  ${({ $uppercase, $size }) =>
    $uppercase &&
    css`
      text-transform: uppercase;
      letter-spacing: ${sizes[$size].tracking};
    `}
  ${({ $tone }) => tones[$tone]}

  @supports (text-box: trim-both cap alphabetic) {
    text-box: trim-both cap alphabetic;
    padding-block: ${({ $size }) => `calc(${sizes[$size].padY}px + (1em - 1cap) / 2)`};
  }
`;
