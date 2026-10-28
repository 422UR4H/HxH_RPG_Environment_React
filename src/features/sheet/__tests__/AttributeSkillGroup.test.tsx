import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AttributeSkillGroup from "../AttributeSkillGroup";
import PhysicalSkillsGroup from "../PhysicalSkillsGroup";
import type { Attribute } from "../../../types/characterSheet";

describe("AttributeSkillGroup header", () => {
  it("shows the attribute level", () => {
    render(<AttributeSkillGroup attributeName="Agility" attributeLevel={3} skillsSubList={[]} />);

    expect(screen.getByText("Lv 3")).toBeInTheDocument();
  });

  it("PhysicalSkillsGroup shows level instead of power in the Agility header", () => {
    const attributes = {
      agility: { level: 3, power: 11, currExp: 0, nextLvlBaseExp: 1 },
    } as unknown as Record<string, Attribute>;

    render(<PhysicalSkillsGroup mode="view" attributes={attributes} skills={{}} />);

    const header = screen.getByText(/agility/i).parentElement as HTMLElement;
    expect(header).toHaveTextContent("Lv 3");
    expect(header).not.toHaveTextContent("Lv 11");
  });
});
