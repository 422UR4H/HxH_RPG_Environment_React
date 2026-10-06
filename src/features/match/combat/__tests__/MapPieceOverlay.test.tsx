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

  // O jsdom não tem layout: a caixa de cada item vem de uma tabela, pelo `data-anchor` dele.
  function mockRects(rects: Record<string, { x: number; y: number; w: number; h: number }>) {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const r = rects[this.dataset.anchor ?? ""] ?? { x: 0, y: 0, w: 0, h: 0 };
      return { x: r.x, y: r.y, left: r.x, top: r.y, width: r.w, height: r.h, right: r.x + r.w, bottom: r.y + r.h, toJSON: () => r } as DOMRect;
    });
  }
  const shiftOf = (text: string) => screen.getByText(text).parentElement as HTMLElement;

  it("balões que se sobrepõem empilham: o primeiro fica, o outro sobe o bastante", () => {
    mockRects({ a: { x: 90, y: 60, w: 40, h: 20 }, b: { x: 90, y: 60, w: 40, h: 20 } });
    render(
      <MapPieceOverlay
        width={800}
        height={600}
        anchors={[
          anchor({ key: "a", placement: "above", node: <span>balão A</span> }),
          anchor({ key: "b", placement: "above", node: <span>balão B</span> }),
        ]}
      />,
    );
    expect(shiftOf("balão A").style.transform).toBe("");
    expect(shiftOf("balão B").style.transform).toBe("translateY(-24px)");
  });

  it("balões que não se tocam ficam onde estão", () => {
    mockRects({ a: { x: 0, y: 60, w: 40, h: 20 }, b: { x: 200, y: 60, w: 40, h: 20 } });
    render(
      <MapPieceOverlay
        width={800}
        height={600}
        anchors={[
          anchor({ key: "a", placement: "above", node: <span>balão A</span> }),
          anchor({ key: "b", placement: "above", node: <span>balão B</span> }),
        ]}
      />,
    );
    expect(shiftOf("balão A").style.transform).toBe("");
    expect(shiftOf("balão B").style.transform).toBe("");
  });

  it("os botões de baixo não entram na pilha, nem se sobrepostos a um balão", () => {
    mockRects({ a: { x: 90, y: 60, w: 40, h: 20 }, r: { x: 90, y: 60, w: 40, h: 20 } });
    render(
      <MapPieceOverlay
        width={800}
        height={600}
        anchors={[
          anchor({ key: "a", placement: "above", node: <span>balão A</span> }),
          anchor({ key: "r", placement: "below", node: <span>botões</span> }),
        ]}
      />,
    );
    expect(shiftOf("balão A").style.transform).toBe("");
    expect(shiftOf("botões").style.transform).toBe("");
  });
});
