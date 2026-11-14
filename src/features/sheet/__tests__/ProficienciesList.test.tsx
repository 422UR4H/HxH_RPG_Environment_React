import { describe, it, expect } from "vitest";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { screen, fireEvent, within } from "@testing-library/react";
import { pickComboboxOption } from "../../../test/pickCombobox";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/server";
import { renderWithProviders } from "../../../test/render";
import ProficienciesList from "../ProficienciesList";
import type { CharacterSheet } from "../../../types/characterSheet";
import type { Distribution } from "../../../types/characterClass";

function makeSheet(
  characterClass: string,
  commonProficiencies: Record<string, { exp: number; level: number }>,
): CharacterSheet {
  return {
    characterClass,
    profile: { nickname: "", fullname: "", alignment: "", age: 0 },
    abilities: {},
    physicalAttributes: {},
    mentalAttributes: {},
    spiritualAttributes: {},
    physicalSkills: {},
    spiritualSkills: {},
    principles: [],
    commonProficiencies,
    jointProficiencies: [],
    status: undefined,
    categories: {},
  } as unknown as CharacterSheet;
}

function makeDistribution(allowed: string[], count: number, exp = 127): Distribution {
  return {
    skillPoints: null,
    proficiencyPoints: Array.from({ length: count }, () => ({ level: 1, exp })),
    skillsAllowed: [],
    proficienciesAllowed: allowed,
  };
}

const hunterDistribution = makeDistribution(["ThrowingDagger", "Bow", "Longbow"], 2);
const mercenaryDistribution = makeDistribution(["Dagger", "Scimitar", "Crossbow"], 2, 210);

/** WITH key prop — the fix */
function ClassChangeHarness({ useKey = true }: { useKey?: boolean }) {
  const [characterClass, setCharacterClass] = useState("Hunter");
  const [charSheet, setCharSheet] = useState(
    makeSheet("Hunter", { dagger: { exp: 127, level: 1 } })
  );
  const distribution = characterClass === "Hunter" ? hunterDistribution : mercenaryDistribution;

  const changeToMercenary = () => {
    setCharacterClass("Mercenary");
    setCharSheet(makeSheet("Mercenary", {}));
  };

  const changeBackToHunter = () => {
    setCharacterClass("Hunter");
    setCharSheet(makeSheet("Hunter", { dagger: { exp: 127, level: 1 } }));
  };

  return (
    <>
      <button onClick={changeToMercenary}>Change to Mercenary</button>
      <button onClick={changeBackToHunter}>Change to Hunter</button>
      <ProficienciesList
        key={useKey ? characterClass : undefined}
        mode="create"
        commonProfs={charSheet.commonProficiencies}
        distribution={distribution}
        charSheet={charSheet}
        setCharSheet={setCharSheet}
      />
    </>
  );
}

/** Harness that also changes charSheet for unrelated reasons (e.g. profile edit) */
function ExternalCharSheetChangeHarness() {
  const [charSheet, setCharSheet] = useState(
    makeSheet("Hunter", { dagger: { exp: 127, level: 1 } })
  );

  const externalUpdate = () => {
    setCharSheet((prev) => ({
      ...prev,
      profile: { ...prev.profile, nickname: "changed" },
    }));
  };

  return (
    <>
      <button onClick={externalUpdate}>Update profile</button>
      <ProficienciesList
        key={charSheet.characterClass}
        mode="create"
        commonProfs={charSheet.commonProficiencies}
        distribution={hunterDistribution}
        charSheet={charSheet}
        setCharSheet={setCharSheet}
      />
    </>
  );
}

