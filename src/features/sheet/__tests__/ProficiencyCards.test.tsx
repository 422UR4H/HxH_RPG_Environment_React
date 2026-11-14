import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/server";
import { renderWithProviders } from "../../../test/render";
import ProficienciesList from "../ProficienciesList";
import JointProficiencyCard from "../JointProficiencyCard";

function serveCatalogue() {
  server.use(
    http.get("http://localhost:5000/rules/weapons", () =>
      HttpResponse.json({
        weapons: [
          { name: "Katana", dice: [4, 12], flatDamage: 7 },
          { name: "Dagger", dice: [6], flatDamage: 2 },
        ],
      }),
    ),
  );
}

const damageOf = (w: string) => ({ Katana: "D12 + D4 +7", Dagger: "D6 +2" })[w];
const five = ["Katana", "Dagger", "Bow", "Spear", "Axe"];

function renderJoint(weapons: string[]) {
  return renderWithProviders(
    <JointProficiencyCard name="blades" level={3} currExp={5} nextLvlBaseExp={10} weapons={weapons} damageOf={damageOf} />,
    { token: null },
  );
}

describe("ProficiencyCard damage", () => {
  it("shows the catalogue damage once loaded and none before", async () => {
    serveCatalogue();
    renderWithProviders(
      <ProficienciesList mode="view" commonProfs={{ katana: { level: 2, currExp: 1, nextLvlBaseExp: 5 } }} />,
      { token: null },
    );
    expect(screen.queryByText("D12 + D4 +7")).toBeNull();
    expect(await screen.findByText("D12 + D4 +7")).toBeInTheDocument();
  });

  it("shows no damage while the catalogue has not loaded", async () => {
    server.use(http.get("http://localhost:5000/rules/weapons", () => new Promise(() => {})));
    renderWithProviders(
      <ProficienciesList mode="view" commonProfs={{ katana: { level: 2, currExp: 1, nextLvlBaseExp: 5 } }} />,
      { token: null },
    );
    expect(screen.getByText("Katana")).toBeInTheDocument();
    expect(screen.queryByText(/D12/)).toBeNull();
  });

  it("shows no damage after the catalogue request failed for good", async () => {
    let calls = 0;
    server.use(
      http.get("http://localhost:5000/rules/weapons", () => {
        calls++;
        return HttpResponse.error();
      }),
    );
    renderWithProviders(
      <ProficienciesList mode="view" commonProfs={{ katana: { level: 2, currExp: 1, nextLvlBaseExp: 5 } }} />,
      { token: null },
    );
    // Primeira tentativa + o único retry; depois a query assenta no estado de erro.
    await waitFor(() => expect(calls).toBe(2), { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.getByText("Katana")).toBeInTheDocument();
    expect(screen.queryByText(/D12/)).toBeNull();
  });
});

describe("JointProficiencyCard", () => {
  it("is collapsed by default and toggles the weapon list", async () => {
    const user = userEvent.setup();
    renderJoint(five);
    const toggle = screen.getByRole("button", { name: "Blades: 5 armas" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    const list = document.getElementById(toggle.getAttribute("aria-controls")!)!;
    expect(list).toHaveAttribute("inert");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(list).not.toHaveAttribute("inert");
    const items = screen.getAllByRole("listitem", { hidden: true });
    expect(items.map((li) => li.textContent)).toEqual([
      "KatanaD12 + D4 +7",
      "DaggerD6 +2",
      "Bow",
      "Spear",
      "Axe",
    ]);

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(list).toHaveAttribute("inert");
  });

  it("uses the singular for one weapon", () => {
    renderJoint(["Katana"]);
    expect(screen.getByRole("button", { name: "Blades: 1 arma" })).toBeInTheDocument();
  });

  it("gives each joint card's toggle a name that includes the proficiency", () => {
    renderWithProviders(
      <>
        <JointProficiencyCard name="blades" level={1} weapons={five} damageOf={damageOf} />
        <JointProficiencyCard name="ranged" level={1} weapons={["Bow", "Longbow"]} damageOf={damageOf} />
      </>,
      { token: null },
    );
    const names = screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"));
    expect(names).toEqual(["Blades: 5 armas", "Ranged: 2 armas"]);
    expect(screen.getByRole("button", { name: "Ranged: 2 armas" })).toHaveTextContent("2 armas");
  });

  it("renders no toggle without weapons", () => {
    renderJoint([]);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("list", { hidden: true })).toBeNull();
  });

  it("can be operated with the keyboard", async () => {
    const user = userEvent.setup();
    renderJoint(five);
    await user.tab();
    const toggle = screen.getByRole("button", { name: "Blades: 5 armas" });
    expect(toggle).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
