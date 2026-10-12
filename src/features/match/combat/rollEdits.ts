import type {
  ConditionEntry, ConditionField, EditActionPayload, QueuedAction, ResolutionPayload, RollCondition, RoundMode,
} from "./combatMessages";

/**
 * Como a leitura usa os dados, que é o que decide o viés:
 * - `rolled`: rolada — o viés escolhe entre os dois conjuntos que já caíram;
 * - `passive`: usa o valor base dos dados (11 no 2D10). O viés do mestre a torna rolada: a
 *   Vantagem fica com o melhor entre o dado e o valor base, a Desvantagem com o pior (o dado cai
 *   na primeira vez e nunca mais — servidor);
 * - `none`: não aceita viés — o dano (o servidor recusa).
 */
export type BiasMode = "rolled" | "passive" | "none";

/**
 * Uma rolagem que o mestre pode editar: no painel do turno aberto (Fase 8) ou numa ação ainda
 * na fila. `actionId` ausente = a ação própria do turno (o `edit_action` também aceita a ação sem
 * id); na fila ele é sempre o da ação.
 */
export type EditableRoll = {
  key: string;
  actionId?: string;
  field: ConditionField;
  label: string;
  bias: BiasMode;
  current?: RollCondition;
  /** O alvo cuja reação é dona da rolagem; ausente na ação. */
  targetId?: string;
  /**
   * O viés que o próprio sistema já pôs nesta rolagem (-1: a reação trocou a ação da fila).
   * Só nas velocidades roladas — o movimento de uma fuga; a esquiva, o aparo e a defesa não
   * pioram, e numa leitura passiva o viés do sistema não vale. Soma com o do mestre: Vantagem do
   * mestre anula.
   */
  systemBias?: number;
};

/** O mestre pode pôr viés nesta rolagem (rolada ou passiva). */
export const allowsBias = (roll: EditableRoll) => roll.bias !== "none";

type RollSpec = { field: ConditionField; label: string; bias: BiasMode };

// A tabela "o que cada rolagem muda com o turno aberto" do contrato, por tipo de reação —
// aberta ou não: as duas entram no cálculo. Fica de fora o que não muda nada (speed, feint,
// perícias) e a Evasion das fechadas (documento mestre §8: a corrente de testes vai
// redesenhá-la). Nas fechadas, `dodge` edita só o Reflexo — a esquiva lida é o pior entre Reflexo
// e Evasion —, daí o rótulo. O `nothing` não tem rolagem nenhuma.
const REACTION_ROLLS: Record<string, RollSpec[]> = {
  default: [
    { field: "dodge", label: "Esquiva", bias: "passive" },
    { field: "defense", label: "Defesa padrão", bias: "passive" },
  ],
  dodge: [
    { field: "dodge", label: "Esquiva", bias: "rolled" },
    { field: "defense", label: "Defesa padrão", bias: "passive" },
  ],
  closedDodge: [
    { field: "dodge", label: "Reflexo", bias: "rolled" },
    { field: "defense", label: "Defesa padrão", bias: "passive" },
  ],
  escape: [
    { field: "dodge", label: "Esquiva", bias: "rolled" },
    { field: "moveSpeed", label: "Movimento", bias: "rolled" },
  ],
  escapeGuard: [
    { field: "dodge", label: "Esquiva", bias: "rolled" },
    { field: "defense", label: "Defesa padrão", bias: "passive" },
    { field: "moveSpeed", label: "Movimento", bias: "rolled" },
  ],
  closedEscape: [
    { field: "dodge", label: "Reflexo", bias: "rolled" },
    { field: "moveSpeed", label: "Movimento", bias: "passive" },
  ],
  repel: [{ field: "repel", label: "Aparo", bias: "rolled" }],
};

const ACTION_ROLLS: RollSpec[] = [
  { field: "hit", label: "Acerto", bias: "rolled" },
  { field: "damage", label: "Dano", bias: "none" },
];

const toCondition = (c: { bias: number; modifier: number; description?: string }): RollCondition => ({
  bias: c.bias, modifier: c.modifier, description: c.description,
});

/** O que o mestre pode editar agora, na ordem em que o painel mostra. */
export function editableRolls(res: ResolutionPayload): EditableRoll[] {
  const conditions = res.conditions ?? [];
  // A ação do turno vem em `conditions` com o próprio id, que o painel não tem à mão: é a
  // entrada cujo id não é de reação nenhuma do turno (aberta ou pendente).
  const reactionIds = new Set([
    ...res.targets.flatMap((t) => (t.reaction ? [t.reaction.reactionId] : [])),
    ...(res.pendingReactions ?? []).map((p) => p.reactionId),
  ]);
  const currentOf = (actionId: string | undefined, field: ConditionField) => {
    const hit = conditions.find((c) =>
      c.field === field && (actionId ? c.actionId === actionId : !reactionIds.has(c.actionId)));
    return hit ? toCondition(hit) : undefined;
  };

  const out: EditableRoll[] = [];
  // `damageSkill` só vem quando a ação tem ataque — sem ataque, não há acerto nem dano.
  if (res.damageSkill !== undefined) {
    for (const spec of ACTION_ROLLS) {
      out.push({ ...spec, key: `action:${spec.field}`, current: currentOf(undefined, spec.field) });
    }
  }
  for (const t of res.targets) {
    if (!t.reaction) continue;
    const reactionId = t.reaction.reactionId;
    const systemBias = t.reaction.systemBias ?? 0;
    for (const spec of REACTION_ROLLS[t.reaction.kind] ?? []) {
      out.push({
        ...spec, key: `${reactionId}:${spec.field}`, actionId: reactionId, targetId: t.targetId,
        current: currentOf(reactionId, spec.field),
        ...(spec.field === "moveSpeed" && spec.bias === "rolled" && systemBias !== 0 && { systemBias }),
      });
    }
  }
  return out;
}

