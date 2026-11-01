import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PhysicalsDiagram from "../PhysicalsDiagram";
import MentalsDiagram from "../MentalsDiagram";
import type { Attribute } from "../../../types/characterSheet";

// O número fica num <span> colorido; o rótulo inteiro é o texto do contêiner.
const pointsLabel = (n: number) =>
  screen.getByText((_, el) => el?.textContent === `Pontos para Distribuir: ${n}` && el.children.length === 1);

function makeAttrs(names: string[]): Record<string, Attribute> {
  return Object.fromEntries(names.map((n) => [n, { exp: 0, level: 0, power: 0, points: 0 }]));
}

const PHYSICAL = ["resistance", "constitution", "strength", "agility", "dexterity", "sense", "flexibility", "celerity"];
const MENTAL = ["resilience", "adaptability", "weighting", "creativity"];

/**
 * Faz o papel do template: guarda os atributos, aplica o delta pedido pelo
 * diagrama e simula a troca de classe (pontos zerados) e uma escolha que muda
 * o nível da habilidade (a prévia recalcula o nível).
 */
function Harness({ kind, initialLevel }: { kind: "physical" | "mental"; initialLevel: number }) {
  const names = kind === "physical" ? PHYSICAL : MENTAL;
  const [attrs, setAttrs] = useState(() => makeAttrs(names));
  const [level, setLevel] = useState(initialLevel);
  const onChange = (name: string, delta: 1 | -1) =>
    setAttrs((prev) => ({ ...prev, [name]: { ...prev[name], points: prev[name].points + delta } }));
  const ability = { level, bonus: 0 };

  return (
    <>
      <button onClick={() => setAttrs(makeAttrs(names))}>Change class</button>
      <button onClick={() => setLevel((l) => l + 1)}>Level up</button>
      <button onClick={() => setLevel((l) => l - 1)}>Level down</button>
      {kind === "physical" ? (
        <PhysicalsDiagram mode="create" attributes={attrs} physicalAbility={ability} onAttributePointsChange={onChange} />
      ) : (
        <MentalsDiagram mode="create" attributes={attrs} mentalAbility={ability} onAttributePointsChange={onChange} />
      )}
    </>
  );
}

describe("PhysicalsDiagram — points to distribute derive from level and spent points", () => {
  it("starts with the full ability level", () => {
    render(<Harness kind="physical" initialLevel={5} />);
    expect(pointsLabel(5)).toBeInTheDocument();
  });

  it("decrements when a point is allocated and refunds on minus", () => {
    render(<Harness kind="physical" initialLevel={5} />);
    fireEvent.click(screen.getAllByAltText("+")[0]);
    expect(pointsLabel(4)).toBeInTheDocument();
    fireEvent.click(screen.getAllByAltText("-")[0]);
    expect(pointsLabel(5)).toBeInTheDocument();
  });

  it("resets when the class change clears the points — no remount needed", () => {
    render(<Harness kind="physical" initialLevel={5} />);
    fireEvent.click(screen.getAllByAltText("+")[0]);
    fireEvent.click(screen.getAllByAltText("+")[1]);
    expect(pointsLabel(3)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Change class"));
    expect(pointsLabel(5)).toBeInTheDocument();
  });

  it("follows the ability level when it changes after mount", () => {
    render(<Harness kind="physical" initialLevel={2} />);
    fireEvent.click(screen.getAllByAltText("+")[0]);
    expect(pointsLabel(1)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Level up"));
    expect(pointsLabel(2)).toBeInTheDocument();
  });

  it("shows a negative balance when the level drops below the spent points", () => {
    render(<Harness kind="physical" initialLevel={1} />);
    fireEvent.click(screen.getAllByAltText("+")[0]);
    fireEvent.click(screen.getByText("Level down"));
    expect(pointsLabel(-1)).toBeInTheDocument();
  });
});

describe("MentalsDiagram — points to distribute derive from level and spent points", () => {
  it("resets when the class change clears the points", () => {
    render(<Harness kind="mental" initialLevel={3} />);
    fireEvent.click(screen.getAllByAltText("+")[0]);
    expect(pointsLabel(2)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Change class"));
    expect(pointsLabel(3)).toBeInTheDocument();
  });

  it("follows the ability level when it changes after mount", () => {
    render(<Harness kind="mental" initialLevel={1} />);
    fireEvent.click(screen.getByText("Level up"));
    expect(pointsLabel(2)).toBeInTheDocument();
  });
});
