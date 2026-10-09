import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useReactionControls } from "../useReactionControls";
import { initialCombatState } from "../combatReducer";
import type { CombatState, OwnReaction } from "../combatReducer";
import { saveDraft } from "../actionDraft";
import type { Piece } from "../../../../types/tacticalMap";

beforeEach(() => localStorage.clear());

const openTurn = (turnId = "t1"): CombatState["openTurn"] => ({
  turnId,
  actorId: "npc1",
  actionId: "a1",
  action: { uuid: "a1", actorId: "npc1", targetId: ["c2", "c3", "c9"], reactionKind: "" },
});

const piece = (characterId: string, col: number, row: number, z = 0): Piece => ({
  id: `p-${characterId}`,
  characterId,
  coord: { slot: { kind: "square", col, row }, z },
  visible: true,
} as Piece);

type Props = Parameters<typeof useReactionControls>[0];

function mount(over: Partial<Props> = {}) {
  const attachReaction = vi.fn<Props["send"]["attachReaction"]>(() => true);
  const initial: Props = {
    state: { ...initialCombatState, openTurn: openTurn() },
    mine: new Set(["c2", "c3"]),
    boardPieces: [piece("c2", 1, 1), piece("c3", 2, 2, 3)],
    matchId: "m1",
    send: { attachReaction },
    fullStateSeq: 1,
    ...over,
  };
  const hook = renderHook((p: Props) => useReactionControls(p), { initialProps: initial });
  return { ...hook, attachReaction, initial };
}

