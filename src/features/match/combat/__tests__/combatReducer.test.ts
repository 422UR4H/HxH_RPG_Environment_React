import { describe, it, expect } from "vitest";
import { combatReducer, initialCombatState, pendingMoves, resolveLostCandidates } from "../combatReducer";
import type { CombatAction, CombatState, DeclaredAction, LostCandidate } from "../combatReducer";
import type { MatchHistory } from "../../../../types/matchHistory";
import type { BarsPayload, MatchFullStatePayload } from "../combatMessages";
import type { ResolutionPayload } from "../combatMessages";

const bars = (seq: number): BarsPayload => ({
  seq,
  prices: { action: 14 },
  characters: [
    { characterId: "c1", actionBalance: -2, moveBalance: 0, actionSpeeds: [], moveSpeeds: [] },
  ],
  order: [],
});

const run = (actions: CombatAction[], from: CombatState = initialCombatState) =>
  actions.reduce(combatReducer, from);

const sent = (id: string, extra: Partial<DeclaredAction> = {}): CombatAction => ({
  type: "ACTION_SENT",
  payload: { id, actorId: "c1", status: "sending", fromComposer: true, at: 0, ...extra },
});
const moveTo = { move: { category: "Dash" as const, from: [1, 1, 0] as [number, number, number], to: [3, 1, 0] as [number, number, number] } };
const acked = (actionId: string): CombatAction => ({ type: "action_enqueued", payload: { actionId } });
const opened = (turnId: string, actionId: string, actorId = "c1"): CombatAction => ({
  type: "turn_opened",
  payload: { turnId, actorId, actionId, actionType: "" },
});
const closed = (turnId: string): CombatAction => ({ type: "turn_closed", payload: { turnId } });

describe("combatReducer — guarda de seq", () => {
  it("aplica um snapshot mais novo", () => {
    const s = run([{ type: "bars_updated", payload: bars(1) }, { type: "bars_updated", payload: bars(3) }]);
    expect(s.bars?.seq).toBe(3);
  });

  it("descarta um snapshot atrasado", () => {
    const s = run([{ type: "bars_updated", payload: bars(5) }, { type: "bars_updated", payload: bars(2) }]);
    expect(s.bars?.seq).toBe(5);
  });

  it("não reinicia o contador ao reconectar", () => {
    const s = run([
      { type: "bars_updated", payload: bars(9) },
      { type: "match_full_state", payload: { roundMode: "Race", bars: bars(4) } },
    ]);
    expect(s.bars?.seq).toBe(9);
  });
});

describe("combatReducer — ações declaradas", () => {
  it("nasce no envio, ganha o actionId no ack e abre com o turno", () => {
    let s = run([sent("local-1", moveTo)]);
    expect(s.declared.map((d) => [d.id, d.status])).toEqual([["local-1", "sending"]]);
    s = run([acked("a1")], s);
    expect(s.declared.map((d) => [d.id, d.status])).toEqual([["a1", "queued"]]);
    s = run([opened("t1", "a1")], s);
    expect(s.declared.map((d) => [d.id, d.status, d.turnId])).toEqual([["a1", "open", "t1"]]);
    s = run([closed("t1")], s);
    expect(s.declared).toEqual([]);
  });

  it("acks chegam na ordem dos envios", () => {
    const s = run([sent("local-1"), sent("local-2", moveTo), acked("a1"), acked("a2")]);
    expect(s.declared.map((d) => d.id)).toEqual(["a1", "a2"]);
    expect(s.declared[1].move).toEqual(moveTo.move);
  });

  it("um envio recusado some — e só ele", () => {
    const s = run([
      sent("local-1", moveTo),
      acked("a1"),
      sent("local-2"),
      { type: "WS_ERROR", payload: { code: "move_blocked", message: "", sentType: "enqueue_action", at: 1 } },
    ]);
    expect(s.declared.map((d) => d.id)).toEqual(["a1"]);
    expect(s.lastError?.code).toBe("move_blocked");
  });

  it("erro de outro verbo não mexe nas ações declaradas", () => {
    const s = run([
      sent("local-1"),
      { type: "WS_ERROR", payload: { code: "game_error", message: "x", sentType: "open_next_action", at: 1 } },
    ]);
    expect(s.declared).toHaveLength(1);
  });

  it("sobrevive ao fim do round e à troca de cena — a fila do servidor também sobrevive", () => {
    const s = run([
      sent("local-1", moveTo),
      acked("a1"),
      { type: "round_closed", payload: { roundMode: "Race" } },
      { type: "scene_changed", payload: { sceneId: "s2", category: "battle", briefInitialDescription: "" } },
    ]);
    expect(s.declared.map((d) => d.id)).toEqual(["a1"]);
    expect(pendingMoves(s.declared)).toHaveLength(1);
  });

  it("reconexão: descarta envios sem ack e turnos meus que fecharam fora", () => {
    const s = run([
      sent("local-1"), acked("a1"), opened("t1", "a1"), // aberto — vai fechar enquanto estou fora
      sent("local-2"), acked("a2"),                        // ainda na fila
      sent("local-3"),                                     // sem ack, socket morreu
      { type: "match_full_state", payload: { roundMode: "Race", openTurn: { turnId: "t9", actorId: "c2" } } },
    ]);
    expect(s.declared.map((d) => [d.id, d.status])).toEqual([["a2", "queued"]]);
  });

  it("reconexão com o meu turno ainda aberto mantém a ação em curso", () => {
    const s = run([
      sent("local-1"), acked("a1"), opened("t1", "a1"),
      { type: "match_full_state", payload: { roundMode: "Race", openTurn: { turnId: "t1", actorId: "c1" } } },
    ]);
    expect(s.declared.map((d) => [d.id, d.status])).toEqual([["a1", "open"]]);
  });

  it("dispensar tira da lista", () => {
    const s = run([sent("local-1"), acked("a1"), { type: "DECLARED_DISMISSED", payload: { ids: ["a1"] } }]);
    expect(s.declared).toEqual([]);
  });

  it("fantasma é só o movimento que ainda não aconteceu", () => {
    const s = run([sent("local-1", moveTo), acked("a1"), sent("local-2"), acked("a2"), opened("t1", "a1")]);
    expect(pendingMoves(s.declared)).toHaveLength(0); // a1 abriu: a peça já anda por piece_moved
    const s2 = run([sent("local-1", moveTo)]);
    expect(pendingMoves(s2.declared).map((d) => d.id)).toEqual(["local-1"]);
  });
});

