import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/render";
import { characterSheetsService } from "../../services/characterSheetsService";
import { characterClassesService } from "../../services/characterClassesService";
import { createEmptyCharacterSheet } from "../../features/sheet/factories/characterSheet.factory";
import type { CharacterClass } from "../../types/characterClass";
import type { CharacterSheet } from "../../types/characterSheet";
import EditCharacterSheetPage from "../EditCharacterSheetPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const classFixture: CharacterClass = {
  profile: {
    name: "Classe Edição",
    alignment: "Neutral-Neutral",
    description: "",
    briefDescription: "",
  },
  skills: {},
  jointSkills: {},
  proficiencies: {},
  jointProficiencies: [],
  attributes: {},
  abilities: {},
  indicatedCategories: [],
};

// Ficha livre (sem campanha) do jogador logado, com 2 pontos físicos a distribuir.
function makeOwnedFreeSheet(): CharacterSheet {
  const sheet = createEmptyCharacterSheet();
  sheet.uuid = "sheet-1";
  sheet.playerUuid = "user-1";
  sheet.characterClass = classFixture.profile.name;
  sheet.profile.nickname = "Hau";
  sheet.profile.fullname = "Haualu Teste";
  sheet.abilities.physicals = { level: 2, bonus: 0 };
  return sheet;
}

function renderPage() {
  return renderWithProviders(<EditCharacterSheetPage />, {
    route: "/charactersheet/sheet-1/edit",
    path: "/charactersheet/:id/edit",
  });
}

describe("EditCharacterSheetPage — attribute points", () => {
  let served: CharacterSheet;
  let update: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockNavigate.mockReset();
    served = makeOwnedFreeSheet();
    vi.spyOn(characterSheetsService, "getCharacterSheetDetails").mockImplementation(
      async () => served,
    );
    vi.spyOn(characterClassesService, "listCharacterClasses").mockResolvedValue([
      classFixture,
    ]);
    update = vi
      .spyOn(characterSheetsService, "updateCharacterSheet")
      .mockResolvedValue(served);
  });

  afterEach(() => vi.restoreAllMocks());

  async function distributeAllPhysicalPoints() {
    const u = userEvent.setup();
    // O ícone da câmera do cabeçalho também tem alt "+", mas fica dentro de um <button>.
    const plusButtons = (await screen.findAllByAltText("+")).filter(
      (img) => !img.closest("button"),
    );
    await u.click(plusButtons[0]);
    await u.click(plusButtons[1]);
    return u;
  }

  it("saves when attribute points are the only change", async () => {
    renderPage();
    const u = await distributeAllPhysicalPoints();
    await u.click(await screen.findByRole("button", { name: "Salvar Edição" }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    const sentSheet = update.mock.calls[0][2] as CharacterSheet;
    const spent = Object.values(sentSheet.physicalAttributes).reduce(
      (sum, a) => sum + a.points,
      0,
    );
    expect(spent).toBe(2);
  });

  it("does not mutate the sheet served by the query", async () => {
    renderPage();
    await distributeAllPhysicalPoints();

    const spent = Object.values(served.physicalAttributes).reduce(
      (sum, a) => sum + a.points,
      0,
    );
    expect(spent).toBe(0);
  });
});
