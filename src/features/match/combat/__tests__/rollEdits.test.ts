import { describe, expect, it } from "vitest";
import type { ResolutionPayload, ResolutionTarget } from "../combatMessages";
import type { QueuedAction } from "../combatMessages";
import {
  clearPayload, conditionPayload, damageSkillPayload, describeCondition, editableRolls, isNeutral, passiveBiasNote,
  queuedRolls, systemBiasNote,
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
  it("a ação com ataque tem acerto (rolado) e dano (sem viés), sem actionId", () => {
    const rolls = editableRolls(base());
    expect(rolls.map((r) => [r.field, r.actionId, r.bias])).toEqual([
      ["hit", undefined, "rolled"],
      ["damage", undefined, "none"],
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
        target("h", "default"),
      ],
    });
    expect(fields(res)).toEqual([
      "r-a:dodge", "r-a:defense",
      "r-b:dodge", "r-b:defense",
      "r-c:dodge", "r-c:moveSpeed",
      "r-d:dodge", "r-d:defense", "r-d:moveSpeed",
      "r-e:dodge", "r-e:moveSpeed",
      "r-f:repel",
      "r-h:dodge", "r-h:defense",
    ]);
  });

  it("cada leitura diz se é rolada ou passiva — a reação padrão é toda passiva", () => {
    const res = base({
      damageSkill: undefined,
      targets: [target("d", "escapeGuard"), target("e", "closedEscape"), target("h", "default")],
    });
    const bias = Object.fromEntries(editableRolls(res).map((r) => [r.key, r.bias]));
    expect(bias).toEqual({
      "r-d:dodge": "rolled", "r-d:defense": "passive", "r-d:moveSpeed": "rolled",
      "r-e:dodge": "rolled", "r-e:moveSpeed": "passive",
      "r-h:dodge": "passive", "r-h:defense": "passive",
    });
  });

  it("uma reação não aberta também ganha linha: ela entra no cálculo", () => {
    const t = target("a", "dodge");
    t.reaction!.opened = false;
    expect(fields(base({ damageSkill: undefined, targets: [t] }))).toEqual(["r-a:dodge", "r-a:defense"]);
  });

  it("o viés do sistema marca só o movimento da fuga, não a esquiva", () => {
    const t = target("c", "escape");
    t.reaction!.systemBias = -1;
    const by = Object.fromEntries(editableRolls(base({ damageSkill: undefined, targets: [t] })).map((r) => [r.field, r.systemBias]));
    expect(by).toEqual({ dodge: undefined, moveSpeed: -1 });
  });

  it("o viés do sistema marca também o movimento passivo do closedEscape", () => {
    const t = target("e", "closedEscape");
    t.reaction!.systemBias = -1;
    const move = editableRolls(base({ damageSkill: undefined, targets: [t] })).find((r) => r.field === "moveSpeed")!;
    expect([move.bias, move.systemBias]).toEqual(["passive", -1]);
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

  it("o dano nunca leva viés; a defesa padrão (passiva) leva", () => {
    expect(conditionPayload(damage, { bias: 1, modifier: 4 })).toEqual({
      conditions: [{ field: "damage", modifier: 4 }],
    });
    expect(conditionPayload(reactionRoll, { bias: -1, modifier: 2 })).toEqual({
      actionId: "r-a", conditions: [{ field: "defense", bias: -1, modifier: 2 }],
    });
  });

  it("tudo neutro vira a entrada zerada", () => {
    expect(conditionPayload(hit, { bias: 0, modifier: 0, description: "  " })).toEqual(clearPayload(hit));
  });

  it("desfazer é a entrada zerada, com o actionId da reação", () => {
    expect(clearPayload(hit)).toEqual({ conditions: [{ field: "hit" }] });
    expect(clearPayload(reactionRoll)).toEqual({ actionId: "r-a", conditions: [{ field: "defense" }] });
  });

  it("perícia do dano: a do turno sem id, a da fila com o id da ação", () => {
    expect(damageSkillPayload("Grab")).toEqual({ damageSkill: "Grab" });
    expect(damageSkillPayload("Grab", "q1")).toEqual({ actionId: "q1", damageSkill: "Grab" });
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

describe("queuedRolls", () => {
  const queued = (over: Partial<QueuedAction> = {}): QueuedAction => ({
    actionId: "q1", actorId: "a", bars: ["action"],
    action: { uuid: "q1", actorId: "a", reactionKind: "", attack: { weapon: "Sword" } },
    damageSkill: "Push",
    ...over,
  });

  it("com ataque: acerto, dano e a velocidade de ação — todas com o id da ação", () => {
    const rolls = queuedRolls(queued(), "Race");
    expect(rolls.map((r) => [r.key, r.actionId, r.bias])).toEqual([
      ["q1:hit", "q1", "rolled"],
      ["q1:damage", "q1", "none"],
      ["q1:speed", "q1", "rolled"],
    ]);
  });

  it("fora do Race a velocidade é passiva; o Shift também, o Dash rola", () => {
    const shift = queuedRolls(queued({ action: { uuid: "q1", actorId: "a", reactionKind: "", move: { category: "Shift" } }, damageSkill: undefined }), "Free");
    expect(shift.map((r) => [r.field, r.bias])).toEqual([["speed", "passive"], ["moveSpeed", "passive"]]);
    const dash = queuedRolls(queued({ action: { uuid: "q1", actorId: "a", reactionKind: "", move: { category: "Dash" } }, damageSkill: undefined }), "Race");
    expect(dash.map((r) => [r.field, r.bias])).toEqual([["speed", "rolled"], ["moveSpeed", "rolled"]]);
  });

  it("casa a condição em vigor pelo id da ação e pelo campo", () => {
    const rolls = queuedRolls(queued({
      conditions: [
        { actionId: "q1", field: "speed", bias: 0, modifier: 5 },
        { actionId: "outra", field: "hit", bias: 1, modifier: 0 },
      ],
    }), "Race");
    const byField = Object.fromEntries(rolls.map((r) => [r.field, r.current]));
    expect(byField.speed).toEqual({ bias: 0, modifier: 5, description: undefined });
    expect(byField.hit).toBeUndefined();
  });

  it("o payload de uma rolagem da fila leva o id da ação", () => {
    const [hit] = queuedRolls(queued(), "Race");
    expect(conditionPayload(hit, { bias: 1, modifier: 0 })).toEqual({ actionId: "q1", conditions: [{ field: "hit", bias: 1 }] });
  });
});

describe("passiveBiasNote", () => {
  it("nomeia o dado base que o servidor mandou", () => {
    expect(passiveBiasNote(11)).toBe("Este teste usa o dado base (11). Vantagem/Desvantagem passa a rolar contra o dado base.");
  });
  it("sem o valor, não inventa número", () => {
    expect(passiveBiasNote()).toBe("Este teste usa o dado base. Vantagem/Desvantagem passa a rolar contra o dado base.");
  });
});

describe("systemBiasNote", () => {
  const passive = { key: "k", field: "moveSpeed" as const, label: "Movimento", bias: "passive" as const, systemBias: -1 };
  it("numa passiva, diz que o teste já rola contra o dado base", () => {
    expect(systemBiasNote(passive, 11)).toMatch(/^Este teste rola contra o dado base \(11\): o sistema pôs Desvantagem/);
    expect(systemBiasNote(passive, 11)).toMatch(/Vantagem volta ao dado base/);
  });
  it("numa rolada, que o sistema já escolhe o conjunto", () => {
    expect(systemBiasNote({ ...passive, bias: "rolled" })).toMatch(/^O sistema já rola esta com Desvantagem/);
  });
});

describe("queuedRolls — viés do sistema", () => {
  it("a marca de quem cancelou pesa nas velocidades, não no acerto", () => {
    const rolls = queuedRolls({
      actionId: "q1", actorId: "a", bars: ["action"], damageSkill: "Push",
      action: { uuid: "q1", actorId: "a", reactionKind: "", systemBias: -1, attack: {}, move: { category: "Shift" } },
    }, "Race");
    expect(Object.fromEntries(rolls.map((r) => [r.field, r.systemBias]))).toEqual({
      hit: undefined, damage: undefined, speed: -1, moveSpeed: -1,
    });
  });
});
