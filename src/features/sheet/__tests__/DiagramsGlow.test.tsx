import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import PhysicalsDiagram from "../PhysicalsDiagram";
import MentalsDiagram from "../MentalsDiagram";
import NenPrinciplesDiagram from "../NenPrinciplesDiagram";
import AttributeNode from "../AttributeNode";
import {
  createEmptyMentalAttributes,
  createEmptyPhysicalAttributes,
} from "../factories/attribute.factory";

const physical = () => createEmptyPhysicalAttributes();
const mental = () => createEmptyMentalAttributes();

describe("sheet diagrams with the glow", () => {
  it("sheet diagrams render the glow instead of the image", () => {
    const cases = [
      <PhysicalsDiagram mode="view" attributes={physical()} />,
      <MentalsDiagram mode="create" attributes={mental()} />,
      <NenPrinciplesDiagram mode="view" />,
    ];
    for (const ui of cases) {
      const { container, unmount } = render(ui);
      expect(container.querySelector("img[src*=lozange]")).toBeNull();
      expect(container.querySelector("img[src*=nen_principles]")).toBeNull();
      expect(container.querySelectorAll("svg")).toHaveLength(1);
      expect(container.querySelectorAll("[data-glow-layer]")).toHaveLength(4);
      expect(container.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
      unmount();
    }
  });

  it("mental diagram has no edge beads", () => {
    const { container } = render(<MentalsDiagram mode="view" attributes={mental()} />);
    const layer = container.querySelector("[data-glow-layer]")!;
    expect(layer.querySelectorAll("circle")).toHaveLength(4);
  });

  it("rules variant shows labels without numbers or buttons", () => {
    const attributes = physical();
    attributes.agility.points = 2;
    const { container } = render(
      <PhysicalsDiagram mode="create" variant="rules" attributes={attributes} physicalAbility={{ level: 5, bonus: 1 }} />,
    );
    for (const label of ["RES", "AGI", "Str", "FLX"]) expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByText("PHYSICAL")).toBeNull();
    expect(screen.queryByText(/Pontos para Distribuir/)).toBeNull();
    expect(screen.queryAllByAltText("+")).toHaveLength(0);
    expect(screen.queryAllByAltText("-")).toHaveLength(0);
    expect(container.textContent).not.toMatch(/\d/);

    const mentalView = render(<MentalsDiagram mode="edit" variant="rules" attributes={mental()} />);
    expect(within(mentalView.container).getByText("RSL")).toBeInTheDocument();
    expect(within(mentalView.container).queryByText("MENTAL")).toBeNull();
    expect(mentalView.container.textContent).not.toMatch(/\d/);

    const nen = render(<NenPrinciplesDiagram mode="view" variant="rules" />);
    expect(within(nen.container).getByText("Ten")).toBeInTheDocument();
    expect(within(nen.container).queryByText("SPIRITUAL")).toBeNull();
    expect(nen.container.textContent).not.toMatch(/\d/);
  });

  it("rules variant keeps the view positions in a distribute mode", () => {
    const { container } = render(<PhysicalsDiagram mode="create" variant="rules" />);
    const res = screen.getByText("RES").parentElement!;
    expect(res.style.top).toBe("8%");
    expect(container.firstElementChild).toBeTruthy();
  });

  it("passes the paint to the glow", () => {
    const { container } = render(
      <PhysicalsDiagram mode="view" variant="rules" paint={{ nodes: ["RES"], segments: [] }} />,
    );
    // Com pintura parcial há vazamento: um degradê por trecho vizinho do nó pintado.
    expect(container.querySelectorAll('linearGradient[gradientUnits="userSpaceOnUse"]').length).toBeGreaterThan(0);
  });
});

describe("AttributeNode", () => {
  it("AttributeNode renders level, points and power", () => {
    render(<AttributeNode label="AGI" level={3} points={2} power={8} />);
    expect(screen.getByText("AGI")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });
});
