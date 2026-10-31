import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RisingClouds from "../RisingClouds";
import {
  CLOUDS,
  CROSSING_SECONDS,
  cloudBoxes,
  cloudGeometry,
  type Box,
  type Viewport,
} from "../risingCloudsLayout";

const VIEWPORTS: readonly Viewport[] = [
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
  { width: 1180, height: 820 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];

// Amostras de um ciclo inteiro do relógio, incluindo os instantes em que cada nuvem volta
// do topo para baixo da tela.
const SAMPLES = 2000;

function overlaps(a: Box, b: Box): boolean {
  return (
    a.left < b.left + b.width &&
    b.left < a.left + a.width &&
    a.top < b.top + b.height &&
    b.top < a.top + a.height
  );
}

function isOnScreen(box: Box, viewport: Viewport): boolean {
  return (
    box.left < viewport.width &&
    box.left + box.width > 0 &&
    box.top < viewport.height &&
    box.top + box.height > 0
  );
}

describe("RisingClouds", () => {
  it("renders a decorative layer hidden from assistive tech", () => {
    const { container } = render(<RisingClouds />);
    const layer = container.firstElementChild as HTMLElement;
    expect(layer.getAttribute("aria-hidden")).toBe("true");
    const images = layer.querySelectorAll("img");
    expect(images.length).toBeGreaterThan(0);
    images.forEach((img) => expect(img.getAttribute("alt")).toBe(""));
  });

  it("renders one element per configured cloud", () => {
    const { getAllByTestId } = render(<RisingClouds />);
    expect(getAllByTestId("rising-cloud")).toHaveLength(CLOUDS.length);
  });

  it("does not intercept clicks or touches", () => {
    const { container } = render(<RisingClouds />);
    const layer = container.firstElementChild as HTMLElement;
    expect(getComputedStyle(layer).pointerEvents).toBe("none");
    expect(getComputedStyle(layer).position).toBe("fixed");
  });

  it("starts every cloud already spread across the sky with the same duration", () => {
    const { getAllByTestId } = render(<RisingClouds />);
    getAllByTestId("rising-cloud").forEach((cloud, index) => {
      const animation = getComputedStyle(cloud).animation;
      expect(animation).toContain(`${CROSSING_SECONDS}s`);
      expect(animation).toContain(`${(-CLOUDS[index].phase * CROSSING_SECONDS).toFixed(2)}s`);
    });
  });
});

describe("risingCloudsLayout", () => {
  it("keeps 4 to 5 clouds split between the left and right edges", () => {
    expect(CLOUDS.length).toBeGreaterThanOrEqual(4);
    expect(CLOUDS.length).toBeLessThanOrEqual(5);
    expect(CLOUDS.some((cloud) => cloud.side === "left")).toBe(true);
    expect(CLOUDS.some((cloud) => cloud.side === "right")).toBe(true);
    expect(CLOUDS.filter((cloud) => cloud.image === "cloud2").length).toBeLessThanOrEqual(1);
    CLOUDS.forEach((cloud) => {
      expect(cloud.scale).toBeGreaterThanOrEqual(0.85);
      expect(cloud.scale).toBeLessThanOrEqual(1.15);
    });
  });

  it("moves the clouds as one rigid block between loop wraps", () => {
    const viewport = VIEWPORTS[0];
    const before = cloudBoxes(viewport, 0.1);
    const after = cloudBoxes(viewport, 0.2);
    const dx = after[0].left - before[0].left;
    const dy = after[0].top - before[0].top;
    after.forEach((box, index) => {
      expect(box.left - before[index].left).toBeCloseTo(dx, 6);
      expect(box.top - before[index].top).toBeCloseTo(dy, 6);
    });
  });

  it.each(VIEWPORTS)("never overlaps two clouds on screen at $width×$height", (viewport) => {
    for (let step = 0; step < SAMPLES; step++) {
      const boxes = cloudBoxes(viewport, step / SAMPLES).filter((box) =>
        isOnScreen(box, viewport),
      );
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          expect(overlaps(boxes[i], boxes[j]), `step ${step}: ${i} × ${j}`).toBe(false);
        }
      }
    }
  });

  it("leaves a horizontal gap between the columns on a 390px phone", () => {
    const viewport = VIEWPORTS[0];
    const vmax = Math.max(viewport.width, viewport.height) / 100;
    // Mesma fase para todas: compara as colunas na mesma altura, no meio da travessia.
    const midLeft = (index: number) =>
      cloudBoxes(viewport, 0.5 - CLOUDS[index].phase)[index].left;
    const leftEdges = CLOUDS.flatMap((cloud, index) =>
      cloud.side === "left" ? [midLeft(index) + cloudGeometry(cloud).widthVmax * vmax] : [],
    );
    const rightEdges = CLOUDS.flatMap((cloud, index) =>
      cloud.side === "right" ? [midLeft(index)] : [],
    );
    expect(Math.min(...rightEdges) - Math.max(...leftEdges)).toBeGreaterThan(0);
  });
});