describe("combatReducer — turno aberto e fila", () => {
  it("turn_opened tira a ação da fila do mestre e marca o turno", () => {
    const s = run([
      { type: "action_queued", payload: { actionId: "a1", actorId: "c1", bars: ["action"] } },
      { type: "action_queued", payload: { actionId: "a2", actorId: "c2", bars: ["move"] } },
      opened("t1", "a1"),
    ]);
    expect(s.queue.map((q) => q.actionId)).toEqual(["a2"]);
    expect(s.openTurn).toEqual({ turnId: "t1", actorId: "c1", actionId: "a1", actionType: "" });
  });

  it("turn_closed só limpa o turno que fechou", () => {
    const s = run([opened("t1", "a1"), closed("t0")]);
    expect(s.openTurn?.turnId).toBe("t1");
    expect(run([closed("t1")], s).openTurn).toBeNull();
  });

  it("a fila é substituída inteira no snapshot", () => {
    const s = run([
      { type: "action_queued", payload: { actionId: "a1", actorId: "c1", bars: ["action"] } },
      { type: "match_full_state", payload: { roundMode: "Race" } },
    ]);
    expect(s.queue).toEqual([]);
  });

  it("troca de cena preserva fila e turno aberto", () => {
    const s = run([
      { type: "action_queued", payload: { actionId: "a2", actorId: "c2", bars: ["action"] } },
      opened("t1", "a1"),
      { type: "scene_changed", payload: { sceneId: "s2", category: "battle", briefInitialDescription: "Arena" } },
    ]);
    expect(s.scene?.briefInitialDescription).toBe("Arena");
    expect(s.queue).toHaveLength(1);
    expect(s.openTurn?.turnId).toBe("t1");
  });
});

describe("combatReducer — histórico", () => {
  it("o turno aberto de uma ação minha leva o que eu declarei", () => {
    const s = run([sent("local-1", { ...moveTo, attack: { targets: ["c2"] } }), acked("a1"), opened("t1", "a1")]);
    const ev = s.events.find((e) => e.kind === "turn_opened");
    expect(ev?.kind === "turn_opened" && ev.mine?.attack?.targets).toEqual(["c2"]);
  });

  it("junta turn_closed e a resolução liquidada na MESMA linha, em qualquer ordem, com o ator", () => {
    const s = run([
      opened("t1", "a1", "c7"),
      { type: "resolution_updated", payload: { turnId: "t1", isSettled: true, targets: [] } },
      closed("t1"),
    ]);
    const rows = s.events.filter((e) => e.kind === "turn_closed");
    expect(rows).toHaveLength(1);
    expect(rows[0].kind === "turn_closed" && rows[0].resolution).toBeDefined();
    expect(rows[0].kind === "turn_closed" && rows[0].actorId).toBe("c7");
  });

  it("ignora uma resolução de turno aberto", () => {
    const s = run([{ type: "resolution_updated", payload: { turnId: "t1", isSettled: false, targets: [] } }]);
    expect(s.events).toHaveLength(0);
  });

  it("guarda o HP aplicado", () => {
    const s = run([{ type: "character_hp_changed", payload: { characterId: "c2", hp: 84, maxHp: 100, damage: 16 } }]);
    expect(s.hp["c2"]).toEqual({ hp: 84, maxHp: 100 });
    expect(s.events[0]).toMatchObject({ kind: "hp_changed", hp: 84, maxHp: 100, damage: 16 });
  });
});

