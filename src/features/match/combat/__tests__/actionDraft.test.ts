import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  buildEnqueuePayload, chooseDestination, chooseTarget, chooseWallTarget, clearDraft, defaultWeaponOf, draftFromDeclared,
  draftVerdict, emptyDraft, loadDraft, purgeLegacyMatchStorage, removeTarget, resolveDraft, saveDraft, setActKind,
  setMoveCategory, setWeapon, toggleAct, toggleMove, toggleTarget, toggleWallTarget,
} from "../actionDraft";
import type { ActionDraft, ReachContext } from "../actionDraft";
import { useActionComposerState } from "../useActionComposerState";
import { isSameSlot } from "../../../tactical-map/utils/coords";
import { isPathClear, wallContactSlots } from "../../../tactical-map/utils/wallReach";
import type { GridShape, SlotCoord, WallSegment } from "../../../../types/tacticalMap";

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
  targetOf: (id) => (positions[id] ? { kind: "character", slot: positions[id] } : undefined),
  isFree: (s) => !Object.values(positions).some((p) => isSameSlot(p, s)),
};
const resolve = (d: ActionDraft) => resolveDraft(d, ctx, "Dash");

beforeEach(() => localStorage.clear());

describe("rascunho: padrão", () => {
  it("nasce sem movimento e sem ataque — nada a declarar", () => {
    const r = resolve(emptyDraft());
    expect(r.move).toBeUndefined();
    expect(r.act).toBeUndefined();
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
    expect(draftVerdict(r)).toEqual({ ready: true, kind: "act" });
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
    const d = toggleAct(emptyDraft());
    expect(draftVerdict(resolve(d))).toEqual({ ready: false, reason: "needs_target" });
  });

  it("desligar Atacar tira alvos e arma", () => {
    const d = toggleAct(setWeapon(chooseTarget(emptyDraft(), "killua"), "Sword"));
    expect(d.act).toBeUndefined();
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
    expect(draftVerdict(r)).toEqual({ ready: true, kind: "act" });
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
    const moved: ReachContext = {
      ...ctx,
      targetOf: (id) => ({ kind: "character", slot: id === "hisoka" ? sq(8, 7) : positions[id] }),
    };
    expect(resolveDraft(d, moved, "Dash").move?.to).toEqual([7, 6, 0]);
  });

  it("ator sem peça no tabuleiro não aproxima (não há de onde partir)", () => {
    const noPiece: ReachContext = { ...ctx, actorSlot: undefined };
    const r = resolveDraft(chooseTarget(emptyDraft(), "hisoka"), noPiece, "Dash");
    expect(r.move).toBeUndefined();
    expect(draftVerdict(r)).toEqual({ ready: true, kind: "act" });
  });
});

