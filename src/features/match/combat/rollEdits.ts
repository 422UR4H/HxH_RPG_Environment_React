import type {
  ConditionField, EditActionPayload, ResolutionPayload, RollCondition,
} from "./combatMessages";

/**
 * Uma rolagem que o mestre pode editar no painel do turno aberto (Fase 8). `actionId` ausente
 * = a ação própria do turno (o `edit_action` também aceita a ação sem id). `allowsBias` é
 * falso onde a leitura não tem dado para o viés escolher: o dano (o servidor recusa), a defesa
 * padrão e o movimento do `closedEscape` (passivas).
 */
export type EditableRoll = {
  key: string;
  actionId?: string;
  field: ConditionField;
  label: string;
  allowsBias: boolean;
  current?: RollCondition;
  /** O alvo cuja reação é dona da rolagem; ausente na ação. */
  targetId?: string;
};

type RollSpec = { field: ConditionField; label: string; allowsBias: boolean };

// A tabela "o que cada rolagem muda com o turno aberto" do contrato, por tipo de reação
// ABERTA. Fica de fora o que não muda nada (speed, feint, perícias) e a Evasion das fechadas
// (documento mestre §8: a corrente de testes vai redesenhá-la). Nas fechadas, `dodge` edita só
// o Reflexo — a esquiva lida é o pior entre Reflexo e Evasion —, daí o rótulo.
const REACTION_ROLLS: Record<string, RollSpec[]> = {
  dodge: [
    { field: "dodge", label: "Esquiva", allowsBias: true },
    { field: "defense", label: "Defesa padrão", allowsBias: false },
  ],
  closedDodge: [
    { field: "dodge", label: "Reflexo", allowsBias: true },
    { field: "defense", label: "Defesa padrão", allowsBias: false },
  ],
  escape: [
    { field: "dodge", label: "Esquiva", allowsBias: true },
    { field: "moveSpeed", label: "Movimento", allowsBias: true },
  ],
  escapeGuard: [
    { field: "dodge", label: "Esquiva", allowsBias: true },
    { field: "defense", label: "Defesa padrão", allowsBias: false },
    { field: "moveSpeed", label: "Movimento", allowsBias: true },
  ],
  closedEscape: [
    { field: "dodge", label: "Reflexo", allowsBias: true },
    { field: "moveSpeed", label: "Movimento", allowsBias: false },
  ],
  repel: [{ field: "repel", label: "Aparo", allowsBias: true }],
};

const ACTION_ROLLS: RollSpec[] = [
  { field: "hit", label: "Acerto", allowsBias: true },
  { field: "damage", label: "Dano", allowsBias: false },
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
    for (const spec of REACTION_ROLLS[t.reaction.kind] ?? []) {
      out.push({
        ...spec, key: `${reactionId}:${spec.field}`, actionId: reactionId, targetId: t.targetId,
        current: currentOf(reactionId, spec.field),
      });
    }
  }
  return out;
}

const trimmed = (s?: string) => s?.trim() ?? "";

/** Sem viés, sem ajuste e sem motivo — o mesmo que "sem condição" para o servidor. */
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
  const bias = roll.allowsBias ? draft.bias : 0;
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

export function damageSkillPayload(skill: string): EditActionPayload {
  return { damageSkill: skill };
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