const unsettled = (turnId: string): ResolutionPayload => ({
  turnId, isSettled: false, targets: [],
  action: { skillName: "Accuracy", skillValue: 14, diceRolled: [6, 8], total: 20, isCritical: false, isCriticalFailure: false },
});

describe("combatReducer — hora dos eventos", () => {
  it("usa a hora do servidor em `at` e a local em `receivedAt`", () => {
    const s = run([{ type: "round_closed", payload: { roundMode: "Race" }, at: 1000, receivedAt: 5000 }]);
    expect(s.events[0]).toMatchObject({ kind: "round_closed", at: 1000, receivedAt: 5000 });
  });
});

describe("combatReducer — resolução do turno aberto (F7)", () => {
  it("guarda a resolução não liquidada do turno aberto", () => {
    const s = run([opened("t1", "a1"), { type: "resolution_updated", payload: unsettled("t1") }]);
    expect(s.openResolution?.turnId).toBe("t1");
  });

  it("ignora resolução não liquidada de outro turno", () => {
    const s = run([opened("t1", "a1"), { type: "resolution_updated", payload: unsettled("t0") }]);
    expect(s.openResolution).toBeNull();
  });

  // BF3: ordem real no socket do mestre em open_next_action é piece_moved, resolution_updated
  // (isSettled=false), turn_opened, bars_updated — a resolução chega ANTES de existir turno
  // aberto. Antes só era guardada quando `state.openTurn?.turnId === payload.turnId`, o que
  // descartava exatamente essa ordem (openTurn ainda era o anterior/null).
  it("guarda a resolução que chega antes do turn_opened (ordem real) e mantém ao abrir o mesmo turno", () => {
    const s = run([{ type: "resolution_updated", payload: unsettled("t1") }, opened("t1", "a1")]);
    expect(s.openResolution?.turnId).toBe("t1");
  });

  it("uma resolução de um turno que já fechou não sobrevive à abertura de outro turno", () => {
    const s = run([{ type: "resolution_updated", payload: unsettled("t0") }, opened("t1", "a1")]);
    expect(s.openResolution).toBeNull();
  });

  it("limpa no turn_closed do mesmo turno e no round_closed", () => {
    const a = run([opened("t1", "a1"), { type: "resolution_updated", payload: unsettled("t1") }, closed("t1")]);
    expect(a.openResolution).toBeNull();
    const b = run([opened("t1", "a1"), { type: "resolution_updated", payload: unsettled("t1") }, { type: "round_closed", payload: { roundMode: "Race" } }]);
    expect(b.openResolution).toBeNull();
  });

  it("match_full_state traz a resolução — ou a limpa quando ausente", () => {
    const withRes = run([{ type: "match_full_state", payload: { roundMode: "Race", openTurn: { turnId: "t1", actorId: "c1" }, resolution: unsettled("t1") } }]);
    expect(withRes.openResolution?.turnId).toBe("t1");
    const without = run([{ type: "match_full_state", payload: { roundMode: "Race" } }], withRes);
    expect(without.openResolution).toBeNull();
  });
});

describe("combatReducer — a ação em andamento continua na Fila (F7)", () => {
  const queued = (actionId: string): CombatAction => ({ type: "action_queued", payload: { actionId, actorId: "c1", bars: ["action"] } });

  it("turn_opened guarda a linha que saiu da fila", () => {
    const s = run([queued("a1"), opened("t1", "a1")]);
    expect(s.queue).toHaveLength(0);
    expect(s.openQueued).toMatchObject({ actionId: "a1", actorId: "c1" });
  });

  it("limpa no turn_closed do turno, no round_closed e no match_full_state", () => {
    expect(run([queued("a1"), opened("t1", "a1"), closed("t1")]).openQueued).toBeNull();
    expect(run([queued("a1"), opened("t1", "a1"), { type: "round_closed", payload: { roundMode: "Race" } }]).openQueued).toBeNull();
    expect(run([queued("a1"), opened("t1", "a1"), { type: "match_full_state", payload: { roundMode: "Race" } }]).openQueued).toBeNull();
  });

  it("turn_opened de ação que não estava na fila deixa openQueued nulo", () => {
    expect(run([opened("t1", "a9")]).openQueued).toBeNull();
  });
});

