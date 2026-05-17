import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PhysicalsDiagram from "../PhysicalsDiagram";
import MentalsDiagram from "../MentalsDiagram";
import type { Ability, Attribute } from "../../../types/characterSheet";

function makePhysicalAttrs(): Record<string, Attribute> {
  const names = ["resistance", "constitution", "strength", "agility", "dexterity", "sense", "flexibility", "celerity"];
  return Object.fromEntries(names.map((n) => [n, { exp: 0, level: 0, power: 0, points: 0 }]));
}

function makeMentalAttrs(): Record<string, Attribute> {
  return Object.fromEntries(
    ["resilience", "adaptability", "weighting", "creativity"].map((n) => [
      n, { exp: 0, level: 0, power: 0, points: 0 },
    ])
  );
}

/** Harness — controls key so we can simulate a class change */
function PhysicalsClassChangeHarness({ useKey = true }: { useKey?: boolean }) {
  const [cls, setCls] = useState("Hunter");
  const ability: Ability = { level: 5, bonus: 0 };
  const attrs = makePhysicalAttrs();

  return (
    <>
      <button onClick={() => setCls("Mercenary")}>Change class</button>
      <PhysicalsDiagram
        key={useKey ? cls : undefined}
        mode="create"
        attributes={attrs}
        physicalAbility={ability}
      />
    </>
  );
}

function MentalsClassChangeHarness({ useKey = true }: { useKey?: boolean }) {
  const [cls, setCls] = useState("Hunter");
  const ability: Ability = { level: 3, bonus: 0 };
  const attrs = makeMentalAttrs();

  return (
    <>
      <button onClick={() => setCls("Mercenary")}>Change class</button>
      <MentalsDiagram
        key={useKey ? cls : undefined}
        mode="create"
        attributes={attrs}
        mentalAbility={ability}
      />
    </>
  );
}

describe("PhysicalsDiagram — distributionPoints resets on class change", () => {
  it("starts with the full ability level as distribution points", () => {
    render(<PhysicalsClassChangeHarness />);
    expect(screen.getByText("Pontos para Distribuir: 5")).toBeInTheDocument();
  });

  it("decrements when user allocates a point", () => {
    render(<PhysicalsClassChangeHarness />);
    const plusBtns = screen.getAllByAltText("+");
    fireEvent.click(plusBtns[0]);
    expect(screen.getByText("Pontos para Distribuir: 4")).toBeInTheDocument();
  });

  it("resets to full ability level when class changes — even if the level is identical", () => {
    render(<PhysicalsClassChangeHarness useKey={true} />);

    // allocate 2 points
    const plusBtns = screen.getAllByAltText("+");
    fireEvent.click(plusBtns[0]);
    fireEvent.click(plusBtns[1]);
    expect(screen.getByText("Pontos para Distribuir: 3")).toBeInTheDocument();

    // class change → component remounts → counter resets
    fireEvent.click(screen.getByText("Change class"));
    expect(screen.getByText("Pontos para Distribuir: 5")).toBeInTheDocument();
  });

  it("does NOT reset without key prop — documents the bug that the key prop fixes", () => {
    render(<PhysicalsClassChangeHarness useKey={false} />);

    const plusBtns = screen.getAllByAltText("+");
    fireEvent.click(plusBtns[0]);
    expect(screen.getByText("Pontos para Distribuir: 4")).toBeInTheDocument();

    // without key, same physicalAbility.level → useEffect does not fire → counter stays stale
    fireEvent.click(screen.getByText("Change class"));
    expect(screen.getByText("Pontos para Distribuir: 4")).toBeInTheDocument();
  });
});

describe("MentalsDiagram — distributionPoints resets on class change", () => {
  it("resets to full ability level when class changes", () => {
    render(<MentalsClassChangeHarness useKey={true} />);

    const plusBtns = screen.getAllByAltText("+");
    fireEvent.click(plusBtns[0]);
    expect(screen.getByText("Pontos para Distribuir: 2")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Change class"));
    expect(screen.getByText("Pontos para Distribuir: 3")).toBeInTheDocument();
  });
});
