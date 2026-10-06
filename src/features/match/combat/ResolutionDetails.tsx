import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { GridKind } from "../../../types/tacticalMap";
import type { ResolutionPayload } from "./combatMessages";
import { avoidedVerb, formatSlot, REACTION_KIND_LABELS, RUNG_LABELS } from "./combatText";

/**
 * O cálculo do turno aberto, que só o mestre recebe (F7). É quase só leitura — editar é da
 * Fase 8. Os botões são dois, e só onde a decisão é do mestre: dar a palavra a cada reação
 * esperando (Fase 7 — a ordem em que ele abre muda o resultado) e, na fuga que está falhando
 * (F14), onde a peça cai, que não é regra do motor.
 */
export default function ResolutionDetails({
  resolution,
  nameOf,
  gridKind,
  onChooseFallSlot,
  onOpenReaction,
}: {
  resolution: ResolutionPayload;
  nameOf: (id: string) => string;
  gridKind: GridKind;
  /** Põe o mapa em modo de escolha do slot onde cai o alvo cuja fuga está falhando. */
  onChooseFallSlot?: (targetId: string) => void;
  /** Dá a palavra a uma reação esperando (`open_reaction`). */
  onOpenReaction?: (reactionId: string) => void;
}) {
  const { action, targets, pendingReactions, errors } = resolution;
  // `targets[]` vem na ordem da cadeia (contrato): a posição de um alvo entre os que já têm
  // reação aberta É a ordem em que o mestre deu a palavra — e, por vir do servidor, sobrevive
  // à reconexão.
  const openedOrder = new Map(
    targets.filter((t) => t.reaction).map((t, i) => [t.targetId, i + 1] as const),
  );
  return (
    <Wrap aria-label="Cálculo do turno">
      {action && (
        <Block>
          <Label>Acerto</Label>
          <span>
            {action.skillName} {action.skillValue} · dados {action.diceRolled.join(" + ") || "—"} · total{" "}
            <strong>{action.total}</strong>
            {action.margin !== undefined && ` · margem ${action.margin}`}
            {action.isCritical && " · crítico"}
            {action.isCriticalFailure && " · falha crítica"}
          </span>
        </Block>
      )}
      {targets.map((t) => (
        <Target key={t.targetId}>
          <strong>{nameOf(t.targetId)}</strong>
          <Line>
            {/* W1: "esquivou"/"fugiu"/"aparou" sozinho — "evitou do golpe" soava estranho. */}
            {t.avoided ? avoidedVerb(t.reaction) : t.defended ? "defendeu" : "acertado"} · esquiva {t.dodgeTotal} · defesa {t.defenseTotal}
          </Line>
          {t.reaction && (
            <Line>
              reação: {REACTION_KIND_LABELS[t.reaction.kind] ?? t.reaction.kind} {t.reaction.total}
              {t.reaction.rung && ` · ${RUNG_LABELS[t.reaction.rung] ?? t.reaction.rung}`}
              {t.reaction.stopsAttack && " · para o ataque"}
              {` · aberta em ${openedOrder.get(t.targetId)}º`}
            </Line>
          )}
          <Line>
            dano {t.rawDamage} → {t.projectedDamage} (defesa −{t.defenseApplied})
          </Line>
          {t.escape && !t.escape.escaped && (
            <FallBox>
              <strong>Escape falhou — posição final a critério do mestre</strong>
              <Line>
                {t.escape.landing
                  ? `Cai em ${formatSlot(t.escape.landing, gridKind)}.`
                  : "Sem escolha, fica onde está."}
              </Line>
              {onChooseFallSlot && (
                <ActionButton type="button" onClick={() => onChooseFallSlot(t.targetId)}>
                  Escolher onde cai
                </ActionButton>
              )}
            </FallBox>
          )}
          {t.payouts?.map((p, i) => (
            <Muted key={i} title={p.reason}>
              {p.amount !== 0 && `${p.amount > 0 ? "+" : ""}${p.amount} `}
              {p.bias !== 0 && (p.bias > 0 ? "vantagem " : "desvantagem ")}
              em {p.applies === "dodge" ? "esquiva" : "velocidade de ação"}
            </Muted>
          ))}
        </Target>
      ))}
      {!!pendingReactions?.length && (
        <Block>
          <Label>Reações esperando</Label>
          {onOpenReaction && <Muted>A ordem em que você abre muda o resultado.</Muted>}
          {pendingReactions.map((r) => (
            <PendingRow key={r.reactionId}>
              <Line>
                {nameOf(r.actorId)} — {REACTION_KIND_LABELS[r.kind] ?? r.kind}
              </Line>
              {onOpenReaction && (
                <ActionButton type="button" onClick={() => onOpenReaction(r.reactionId)}>
                  Dar a palavra
                </ActionButton>
              )}
            </PendingRow>
          ))}
        </Block>
      )}
      {!!errors?.length && (
        <Warn>
          {errors.map((e, i) => (
            <span key={i} title={e.detail}>
              O cálculo de {nameOf(e.subject)} está incompleto ({e.kind}).
            </span>
          ))}
        </Warn>
      )}
    </Wrap>
  );
}

const Wrap = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 6px;
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 12px;
`;
const Block = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;
const Label = styled.span`
  font-size: 11px;
  color: ${colors.textPlaceholderStrong};
  text-transform: uppercase;
`;
const Target = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  border-radius: 6px;
  background: ${colors.surfaceInput};
`;
const Line = styled.span``;
const FallBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  margin-top: 4px;
  padding: 6px 8px;
  border: 1px solid ${colors.warningBorder};
  border-radius: 6px;
  background: ${colors.warningBgDark};
  color: ${colors.warningText};
`;
const PendingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;
const ActionButton = styled.button`
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
const Muted = styled.span`
  color: ${colors.textPlaceholderStrong};
  font-size: 12px;
`;
const Warn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: ${colors.warningText};
  font-size: 12px;
`;
