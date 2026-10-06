import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MapPieceOverlay from "../MapPieceOverlay";
import type { MapPieceAnchor } from "../MapPieceOverlay";

const anchor = (over: Partial<MapPieceAnchor> = {}): MapPieceAnchor => ({
  key: "a", x: 100, y: 100, radius: 10, placement: "below", node: <span />, ...over,
});

describe("MapPieceOverlay", () => {
  const listeners: Array<() => void> = [];
  afterEach(() => {
    listeners.splice(0).forEach((off) => off());
    vi.restoreAllMocks();
  });

  it("apertar um item não chega ao window (o pan do mapa), e o handler do próprio botão roda", () => {
    const onButtonDown = vi.fn();
    const onWindowDown = vi.fn();
    window.addEventListener("pointerdown", onWindowDown);
    listeners.push(() => window.removeEventListener("pointerdown", onWindowDown));
    render(
      <MapPieceOverlay
        width={800}
        height={600}
        anchors={[anchor({ node: <button onPointerDown={onButtonDown}>Esquivar</button> })]}
      />,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Esquivar" }));
    expect(onButtonDown).toHaveBeenCalledTimes(1);
    expect(onWindowDown).not.toHaveBeenCalled();
  });
});
