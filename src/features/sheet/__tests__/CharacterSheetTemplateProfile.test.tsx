import { describe, expect, it } from "vitest";
import { useState } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../../../test/render";
import CharacterSheetTemplate from "../CharacterSheetTemplate";
import { createEmptyCharacterSheet } from "../factories/characterSheet.factory";
import type { SheetMode } from "../types/sheetMode";
import type { CharacterSheet } from "../../../types/characterSheet";

const CREATE_MODE: SheetMode = {
  headerMode: "create",
  profileMode: "create",
  diagramsMode: "create",
  proficiencyMode: "create",
  skillsMode: "view",
};

// O estado da página: a ficha mais recente fica exposta para o teste conferir o que foi salvo.
let latest: CharacterSheet;
function Page() {
  const [charSheet, setCharSheet] = useState<CharacterSheet>(() => {
    const sheet = createEmptyCharacterSheet();
    sheet.abilities.physicals = { level: 3, bonus: 0 };
    return sheet;
  });
  latest = charSheet;
  return (
    <CharacterSheetTemplate
      sheetMode={CREATE_MODE}
      data={{ charSheet, setCharSheet, charClasses: [], isLoading: false, error: null }}
    />
  );
}

function renderPage() {
  renderWithProviders(<Page />, { route: "/charactersheet/new" });
}

describe("CharacterSheetTemplate — profile edits after distributing", () => {
  it("keeps the distributed points when the profile changes afterwards", () => {
    renderPage();
    // O perfil (memo) não re-renderiza com os cliques: a edição precisa partir da ficha atual.
    fireEvent.click(screen.getAllByAltText("+")[0]);
    fireEvent.click(screen.getAllByAltText("+")[0]);
    const spent = Object.values(latest.physicalAttributes).reduce((s, a) => s + (a.points ?? 0), 0);
    expect(spent).toBe(2);

    fireEvent.change(screen.getByLabelText("Nome completo:"), { target: { value: "Gon Freecss" } });
    expect(latest.profile.fullname).toBe("Gon Freecss");
    expect(Object.values(latest.physicalAttributes).reduce((s, a) => s + (a.points ?? 0), 0)).toBe(2);
  });
});
