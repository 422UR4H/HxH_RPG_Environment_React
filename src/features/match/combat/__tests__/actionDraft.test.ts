import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildEnqueuePayload, chooseDestination, chooseTarget, clearDraft, draftVerdict, emptyDraft,
  loadDraft, purgeLegacyMatchStorage, removeTarget, resolveDraft, saveDraft, setMoveCategory,
  setWeapon, toggleAttack, toggleMove, toggleTarget,
} from "../actionDraft";
import type { ActionDraft, ReachContext } from "../actionDraft";
import { isSameSlot } from "../../../tactical-map/utils/coords";
import type { GridShape, SlotCoord } from "../../../../types/tacticalMap";

const grid: GridShape = {
  kind: "square", cols: 14, rows: 10, cellSize: 64, skewRatio: 1, rotation: 0,
  color: "#fff", opacity: 1, lineStyle: "solid",
};
const sq = (col: number, row: number): SlotCoord => ({ kind: "square", col, row });

// Gon (ator) em (2,4); Hisoka longe em (8,4); Killua colado em (3,4).
const positions: Record<string, SlotCoord> = { gon: sq(2, 4), hisoka: sq(8, 4), killua: sq(3, 4) };
const ctx: ReachContext = {
  grid,
  actorSlot: positions.gon,
  actorZ: 0,
  slotOf: (id) => positions[id],
  isFree: (s) => !Object.values(positions).some((p) => isSameSlot(p, s)),
};
const resolve = (d: ActionDraft) => resolveDraft(d, ctx, "Dash");

beforeEach(() => localStorage.clear());

describe("rascunho: padrão", () => {
  it("nasce sem movimento e sem ataque — nada a declarar", () => {
    const r = resolve(emptyDraft());
    expect(r.move).toBeUndefined();
    expect(r.attack).toBeUndefined();
    expect(draftVerdict(r)).toEqual({ ready: false, reason: "empty" });
    expect(buildEnqueuePayload(r, "gon", [2, 4, 0])).toBeNull();
  });
});

describe("rascunho: só movimento", () => {
  it("tocar num slot vazio começa um movimento para lá", () => {
    const d = chooseDestination(emptyDraft(), [5, 6, 0]);
    const r = resolve(d);
    expect(r.move).toEqual({ category: "Dash", to: [5, 6, 0], auto: false });
    expect(draftVerdict(r)).toEqual({ ready: true, kind: "move" });
    expect(buildEnqueuePayload(r, "gon", [2, 4, 0])).toEqual({
      actorId: "gon",
      move: { category: "Dash", from: [2, 4, 0], position: [5, 6, 0] },
    });
  });

  it("ligar Mover sem destino trava o envio até tocar num slot", () => {
    const d = toggleMove(emptyDraft(), resolve(emptyDraft()));
    expect(d.moveMode).toBe("manual");
    expect(draftVerdict(resolve(d))).toEqual({ ready: false, reason: "needs_destination" });
  });

  it("desligar Mover volta ao padrão", () => {
    const d = chooseDestination(emptyDraft(), [5, 6, 0]);
    const off = toggleMove(d, resolve(d));
    expect(off).toEqual({ moveMode: "none" });
  });

  it("Shift troca só a categoria", () => {
    const d = setMoveCategory(chooseDestination(emptyDraft(), [5, 6, 0]), "Shift");
    expect(resolve(d).move).toEqual({ category: "Shift", to: [5, 6, 0], auto: false });
  });

  it("sem origem conhecida não manda `from`", () => {
    const r = resolve(chooseDestination(emptyDraft(), [5, 6, 0]));
    expect(buildEnqueuePayload(r, "gon", undefined)).toEqual({
      actorId: "gon",
      move: { category: "Dash", position: [5, 6, 0] },
    });
  });
});

