import { describe, it, expect } from "vitest";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { pickComboboxOption } from "../../../test/pickCombobox";
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
    render(<ClassChangeHarness />);
    const selects = screen.getAllByRole("combobox");
    expect(selects[0]).toHaveTextContent("Escolher arma…");
    expect(selects[1]).toHaveTextContent("Escolher arma…");
  });

  it("slot updates when user selects a weapon", async () => {
    render(<ClassChangeHarness />);
    const [slot0] = screen.getAllByRole("combobox");
    await pickComboboxOption(slot0, "ThrowingDagger");
    expect(slot0).toHaveTextContent("ThrowingDagger");
  });

  it("a weapon taken by another slot is disabled and cannot be picked", async () => {
    render(<ClassChangeHarness />);
    const [slot0, slot1] = screen.getAllByRole("combobox");
    await pickComboboxOption(slot0, "Bow");
    await userEvent.click(slot1);
    const bow = within(await screen.findByRole("listbox")).getByRole("option", { name: "Bow" });
    expect(bow).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(bow);
    expect(slot1).toHaveTextContent("Escolher arma…");
  });

  it("slots reset when class changes", async () => {
    render(<ClassChangeHarness />);

    const [slot0, slot1] = screen.getAllByRole("combobox");
    await pickComboboxOption(slot0, "ThrowingDagger");
    await pickComboboxOption(slot1, "Bow");
    expect(slot0).toHaveTextContent("ThrowingDagger");
    expect(slot1).toHaveTextContent("Bow");

    fireEvent.click(screen.getByText("Change to Mercenary"));

    const newSlots = screen.getAllByRole("combobox");
    expect(newSlots[0]).toHaveTextContent("Escolher arma…");
    expect(newSlots[1]).toHaveTextContent("Escolher arma…");
  });

  it("slots reset on EVERY class change — no accumulation across multiple switches", async () => {
    render(<ClassChangeHarness />);

    // Hunter: fill both slots
    const [slot0, slot1] = screen.getAllByRole("combobox");
    await pickComboboxOption(slot0, "ThrowingDagger");
    await pickComboboxOption(slot1, "Bow");

    // Switch to Mercenary
    fireEvent.click(screen.getByText("Change to Mercenary"));
    const mercSlots = screen.getAllByRole("combobox");
    expect(mercSlots[0]).toHaveTextContent("Escolher arma…");
    expect(mercSlots[1]).toHaveTextContent("Escolher arma…");

    // Fill one Mercenary slot
    await pickComboboxOption(mercSlots[0], "Dagger");
    expect(mercSlots[0]).toHaveTextContent("Dagger");

    // Switch BACK to Hunter — must reset again, no Mercenary weapons lingering
    fireEvent.click(screen.getByText("Change to Hunter"));
    const hunterSlots = screen.getAllByRole("combobox");
    expect(hunterSlots[0]).toHaveTextContent("Escolher arma…");
    expect(hunterSlots[1]).toHaveTextContent("Escolher arma…");
  });

  it("an external charSheet update does not clear slot selections", async () => {
    render(<ExternalCharSheetChangeHarness />);

    const [slot0] = screen.getAllByRole("combobox");
    await pickComboboxOption(slot0, "ThrowingDagger");
    expect(slot0).toHaveTextContent("ThrowingDagger");

    fireEvent.click(screen.getByText("Update profile"));

    // charSheet changed but not characterClass, so key is same → no remount → slot preserved
    expect(slot0).toHaveTextContent("ThrowingDagger");
  });
});
