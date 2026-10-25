import { useState } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { GridKind } from "../../../types/tacticalMap";
import type { Bar, BarsPayload, EditActionPayload, QueuedAction, QueuedActionDetail, ResolutionPayload, RoundMode } from "./combatMessages";
import { BAR_ICONS, BAR_LABELS, costLabel, formatSlot, weaponLabel } from "./combatText";
import { orderQueue } from "./queueOrder";
import ResolutionDetails from "./ResolutionDetails";
import { DamageSkillPicker, RollEditLine } from "./RollEditLine";
import { damageSkillPayload, describeCondition, queuedRolls } from "./rollEdits";

/**
 * Os ajustes do mestre numa ação ainda na fila: as rolagens que `queuedRolls` oferece, cada uma
 * com o editor inline (um aberto por vez), e a perícia do dano. Sem estado otimista: o que está em
 * vigor volta no `action_queued` que o servidor reenvia depois de cada edição. Mexer na velocidade
 * muda o lugar da ação na fila.
 */
function QueuedActionEdits({
  queued,
  mode,
  passiveValue,
  onEditAction,
}: {
  queued: QueuedAction;
  mode?: RoundMode | "";
  passiveValue?: number;
  onEditAction: (payload: EditActionPayload) => void;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const rolls = queuedRolls(queued, mode ?? "");
  return (
    <Edits aria-label="Ajustes do mestre">
      {rolls.map((roll) => (
        <RollEditLine
          key={roll.key}
          roll={roll}
          tail=""
          ariaLabel={`Editar ${roll.label}`}
          open={editingKey === roll.key}
          passiveValue={passiveValue}
          onOpen={() => setEditingKey(roll.key)}
          onClose={() => setEditingKey(null)}
          onSend={onEditAction}
        />
      ))}
      {queued.damageSkill !== undefined && (
        <DamageSkillPicker
          current={queued.damageSkill}
          onPick={(skill) => onEditAction(damageSkillPayload(skill, queued.actionId))}
        />
      )}
      <EditsNote>Mexer na velocidade muda o lugar na fila. O jogador não vê estes ajustes.</EditsNote>
    </Edits>
  );
}

/**
 * O detalhe de uma ação (T13/F1) — tudo que a declaração carrega, no nível Full que só o
 * mestre recebe. Sem declaração (servidor antigo), quem chama nem monta este componente.
 * `orderKey` é a chave da entrada da ordem que `orderQueue` casou com ESTA ação (a em
 * andamento já saiu da ordem: não tem). `bars` falta no card em andamento depois de uma
 * reconexão (`openQueued` não volta): aí não há o que ela cobra, e a linha some.
 */
function QueueRowDetails({
  bars,
  detail,
  orderKey,
  gridKind,
  nameOf,
}: {
  bars?: Bar[];
  detail: QueuedActionDetail;
  orderKey?: number;
  gridKind: GridKind;
  nameOf: (characterId: string) => string;
}) {
  return (
    <Details aria-label="Detalhes da ação">
      {!!detail.targetId?.length && <DetailLine>Alvos: {detail.targetId.map(nameOf).join(", ")}</DetailLine>}
      {detail.attack?.weapon && <DetailLine>Arma: {weaponLabel(detail.attack.weapon)}</DetailLine>}
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
      {orderKey !== undefined && <DetailLine>Ordem geral: chave {orderKey}</DetailLine>}
      {!!bars?.length && <DetailLine>Custo: {costLabel(bars)}</DetailLine>}
    </Details>
  );
}

/**
 * A fila secreta — só o mestre recebe. Na ordem em que as ações vão abrir (`orderQueue`, a
 * partir de `bars_updated.order`); o que não cabe na rodada vai ao fim, marcado. Mostra
 * também, no topo, a ação em andamento (`open`) — o turno aberto tirou essa linha da fila de
 * verdade, mas o mestre ainda precisa vê-la, com a declaração (I1) e o cálculo que só ele
 * recebe (F7). Cada linha da fila mostra sempre a declaração inteira (T13/F1) quando
 * `action.action` (B1) vem; sem ele (servidor antigo), a linha fica como sempre foi.
 */
export default function QueuePanel({
  queue,
  open,
  order,
  mode,
  gridKind,
  nameOf,
  onPull,
  onChooseFallSlot,
  onOpenReaction,
  onEditAction,
  passiveValue,
}: {
  queue: QueuedAction[];
  /** A ação do turno aberto — já não está em `queue`, mas continua na tela, marcada. */
  open?: { actorId: string; bars?: Bar[]; action?: QueuedActionDetail; resolution: ResolutionPayload | null };
  /** `bars_updated.order`; undefined antes do primeiro `bars_updated` (ver `orderQueue`). */
  order?: BarsPayload["order"];
  /** O regime: no Race, ordem vazia com fila cheia quer dizer que ninguém paga. */
  mode?: RoundMode | "";
  gridKind: GridKind;
  nameOf: (characterId: string) => string;
  onPull: (actionId: string) => void;
  /** F14: repassado ao cálculo do card em andamento (a fuga que falhou). */
  onChooseFallSlot?: (targetId: string) => void;
  /** Fase 7: repassado ao cálculo do card em andamento (dar a palavra a uma reação). */
  onOpenReaction?: (reactionId: string) => void;
  /** Fase 8: repassado ao cálculo do card em andamento — e aos ajustes da fila. */
  onEditAction?: (payload: EditActionPayload) => void;
  /** `match_full_state.passiveValue`: o valor base dos dados, para o aviso do viés numa passiva. */
  passiveValue?: number;
}) {
  // A linha da fila com os ajustes abertos (uma por vez). Derivado: some quando a ação sai da fila.
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const adjustingId = adjusting && queue.some((q) => q.actionId === adjusting) ? adjusting : null;
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
                  bars={open.bars}
                  detail={open.action}
                  gridKind={gridKind}
                  nameOf={nameOf}
                />
              )}
              {open.resolution && (
                <ResolutionDetails
                  resolution={open.resolution}
                  nameOf={nameOf}
                  onChooseFallSlot={onChooseFallSlot}
                  onOpenReaction={onOpenReaction}
                  onEditAction={onEditAction}
                  passiveValue={passiveValue}
                />
              )}
            </OpenRow>
          )}
          {orderQueue(queue, order, mode).map(({ action, inOrder, key }) => {
            const detail = action.action;
            return (
              <Row key={action.actionId} data-testid="queue-row">
                <RowHeader>
                  <Info>
                    <Name>
                      {nameOf(action.actorId)}{" "}
                      <Bars title={action.bars.map((b) => BAR_LABELS[b]).join(" + ")}>
                        {action.bars.map((b) => BAR_ICONS[b]).join("")}
                      </Bars>
                      {!inOrder && <NextRoundBadge title="Não cabe mais nesta rodada; abre na próxima">próxima rodada</NextRoundBadge>}
                    </Name>
                  </Info>
                  {onEditAction && (
                    <PullButton
                      type="button"
                      aria-expanded={adjustingId === action.actionId}
                      onClick={() => setAdjusting(adjustingId === action.actionId ? null : action.actionId)}
                      title="Ajustar as rolagens desta ação antes de ela agir"
                    >
                      Ajustar
                    </PullButton>
                  )}
                  <PullButton type="button" onClick={() => onPull(action.actionId)} title="Abrir esta ação agora, fora da ordem">
                    Abrir agora
                  </PullButton>
                </RowHeader>
                {detail && (
                  <QueueRowDetails
                    bars={action.bars}
                    detail={detail}
                    orderKey={key}
                    gridKind={gridKind}
                    nameOf={nameOf}
                  />
                )}
                {!!action.conditions?.length && (
                  <AppliedLine>
                    Ajustada:{" "}
                    {action.conditions
                      .map((c) => `${FIELD_LABELS[c.field ?? ""] ?? c.skillName ?? c.field} ${describeCondition(c)}`)
                      .join(" · ")}
                  </AppliedLine>
                )}
                {onEditAction && adjustingId === action.actionId && (
                  <QueuedActionEdits queued={action} mode={mode} passiveValue={passiveValue} onEditAction={onEditAction} />
                )}
              </Row>
            );
          })}
        </List>
      )}
    </Panel>
  );
}

/** O nome de cada rolagem no resumo "Ajustada:" de uma linha da fila. */
const FIELD_LABELS: Record<string, string> = {
  hit: "acerto", damage: "dano", speed: "velocidade de ação", moveSpeed: "velocidade de movimento",
};

const Edits = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 6px;
  border-top: 1px solid ${colors.surfaceInput};
  font-size: 12px;
`;

const EditsNote = styled.span`
  font-size: 12px;
  color: ${colors.textPlaceholderStrong};
`;

const AppliedLine = styled.span`
  font-size: 12px;
  color: ${colors.feedbackWarning};
`;

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
  border: 1px solid ${colors.mapActiveTurn};
  background: ${colors.surfaceInputHover};
`;

const OpenBadge = styled.span`
  margin-left: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${colors.mapActiveTurn};
`;

const NextRoundBadge = styled(OpenBadge)`
  color: ${colors.textPlaceholderStrong};
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
