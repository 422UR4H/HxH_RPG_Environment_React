import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PhysicalsDiagram from "../PhysicalsDiagram";
import MentalsDiagram from "../MentalsDiagram";
import {
  createEmptyMentalAttributes,
  createEmptyPhysicalAttributes,
} from "../factories/attribute.factory";

describe("PhysicalsDiagram — attribute points callback", () => {
  it("reports the change through the callback without mutating the attributes prop", () => {
    const attributes = createEmptyPhysicalAttributes();
    const onChange = vi.fn();
    render(
      <PhysicalsDiagram
        mode="create"
        attributes={attributes}
        physicalAbility={{ level: 1, bonus: 0 }}
        onAttributePointsChange={onChange}
      />,
    );

    fireEvent.click(screen.getAllByAltText("+")[0]);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("resistance", 1);
    expect(attributes.resistance.points).toBe(0);
  });

  it("stops calling the callback once the budget is spent", () => {
    const onChange = vi.fn();
    render(
      <PhysicalsDiagram
        mode="create"
        attributes={createEmptyPhysicalAttributes()}
        physicalAbility={{ level: 1, bonus: 0 }}
        onAttributePointsChange={onChange}
      />,
    );

    const plus = screen.getAllByAltText("+");
    fireEvent.click(plus[0]);
    fireEvent.click(plus[1]);

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("reports -1 for a refund and ignores it when there are no points", () => {
    const attributes = createEmptyPhysicalAttributes();
    attributes.resistance.points = 1;
    const onChange = vi.fn();
    render(
      <PhysicalsDiagram
        mode="create"
        attributes={attributes}
        physicalAbility={{ level: 1, bonus: 0 }}
        onAttributePointsChange={onChange}
      />,
    );

    const minus = screen.getAllByAltText("-");
    fireEvent.click(minus[1]); // agility has no points
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(minus[0]);
    expect(onChange).toHaveBeenCalledWith("resistance", -1);
    expect(attributes.resistance.points).toBe(1);
  });
});

describe("MentalsDiagram — attribute points callback", () => {
  it("reports the change through the callback without mutating the attributes prop", () => {
    const attributes = createEmptyMentalAttributes();
    const onChange = vi.fn();
    render(
      <MentalsDiagram
        mode="create"
        attributes={attributes}
        mentalAbility={{ level: 1, bonus: 0 }}
        onAttributePointsChange={onChange}
      />,
    );

    fireEvent.click(screen.getAllByAltText("+")[0]);

    expect(onChange).toHaveBeenCalledWith("resilience", 1);
    expect(attributes.resilience.points).toBe(0);
  });
});
