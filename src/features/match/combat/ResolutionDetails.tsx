import { useState } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { GridKind } from "../../../types/tacticalMap";
import type { EditActionPayload, ResolutionPayload } from "./combatMessages";
import { avoidedVerb, formatSlot, REACTION_KIND_LABELS, RUNG_LABELS } from "./combatText";
import { damageSkillPayload, describeCondition, editableRolls, type EditableRoll } from "./rollEdits";
import RollConditionEditor from "./RollConditionEditor";

/** As perícias que medem o dano de um ataque (o motor só conhece estas duas). */
const DAMAGE_SKILLS = ["Push", "Grab"];

/**
 * O cálculo do turno aberto, que só o mestre recebe (F7). Os botões são três, e só onde a
 * decisão é do mestre: dar a palavra a cada reação esperando (Fase 7 — a ordem em que ele abre
 * muda o resultado), na fuga que está falhando (F14) onde a peça cai, que não é regra do
 * motor, e a edição das rolagens do turno (Fase 8). O painel está completo.
 */
export default function ResolutionDetails({
  resolution,
  nameOf,
  gridKind,
  onChooseFallSlot,
  onOpenReaction,
  onEditAction,
}: {
  resolution: ResolutionPayload;
  nameOf: (id: string) => string;
  gridKind: GridKind;
  /** Põe o mapa em modo de escolha do slot onde cai o alvo cuja fuga está falhando. */
  onChooseFallSlot?: (targetId: string) => void;
  /** Dá a palavra a uma reação esperando (`open_reaction`). */
  onOpenReaction?: (reactionId: string) => void;
  /** Edita uma rolagem ou a perícia do dano (`edit_action`, Fase 8). */
  onEditAction?: (payload: EditActionPayload) => void;
}) {
  const { turnId, action, targets, pendingReactions, errors } = resolution;
  // "Dar a palavra" já clicado: a linha trava até a reação sair de `pendingReactions` (o
  // servidor abriu) ou o cálculo virar de outro turno — um segundo clique nesse meio mandaria
  // outro `open_reaction`. Uma reação que sai e volta (recusa) volta destravada.
  const [sent, setSent] = useState<{ turnId: string; ids: string[] }>({ turnId, ids: [] });
  const stillSent =
    sent.turnId === turnId ? sent.ids.filter((id) => pendingReactions?.some((r) => r.reactionId === id)) : [];
  if (sent.turnId !== turnId || stillSent.length !== sent.ids.length) setSent({ turnId, ids: stillSent });
  const openReaction = (reactionId: string) => {
    if (!onOpenReaction || stillSent.includes(reactionId)) return;
    setSent({ turnId, ids: [...stillSent, reactionId] });
    onOpenReaction(reactionId);
  };
  // Editor aberto: derivado, não efeito — fecha sozinho quando o turno muda ou a rolagem some
  // do cálculo (mesmo padrão do `sent` acima).
  const [editing, setEditing] = useState<{ turnId: string; key: string } | null>(null);
  const rolls = onEditAction ? editableRolls(resolution) : [];
  const editingKey =
    editing && editing.turnId === turnId && rolls.some((r) => r.key === editing.key) ? editing.key : null;
  const rollOf = (key: string) => rolls.find((r) => r.key === key);
  const renderRoll = (roll: EditableRoll, tail?: string) => (
    <>
      <RollRow>
        {tail !== undefined && <Line>{roll.label}{tail}</Line>}
        {roll.current && <Applied>{describeCondition(roll.current)}</Applied>}
        <ActionButton
          type="button"
          aria-label={roll.targetId ? `Editar ${roll.label} de ${nameOf(roll.targetId)}` : `Editar ${roll.label}`}
          onClick={() => setEditing({ turnId, key: roll.key })}
        >
          Editar
        </ActionButton>
      </RollRow>
      {editingKey === roll.key && onEditAction && (
        <RollConditionEditor roll={roll} onSend={onEditAction} onClose={() => setEditing(null)} />
      )}
    </>
  );
  const hitRoll = rollOf("action:hit");
  const damageRoll = rollOf("action:damage");
  const totalOf = (t: ResolutionPayload["targets"][number], field: string) =>
    field === "dodge" ? ` ${t.dodgeTotal}` : field === "defense" ? ` ${t.defenseTotal}`
      : field === "repel" && t.reaction ? ` ${t.reaction.total}` : "";
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
          {hitRoll && renderRoll(hitRoll)}
        </Block>
      )}
      {resolution.damageSkill !== undefined && onEditAction && (
        <Block>
          <Label>Dano</Label>
          <RollRow>
            <Line>medido por</Line>
            {DAMAGE_SKILLS.map((name) => (
              <ActionButton
                key={name}
                type="button"
                aria-pressed={resolution.damageSkill === name}
                onClick={() => resolution.damageSkill !== name && onEditAction(damageSkillPayload(name))}
              >
                {name}
              </ActionButton>
            ))}
            {!DAMAGE_SKILLS.includes(resolution.damageSkill) && (
              <ActionButton type="button" disabled aria-pressed="true">
                {resolution.damageSkill}
              </ActionButton>
            )}
          </RollRow>
          {damageRoll && renderRoll(damageRoll)}
        </Block>
      )}
      {targets.map((t) => (
        <Target key={t.targetId}>
          <strong>{nameOf(t.targetId)}</strong>
          <Line>
            {/* W1: "esquivou"/"fugiu"/"aparou" sozinho — "evitou do golpe" soava estranho. */}
            {t.avoided ? avoidedVerb(t) + (t.attackStopped ? " (o golpe já tinha parado)" : "") : t.defended ? "defendeu" : "acertado"} · esquiva {t.dodgeTotal} · defesa {t.defenseTotal}
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
          {rolls
            .filter((r) => r.targetId === t.targetId)
            .map((r) => (
              <Block key={r.key}>{renderRoll(r, totalOf(t, r.field))}</Block>
            ))}
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
                <ActionButton
                  type="button"
                  disabled={stillSent.includes(r.reactionId)}
                  onClick={() => openReaction(r.reactionId)}
                >
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

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
const RollRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;
const Applied = styled.span`
  color: ${colors.warningText};
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
