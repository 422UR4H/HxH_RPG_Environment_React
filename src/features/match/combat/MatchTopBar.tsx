import type { ReactNode } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import { media } from "../../../styles/breakpoints";
import type { MatchWsStatus } from "../../../hooks/useMatchWs";
import type { RoundMode, ScenePayload } from "./combatMessages";
import { ROUND_MODE_LABELS } from "./combatText";

const STATUS_LABELS: Record<MatchWsStatus, string> = {
  connecting: "Conectando…",
  connected: "Conectado",
  waiting: "Aguardando o mestre abrir a sala…",
  disconnected: "Desconectado",
};

const STATUS_COLORS: Record<MatchWsStatus, string> = {
  connecting: colors.warningText,
  connected: colors.statusOngoing,
  waiting: colors.warningText,
  disconnected: colors.danger,
};

/**
 * Cena, regime, conexão e o controle da gaveta. `actions` é um slot que a página do mestre
 * preenche com a regência — este componente não pergunta o papel de ninguém.
 */
export default function MatchTopBar({
  scene,
  roundMode,
  status,
  onReconnect,
  actions,
  asideOpen,
  onToggleAside,
}: {
  scene?: ScenePayload;
  roundMode: RoundMode | "";
  status: MatchWsStatus;
  onReconnect?: () => void;
  /** Substitui o selo de regime quando presente (o mestre troca o regime por aqui). */
  actions?: ReactNode;
  asideOpen: boolean;
  onToggleAside: () => void;
}) {
  return (
    <Bar>
      <SceneLabel title={scene?.briefInitialDescription}>
        {scene?.briefInitialDescription || (scene ? "Cena sem nome" : "Sem cena")}
      </SceneLabel>
      {!actions && roundMode && <RoundBadge>{ROUND_MODE_LABELS[roundMode]}</RoundBadge>}
      <Status data-testid="ws-status" title={STATUS_LABELS[status]}>
        <StatusDot style={{ background: STATUS_COLORS[status] }} aria-hidden />
        <StatusText>{STATUS_LABELS[status]}</StatusText>
      </Status>
      {status === "disconnected" && onReconnect && (
        <SmallButton type="button" onClick={onReconnect}>
          Reconectar
        </SmallButton>
      )}
      {actions}
      <SmallButton
        type="button"
        aria-pressed={asideOpen}
        aria-label={asideOpen ? "Ocultar histórico" : "Ver histórico"}
        onClick={onToggleAside}
      >
        Histórico
      </SmallButton>
    </Bar>
  );
}

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 4px 10px;
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 13px;
`;

const SceneLabel = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
`;

const RoundBadge = styled.span`
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${colors.surfaceInput};
  color: ${colors.textMuted};
  font-size: 12px;
`;

const Status = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 1;
  min-width: 0;
  color: ${colors.textPlaceholderStrong};
  font-size: 12px;
`;

const StatusDot = styled.span`
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
`;

const StatusText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  ${media.phone} {
    display: none;
  }
`;

export const SmallButton = styled.button`
  flex-shrink: 0;
  font-family: ${fonts.sans};
  font-size: 12px;
  font-weight: 600;
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  background: ${colors.surfaceInput};
  color: ${colors.textPrimary};

  &[aria-pressed="true"] {
    border-color: ${colors.brandAccentBright};
    background: ${colors.brandAccent};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
