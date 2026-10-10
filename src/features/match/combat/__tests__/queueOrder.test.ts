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

  it("ordem vazia: chegada, tudo inOrder", () => {
    const out = orderQueue([B, A], []);
    expect(ids(out)).toEqual(["b", "a"]);
    expect(out.every((i) => i.inOrder)).toBe(true);
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
