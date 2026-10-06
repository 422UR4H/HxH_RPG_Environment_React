import { describe, it, expect } from "vitest";
import type { HistoryAction } from "../../../../types/matchHistory";
import {
  buildReactionPayload, moveCategoryOf, needsDestination, reactableTargets, reactionKindOf,
  reactionStatusOf, supportsEvasion,
} from "../reactionModel";

describe("reactionKindOf", () => {
  it.each([
    ["nothing", false, "nothing"], ["dodge", false, "dodge"], ["dodge", true, "closedDodge"],
    ["escape", false, "escape"], ["escape", true, "closedEscape"], ["escapeGuard", false, "escapeGuard"],
    ["escapeGuard", true, "escapeGuard"], ["repel", true, "repel"],
  ] as const)("%s + evasão %s = %s", (b, ev, kind) => expect(reactionKindOf(b, ev)).toBe(kind));
  it("só Esquivar e Escapar aceitam Evasão", () => {
    expect(["nothing", "dodge", "escape", "escapeGuard", "repel"].filter((b) => supportsEvasion(b as never))).toEqual(["dodge", "escape"]);
  });
});

describe("categoria e destino", () => {
  it("é fixa por tipo (matriz §11.4)", () => {
    expect(moveCategoryOf("escape")).toBe("Dash");
    expect(moveCategoryOf("escapeGuard")).toBe("Dash");
    expect(moveCategoryOf("closedEscape")).toBe("Shift");
    expect(moveCategoryOf("dodge")).toBeUndefined();
    expect(["escape", "escapeGuard", "closedEscape"].every((k) => needsDestination(k as never))).toBe(true);
    expect(needsDestination("closedDodge")).toBe(false);
  });
});

describe("buildReactionPayload — o payload mínimo do contrato", () => {
  const base = { actorId: "c2", reactToId: "a1" };
  it.each([
    ["nothing", {}],
    ["dodge", { dodge: {} }],
    ["closedDodge", { dodge: {} }],
    ["repel", { repel: {} }],
  ] as const)("%s", (kind, extra) => {
    expect(buildReactionPayload({ ...base, kind })).toEqual({ ...base, reactionKind: kind, ...extra });
  });
  it("repel leva a arma quando há", () => {
    expect(buildReactionPayload({ ...base, kind: "repel", weapon: "Sword" })).toEqual({ ...base, reactionKind: "repel", repel: { weapon: "Sword" } });
  });
  it.each([["escape", "Dash"], ["escapeGuard", "Dash"], ["closedEscape", "Shift"]] as const)("%s move com %s", (kind, category) => {
    expect(buildReactionPayload({ ...base, kind, position: [4, 2, 0] })).toEqual({
      ...base, reactionKind: kind, dodge: {}, move: { category, position: [4, 2, 0] },
    });
  });
  it("fuga sem casa é bug de quem chama", () => {
    expect(() => buildReactionPayload({ ...base, kind: "escape" })).toThrow();
  });
});

describe("quem reage", () => {
  // O teste só exercita `targetId`; o resto da ação é preenchido por cast.
  const action = { uuid: "a1", actorId: "c1", reactionKind: "", targetId: ["c1", "c2", "w9", "c3"] } as unknown as HistoryAction;
  const openTurn = { turnId: "t1", actorId: "c1", actionId: "a1", action };
  it("são os meus personagens que estão em targetId, na ordem dele", () => {
    expect(reactableTargets(openTurn, new Set(["c2", "c3"]))).toEqual(["c2", "c3"]);
  });
  it("Review Focus 5: o atacante que se alveja também reage", () => {
    expect(reactableTargets(openTurn, new Set(["c1"]))).toEqual(["c1"]);
  });
  it("sem turno aberto, ou sem a declaração (servidor antigo), ninguém", () => {
    expect(reactableTargets(null, new Set(["c2"]))).toEqual([]);
    expect(reactableTargets({ turnId: "t1", actorId: "c1", actionId: "a1" }, new Set(["c2"]))).toEqual([]);
  });
  it("o estado de cada alvo vem da minha reação do MESMO turno", () => {
    const own = [{ actorId: "c2", turnId: "t1", kind: "dodge" as const, status: "attached" as const, consumedActionIds: [], reactionId: "r1" }];
    expect(reactionStatusOf("c2", own, "t1")).toBe("attached");
    expect(reactionStatusOf("c3", own, "t1")).toBe("available");
    expect(reactionStatusOf("c2", own, "t2")).toBe("available");
  });
});