describe("rascunho: só ataque", () => {
  it("tocar em alguém ao alcance é só ataque — sem movimento", () => {
    const r = resolve(chooseTarget(emptyDraft(), "killua"));
    expect(r.move).toBeUndefined();
    expect(r.targetSteps).toBe(1);
    expect(draftVerdict(r)).toEqual({ ready: true, kind: "attack" });
    expect(buildEnqueuePayload(r, "gon", [2, 4, 0])).toEqual({
      actorId: "gon", targetId: ["killua"], attack: {},
    });
  });

  it("a arma escolhida vai no ataque", () => {
    const d = setWeapon(chooseTarget(emptyDraft(), "killua"), "Sword");
    expect(buildEnqueuePayload(resolve(d), "gon", [2, 4, 0])).toEqual({
      actorId: "gon", targetId: ["killua"], attack: { weapon: "Sword" },
    });
  });

  it("ligar Atacar sem alvo trava o envio até tocar em alguém", () => {
    const d = toggleAttack(emptyDraft());
    expect(draftVerdict(resolve(d))).toEqual({ ready: false, reason: "needs_target" });
  });

  it("desligar Atacar tira alvos e arma", () => {
    const d = toggleAttack(setWeapon(chooseTarget(emptyDraft(), "killua"), "Sword"));
    expect(d.attack).toBeUndefined();
  });
});

describe("rascunho: alvo longe vira mover e atacar", () => {
  it("aproxima até o slot ao lado do alvo, do lado do ator", () => {
    const r = resolve(chooseTarget(emptyDraft(), "hisoka"));
    expect(r.targetSteps).toBe(6);
    expect(r.move).toEqual({ category: "Dash", to: [7, 4, 0], auto: true });
    expect(draftVerdict(r)).toEqual({ ready: true, kind: "combined" });
    expect(buildEnqueuePayload(r, "gon", [2, 4, 0])).toEqual({
      actorId: "gon",
      targetId: ["hisoka"],
      attack: {},
      move: { category: "Dash", from: [2, 4, 0], position: [7, 4, 0] },
    });
  });

  it("dá para desmarcar o movimento — ataque à distância", () => {
    const d = chooseTarget(emptyDraft(), "hisoka");
    const ranged = toggleMove(d, resolve(d));
    expect(ranged.moveMode).toBe("stay");
    const r = resolve(ranged);
    expect(r.move).toBeUndefined();
    expect(draftVerdict(r)).toEqual({ ready: true, kind: "attack" });
  });

  it("depois de desmarcar, trocar de alvo longe não religa o movimento", () => {
    const d = chooseTarget(emptyDraft(), "hisoka");
    const ranged = chooseTarget(toggleMove(d, resolve(d)), "killua");
    expect(resolve(chooseTarget(ranged, "hisoka")).move).toBeUndefined();
  });

  it("religar Mover com o alvo longe volta a aproximar", () => {
    const d = chooseTarget(emptyDraft(), "hisoka");
    const ranged = toggleMove(d, resolve(d));
    const again = toggleMove(ranged, resolve(ranged));
    expect(resolve(again).move).toEqual({ category: "Dash", to: [7, 4, 0], auto: true });
  });

  it("um destino tocado na mão vence a aproximação", () => {
    const d = chooseDestination(chooseTarget(emptyDraft(), "hisoka"), [6, 3, 0]);
    expect(resolve(d).move).toEqual({ category: "Dash", to: [6, 3, 0], auto: false });
  });

  it("sem espaço ao lado do alvo: não inventa destino e avisa", () => {
    const crowded: ReachContext = { ...ctx, isFree: () => false };
    const r = resolveDraft(chooseTarget(emptyDraft(), "hisoka"), crowded, "Dash");
    expect(r.move).toBeUndefined();
    expect(r.approachBlocked).toBe(true);
    // Ligar Mover aí pede o slot na mão.
    const manual = toggleMove(chooseTarget(emptyDraft(), "hisoka"), r);
    expect(manual.moveMode).toBe("manual");
  });

  it("o destino da aproximação acompanha o alvo se ele andar antes do envio", () => {
    const d = chooseTarget(emptyDraft(), "hisoka");
    const moved: ReachContext = { ...ctx, slotOf: (id) => (id === "hisoka" ? sq(8, 7) : positions[id]) };
    expect(resolveDraft(d, moved, "Dash").move?.to).toEqual([7, 6, 0]);
  });

  it("ator sem peça no tabuleiro não aproxima (não há de onde partir)", () => {
    const noPiece: ReachContext = { ...ctx, actorSlot: undefined };
    const r = resolveDraft(chooseTarget(emptyDraft(), "hisoka"), noPiece, "Dash");
    expect(r.move).toBeUndefined();
    expect(draftVerdict(r)).toEqual({ ready: true, kind: "attack" });
  });
});

