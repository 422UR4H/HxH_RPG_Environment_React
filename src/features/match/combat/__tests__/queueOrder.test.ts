import { describe, expect, it } from "vitest";
import type { QueuedAction } from "../combatMessages";
import { orderQueue } from "../queueOrder";

const q = (actionId: string, actorId: string, bars: QueuedAction["bars"], speed?: number): QueuedAction => ({
  actionId,
  actorId,
  bars,
  ...(speed !== undefined && {
    action: { uuid: actionId, actorId, reactionKind: "", speed: { bar: 0, rollCheck: { result: speed } } },
  }),
}) as QueuedAction;

const ids = (items: ReturnType<typeof orderQueue>) => items.map((i) => i.action.actionId);

describe("orderQueue", () => {
  const A = q("a", "A", ["action"]);
  const B = q("b", "B", ["action"]);

  it("segue a ordem do servidor, não a chegada", () => {
    const out = orderQueue([A, B], [
      { actorId: "B", bars: ["action"], key: 9 },
      { actorId: "A", bars: ["action"], key: 5 },
    ]);
    expect(ids(out)).toEqual(["b", "a"]);
    expect(out.every((i) => i.inOrder)).toBe(true);
  });

  it("mesmo ator e barras: a mais veloz abre primeiro", () => {
    const slow = q("slow", "A", ["action"], 9);
    const fast = q("fast", "A", ["action"], 14);
    const order = [
      { actorId: "A", bars: ["action" as const], key: 14 },
      { actorId: "A", bars: ["action" as const], key: 9 },
    ];
    expect(ids(orderQueue([slow, fast], order))).toEqual(["fast", "slow"]);
  });

  it("empate de velocidade: chegada", () => {
    const first = q("first", "A", ["action"], 10);
    const second = q("second", "A", ["action"], 10);
    const order = [
      { actorId: "A", bars: ["action" as const], key: 10 },
      { actorId: "A", bars: ["action" as const], key: 10 },
    ];
    expect(ids(orderQueue([first, second], order))).toEqual(["first", "second"]);
  });

  it("sem `action.action`: desempate só pela chegada", () => {
    const first = q("first", "A", ["action"]);
    const second = q("second", "A", ["action"]);
    const order = [
      { actorId: "A", bars: ["action" as const], key: 3 },
      { actorId: "A", bars: ["action" as const], key: 2 },
    ];
    expect(ids(orderQueue([first, second], order))).toEqual(["first", "second"]);
  });

  it("usa a velocidade final do movimento quando a ação não cobra a barra de ação", () => {
    const slow = { ...q("slow", "A", ["move"]), action: { uuid: "s", actorId: "A", reactionKind: "", move: { category: "Dash", finalSpeed: 5 } } } as QueuedAction;
    const fast = { ...q("fast", "A", ["move"]), action: { uuid: "f", actorId: "A", reactionKind: "", move: { category: "Dash", finalSpeed: 12 } } } as QueuedAction;
    const order = [
      { actorId: "A", bars: ["move" as const], key: 12 },
      { actorId: "A", bars: ["move" as const], key: 5 },
    ];
    expect(ids(orderQueue([slow, fast], order))).toEqual(["fast", "slow"]);
  });

  it("ação fora da ordem vai ao fim, na chegada, com inOrder false", () => {
    const C = q("c", "C", ["action"]);
    const D = q("d", "D", ["move"]);
    const out = orderQueue([C, A, D], [{ actorId: "A", bars: ["action"], key: 5 }]);
    expect(ids(out)).toEqual(["a", "c", "d"]);
    expect(out.map((i) => i.inOrder)).toEqual([true, false, false]);
  });

  it("sem bars_updated ainda (order undefined): chegada, tudo inOrder", () => {
    const out = orderQueue([B, A], undefined, "Race");
    expect(ids(out)).toEqual(["b", "a"]);
    expect(out.every((i) => i.inOrder)).toBe(true);
  });

  it("Race com ordem vazia e fila cheia: ninguém paga, tudo inOrder false", () => {
    const out = orderQueue([B, A], [], "Race");
    expect(ids(out)).toEqual(["b", "a"]);
    expect(out.every((i) => !i.inOrder)).toBe(true);
  });

  it("Free (ou regime ainda desconhecido) com ordem vazia: sem informação, tudo inOrder", () => {
    expect(orderQueue([B, A], [], "Free").every((i) => i.inOrder)).toBe(true);
    expect(orderQueue([B, A], [], "").every((i) => i.inOrder)).toBe(true);
  });

  it("devolve a chave da entrada casada, não a da primeira do mesmo ator e barras", () => {
    const slow = q("slow", "A", ["action"], 9);
    const fast = q("fast", "A", ["action"], 14);
    const out = orderQueue([slow, fast], [
      { actorId: "A", bars: ["action"], key: 24 },
      { actorId: "A", bars: ["action"], key: 15 },
    ], "Race");
    expect(out.map((i) => [i.action.actionId, i.key])).toEqual([["fast", 24], ["slow", 15]]);
    expect(orderQueue([A], [], "Race")[0].key).toBeUndefined();
  });

  it("ação nas duas barras desempata pela menor das duas velocidades", () => {
    const both = (id: string, act: number, mov: number) =>
      ({ ...q(id, "A", ["action", "move"]), action: { uuid: id, actorId: "A", reactionKind: "", speed: { bar: 0, rollCheck: { result: act } }, move: { category: "Dash", finalSpeed: mov } } }) as QueuedAction;
    // x: min 5; y: min 8 — y abre primeiro, embora x tenha a maior velocidade isolada (20).
    const x = both("x", 20, 5);
    const y = both("y", 8, 9);
    const order = [
      { actorId: "A", bars: ["action" as const, "move" as const], key: 8 },
      { actorId: "A", bars: ["action" as const, "move" as const], key: 5 },
    ];
    expect(ids(orderQueue([x, y], order, "Race"))).toEqual(["y", "x"]);
  });

  it("entrada da ordem sem ação na fila (a em andamento) é ignorada", () => {
    const out = orderQueue([A], [
      { actorId: "Z", bars: ["action"], key: 99 },
      { actorId: "A", bars: ["action"], key: 5 },
    ]);
    expect(ids(out)).toEqual(["a"]);
    expect(out[0].inOrder).toBe(true);
  });
});
