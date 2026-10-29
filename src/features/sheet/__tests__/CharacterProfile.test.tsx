import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CharacterProfile from "../CharacterProfile";
import { createEmptyCharacterSheet } from "../factories/characterSheet.factory";
import type { ProfileMode } from "../types/profileMode";

function renderProfile(mode: ProfileMode) {
  const sheet = createEmptyCharacterSheet();
  sheet.profile = { ...sheet.profile, fullname: "Chrollo Lucilfer", briefDescription: "Líder" };
  render(<CharacterProfile mode={mode} charSheet={sheet} setCharSheet={() => {}} />);
  return screen.getByRole("button", { name: /perfil/ });
}

describe("CharacterProfile", () => {
  it("toggles aria-expanded and the content from the bar", async () => {
    const bar = renderProfile("view");
    expect(bar).toHaveAttribute("aria-expanded", "false");
    expect(bar).toHaveAccessibleName("Mostrar perfil");
    expect(screen.queryByRole("heading", { name: "Chrollo Lucilfer" })).not.toBeInTheDocument();

    await userEvent.click(bar);
    expect(bar).toHaveAttribute("aria-expanded", "true");
    expect(bar).toHaveAccessibleName("Ocultar perfil");
    expect(screen.getByText("Chrollo Lucilfer")).toBeInTheDocument();

    await userEvent.click(bar);
    expect(bar).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("heading", { name: "Chrollo Lucilfer" })).not.toBeInTheDocument();
  });

  it("places the bar after the content it controls when open", () => {
    const bar = renderProfile("create");
    const content = document.getElementById(bar.getAttribute("aria-controls") ?? "");
    expect(content).not.toBeNull();
    expect(within(content as HTMLElement).getByLabelText("Nome completo:")).toBeInTheDocument();
    expect(content!.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(bar.parentElement!.lastElementChild).toBe(bar);
  });

  it("reaches every create field by its label", () => {
    renderProfile("create");
    expect(screen.getByLabelText("Nome completo:")).toHaveValue("Chrollo Lucilfer");
    expect(screen.getByLabelText("Descrição breve:")).toHaveValue("Líder");
    expect(screen.getByLabelText("Idade:").tagName).toBe("INPUT");
    expect(screen.getByLabelText("Alinhamento:").tagName).toBe("SELECT");
    const birthday = screen.getByRole("group", { name: "Aniversário:" });
    expect(within(birthday).getByLabelText("Mês").tagName).toBe("SELECT");
    expect(within(birthday).getByLabelText("Dia").tagName).toBe("SELECT");
  });

  it("labels the brief description field in edit mode", () => {
    renderProfile("edit");
    expect(screen.getByLabelText("Descrição breve:")).toHaveValue("Líder");
    // No modo editar o nome não é campo: continua texto.
    expect(screen.getByRole("heading", { name: "Chrollo Lucilfer" })).toBeInTheDocument();
  });
});
