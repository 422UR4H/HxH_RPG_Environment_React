import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { ResolutionPayload } from "./combatMessages";
import { REACTION_KIND_LABELS, RUNG_LABELS } from "./combatText";

/**
 * O cálculo do turno aberto, que só o mestre recebe (F7). Nasce só leitura: dar a palavra a
 * uma reação é da Fase 7, editar é da Fase 8 — um botão antes disso não faria nada.
 */
export default function ResolutionDetails({
  resolution,
  nameOf,
}: {
  resolution: ResolutionPayload;
  nameOf: (id: string) => string;
}) {
  const { action, targets, pendingReactions, errors } = resolution;
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
            {t.avoided ? "evitou o golpe" : t.defended ? "defendeu" : "acertado"} · esquiva {t.dodgeTotal} · defesa {t.defenseTotal}
          </Line>
          {t.reaction && (
            <Line>
              reação: {REACTION_KIND_LABELS[t.reaction.kind] ?? t.reaction.kind} {t.reaction.total}
              {t.reaction.rung && ` · ${RUNG_LABELS[t.reaction.rung] ?? t.reaction.rung}`}
              {t.reaction.stopsAttack && " · para o ataque"}
            </Line>
          )}
          <Line>
            dano {t.rawDamage} → {t.projectedDamage} (defesa −{t.defenseApplied})
          </Line>
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
          {pendingReactions.map((r) => (
            <Line key={r.reactionId}>
              {nameOf(r.actorId)} — {REACTION_KIND_LABELS[r.kind] ?? r.kind}
            </Line>
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
