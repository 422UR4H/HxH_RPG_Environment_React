import { useEffect } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import { combatErrorText } from "./combatErrorMessages";
import type { WsError } from "./combatErrorMessages";

export default function MatchErrorBanner({
  error,
  onDismiss,
}: {
  error: WsError | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [error, onDismiss]);

  if (!error) return null;
  return (
    <Banner role="alert" onClick={onDismiss}>
      {combatErrorText(error.code, error.message, error.sentType)}
    </Banner>
  );
}

// Sem posição própria: a página empilha os avisos do palco num `StageNotices`.
const Banner = styled.div`
  max-width: 100%;
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid ${colors.statusError};
  background: ${colors.surfaceSidebar};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 13px;
  cursor: pointer;
`;
