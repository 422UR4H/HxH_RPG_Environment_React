import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";

/**
 * Declaradas que o servidor perdeu (B12/F10). Persistente — ao contrário do
 * `MatchErrorBanner`, não some sozinho: o jogador precisa saber que a ação não está mais na
 * fila, ou fica esperando um turno que não vem.
 */
export default function LostDeclaredNotice({
  count,
  onDismiss,
}: {
  count: number;
  onDismiss: () => void;
}) {
  if (count === 0) return null;
  const what = count === 1 ? "1 ação" : `${count} ações`;
  return (
    <Notice role="status">
      <span>
        O servidor perdeu {what} que você tinha declarado. O rascunho voltou para o compositor —
        confira e declare de novo.
      </span>
      <Close type="button" aria-label="Fechar aviso" onClick={onDismiss}>
        ×
      </Close>
    </Notice>
  );
}

const Notice = styled.div`
  position: absolute;
  top: 104px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 49;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: max-content;
  max-width: min(92%, 520px);
  padding: 10px 8px 10px 14px;
  border-radius: 6px;
  border: 1px solid ${colors.warningBorder};
  background: ${colors.surfaceSidebar};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 13px;
`;

const Close = styled.button`
  flex: none;
  padding: 0 4px;
  background: transparent;
  border: none;
  color: ${colors.textPlaceholderStrong};
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
`;
