import { useState } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { GridKind } from "../../../types/tacticalMap";
import type { Bar, BarsPayload, QueuedAction, QueuedActionDetail, ResolutionPayload } from "./combatMessages";
import { BAR_ICONS, BAR_LABELS, formatSlot, humanWeapon } from "./combatText";
import ResolutionDetails from "./ResolutionDetails";

const sameBars = (a: readonly Bar[], b: readonly Bar[]) => [...a].sort().join(",") === [...b].sort().join(",");

/**
 * A primeira entrada da ordem geral com o mesmo ator E as mesmas barras desta ação (T13) —
 * `bars_updated.order` não carrega identidade de ação, então é assim que o card acha "a
 * chave desta ação" sem o servidor precisar mandar mais nada.
 */
function orderKeyFor(action: Pick<QueuedAction, "actorId" | "bars">, order: BarsPayload["order"]): number | undefined {
  return order.find((o) => o.actorId === action.actorId && sameBars(o.bars, action.bars))?.key;
}

/**
 * O detalhe de uma ação (T13/F1) — tudo que a declaração carrega, no nível Full que só o
 * mestre recebe. Sem declaração (servidor antigo), quem chama nem monta este componente.
 * `bars` falta no card em andamento depois de uma reconexão (`openQueued` não volta): aí
 * não há como achar a chave nem dizer o que cobra, e as duas linhas somem.
 */
function QueueRowDetails({
  id,
  actorId,
  bars,
  detail,
  order,
  gridKind,
  nameOf,
}: {
  id?: string;
  actorId: string;
  bars?: Bar[];
  detail: QueuedActionDetail;
  order: BarsPayload["order"];
  gridKind: GridKind;
  nameOf: (characterId: string) => string;
}) {
  const key = bars ? orderKeyFor({ actorId, bars }, order) : undefined;
  return (
    <Details id={id} aria-label="Detalhes da ação">
      {!!detail.targetId?.length && <DetailLine>Alvos: {detail.targetId.map(nameOf).join(", ")}</DetailLine>}
      {detail.attack?.weapon && <DetailLine>Arma: {humanWeapon(detail.attack.weapon)}</DetailLine>}
      {detail.move && (
        <DetailLine>
          Movimento: {detail.move.category}
          {detail.move.position && ` → ${formatSlot(detail.move.position, gridKind)}`}
        </DetailLine>
      )}
      {!!detail.skills?.length && <DetailLine>Perícias: {detail.skills.map((s) => s.skillName).join(", ")}</DetailLine>}
      {detail.speed?.rollCheck && (
        <DetailLine>
          Velocidade de ação: {detail.speed.rollCheck.skillName}
          {detail.speed.rollCheck.attempts?.primary && ` ${detail.speed.rollCheck.attempts.primary.join(" + ")}`}
          {detail.speed.rollCheck.result !== undefined && ` = ${detail.speed.rollCheck.result}`}
        </DetailLine>
      )}
      {detail.move?.speed && (
        <DetailLine>
          Velocidade de movimento: {detail.move.speed.skillName}
          {detail.move.speed.attempts?.primary && ` ${detail.move.speed.attempts.primary.join(" + ")}`}
          {detail.move.speed.result !== undefined && ` = ${detail.move.speed.result}`}
        </DetailLine>
      )}
      {key !== undefined && <DetailLine>Ordem geral: chave {key}</DetailLine>}
      {!!bars?.length && <DetailLine>Cobra: {bars.map((b) => BAR_LABELS[b]).join(" + ")}</DetailLine>}
    </Details>
  );
}

/**
 * A fila secreta — só o mestre recebe. Em ordem de chegada (a ordem de EXECUÇÃO é a barra
 * geral). Mostra também, no topo, a ação em andamento (`open`) — o turno aberto tirou essa
 * linha da fila de verdade, mas o mestre ainda precisa vê-la, com a declaração (I1) e o
 * cálculo que só ele recebe (F7). Cada linha da fila é expansível (T13/F1): com `action.action` (B1), "Detalhes"
 * mostra a declaração inteira; sem ele (servidor antigo), a linha fica como sempre foi.
 */
export default function QueuePanel({
  queue,
  open,
  order,
  gridKind,
  nameOf,
  onPull,
  onChooseFallSlot,
  onOpenReaction,
}: {
  queue: QueuedAction[];
  /** A ação do turno aberto — já não está em `queue`, mas continua na tela, marcada. */
  open?: { actorId: string; bars?: Bar[]; action?: QueuedActionDetail; resolution: ResolutionPayload | null };
  /** `bars_updated.order` — para achar a chave desta ação na ordem geral (ver `orderKeyFor`). */
  order: BarsPayload["order"];
  gridKind: GridKind;
  nameOf: (characterId: string) => string;
  onPull: (actionId: string) => void;
  /** F14: repassado ao cálculo do card em andamento (a fuga que falhou). */
  onChooseFallSlot?: (targetId: string) => void;
  /** Fase 7: repassado ao cálculo do card em andamento (dar a palavra a uma reação). */
  onOpenReaction?: (reactionId: string) => void;
}) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const toggle = (actionId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(actionId)) next.delete(actionId);
      else next.add(actionId);
      return next;
    });

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
              {open.action && (
                <QueueRowDetails
                  actorId={open.actorId}
                  bars={open.bars}
                  detail={open.action}
                  order={order}
                  gridKind={gridKind}
                  nameOf={nameOf}
                />
              )}
              {open.resolution && (
                <ResolutionDetails
                  resolution={open.resolution}
                  nameOf={nameOf}
                  gridKind={gridKind}
                  onChooseFallSlot={onChooseFallSlot}
                  onOpenReaction={onOpenReaction}
                />
              )}
            </OpenRow>
          )}
          {queue.map((action) => {
            const detail = action.action;
            const isExpanded = expanded.has(action.actionId);
            const detailsId = `queue-details-${action.actionId}`;
            return (
              <Row key={action.actionId} data-testid="queue-row">
                <RowHeader>
                  <Info>
                    <Name>
                      {nameOf(action.actorId)}{" "}
                      <Bars title={action.bars.map((b) => BAR_LABELS[b]).join(" + ")}>
                        {action.bars.map((b) => BAR_ICONS[b]).join("")}
                      </Bars>
                    </Name>
                  </Info>
                  {detail && (
                    <DetailsButton
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={detailsId}
                      onClick={() => toggle(action.actionId)}
                    >
                      Detalhes
                    </DetailsButton>
                  )}
                  <PullButton type="button" onClick={() => onPull(action.actionId)} title="Abrir esta ação agora, fora da ordem">
                    Abrir agora
                  </PullButton>
                </RowHeader>
                {isExpanded && detail && (
                  <QueueRowDetails
                    id={detailsId}
                    actorId={action.actorId}
                    bars={action.bars}
                    detail={detail}
                    order={order}
                    gridKind={gridKind}
                    nameOf={nameOf}
                  />
                )}
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
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: 6px;
  background: ${colors.surfaceInputHover};
`;

const RowHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
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

const DetailsButton = styled.button`
  flex-shrink: 0;
  font-family: ${fonts.sans};
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  border: 1px solid ${colors.textPlaceholderStrong};
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
  color: ${colors.textPrimary};
`;

const Details = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 4px;
  border-top: 1px solid ${colors.surfaceInput};
  font-size: 12px;
  color: ${colors.textMuted};
`;

const DetailLine = styled.span``;