/**
 * O que o mestre pode editar numa ação ainda na fila. Acerto e dano (com ataque), a velocidade
 * de ação e a de movimento (com movimento): na fila as duas velocidades mudam o lugar da ação —
 * o servidor a reordena. Fora do Race a velocidade de ação é passiva; o Shift também. Alvos e
 * perícias não se editam na fila (o servidor recusa: chegariam ao dono antes do fechamento).
 */
export function queuedRolls(q: QueuedAction, mode: RoundMode | ""): EditableRoll[] {
  const conditions = q.conditions ?? [];
  const roll = (spec: RollSpec): EditableRoll => ({
    ...spec, key: `${q.actionId}:${spec.field}`, actionId: q.actionId,
    current: conditionOf(conditions, q.actionId, spec.field),
  });
  const out: EditableRoll[] = [];
  if (q.damageSkill !== undefined || q.action?.attack) out.push(...ACTION_ROLLS.map(roll));
  out.push(roll({ field: "speed", label: "Velocidade de ação", bias: mode === "Race" ? "rolled" : "passive" }));
  if (q.action?.move) {
    out.push(roll({
      field: "moveSpeed", label: "Velocidade de movimento", bias: q.action.move.category === "Shift" ? "passive" : "rolled",
    }));
  }
  return out;
}

function conditionOf(conditions: ConditionEntry[], actionId: string, field: ConditionField): RollCondition | undefined {
  const hit = conditions.find((c) => c.actionId === actionId && c.field === field);
  return hit ? toCondition(hit) : undefined;
}

const trimmed = (s?: string) => s?.trim() ?? "";

/** Sem viés, sem modificador e sem motivo — o mesmo que "sem condição" para o servidor. */
export function isNeutral(c: RollCondition): boolean {
  return c.bias === 0 && c.modifier === 0 && trimmed(c.description) === "";
}

const withAction = (roll: EditableRoll, body: EditActionPayload): EditActionPayload =>
  roll.actionId ? { actionId: roll.actionId, ...body } : body;

/** Desfazer: a entrada zerada daquela rolagem. O servidor volta a "sem condição" e apaga a captura. */
export function clearPayload(roll: EditableRoll): EditActionPayload {
  return withAction(roll, { conditions: [{ field: roll.field }] });
}

/** O `edit_action` de uma rolagem. Chaves zeradas ficam de fora; tudo neutro é o desfazer. */
export function conditionPayload(roll: EditableRoll, draft: RollCondition): EditActionPayload {
  const bias = allowsBias(roll) ? draft.bias : 0;
  const description = trimmed(draft.description);
  if (isNeutral({ bias, modifier: draft.modifier, description })) return clearPayload(roll);
  return withAction(roll, {
    conditions: [{
      field: roll.field,
      ...(bias !== 0 && { bias }),
      ...(draft.modifier !== 0 && { modifier: draft.modifier }),
      ...(description !== "" && { description }),
    }],
  });
}

/** A perícia do dano; `actionId` só para a ação na fila (a do turno vai sem id). */
export function damageSkillPayload(skill: string, actionId?: string): EditActionPayload {
  return actionId ? { actionId, damageSkill: skill } : { damageSkill: skill };
}

/** U+2212, o mesmo sinal de menos do resto do painel. */
const signed = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);

/** O resumo curto de uma condição em vigor: "vantagem · −2 · escuridão". */
export function describeCondition(c: RollCondition): string {
  const parts: string[] = [];
  if (c.bias > 0) parts.push("vantagem");
  if (c.bias < 0) parts.push("desvantagem");
  if (c.modifier !== 0) parts.push(signed(c.modifier));
  if (trimmed(c.description)) parts.push(trimmed(c.description));
  return parts.join(" · ");
}

/** "desvantagem do sistema" / "vantagem do sistema"; vazio sem viés do sistema. */
export function systemBiasText(bias: number | undefined): string {
  if (!bias) return "";
  return bias < 0 ? "desvantagem do sistema" : "vantagem do sistema";
}

/**
 * O aviso do cartão de viés numa leitura passiva: o que muda quando o mestre escolhe Vantagem ou
 * Desvantagem.
 */
export const PASSIVE_BIAS_NOTE =
  "Este teste não rola: usa o valor base dos dados. Com Vantagem ou Desvantagem, ele passa a ser rolado — a Vantagem fica com o melhor entre o dado e o valor base; a Desvantagem, com o pior.";

/** Por que o sistema pôs o viés: hoje só a troca (a reação consumiu uma ação da fila, ou cancelou antes). */
export const SYSTEM_BIAS_REASON =
  "A reação trocou o que estava na fila (consumiu a ação, ou cancelou antes nesta rodada): velocidade e movimento rolam com Desvantagem.";