describe("rascunho: vários alvos", () => {
  it("segurar adiciona e remove alvos; a aproximação segue o primeiro", () => {
    let d = chooseTarget(emptyDraft(), "killua");
    d = toggleTarget(d, "hisoka");
    expect(d.act?.targets).toEqual(["killua", "hisoka"]);
    expect(resolve(d).move).toBeUndefined(); // Killua (primeiro) está ao alcance
    d = toggleTarget(d, "killua");
    expect(d.act?.targets).toEqual(["hisoka"]);
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

describe("rascunho: parede como alvo", () => {
  // Porta na aresta vertical entre (7,4) e (8,4): x = 8 × 64, y de 4 × 64 a 5 × 64.
  const door: WallSegment = {
    id: "door", p1: [512, 256], p2: [512, 320], wallType: "door", material: "wood", move: true,
    sense: "full", direction: "both", open: false, locked: false, hp: 10, maxHp: 10, resistance: 0,
    destroyed: false,
  } as WallSegment;
  const ctxWith = (w: WallSegment): ReachContext => ({
    ...ctx,
    targetOf: (id) =>
      id === w.id
        ? { kind: "wall", wall: w, reach: wallContactSlots(w, grid) }
        : positions[id] ? { kind: "character", slot: positions[id] } : undefined,
    isPathClear: (a, b) => isPathClear(a, b, [w], grid),
  });
  const wallCtx = ctxWith(door);

  it("tocar numa porta longe: aproxima do lado do ator e o verbo é abrir", () => {
    const d = chooseWallTarget(emptyDraft(), door);
    expect(d.act).toEqual({ targets: ["door"], kind: "open" });
    const r = resolveDraft(d, wallCtx, "Dash");
    expect(r.targetSteps).toBe(6);
    expect(r.move).toEqual({ category: "Dash", to: [7, 4, 0], auto: true });
    expect(r.act).toEqual({ targets: ["door"], kind: "open", verbs: ["open", "attack"] });
    expect(draftVerdict(r)).toEqual({ ready: true, kind: "combined" });
    expect(buildEnqueuePayload(r, "gon", [2, 4, 0])).toEqual({
      actorId: "gon",
      targetId: ["door"],
      interact: { kind: "open" },
      move: { category: "Dash", from: [2, 4, 0], position: [7, 4, 0] },
    });
  });

  it("encostado na porta: só a interação, sem movimento", () => {
    const near: ReachContext = { ...wallCtx, actorSlot: sq(7, 4) };
    const r = resolveDraft(chooseWallTarget(emptyDraft(), door), near, "Dash");
    expect(r.targetSteps).toBe(1);
    expect(r.move).toBeUndefined();
    expect(buildEnqueuePayload(r, "gon", [7, 4, 0])).toEqual({
      actorId: "gon", targetId: ["door"], interact: { kind: "open" },
    });
  });

  it("um ataque em curso continua ataque ao tocar numa parede que aceita ataque — com a arma", () => {
    const d = chooseWallTarget(setWeapon(chooseTarget(emptyDraft(), "hisoka"), "Sword"), door);
    expect(d.act).toEqual({ targets: ["door"], weapon: "Sword" });
    const r = resolveDraft(d, wallCtx, "Dash", "Katana");
    expect(r.act?.kind).toBe("attack");
    expect(buildEnqueuePayload(r, "gon", [2, 4, 0])?.attack).toEqual({ weapon: "Sword" });
  });

  it("trocar o verbo para atacar usa a arma padrão; voltar a abrir não manda arma", () => {
    const attack = setActKind(chooseWallTarget(emptyDraft(), door), "attack");
    expect(resolveDraft(attack, wallCtx, "Dash", "Katana").act).toMatchObject({ kind: "attack", weapon: "Katana" });
    const open = setActKind(attack, "open");
    const r = resolveDraft(open, wallCtx, "Dash", "Katana");
    expect(r.act).toEqual({ targets: ["door"], kind: "open", verbs: ["open", "attack"] });
    expect(buildEnqueuePayload(r, "gon", [2, 4, 0])).not.toHaveProperty("attack");
  });

  it("a porta mudou por baixo (alguém abriu): o verbo segue o estado", () => {
    const d = chooseWallTarget(emptyDraft(), door);
    const opened = ctxWith({ ...door, open: true });
    expect(resolveDraft(d, opened, "Dash").act?.kind).toBe("close");
  });

  it("porta trancada: arrombar", () => {
    const d = chooseWallTarget(emptyDraft(), { ...door, locked: true });
    expect(d.act?.kind).toBe("lockpick");
  });

  it("parede destruída sai dos alvos; sem verbo nenhum, o toque não muda nada", () => {
    const d = chooseWallTarget(emptyDraft(), door);
    const r = resolveDraft(d, ctxWith({ ...door, destroyed: true }), "Dash");
    expect(r.act?.targets).toEqual([]);
    expect(draftVerdict(r)).toEqual({ ready: false, reason: "needs_target" });
    expect(chooseWallTarget(emptyDraft(), { ...door, destroyed: true })).toEqual(emptyDraft());
  });

  it("tocar num personagem depois da porta volta a ser ataque", () => {
    const d = chooseTarget(chooseWallTarget(emptyDraft(), door), "killua");
    expect(d.act).toEqual({ targets: ["killua"] });
    expect(resolveDraft(d, wallCtx, "Dash").act?.kind).toBe("attack");
  });

  it("segurar num personagem com a porta como alvo junta os dois num ataque", () => {
    const d = toggleTarget(chooseWallTarget(emptyDraft(), door), "killua");
    expect(d.act).toEqual({ targets: ["door", "killua"] });
    const r = resolveDraft(d, wallCtx, "Dash");
    expect(r.act?.kind).toBe("attack");
    expect(r.act?.verbs).toBeUndefined();
  });

  it("abrir sem Mover, de longe: não declara (o servidor recusaria por alcance)", () => {
    const d = toggleMove(chooseWallTarget(emptyDraft(), door), resolveDraft(chooseWallTarget(emptyDraft(), door), wallCtx, "Dash"));
    expect(d.moveMode).toBe("stay");
    const r = resolveDraft(d, wallCtx, "Dash");
    expect(r.outOfReach).toBe(true);
    expect(draftVerdict(r)).toEqual({ ready: false, reason: "out_of_reach" });
  });

  it("abrir indo a um destino que não encosta na porta: não declara", () => {
    const d = chooseDestination(chooseWallTarget(emptyDraft(), door), [5, 4, 0]);
    expect(draftVerdict(resolveDraft(d, wallCtx, "Dash"))).toEqual({ ready: false, reason: "out_of_reach" });
    const touching = chooseDestination(chooseWallTarget(emptyDraft(), door), [8, 4, 0]);
    expect(draftVerdict(resolveDraft(touching, wallCtx, "Dash"))).toEqual({ ready: true, kind: "combined" });
  });

  it("atacar a porta de longe, sem Mover, declara (ataque não exige alcance)", () => {
    const attack = setActKind(chooseWallTarget(emptyDraft(), door), "attack");
    const stay = toggleMove(attack, resolveDraft(attack, wallCtx, "Dash"));
    const r = resolveDraft(stay, wallCtx, "Dash");
    expect(r.outOfReach).toBeUndefined();
    expect(draftVerdict(r)).toEqual({ ready: true, kind: "act" });
  });

  it("segurar numa parede junta ela a um personagem (golpe em área) — ataque", () => {
    const d = toggleWallTarget(chooseTarget(emptyDraft(), "killua"), door);
    expect(d.act).toEqual({ targets: ["killua", "door"] });
    const r = resolveDraft(d, wallCtx, "Dash");
    expect(r.act).toMatchObject({ targets: ["killua", "door"], kind: "attack" });
    expect(buildEnqueuePayload(r, "gon", [2, 4, 0])).toMatchObject({ targetId: ["killua", "door"], attack: {} });
  });

  it("segurar de novo na parede a tira dos alvos; sozinha, segurar é como tocar", () => {
    const both = toggleWallTarget(chooseTarget(emptyDraft(), "killua"), door);
    expect(toggleWallTarget(both, door).act).toEqual({ targets: ["killua"] });
    expect(toggleWallTarget(emptyDraft(), door).act).toEqual({ targets: ["door"], kind: "open" });
  });

  it("parede indestrutível entra num golpe em área (só não recebe dano); terreno não", () => {
    const d = chooseTarget(emptyDraft(), "killua");
    const solid = { ...door, maxHp: 0 } as WallSegment;
    expect(toggleWallTarget(d, solid).act).toEqual({ targets: ["killua", "door"] });
    const terrain = { ...door, wallType: "terrain" } as WallSegment;
    expect(toggleWallTarget(d, terrain)).toBe(d);
  });

  it("com vários alvos, a parede que deixou de aceitar ataque (terreno) sai e a ação segue ataque", () => {
    const d = toggleWallTarget(chooseTarget(emptyDraft(), "killua"), door);
    const r = resolveDraft(d, ctxWith({ ...door, wallType: "terrain" } as WallSegment), "Dash");
    expect(r.act).toMatchObject({ targets: ["killua"], kind: "attack" });
  });

  it("a aproximação nunca atravessa a própria parede", () => {
    // Do lado de lá, com o slot de cá ocupado: não há para onde ir.
    const crowded: ReachContext = { ...wallCtx, isFree: (slot) => !isSameSlot(slot, sq(7, 4)) };
    const r = resolveDraft(chooseWallTarget(emptyDraft(), door), crowded, "Dash");
    expect(r.move).toBeUndefined();
    expect(r.approachBlocked).toBe(true);
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
    expect(localStorage.getItem("match-draft:v3:m1:gon")).toBeNull();
  });

  it("limpa", () => {
    saveDraft("m1", "gon", chooseDestination(emptyDraft(), [1, 1, 0]));
    clearDraft("m1", "gon");
    expect(loadDraft("m1", "gon")).toEqual(emptyDraft());
  });

  it("ignora um rascunho corrompido ou de outro formato", () => {
    localStorage.setItem("match-draft:v3:m1:gon", JSON.stringify({ targets: ["x"] }));
    expect(loadDraft("m1", "gon")).toEqual(emptyDraft());
    localStorage.setItem("match-draft:v3:m1:gon", "{nope");
    expect(loadDraft("m1", "gon")).toEqual(emptyDraft());
  });

  it("apaga as chaves dos formatos anteriores (sem versão e v2, de quando a ação era `attack`)", () => {
    localStorage.setItem("match-draft:m1:gon", "{}");
    localStorage.setItem("match-ghosts:m1:u1", "{}");
    localStorage.setItem("match-draft:v2:m1:gon", JSON.stringify({ moveMode: "none", attack: { targets: ["x"] } }));
    localStorage.setItem("match-draft:v3:m1:gon", JSON.stringify(emptyDraft()));
    localStorage.setItem("token", "x");
    purgeLegacyMatchStorage();
    expect(localStorage.getItem("match-draft:m1:gon")).toBeNull();
    expect(localStorage.getItem("match-ghosts:m1:u1")).toBeNull();
    expect(localStorage.getItem("match-draft:v2:m1:gon")).toBeNull();
    expect(localStorage.getItem("match-draft:v3:m1:gon")).not.toBeNull();
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

describe("rascunho de volta de uma declarada perdida (F10)", () => {
  const move = { category: "Shift" as const, from: [1, 1, 0] as [number, number, number], to: [3, 1, 0] as [number, number, number] };
  const attack = { targets: ["hisoka"], weapon: "Sword" };

  it("só movimento: manual, com o destino e a categoria declarados", () => {
    expect(draftFromDeclared({ move })).toEqual({ moveMode: "manual", to: [3, 1, 0], category: "Shift" });
  });

  it("só ataque: alvos e arma, sem movimento", () => {
    expect(draftFromDeclared({ attack })).toEqual({ moveMode: "none", act: { targets: ["hisoka"], weapon: "Sword" } });
  });

  it("os dois juntos", () => {
    expect(draftFromDeclared({ move, attack })).toEqual({
      moveMode: "manual", to: [3, 1, 0], category: "Shift", act: { targets: ["hisoka"], weapon: "Sword" },
    });
  });

  it("interact de parede volta como o verbo sobre a parede", () => {
    expect(draftFromDeclared({ interact: { kind: "open", targets: ["w1"] } })).toEqual({
      moveMode: "none", act: { targets: ["w1"], kind: "open" },
    });
  });

  it("interact que o compositor não faz (revelar) não vira rascunho", () => {
    expect(draftFromDeclared({ interact: { kind: "reveal", targets: ["w1"] } })).toEqual(emptyDraft());
  });

  it("não compartilha o array de alvos da declarada", () => {
    const out = draftFromDeclared({ attack });
    expect(out.act!.targets).not.toBe(attack.targets);
  });
});

describe("restoreDraftFor (F10)", () => {
  const restored: ActionDraft = { moveMode: "manual", to: [5, 5, 0], category: "Dash" };
  const render = (actorId: string) =>
    renderHook(() =>
      useActionComposerState({ matchId: "m1", actorId, boardPieces: [], grid, defaultCategory: "Dash" }),
    );

  it("ator na tela com rascunho vazio: o rascunho volta (e fica salvo)", () => {
    const { result } = render("gon");
    act(() => result.current.restoreDraftFor("gon", restored));
    expect(result.current.draft).toEqual(restored);
    expect(loadDraft("m1", "gon")).toEqual(restored);
  });

  it("ator na tela que já começou outro rascunho: não atropela", () => {
    const started = chooseDestination(emptyDraft(), [2, 2, 0]);
    saveDraft("m1", "gon", started);
    const { result } = render("gon");
    act(() => result.current.restoreDraftFor("gon", restored));
    expect(result.current.draft).toEqual(started);
    expect(loadDraft("m1", "gon")).toEqual(started);
  });

  it("outro ator (o mestre noutro NPC): grava no rascunho dele só se estiver vazio", () => {
    const { result } = render("gon");
    act(() => result.current.restoreDraftFor("killua", restored));
    expect(loadDraft("m1", "killua")).toEqual(restored);
    expect(result.current.draft).toEqual(emptyDraft());

    const started = chooseTarget(emptyDraft(), "hisoka");
    saveDraft("m1", "leorio", started);
    act(() => result.current.restoreDraftFor("leorio", restored));
    expect(loadDraft("m1", "leorio")).toEqual(started);
  });
});

describe("arma padrão", () => {
  it("defaultWeaponOf: a primeira que não é Fist, na ordem dada", () => {
    expect(defaultWeaponOf(["Fist", "Katana", "ThrowingDagger"])).toBe("Katana");
    expect(defaultWeaponOf(["ThrowingDagger", "Fist"])).toBe("ThrowingDagger");
    expect(defaultWeaponOf(["Fist"])).toBeUndefined();
    expect(defaultWeaponOf([])).toBeUndefined();
  });

  it("resolveDraft aplica o padrão e o envio manda a mesma arma", () => {
    const d: ActionDraft = { ...emptyDraft(), act: { targets: ["hisoka"] } };
    const r = resolveDraft(d, ctx, "Dash", "Katana");
    expect(r.act?.weapon).toBe("Katana");
    expect(buildEnqueuePayload(r, "gon", [2, 4, 0])?.attack).toEqual({ weapon: "Katana" });
  });

  it("escolha explícita de Fist não é atropelada pelo padrão", () => {
    const d: ActionDraft = { ...emptyDraft(), act: { targets: ["hisoka"], weapon: "Fist" } };
    expect(resolveDraft(d, ctx, "Dash", "Katana").act?.weapon).toBe("Fist");
  });

  it("sem padrão, a arma segue ausente", () => {
    const d: ActionDraft = { ...emptyDraft(), act: { targets: ["hisoka"] } };
    expect(resolveDraft(d, ctx, "Dash").act).toEqual({ targets: ["hisoka"], kind: "attack" });
  });
});
