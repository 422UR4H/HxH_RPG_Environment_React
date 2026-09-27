import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { Bar, QueuedAction } from "./combatMessages";

const BAR_LABELS: Record<Bar, string> = {
  action: "Ação",
  move: "Movimento",
};

/** A fila é secreta — só o mestre vê este painel (zona `panel`). */
export default function QueuePanel({
  queue,
  nameOf,
  onPull,
  onOpenNext,
  onCloseTurn,
  canCloseTurn,
}: {
  queue: QueuedAction[];
  nameOf: (characterId: string) => string;
  onPull: (actionId: string) => void;
  onOpenNext: () => void;
  onCloseTurn: () => void;
  canCloseTurn: boolean;
}) {
  return (
    <Panel>
      <List>
        {queue.map((action) => (
          <Row key={action.actionId} data-testid="queue-row">
            <span>
              {nameOf(action.actorId)} — {action.bars.map((b) => BAR_LABELS[b]).join(", ")}
            </span>
            <PullButton onClick={() => onPull(action.actionId)}>Antecipar</PullButton>
          </Row>
        ))}
      </List>
      <Actions>
        <ActionButton onClick={onOpenNext}>Abrir próxima</ActionButton>
        <ActionButton onClick={onCloseTurn} disabled={!canCloseTurn}>
          Fechar turno
        </ActionButton>
      </Actions>
    </Panel>
  );
}

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  padding: 10px;
  background: ${colors.surfaceSidebar};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 13px;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid ${colors.borderDivider};
`;

const ButtonBase = styled.button`
  font-family: ${fonts.sans};
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: ${colors.brandAccent};
  color: ${colors.textPrimary};

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const PullButton = styled(ButtonBase)``;

const Actions = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled(ButtonBase)`
  flex: 1;
`;
