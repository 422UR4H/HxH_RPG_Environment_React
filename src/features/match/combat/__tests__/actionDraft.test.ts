import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadDraft, saveDraft, clearDraft, migrateTargets, emptyDraft, loadGhosts, saveGhosts,
} from "../actionDraft";
import type { Ghost } from "../combatReducer";

beforeEach(() => localStorage.clear());

describe("actionDraft", () => {
  it("guarda e recupera por partida + personagem", () => {
    saveDraft("m1", "c1", { targets: ["t1"], weapon: "Sword" });
    expect(loadDraft("m1", "c1")).toEqual({ targets: ["t1"], weapon: "Sword" });
    expect(loadDraft("m1", "c2")).toEqual(emptyDraft());
  });

  it("trocar de alvo MIGRA o resto em vez de resetar", () => {
    const d = { targets: ["t1"], weapon: "Sword", move: { category: "Dash" as const, to: [2, 2, 0] as [number, number, number] } };
    expect(migrateTargets(d, ["t2", "t3"])).toEqual({ ...d, targets: ["t2", "t3"] });
  });

  it("limpa", () => {
    saveDraft("m1", "c1", { targets: ["t1"] });
    clearDraft("m1", "c1");
    expect(loadDraft("m1", "c1")).toEqual(emptyDraft());
  });

  it("sobrevive a um localStorage que lança", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadDraft("m1", "c1")).toEqual(emptyDraft());
    spy.mockRestore();
  });
});

// ─── Fantasmas confirmados sobrevivem ao refresh (R3, spec §8) ─────────────

describe("actionDraft — ghosts", () => {
  const ghost: Ghost = { actorId: "c1", from: [0, 0, 0], to: [1, 1, 0] };

  it("faz round-trip por partida + usuário", () => {
    saveGhosts("m1", "u1", { "action-1": ghost });
    expect(loadGhosts("m1", "u1")).toEqual({ "action-1": ghost });
    expect(loadGhosts("m2", "u1")).toEqual({});
  });

  // M2 (final review): a chave leva o usuário — sem isso duas abas logadas como
  // jogador/mestre na mesma partida veriam o fantasma uma da outra.
  it("não vê o fantasma de outro usuário na mesma partida (M2)", () => {
    saveGhosts("m1", "u1", { "action-1": ghost });
    expect(loadGhosts("m1", "u2")).toEqual({});
  });

  it("não persiste fantasmas não confirmados (chave local-*)", () => {
    saveGhosts("m1", "u1", { "local-1": ghost, "action-2": ghost });
    expect(loadGhosts("m1", "u1")).toEqual({ "action-2": ghost });
  });

  it("remove a chave quando nada de confirmado sobra", () => {
    saveGhosts("m1", "u1", { "action-1": ghost });
    saveGhosts("m1", "u1", { "local-1": ghost });
    expect(localStorage.getItem("match-ghosts:m1:u1")).toBeNull();
    expect(loadGhosts("m1", "u1")).toEqual({});
  });

  it("sobrevive a um localStorage que lança", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadGhosts("m1", "u1")).toEqual({});
    spy.mockRestore();
  });
});