describe("combatReducer — HP na reconexão", () => {
  it("match_full_state zera o HP ao vivo (o REST rebuscado vira a base)", () => {
    const s = run([
      { type: "character_hp_changed", payload: { characterId: "c1", hp: 80, maxHp: 100, damage: 20 } },
      { type: "match_full_state", payload: { roundMode: "Race" } },
    ]);
    expect(s.hp).toEqual({});
  });
});

describe("combatReducer — a lista de declaradas segue o servidor (F10/B12)", () => {
  const full = (
    extra: Partial<MatchFullStatePayload> = {},
    rest: { receivedAt?: number; declaredSource?: "ownQueue" | "queue" } = {},
  ): CombatAction => ({
    type: "match_full_state",
    payload: { roundMode: "Race", ...extra },
    ...rest,
  });
  const own = (...ids: string[]) => ids.map((actionId) => ({ actionId, action: {} }));
  const q = (...ids: string[]) => ids.map((actionId) => ({ actionId, actorId: "npc1", bars: ["move" as const] }));

  it("a ação que o servidor ainda tem na fila fica", () => {
    const s = run([sent("local-1"), acked("a1"), sent("local-2"), acked("a2"), full({ ownQueue: own("a1", "a2") })]);
    expect(s.declared.map((d) => [d.id, d.status])).toEqual([["a1", "queued"], ["a2", "queued"]]);
    expect(s.lostCandidates).toEqual([]);
  });

  it("a ação que abriu enquanto eu estava fora é conhecida pelo openTurn.actionId — fica, aberta", () => {
    const s = run([
      sent("local-1"), acked("a1"),
      full({ ownQueue: [], openTurn: { turnId: "t1", actorId: "c1", actionId: "a1" } }),
    ]);
    expect(s.declared.map((d) => [d.id, d.status, d.turnId])).toEqual([["a1", "open", "t1"]]);
    expect(s.lostCandidates).toEqual([]);
  });

  it("a ação que o servidor não tem sai da lista e vira candidata, carimbada com a chegada", () => {
    const s = run([
      sent("local-1", { ...moveTo, at: 10 }), acked("a1"),
      sent("local-2"), acked("a2"),
      full({ ownQueue: own("a2") }, { receivedAt: 500 }),
    ]);
    expect(s.declared.map((d) => d.id)).toEqual(["a2"]);
    expect(s.lostCandidates.map((d) => [d.id, d.at, d.detectedAt])).toEqual([["a1", 10, 500]]);
    expect(s.lostCandidates[0].move).toEqual(moveTo.move);
    // Ainda não é perda: pode ter aberto E fechado enquanto eu estava fora (o histórico diz).
    expect(s.lostDeclared).toEqual([]);
  });

  it("um envio sem ack sai calado — não é perda (o servidor nunca disse que tinha)", () => {
    const s = run([sent("local-1"), full({ ownQueue: [] })]);
    expect(s.declared).toEqual([]);
    expect(s.lostCandidates).toEqual([]);
  });

  it("candidatas acumulam entre reconexões, sem duplicar por id", () => {
    let s = run([sent("local-1"), acked("a1"), full({ ownQueue: [] })]);
    s = run([sent("local-2"), acked("a2"), full({ ownQueue: [] })], s);
    expect(s.lostCandidates.map((d) => d.id)).toEqual(["a1", "a2"]);
    // A mesma de novo (ex.: voltou do localStorage num refresh) não entra duas vezes.
    s = run([full({ ownQueue: [] })], { ...s, declared: [{ ...s.lostCandidates[0] }] });
    expect(s.lostCandidates.map((d) => d.id)).toEqual(["a1", "a2"]);
  });

  it("LOST_CANDIDATES_RESOLVED: a que rodou some calada; a perdida vira lostDeclared com o que voltou", () => {
    let s = run([sent("local-1"), acked("a1"), sent("local-2"), acked("a2"), sent("local-3"), acked("a3"), full({ ownQueue: [] })]);
    s = run([{ type: "LOST_CANDIDATES_RESOLVED", payload: { ran: ["a1"], lost: ["a2", "a3"], restored: ["a3"] } }], s);
    expect(s.lostCandidates).toEqual([]);
    expect(s.lostDeclared.map((d) => [d.id, d.draftRestored])).toEqual([["a2", false], ["a3", true]]);
  });

  it("LOST_CANDIDATES_RESOLVED parcial deixa as outras candidatas esperando", () => {
    let s = run([sent("local-1"), acked("a1"), sent("local-2"), acked("a2"), full({ ownQueue: [] })]);
    s = run([{ type: "LOST_CANDIDATES_RESOLVED", payload: { ran: [], lost: ["a1"], restored: [] } }], s);
    expect(s.lostCandidates.map((d) => d.id)).toEqual(["a2"]);
    expect(s.lostDeclared.map((d) => d.id)).toEqual(["a1"]);
  });

  it("LOST_DECLARED_DISMISSED limpa o aviso", () => {
    let s = run([sent("local-1"), acked("a1"), full({ ownQueue: [] })]);
    s = run([{ type: "LOST_CANDIDATES_RESOLVED", payload: { ran: [], lost: ["a1"], restored: [] } }, { type: "LOST_DECLARED_DISMISSED" }], s);
    expect(s.lostDeclared).toEqual([]);
  });

  it("sem ownQueue (servidor antigo) nada muda", () => {
    const s = run([sent("local-1"), acked("a1"), full()]);
    expect(s.declared.map((d) => [d.id, d.status])).toEqual([["a1", "queued"]]);
    expect(s.lostCandidates).toEqual([]);
  });

  describe("fonte \"queue\" (o mestre, pelos NPCs)", () => {
    it("a que está em queue fica; a que não está vira candidata", () => {
      const s = run([
        sent("local-1"), acked("a1"), sent("local-2"), acked("a2"),
        full({ queue: q("a2") }, { declaredSource: "queue" }),
      ]);
      expect(s.declared.map((d) => d.id)).toEqual(["a2"]);
      expect(s.lostCandidates.map((d) => d.id)).toEqual(["a1"]);
    });

    it("queue ausente é fila vazia (contrato): todas viram candidatas", () => {
      const s = run([sent("local-1"), acked("a1"), full({}, { declaredSource: "queue" })]);
      expect(s.declared).toEqual([]);
      expect(s.lostCandidates.map((d) => d.id)).toEqual(["a1"]);
    });

    it("a do openTurn fica, aberta", () => {
      const s = run([
        sent("local-1"), acked("a1"),
        full({ openTurn: { turnId: "t1", actorId: "npc1", actionId: "a1" } }, { declaredSource: "queue" }),
      ]);
      expect(s.declared.map((d) => [d.id, d.status])).toEqual([["a1", "open"]]);
    });
  });
});