describe("useReactionControls", () => {
  it("targets: os meus alvos da ação aberta, com o estado de cada um", () => {
    const own: OwnReaction[] = [
      { reactionId: "r1", actorId: "c3", turnId: "t1", kind: "dodge", status: "attached", consumedActionIds: [] },
    ];
    const { result } = mount({ state: { ...initialCombatState, openTurn: openTurn(), ownReactions: own } });
    expect(result.current.targets).toEqual([
      { actorId: "c2", status: "available" },
      { actorId: "c3", status: "attached" },
    ]);
  });

  it("quick em Esquivar envia o payload mínimo para o turno aberto", () => {
    const { result, attachReaction } = mount();
    act(() => result.current.quick("c2", "dodge"));
    expect(attachReaction).toHaveBeenCalledWith(
      { actorId: "c2", reactToId: "a1", reactionKind: "dodge", dodge: {} },
      "t1",
    );
    expect(result.current.pick).toBeNull();
  });

  it("quick em Escapar não envia: arma a escolha da casa", () => {
    const { result, attachReaction } = mount();
    act(() => result.current.quick("c2", "escape"));
    expect(attachReaction).not.toHaveBeenCalled();
    expect(result.current.pick).toEqual({ actorId: "c2", kind: "escape" });
  });

  it("o toque na casa envia a fuga com a casa e o z da peça, e limpa a escolha", () => {
    const { result, attachReaction } = mount();
    act(() => result.current.quick("c2", "escape"));
    let consumed = false;
    act(() => { consumed = result.current.onSlotForPick({ kind: "square", col: 4, row: 2 }); });
    expect(consumed).toBe(true);
    expect(attachReaction).toHaveBeenCalledWith(
      { actorId: "c2", reactToId: "a1", reactionKind: "escape", dodge: {}, move: { category: "Dash", position: [4, 2, 0] } },
      "t1",
    );
    expect(result.current.pick).toBeNull();
  });

  it("a casa da fuga herda o z da peça do reator", () => {
    const { result, attachReaction } = mount();
    act(() => result.current.quick("c3", "escapeGuard"));
    act(() => { result.current.onSlotForPick({ kind: "square", col: 5, row: 5 }); });
    expect(attachReaction.mock.calls[0][0].move).toEqual({ category: "Dash", position: [5, 5, 3] });
  });

  it("sem escolha armada, o toque não é consumido", () => {
    const { result, attachReaction } = mount();
    let consumed = true;
    act(() => { consumed = result.current.onSlotForPick({ kind: "square", col: 4, row: 2 }); });
    expect(consumed).toBe(false);
    expect(attachReaction).not.toHaveBeenCalled();
  });

  it("Review Focus 4: o turno fechar derruba a escolha da casa", () => {
    const { result, rerender, attachReaction, initial } = mount();
    act(() => result.current.quick("c2", "escape"));
    rerender({ ...initial, state: { ...initialCombatState, openTurn: null } });
    expect(result.current.pick).toBeNull();
    let consumed = true;
    act(() => { consumed = result.current.onSlotForPick({ kind: "square", col: 4, row: 2 }); });
    expect(consumed).toBe(false);
    expect(attachReaction).not.toHaveBeenCalled();
  });

  it("Review Focus 4: outro turno aberto derruba a escolha", () => {
    const { result, rerender, initial } = mount();
    act(() => result.current.quick("c2", "escape"));
    rerender({ ...initial, state: { ...initialCombatState, openTurn: openTurn("t2") } });
    expect(result.current.pick).toBeNull();
  });

  it("Review Focus 4: um match_full_state novo derruba a escolha", () => {
    const { result, rerender, initial } = mount();
    act(() => result.current.quick("c2", "escape"));
    rerender({ ...initial, fullStateSeq: 2 });
    expect(result.current.pick).toBeNull();
  });

  it("cancelPick desarma a escolha", () => {
    const { result } = mount();
    act(() => result.current.quick("c2", "escape"));
    act(() => result.current.cancelPick());
    expect(result.current.pick).toBeNull();
  });

  it("quick em Repelir leva a arma do rascunho do personagem", () => {
    saveDraft("m1", "c2", { moveMode: "none", attack: { targets: [], weapon: "Sword" } });
    const { result, attachReaction } = mount();
    act(() => result.current.quick("c2", "repel"));
    expect(attachReaction).toHaveBeenCalledWith(
      { actorId: "c2", reactToId: "a1", reactionKind: "repel", repel: { weapon: "Sword" } },
      "t1",
    );
  });

  it("quick em Repelir sem rascunho vai desarmado", () => {
    const { result, attachReaction } = mount();
    act(() => result.current.quick("c2", "repel"));
    expect(attachReaction).toHaveBeenCalledWith(
      { actorId: "c2", reactToId: "a1", reactionKind: "repel", repel: {} },
      "t1",
    );
  });

  it("configure abre o diálogo; o diálogo envia o tipo e a arma escolhidos", () => {
    const { result, attachReaction } = mount();
    act(() => result.current.configure("c3", "repel"));
    expect(result.current.dialog).toEqual({ actorId: "c3", initial: "repel" });
    act(() => result.current.sendFromDialog({ kind: "repel", weapon: "Spear" }));
    expect(attachReaction).toHaveBeenCalledWith(
      { actorId: "c3", reactToId: "a1", reactionKind: "repel", repel: { weapon: "Spear" } },
      "t1",
    );
    expect(result.current.dialog).toBeNull();
  });

  it("o diálogo com fuga fechada arma a escolha da casa em vez de enviar", () => {
    const { result, attachReaction } = mount();
    act(() => result.current.configure("c2", "escape"));
    act(() => result.current.sendFromDialog({ kind: "closedEscape" }));
    expect(attachReaction).not.toHaveBeenCalled();
    expect(result.current.dialog).toBeNull();
    expect(result.current.pick).toEqual({ actorId: "c2", kind: "closedEscape" });
    act(() => { result.current.onSlotForPick({ kind: "square", col: 0, row: 3 }); });
    expect(attachReaction.mock.calls[0][0].move).toEqual({ category: "Shift", position: [0, 3, 0] });
  });

  it("closeDialog fecha sem enviar", () => {
    const { result, attachReaction } = mount();
    act(() => result.current.configure("c2", "dodge"));
    act(() => result.current.closeDialog());
    expect(result.current.dialog).toBeNull();
    expect(attachReaction).not.toHaveBeenCalled();
  });

  it("alvo que já reagiu não envia de novo", () => {
    const own: OwnReaction[] = [
      { actorId: "c2", turnId: "t1", kind: "dodge", status: "sending", consumedActionIds: [] },
    ];
    const { result, attachReaction } = mount({ state: { ...initialCombatState, openTurn: openTurn(), ownReactions: own } });
    act(() => result.current.quick("c2", "dodge"));
    expect(attachReaction).not.toHaveBeenCalled();
  });
});
