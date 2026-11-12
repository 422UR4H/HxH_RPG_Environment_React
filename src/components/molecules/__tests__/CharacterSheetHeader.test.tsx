import { useState } from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/render";
import CharacterSheetHeader from "../CharacterSheetHeader";
import type { CharacterSheet } from "../../../types/characterSheet";

function Harness() {
  const [charSheet, setCharSheet] = useState({
    profile: { nickname: "" },
    characterClass: "",
  } as CharacterSheet);
  return (
    <CharacterSheetHeader mode="create" showStatus={false} data={{ charSheet, setCharSheet, charClasses: [] }} />
  );
}

describe("CharacterSheetHeader nickname feedback", () => {
  it("asks for at least 3 characters on blur, and clears once the nickname is valid", async () => {
    renderWithProviders(<Harness />);
    const u = userEvent.setup();
    const input = screen.getByPlaceholderText("Nickname");
    await u.type(input, "ab");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await u.tab();
    expect(screen.getByRole("alert")).toHaveTextContent("O nickname deve ter pelo menos 3 caracteres.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    await u.type(input, "c");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("answers an empty nickname with 'Campo obrigatório.' on blur", async () => {
    renderWithProviders(<Harness />);
    const u = userEvent.setup();
    await u.click(screen.getByPlaceholderText("Nickname"));
    await u.tab();
    expect(screen.getByRole("alert")).toHaveTextContent("Campo obrigatório.");
  });

  it("shows the limit note at the maximum, and drops it below it", async () => {
    renderWithProviders(<Harness />);
    const u = userEvent.setup();
    const input = screen.getByPlaceholderText("Nickname");
    await u.type(input, "a".repeat(10));
    expect(screen.getByRole("status")).toHaveTextContent("Limite de 10 caracteres atingido.");
    await u.type(input, "{backspace}");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("CharacterSheetHeader nickname emoji", () => {
  it("shows the emoji error while typing, without blur, and clears it when removed", async () => {
    renderWithProviders(<Harness />);
    const u = userEvent.setup();
    const input = screen.getByPlaceholderText("Nickname");
    await u.type(input, "Gon😀");
    expect(screen.getByRole("alert")).toHaveTextContent("Emojis não são permitidos neste campo.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveValue("Gon😀");
    await u.type(input, "{backspace}");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("accepts accented text", async () => {
    renderWithProviders(<Harness />);
    const u = userEvent.setup();
    const input = screen.getByPlaceholderText("Nickname");
    await u.type(input, "José Ção");
    await u.tab();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("cuts a pasted nickname at 10 code points", async () => {
    renderWithProviders(<Harness />);
    const u = userEvent.setup();
    const input = screen.getByPlaceholderText("Nickname");
    await u.click(input);
    await u.paste("𝒜".repeat(12));
    expect(input).toHaveValue("𝒜".repeat(10));
    expect(screen.getByRole("status")).toHaveTextContent("Limite de 10 caracteres atingido.");
  });
});

describe("CharacterSheetHeader level label", () => {
  it("shows Lv in create mode when the sheet has a level", () => {
    const charSheet = {
      profile: { nickname: "" },
      characterClass: "",
      characterExp: { level: 123, currExp: 0, nextLvlBaseExp: 10 },
    } as unknown as CharacterSheet;
    renderWithProviders(
      <CharacterSheetHeader mode="create" data={{ charSheet, setCharSheet: () => {}, charClasses: [] }} />,
    );
    expect(screen.getByText("Lv 123")).toBeInTheDocument();
  });
});
