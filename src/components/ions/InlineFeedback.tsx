import { useEffect } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";

type Props = {
  message: string;
  variant?: "success" | "error" | "info";
  autoDismissMs?: number;
  onDismiss?: () => void;
};

const BG: Record<NonNullable<Props["variant"]>, string> = {
  success: `${colors.brandAccent}22`,
  error:   `${colors.danger}18`,
  info:    `${colors.surfaceInput}`,
};
const BORDER: Record<NonNullable<Props["variant"]>, string> = {
  success: colors.brandAccent,
  error:   colors.danger,
  info:    colors.borderInput,
};
const TEXT: Record<NonNullable<Props["variant"]>, string> = {
  success: colors.brandAccentBright,
  error:   colors.danger,
  info:    colors.textMuted,
};

export default function InlineFeedback({
  message,
  variant = "info",
  autoDismissMs,
  onDismiss,
}: Props) {
  useEffect(() => {
    if (!autoDismissMs) return;
    const timer = setTimeout(() => onDismiss?.(), autoDismissMs);
    return () => clearTimeout(timer);
  }, [message, autoDismissMs, onDismiss]);

  return (
    <Wrapper $variant={variant}>
      {message}
    </Wrapper>
  );
}

const Wrapper = styled.div<{ $variant: NonNullable<Props["variant"]> }>`
  font-family: ${fonts.sans};
  font-size: clamp(11px, 2.5cqi, 13px);
  padding: 6px 10px;
  border-radius: 5px;
  border: 1px solid ${({ $variant }) => BORDER[$variant]};
  background: ${({ $variant }) => BG[$variant]};
  color: ${({ $variant }) => TEXT[$variant]};
`;
