import { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfileInputs from "../ProfileInputs";
import { createEmptyProfile } from "../factories/profile.factory";
import type { CharacterSheet } from "../../../types/characterSheet";

function Harness({ age }: { age?: number }) {
  const [sheet, setSheet] = useState({
    profile: { ...createEmptyProfile(), ...(age !== undefined ? { age } : {}) },
  } as unknown as CharacterSheet);
  return <ProfileInputs charSheet={sheet} setCharSheet={setSheet} onBackgroundClick={() => {}} />;
}

describe("ProfileInputs", () => {
  it("shows the real age and starts new sheets at 20", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Idade:")).toHaveValue(20);
  });

  it("shows an inline error when age is emptied and blurred", () => {
    render(<Harness />);
    const age = screen.getByLabelText("Idade:");
    fireEvent.change(age, { target: { value: "" } });
    expect(age).toHaveValue(null);
    fireEvent.blur(age);
    expect(screen.getByText("A idade deve ser maior que zero.")).toBeInTheDocument();
  });

  it("limits the full name and shows the minimum error on blur", () => {
    render(<Harness />);
    const name = screen.getByLabelText("Nome completo:");
    expect(name).toHaveAttribute("maxLength", "32");
    fireEvent.change(name, { target: { value: "abc" } });
    fireEvent.blur(name);
    expect(
      screen.getByText("O nome completo deve ter pelo menos 6 caracteres."),
    ).toBeInTheDocument();
  });

  it("shows the limit notice at the maximum", () => {
    render(<Harness />);
    const desc = screen.getByLabelText("Descrição breve:");
    expect(desc).toHaveAttribute("maxLength", "255");
    fireEvent.change(desc, { target: { value: "a".repeat(255) } });
    expect(screen.getByText("Limite de 255 caracteres atingido.")).toBeInTheDocument();
  });
});
