import { useEffect } from "react";
import styled from "styled-components";
import CloseButton from "../../../components/ions/CloseButton";
import { colors } from "../../../styles/tokens";
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
    <Banner role="alert">
      <span>{combatErrorText(error.code, error.message, error.sentType)}</span>
      <CloseWrap type="button" aria-label="Fechar aviso" onClick={onDismiss}>
        <CloseButton alt="" />
      </CloseWrap>
    </Banner>
  );
}

// Sem posição própria: a página empilha os avisos do palco num `StageNotices`.
const Banner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  max-width: 100%;
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid ${colors.feedbackDanger};
  background: ${colors.surfaceSidebar};
  color: ${colors.textPrimary};
  font-size: 13px;
`;

// Só o × fecha: o aviso era clicável inteiro e sumia ao tocar para ler.
const CloseWrap = styled.button`
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
`;
