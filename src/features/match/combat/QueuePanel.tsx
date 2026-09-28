import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { Bar, QueuedAction, ResolutionPayload } from "./combatMessages";
import { BAR_ICONS, BAR_LABELS } from "./combatText";
import ResolutionDetails from "./ResolutionDetails";

/**
 * A fila secreta — só o mestre recebe. Em ordem de chegada (a ordem de EXECUÇÃO é a barra
 * geral). O conteúdo de uma ação de jogador nunca chega ao mestre antes de abrir; o das
 * ações que o próprio mestre declarou por NPC vem de `describe`. Mostra também, no topo, a
 * ação em andamento (`open`) — o turno aberto tirou essa linha da fila de verdade, mas o
 * mestre ainda precisa vê-la, com o cálculo que só ele recebe (F7).
 */
export default function QueuePanel({
  queue,
  open,
  nameOf,
  describe,
  onPull,
}: {
  queue: QueuedAction[];
  /** A ação do turno aberto — já não está em `queue`, mas continua na tela, marcada. */
  open?: { actorId: string; bars?: Bar[]; resolution: ResolutionPayload | null };
  nameOf: (characterId: string) => string;
  /** Detalhe de uma ação declarada neste navegador, quando houver. */
  describe?: (actionId: string) => string | undefined;
  onPull: (actionId: string) => void;
}) {
  return (
    <Panel aria-label="Fila">
      <Title>Fila de ações</Title>
      {queue.length === 0 && !open ? (
        <Empty>Ninguém declarou nada ainda. O que for declarado aparece aqui.</Empty>
      ) : (
        <List>
          {open && (
            <OpenRow data-testid="queue-open">
              <Info>
                <Name>
                  {nameOf(open.actorId)}{" "}
                  {!!open.bars?.length && (
                    <Bars title={open.bars.map((b) => BAR_LABELS[b]).join(" + ")}>
                      {open.bars.map((b) => BAR_ICONS[b]).join("")}
                    </Bars>
                  )}
                  <OpenBadge>em andamento</OpenBadge>
                </Name>
              </Info>
              {open.resolution && <ResolutionDetails resolution={open.resolution} nameOf={nameOf} />}
            </OpenRow>
          )}
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

const OpenRow = styled.li`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid ${colors.pieceActiveTurn};
  background: ${colors.surfaceInputHover};
`;

const OpenBadge = styled.span`
  margin-left: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${colors.pieceActiveTurn};
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
