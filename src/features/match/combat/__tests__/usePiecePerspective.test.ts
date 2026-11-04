import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePiecePerspective } from "../usePiecePerspective";
import type { PieceView } from "../../../../types/tacticalMap";
import type { MatchWsStatus } from "../../../../hooks/useMatchWs";

type Props = { pieceId?: string; view?: PieceView; status: MatchWsStatus; resyncKey: number };

const view = (pieceId: string): PieceView => ({ pieceId, visiblePolygons: [], wallIds: [], pieceIds: [] });

function setup(initial: Props) {
  const watch = vi.fn((_id: string | null) => true);
  const hook = renderHook(
    (p: Props) => usePiecePerspective(p.pieceId, p.view, p.status, watch, p.resyncKey),
    { initialProps: initial },
  );
  return { watch, ...hook };
}

describe("usePiecePerspective", () => {
  it("watches the piece and returns its view", () => {
    const { watch, result, rerender } = setup({ pieceId: "p1", status: "connected", resyncKey: 0 });
    expect(watch.mock.calls).toEqual([["p1"]]);
    rerender({ pieceId: "p1", view: view("p1"), status: "connected", resyncKey: 0 });
    expect(result.current).toEqual(view("p1"));
  });

  it("ignores a view of a different piece", () => {
    const { result } = setup({ pieceId: "p1", view: view("p2"), status: "connected", resyncKey: 0 });
    expect(result.current).toBeUndefined();
  });

  it("returns nothing without a piece, even with a view at hand", () => {
    const { result } = setup({ view: view("p1"), status: "connected", resyncKey: 0 });
    expect(result.current).toBeUndefined();
  });

  it("does not send while not connected, and sends once connected", () => {
    const { watch, rerender } = setup({ pieceId: "p1", status: "connecting", resyncKey: 0 });
    expect(watch).not.toHaveBeenCalled();
    rerender({ pieceId: "p1", status: "connected", resyncKey: 0 });
    expect(watch.mock.calls).toEqual([["p1"]]);
  });

  it("sends null when the piece is cleared", () => {
    const { watch, rerender } = setup({ pieceId: "p1", status: "connected", resyncKey: 0 });
    rerender({ status: "connected", resyncKey: 0 });
    expect(watch.mock.calls).toEqual([["p1"], [null]]);
  });

  it("sends nothing with no piece and nothing watched", () => {
    const { watch, rerender } = setup({ status: "connected", resyncKey: 0 });
    rerender({ status: "connected", resyncKey: 1 });
    expect(watch).not.toHaveBeenCalled();
  });

  it("re-sends the watch after a reconnect", () => {
    const { watch, rerender } = setup({ pieceId: "p1", status: "connected", resyncKey: 0 });
    rerender({ pieceId: "p1", status: "waking", resyncKey: 0 });
    rerender({ pieceId: "p1", status: "connected", resyncKey: 0 });
    expect(watch.mock.calls).toEqual([["p1"], ["p1"]]);
  });

  it("re-sends the watch when the resync key changes", () => {
    const { watch, rerender } = setup({ pieceId: "p1", status: "connected", resyncKey: 0 });
    rerender({ pieceId: "p1", status: "connected", resyncKey: 1 });
    expect(watch.mock.calls).toEqual([["p1"], ["p1"]]);
  });

  it("does not show a stale view when the same piece is selected again", () => {
    const old = view("p1");
    const { watch, result, rerender } = setup({ pieceId: "p1", view: undefined, status: "connected", resyncKey: 0 });
    rerender({ pieceId: "p1", view: old, status: "connected", resyncKey: 0 });
    expect(result.current).toBe(old);

    // Deseleciona e seleciona de novo: a visão antiga continua guardada, mas é de antes do watch novo.
    rerender({ view: old, status: "connected", resyncKey: 0 });
    rerender({ pieceId: "p1", view: old, status: "connected", resyncKey: 0 });
    expect(watch.mock.calls).toEqual([["p1"], [null], ["p1"]]);
    expect(result.current).toBeUndefined();

    const fresh = view("p1");
    rerender({ pieceId: "p1", view: fresh, status: "connected", resyncKey: 0 });
    expect(result.current).toBe(fresh);
  });
});
