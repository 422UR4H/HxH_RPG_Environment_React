import type { ReactNode } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { MatchWsStatus } from "../../../hooks/useMatchWs";
import type { RoundMode, ScenePayload } from "./combatMessages";

const STATUS_LABELS: Record<MatchWsStatus, string> = {
  connecting: "Conectando…",
  connected: "Conectado",
  disconnected: "Desconectado",
};

const ROUND_MODE_LABELS: Record<RoundMode, string> = {
  Free: "Livre",
  Race: "Corrida",
};

/**
 * Burro (R6/I2): cena, regime, status de conexão, um slot `actions` que a página do mestre
 * preenche com regência, e o único controle que abre/fecha o `aside` (R24). Nenhum `isMaster`
 * aqui — quem decide o que passar em `actions` é a página.
 */
export default function MatchTopBar({
  scene,
  roundMode,
  status,
  actions,
  asideOpen,
  onToggleAside,
}: {
  scene?: ScenePayload;
  roundMode: RoundMode | "";
  status: MatchWsStatus;
  actions?: ReactNode;
  asideOpen: boolean;
  onToggleAside: () => void;
}) {
  return (
    <Bar>
      <SceneLabel>{scene?.briefInitialDescription ?? "Sem cena"}</SceneLabel>
      <RoundBadge>{roundMode ? ROUND_MODE_LABELS[roundMode] : "—"}</RoundBadge>
      <StatusLabel data-testid="ws-status">{STATUS_LABELS[status]}</StatusLabel>
      {actions}
      <AsideToggle
        type="button"
        aria-pressed={asideOpen}
        aria-label="Histórico"
        onClick={onToggleAside}
      >
        Histórico
      </AsideToggle>
    </Bar>
  );
}

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  height: 100%;
  padding: 0 12px;
  background: ${colors.surfaceSidebar};
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
`;

const RoundBadge = styled.span`
  flex-shrink: 0;
  color: ${colors.textMuted};
`;

const StatusLabel = styled.span`
  flex-shrink: 0;
  color: ${colors.textPlaceholderStrong};
`;

const AsideToggle = styled.button`
  flex-shrink: 0;
  background: ${colors.surfaceInput};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 12px;
  border: none;
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;

  &[aria-pressed="true"] {
    background: ${colors.brandAccent};
  }
`;