describe("ProficienciesList – slot behaviour", () => {
  it("slots start empty on initial render", async () => {
    renderWithProviders(<ClassChangeHarness />);
    const selects = screen.getAllByRole("combobox");
    expect(selects[0]).toHaveTextContent("Selecione");
    expect(selects[1]).toHaveTextContent("Selecione");
  });

  it("slot updates when user selects a weapon", async () => {
    renderWithProviders(<ClassChangeHarness />);
    const [slot0] = screen.getAllByRole("combobox");
    await pickComboboxOption(slot0, "ThrowingDagger");
    expect(slot0).toHaveTextContent("ThrowingDagger");
  });

  it("a weapon taken by another slot is disabled and cannot be picked", async () => {
    renderWithProviders(<ClassChangeHarness />);
    const [slot0, slot1] = screen.getAllByRole("combobox");
    await pickComboboxOption(slot0, "Bow");
    await userEvent.click(slot1);
    const bow = within(await screen.findByRole("listbox")).getByRole("option", { name: /^Bow/ });
    expect(bow).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(bow);
    expect(slot1).toHaveTextContent("Selecione");
  });

  it("slots reset when class changes", async () => {
    renderWithProviders(<ClassChangeHarness />);

    const [slot0, slot1] = screen.getAllByRole("combobox");
    await pickComboboxOption(slot0, "ThrowingDagger");
    await pickComboboxOption(slot1, "Bow");
    expect(slot0).toHaveTextContent("ThrowingDagger");
    expect(slot1).toHaveTextContent("Bow");

    fireEvent.click(screen.getByText("Change to Mercenary"));

    const newSlots = screen.getAllByRole("combobox");
    expect(newSlots[0]).toHaveTextContent("Selecione");
    expect(newSlots[1]).toHaveTextContent("Selecione");
  });

  it("slots reset on EVERY class change — no accumulation across multiple switches", async () => {
    renderWithProviders(<ClassChangeHarness />);

    // Hunter: fill both slots
    const [slot0, slot1] = screen.getAllByRole("combobox");
    await pickComboboxOption(slot0, "ThrowingDagger");
    await pickComboboxOption(slot1, "Bow");

    // Switch to Mercenary
    fireEvent.click(screen.getByText("Change to Mercenary"));
    const mercSlots = screen.getAllByRole("combobox");
    expect(mercSlots[0]).toHaveTextContent("Selecione");
    expect(mercSlots[1]).toHaveTextContent("Selecione");

    // Fill one Mercenary slot
    await pickComboboxOption(mercSlots[0], "Dagger");
    expect(mercSlots[0]).toHaveTextContent("Dagger");

    // Switch BACK to Hunter — must reset again, no Mercenary weapons lingering
    fireEvent.click(screen.getByText("Change to Hunter"));
    const hunterSlots = screen.getAllByRole("combobox");
    expect(hunterSlots[0]).toHaveTextContent("Selecione");
    expect(hunterSlots[1]).toHaveTextContent("Selecione");
  });

  it("an external charSheet update does not clear slot selections", async () => {
    renderWithProviders(<ExternalCharSheetChangeHarness />);

    const [slot0] = screen.getAllByRole("combobox");
    await pickComboboxOption(slot0, "ThrowingDagger");
    expect(slot0).toHaveTextContent("ThrowingDagger");

    fireEvent.click(screen.getByText("Update profile"));

    // charSheet changed but not characterClass, so key is same → no remount → slot preserved
    expect(slot0).toHaveTextContent("ThrowingDagger");
  });
});

describe("ProficienciesList – weapon damage in slots", () => {
  const serveCatalogue = () =>
    server.use(
      http.get("http://localhost:5000/rules/weapons", () =>
        HttpResponse.json({
          weapons: [
            { name: "ThrowingDagger", dice: [4], flatDamage: 1 },
            { name: "Bow", dice: [6], flatDamage: 2 },
            { name: "Longbow", dice: [4, 12], flatDamage: 7 },
          ],
        }),
      ),
    );

  it("shows no damage text before a weapon is chosen", async () => {
    serveCatalogue();
    renderWithProviders(<ClassChangeHarness />);
    await userEvent.click(screen.getAllByRole("combobox")[0]);
    await screen.findByText("D12 + D4 +7");
    // O dano das opções está na lista; o espaço em si não mostra nada nem dica alguma.
    const slot = screen.getAllByRole("combobox")[0].parentElement!;
    expect(within(slot).queryByText(/D\d/)).toBeNull();
    expect(slot).toHaveTextContent(/^Lv 1 · 127 XP/);
    expect(slot).not.toHaveTextContent(/escolha/i);
  });

  it("shows the chosen weapon's damage in the slot", async () => {
    serveCatalogue();
    renderWithProviders(<ClassChangeHarness />);
    await userEvent.click(screen.getAllByRole("combobox")[0]);
    await screen.findByText("D12 + D4 +7");
    await userEvent.click(screen.getByRole("option", { name: /^Bow/ }));
    expect(await screen.findByText("D6 +2")).toBeInTheDocument();
  });

  it("shows each option's damage in the open list", async () => {
    serveCatalogue();
    renderWithProviders(<ClassChangeHarness />);
    await userEvent.click(screen.getAllByRole("combobox")[0]);
    const list = await screen.findByRole("listbox");
    expect(await within(list).findByText("D12 + D4 +7")).toBeInTheDocument();
    expect(within(list).getByText("D6 +2")).toBeInTheDocument();
    expect(within(list).getByText("D4 +1")).toBeInTheDocument();
  });

  it("marks the option taken by the other slot as disabled with its damage", async () => {
    serveCatalogue();
    renderWithProviders(<ClassChangeHarness />);
    const [slot0, slot1] = screen.getAllByRole("combobox");
    await userEvent.click(slot0);
    await screen.findByText("D12 + D4 +7");
    await userEvent.click(screen.getByRole("option", { name: /^Bow/ }));
    await userEvent.click(slot1);
    const bow = await screen.findByRole("option", { name: /^Bow/ });
    expect(bow).toHaveAttribute("aria-disabled", "true");
    expect(within(bow).getByText("D6 +2 · já escolhida")).toBeInTheDocument();
  });

  it("reads just 'já escolhida' when the taken weapon's damage is unknown", async () => {
    server.use(http.get("http://localhost:5000/rules/weapons", () => new Promise(() => {})));
    renderWithProviders(<ClassChangeHarness />);
    const [slot0, slot1] = screen.getAllByRole("combobox");
    await pickComboboxOption(slot0, "Bow");
    await userEvent.click(slot1);
    const bow = await screen.findByRole("option", { name: /^Bow/ });
    expect(within(bow).getByText("já escolhida")).toBeInTheDocument();
  });
});
