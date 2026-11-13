import { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfileInputs from "../ProfileInputs";
import { createEmptyProfile } from "../factories/profile.factory";
import type { Profile } from "../../../types/characterSheet";

function Harness({ age }: { age?: number }) {
  const [profile, setProfile] = useState<Profile>({
    ...createEmptyProfile(),
    ...(age !== undefined ? { age } : {}),
  });
  return <ProfileInputs profile={profile} onProfileChange={setProfile} onBackgroundClick={() => {}} />;
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
    expect(age).not.toHaveAttribute("aria-invalid");
    fireEvent.blur(age);
    expect(screen.getByText("A idade deve ser maior que zero.")).toBeInTheDocument();
    expect(age).toHaveAttribute("aria-invalid", "true");
  });

  it("limits the full name and shows the minimum error on blur", () => {
    render(<Harness />);
    const name = screen.getByLabelText("Nome completo:");
    fireEvent.change(name, { target: { value: "abc" } });
    fireEvent.blur(name);
    expect(
      screen.getByText("O nome completo deve ter pelo menos 6 caracteres."),
    ).toBeInTheDocument();
    expect(name).toHaveAttribute("aria-invalid", "true");
  });

  it("shows the limit notice at the maximum", () => {
    render(<Harness />);
    const desc = screen.getByLabelText("Descrição breve:");
    fireEvent.change(desc, { target: { value: "a".repeat(255) } });
    expect(screen.getByText("Limite de 255 caracteres atingido.")).toBeInTheDocument();
  });

  it("shows the emoji error in the full name without blur, then clears it", () => {
    render(<Harness />);
    const name = screen.getByLabelText("Nome completo:");
    fireEvent.change(name, { target: { value: "Gon Freecss 😀" } });
    expect(screen.getByText("Emojis não são permitidos neste campo.")).toBeInTheDocument();
    expect(name).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(name, { target: { value: "José Ção" } });
    expect(screen.queryByText("Emojis não são permitidos neste campo.")).not.toBeInTheDocument();
    expect(name).not.toHaveAttribute("aria-invalid");
  });

  it("accepts max emojis in the brief description and cuts a paste of max+1", () => {
    render(<Harness />);
    const desc = screen.getByLabelText("Descrição breve:");
    fireEvent.change(desc, { target: { value: "😀".repeat(255) } });
    expect(desc).toHaveValue("😀".repeat(255));
    expect(screen.getByText("Limite de 255 caracteres atingido.")).toBeInTheDocument();
    fireEvent.change(desc, { target: { value: "😀".repeat(256) } });
    const value = (desc as HTMLTextAreaElement).value;
    expect(value).toBe("😀".repeat(255));
    expect(value).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
  });

  it("cuts a full name paste at 32 code points", () => {
    render(<Harness />);
    const name = screen.getByLabelText("Nome completo:");
    fireEvent.change(name, { target: { value: "𝒜".repeat(40) } });
    expect(name).toHaveValue("𝒜".repeat(32));
  });
});