describe("rascunho: vários alvos", () => {
  it("segurar adiciona e remove alvos; a aproximação segue o primeiro", () => {
    let d = chooseTarget(emptyDraft(), "killua");
    d = toggleTarget(d, "hisoka");
    expect(d.attack?.targets).toEqual(["killua", "hisoka"]);
    expect(resolve(d).move).toBeUndefined(); // Killua (primeiro) está ao alcance
    d = toggleTarget(d, "killua");
    expect(d.attack?.targets).toEqual(["hisoka"]);
    expect(resolve(d).move?.auto).toBe(true);
  });

  it("tirar o último alvo desliga o ataque e a aproximação", () => {
    const d = removeTarget(chooseTarget(emptyDraft(), "hisoka"), "hisoka");
    expect(d).toEqual({ moveMode: "none" });
  });

  it("tirar o último alvo mantém um movimento escolhido na mão", () => {
    const d = removeTarget(chooseDestination(chooseTarget(emptyDraft(), "hisoka"), [6, 3, 0]), "hisoka");
    expect(d).toEqual({ moveMode: "manual", to: [6, 3, 0] });
  });
});

describe("rascunho: persistência", () => {
  it("guarda e recupera por partida + ator", () => {
    const d = setWeapon(chooseTarget(emptyDraft(), "hisoka"), "Sword");
    saveDraft("m1", "gon", d);
    expect(loadDraft("m1", "gon")).toEqual(d);
    expect(loadDraft("m1", "outro")).toEqual(emptyDraft());
  });

  it("um rascunho vazio não ocupa espaço", () => {
    saveDraft("m1", "gon", chooseDestination(emptyDraft(), [1, 1, 0]));
    saveDraft("m1", "gon", emptyDraft());
    expect(localStorage.getItem("match-draft:v2:m1:gon")).toBeNull();
  });

  it("limpa", () => {
    saveDraft("m1", "gon", chooseDestination(emptyDraft(), [1, 1, 0]));
    clearDraft("m1", "gon");
    expect(loadDraft("m1", "gon")).toEqual(emptyDraft());
  });

  it("ignora um rascunho corrompido ou de outro formato", () => {
    localStorage.setItem("match-draft:v2:m1:gon", JSON.stringify({ targets: ["x"] }));
    expect(loadDraft("m1", "gon")).toEqual(emptyDraft());
    localStorage.setItem("match-draft:v2:m1:gon", "{nope");
    expect(loadDraft("m1", "gon")).toEqual(emptyDraft());
  });

  it("apaga as chaves do formato anterior", () => {
    localStorage.setItem("match-draft:m1:gon", "{}");
    localStorage.setItem("match-ghosts:m1:u1", "{}");
    localStorage.setItem("match-draft:v2:m1:gon", JSON.stringify(emptyDraft()));
    localStorage.setItem("token", "x");
    purgeLegacyMatchStorage();
    expect(localStorage.getItem("match-draft:m1:gon")).toBeNull();
    expect(localStorage.getItem("match-ghosts:m1:u1")).toBeNull();
    expect(localStorage.getItem("match-draft:v2:m1:gon")).not.toBeNull();
    expect(localStorage.getItem("token")).toBe("x");
  });

  it("sobrevive a um localStorage que lança", () => {
    saveDraft("m1", "gon", chooseDestination(emptyDraft(), [1, 1, 0]));
    const get = vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const set = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadDraft("m1", "gon")).toEqual(emptyDraft());
    expect(() => saveDraft("m1", "gon", chooseTarget(emptyDraft(), "x"))).not.toThrow();
    get.mockRestore();
    set.mockRestore();
  });
});
