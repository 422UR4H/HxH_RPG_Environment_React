import { describe, expect, it } from "vitest";
import type { ResolutionPayload, ResolutionTarget } from "../combatMessages";
import {
  clearPayload, conditionPayload, damageSkillPayload, describeCondition, editableRolls, isNeutral,
} from "../rollEdits";

const target = (targetId: string, kind?: string, reactionId = `r-${targetId}`): ResolutionTarget => ({
  targetId, avoided: false, defended: false, dodgeTotal: 11, defenseTotal: 11,
  rawDamage: 10, defenseApplied: 0, projectedDamage: 10,
  reaction: kind ? { kind, total: 12, reactionId, margin: 0, difference: 0, stopsAttack: false } : undefined,
});

const base = (over: Partial<ResolutionPayload> = {}): ResolutionPayload => ({
  turnId: "t1", isSettled: false, targets: [], damageSkill: "Push", ...over,
});

const fields = (res: ResolutionPayload) => editableRolls(res).map((r) => `${r.actionId ?? "action"}:${r.field}`);

describe("editableRolls", () => {
  it("a ação com ataque tem acerto (com viés) e dano (sem viés), sem actionId", () => {
    const rolls = editableRolls(base());
    expect(rolls.map((r) => [r.field, r.actionId, r.allowsBias])).toEqual([
      ["hit", undefined, true],
      ["damage", undefined, false],
    ]);
  });

  it("sem damageSkill a ação não tem ataque: nada de acerto nem dano", () => {
    expect(fields(base({ damageSkill: undefined }))).toEqual([]);
  });

  it("cada tipo de reação aberta ganha as rolagens da tabela do contrato", () => {
    const res = base({
      damageSkill: undefined,
      targets: [
        target("a", "dodge"), target("b", "closedDodge"), target("c", "escape"),
        target("d", "escapeGuard"), target("e", "closedEscape"), target("f", "repel"), target("g", "nothing"),
      ],
    });
    expect(fields(res)).toEqual([
      "r-a:dodge", "r-a:defense",
      "r-b:dodge", "r-b:defense",
      "r-c:dodge", "r-c:moveSpeed",
      "r-d:dodge", "r-d:defense", "r-d:moveSpeed",
      "r-e:dodge", "r-e:moveSpeed",
      "r-f:repel",
    ]);
  });

  it("viés só onde a leitura é rolada", () => {
    const res = base({ damageSkill: undefined, targets: [target("d", "escapeGuard"), target("e", "closedEscape")] });
    const bias = Object.fromEntries(editableRolls(res).map((r) => [r.key, r.allowsBias]));
    expect(bias).toEqual({
      "r-d:dodge": true, "r-d:defense": false, "r-d:moveSpeed": true,
      "r-e:dodge": true, "r-e:moveSpeed": false,
    });
  });

  it("nas fechadas a esquiva se chama Reflexo", () => {
    const res = base({ damageSkill: undefined, targets: [target("a", "dodge"), target("b", "closedDodge")] });
    const labels = editableRolls(res).filter((r) => r.field === "dodge").map((r) => r.label);
    expect(labels).toEqual(["Esquiva", "Reflexo"]);
  });

  it("alvo sem reação aberta e reação pendente não ganham linha", () => {
    const res = base({
      damageSkill: undefined,
      targets: [target("a")],
      pendingReactions: [{ reactionId: "p1", actorId: "a", kind: "dodge" }],
    });
    expect(fields(res)).toEqual([]);
  });

  it("casa a condição em vigor — reação pelo actionId, ação pela entrada que não é de reação", () => {
    const res = base({
      targets: [target("a", "dodge")],
      pendingReactions: [{ reactionId: "p1", actorId: "z", kind: "dodge" }],
      conditions: [
        { actionId: "act-1", field: "hit", bias: 1, modifier: -2, description: "escuridao" },
        { actionId: "r-a", field: "dodge", bias: 0, modifier: 3 },
        { actionId: "p1", field: "dodge", bias: -1, modifier: 0 },
        { actionId: "act-1", skillName: "Evasion", bias: 1, modifier: 0 },
      ],
    });
    const byKey = Object.fromEntries(editableRolls(res).map((r) => [r.key, r.current]));
    expect(byKey["action:hit"]).toEqual({ bias: 1, modifier: -2, description: "escuridao" });
    expect(byKey["action:damage"]).toBeUndefined();
    expect(byKey["r-a:dodge"]).toEqual({ bias: 0, modifier: 3, description: undefined });
    expect(byKey["r-a:defense"]).toBeUndefined();
  });
});

describe("payloads", () => {
  const [hit, damage] = editableRolls(base());
  const reactionRoll = editableRolls(base({ damageSkill: undefined, targets: [target("a", "escapeGuard")] }))
    .find((r) => r.field === "defense")!;

  it("acerto: sem actionId, com viés, ajuste e motivo", () => {
    expect(conditionPayload(hit, { bias: 1, modifier: -2, description: " escuridao " })).toEqual({
      conditions: [{ field: "hit", bias: 1, modifier: -2, description: "escuridao" }],
    });
  });

  it("dano e defesa padrão nunca levam viés", () => {
    expect(conditionPayload(damage, { bias: 1, modifier: 4 })).toEqual({
      conditions: [{ field: "damage", modifier: 4 }],
    });
    expect(conditionPayload(reactionRoll, { bias: -1, modifier: 2 })).toEqual({
      actionId: "r-a", conditions: [{ field: "defense", modifier: 2 }],
    });
  });

  it("tudo neutro vira a entrada zerada", () => {
    expect(conditionPayload(hit, { bias: 0, modifier: 0, description: "  " })).toEqual(clearPayload(hit));
  });

  it("desfazer é a entrada zerada, com o actionId da reação", () => {
    expect(clearPayload(hit)).toEqual({ conditions: [{ field: "hit" }] });
    expect(clearPayload(reactionRoll)).toEqual({ actionId: "r-a", conditions: [{ field: "defense" }] });
  });

  it("perícia do dano", () => {
    expect(damageSkillPayload("Grab")).toEqual({ damageSkill: "Grab" });
  });
});

describe("describeCondition / isNeutral", () => {
  it("resume viés, ajuste e motivo", () => {
    expect(describeCondition({ bias: 1, modifier: -2, description: "escuridao" })).toBe("vantagem · −2 · escuridao");
    expect(describeCondition({ bias: -1, modifier: 3 })).toBe("desvantagem · +3");
    expect(describeCondition({ bias: 0, modifier: 0, description: "nota" })).toBe("nota");
  });
  it("neutro = sem viés, sem ajuste, sem motivo", () => {
    expect(isNeutral({ bias: 0, modifier: 0 })).toBe(true);
    expect(isNeutral({ bias: 0, modifier: 0, description: " " })).toBe(true);
    expect(isNeutral({ bias: 0, modifier: 1 })).toBe(false);
  });
});
