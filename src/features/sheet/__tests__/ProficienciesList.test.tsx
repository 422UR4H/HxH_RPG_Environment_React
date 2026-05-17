import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
    status: undefined as any,
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
  it("slots start empty on initial render", () => {
    render(<ClassChangeHarness />);
    const selects = screen.getAllByRole("combobox");
    expect(selects[0]).toHaveValue("");
    expect(selects[1]).toHaveValue("");
  });

  it("slot updates when user selects a weapon", () => {
    render(<ClassChangeHarness />);
    const [slot0] = screen.getAllByRole("combobox");
    fireEvent.change(slot0, { target: { value: "ThrowingDagger" } });
    expect(slot0).toHaveValue("ThrowingDagger");
  });

  it("slots reset when class changes", () => {
    render(<ClassChangeHarness />);

    const [slot0, slot1] = screen.getAllByRole("combobox");
    fireEvent.change(slot0, { target: { value: "ThrowingDagger" } });
    fireEvent.change(slot1, { target: { value: "Bow" } });
    expect(slot0).toHaveValue("ThrowingDagger");
    expect(slot1).toHaveValue("Bow");

    fireEvent.click(screen.getByText("Change to Mercenary"));

    const newSlots = screen.getAllByRole("combobox");
    expect(newSlots[0]).toHaveValue("");
    expect(newSlots[1]).toHaveValue("");
  });

  it("slots reset on EVERY class change — no accumulation across multiple switches", () => {
    render(<ClassChangeHarness />);

    // Hunter: fill both slots
    const [slot0, slot1] = screen.getAllByRole("combobox");
    fireEvent.change(slot0, { target: { value: "ThrowingDagger" } });
    fireEvent.change(slot1, { target: { value: "Bow" } });

    // Switch to Mercenary
    fireEvent.click(screen.getByText("Change to Mercenary"));
    const mercSlots = screen.getAllByRole("combobox");
    expect(mercSlots[0]).toHaveValue("");
    expect(mercSlots[1]).toHaveValue("");

    // Fill one Mercenary slot
    fireEvent.change(mercSlots[0], { target: { value: "Dagger" } });
    expect(mercSlots[0]).toHaveValue("Dagger");

    // Switch BACK to Hunter — must reset again, no Mercenary weapons lingering
    fireEvent.click(screen.getByText("Change to Hunter"));
    const hunterSlots = screen.getAllByRole("combobox");
    expect(hunterSlots[0]).toHaveValue("");
    expect(hunterSlots[1]).toHaveValue("");
  });

  it("an external charSheet update does not clear slot selections", () => {
    render(<ExternalCharSheetChangeHarness />);

    const [slot0] = screen.getAllByRole("combobox");
    fireEvent.change(slot0, { target: { value: "ThrowingDagger" } });
    expect(slot0).toHaveValue("ThrowingDagger");

    fireEvent.click(screen.getByText("Update profile"));

    // charSheet changed but not characterClass, so key is same → no remount → slot preserved
    expect(slot0).toHaveValue("ThrowingDagger");
  });
});