describe("resolveLostCandidates (F10)", () => {
  const cand = (id: string, detectedAt: number): LostCandidate => ({
    id, actorId: "c1", status: "queued", fromComposer: true, at: 0, detectedAt,
  });
  const history = (actionIds: string[], reactionIds: string[] = []): MatchHistory => ({
    scenes: [{
      uuid: "s1", category: "battle", briefDesc: "", createdAt: "",
      rounds: [{
        uuid: "r1", mode: "Race", createdAt: "",
        turns: actionIds.map((id, i) => ({
          uuid: `t${i}`, createdAt: "",
          action: { uuid: id, actorId: "c1", reactionKind: "" },
          reactions: reactionIds.map((r) => ({ uuid: r, actorId: "c2", reactionKind: "dodge" })),
        })),
      }],
    }],
  });

  it("nada antes de um histórico buscado DEPOIS do match_full_state", () => {
    expect(resolveLostCandidates([cand("a1", 100)], undefined)).toBeNull();
    expect(resolveLostCandidates([cand("a1", 100)], { history: history([]), fetchStartedAt: 99 })).toBeNull();
  });

  it("no histórico (ação ou reação) → rodou; fora dele → perdida", () => {
    const out = resolveLostCandidates(
      [cand("a1", 100), cand("a2", 100), cand("a3", 100)],
      { history: history(["a1"], ["a3"]), fetchStartedAt: 100 },
    );
    expect(out).toEqual({ ran: ["a1", "a3"], lost: ["a2"] });
  });

  it("só decide as candidatas que o fetch cobre", () => {
    const out = resolveLostCandidates([cand("a1", 100), cand("a2", 300)], { history: history([]), fetchStartedAt: 200 });
    expect(out).toEqual({ ran: [], lost: ["a1"] });
  });
});
