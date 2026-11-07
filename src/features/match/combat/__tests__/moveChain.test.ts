import { describe, it, expect } from "vitest";
import {
  arrivedMoves, chainHeadOf, chainTailOf, ghostOrigin, pendingChainMoves, predecessorOf, stackedAfter,
  stackedLostByEscape,
} from "../moveChain";
import type { ChainMove } from "../moveChain";
import type { DeclaredAction } from "../combatReducer";
import type { QueuedAction } from "../combatMessages";
import type { SlotTriple } from "../../../tactical-map/utils/coords";

const declared = (id: string, to: SlotTriple | undefined, over: Partial<DeclaredAction> = {}): DeclaredAction => ({
  id, actorId: "c1", status: "queued", fromComposer: true, at: 0,
  ...(to ? { move: { category: "Dash", from: [0, 0, 0], to } } : { attack: { targets: ["n1"] } }),
  ...over,
});

const queued = (id: string, actorId: string, position?: SlotTriple, stackedOn?: string): QueuedAction => ({
  actionId: id, actorId, bars: position ? ["move"] : ["action"],
  action: {
    uuid: id, actorId, reactionKind: "",
    ...(position ? { move: { category: "Dash", position, ...(stackedOn ? { stackedOn } : {}) } } : { attack: {} }),
    ...(position ? {} : { targetId: ["c9"] }),
  },
});

const ids = (ms: ChainMove[]) => ms.map((m) => m.id);

describe("pendingChainMoves", () => {
  it("keeps only pending moves of the declared list, in declaration order", () => {
    const moves = pendingChainMoves([
      declared("a1", [1, 0, 0]),
      declared("a2", undefined),
      declared("a3", [2, 0, 0], { status: "open" }),
      declared("local-4", [3, 0, 0], { status: "sending" }),
    ], []);
    expect(ids(moves)).toEqual(["a1", "local-4"]);
  });

  it("takes the queue order first, then declarations the queue does not have yet", () => {
    const moves = pendingChainMoves(
      [declared("q2", [5, 5, 0], { actorId: "n1" }), declared("local-9", [6, 6, 0], { actorId: "n1", status: "sending" })],
      [queued("q1", "n1", [4, 4, 0]), queued("x", "n1"), queued("q2", "n1", [5, 5, 0], "q1")],
    );
    expect(ids(moves)).toEqual(["q1", "q2", "local-9"]);
    expect(moves[1]).toMatchObject({ stackedOn: "q1", ownStatus: "queued" });
    expect(moves[0].ownStatus).toBeUndefined();
  });

  it("describes a queue-only move from the queued action", () => {
    const [m] = pendingChainMoves([], [queued("q1", "n1", [4, 4, 0])]);
    expect(m.summary).toEqual({ move: { category: "Dash", to: [4, 4, 0] }, attack: undefined, interact: undefined });
  });
});

describe("chain derivation", () => {
  const chain = pendingChainMoves([
    declared("a1", [1, 0, 0]),
    declared("b1", [9, 9, 0], { actorId: "c2" }),
    declared("x1", undefined),
    declared("a2", [2, 0, 0]),
    declared("a3", [3, 0, 0]),
  ], []);

  it("a move stacks on the last pending move of the same character; non-moves do not break the chain", () => {
    expect(predecessorOf(chain.find((m) => m.id === "a1")!, chain)).toBeUndefined();
    expect(predecessorOf(chain.find((m) => m.id === "a2")!, chain)?.id).toBe("a1");
    expect(predecessorOf(chain.find((m) => m.id === "a3")!, chain)?.id).toBe("a2");
    expect(predecessorOf(chain.find((m) => m.id === "b1")!, chain)).toBeUndefined();
  });

  it("chainTailOf is the character's last pending move; chainHeadOf the first", () => {
    expect(chainTailOf("c1", chain)?.id).toBe("a3");
    expect(chainHeadOf("c1", chain)?.id).toBe("a1");
    expect(chainTailOf("c3", chain)).toBeUndefined();
  });

  it("stackedAfter cancels transitively: the middle of three takes only the third", () => {
    expect(ids(stackedAfter("a1", chain))).toEqual(["a2", "a3"]);
    expect(ids(stackedAfter("a2", chain))).toEqual(["a3"]);
    expect(stackedAfter("a3", chain)).toEqual([]);
    expect(stackedAfter("x1", chain)).toEqual([]);
  });

  it("an explicit stackedOn pointing at a pending move wins", () => {
    const moves = pendingChainMoves([], [
      queued("q1", "n1", [1, 1, 0]), queued("q2", "n1", [2, 2, 0], "q1"), queued("q3", "n1", [3, 3, 0], "q2"),
    ]);
    expect(predecessorOf(moves[2], moves)?.id).toBe("q2");
  });

  it("a stale stackedOn (target no longer pending) falls back to the order: here, the head", () => {
    const moves = pendingChainMoves([], [queued("q2", "n1", [2, 2, 0], "gone")]);
    expect(predecessorOf(moves[0], moves)).toBeUndefined();
  });
});

describe("ghostOrigin", () => {
  const moves = pendingChainMoves([declared("a1", [1, 0, 0]), declared("a2", [2, 0, 0])], []);
  it("a stacked ghost starts at its predecessor's destination", () => {
    expect(ghostOrigin(moves[1], moves, [5, 5, 0])).toEqual([1, 0, 0]);
  });
  it("the head starts at the piece; without a piece, at the recorded origin", () => {
    expect(ghostOrigin(moves[0], moves, [5, 5, 0])).toEqual([5, 5, 0]);
    expect(ghostOrigin(moves[0], moves, undefined)).toEqual([0, 0, 0]);
  });
});

describe("arrivedMoves", () => {
  it("only a queued head whose piece sits on its destination arrived", () => {
    const moves = pendingChainMoves([
      declared("a1", [1, 0, 0]),
      declared("a2", [0, 0, 0]), // volta para onde a peça está: empilhado, não chegou
    ], []);
    const at = (_: string, to: SlotTriple) => to[0] === 0 && to[1] === 0;
    expect(arrivedMoves(moves, at)).toEqual([]);
    const atFirst = (_: string, to: SlotTriple) => to[0] === 1;
    expect(ids(arrivedMoves(moves, atFirst))).toEqual(["a1"]);
  });

  it("a sending declaration and a queue-only move never arrive", () => {
    const moves = pendingChainMoves([declared("local-1", [1, 0, 0], { status: "sending" })], [queued("q1", "n1", [1, 0, 0])]);
    expect(arrivedMoves(moves, () => true)).toEqual([]);
  });
});

describe("stackedLostByEscape", () => {
  const moves = pendingChainMoves([declared("a1", [1, 0, 0]), declared("a2", [2, 0, 0])], []);
  it("an escape elsewhere loses what is stacked on the head", () => {
    expect(ids(stackedLostByEscape("c1", moves, [7, 7, 0]))).toEqual(["a2"]);
  });
  it("an escape to the head's destination keeps the chain (z does not matter)", () => {
    expect(stackedLostByEscape("c1", moves, [1, 0, 3])).toEqual([]);
  });
  it("without a destination yet, warns about what could be lost", () => {
    expect(ids(stackedLostByEscape("c1", moves))).toEqual(["a2"]);
  });
  it("nothing stacked, nothing lost", () => {
    const single = pendingChainMoves([declared("a1", [1, 0, 0])], []);
    expect(stackedLostByEscape("c1", single, [7, 7, 0])).toEqual([]);
    expect(stackedLostByEscape("c2", moves)).toEqual([]);
  });
});
