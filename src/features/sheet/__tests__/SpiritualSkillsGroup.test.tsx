import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import SpiritualSkillsGroup from "../SpiritualSkillsGroup";
import type { Attribute, Skill } from "../../../types/characterSheet";

const attributes = {
  flame: { level: 2, power: 9, currExp: 0, nextLvlBaseExp: 1 },
  conscience: { level: 1, power: 7, currExp: 0, nextLvlBaseExp: 1 },
} as unknown as Record<string, Attribute>;

const skills = Object.fromEntries(
  ["focus", "willPower", "selfKnowledge", "coa", "mop", "aop"].map((key) => [
    key,
    { level: 0, exp: 0, currExp: 0, nextLvlBaseExp: 1, value: 0 },
  ]),
) as unknown as Record<string, Skill>;

function groupOf(name: RegExp) {
  return screen.getByText(name).parentElement?.parentElement as HTMLElement;
}

describe("SpiritualSkillsGroup", () => {
  it("shows Flame and Conscience headers with their own levels", () => {
    render(<SpiritualSkillsGroup mode="view" attributes={attributes} skills={skills} />);

    expect(screen.getByText(/^flame$/i).parentElement).toHaveTextContent("Lv 2");
    expect(screen.getByText(/^conscience$/i).parentElement).toHaveTextContent("Lv 1");
    expect(screen.queryByText(/spirit$/i)).not.toBeInTheDocument();
  });

  it("lists the skills under their own attribute", () => {
    render(<SpiritualSkillsGroup mode="view" attributes={attributes} skills={skills} />);

    const flame = within(groupOf(/^flame$/i));
    expect(flame.getByText(/focus/i)).toBeInTheDocument();
    expect(flame.getByText(/will\s*power/i)).toBeInTheDocument();
    expect(flame.getByText(/self\s*knowledge/i)).toBeInTheDocument();
    expect(flame.queryByText(/coa/i)).not.toBeInTheDocument();

    const conscience = within(groupOf(/^conscience$/i));
    expect(conscience.getByText(/coa/i)).toBeInTheDocument();
    expect(conscience.getByText(/mop/i)).toBeInTheDocument();
    expect(conscience.getByText(/aop/i)).toBeInTheDocument();
    expect(conscience.queryByText(/focus/i)).not.toBeInTheDocument();
  });
});
