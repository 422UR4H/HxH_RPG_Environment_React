import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { QueuedAction } from "./combatMessages";
import { BAR_ICONS, BAR_LABELS } from "./combatText";

/**
 * A fila secreta — só o mestre recebe. Em ordem de chegada (a ordem de EXECUÇÃO é a barra
 * geral). O conteúdo de uma ação de jogador nunca chega ao mestre antes de abrir; o das
 * ações que o próprio mestre declarou por NPC vem de `describe`.
 */
export default function QueuePanel({
  queue,
  nameOf,
  describe,
  onPull,
}: {
  queue: QueuedAction[];
  nameOf: (characterId: string) => string;
  /** Detalhe de uma ação declarada neste navegador, quando houver. */
  describe?: (actionId: string) => string | undefined;
  onPull: (actionId: string) => void;
}) {
  return (
    <Panel aria-label="Fila">
      <Title>Fila de ações</Title>
      {queue.length === 0 ? (
        <Empty>Ninguém declarou nada ainda. O que for declarado aparece aqui.</Empty>
      ) : (
        <List>
          {queue.map((action) => {
            const detail = describe?.(action.actionId);
            return (
              <Row key={action.actionId} data-testid="queue-row">
                <Info>
                  <Name>
                    {nameOf(action.actorId)}{" "}
                    <Bars title={action.bars.map((b) => BAR_LABELS[b]).join(" + ")}>
                      {action.bars.map((b) => BAR_ICONS[b]).join("")}
                    </Bars>
                  </Name>
                  {detail && <Detail>{detail}</Detail>}
                </Info>
                <PullButton type="button" onClick={() => onPull(action.actionId)} title="Abrir esta ação agora, fora da ordem">
                  Abrir agora
                </PullButton>
              </Row>
            );
          })}
        </List>
      )}
    </Panel>
  );
}

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 13px;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: ${colors.textPlaceholderStrong};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const Empty = styled.p`
  margin: 0;
  color: ${colors.textPlaceholderStrong};
  font-size: 12px;
  font-style: italic;
`;

const List = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Row = styled.li`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  background: ${colors.surfaceInputHover};
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Name = styled.span`
  font-weight: 600;
`;

const Bars = styled.span`
  font-weight: 400;
  color: ${colors.textPlaceholderStrong};
`;

const Detail = styled.span`
  font-size: 12px;
  color: ${colors.textMuted};
`;

const PullButton = styled.button`
  flex-shrink: 0;
  font-family: ${fonts.sans};
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  border: 1px solid ${colors.brandAccent};
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
  color: ${colors.textPrimary};
`;
