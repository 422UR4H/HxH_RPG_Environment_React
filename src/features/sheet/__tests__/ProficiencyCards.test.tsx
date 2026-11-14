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

  it("shows no damage when the catalogue fails", async () => {
    server.use(http.get("http://localhost:5000/rules/weapons", () => HttpResponse.error()));
    renderWithProviders(
      <ProficienciesList mode="view" commonProfs={{ katana: { level: 2, currExp: 1, nextLvlBaseExp: 5 } }} />,
      { token: null },
    );
    await waitFor(() => expect(screen.getByText("Katana")).toBeInTheDocument());
    expect(screen.queryByText(/D12/)).toBeNull();
  });
});

describe("JointProficiencyCard", () => {
  it("is collapsed by default and toggles the weapon list", async () => {
    const user = userEvent.setup();
    renderJoint(five);
    const toggle = screen.getByRole("button", { name: /5 armas/ });
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
    expect(screen.getByRole("button", { name: /^1 arma$/ })).toBeInTheDocument();
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
    const toggle = screen.getByRole("button", { name: /5 armas/ });
    expect(toggle).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
