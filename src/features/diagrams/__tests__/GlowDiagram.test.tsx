import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { colors } from "../../../styles/tokens";
import { mockReducedMotion } from "../../../test/reducedMotion";
import GlowDiagram from "../GlowDiagram";
import { PHYSICAL_GEOMETRY } from "../geometry";
import { parsePaintSpec } from "../paint";

const STRENGTH = parsePaintSpec("RES,AGI,Str,AGI-Str,Str-RES", PHYSICAL_GEOMETRY)!;

describe("GlowDiagram", () => {
  let restore: (() => void) | undefined;

  afterEach(() => {
    restore?.();
    restore = undefined;
    vi.useRealTimers();
  });

  it("renders four glow layers holding every node and segment", () => {
    const { container } = render(<GlowDiagram geometry={PHYSICAL_GEOMETRY} color="physical" />);
    const layers = container.querySelectorAll("[data-glow-layer]");
    expect(layers).toHaveLength(4);
    layers.forEach((layer) => {
      expect(layer.querySelectorAll("circle")).toHaveLength(8);
      expect(layer.querySelectorAll("line")).toHaveLength(8);
    });
  });

  it("paints with the diagram colour and lights the rest white", () => {
    const { container } = render(
      <GlowDiagram geometry={PHYSICAL_GEOMETRY} color="physical" paint={STRENGTH} />,
    );
    const layer = container.querySelector("[data-glow-layer]")!;
    expect(layer.querySelector('circle[data-node="RES"]')!.getAttribute("fill")).toBe(colors.diagramPhysical);
    expect(layer.querySelector('circle[data-node="SEN"]')!.getAttribute("fill")).toBe(colors.diagramLightHalo);
  });

  it("draws one bleed gradient per bleed", () => {
    const { container } = render(
      <GlowDiagram geometry={PHYSICAL_GEOMETRY} color="physical" paint={STRENGTH} />,
    );
    const gradients = container.querySelectorAll('linearGradient[gradientUnits="userSpaceOnUse"]');
    expect(gradients).toHaveLength(2);
  });

  it("is decorative without a label and an img with one", () => {
    const { container, rerender } = render(<GlowDiagram geometry={PHYSICAL_GEOMETRY} color="physical" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("role")).toBeNull();

    rerender(<GlowDiagram geometry={PHYSICAL_GEOMETRY} color="physical" label="Losango físico" />);
    const labelled = container.querySelector("svg")!;
    expect(labelled.getAttribute("role")).toBe("img");
    expect(labelled.getAttribute("aria-label")).toBe("Losango físico");
    expect(labelled.getAttribute("aria-hidden")).toBeNull();
  });

  it("turns motion off under prefers-reduced-motion", () => {
    restore = mockReducedMotion(true);
    vi.useFakeTimers();
    const { container } = render(<GlowDiagram geometry={PHYSICAL_GEOMETRY} color="physical" />);
    expect(container.querySelector("svg")!.getAttribute("data-motion")).toBe("off");
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(container.querySelectorAll(".swell")).toHaveLength(0);
  });
});
