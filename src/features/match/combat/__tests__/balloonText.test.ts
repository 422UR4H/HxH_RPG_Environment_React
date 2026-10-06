import { describe, it, expect } from "vitest";
import { actionMechanicsText, actorResultText, reactionMechanicsText, targetResultText } from "../balloonText";
import { formatSlot } from "../combatText";
import type { ResolutionPayload, ResolutionTarget } from "../combatMessages";
import type { HistoryAction } from "../../../../types/matchHistory";

const names: Record<string, string> = { a: "A", b: "B" };
const nameOf = (id: string) => names[id] ?? "?";
const base: HistoryAction = { uuid: "x", actorId: "h", reactionKind: "nothing" };

const target = (over: Partial<ResolutionTarget>): ResolutionTarget => ({
  targetId: "a", avoided: false, defended: false, dodgeTotal: 0, defenseTotal: 0,
  rawDamage: 0, defenseApplied: 0, projectedDamage: 0, ...over,
});
const resolution = (targets: ResolutionTarget[]): ResolutionPayload => ({ turnId: "t", isSettled: true, targets });

describe("actionMechanicsText", () => {
  it("ataque em dois alvos com arma", () => {
    const a = { ...base, targetId: ["a", "b"], attack: { weapon: "Espada" } };
    expect(actionMechanicsText(a, nameOf, "square")).toBe("Ataca A, B · Espada");
  });
  it("arma em CamelCase vira palavras", () => {
    const a = { ...base, targetId: ["a"], attack: { weapon: "LongSword" } };
    expect(actionMechanicsText(a, nameOf, "square")).toBe("Ataca A · Long Sword");
  });
  it("só movimento, com e sem destino (fog)", () => {
    const to: [number, number, number] = [2, 3, 0];
    expect(actionMechanicsText({ ...base, move: { category: "Dash", position: to } }, nameOf, "square"))
      .toBe(`Dash → ${formatSlot(to, "square")}`);
    expect(actionMechanicsText({ ...base, move: { category: "Dash" } }, nameOf, "square")).toBe("Dash");
  });
  it("interação, capitalizada", () => {
    expect(actionMechanicsText({ ...base, interact: { kind: "open" } }, nameOf, "square")).toBe("Abrir");
  });
});

describe("reactionMechanicsText", () => {
  it("fuga fechada com casa", () => {
    const to: [number, number, number] = [4, 1, 0];
    const r = { ...base, reactionKind: "closedEscape", move: { category: "Dash", position: to } };
    expect(reactionMechanicsText(r, "square")).toBe(`Fuga fechada → ${formatSlot(to, "square")}`);
  });
  it("repelir sem arma visível, com arma, e nada", () => {
    expect(reactionMechanicsText({ ...base, reactionKind: "repel" }, "square")).toBe("Repelir");
    expect(reactionMechanicsText({ ...base, reactionKind: "repel", repel: { weapon: "Espada" } }, "square"))
      .toBe("Repelir · Espada");
    expect(reactionMechanicsText(base, "square")).toBe("Nada");
  });
});

describe("targetResultText", () => {
  it("evitou: o verbo vem da reação", () => {
    const t = target({ avoided: true, reaction: { kind: "escape", total: 1, reactionId: "r", margin: 0, difference: 0, stopsAttack: true } });
    expect(targetResultText(t)).toEqual({ text: "fugiu", tone: "success" });
    expect(targetResultText(target({ avoided: true }))).toEqual({ text: "esquivou", tone: "success" });
  });
  it("defendeu, acertado e sem dano", () => {
    expect(targetResultText(target({ defended: true, projectedDamage: 3 }))).toEqual({ text: "defendeu · −3", tone: "failure" });
    expect(targetResultText(target({ projectedDamage: 7 }))).toEqual({ text: "−7", tone: "failure" });
    expect(targetResultText(target({ projectedDamage: 0 }))).toEqual({ text: "sem dano", tone: "success" });
  });
});

describe("actorResultText", () => {
  it("conta os acertados", () => {
    const r = resolution([target({ projectedDamage: 2 }), target({ defended: true, projectedDamage: 1 }), target({ avoided: true })]);
    expect(actorResultText(r)).toEqual({ text: "acertou 2 de 3", tone: "success" });
  });
  it("ninguém acertado", () => {
    expect(actorResultText(resolution([target({ avoided: true })]))).toEqual({ text: "errou", tone: "failure" });
  });
});
